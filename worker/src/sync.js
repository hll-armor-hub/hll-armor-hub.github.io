import { fetchMatch, fetchMatchList, BifrostError, isChallenge } from './bifrost.js';
import { BIFROST_BACKOFF_KEY, BIFROST_BACKOFF_MS, getCrconServers, intVar } from './config.js';
import {
  acquireLock,
  bumpAttempts,
  existingMatchIds,
  getState,
  giveUpStaleMatches,
  markMatch,
  matchWriteStmts,
  pendingMatches,
  releaseLock,
  setState,
  setStateStmt,
  upsertMatchesStmt,
} from './db.js';

const HEAD_PAGES_MAX = 5;
const BACKFILL_PAGES_PER_RUN = 5;
// Matches stored before faction names were recorded get them from one extra list page per run.
const FACTION_PAGES_PER_RUN = 1;
const MIN_DURATION_S = 300;
const MAX_ATTEMPTS = 5;
const LOCK_TTL_MS = 14 * 60 * 1000;
const ROTATION_SLOT_MS = 10 * 60 * 1000;

export async function runSync(env, { matchesPerRun, serverKey } = {}) {
  const db = env.DB;
  const backoffUntil = Number(await getState(db, BIFROST_BACKOFF_KEY)) || 0;
  if (backoffUntil > Date.now()) {
    return { skipped: 'bifrost backoff', until: new Date(backoffUntil).toISOString() };
  }
  if (!(await acquireLock(db, LOCK_TTL_MS))) {
    return { skipped: 'another sync is running' };
  }
  const budget = {
    fetches: intVar(env, 'MAX_FETCHES_PER_RUN', 40),
    matches: matchesPerRun ?? intVar(env, 'MATCHES_PER_RUN', 25),
  };
  const report = [];
  try {
    for (const server of serversForRun(env, serverKey)) {
      const r = { key: server.key, listPages: 0, newMatches: 0, processed: 0, errors: [] };
      report.push(r);
      try {
        await syncServer(db, server, budget, r);
      } catch (err) {
        r.errors.push(String(err.message || err));
        console.error(`sync ${server.key}:`, err);
        if (isChallenge(err)) await setState(db, BIFROST_BACKOFF_KEY, Date.now() + BIFROST_BACKOFF_MS);
      }
      await setState(db, `last_sync:${server.key}`, new Date().toISOString());
    }
  } finally {
    await releaseLock(db);
  }
  return { servers: report, fetchesLeft: budget.fetches };
}

// One server per run keeps each invocation inside the free plan's CPU/subrequest limits;
// the 10-minute slot index rotates through the servers on successive cron runs.
function serversForRun(env, serverKey) {
  const servers = getCrconServers(env);
  if (serverKey) return servers.filter((s) => s.key === serverKey);
  if (!servers.length) return [];
  return [servers[Math.floor(Date.now() / ROTATION_SLOT_MS) % servers.length]];
}

async function syncServer(db, server, budget, r) {
  const insertedThisRun = new Set();

  const ingestPage = async (page) => {
    const result = await fetchMatchList(server, page);
    budget.fetches--;
    r.listPages++;
    const maps = Array.isArray(result.maps) ? result.maps : [];
    const rows = maps.map((m) => listRow(server.key, m)).filter(Boolean);
    const existing = await existingMatchIds(db, rows.map((x) => x.id));
    const fresh = rows.filter((x) => !existing.has(x.id));
    const stmts = [setStateStmt(db, `total:${server.key}`, result.total ?? '')];
    if (rows.length) stmts.push(upsertMatchesStmt(db, rows));
    await db.batch(stmts);
    fresh.forEach((x) => insertedThisRun.add(x.id));
    r.newMatches += fresh.length;
    const knownBefore = [...existing].some((id) => !insertedThisRun.has(id));
    const pageSize = result.page_size || 50;
    const isLast = maps.length < pageSize || page * pageSize >= (result.total ?? 0);
    return { knownBefore, isLast };
  };

  // Newest-first scan until we hit a match we already had.
  let page = 1;
  let reachedKnown = false;
  let reachedEnd = false;
  while (budget.fetches > 0 && page <= HEAD_PAGES_MAX) {
    const { knownBefore, isLast } = await ingestPage(page);
    if (knownBefore) { reachedKnown = true; break; }
    if (isLast) { reachedEnd = true; break; }
    page++;
  }

  // Resumable walk over older pages. New matches only push items to later pages,
  // so resuming at a saved page can re-see items but never skip them.
  const backfillKey = `backfill_page:${server.key}`;
  let backfill = await getState(db, backfillKey);
  if (reachedEnd) backfill = 'done';
  // Head scan ran out of pages before reaching known data: everything older needs a re-walk.
  else if (!reachedKnown && r.listPages > 0) backfill = String(page);
  else if (backfill == null) backfill = String(page + 1);

  let walked = 0;
  while (backfill !== 'done' && budget.fetches > 0 && walked < BACKFILL_PAGES_PER_RUN) {
    const p = parseInt(backfill, 10);
    const { isLast } = await ingestPage(p);
    walked++;
    backfill = isLast ? 'done' : String(p + 1);
  }
  await setState(db, backfillKey, backfill);

  if (backfill === 'done') {
    const factionKey = `faction_page:${server.key}`;
    let factionPage = await getState(db, factionKey);
    let walkedFactions = 0;
    while (factionPage !== 'done' && budget.fetches > 0 && walkedFactions < FACTION_PAGES_PER_RUN) {
      const p = parseInt(factionPage ?? '2', 10) || 2;
      const { isLast } = await ingestPage(p);
      walkedFactions++;
      factionPage = isLast ? 'done' : String(p + 1);
    }
    if (walkedFactions) await setState(db, factionKey, factionPage);
  }

  await giveUpStaleMatches(db, server.key, MAX_ATTEMPTS);
  const pending = await pendingMatches(db, server.key, Math.min(budget.matches, budget.fetches));
  await bumpAttempts(db, pending.map((m) => m.id));

  for (const match of pending) {
    if (budget.fetches <= 0 || budget.matches <= 0) break;
    let data;
    try {
      data = await fetchMatch(server, match.map_id, match.id);
    } catch (err) {
      budget.fetches--;
      if (err instanceof BifrostError && err.status === 404) {
        await markMatch(db, match.id, 2);
        r.errors.push(`match ${match.id}: 404, skipped`);
        continue;
      }
      throw err;
    }
    budget.fetches--;
    budget.matches--;
    await db.batch(matchWriteStmts(db, buildMatchWrite(server.key, match, data)));
    r.processed++;
  }
}

function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function intOr(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function stripSuffix(pretty) {
  return pretty ? pretty.replace(/\s*\([^)]*\)\s*$/, '').trim() : null;
}

function listRow(serverKey, m) {
  if (!m || !m.id) return null;
  const layer = m.map || {};
  const base = layer.map || {};
  const start = toIso(m.start);
  const end = toIso(m.end);
  const duration = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 1000) : null;
  return {
    id: m.id,
    serverKey,
    mapId: layer.id || null,
    mapBase: base.id || null,
    mapPretty: layer.pretty_name || null,
    mapBasePretty: stripSuffix(base.pretty_name),
    gameMode: layer.game_mode || null,
    attackers: layer.attackers || null,
    environment: layer.environment || null,
    imageName: layer.image_name || null,
    start,
    end,
    durationS: duration,
    alliedScore: m.result ? intOr(m.result.allied, null) : null,
    axisScore: m.result ? intOr(m.result.axis, null) : null,
    alliedFaction: factionName(layer.allies),
    axisFaction: factionName(layer.axis),
  };
}

function factionName(team) {
  const name = team && typeof team.name === 'string' ? team.name.trim() : '';
  return name ? name.slice(0, 20) : null;
}

function topEntries(obj, n) {
  if (!obj || typeof obj !== 'object') return {};
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  );
}

function buildMatchWrite(serverKey, match, data) {
  // Some players appear twice (reconnects); keep the entry with the most playtime.
  const byId = new Map();
  for (const p of Array.isArray(data.player_stats) ? data.player_stats : []) {
    if (!p || !p.player_id) continue;
    const id = String(p.player_id);
    const prev = byId.get(id);
    if (!prev || intOr(p.time_seconds) > intOr(prev.time_seconds)) byId.set(id, p);
  }

  const players = [];
  const weapons = [];
  for (const [id, p] of byId) {
    players.push({
      id,
      name: p.player != null ? String(p.player) : null,
      side: p.team && p.team.side ? p.team.side : null,
      platform: p.platform || null,
      level: intOr(p.level, null),
      kills: intOr(p.kills),
      deaths: intOr(p.deaths),
      teamkills: intOr(p.teamkills),
      streak: intOr(p.kills_streak),
      time: intOr(p.time_seconds),
      combat: intOr(p.combat),
      offense: intOr(p.offense),
      defense: intOr(p.defense),
      support: intOr(p.support),
      vehicles: intOr(p.vehicles_destroyed),
      topWeapons: JSON.stringify(topEntries(p.weapons, 5)),
      mostKilled: JSON.stringify(topEntries(p.most_killed, 3)),
      deathBy: JSON.stringify(topEntries(p.death_by, 3)),
    });
    for (const [weapon, kills] of Object.entries(p.weapons || {})) {
      const k = intOr(kills);
      if (k > 0) weapons.push([id, weapon, k]);
    }
  }

  const counted = players.length > 0 && (match.duration_s ?? 0) >= MIN_DURATION_S;
  const layer = data.map && typeof data.map === 'object' ? data.map : {};
  return {
    alliedFaction: factionName(layer.allies),
    axisFaction: factionName(layer.axis),
    match,
    serverKey,
    players,
    weapons,
    counted,
    alliedScore: data.result ? intOr(data.result.allied, null) : null,
    axisScore: data.result ? intOr(data.result.axis, null) : null,
  };
}
