/* Community stats data: everything (match lists, scoreboards, leaderboards, players) comes from the
   AHO stats Worker. The browser never requests bifroststats.com JSON: Bifrost's Cloudflare rules
   block visitor IPs that browse match files quickly. Bifrost URLs here are only for plain links. */

const BIFROST = "https://bifroststats.com";

/** Deployed Worker origin. On localhost only, localStorage "aho.statsApi" (e.g. "http://127.0.0.1:8787") overrides it for testing. */
export const STATS_API = devStatsApi() || "https://aho-stats.tiny-breeze-5321.workers.dev";

function devStatsApi() {
    try {
        if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
        const v = localStorage.getItem("aho.statsApi");
        return v && /^https?:\/\/[\w.:-]+\/?$/.test(v) ? v : null;
    } catch (e) {
        return null;
    }
}

/* Keys, games and Bifrost ids mirror the Worker's SERVERS var (worker/wrangler.toml). First entry is the default.
   history: false = live status only (no CRCON match list on Bifrost yet).
   historySource: "live" = the Worker records matches from the live feed (Wardogs: 3 factions, kills/deaths/cash only);
   until the Worker reports history for it, the stats views fall back to the no-history panel.
   connect: a "steam://connect/<ip>:<port>" URL once the server address is known; null hides the button. */
export const SERVERS = [
    { key: "aho-hllv", game: "hllv", name: "After Hours Operators | Vietnam", short: "HLL Vietnam", tiny: "Vietnam",
        bifrostId: "3b40d468-7833-4694-ac38-4ed3a15c334e", history: true,
        sides: { allies: "U.S.", axis: "NVA" },
        steamAppId: 3079210, launchLabel: "Launch HLL: Vietnam", connect: null },
    { key: "aho-wd", game: "wd", name: "After Hours Operators | Wardogs", short: "Wardogs", tiny: "Wardogs",
        bifrostId: "96fabd0b-b739-498b-906b-16ac0529b0a3", history: true, historySource: "live",
        steamAppId: 1867240, launchLabel: "Launch Wardogs", connect: null,
        region: "USEAST", joinId: "ca730715-c9b5-418f-851a-a9f41f901ea9" },
    { key: "aho-hll", game: "hll", name: "After Hours Operators | WWII", short: "HLL WWII", tiny: "WWII",
        bifrostId: "3f1da8e4-e2bf-4ac8-b9ba-b0275d9e6bf4", history: true,
        sides: { allies: "Allies", axis: "Axis" },
        steamAppId: 686810, launchLabel: "Launch HLL", connect: null }
];

export const SERVER_SEARCH = "After Hours Operators";

export const SIDE_LABELS = { us: "U.S.", nva: "NVA", ger: "Germany", sov: "Soviets", gb: "Britain", dak: "DAK", b8a: "8th Army" };

/* Wardogs faction colours (the game's own). */
export const FACTION_COLOURS = { Lonestar: "#4CB1EF", Valkyra: "#FA503E", Manticore: "#1DD65C" };

export function isLiveServer(server) {
    return !!server && server.history !== false && server.historySource === "live";
}

/** Known faction colour, else a validated colour from the Worker, else neutral grey. */
export function factionColour(name, fallback) {
    if (FACTION_COLOURS[name]) return FACTION_COLOURS[name];
    return /^#[0-9a-f]{3,8}$/i.test(fallback || "") ? fallback : "#A8A29E";
}

/* Matches the Worker's player-id rule; ids are still encoded/escaped wherever they're used. */
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const SHORT_TTL_MS = 60 * 1000;
const LONG_TTL_MS = 10 * 60 * 1000;
const PREF_KEY = "aho.statsServer";
const cache = new Map();

export function getServer(key) {
    return SERVERS.find(function (s) { return s.key === key; }) || SERVERS[0];
}

export function hasServer(key) {
    return SERVERS.some(function (s) { return s.key === key; });
}

/** Remembered stats server (localStorage), falling back to the default. */
export function preferredServer() {
    let key = null;
    try { key = localStorage.getItem(PREF_KEY); } catch (e) { /* storage blocked */ }
    return getServer(key);
}

export function setPreferredServer(key) {
    if (!hasServer(key)) return;
    try { localStorage.setItem(PREF_KEY, key); } catch (e) { /* storage blocked */ }
}

/** ?server= wins over the remembered choice. */
export function serverFromQuery(query) {
    const key = query && query.server;
    return hasServer(key) ? getServer(key) : preferredServer();
}

export function steamRunUrl(server) {
    return "steam://run/" + server.steamAppId;
}

export function isSafeId(id) {
    return typeof id === "string" && ID_RE.test(id) && !/^\.+$/.test(id);
}

/** ttlMs: omit to cache for the session (immutable docs like finished matches). */
function getJSON(url, ttlMs) {
    const hit = cache.get(url);
    if (hit && (!hit.expires || hit.expires > Date.now())) return hit.promise;
    const entry = { expires: ttlMs ? Date.now() + ttlMs : 0, promise: null };
    entry.promise = fetch(url, { headers: { Accept: "application/json" } }).then(function (r) {
        if (r.ok) return r.json();
        return r.json().catch(function () { return null; }).then(function (body) {
            const err = new Error(body && typeof body.error === "string" ? body.error : `Stats request failed (${r.status})`);
            err.status = r.status;
            err.body = body;
            throw err;
        });
    }).catch(function (err) {
        if (cache.get(url) === entry) cache.delete(url);
        throw err;
    });
    cache.set(url, entry);
    return entry.promise;
}

/* ---------------- Bifrost (links only) ---------------- */

export function bifrostMatchUrl(server, mapId, matchId) {
    return `${BIFROST}/${server.game}/${encodeURIComponent(mapId)}/${encodeURIComponent(matchId)}`;
}

export const BIFROST_SITE = BIFROST;
export const BIFROST_SIGNUP = "https://bifrostgaming.com/pricing/";

/** Public server page (leaderboards + match list) on bifroststats.com. */
export function bifrostServerUrl(server) {
    return `${BIFROST}/${server.game}/leaderboards/servers/${server.bifrostId}`;
}

/* ---------------- Stats Worker ---------------- */

export function statsApiReady() {
    return !!STATS_API;
}

const API_BASE = STATS_API.replace(/\/$/, "");

function qs(params) {
    const q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
        if (params[k] != null && params[k] !== "") q.set(k, params[k]);
    });
    const s = q.toString();
    return s ? "?" + s : "";
}

function api(path, params, ttlMs) {
    if (!STATS_API) return Promise.reject(new Error("Stats service is not connected yet"));
    return getJSON(API_BASE + "/v1" + path + qs(params), ttlMs || SHORT_TTL_MS);
}

export const HIDDEN_PROFILE = "This profile is hidden";

export function fetchPotw(serverKey) {
    return api("/potw", { server: serverKey }, LONG_TTL_MS);
}

const DISCORD_INVITE_API = "https://discord.com/api/v9/invites/AHO?with_counts=true";
const DISCORD_CACHE_KEY = "aho.discordCounts";
const DISCORD_CACHE_MS = 10 * 60 * 1000;
let discordDirect = null;

/** Discord rate-limits the Worker's Cloudflare egress, so the browser asks Discord itself (CORS-allowed).
    Failed attempts are cached too: at most one request per visitor per 10 minutes. */
function fetchDiscordDirect() {
    if (discordDirect) return discordDirect;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(DISCORD_CACHE_KEY)); } catch (e) { /* storage blocked */ }
    if (cached && typeof cached.t === "number" && Date.now() - cached.t < DISCORD_CACHE_MS) {
        discordDirect = Promise.resolve(cached);
        return discordDirect;
    }
    function save(entry) {
        entry.t = Date.now();
        try { localStorage.setItem(DISCORD_CACHE_KEY, JSON.stringify(entry)); } catch (e) { /* storage blocked */ }
        return entry;
    }
    discordDirect = fetch(DISCORD_INVITE_API, { credentials: "omit" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
            return save({
                memberCount: typeof d.approximate_member_count === "number" ? d.approximate_member_count : null,
                onlineCount: typeof d.approximate_presence_count === "number" ? d.approximate_presence_count : null
            });
        })
        .catch(function () { return save({ memberCount: null, onlineCount: null }); });
    return discordDirect;
}

/** Worker counts when present, otherwise the browser-side fallback. Resolves with null counts on failure. */
export function fetchDiscord() {
    const worker = STATS_API ? api("/discord", null, LONG_TTL_MS).catch(function () { return null; }) : Promise.resolve(null);
    return worker.then(function (d) {
        if (d && typeof d.memberCount === "number") return d;
        return fetchDiscordDirect();
    });
}

const STEAM_GAMES = { wd: "wardogs", hllv: "hllv", hll: "hll" };

/** Game-wide Steam player count (not our server), cached by the Worker for 10 minutes. */
export function fetchSteamPlayers(game) {
    const id = STEAM_GAMES[game];
    if (!id) return Promise.resolve(null);
    return api("/steam", { game: id }, LONG_TTL_MS).catch(function () { return null; });
}

/** Share page with OG tags; redirects to the player page on the site. */
export function playerShareUrl(serverKey, playerId) {
    return API_BASE + "/p/" + encodeURIComponent(playerId) + qs({ server: serverKey });
}

export function playerCardUrl(serverKey, playerId) {
    return API_BASE + "/v1/card/" + encodeURIComponent(playerId) + ".svg" + qs({ server: serverKey });
}

export function fetchLeaderboard(serverKey, period, stat, limit) {
    return api("/leaderboard", { server: serverKey, period: period, stat: stat, limit: limit || 25 });
}

export function searchPlayers(serverKey, q) {
    return api("/players/search", { server: serverKey, q: q });
}

export function fetchPlayer(serverKey, playerId) {
    if (!isSafeId(playerId)) return Promise.reject(new Error("Invalid player link"));
    return api("/players/" + encodeURIComponent(playerId), { server: serverKey });
}

export function fetchServerSummary(serverKey) {
    return api("/servers/" + encodeURIComponent(serverKey) + "/summary");
}

/** { page, pageSize, total, history, rows: [match info] }, newest first. */
export function fetchMatches(server, page) {
    if (server.history === false) return Promise.resolve({ page: 1, pageSize: 25, total: 0, history: false, rows: [] });
    return api("/matches", { server: server.key, page: Math.max(1, page | 0) });
}

/** Match info + scoreboard rows; rows is empty until the Worker has imported the match (processed: false). */
export function fetchMatchDetail(server, matchId) {
    if (!isSafeId(matchId)) return Promise.reject(new Error("Invalid match link"));
    return api("/matches/" + encodeURIComponent(matchId), { server: server.key });
}

/* ---------------- Shaping helpers ---------------- */

/** "Thanh Hòa Bridge (Day, U.S. Off.)" -> "thanh-hoa-bridge" (matches /images/infantry/maps/<slug>/). */
export function mapSlug(prettyName) {
    return String(prettyName || "")
        .replace(/\(.*$/, "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Only these files exist under /images/infantry/maps/ — one image per map, regardless of match environment. */
const MAP_ART = {
    "cam-ranh-port": "cam-ranh-port/cam-ranh-port-day.webp",
    "dak-to-airfield": "dak-to-airfield/dak-to-airfield-day.webp",
    "hue-outskirts": "hue-outskirts/hue-outskirts-day.webp",
    "quang-ngai": "quang-ngai/quang-ngai-day.webp",
    "thanh-hoa-bridge": "thanh-hoa-bridge/thanh-hoa-bridge-day.webp",
    "van-tuong": "van-tuong/van-tuong-day.webp",
    "carentan": "carentan/carentan-day.webp",
    "driel": "driel/driel-day.webp",
    "el-alamein": "el-alamein/elalamein-day.webp",
    "elsenborn-ridge": "elsenborn-ridge/elsenbornridge-day.webp",
    "foy": "foy/foy-day.webp",
    "hill-400": "hill-400/hill400-day.webp",
    "hurtgen-forest": "hurtgen-forest/hurtgenforest-day.webp",
    "juno-beach": "juno-beach/junobeach-day.png",
    "kharkov": "kharkov/kharkov-day.webp",
    "kursk": "kursk/kursk-day.webp",
    "mortain": "mortain/mortain-day.webp",
    "omaha-beach": "omaha-beach/omahabeach-day.webp",
    "purple-heart-lane": "purple-heart-lane/purpleheartlane-rain.webp",
    "remagen": "remagen/remagen-day.webp",
    "sainte-marie-du-mont": "sainte-marie-du-mont/stmariedumont-day.webp",
    "st-marie-du-mont": "sainte-marie-du-mont/stmariedumont-day.webp",
    "sainte-mere-eglise": "sainte-mere-eglise/stmereeglise-day.webp",
    "st-mere-eglise": "sainte-mere-eglise/stmereeglise-day.webp",
    "smolensk": "smolensk/smolensk-day.webp",
    "stalingrad": "stalingrad/stalingrad-day.webp",
    "tobruk": "tobruk/tobruk-day.webp",
    "utah-beach": "utah-beach/utahbeach-day.webp"
};

/** Thumbnail for a Worker match row (base map pretty name, falling back to the layer name). */
export function mapThumb(match) {
    const name = match ? match.mapBasePretty || match.mapPretty : "";
    const file = MAP_ART[mapSlug(name)];
    return file ? `/images/infantry/maps/${file}` : "";
}

/** Team label from the match's faction ("us", "ger"…); older matches without one use the server's default sides. */
export function sideLabel(match, team, server) {
    const name = match && (team === "allies" ? match.alliedFaction : match.axisFaction);
    if (name) return SIDE_LABELS[name] || String(name).toUpperCase();
    const sides = server && server.sides;
    return (sides && sides[team]) || (team === "allies" ? "Allies" : "Axis");
}

/** "Quảng Ngãi (Day) Warfare" -> "Quảng Ngãi". */
export function mapTitle(match) {
    const name = match ? match.mapBasePretty || String(match.mapPretty || "").replace(/\s*\(.*$/, "") : "";
    return name || "Unknown map";
}

export function durationText(startIso, endIso) {
    const s = Math.max(0, (Date.parse(endIso) - Date.parse(startIso)) / 1000);
    if (!isFinite(s) || !s) return "–";
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
}

export function timeAgo(iso) {
    const t = Date.parse(iso);
    if (!isFinite(t)) return "";
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    const d = Math.round(s / 86400);
    return d < 30 ? d + "d ago" : new Date(t).toLocaleDateString();
}

export function minutes(sec) {
    const m = Math.round((sec || 0) / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}