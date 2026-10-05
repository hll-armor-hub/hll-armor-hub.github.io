import { cachedPayload } from './cache.js';
import { intVar } from './config.js';

const INVITE = 'AHO';
const INVITE_URL = `https://discord.gg/${INVITE}`;
const API_URL = `https://discord.com/api/v9/invites/${INVITE}?with_counts=true`;
const MIN_TTL_S = 600;
const num = (v) => (Number.isFinite(Number(v)) && v != null ? Number(v) : null);

async function fetchInvite() {
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'AHO-ArmorHub-Stats/1.0 (+https://hll-armor-hub.com)', Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    // Discord often rate-limits Cloudflare's shared Worker egress IPs (JSON 429, or an HTML
    // Cloudflare 1015 page); record which so the site can fall back to a browser-side fetch.
    const text = (await res.text().catch(() => '')).slice(0, 300);
    let detail = '';
    if (res.status === 429) {
      const retry = /"retry_after"\s*:\s*([\d.]+)/.exec(text);
      detail = /error code: 1015|<html/i.test(text) ? ' cf-1015' : `${/"global"\s*:\s*true/.test(text) ? ' global' : ''}${retry ? ` retry_after=${retry[1]}s` : ''}`;
    }
    throw new Error(`Discord ${res.status}${detail}`);
  }
  const body = await res.json();
  return {
    name: typeof body.guild?.name === 'string' ? body.guild.name.slice(0, 100) : null,
    memberCount: num(body.approximate_member_count),
    onlineCount: num(body.approximate_presence_count),
  };
}

export async function discordCounts(env) {
  const ttlMs = Math.max(MIN_TTL_S, intVar(env, 'DISCORD_CACHE_SECONDS', MIN_TTL_S)) * 1000;
  const { payload, fetchedAt, stale, error } = await cachedPayload(env.DB, 'discord', { ttlMs, refresh: fetchInvite });
  return {
    name: payload?.name ?? null,
    memberCount: payload?.memberCount ?? null,
    onlineCount: payload?.onlineCount ?? null,
    invite: INVITE_URL,
    updatedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
    stale,
    error: error ? (/^Discord 429/.test(error) ? 'rate_limited' : 'unavailable') : null,
  };
}
