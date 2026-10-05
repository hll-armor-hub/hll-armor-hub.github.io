import { HttpError } from './api.js';
import { fetchLiveDoc, isChallenge } from './bifrost.js';
import { BIFROST_BACKOFF_KEY, BIFROST_BACKOFF_MS, getLiveServers, intVar, isLiveHistory } from './config.js';
import { num, parseMap, str } from './livedoc.js';
import { recordSnapshot } from './recorder.js';

// Bifrost blocks clients that poll a live feed more often than every ~30s; 45s is their stated floor.
const MIN_LIVE_TTL_S = 45;
const DEFAULT_LIVE_TTL_S = 60;
// Bifrost's own state timestamp older than this means the server/feed is down.
const ONLINE_MAX_AGE_MS = 10 * 60 * 1000;
// Snapshots older than this are shown as offline rather than as a stale "live" match.
const STALE_MAX_MS = 15 * 60 * 1000;
// Per-isolate reuse of the D1 read, so bursts of visitors don't each query D1.
const MEM_TTL_MS = 10 * 1000;
const DEFAULT_MAX_PLAYERS = 100;
const COLOUR_RE = /^#[0-9a-f]{3,8}$/i;

let memDoc = null;
let memAt = 0;
let inflight = null;

function teamList(doc) {
  if (doc.teams && typeof doc.teams === 'object') {
    return ['allies', 'axis']
      .filter((side) => doc.teams[side])
      .map((side) => ({
        side,
        name: str(doc.teams[side].faction, 40),
        score: num(doc.teams[side].score),
        players: num(doc.teams[side].playerCount) ?? 0,
      }));
  }
  if (Array.isArray(doc.factions)) {
    return doc.factions.slice(0, 6).map((f) => ({
      side: null,
      name: str(f.name, 40),
      score: num(f.score),
      players: num(f.playerCount) ?? 0,
      colour: COLOUR_RE.test(f.colour || '') ? f.colour : null,
    }));
  }
  return [];
}

function baseSummary(server, env) {
  return {
    key: server.key,
    game: server.game,
    name: server.name || server.key,
    serverName: null,
    online: false,
    status: 'offline',
    players: 0,
    maxPlayers: num(server.maxPlayers) ?? DEFAULT_MAX_PLAYERS,
    queue: null,
    seeding: false,
    seedingBelow: num(server.seedingBelow) ?? intVar(env, 'SEEDING_BELOW', 70),
    transitioning: false,
    map: null,
    score: null,
    teams: [],
    timeRemainingS: null,
    elapsedS: null,
    matchStartedAt: null,
    updatedAt: null,
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}

// Only whitelisted aggregate fields are copied: no player names, IDs, VIP or staff data.
export function summarize(server, env, doc) {
  const s = baseSummary(server, env);
  const match = doc.match || {};
  const srv = doc.server || {};
  const updatedAt = doc.sources?.gameStateAt || match.lastUpdated || doc.generatedAt || null;
  const updatedMs = Date.parse(updatedAt);

  s.serverName = str(srv.name);
  s.updatedAt = Number.isFinite(updatedMs) ? new Date(updatedMs).toISOString() : null;
  s.online = Number.isFinite(updatedMs) && Date.now() - updatedMs < ONLINE_MAX_AGE_MS;
  s.players = Math.max(0, num(doc.playerCount) ?? (Array.isArray(doc.players) ? doc.players.length : 0));
  s.maxPlayers = num(srv.maxPlayers) ?? s.maxPlayers;
  s.queue = num(doc.queueCount ?? srv.queueCount ?? srv.queue);
  s.transitioning = match.isTransitioning === true;
  s.map = parseMap(match);
  s.teams = teamList(doc);
  if (doc.teams?.allies && doc.teams?.axis) {
    s.score = { allied: num(doc.teams.allies.score), axis: num(doc.teams.axis.score) };
  }
  // An empty HLL server reports a placeholder match with a frozen clock; don't show it.
  if (s.players > 0) {
    s.timeRemainingS = num(match.timeRemainingSeconds);
    s.elapsedS = num(match.elapsedSeconds);
    s.matchStartedAt = str(match.startTime, 40);
  }

  s.seeding = s.online && s.players > 0 && s.players < s.seedingBelow;
  s.status = !s.online ? 'offline' : s.players === 0 ? 'empty' : s.seeding ? 'seeding' : 'live';
  return s;
}

/**
 * Atomically takes the right to fetch one server's live feed. D1 serializes writes, so across
 * all isolates and colos only one caller per TTL window sees changes > 0. The claim is keyed on
 * the attempt time, so failed fetches are spaced out just like successful ones.
 */
async function claimFetch(db, key, now, ttlMs) {
  const res = await db
    .prepare(
      `INSERT INTO live_cache (server_key, attempted_at) VALUES (?1, ?2)
       ON CONFLICT(server_key) DO UPDATE SET attempted_at = excluded.attempted_at
       WHERE live_cache.attempted_at <= ?3 AND live_cache.backoff_until <= ?2`
    )
    .bind(key, now, now - ttlMs)
    .run();
  return res.meta.changes > 0;
}

async function refreshServer(db, env, server, row, now) {
  let doc;
  let data;
  try {
    doc = await fetchLiveDoc(server);
    data = summarize(server, env, doc);
    await db
      .prepare('UPDATE live_cache SET payload = ?2, fetched_at = ?3, last_error = NULL WHERE server_key = ?1')
      .bind(server.key, JSON.stringify(data), now)
      .run();
  } catch (err) {
    const message = String(err.message || err).slice(0, 200);
    console.error(`live ${server.key}:`, message);
    const challenged = isChallenge(err);
    const backoff = challenged ? now + BIFROST_BACKOFF_MS : row?.backoff_until || 0;
    const stmts = [
      db
        .prepare('UPDATE live_cache SET last_error = ?2, backoff_until = MAX(backoff_until, ?3) WHERE server_key = ?1')
        .bind(server.key, message, backoff),
    ];
    if (challenged) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO sync_state (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = MAX(CAST(sync_state.value AS INTEGER), excluded.value)`
          )
          .bind(BIFROST_BACKOFF_KEY, backoff)
      );
    }
    await db.batch(stmts);
    return { ...row, backoff_until: backoff, last_error: message };
  }
  // Whoever wins the fetch claim (a visitor or the cron) records the snapshot, so each fetch is folded once.
  if (isLiveHistory(server)) {
    try {
      await recordSnapshot(env, server, doc, now);
    } catch (err) {
      console.error(`record ${server.key}:`, String(err.message || err).slice(0, 200));
    }
  }
  return { ...row, payload: data, fetched_at: now, last_error: null };
}

function present(server, env, row, now, ttlMs) {
  const base = baseSummary(server, env);
  const payload = row?.payload || null;
  const age = payload ? now - (row.fetched_at || 0) : Infinity;
  const backingOff = (row?.backoff_until || 0) > now;
  if (!payload || age > STALE_MAX_MS) {
    return { ...base, fetchedAt: payload ? payload.fetchedAt : null, stale: !!payload, error: 'unavailable' };
  }
  // Config can change between fetches; identity fields always come from the current config.
  return {
    ...payload,
    key: base.key,
    game: base.game,
    name: base.name,
    stale: backingOff || !!row.last_error || age > ttlMs * 3,
  };
}

async function loadAll(env, servers, ttlMs) {
  const db = env.DB;
  const now = Date.now();
  const [rowsRes, backoffRes] = await db.batch([
    db
      .prepare(
        `SELECT server_key, payload, fetched_at, attempted_at, backoff_until, last_error
         FROM live_cache WHERE server_key IN (SELECT value FROM json_each(?1))`
      )
      .bind(JSON.stringify(servers.map((s) => s.key))),
    db.prepare('SELECT value FROM sync_state WHERE key = ?1').bind(BIFROST_BACKOFF_KEY),
  ]);
  const globalBackoff = Number(backoffRes.results[0]?.value) || 0;
  const rows = new Map(
    rowsRes.results.map((r) => {
      let payload = null;
      try {
        payload = r.payload ? JSON.parse(r.payload) : null;
      } catch {}
      return [r.server_key, { ...r, payload }];
    })
  );

  const updated = await Promise.all(
    servers.map(async (server) => {
      const row = rows.get(server.key);
      const due =
        globalBackoff <= now &&
        (!row ||
          ((row.backoff_until || 0) <= now && now - (row.attempted_at || 0) >= ttlMs && now - (row.fetched_at || 0) >= ttlMs));
      if (!due || !(await claimFetch(db, server.key, now, ttlMs))) return row;
      return refreshServer(db, env, server, row, now);
    })
  );

  const at = Date.now();
  return servers.map((server, i) => present(server, env, updated[i], at, ttlMs));
}

function liveTtlMs(env) {
  return Math.max(MIN_LIVE_TTL_S, intVar(env, 'LIVE_CACHE_SECONDS', DEFAULT_LIVE_TTL_S)) * 1000;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cron entry point: refreshes one server's snapshot through the same D1 claim, TTL and backoff
 * checks as /v1/live. If the next fetch is allowed within `maxWaitMs`, waits for it (wall time, not
 * CPU) so cron jitter doesn't skip every other minute; otherwise a recent visitor fetch is reused.
 */
export async function refreshLive(env, server, maxWaitMs = 0) {
  const ttlMs = liveTtlMs(env);
  if (maxWaitMs > 0) {
    const row = await env.DB
      .prepare('SELECT attempted_at, fetched_at FROM live_cache WHERE server_key = ?1')
      .bind(server.key)
      .first();
    const wait = row ? Math.max(row.attempted_at || 0, row.fetched_at || 0) + ttlMs - Date.now() : 0;
    if (wait > 0 && wait <= maxWaitMs) await sleep(wait + 250);
  }
  const [summary] = await loadAll(env, [server], ttlMs);
  return summary;
}

export async function live(env, params) {
  const ttlMs = liveTtlMs(env);
  const all = getLiveServers(env);
  const key = params.get('server');
  if (key && !all.some((s) => s.key === key)) throw new HttpError(404, `unknown live server '${key}'`);

  if (!memDoc || Date.now() - memAt >= MEM_TTL_MS) {
    if (!inflight) {
      inflight = loadAll(env, all, ttlMs)
        .then((servers) => {
          memDoc = servers;
          memAt = Date.now();
          return servers;
        })
        .finally(() => {
          inflight = null;
        });
    }
    await inflight;
  }
  return {
    updatedAt: new Date(memAt).toISOString(),
    refreshSeconds: ttlMs / 1000,
    servers: key ? memDoc.filter((s) => s.key === key) : memDoc,
  };
}

