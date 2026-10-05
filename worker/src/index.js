import {
  HttpError,
  PLAYER_ID_RE,
  leaderboard,
  listMatches,
  matchDetail,
  playerProfile,
  searchPlayers,
  serverSummary,
  status,
} from './api.js';
import { setBifrostBase } from './bifrost.js';
import { invalidate } from './cache.js';
import { playerCard, playerSharePage } from './card.js';
import { bifrostBaseOverride, findServer, getAllowedOrigins, isLiveHistory } from './config.js';
import { discordCounts } from './discord.js';
import { live } from './live.js';
import { steamPlayers } from './steam.js';
import { maybePostPotw, playerOfTheWeek, potwPostWindowOpen } from './potw.js';
import { finalizeDue, recordSnapshot, runRecorder } from './recorder.js';
import { runSync } from './sync.js';

// The Wardogs recorder's cron; every other cron expression runs the CRCON sync.
const RECORDER_CRON = '* * * * *';

const CACHE_SECONDS = 60;
const LIVE_BROWSER_CACHE_SECONDS = 15;
// A processed match never changes, except when a player in it is hidden.
const FINISHED_MATCH_CACHE_SECONDS = 3600;

async function matchDetailResponse(env, params, matchId) {
  const data = await matchDetail(env, matchId, params);
  const maxAge = data.processed && data.end ? FINISHED_MATCH_CACHE_SECONDS : CACHE_SECONDS;
  return json(data, 200, { 'Cache-Control': `public, max-age=${maxAge}` });
}

// Handlers return plain data (sent as JSON) or a Response with its own headers.
const ROUTES = [
  [/^\/v1\/status$/, (env) => status(env)],
  [/^\/v1\/servers\/([^/]+)\/summary$/, (env, p, m) => serverSummary(env, decodeURIComponent(m[1]))],
  [/^\/v1\/leaderboard$/, (env, p) => leaderboard(env, p)],
  [/^\/v1\/players\/search$/, (env, p) => searchPlayers(env, p)],
  [/^\/v1\/players\/([^/]+)$/, (env, p, m) => playerProfile(env, decodeURIComponent(m[1]), p)],
  [/^\/v1\/matches$/, (env, p) => listMatches(env, p)],
  [/^\/v1\/matches\/([^/]+)$/, (env, p, m) => matchDetailResponse(env, p, decodeURIComponent(m[1]))],
  [/^\/v1\/potw$/, (env, p) => playerOfTheWeek(env, p)],
  [/^\/v1\/discord$/, (env) => discordCounts(env)],
  [/^\/v1\/steam$/, (env, p) => steamPlayers(env, p)],
  [/^\/v1\/card\/([^/]+)\.svg$/, (env, p, m) => playerCard(env, p, decodeURIComponent(m[1]))],
  [/^\/p\/([^/]+)$/, (env, p, m) => playerSharePage(env, p, decodeURIComponent(m[1]))],
];

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin' };
  if (origin && getAllowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function withHeaders(response, headers) {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return !!(env.ADMIN_TOKEN && token && timingSafeEqual(token, env.ADMIN_TOKEN));
}

async function handleAdminSync(request, env, url) {
  const n = url.searchParams.get('matches');
  const matchesPerRun = n != null && /^\d+$/.test(n) ? Math.min(parseInt(n, 10), 25) : undefined;
  const result = await runSync(env, { matchesPerRun, serverKey: url.searchParams.get('server') || undefined });
  return json(result);
}

async function readHideRequest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'body must be JSON like {"playerId":"...","server":"aho-hllv"}');
  }
  const playerId = typeof body?.playerId === 'string' ? body.playerId.trim() : '';
  if (!PLAYER_ID_RE.test(playerId)) throw new HttpError(400, 'invalid playerId');
  const server = body.server == null || body.server === '' ? null : String(body.server);
  if (server && (server === '*' || !findServer(env, server))) throw new HttpError(400, `unknown server '${server}'`);
  return { playerId, scope: server || '*' };
}

async function hiddenScopes(db, playerId) {
  const { results } = await db
    .prepare('SELECT server_key FROM hidden_players WHERE player_id = ?1 ORDER BY server_key')
    .bind(playerId)
    .all();
  return results.map((r) => r.server_key);
}

async function handleAdminHide(request, env, hide) {
  const db = env.DB;
  const { playerId, scope } = await readHideRequest(request, env);
  if (hide) {
    await db
      .prepare('INSERT OR IGNORE INTO hidden_players (player_id, server_key, hidden_at) VALUES (?1, ?2, ?3)')
      .bind(playerId, scope, new Date().toISOString())
      .run();
  } else if (scope === '*') {
    await db.prepare('DELETE FROM hidden_players WHERE player_id = ?1').bind(playerId).run();
  } else {
    await db.prepare('DELETE FROM hidden_players WHERE player_id = ?1 AND server_key = ?2').bind(playerId, scope).run();
  }
  await invalidate(db, 'potw:');
  const scopes = await hiddenScopes(db, playerId);
  return json({
    ok: true,
    playerId,
    hiddenOn: scopes,
    note: 'Cached pages, cards and Discord previews can take up to 10 minutes to update.',
  });
}

async function handleAdminHiddenList(env) {
  const { results } = await env.DB
    .prepare('SELECT player_id, server_key, hidden_at FROM hidden_players ORDER BY hidden_at DESC LIMIT 500')
    .all();
  return json({ rows: results.map((r) => ({ playerId: r.player_id, server: r.server_key, hiddenAt: r.hidden_at })) });
}

/**
 * Local testing only (needs ALLOW_TEST_SNAPSHOTS=1 in .dev.vars): folds a posted live document as if
 * it had just been fetched, then optionally finalizes (`?finalize=1`, with `now` = snapshot time + 16 min).
 */
async function handleAdminSnapshot(request, env, url) {
  if (env.ALLOW_TEST_SNAPSHOTS !== '1') return json({ error: 'not found' }, 404);
  const server = findServer(env, url.searchParams.get('server'));
  if (!isLiveHistory(server)) throw new HttpError(400, 'server does not record live history');
  let doc;
  try {
    doc = await request.json();
  } catch {
    throw new HttpError(400, 'body must be a live JSON document');
  }
  const at = Date.parse(doc?.sources?.gameStateAt || '');
  const now = Number.isFinite(at) ? at : Date.now();
  const recorded = await recordSnapshot(env, server, doc, now);
  const finalized = url.searchParams.get('finalize') === '1' ? await finalizeDue(env, server, now + 16 * 60 * 1000) : [];
  return json({ recorded, finalized });
}

const ADMIN_ROUTES = {
  '/v1/admin/sync': ['POST', (req, env, url) => handleAdminSync(req, env, url)],
  '/v1/admin/live-snapshot': ['POST', (req, env, url) => handleAdminSnapshot(req, env, url)],
  '/v1/admin/hide': ['POST', (req, env) => handleAdminHide(req, env, true)],
  '/v1/admin/unhide': ['POST', (req, env) => handleAdminHide(req, env, false)],
  '/v1/admin/hidden': ['GET', (req, env) => handleAdminHiddenList(env)],
};

async function handleAdmin(request, env, url) {
  const [method, handler] = ADMIN_ROUTES[url.pathname];
  if (request.method !== method) return json({ error: 'method not allowed' }, 405);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const response = await handler(request, env, url);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

async function handleGet(request, env, ctx, url) {
  const route = ROUTES.find(([re]) => re.test(url.pathname));
  if (!route) return json({ error: 'not found' }, 404);

  // Cache key ignores Origin so all sites share one cached copy; CORS is added per request.
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const [re, handler] = route;
  const data = await handler(env, url.searchParams, url.pathname.match(re));
  const response =
    data instanceof Response ? data : json(data, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
  if (response.status === 200) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    setBifrostBase(bifrostBaseOverride(env));
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      let response;
      if (url.pathname in ADMIN_ROUTES) {
        response = await handleAdmin(request, env, url);
      } else if (url.pathname === '/v1/live' && (request.method === 'GET' || request.method === 'HEAD')) {
        const data = await live(env, url.searchParams);
        response = json(data, 200, { 'Cache-Control': `public, max-age=${LIVE_BROWSER_CACHE_SECONDS}` });
      } else if (request.method === 'GET' || request.method === 'HEAD') {
        response = await handleGet(request, env, ctx, url);
      } else {
        response = json({ error: 'method not allowed' }, 405);
      }
      return withHeaders(response, cors);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status, cors);
      console.error(err);
      return json({ error: 'internal error' }, 500, cors);
    }
  },

  async scheduled(controller, env, ctx) {
    setBifrostBase(bifrostBaseOverride(env));
    if (controller.cron === RECORDER_CRON) {
      ctx.waitUntil(
        runRecorder(env)
          .then((r) => console.log('record', JSON.stringify(r)))
          .catch((err) => console.error('record', err))
      );
      return;
    }
    ctx.waitUntil(
      (async () => {
        // On the weekly posting run, the POTW post replaces that run's sync so the invocation
        // stays inside the free plan's query/CPU limits; the next cron run syncs as usual.
        if (potwPostWindowOpen(env)) {
          const r = await maybePostPotw(env);
          console.log('potw post', JSON.stringify(r));
          if (r.claimed) return;
        }
        const r = await runSync(env);
        console.log('sync', JSON.stringify(r));
      })().catch((err) => console.error('scheduled', err))
    );
  },
};
