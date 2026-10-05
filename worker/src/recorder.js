// Match history for servers without CRCON records (Wardogs), built from Bifrost's live feed.
// live.js calls recordSnapshot() right after any successful fetch (visitor or cron), and the
// per-minute cron calls runRecorder(), which fetches through the same live_cache claim and then
// finalizes matches that ended. Per snapshot: 1 D1 read + 1 row written.
import { getRecordedServers, intVar } from './config.js';
import { liveMatchWriteStmts, liveSchemaReady } from './db.js';
import { finalRows, foldSnapshot, newState, readSnapshot } from './fold.js';
import { refreshLive } from './live.js';

// No snapshot with players for this long (same match key) ends the match.
export const IDLE_FINALIZE_MS = 15 * 60 * 1000;
const FINALIZE_PER_RUN = 1;
// Longest the cron waits for the shared fetch window to open (wall time, no CPU).
const CRON_WAIT_MS = 15 * 1000;
const MIN_SALT_LENGTH = 16;
const HASH_CACHE_MAX = 5000;

let hmac = null;
let hmacSecret = null;
// Raw id -> hashed id, memory only (never persisted), so steady-state snapshots skip the HMAC.
const hashCache = new Map();

async function hmacKey(secret) {
  if (hmac && hmacSecret === secret) return hmac;
  hmac = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  hmacSecret = secret;
  hashCache.clear();
  return hmac;
}

export function saltReady(env) {
  return typeof env.PLAYER_ID_SALT === 'string' && env.PLAYER_ID_SALT.length >= MIN_SALT_LENGTH;
}

/**
 * Bifrost's live player ids are Steam64 ids. Only HMAC-SHA256(PLAYER_ID_SALT, id) is stored, so
 * the stored id can't be reversed by hashing every Steam id without the secret.
 */
export async function hashPlayerId(env, server, rawId) {
  const key = await hmacKey(env.PLAYER_ID_SALT);
  const cacheKey = `${server.game}:${rawId}`;
  const hit = hashCache.get(cacheKey);
  if (hit) return hit;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(cacheKey)));
  let hex = '';
  for (let i = 0; i < 12; i++) hex += sig[i].toString(16).padStart(2, '0');
  const id = `${server.game}-${hex}`;
  if (hashCache.size >= HASH_CACHE_MAX) hashCache.clear();
  hashCache.set(cacheKey, id);
  return id;
}

function parseState(text) {
  try {
    const s = text ? JSON.parse(text) : null;
    return s && s.v === 1 && s.p ? s : null;
  } catch {
    return null;
  }
}

/** Why recording can't run yet (missing secret or migration 0005), or null when it can. */
export async function recorderBlocked(env) {
  if (!saltReady(env)) return `PLAYER_ID_SALT secret not set (${MIN_SALT_LENGTH}+ characters)`;
  if (!(await liveSchemaReady(env.DB))) return 'migration 0005 not applied';
  return null;
}

/** Folds one live document into its match's state row. Empty or stale snapshots write nothing. */
export async function recordSnapshot(env, server, doc, now = Date.now()) {
  const blocked = await recorderBlocked(env);
  if (blocked) return { skipped: blocked };
  const snap = readSnapshot(doc, now);
  if (!snap) return { skipped: 'no match' };
  if (!snap.players.length) return { skipped: 'empty server' };
  const players = [];
  for (const p of snap.players) {
    players.push({ id: await hashPlayerId(env, server, p.rawId), name: p.name, faction: p.faction, kills: p.kills, deaths: p.deaths, cash: p.cash });
  }
  const db = env.DB;
  const row = await db
    .prepare('SELECT state FROM live_match_state WHERE server_key = ?1 AND match_key = ?2')
    .bind(server.key, snap.key)
    .first();
  const state = parseState(row?.state) || newState(snap);
  if (!foldSnapshot(state, snap, players)) return { skipped: 'not newer' };
  await db
    .prepare(
      `INSERT INTO live_match_state (server_key, match_key, state, first_snapshot_at, last_snapshot_at, last_active_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(server_key, match_key) DO UPDATE SET
         state = excluded.state, last_snapshot_at = excluded.last_snapshot_at, last_active_at = excluded.last_active_at`
    )
    .bind(server.key, snap.key, JSON.stringify(state), state.first, state.last, state.active)
    .run();
  return { folded: true, key: snap.key, players: players.length };
}

/**
 * Finalizes ended matches: every state row except the most recently active one (the match key
 * changed: new map, new match or a server restart), and the latest one too once it has been idle
 * for IDLE_FINALIZE_MS. All writes for one match are a single D1 batch.
 */
export async function finalizeDue(env, server, now = Date.now()) {
  const db = env.DB;
  const { results } = await db
    .prepare('SELECT match_key, last_active_at FROM live_match_state WHERE server_key = ?1 ORDER BY last_active_at DESC')
    .bind(server.key)
    .all();
  const due = results.filter((r, i) => i > 0 || now - r.last_active_at >= IDLE_FINALIZE_MS).slice(0, FINALIZE_PER_RUN);
  const done = [];
  for (const r of due) {
    const row = await db
      .prepare('SELECT state, last_snapshot_at FROM live_match_state WHERE server_key = ?1 AND match_key = ?2')
      .bind(server.key, r.match_key)
      .first();
    if (!row) continue;
    const state = parseState(row.state);
    const rows = state
      ? finalRows(state, {
          serverKey: server.key,
          minDurationS: intVar(env, 'LIVE_MIN_MATCH_SECONDS', 300),
          minPlayers: intVar(env, 'LIVE_MIN_PLAYERS', 4),
        })
      : null;
    const stmts = rows ? liveMatchWriteStmts(db, rows) : [];
    // Guarded on last_snapshot_at so a snapshot folded meanwhile isn't silently dropped.
    stmts.push(
      db
        .prepare('DELETE FROM live_match_state WHERE server_key = ?1 AND match_key = ?2 AND last_snapshot_at = ?3')
        .bind(server.key, r.match_key, row.last_snapshot_at)
    );
    await db.batch(stmts);
    done.push(rows ? { id: rows.match.id, players: rows.players.length, counted: rows.counted } : { key: r.match_key, dropped: true });
  }
  return done;
}

/** Per-minute cron: one shared-guard fetch per recorded server, then finalization. */
export async function runRecorder(env) {
  const report = [];
  const servers = getRecordedServers(env);
  if (!servers.length) return report;
  // Not configured yet: don't poll Bifrost at all (visitors' /v1/live still fetches as before).
  const blocked = await recorderBlocked(env);
  if (blocked) return [{ skipped: blocked }];
  for (const server of servers) {
    const r = { key: server.key };
    report.push(r);
    try {
      const s = await refreshLive(env, server, CRON_WAIT_MS);
      r.status = s.status;
      r.stale = s.stale;
      r.players = s.players;
    } catch (err) {
      r.error = String(err.message || err).slice(0, 200);
    }
    try {
      r.finalized = await finalizeDue(env, server);
    } catch (err) {
      r.finalizeError = String(err.message || err).slice(0, 200);
    }
  }
  return report;
}
