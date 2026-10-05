import { DAY_MS, RATIO_MIN_MATCHES, RATIO_MIN_SECONDS, historyAvailable, notHidden, requireServer } from './api.js';
import { cachedPayload } from './cache.js';
import { getHistoryServers, intVar, isLiveHistory } from './config.js';
import { getState, setState } from './db.js';

const WINDOW_DAYS = 7;
const MIN_POTW_TTL_S = 3600;
const RETRY_MS = 5 * 60 * 1000;
const PLACES = 3;
const SITE = 'https://hll-armor-hub.com';
const POSTED_KEY = 'potw_posted_at';
// Posting day/hour is checked too, so this only guards against double posts within one week.
const POST_MIN_GAP_MS = 6 * DAY_MS;
const WEBHOOK_RE = /^https:\/\/(?:canary\.|ptb\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const CATEGORIES = [
  { key: 'kills', label: 'Top Kills', unit: 'kills' },
  { key: 'combat', label: 'Top Combat', unit: 'combat' },
  { key: 'offense', label: 'Top Offense', unit: 'offense' },
  { key: 'defense', label: 'Top Defense', unit: 'defense' },
  { key: 'support', label: 'Top Support', unit: 'support' },
  { key: 'kd', label: 'Best K/D', unit: 'K/D', ratio: true },
  { key: 'kpm', label: 'Best Kills/Min', unit: 'KPM', ratio: true },
];
// Servers recorded from the live feed (Wardogs) only have kills, deaths and cash.
const LIVE_CATEGORIES = [
  { key: 'kills', label: 'Top Kills', unit: 'kills' },
  { key: 'kd', label: 'Best K/D', unit: 'K/D', ratio: true },
  { key: 'cash', label: 'Top Earner', unit: 'cash' },
];

const round2 = (n) => Math.round(n * 100) / 100;

function rankColumn(c) {
  // Ratio stats are NULL for players under the thresholds, so they sort last and are skipped.
  const order = c.ratio ? `${c.key} DESC NULLS LAST, kills DESC` : `${c.key} DESC, time_seconds ASC`;
  return `ROW_NUMBER() OVER (ORDER BY ${order}, player_id) AS rk_${c.key}`;
}

async function computePotw(db, server) {
  const to = new Date();
  const from = new Date(to.getTime() - WINDOW_DAYS * DAY_MS);
  const live = isLiveHistory(server);
  const categories = live ? LIVE_CATEGORIES : CATEGORIES;
  // One pass over the window's player_matches (idx_pm_period); only the top PLACES per category come back.
  const { results } = await db
    .prepare(
      `WITH agg AS (
         SELECT player_id, COUNT(*) AS matches, SUM(kills) AS kills, SUM(deaths) AS deaths,
                SUM(time_seconds) AS time_seconds, SUM(combat) AS combat, SUM(offense) AS offense,
                SUM(defense) AS defense, SUM(support) AS support${live ? ', SUM(cash) AS cash' : ''}
         FROM player_matches
         WHERE server_key = ?1 AND counted = 1 AND start >= ?2 AND ${notHidden('player_id', '?1')}
         GROUP BY player_id
       ), scored AS (
         SELECT agg.*,
                CASE WHEN matches >= ?3 AND time_seconds >= ?4 THEN CAST(kills AS REAL) / MAX(1, deaths) END AS kd,
                CASE WHEN matches >= ?3 AND time_seconds >= ?4 THEN kills * 60.0 / MAX(1, time_seconds) END AS kpm
         FROM agg
       ), ranked AS (
         SELECT scored.*, ${categories.map(rankColumn).join(', ')} FROM scored
       )
       SELECT ranked.*, p.last_name, p.platform
       FROM ranked LEFT JOIN players p ON p.player_id = ranked.player_id
       WHERE ${categories.map((c) => `rk_${c.key} <= ${PLACES}`).join(' OR ')}`
    )
    .bind(server.key, from.toISOString(), RATIO_MIN_MATCHES, RATIO_MIN_SECONDS)
    .all();

  const winners = categories.map((c) => {
    const places = results
      .filter((r) => r[`rk_${c.key}`] <= PLACES && r[c.key] != null && r[c.key] > 0)
      .sort((a, b) => a[`rk_${c.key}`] - b[`rk_${c.key}`])
      .map((r) => ({
        playerId: r.player_id,
        name: r.last_name,
        platform: r.platform,
        value: c.ratio ? round2(r[c.key]) : r[c.key],
        matches: r.matches,
      }));
    return { key: c.key, label: c.label, unit: c.unit, winner: places[0] || null, runnersUp: places.slice(1) };
  });
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    computedAt: to.toISOString(),
    categories: winners,
  };
}

function potwTtlMs(env) {
  return Math.max(MIN_POTW_TTL_S, intVar(env, 'POTW_CACHE_SECONDS', MIN_POTW_TTL_S)) * 1000;
}

async function potwFor(env, server) {
  const { payload, stale } = await cachedPayload(env.DB, `potw:${server.key}`, {
    ttlMs: potwTtlMs(env),
    retryMs: RETRY_MS,
    refresh: () => computePotw(env.DB, server),
  });
  return { payload, stale };
}

export async function playerOfTheWeek(env, params) {
  const server = requireServer(env, params);
  const base = {
    server: server.key,
    name: server.name,
    days: WINDOW_DAYS,
    thresholds: { minMatches: RATIO_MIN_MATCHES, minSeconds: RATIO_MIN_SECONDS },
  };
  if (!(await historyAvailable(env, server))) return { ...base, history: false, from: null, to: null, computedAt: null, stale: false, categories: [] };
  const { payload, stale } = await potwFor(env, server);
  if (!payload) return { ...base, history: true, from: null, to: null, computedAt: null, stale: true, categories: [] };
  return { ...base, history: true, ...payload, stale };
}

// ---- Optional weekly Discord post (only when the DISCORD_POTW_WEBHOOK secret is set) ----

/** Cheap, D1-free check so normal cron runs aren't slowed down. */
export function potwPostWindowOpen(env, now = new Date()) {
  if (!env.DISCORD_POTW_WEBHOOK) return false;
  const day = intVar(env, 'POTW_POST_DAY', 1) % 7;
  const hour = intVar(env, 'POTW_POST_HOUR_UTC', 1);
  return now.getUTCDay() === day && now.getUTCHours() >= hour;
}

const fmt = (n) => (Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n));
const escapeMd = (s) => String(s ?? 'Unknown').replace(/([\\*_`~|>\[\]<])/g, '\\$1').slice(0, 64);

function embedField(server, payload) {
  const lines = payload.categories
    .filter((c) => c.winner)
    .map((c) => {
      const w = c.winner;
      const matches = `${w.matches} match${w.matches === 1 ? '' : 'es'}`;
      return `**${c.label}:** ${escapeMd(w.name)} · ${fmt(w.value)} ${c.unit} (${matches})`;
    });
  if (!lines.length) return null;
  return { name: String(server.name || server.key).slice(0, 256), value: lines.join('\n').slice(0, 1024) };
}

/**
 * Called from the cron. Returns { posted: true } or { skipped }. At most one post per week:
 * the sync_state claim is atomic, so overlapping cron runs can't both post.
 */
export async function maybePostPotw(env) {
  const url = env.DISCORD_POTW_WEBHOOK;
  if (!url) return { skipped: 'disabled' };
  if (!WEBHOOK_RE.test(url)) return { skipped: 'DISCORD_POTW_WEBHOOK is not a Discord webhook URL' };
  if (!potwPostWindowOpen(env)) return { skipped: 'outside posting window' };

  const db = env.DB;
  const now = Date.now();
  const previous = await getState(db, POSTED_KEY);
  const claimed = await db
    .prepare(
      `INSERT INTO sync_state (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value
       WHERE CAST(sync_state.value AS INTEGER) <= ?3`
    )
    .bind(POSTED_KEY, String(now), now - POST_MIN_GAP_MS)
    .run();
  if (!claimed.meta.changes) return { skipped: 'already posted this week' };

  const fields = [];
  let from = null;
  let to = null;
  for (const server of getHistoryServers(env)) {
    if (!(await historyAvailable(env, server))) continue;
    const { payload } = await potwFor(env, server);
    if (!payload) continue;
    from = from || payload.from;
    to = to || payload.to;
    const field = embedField(server, payload);
    if (field) fields.push(field);
  }
  if (!fields.length) return { claimed: true, skipped: 'no winners this week' };

  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const body = {
    username: 'AHO Stats',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: 'Players of the Week',
        url: `${SITE}/app.html#/community`,
        description: `After Hours Operators · ${day(from)} – ${day(to)} (UTC)\nK/D and KPM need ${RATIO_MIN_MATCHES}+ matches and ${RATIO_MIN_SECONDS / 3600}h+ played.`,
        color: 0xd4a017,
        fields: fields.slice(0, 25),
        footer: { text: 'hll-armor-hub.com' },
        timestamp: new Date(now).toISOString(),
      },
    ],
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    await setState(db, POSTED_KEY, previous ?? '0');
    return { claimed: true, skipped: `webhook request failed: ${String(err.message || err).slice(0, 100)}` };
  }
  await res.body?.cancel();
  if (!res.ok) {
    // Retry transient failures on the next cron run; a 4xx (bad/deleted webhook) waits a week.
    if (res.status === 429 || res.status >= 500) await setState(db, POSTED_KEY, previous ?? '0');
    return { claimed: true, skipped: `webhook returned ${res.status}` };
  }
  return { claimed: true, posted: true, servers: fields.length };
}
