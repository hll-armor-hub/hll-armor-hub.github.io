import { HIDDEN_PROFILE, historyAvailable, requireServer, validatePlayerId } from './api.js';
import { isLiveHistory } from './config.js';

const SITE = 'https://hll-armor-hub.com';
// Discord/Twitter don't render SVG og:images, so share pages use the site's PNG logo.
const OG_IMAGE = `${SITE}/images/Hell%20Let%20loose%20Logos/Hell%20Let%20Loose-Lockup-Primary-White.png`;
const CACHE = 'public, max-age=600';
const MISS_CACHE = 'public, max-age=60';
const FONT = `Oswald, 'Bebas Neue', 'Arial Narrow', 'Helvetica Neue', Arial, Helvetica, sans-serif`;
const W = 1200;
const H = 630;
const PAD = 72;

const PLATFORMS = { steam: 'Steam', epic: 'Epic', xbl: 'Xbox', xbox: 'Xbox', psn: 'PlayStation', ps: 'PlayStation', ps5: 'PlayStation', playstation: 'PlayStation' };

// Strip characters XML 1.0 forbids, then escape markup.
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

const fmtInt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

function truncate(s, max) {
  const chars = Array.from(s || '');
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : chars.join('');
}

function platformLabel(p) {
  if (!p) return null;
  const k = String(p).toLowerCase();
  return PLATFORMS[k] || k.charAt(0).toUpperCase() + k.slice(1, 20);
}

/** Loads everything a card or share page needs in one D1 batch. */
async function loadCard(env, params, playerId) {
  const server = requireServer(env, params);
  validatePlayerId(playerId);
  if (!(await historyAvailable(env, server))) return { server, state: 'missing' };
  const live = isLiveHistory(server);
  const db = env.DB;
  const [hidden, player, totals, weapon] = await db.batch([
    db
      .prepare(`SELECT 1 AS hidden FROM hidden_players WHERE player_id = ?1 AND server_key IN ('*', ?2) LIMIT 1`)
      .bind(playerId, server.key),
    db.prepare('SELECT last_name, platform FROM players WHERE player_id = ?1').bind(playerId),
    db
      .prepare(
        `SELECT matches, kills, deaths, time_seconds${live ? ', cash' : ''} FROM player_totals WHERE server_key = ?1 AND player_id = ?2`
      )
      .bind(server.key, playerId),
    db
      .prepare('SELECT weapon, kills FROM player_weapons WHERE player_id = ?1 AND server_key = ?2 ORDER BY kills DESC LIMIT 1')
      .bind(playerId, server.key),
  ]);
  if (hidden.results.length) return { server, state: 'hidden' };
  const p = player.results[0];
  const t = totals.results[0];
  if (!p || !t) return { server, state: 'missing' };
  const w = weapon.results[0];
  return {
    server,
    state: 'ok',
    playerId,
    name: p.last_name || 'Unknown soldier',
    platform: platformLabel(p.platform),
    matches: t.matches,
    kills: t.kills,
    kd: t.kills / Math.max(1, t.deaths),
    kpm: t.kills / Math.max(1, t.time_seconds / 60),
    cash: live ? t.cash || 0 : null,
    topWeapon: w ? { weapon: w.weapon, kills: w.kills } : null,
  };
}

function text(x, y, content, { size, fill = '#FAFAF9', weight = 400, anchor = 'start', spacing = 0, maxWidth } = {}) {
  const s = escapeXml(content);
  // Rough width estimate for condensed fonts; squeeze only when the text would overflow.
  const est = Array.from(String(content ?? '')).length * size * 0.56 + Math.max(0, spacing) * Array.from(String(content ?? '')).length;
  const fit = maxWidth && est > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : '';
  const ls = spacing ? ` letter-spacing="${spacing}"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${ls}${fit}>${s}</text>`;
}

function frame(inner, serverName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C1917"/><stop offset="0.55" stop-color="#0C0A09"/><stop offset="1" stop-color="#0C0A09"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D4A017"/><stop offset="1" stop-color="#F5C542"/></linearGradient>
<radialGradient id="glow" cx="0.85" cy="0.1" r="0.6"><stop offset="0" stop-color="#D4A017" stop-opacity="0.18"/><stop offset="1" stop-color="#D4A017" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#F5C542" stroke-opacity="0.045" stroke-width="1"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#0C0A09"/>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="20" fill="none" stroke="url(#gold)" stroke-opacity="0.6" stroke-width="2"/>
<rect x="20" y="20" width="${W - 40}" height="8" rx="4" fill="url(#gold)"/>
${text(PAD, 98, 'AFTER HOURS OPERATORS', { size: 26, fill: '#D4A017', weight: 700, spacing: 6 })}
${text(W - PAD, 98, truncate(serverName, 44), { size: 24, fill: '#A8A29E', anchor: 'end', maxWidth: 560 })}
${inner}
<rect x="${PAD}" y="${H - 108}" width="${W - PAD * 2}" height="1" fill="#D4A017" fill-opacity="0.35"/>
${text(W - PAD, H - 60, 'hll-armor-hub.com', { size: 30, fill: 'url(#gold)', weight: 700, anchor: 'end', spacing: 1 })}
</svg>`;
}

function statBox(i, label, value) {
  const gap = 24;
  const bw = (W - PAD * 2 - gap * 3) / 4;
  const x = PAD + i * (bw + gap);
  const y = 300;
  return `<rect x="${x}" y="${y}" width="${bw}" height="150" rx="14" fill="#1C1917" fill-opacity="0.85" stroke="#D4A017" stroke-opacity="0.35"/>
${text(x + bw / 2, y + 88, value, { size: 64, fill: 'url(#gold)', weight: 700, anchor: 'middle', maxWidth: bw - 32 })}
${text(x + bw / 2, y + 126, label, { size: 20, fill: '#A8A29E', weight: 600, anchor: 'middle', spacing: 4 })}`;
}

export function renderCardSvg(d) {
  const name = truncate(d.name, 28);
  const len = Array.from(name).length;
  const size = len <= 14 ? 96 : len <= 18 ? 84 : len <= 23 ? 70 : 58;
  let inner = text(PAD, 222, name, { size, weight: 700, maxWidth: W - PAD * 2 });
  inner += `\n<rect x="${PAD}" y="262" width="140" height="6" rx="3" fill="url(#gold)"/>`;
  if (d.platform) {
    const label = d.platform.toUpperCase();
    const bw = label.length * 13 + 36;
    inner += `\n<rect x="${PAD + 160}" y="250" width="${bw}" height="30" rx="15" fill="none" stroke="#D4A017" stroke-opacity="0.7"/>`;
    inner += `\n${text(PAD + 160 + bw / 2, 271, label, { size: 16, fill: '#F5C542', weight: 600, anchor: 'middle', spacing: 2 })}`;
  }
  inner += '\n' + statBox(0, 'MATCHES', fmtInt(d.matches));
  inner += '\n' + statBox(1, 'KILLS', fmtInt(d.kills));
  inner += '\n' + statBox(2, 'K/D', fmt2(d.kd));
  inner += '\n' + (d.cash != null ? statBox(3, 'CASH', fmtInt(d.cash)) : statBox(3, 'KILLS / MIN', fmt2(d.kpm)));
  if (d.topWeapon) {
    inner += '\n' + text(PAD, H - 66, 'TOP WEAPON', { size: 18, fill: '#78716C', weight: 600, spacing: 4 });
    inner += '\n' + text(PAD + 170, H - 64, `${truncate(d.topWeapon.weapon, 36)} · ${fmtInt(d.topWeapon.kills)} kills`, {
      size: 28,
      weight: 600,
      maxWidth: 560,
    });
  }
  return frame(inner, d.server.name || d.server.key);
}

function renderUnavailableSvg(server, message) {
  const inner = `${text(PAD, 280, message, { size: 72, weight: 700, maxWidth: W - PAD * 2 })}
<rect x="${PAD}" y="306" width="140" height="6" rx="3" fill="url(#gold)"/>
${text(PAD, 380, 'Community stats for After Hours Operators', { size: 30, fill: '#A8A29E' })}`;
  return frame(inner, server.name || server.key);
}

export async function playerCard(env, params, playerId) {
  const d = await loadCard(env, params, playerId);
  const headers = { 'Content-Type': 'image/svg+xml; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  if (d.state !== 'ok') {
    const svg = renderUnavailableSvg(d.server, d.state === 'hidden' ? 'Profile hidden' : 'Player not found');
    return new Response(svg, { status: 404, headers: { ...headers, 'Cache-Control': MISS_CACHE } });
  }
  return new Response(renderCardSvg(d), { headers: { ...headers, 'Cache-Control': CACHE } });
}

function sharePage({ title, description, target, status, cache }) {
  const t = escapeXml(title);
  const desc = escapeXml(description);
  const href = escapeXml(target);
  const img = escapeXml(OG_IMAGE);
  const js = JSON.stringify(target).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${desc}">
<meta name="theme-color" content="#D4A017">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="After Hours Operators · HLL Armor Hub">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${href}">
<meta property="og:image" content="${img}">
<meta property="og:image:alt" content="Hell Let Loose logo">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<link rel="canonical" href="${href}">
<meta http-equiv="refresh" content="0; url=${href}">
<script>location.replace(${js});</script>
</head>
<body style="background:#0C0A09;color:#F5C542;font-family:system-ui,sans-serif;padding:2rem">
<p>Redirecting to <a style="color:#F5C542" href="${href}">${t}</a>…</p>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function playerSharePage(env, params, playerId) {
  const d = await loadCard(env, params, playerId);
  const playerUrl = `${SITE}/app.html#/community/player/${encodeURIComponent(playerId)}`;
  if (d.state === 'hidden') {
    return sharePage({
      title: 'AHO stats',
      description: HIDDEN_PROFILE,
      target: `${SITE}/app.html#/community`,
      status: 404,
      cache: MISS_CACHE,
    });
  }
  if (d.state !== 'ok') {
    return sharePage({
      title: 'AHO stats',
      description: 'After Hours Operators community stats for Hell Let Loose.',
      target: playerUrl,
      status: 404,
      cache: MISS_CACHE,
    });
  }
  const parts = [
    `${fmtInt(d.matches)} matches`,
    `${fmtInt(d.kills)} kills`,
    `K/D ${fmt2(d.kd)}`,
    d.cash != null ? `${fmtInt(d.cash)} cash` : `KPM ${fmt2(d.kpm)}`,
  ];
  if (d.topWeapon) parts.push(`Top weapon: ${d.topWeapon.weapon}`);
  return sharePage({
    title: `${d.name} · AHO stats`,
    description: `${d.server.name || d.server.key}: ${parts.join(' · ')}`,
    target: playerUrl,
    status: 200,
    cache: CACHE,
  });
}
