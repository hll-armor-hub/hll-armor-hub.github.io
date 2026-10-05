const DEFAULT_BASE = 'https://bifroststats.com';
let BASE = DEFAULT_BASE;

/** Points every Bifrost request of this isolate at `base` (a localhost mock in development) or back at Bifrost. */
export function setBifrostBase(base) {
  BASE = base || DEFAULT_BASE;
}
// Bifrost's Cloudflare challenges generic script user agents; this one is allowed.
const HEADERS = {
  'User-Agent': 'AHO-ArmorHub-Stats/1.0 (+https://hll-armor-hub.com)',
  Accept: 'application/json',
};
const MIN_SPACING_MS = 1100;
// Cloudflare rule / rate-limit responses; any of these triggers a 10-minute backoff.
const CHALLENGE_STATUSES = new Set([403, 429, 503]);

let lastFetchAt = 0;

export class BifrostError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getResult(path) {
  const wait = lastFetchAt + MIN_SPACING_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();

  const res = await fetch(BASE + path, { headers: HEADERS });
  if (!res.ok) {
    await res.body?.cancel();
    const err = new BifrostError(`Bifrost ${res.status} for ${path}`, res.status);
    err.challenge = CHALLENGE_STATUSES.has(res.status);
    throw err;
  }
  let body;
  try {
    body = await res.json();
  } catch {
    const err = new BifrostError(`Bifrost returned non-JSON for ${path}`, 0);
    err.challenge = true;
    throw err;
  }
  if (!body || body.failed || !body.result) {
    throw new BifrostError(`Bifrost reported failure for ${path}`, 0);
  }
  return body.result;
}

export function fetchMatchList(server, page) {
  return getResult(`/${server.game}/leaderboards/servers/${server.bifrostId}/crcon?page=${page}`);
}

export function fetchMatch(server, mapId, matchId) {
  return getResult(`/${server.game}/${encodeURIComponent(mapId)}/${encodeURIComponent(matchId)}/crcon`);
}

/** True for responses that mean Bifrost's Cloudflare rules are pushing back on us. */
export function isChallenge(err) {
  return err instanceof BifrostError && err.challenge === true;
}

// Callers must enforce the >= 45s per-server spacing Bifrost requires (see live.js);
// this skips the sync spacing so visitor requests never wait behind a cron run.
export async function fetchLiveDoc(server) {
  const path = `/${server.game}/leaderboards/servers/${server.bifrostId}/live/json`;
  const res = await fetch(BASE + path, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  const isJson = (res.headers.get('Content-Type') || '').includes('json');
  if (!res.ok || !isJson) {
    await res.body?.cancel();
    const err = new BifrostError(`Bifrost ${res.status}${isJson ? '' : ' (non-JSON)'} for ${path}`, res.status);
    err.challenge = CHALLENGE_STATUSES.has(res.status) || !isJson;
    throw err;
  }
  try {
    return await res.json();
  } catch {
    throw new BifrostError(`Bifrost returned non-JSON for ${path}`, 0);
  }
}
