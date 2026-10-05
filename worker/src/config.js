// sync_state key holding a ms epoch; neither sync nor live calls Bifrost before it.
export const BIFROST_BACKOFF_KEY = 'bifrost_backoff_until';
export const BIFROST_BACKOFF_MS = 10 * 60 * 1000;

export function getServers(env) {
  const list = JSON.parse(env.SERVERS || '[]');
  return list.filter((s) => s && s.key && s.game && s.bifrostId);
}

/** Servers with match history in D1 (`history: false` opts out), from CRCON or recorded from the live feed. */
export function getHistoryServers(env) {
  return getServers(env).filter((s) => s.history !== false);
}

/** True when a server's history is recorded from its live feed (`historySource: "live"`) instead of CRCON. */
export function isLiveHistory(server) {
  return !!server && server.history !== false && server.historySource === 'live';
}

/** Servers whose CRCON match history is synced. */
export function getCrconServers(env) {
  return getHistoryServers(env).filter((s) => !isLiveHistory(s));
}

/** Servers whose history the per-minute recorder builds from live snapshots. */
export function getRecordedServers(env) {
  return getHistoryServers(env).filter((s) => isLiveHistory(s) && s.live !== false);
}

/** Servers with a Bifrost live feed (`live: false` opts out). */
export function getLiveServers(env) {
  return getServers(env).filter((s) => s.live !== false);
}

export function findServer(env, key) {
  const servers = getServers(env);
  if (!key) return servers[0] || null;
  return servers.find((s) => s.key === key) || null;
}

export function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function intVar(env, name, fallback) {
  const n = parseInt(env[name], 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Local development only: BIFROST_BASE_URL may point at a mock on localhost; anything else is ignored. */
export function bifrostBaseOverride(env) {
  const v = env && typeof env.BIFROST_BASE_URL === 'string' ? env.BIFROST_BASE_URL.trim() : '';
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(v) ? v : null;
}
