/* Live status strip for the AHO servers, fed by the stats Worker's /v1/live
   (a cached, privacy-safe summary of Bifrost's live feeds).
   Only ever calls our Worker: Bifrost blocks clients that poll its live feeds too often. */

import { STATS_API } from "./community-data.js";
import { escapeHtml } from "./util.js";

const REFRESH_MS = 60 * 1000;
const COLOUR_RE = /^#[0-9a-f]{3,8}$/i;
const GAME_BADGE = { hll: "HLL", hllv: "HLLV", wd: "Wardogs" };
const STATUS_LABEL = { live: "Live", seeding: "Seeding", empty: "Empty", offline: "Offline" };

export function fetchLive(serverKey) {
    if (!STATS_API) return Promise.reject(new Error("Stats service is not connected yet"));
    const qs = serverKey ? "?server=" + encodeURIComponent(serverKey) : "";
    return fetch(STATS_API.replace(/\/$/, "") + "/v1/live" + qs, { headers: { Accept: "application/json" } })
        .then(function (r) {
            if (!r.ok) throw new Error(`Live status request failed (${r.status})`);
            return r.json();
        });
}

function n(v) {
    const x = Number(v);
    return v != null && isFinite(x) ? x : null;
}

function timeLeft(sec) {
    const s = n(sec);
    if (s == null || s <= 0) return "";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return (h ? `${h}h ${m}m` : `${m}m`) + " left";
}

function scoreHtml(s) {
    const teams = Array.isArray(s.teams) ? s.teams : [];
    if (!teams.length) return "";
    if (teams.length === 2 && s.score) {
        const a = teams[0], b = teams[1];
        return `<div class="cl-score">
            <span>${escapeHtml(a.name || "Allies")}</span>
            <b>${escapeHtml(n(a.score) ?? "–")}</b><span class="cl-score__sep">:</span><b>${escapeHtml(n(b.score) ?? "–")}</b>
            <span>${escapeHtml(b.name || "Axis")}</span>
        </div>`;
    }
    return `<div class="cl-score cl-score--multi">${teams.map(function (t) {
        const dot = COLOUR_RE.test(t.colour || "") ? ` style="background:${t.colour}"` : "";
        const name = t.name || "Team";
        return `<span class="cl-faction" title="${escapeHtml(name)}"><i class="cl-faction__dot"${dot}></i>`
            + `<span class="cl-faction__name">${escapeHtml(name)}</span><span class="cl-faction__short" aria-hidden="true">${escapeHtml(name.slice(0, 3))}</span>`
            + ` <b>${escapeHtml(n(t.score) ?? 0)}</b></span>`;
    }).join("")}</div>`;
}

/** Status pieces of one /v1/live server, for callers that keep their own card markup. */
export function liveParts(s) {
    const status = STATUS_LABEL[s.status] ? s.status : "offline";
    const players = n(s.players) || 0;
    const max = n(s.maxPlayers) || 100;
    const pct = Math.max(0, Math.min(100, Math.round((players / max) * 100)));
    const queue = n(s.queue);
    const map = s.map || {};
    const mapBits = [map.name, map.mode, map.environment].filter(Boolean).map(escapeHtml).join(" · ");
    const left = status === "live" || status === "seeding" ? timeLeft(s.timeRemainingS) : "";
    let detail;
    if (status === "offline") detail = `<p class="cl-note">Server offline or not reporting.</p>`;
    else if (status === "empty") detail = `<p class="cl-note">Empty right now — be the first in.</p>`;
    else detail = `<div class="cl-map">${mapBits || "Unknown map"}${left ? ` <span class="cl-left">${escapeHtml(left)}</span>` : ""}</div>${scoreHtml(s)}`;
    return {
        status: status,
        stale: !!s.stale,
        pill: `<i class="cl-dot" aria-hidden="true"></i>${escapeHtml(STATUS_LABEL[status])}`,
        body: `<div class="cl-pop">
            <b>${escapeHtml(players)}</b><span>/${escapeHtml(max)} players</span>
            ${queue ? `<span class="cl-queue">+${escapeHtml(queue)} queue</span>` : ""}
        </div>
        <div class="cl-track" aria-hidden="true"><span style="width:${pct}%"></span></div>
        ${detail}`
    };
}

function cardHtml(s, seedHref) {
    const p = liveParts(s);
    const game = GAME_BADGE[s.game] ? s.game : "hll";
    const title = s.serverName && s.serverName !== s.name ? ` title="${escapeHtml(s.serverName)}"` : "";
    const cta = p.status === "seeding"
        ? (seedHref
            ? `<a class="cl-cta" href="${escapeHtml(seedHref)}">Seeding — join now</a>`
            : `<span class="cl-cta">Seeding — join now</span>`)
        : "";

    return `<article class="cl-card glass cl-card--${game} is-${p.status}${p.stale ? " is-stale" : ""}" role="listitem">
        <header class="cl-card__head">
            <span class="cl-badge">${escapeHtml(GAME_BADGE[game])}</span>
            <span class="cl-status">${p.pill}</span>
        </header>
        <div class="cl-name"${title}>${escapeHtml(s.name || s.key)}</div>
        ${p.body}
        ${cta}
    </article>`;
}

/** Keeps only opts.games (game keys, e.g. ["wd", "hllv"]) in that order; all servers when unset. */
function pickServers(servers, opts) {
    const games = opts && Array.isArray(opts.games) ? opts.games : null;
    if (!games) return servers;
    return servers.filter(function (s) { return games.indexOf(s.game) !== -1; })
        .sort(function (a, b) { return games.indexOf(a.game) - games.indexOf(b.game); });
}

/** liveDoc: the /v1/live response. opts.seedHref: optional link for the seeding call-to-action; opts.games: see pickServers. */
export function renderLiveBar(liveDoc, opts) {
    const servers = pickServers(liveDoc && Array.isArray(liveDoc.servers) ? liveDoc.servers : [], opts);
    if (!servers.length) return `<p class="cl-empty">No live server data right now.</p>`;
    const seedHref = opts && opts.seedHref;
    return `<div class="cl-bar" role="list" aria-label="AHO servers live status" style="--cl-cols:${servers.length}">${servers.map(function (s) { return cardHtml(s, seedHref); }).join("")}</div>`;
}

function skeletonHtml(opts) {
    const count = opts && Array.isArray(opts.games) ? opts.games.length : 3;
    return `<div class="cl-bar cl-bar--loading" aria-busy="true" style="--cl-cols:${count}">${Array.from({ length: count }).map(function () {
        return `<div class="cl-card glass cl-card--skeleton"></div>`;
    }).join("")}</div>`;
}

/**
 * Fetches /v1/live now and every REFRESH_MS while the tab is visible, calling onDoc(doc) or onError(err).
 * Stops on its own once `el` leaves the DOM; returns a stop() function for explicit teardown.
 */
export function pollLive(el, onDoc, onError) {
    let timer = 0;
    let stopped = false;
    let busy = false;
    let lastAt = 0;

    function stop() {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibility);
    }

    function schedule() {
        clearTimeout(timer);
        if (!stopped && !document.hidden) timer = setTimeout(tick, REFRESH_MS);
    }

    function tick() {
        if (stopped || busy) return;
        if (!el.isConnected) { stop(); return; }
        busy = true;
        fetchLive().then(function (doc) {
            if (stopped || !el.isConnected) return;
            lastAt = Date.now();
            onDoc(doc);
        }).catch(function (err) {
            if (stopped || !el.isConnected) return;
            if (onError) onError(err);
        }).finally(function () {
            busy = false;
            schedule();
        });
    }

    function onVisibility() {
        if (stopped) return;
        if (!el.isConnected) { stop(); return; }
        if (document.hidden) { clearTimeout(timer); return; }
        if (Date.now() - lastAt >= REFRESH_MS) tick();
        else schedule();
    }

    document.addEventListener("visibilitychange", onVisibility);
    tick();
    return stop;
}

/** Renders the whole strip into `el` and keeps it fresh via pollLive. */
export function mountLiveBar(el, opts) {
    if (!el) return function () {};
    let lastDoc = null;
    let lastHtml = "";

    el.classList.add("cl-mount");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = skeletonHtml(opts);

    // Keeps the phone swipe position across refreshes and skips no-op rewrites.
    function paint(html) {
        if (html === lastHtml) return;
        const strip = el.querySelector(".cl-bar");
        const scrollLeft = strip ? strip.scrollLeft : 0;
        el.innerHTML = html;
        lastHtml = html;
        const next = el.querySelector(".cl-bar");
        if (next && scrollLeft) next.scrollLeft = scrollLeft;
    }

    return pollLive(el, function (doc) {
        lastDoc = doc;
        paint(renderLiveBar(doc, opts));
    }, function () {
        if (!lastDoc) paint(`<p class="cl-empty">Live server status is unavailable right now.</p>`);
    });
}
