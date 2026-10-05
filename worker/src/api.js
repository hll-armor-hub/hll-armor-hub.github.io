import { findServer, getServers, isLiveHistory } from './config.js';
import { getStates, liveSchemaReady } from './db.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const DAY_MS = 86400000;
const PERIODS = { week: 7, month: 30, all: null };
export const RATIO_MIN_MATCHES = 3;
export const RATIO_MIN_SECONDS = 3600;
export const PLAYER_ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
export const HIDDEN_PROFILE = 'This profile is hidden';

/** SQL predicate: `idExpr` is not hidden on the server bound to `serverParam` (or on all servers). */
export function notHidden(idExpr, serverParam) {
  return `${idExpr} NOT IN (SELECT player_id FROM hidden_players WHERE server_key IN ('*', ${serverParam}))`;
}

export function hasHistory(server) {
  return server.history !== false;
}

/** hasHistory, except live-recorded servers also need migration 0005 (until then they answer like history: false). */
export async function historyAvailable(env, server) {
  if (!hasHistory(server)) return false;
  return !isLiveHistory(server) || liveSchemaReady(env.DB);
}

export function validatePlayerId(playerId) {
  if (!PLAYER_ID_RE.test(playerId)) throw new HttpError(400, 'invalid player id');
}

const STATS = {
  kills: 'kills',
  combat: 'combat',
  offense: 'offense',
  defense: 'defense',
  support: 'support',
  teamkills: 'teamkills',
  vehicles: 'vehicles_destroyed',
  time: 'time_seconds',
  kd: 'CAST(kills AS REAL) / MAX(1, deaths)',
  kpm: 'kills * 60.0 / MAX(1, time_seconds)',
};
const RATIO_STATS = new Set(['kd', 'kpm']);
// Servers recorded from the live feed only have kills, deaths, cash and (approximate) time.
const LIVE_STATS = {
  kills: 'kills',
  deaths: 'deaths',
  kd: 'CAST(kills AS REAL) / MAX(1, deaths)',
  cash: 'cash',
  matches: 'agg.matches',
  time: 'time_seconds',
};

export function historySource(server) {
  return isLiveHistory(server) ? 'live' : 'crcon';
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
const ratio = (a, b) => round2(a / Math.max(1, b));

export function requireServer(env, params) {
  const key = params.get('server');
  const server = findServer(env, key);
  if (!server) throw new HttpError(key ? 404 : 400, key ? `unknown server '${key}'` : 'no servers configured');
  return server;
}

function parseIntParam(params, name, fallback, min, max) {
  const raw = params.get(name);
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new HttpError(400, `invalid '${name}'`);
  return Math.min(n, max);
}

export async function status(env) {
  const servers = getServers(env);
  const keys = servers.flatMap((s) => [`total:${s.key}`, `last_sync:${s.key}`]);
  const [states, counts] = await Promise.all([
    getStates(env.DB, keys),
    env.DB.prepare(
      `SELECT server_key, COUNT(*) AS stored, SUM(processed = 1) AS processed, MAX("end") AS last_match
       FROM matches GROUP BY server_key`
    ).all(),
  ]);
  const byKey = Object.fromEntries(counts.results.map((r) => [r.server_key, r]));
  return {
    servers: servers.map((s) => {
      const c = byKey[s.key] || {};
      const total = states[`total:${s.key}`];
      return {
        key: s.key,
        name: s.name,
        game: s.game,
        history: s.history !== false,
        historySource: s.history !== false ? historySource(s) : null,
        matchesStored: c.stored || 0,
        matchesProcessed: c.processed || 0,
        total: total ? Number(total) : null,
        lastMatchAt: c.last_match || null,
        lastSyncAt: states[`last_sync:${s.key}`] || null,
      };
    }),
  };
}

export async function serverSummary(env, key) {
  const server = findServer(env, key);
  if (!server || !key) throw new HttpError(404, `unknown server '${key}'`);
  if (!(await historyAvailable(env, server))) {
    return {
      key: server.key,
      name: server.name,
      history: false,
      matches: 0,
      players: 0,
      kills: 0,
      avgPlayers: null,
      lastMatchAt: null,
      mapStats: [],
    };
  }
  if (isLiveHistory(server)) return liveServerSummary(env, server);
  const db = env.DB;
  const [m, p, maps] = await db.batch([
    db
      .prepare(
        `SELECT COUNT(*) AS matches, AVG(player_count) AS avg_players, MAX("end") AS last_match
         FROM matches WHERE server_key = ?1 AND counted = 1`
      )
      .bind(server.key),
    db
      .prepare('SELECT COUNT(*) AS players, COALESCE(SUM(kills), 0) AS kills FROM player_totals WHERE server_key = ?1')
      .bind(server.key),
    db
      .prepare(
        `SELECT map_base, MAX(map_base_pretty) AS pretty, COUNT(*) AS matches,
                SUM(allied_score > axis_score) AS allied_wins, SUM(axis_score > allied_score) AS axis_wins
         FROM matches WHERE server_key = ?1 AND counted = 1
         GROUP BY map_base ORDER BY matches DESC`
      )
      .bind(server.key),
  ]);
  const mr = m.results[0] || {};
  const pr = p.results[0] || {};
  return {
    key: server.key,
    name: server.name,
    history: true,
    matches: mr.matches || 0,
    players: pr.players || 0,
    kills: pr.kills || 0,
    avgPlayers: mr.avg_players != null ? Math.round(mr.avg_players * 10) / 10 : null,
    lastMatchAt: mr.last_match || null,
    mapStats: maps.results.map((r) => ({
      mapId: r.map_base,
      mapPretty: r.pretty,
      matches: r.matches,
      alliedWins: r.allied_wins || 0,
      axisWins: r.axis_wins || 0,
    })),
  };
}

/** Summary for a live-recorded server: faction win rates replace allied/axis map win rates. */
async function liveServerSummary(env, server) {
  const db = env.DB;
  const [m, p, factions, maps, since] = await db.batch([
    db
      .prepare(
        `SELECT COUNT(*) AS matches, AVG(player_count) AS avg_players, MAX("end") AS last_match
         FROM matches WHERE server_key = ?1 AND counted = 1`
      )
      .bind(server.key),
    db
      .prepare(
        `SELECT COUNT(*) AS players, COALESCE(SUM(kills), 0) AS kills, COALESCE(SUM(cash), 0) AS cash
         FROM player_totals WHERE server_key = ?1`
      )
      .bind(server.key),
    db
      .prepare(
        `SELECT j.value ->> '$.name' AS name, MAX(j.value ->> '$.colour') AS colour, COUNT(*) AS matches,
                SUM(m.winner = j.value ->> '$.name') AS wins
         FROM matches m, json_each(m.faction_scores) AS j
         WHERE m.server_key = ?1 AND m.counted = 1
         GROUP BY name ORDER BY matches DESC, name LIMIT 6`
      )
      .bind(server.key),
    db
      .prepare(
        `SELECT map_base, MAX(map_base_pretty) AS pretty, COUNT(*) AS matches
         FROM matches WHERE server_key = ?1 AND counted = 1
         GROUP BY map_base ORDER BY matches DESC LIMIT 20`
      )
      .bind(server.key),
    db
      .prepare(
        `SELECT (SELECT MIN(start) FROM matches WHERE server_key = ?1) AS first_match,
                (SELECT MIN(first_snapshot_at) FROM live_match_state WHERE server_key = ?1) AS first_state`
      )
      .bind(server.key),
  ]);
  const mr = m.results[0] || {};
  const pr = p.results[0] || {};
  const s = since.results[0] || {};
  const firsts = [Date.parse(s.first_match), Number(s.first_state)].filter((t) => Number.isFinite(t) && t > 0);
  return {
    key: server.key,
    name: server.name,
    history: true,
    historySource: 'live',
    recordingSince: firsts.length ? new Date(Math.min(...firsts)).toISOString() : null,
    matches: mr.matches || 0,
    players: pr.players || 0,
    kills: pr.kills || 0,
    cash: pr.cash || 0,
    avgPlayers: mr.avg_players != null ? Math.round(mr.avg_players * 10) / 10 : null,
    lastMatchAt: mr.last_match || null,
    factionStats: factions.results
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        colour: /^#[0-9a-f]{3,8}$/i.test(r.colour || '') ? r.colour : null,
        matches: r.matches,
        wins: r.wins || 0,
      })),
    mapStats: maps.results.map((r) => ({ mapId: r.map_base, mapPretty: r.pretty, matches: r.matches })),
  };
}

export async function leaderboard(env, params) {
  const server = requireServer(env, params);
  const period = params.get('period') || 'week';
  if (!(period in PERIODS)) throw new HttpError(400, "period must be one of week, month, all");
  const stat = params.get('stat') || 'kills';
  const live = isLiveHistory(server);
  const stats = live ? LIVE_STATS : STATS;
  if (!(stat in stats)) {
    throw new HttpError(400, `stat must be one of ${Object.keys(stats).join(', ')}${live ? ' for this server' : ''}`);
  }
  const limit = parseIntParam(params, 'limit', 25, 1, 100);
  const isRatio = RATIO_STATS.has(stat);
  const minMatches = isRatio ? RATIO_MIN_MATCHES : 1;
  if (!(await historyAvailable(env, server))) return { server: server.key, period, stat, minMatches, history: false, rows: [] };

  const source = live
    ? PERIODS[period] == null
      ? `SELECT player_id, matches, kills, deaths, time_seconds, cash FROM player_totals WHERE server_key = ?1`
      : `SELECT player_id, COUNT(*) AS matches, SUM(kills) AS kills, SUM(deaths) AS deaths,
                SUM(time_seconds) AS time_seconds, SUM(cash) AS cash
         FROM player_matches WHERE server_key = ?1 AND counted = 1 AND start >= ?2
         GROUP BY player_id`
    : PERIODS[period] == null
      ? `SELECT player_id, matches, kills, deaths, time_seconds, combat, offense, defense, support,
                teamkills, vehicles_destroyed
         FROM player_totals WHERE server_key = ?1`
      : `SELECT player_id, COUNT(*) AS matches, SUM(kills) AS kills, SUM(deaths) AS deaths,
                SUM(time_seconds) AS time_seconds, SUM(combat) AS combat, SUM(offense) AS offense,
                SUM(defense) AS defense, SUM(support) AS support, SUM(teamkills) AS teamkills,
                SUM(vehicles_destroyed) AS vehicles_destroyed
         FROM player_matches WHERE server_key = ?1 AND counted = 1 AND start >= ?2
         GROUP BY player_id`;
  const since = PERIODS[period] == null ? '' : new Date(Date.now() - PERIODS[period] * DAY_MS).toISOString();

  const { results } = await env.DB.prepare(
    `WITH agg AS (${source})
     SELECT agg.*, p.last_name, p.platform, ${stats[stat]} AS value
     FROM agg JOIN players p ON p.player_id = agg.player_id
     WHERE agg.matches >= ?3 AND agg.time_seconds >= ?4 AND ${notHidden('agg.player_id', '?1')}
     ORDER BY value DESC, agg.kills DESC
     LIMIT ?5`
  )
    .bind(server.key, since, minMatches, isRatio ? RATIO_MIN_SECONDS : 0, limit)
    .all();

  return {
    server: server.key,
    period,
    stat,
    minMatches,
    history: true,
    historySource: historySource(server),
    rows: results.map((r, i) => ({
      rank: i + 1,
      playerId: r.player_id,
      name: r.last_name,
      platform: r.platform,
      value: isRatio ? round2(r.value) : r.value,
      matches: r.matches,
      kills: r.kills,
      deaths: r.deaths,
      timeSeconds: r.time_seconds,
      ...(live ? { cash: r.cash } : {}),
    })),
  };
}

export async function searchPlayers(env, params) {
  const server = requireServer(env, params);
  const q = (params.get('q') || '').trim();
  if (q.length < 2) throw new HttpError(400, "'q' must be at least 2 characters");
  if (q.length > 40) throw new HttpError(400, "'q' must be at most 40 characters");
  if (!(await historyAvailable(env, server))) return { history: false, rows: [] };
  const pattern = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const { results } = await env.DB.prepare(
    `SELECT pt.player_id, p.last_name, p.platform, pt.matches, pt.last_seen
     FROM player_totals pt JOIN players p ON p.player_id = pt.player_id
     WHERE pt.server_key = ?1 AND (
       p.last_name LIKE ?2 ESCAPE '\\'
       OR pt.player_id IN (SELECT player_id FROM player_names WHERE name LIKE ?2 ESCAPE '\\')
     ) AND ${notHidden('pt.player_id', '?1')}
     ORDER BY pt.matches DESC LIMIT 20`
  )
    .bind(server.key, pattern)
    .all();
  return {
    history: true,
    rows: results.map((r) => ({
      playerId: r.player_id,
      name: r.last_name,
      platform: r.platform,
      matches: r.matches,
      lastSeen: r.last_seen,
    })),
  };
}

function wonFor(side, allied, axis) {
  if (allied == null || axis == null || allied === axis) return null;
  if (side === 'allies') return allied > axis;
  if (side === 'axis') return axis > allied;
  return null;
}

export async function playerProfile(env, playerId, params) {
  const server = requireServer(env, params);
  validatePlayerId(playerId);
  if (!(await historyAvailable(env, server))) throw new HttpError(404, 'no match history for this server', { history: false });
  const live = isLiveHistory(server);
  const db = env.DB;
  // Nemesis/victim lists are keyed by name, so drop every name a hidden player has used.
  const hiddenNames = `j.key NOT IN (
    SELECT pn.name FROM hidden_players h JOIN player_names pn ON pn.player_id = h.player_id
    WHERE h.server_key IN ('*', ?2))`;
  const liveCols = live ? ', pm.cash, pm.time_seconds, m.winner' : '';
  const [hidden, player, totals, weapons, nemesis, victims, recent, record] = await db.batch([
    db
      .prepare(`SELECT 1 AS hidden FROM hidden_players WHERE player_id = ?1 AND server_key IN ('*', ?2) LIMIT 1`)
      .bind(playerId, server.key),
    db.prepare('SELECT * FROM players WHERE player_id = ?1').bind(playerId),
    db.prepare('SELECT * FROM player_totals WHERE server_key = ?1 AND player_id = ?2').bind(server.key, playerId),
    db
      .prepare(
        'SELECT weapon, kills FROM player_weapons WHERE player_id = ?1 AND server_key = ?2 ORDER BY kills DESC LIMIT 8'
      )
      .bind(playerId, server.key),
    db
      .prepare(
        `SELECT j.key AS name, SUM(j.value) AS count
         FROM player_matches pm, json_each(pm.death_by) AS j
         WHERE pm.player_id = ?1 AND pm.server_key = ?2 AND pm.counted = 1 AND ${hiddenNames}
         GROUP BY j.key ORDER BY count DESC LIMIT 5`
      )
      .bind(playerId, server.key),
    db
      .prepare(
        `SELECT j.key AS name, SUM(j.value) AS count
         FROM player_matches pm, json_each(pm.most_killed) AS j
         WHERE pm.player_id = ?1 AND pm.server_key = ?2 AND pm.counted = 1 AND ${hiddenNames}
         GROUP BY j.key ORDER BY count DESC LIMIT 5`
      )
      .bind(playerId, server.key),
    db
      .prepare(
        `SELECT pm.match_id, pm.side, pm.kills, pm.deaths, pm.combat, pm.offense, pm.defense, pm.support,
                m.map_id, m.map_pretty, m.game_mode, m.start, m."end", m.allied_score, m.axis_score${liveCols}
         FROM player_matches pm JOIN matches m ON m.id = pm.match_id
         WHERE pm.player_id = ?1 AND pm.server_key = ?2
         ORDER BY pm.start DESC LIMIT 15`
      )
      .bind(playerId, server.key),
    live
      ? db
          .prepare(
            `SELECT COALESCE(SUM(pm.side = m.winner), 0) AS wins,
                    COALESCE(SUM(m.winner IS NOT NULL AND pm.side IS NOT m.winner), 0) AS losses
             FROM player_matches pm JOIN matches m ON m.id = pm.match_id
             WHERE pm.player_id = ?1 AND pm.server_key = ?2 AND pm.counted = 1`
          )
          .bind(playerId, server.key)
      : db.prepare('SELECT NULL AS wins, NULL AS losses'),
  ]);

  if (hidden.results.length) throw new HttpError(404, HIDDEN_PROFILE);
  const p = player.results[0];
  const t = totals.results[0];
  if (!p || !t) throw new HttpError(404, 'player not found');

  if (live) {
    const rec = record.results[0] || {};
    return {
      playerId: p.player_id,
      name: p.last_name,
      platform: p.platform,
      historySource: 'live',
      firstSeen: t.first_seen,
      lastSeen: t.last_seen,
      totals: {
        matches: t.matches,
        kills: t.kills,
        deaths: t.deaths,
        cash: t.cash ?? 0,
        timeSeconds: t.time_seconds,
      },
      wins: rec.wins ?? 0,
      losses: rec.losses ?? 0,
      kd: ratio(t.kills, t.deaths),
      topWeapons: [],
      nemesis: [],
      victims: [],
      recentMatches: recent.results.map((r) => ({
        matchId: r.match_id,
        mapId: r.map_id,
        mapPretty: r.map_pretty,
        gameMode: r.game_mode,
        start: r.start,
        end: r.end,
        side: r.side,
        won: r.winner == null || r.side == null ? null : r.side === r.winner,
        kills: r.kills,
        deaths: r.deaths,
        cash: r.cash ?? 0,
        timeSeconds: r.time_seconds,
      })),
    };
  }

  return {
    playerId: p.player_id,
    name: p.last_name,
    platform: p.platform,
    firstSeen: t.first_seen,
    lastSeen: t.last_seen,
    totals: {
      matches: t.matches,
      kills: t.kills,
      deaths: t.deaths,
      teamkills: t.teamkills,
      timeSeconds: t.time_seconds,
      combat: t.combat,
      offense: t.offense,
      defense: t.defense,
      support: t.support,
      vehiclesDestroyed: t.vehicles_destroyed,
    },
    kd: ratio(t.kills, t.deaths),
    kpm: round2(t.kills / Math.max(1, t.time_seconds / 60)),
    bestKillStreak: t.best_streak,
    topWeapons: weapons.results.map((r) => ({ weapon: r.weapon, kills: r.kills })),
    nemesis: nemesis.results.map((r) => ({ name: r.name, count: r.count })),
    victims: victims.results.map((r) => ({ name: r.name, count: r.count })),
    recentMatches: recent.results.map((r) => ({
      matchId: r.match_id,
      mapId: r.map_id,
      mapPretty: r.map_pretty,
      gameMode: r.game_mode,
      start: r.start,
      end: r.end,
      side: r.side,
      won: wonFor(r.side, r.allied_score, r.axis_score),
      kills: r.kills,
      deaths: r.deaths,
      combat: r.combat,
      offense: r.offense,
      defense: r.defense,
      support: r.support,
    })),
  };
}

export async function listMatches(env, params) {
  const server = requireServer(env, params);
  const page = parseIntParam(params, 'page', 1, 1, 10000);
  const pageSize = 25;
  if (!(await historyAvailable(env, server))) return { page, pageSize, total: 0, history: false, rows: [] };
  const db = env.DB;
  const [count, rows] = await db.batch([
    db.prepare('SELECT COUNT(*) AS total FROM matches WHERE server_key = ?1').bind(server.key),
    db
      .prepare(
        `SELECT * FROM matches WHERE server_key = ?1 ORDER BY start DESC LIMIT ?2 OFFSET ?3`
      )
      .bind(server.key, pageSize, (page - 1) * pageSize),
  ]);
  return {
    page,
    pageSize,
    total: count.results[0]?.total || 0,
    history: true,
    historySource: historySource(server),
    rows: rows.results.map(matchInfo),
  };
}

const MATCH_STATUS = { 0: 'pending', 1: 'done', 2: 'unavailable' };
export const HIDDEN_NAME = 'Hidden player';

function matchInfo(m) {
  return {
    id: m.id,
    mapId: m.map_id,
    mapBase: m.map_base,
    mapPretty: m.map_pretty,
    mapBasePretty: m.map_base_pretty,
    gameMode: m.game_mode,
    attackers: m.attackers,
    environment: m.environment,
    imageName: m.image_name,
    start: m.start,
    end: m.end,
    durationS: m.duration_s,
    alliedScore: m.allied_score,
    axisScore: m.axis_score,
    alliedFaction: m.allied_faction ?? null,
    axisFaction: m.axis_faction ?? null,
    playerCount: m.player_count,
    processed: m.processed === 1,
    status: MATCH_STATUS[m.processed] || 'pending',
    ...(m.faction_scores != null ? { factionScores: factionScores(m.faction_scores), winner: m.winner ?? null } : {}),
  };
}

/** Stored [{name, score, colour}] for 3-faction (live-recorded) matches. */
function factionScores(text) {
  const list = parseJson(text);
  return Array.isArray(list)
    ? list
        .filter((f) => f && typeof f.name === 'string')
        .map((f) => ({
          name: f.name,
          score: Number.isFinite(f.score) ? f.score : null,
          colour: /^#[0-9a-f]{3,8}$/i.test(f.colour || '') ? f.colour : null,
        }))
    : [];
}

/** Parses a stored {key: count} JSON column into [{[label]: key, [value]: count}], dropping `skip` keys. */
function entries(text, label, value, skip) {
  if (!text) return null;
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  return Object.entries(obj)
    .filter(([k]) => !skip || !skip.has(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ [label]: k, [value]: v }));
}

/**
 * One match plus its scoreboard from D1. Hidden players keep their stats but are shown as
 * "Hidden player" with no id (so no profile link), and their names are dropped from everyone's
 * most-killed / killed-by lists.
 */
export async function matchDetail(env, matchId, params) {
  const server = requireServer(env, params);
  if (!PLAYER_ID_RE.test(matchId)) throw new HttpError(400, 'invalid match id');
  if (!(await historyAvailable(env, server))) throw new HttpError(404, 'no match history for this server', { history: false });
  const live = isLiveHistory(server);
  const db = env.DB;
  const [match, players, hidden] = await db.batch([
    db.prepare('SELECT * FROM matches WHERE id = ?1 AND server_key = ?2').bind(matchId, server.key),
    db
      .prepare(
        `SELECT player_id, name, platform, side, level, kills, deaths, teamkills, kills_streak, time_seconds,
                combat, offense, defense, support, vehicles_destroyed, top_weapons, most_killed, death_by${live ? ', cash' : ''}
         FROM player_matches WHERE match_id = ?1 AND server_key = ?2 AND time_seconds > 0
         ORDER BY kills DESC`
      )
      .bind(matchId, server.key),
    db
      .prepare(
        `SELECT h.player_id, pn.name FROM hidden_players h
         LEFT JOIN player_names pn ON pn.player_id = h.player_id
         WHERE h.server_key IN ('*', ?1)`
      )
      .bind(server.key),
  ]);
  const m = match.results[0];
  if (!m) throw new HttpError(404, 'match not found');
  const info = { ...matchInfo(m), historySource: historySource(server) };
  if (!info.processed) return { server: server.key, ...info, rows: [] };

  const hiddenIds = new Set(hidden.results.map((r) => r.player_id));
  const hiddenNames = new Set(hidden.results.map((r) => r.name).filter(Boolean));
  for (const p of players.results) if (hiddenIds.has(p.player_id) && p.name) hiddenNames.add(p.name);

  const rows = players.results.map((p) => {
    const isHidden = hiddenIds.has(p.player_id);
    if (live) {
      return {
        playerId: isHidden ? null : p.player_id,
        name: isHidden ? HIDDEN_NAME : p.name,
        hidden: isHidden,
        side: p.side,
        kills: p.kills,
        deaths: p.deaths,
        cash: p.cash ?? 0,
        timeSeconds: p.time_seconds,
      };
    }
    return {
      playerId: isHidden ? null : p.player_id,
      name: isHidden ? HIDDEN_NAME : p.name,
      hidden: isHidden,
      platform: isHidden ? null : p.platform,
      side: p.side,
      level: isHidden ? null : p.level,
      kills: p.kills,
      deaths: p.deaths,
      teamkills: p.teamkills,
      killsStreak: p.kills_streak,
      timeSeconds: p.time_seconds,
      combat: p.combat,
      offense: p.offense,
      defense: p.defense,
      support: p.support,
      vehiclesDestroyed: p.vehicles_destroyed,
      topWeapons: entries(p.top_weapons, 'weapon', 'kills'),
      mostKilled: entries(p.most_killed, 'name', 'count', hiddenNames),
      deathBy: entries(p.death_by, 'name', 'count', hiddenNames),
    };
  });
  return { server: server.key, ...info, rows };
}
