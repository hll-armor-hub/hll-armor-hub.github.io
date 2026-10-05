import { cachedPayload } from './cache.js';
import { HttpError } from './api.js';

const APPS = { wardogs: 1867240, hllv: 3079210, hll: 686810 };
const TTL_MS = 10 * 60 * 1000;
const API_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=';

async function fetchCount(appId) {
  const res = await fetch(API_URL + appId, {
    headers: { 'User-Agent': 'AHO-ArmorHub-Stats/1.0 (+https://hll-armor-hub.com)', Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Steam ${res.status}`);
  const body = await res.json();
  const count = Number(body?.response?.player_count);
  if (body?.response?.result !== 1 || !Number.isFinite(count)) throw new Error('Steam bad response');
  return { playerCount: count };
}

export async function steamPlayers(env, params) {
  const game = params.get('game') || 'wardogs';
  const appId = APPS[game];
  if (!appId) throw new HttpError(400, `game must be one of ${Object.keys(APPS).join(', ')}`);
  const { payload, fetchedAt, stale } = await cachedPayload(env.DB, `steam:${appId}`, {
    ttlMs: TTL_MS,
    refresh: () => fetchCount(appId),
  });
  return {
    game,
    appId,
    playerCount: payload?.playerCount ?? null,
    updatedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
    stale,
  };
}
