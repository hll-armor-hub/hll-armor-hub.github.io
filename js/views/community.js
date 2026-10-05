/* Community: After Hours Operators hub, server stats, match scoreboards, player profiles.
   Routes: #/community, #/community/matches, #/community/match/<mapId>/<matchId>, #/community/player/<playerId>
   Stats routes take ?server=<key>; without it the remembered server (localStorage) is used. */
import { escapeHtml, debounce } from "../util.js";
import { icon } from "../icons.js";
import { buildHash } from "../router.js";
import { pollLive, liveParts } from "../community-live.js";
import {
    SERVERS, SERVER_SEARCH, HIDDEN_PROFILE, getServer, preferredServer, setPreferredServer, serverFromQuery, steamRunUrl,
    fetchMatches, fetchMatchDetail, bifrostMatchUrl, bifrostServerUrl, BIFROST_SITE, BIFROST_SIGNUP,
    statsApiReady, fetchLeaderboard, searchPlayers, fetchPlayer, fetchServerSummary, fetchPotw, fetchDiscord, fetchSteamPlayers,
    playerShareUrl, playerCardUrl, isLiveServer,
    mapThumb, mapTitle, sideLabel, durationText, timeAgo, minutes, isSafeId
} from "../community-data.js";
import { WD_LB_STATS, wdNoteHtml, wdMatchCard, wdGlanceHtml, renderWdMatch, wdPlayerHtml } from "./community-wd.js";
import { getTeam } from "../wardogs-team.js";

/* The WWII server is usually empty, so the hub's live/join cards only show these (in this order). */
const HUB_GAMES = ["wd", "hllv"];
const HUB_SERVERS = HUB_GAMES.map(function (g) { return SERVERS.find(function (s) { return s.game === g; }); }).filter(Boolean);

const YT_RAZBORA = "https://www.youtube.com/@Raz_Bora";
const DISCORD_INVITE = "https://discord.gg/guFSTDfsCb";
const VIP_URL = "https://discord.com/channels/722918218305503282/role-subscriptions";

/* Card backgrounds: one is picked at random per render. Only list files that exist under /images/infantry/maps/. */
const MAP_ART = "/images/infantry/maps/";
const WWII_MAPS = [
    ["Omaha Beach", "omaha-beach/omahabeach-day.webp"], ["Utah Beach", "utah-beach/utahbeach-day.webp"],
    ["Carentan", "carentan/carentan-day.webp"], ["Foy", "foy/foy-day.webp"],
    ["Hürtgen Forest", "hurtgen-forest/hurtgenforest-day.webp"], ["Hill 400", "hill-400/hill400-day.webp"],
    ["Sainte-Marie-du-Mont", "sainte-marie-du-mont/stmariedumont-day.webp"], ["Sainte-Mère-Église", "sainte-mere-eglise/stmereeglise-day.webp"],
    ["Purple Heart Lane", "purple-heart-lane/purpleheartlane-rain.webp"], ["Kursk", "kursk/kursk-day.webp"],
    ["Stalingrad", "stalingrad/stalingrad-day.webp"], ["Remagen", "remagen/remagen-day.webp"],
    ["Driel", "driel/driel-day.webp"], ["El Alamein", "el-alamein/elalamein-day.webp"],
    ["Kharkov", "kharkov/kharkov-day.webp"], ["Mortain", "mortain/mortain-day.webp"],
    ["Elsenborn Ridge", "elsenborn-ridge/elsenbornridge-day.webp"], ["Tobruk", "tobruk/tobruk-day.webp"],
    ["Smolensk", "smolensk/smolensk-day.webp"]
];
const VIETNAM_MAPS = [
    ["Thanh Hóa Bridge", "thanh-hoa-bridge/thanh-hoa-bridge-day.webp"], ["Vạn Tường", "van-tuong/van-tuong-day.webp"],
    ["Quảng Ngãi", "quang-ngai/quang-ngai-day.webp"], ["Huế Outskirts", "hue-outskirts/hue-outskirts-day.webp"],
    ["Đắk Tô Airfield", "dak-to-airfield/dak-to-airfield-day.webp"], ["Cam Ranh Port", "cam-ranh-port/cam-ranh-port-day.webp"]
];

/* Same order as the nav. */
const GAMES = [
    { t: "Wardogs", tag: "Season 1", d: "Cash planner with every payout in the game, built from the game's own numbers.", logo: "/images/wardogs/factions/lonestar.png", wardogs: true,
        links: [["Open Wardogs", buildHash("wardogs", "s1", "overview")]] },
    { t: "Hell Let Loose: Vietnam", tag: "Vietnam", d: "Vietnam armor roster and Tankulator, squads, loadout builder and the mortar calculator.", maps: VIETNAM_MAPS,
        links: [["Armor", buildHash("armor", "vietnam", "overview")], ["Infantry", buildHash("infantry", "vietnam", "overview")]] },
    { t: "Hell Let Loose", tag: "WWII", d: "Tank database, Tankulator, artillery & SPA calculators, sights and infantry guides.", maps: WWII_MAPS,
        links: [["Armor", buildHash("armor", "wwii", "overview")], ["Infantry", buildHash("infantry", "wwii", "overview")]] }
];

const CREDITS = [
    ["Tankulator", "In partnership with WIX", "https://www.youtube.com/@wixstreams"],
    ["Data contributions", "Yuh & Wix", "https://www.youtube.com/@wixstreams"],
    ["Site creator", null, null],
    ["Dev support & Maps Let Loose", "Winston", "https://mattw.io/"]
];

const LB_STATS = [
    { id: "kills", label: "Kills" },
    { id: "combat", label: "Combat" },
    { id: "support", label: "Support" },
    { id: "offense", label: "Offense" },
    { id: "defense", label: "Defense" },
    { id: "kd", label: "K/D" },
    { id: "kpm", label: "Kills/min" },
    { id: "vehicles", label: "Vehicles destroyed" },
    { id: "teamkills", label: "Teamkills" },
    { id: "time", label: "Time played" }
];
const LB_SHOWN = 10;
const RECENT_SHOWN = 5;
const LB_PERIODS = [{ id: "week", label: "7 days" }, { id: "month", label: "30 days" }, { id: "all", label: "All time" }];

const SB_COLS = [
    { id: "kills", label: "K" },
    { id: "deaths", label: "D" },
    { id: "kdr", label: "K/D" },
    { id: "combat", label: "Combat" },
    { id: "offense", label: "Off" },
    { id: "defense", label: "Def" },
    { id: "support", label: "Sup" },
    { id: "time_seconds", label: "Time" }
];

const STEAM_NOTE = "Steam PC only — console players join from the in-game server browser.";

/* ---------------- Small helpers ---------------- */

function withServer(path, serverKey, extra) {
    const q = new URLSearchParams(extra || {});
    if (serverKey) q.set("server", serverKey);
    const s = q.toString();
    return path + (s ? "?" + s : "");
}

function matchHref(server, mapId, matchId) {
    return withServer("#/community/match/" + encodeURIComponent(mapId) + "/" + encodeURIComponent(matchId), server.key);
}

function playerHref(playerId, serverKey) {
    return withServer("#/community/player/" + encodeURIComponent(playerId), serverKey);
}

function matchesHref(serverKey, page) {
    return withServer("#/community/matches", serverKey, page > 1 ? { page: page } : null);
}

function loadingBlock(text) {
    return `<div class="loading"><div class="spinner"></div>${text ? `<p>${escapeHtml(text)}</p>` : ""}</div>`;
}

function skeleton(rows, cls) {
    let out = "";
    for (let i = 0; i < rows; i++) out += `<div class="cm-skel ${cls || ""}"></div>`;
    return `<div class="cm-skel-list" aria-hidden="true">${out}</div>`;
}

function errorBlock(err) {
    return `<div class="notice cm-error">${icon("triangle-exclamation")} ${escapeHtml(err && err.message ? err.message : String(err))}</div>`;
}

function backLink(href, label) {
    return `<a class="cm-back" href="${href}">${icon("angle-right")} ${escapeHtml(label)}</a>`;
}

function fmt(n, digits) {
    if (n == null || !isFinite(n)) return "–";
    return digits ? Number(n).toFixed(digits) : Math.round(n).toLocaleString("en-US");
}

function isNum(n) {
    return typeof n === "number" && isFinite(n);
}

function copyText(text, btn, doneLabel) {
    const original = btn.innerHTML;
    const done = function () {
        btn.innerHTML = `${icon("copy")} ${escapeHtml(doneLabel || "Copied")}`;
        setTimeout(function () { btn.innerHTML = original; }, 1800);
    };
    const fallback = function () {
        if (legacyCopy(text)) done();
        else window.prompt("Copy this:", text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(done).catch(fallback);
    }
    fallback();
    return Promise.resolve();
}

function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
}

/** Runs `fn` once `el` is within ~400px of the viewport. */
function whenNear(el, fn) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
}

/** Segmented server picker. mode "button" = in-page state; mode "link" = hrefFor(server) navigation. */
function serverToggle(current, hrefFor) {
    const items = SERVERS.map(function (s) {
        const active = s.key === current.key;
        const label = `<span class="cm-srv__full">${escapeHtml(s.short)}</span><span class="cm-srv__tiny" aria-hidden="true">${escapeHtml(s.tiny)}</span>`;
        if (hrefFor) {
            return `<a class="cm-srv__btn${active ? " active" : ""}" href="${hrefFor(s)}" data-server="${s.key}" aria-label="${escapeHtml(s.short)}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
        }
        return `<button type="button" class="cm-srv__btn${active ? " active" : ""}" data-server="${s.key}" aria-label="${escapeHtml(s.short)}" aria-pressed="${active}">${label}</button>`;
    }).join("");
    return `<div class="cm-srv" role="group" aria-label="Server">${items}</div>`;
}

function bindToggleLinks(root) {
    root.querySelectorAll("a.cm-srv__btn").forEach(function (a) {
        a.addEventListener("click", function () { setPreferredServer(a.getAttribute("data-server")); });
    });
}

/* ---------------- Bifrost credit ---------------- */

const BF_LOGO = "/images/bifrost/bifrost-logo-";

/** Small "Stats powered by Bifrost" link. opts: { label, id, eager } */
function bifrostBadge(href, opts) {
    const o = opts || {};
    const label = o.label ? escapeHtml(o.label) : `Stats powered by <b>Bifrost</b>`;
    return `<a class="cm-bf" href="${escapeHtml(href)}" target="_blank" rel="noopener"${o.id ? ` id="${o.id}"` : ""}>
        <img src="${BF_LOGO}64.webp" width="20" height="20" alt=""${o.eager ? "" : ' loading="lazy"'} decoding="async">
        <span>${label}</span>${icon("up-right-from-square")}
    </a>`;
}

function bifrostPromoHtml(server) {
    return `<aside class="cm-bf-promo glass" aria-labelledby="cmBfPromoH">
        <img class="cm-bf-promo__logo" src="${BF_LOGO}128.webp" srcset="${BF_LOGO}128.webp 1x, ${BF_LOGO}256.webp 2x" width="96" height="96" alt="Bifrost logo" loading="lazy" decoding="async">
        <div class="cm-bf-promo__body">
            <p class="eyebrow">Powered by Bifrost</p>
            <h2 id="cmBfPromoH">Want stats like this for your server?</h2>
            <p>Live server status, leaderboards, player profiles and full match history for Hell Let Loose, HLL: Vietnam and Wardogs servers — powered by Bifrost RCON.</p>
            <div class="cm-bf-promo__btns">
                <a class="btn btn-primary cm-bf-promo__cta" href="${BIFROST_SIGNUP}" target="_blank" rel="noopener">Sign up with Bifrost ${icon("up-right-from-square")}</a>
                <a class="btn btn-ghost cm-join__btn" id="cmBfFull" href="${escapeHtml(bifrostServerUrl(server))}" target="_blank" rel="noopener">See full stats</a>
            </div>
        </div>
    </aside>`;
}

function noHistoryHtml(server) {
    return `<div class="glass cm-soon cm-nohist">
        <span class="cm-soon__icon">${icon("server")}</span>
        <p><strong>No match history recorded yet — live status above.</strong> ${escapeHtml(server.short)} stats will show up here once the server's match records start coming through.</p>
    </div>`;
}

/* ---------------- Credits ---------------- */

function creditPeopleHtml(label) {
    if (label === "Site creator") {
        return `<a href="${YT_RAZBORA}" target="_blank" rel="noopener noreferrer">RazBora</a>`;
    }
    return null;
}

function creditsHtml() {
    return `<p class="eyebrow">Credits</p>
        <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Thanks to</h2>
        <div class="grid cols-2">
            ${CREDITS.map(function (c) {
                const peopleHtml = creditPeopleHtml(c[0]);
                if (peopleHtml) {
                    return `<div class="spec reveal" style="display:block;padding:1rem 1.2rem"><dt>${escapeHtml(c[0])}</dt><dd style="font-family:var(--font-ui);font-weight:600;font-size:1rem">${peopleHtml}</dd></div>`;
                }
                return `<a class="spec card-hover reveal" href="${c[2]}" target="_blank" rel="noopener" style="display:block;padding:1rem 1.2rem"><dt>${escapeHtml(c[0])}</dt><dd style="font-family:var(--font-ui);font-weight:600;font-size:1rem">${escapeHtml(c[1])}</dd></a>`;
            }).join("")}
        </div>`;
}

/* ---------------- Match cards ---------------- */

/** "allies" | "axis" | null (missing scores or a tie). */
function matchWinner(m) {
    const a = m ? m.alliedScore : null;
    const x = m ? m.axisScore : null;
    if (typeof a !== "number" || typeof x !== "number" || a === x) return null;
    return a > x ? "allies" : "axis";
}

function scoreHtml(m, sideNames, big) {
    const winner = matchWinner(m);
    return `<div class="cm-score${big ? " cm-score--big" : ""}">
        <span class="${winner === "allies" ? "win" : ""}">${escapeHtml(sideNames.allies)} <b>${isNum(m.alliedScore) ? escapeHtml(m.alliedScore) : "–"}</b></span>
        <span class="cm-score__sep">:</span>
        <span class="${winner === "axis" ? "win" : ""}"><b>${isNum(m.axisScore) ? escapeHtml(m.axisScore) : "–"}</b> ${escapeHtml(sideNames.axis)}</span>
    </div>`;
}

function matchSides(m, server) {
    return { allies: sideLabel(m, "allies", server), axis: sideLabel(m, "axis", server) };
}

/** m: a match row from the stats Worker (/v1/matches). */
function matchCard(server, m) {
    const thumb = mapThumb(m);
    const meta = [timeAgo(m.end), durationText(m.start, m.end)];
    if (m.processed && isNum(m.playerCount)) meta.push(m.playerCount + " players");
    else if (m.status === "pending") meta.push("scoreboard importing");
    return `<a class="cm-match glass card-hover" href="${matchHref(server, m.mapId || "match", m.id)}"${m.processed ? ' data-processed="1"' : ""}>
        <span class="cm-match__bg"${thumb ? ` style="background-image:url('${escapeHtml(thumb)}')"` : ""} aria-hidden="true"></span>
        <div class="cm-match__body">
            <div class="cm-match__head">
                <span class="cm-match__map">${escapeHtml(mapTitle(m))}</span>
                <span class="badge">${escapeHtml(m.gameMode || "")}</span>
            </div>
            ${scoreHtml(m, matchSides(m, server))}
            <div class="cm-match__meta">${escapeHtml(meta.filter(Boolean).join(" · "))}</div>
        </div>
    </a>`;
}

/* ---------------- Hub: layout ---------------- */

function hubHtml() {
    const server = preferredServer();
    return `<div class="wrap wrap-wide cm-hub">
        ${heroHtml()}

        <section class="cm-block cm-pick" aria-labelledby="cmPickH">
            <h2 class="cm-label" id="cmPickH">${icon("shield-halved")} Pick your game</h2>
            <div class="cm-games">${GAMES.map(gameCard).join("")}</div>
        </section>

        <header class="section-head cm-hub-head">
            <p class="eyebrow">After Hours Operators</p>
            <h2 class="gold-text">Community Hub</h2>
            <p class="lead">Live servers, VIP and stats for the AHO community.</p>
        </header>

        ${liveSectionHtml()}

        <section class="cm-block cm-stats" id="cmStats" aria-labelledby="cmStatsH">
            <div class="cm-stats__head">
                <div class="cm-stats__title">
                    <p class="eyebrow">Server stats</p>
                    <h2 class="cm-server__name" id="cmStatsH">${escapeHtml(server.name)}</h2>
                </div>
                ${serverToggle(server)}
                <a class="btn btn-ghost btn-sm cm-allmatches" id="cmAllMatches" href="${matchesHref(server.key)}"${server.history === false ? " hidden" : ""}>${icon("flag")} All matches</a>
            </div>
            <div id="cmStatsBody">${statsBodyHtml(server)}</div>
            <div class="cm-bf-row">${bifrostBadge(bifrostServerUrl(server), { id: "cmBfStats" })}</div>
        </section>

        ${bifrostPromoHtml(server)}

        <div class="cm-block cm-credits">${creditsHtml()}</div>
    </div>`;
}

function heroHtml() {
    return `<section class="cm-hero glass" aria-labelledby="cmHeroH">
        <div class="cm-hero__art">
            <img src="/images/aho/aho-banner-1024.webp" srcset="/images/aho/aho-banner-640.webp 640w, /images/aho/aho-banner-1024.webp 1024w" sizes="(max-width: 720px) 100vw, 460px" width="1024" height="552" alt="After Hours Operators: gaming for the after-hours crowd" fetchpriority="high" decoding="async">
        </div>
        <div class="cm-hero__body">
            <p class="eyebrow">HLL · HLL Vietnam · Wardogs</p>
            <h1 class="gold-text cm-hero__title" id="cmHeroH">After Hours Operators</h1>
            <p class="cm-hero__lead">Gaming for the after-hours crowd. Live servers, stats and guides for the AHO community.</p>
            <div class="cm-hero__cta">
                <a class="btn btn-primary btn-sm" href="${DISCORD_INVITE}" target="_blank" rel="noopener">${icon("discord")} Join Discord</a>
                <a class="btn btn-ghost btn-sm" href="${VIP_URL}" target="_blank" rel="noopener">${icon("crown")} Get VIP</a>
            </div>
            <p class="cm-discord__count" id="cmDiscordCount" aria-live="polite"></p>
        </div>
    </section>`;
}

function gameCard(g) {
    const map = g.maps ? g.maps[Math.floor(Math.random() * g.maps.length)] : null;
    const art = map
        ? `<img class="tile__bg cm-game__bg" src="${escapeHtml(MAP_ART + map[1])}" alt="" aria-hidden="true" decoding="async" width="640" height="360">`
        : `<img class="cm-game__logo" src="${escapeHtml(g.wardogs && getTeam() ? `/images/wardogs/factions/${getTeam()}.png` : g.logo)}" alt="" aria-hidden="true" decoding="async">`;
    const links = g.links.map(function (l, i) {
        return `<a class="btn ${i === 0 ? "btn-primary" : "btn-ghost"} btn-sm" href="${l[1]}">${escapeHtml(l[0])}</a>`;
    }).join("");
    return `<div class="cm-game tile glass reveal${map ? " tile--art cm-game--map" : ""}${g.wardogs ? " cm-game--wardogs" : ""}">
        ${art}
        <div class="cm-game__top">
            <span class="badge">${escapeHtml(g.tag)}</span>
            ${map ? `<span class="cm-game__map" title="Background: ${escapeHtml(map[0])}">${icon("map")}${escapeHtml(map[0])}</span>` : ""}
        </div>
        <h3 class="cm-game__title"><a class="cm-game__link" href="${g.links[0][1]}"><span>${escapeHtml(g.t)}</span></a></h3>
        <p>${escapeHtml(g.d)}</p>
        <div class="cm-game__links">${links}</div>
    </div>`;
}

/* ---------------- Hub: live status + join (one card per server) ---------------- */

const LIVE_SKELETON = `<div class="cm-skel-list cm-live__skel" aria-hidden="true"><div class="cm-skel cm-skel--pop"></div><div class="cm-skel cm-skel--line"></div><div class="cm-skel cm-skel--line"></div></div>`;
const LIVE_UNAVAILABLE = `<p class="cl-note">Live status unavailable right now — you can still join below.</p>`;

function liveJoinCard(s) {
    const wd = !!s.joinId;
    const launch = `<a class="btn btn-primary cm-join__btn" href="${escapeHtml(steamRunUrl(s))}">${icon("play")} ${escapeHtml(s.launchLabel)}</a>`;
    const connect = s.connect ? `<a class="btn btn-ghost cm-join__btn" href="${escapeHtml(s.connect)}">${icon("server")} Join server</a>` : "";
    const copy = wd ? `<button type="button" class="btn btn-ghost cm-join__btn" data-copy-id="${escapeHtml(s.joinId)}">${icon("copy")} Copy Join ID</button>` : "";
    const help = wd
        ? `<details class="cm-howto">
                <summary>How to join</summary>
                <ol class="cm-join__path" aria-label="How to join by ID">
                    <li>Deploy</li><li>Community</li><li>Join by ID</li><li>Paste</li><li>Lookup</li>
                </ol>
                <p class="cm-join__note">Join ID: <code>${escapeHtml(s.joinId)}</code></p>
                <p class="cm-join__note">No luck? Region <b>${escapeHtml(s.region)}</b>, search <b>“${escapeHtml(SERVER_SEARCH)}”</b>. Once in, open the buy station menu to go AFK safely.</p>
            </details>`
        : `<p class="cm-join__note">Search <b>“${escapeHtml(SERVER_SEARCH)}”</b> in the server browser.</p>`;
    return `<article class="cl-card cm-live glass cl-card--${escapeHtml(s.game)} is-loading" id="cmLive-${s.key}" data-key="${s.key}" data-game="${escapeHtml(s.game)}" aria-labelledby="cmLiveName-${s.key}">
        <header class="cl-card__head">
            <span class="cl-badge">${escapeHtml(s.short)}</span>
            <span class="cl-status" data-live="pill"><i class="cl-dot" aria-hidden="true"></i>Checking…</span>
        </header>
        <h3 class="cl-name" id="cmLiveName-${s.key}">${escapeHtml(s.name)}</h3>
        <p class="cm-steam-count" data-steam hidden></p>
        <div class="cm-live__status" data-live="body">${LIVE_SKELETON}</div>
        <div class="cm-live__join">
            <div class="cm-join__btns">${launch}${connect}${copy}</div>
            ${help}
            <a class="cm-lfg" href="${DISCORD_INVITE}" target="_blank" rel="noopener">${icon("users")} Looking for a squad? Find one in the AHO Discord</a>
        </div>
    </article>`;
}

function liveSectionHtml() {
    return `<section class="cm-block cm-live-sec" id="cmLiveSec" aria-labelledby="cmLiveH">
            <h2 class="cm-label" id="cmLiveH">${icon("server")} Live now · Join</h2>
            <div class="cm-live-grid">${HUB_SERVERS.map(liveJoinCard).join("")}</div>
            <div class="cm-live-foot">
                <p class="cm-fine">${escapeHtml(STEAM_NOTE)}</p>
                ${bifrostBadge(BIFROST_SITE, { eager: true })}
            </div>
        </section>`;
}

/** Static join actions render immediately; each refresh only rewrites the status pill and status body. */
function mountLive(root) {
    const sec = root.querySelector("#cmLiveSec");
    if (!sec) return;
    const cards = HUB_SERVERS.map(function (s) {
        const card = sec.querySelector("#cmLive-" + s.key);
        return { s: s, card: card, pill: card.querySelector('[data-live="pill"]'), body: card.querySelector('[data-live="body"]'), last: "" };
    });
    let gotData = false;

    function paint(c, status, stale, pill, body) {
        const sig = status + "|" + stale + "|" + pill + "|" + body;
        if (sig === c.last) return;
        c.last = sig;
        c.card.className = c.card.className.replace(/\bis-[\w-]+/g, "").trim() + " is-" + status + (stale ? " is-stale" : "");
        c.pill.innerHTML = pill;
        c.body.innerHTML = body;
    }
    function unavailable(c) {
        paint(c, "unknown", false, `<i class="cl-dot" aria-hidden="true"></i>Status unavailable`, LIVE_UNAVAILABLE);
    }

    sec.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-copy-id]");
        if (btn) copyText(btn.getAttribute("data-copy-id"), btn, "Copied");
    });

    cards.forEach(function (c) {
        const el = c.card.querySelector("[data-steam]");
        fetchSteamPlayers(c.s.game).then(function (d) {
            if (!d || !isNum(d.playerCount)) return;
            el.textContent = fmt(d.playerCount) + " playing " + c.s.short + " on Steam right now";
            el.hidden = false;
        });
    });

    pollLive(sec, function (doc) {
        const list = doc && Array.isArray(doc.servers) ? doc.servers : [];
        gotData = true;
        cards.forEach(function (c) {
            const live = list.find(function (x) { return x && x.key === c.s.key; }) || list.find(function (x) { return x && x.game === c.s.game; });
            if (!live) { unavailable(c); return; }
            const p = liveParts(live);
            paint(c, p.status, p.stale, p.pill, p.body);
        });
    }, function () {
        if (!gotData) cards.forEach(unavailable);
    });
}
function mountDiscord(root) {
    const el = root.querySelector("#cmDiscordCount");
    if (!el) return;
    fetchDiscord().then(function (d) {
        if (!d || !isNum(d.memberCount)) return;
        el.textContent = fmt(d.memberCount) + " members" + (isNum(d.onlineCount) ? " · " + fmt(d.onlineCount) + " online" : "");
        el.classList.add("is-on");
    }).catch(function () { /* numbers stay hidden */ });
}

/* ---------------- Hub: stats (glance, POTW, leaderboard, matches) ---------------- */

function lbStatsFor(server) {
    return isLiveServer(server) ? WD_LB_STATS : LB_STATS;
}

function statsBodyHtml(server) {
    if (server.history === false) return noHistoryHtml(server);
    const lbReady = statsApiReady();
    const periodBtns = LB_PERIODS.map(function (p) { return `<button type="button" class="calc-tab" data-lb-period="${p.id}">${escapeHtml(p.label)}</button>`; }).join("");
    const statOpts = lbStatsFor(server).map(function (s) { return `<option value="${s.id}">${escapeHtml(s.label)}</option>`; }).join("");
    return `${isLiveServer(server) ? `<div id="cmWdNote">${wdNoteHtml(null)}</div>` : ""}${lbReady ? `<section class="cm-potw" id="cmPotw" aria-labelledby="cmPotwH" aria-busy="true">${skeleton(1, "cm-skel--potw")}</section>
        <div class="cm-glance glass" id="cmGlance" aria-busy="true">${glanceSkeleton()}</div>` : ""}
        <div class="cm-hub-grid">
            <section>
                <div class="cm-sec-head">
                    <h3>${icon("trophy")} Leaderboard</h3>
                    ${lbReady ? searchHtml() : ""}
                </div>
                ${lbReady ? `<div class="cm-lb-controls">
                    <div class="calc-tabs" role="group" aria-label="Period">${periodBtns}</div>
                    <select class="field cm-lb-stat" id="cmLbStat" aria-label="Stat">${statOpts}</select>
                </div>
                <div id="cmLb" class="cm-lb">${skeleton(LB_SHOWN, "cm-skel--row")}</div>` : `<div class="glass cm-soon">
                    <span class="cm-soon__icon">${icon("trophy")}</span>
                    <p><strong>Leaderboards and player profiles are coming online.</strong> Recent matches are live now.</p>
                </div>`}
            </section>
            <section>
                <div class="cm-sec-head"><h3>${icon("flag")} Recent matches</h3></div>
                <div class="cm-matches" id="cmRecent">${skeleton(RECENT_SHOWN, "cm-skel--match")}</div>
            </section>
        </div>`;
}

function searchHtml() {
    return `<div class="cm-search">
        <input class="field" id="cmSearch" type="search" placeholder="Find a player…" autocomplete="off" spellcheck="false"
            role="combobox" aria-label="Find a player" aria-autocomplete="list" aria-expanded="false" aria-controls="cmSearchResults">
        <div class="cm-search__results" id="cmSearchResults" role="listbox" aria-label="Players" hidden></div>
    </div>`;
}

function glanceSkeleton() {
    return `<div class="cm-glance__stats">${["Matches", "Unique players", "Total kills", "Avg players", "Last match"].map(function (t) {
        return `<div class="cm-glance__stat"><span>${t}</span><b class="cm-skel-text">&nbsp;</b></div>`;
    }).join("")}</div>`;
}

function winBar(server, m) {
    const total = Math.max(1, m.matches || 0);
    const a = Math.round(((m.alliedWins || 0) / total) * 100);
    const x = Math.round(((m.axisWins || 0) / total) * 100);
    const sides = server.sides || { allies: "Allies", axis: "Axis" };
    return `<li>
        <span class="cm-wr__map">${escapeHtml(String(m.mapPretty || m.mapId || "").replace(/\s*\(.*$/, ""))}<small>${fmt(m.matches)} games</small></span>
        <span class="cm-wr__bar" role="img" aria-label="${escapeHtml(sides.allies)} ${a}% wins, ${escapeHtml(sides.axis)} ${x}% wins">
            <span class="cm-wr__a" style="width:${a}%"></span><span class="cm-wr__x" style="width:${x}%"></span>
        </span>
        <span class="cm-wr__pct"><b class="cm-wr__ta">${a}%</b> · <b class="cm-wr__tx">${x}%</b></span>
    </li>`;
}

function glanceHtml(server, d) {
    const sides = server.sides || { allies: "Allies", axis: "Axis" };
    const maps = (d.mapStats || []).filter(function (m) { return m && m.matches > 0; });
    const top = maps.slice(0, 6);
    const rest = maps.slice(6);
    const stats = [
        ["Matches", fmt(d.matches)],
        ["Unique players", fmt(d.players)],
        ["Total kills", fmt(d.kills)],
        ["Avg players", isNum(d.avgPlayers) ? fmt(d.avgPlayers, 1) : "–"],
        ["Last match", d.lastMatchAt ? escapeHtml(timeAgo(d.lastMatchAt)) : "–"]
    ];
    return `<div class="cm-glance__stats">${stats.map(function (s) { return `<div class="cm-glance__stat"><span>${s[0]}</span><b>${s[1]}</b></div>`; }).join("")}</div>
        ${top.length ? `<div class="cm-wr">
            <div class="cm-wr__head"><h3>Map win rates</h3><span class="cm-wr__legend"><i class="cm-wr__a"></i>${escapeHtml(sides.allies)} <i class="cm-wr__x"></i>${escapeHtml(sides.axis)}</span></div>
            <ul class="cm-wr__list">${top.map(function (m) { return winBar(server, m); }).join("")}</ul>
            ${rest.length ? `<details class="cm-wr__more"><summary>All ${maps.length} maps</summary><ul class="cm-wr__list">${rest.map(function (m) { return winBar(server, m); }).join("")}</ul></details>` : ""}
        </div>` : ""}`;
}

function potwHtml(server, doc) {
    const cats = (doc.categories || []).filter(function (c) { return c && c.winner && c.winner.name; });
    if (!cats.length) return "";
    const range = doc.from && doc.to
        ? new Date(doc.from).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + new Date(doc.to).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "Last " + (doc.days || 7) + " days";
    function link(p) {
        return isSafeId(p.playerId) ? `<a href="${playerHref(p.playerId, server.key)}">${escapeHtml(p.name)}</a>` : escapeHtml(p.name);
    }
    function val(c, v) {
        return c.key === "kd" || c.key === "kpm" ? fmt(v, 2) : fmt(v);
    }
    return `<div class="cm-sec-head"><h3 id="cmPotwH">${icon("crown")} Players of the week</h3><span class="cm-dim cm-potw__range">${escapeHtml(range)}</span></div>
        <div class="cm-potw__grid">${cats.map(function (c) {
            const w = c.winner;
            const ups = (c.runnersUp || []).filter(function (p) { return p && p.name; });
            return `<div class="cm-potw__card glass">
                <span class="cm-potw__cat">${escapeHtml(c.label)}</span>
                <span class="cm-potw__name">${link(w)}</span>
                <span class="cm-potw__val">${val(c, w.value)} <small>${escapeHtml(c.unit || "")}</small></span>
                ${ups.length ? `<span class="cm-potw__ups">${ups.map(function (p, i) { return `${i + 2}. ${link(p)}`; }).join(" · ")}</span>` : ""}
            </div>`;
        }).join("")}</div>`;
}

function lbTable(server, doc) {
    const stat = lbStatsFor(server).find(function (s) { return s.id === doc.stat; });
    if (!doc.rows || !doc.rows.length) return `<p class="result-empty">No games in this period yet.</p>`;
    const rows = doc.rows.map(function (r, i) {
        const val = doc.stat === "kd" || doc.stat === "kpm" ? fmt(r.value, 2) : doc.stat === "time" ? minutes(r.value) : fmt(r.value);
        const name = isSafeId(r.playerId) ? `<a href="${playerHref(r.playerId, server.key)}">${escapeHtml(r.name)}</a>` : escapeHtml(r.name);
        return `<tr${i >= LB_SHOWN ? " data-lb-more hidden" : ""}>
            <td class="cm-rank cm-rank--${r.rank <= 3 ? r.rank : "n"}">${escapeHtml(r.rank)}</td>
            <td class="cm-lb-name">${name}</td>
            <td class="num cm-lb-val">${val}</td>
            <td class="num cm-dim">${fmt(r.matches)}</td>
        </tr>`;
    }).join("");
    const note = doc.minMatches > 1 ? `<p class="cm-fine">Ratio stats need at least ${fmt(doc.minMatches)} matches and an hour played.</p>` : "";
    return `<div class="matrix-scroll"><table class="data-table cm-table">
        <thead><tr><th>#</th><th>Player</th><th class="num">${escapeHtml(stat ? stat.label : doc.stat)}</th><th class="num">Games</th></tr></thead>
        <tbody>${rows}</tbody>
    </table></div>${doc.rows.length > LB_SHOWN ? `<button type="button" class="btn btn-ghost btn-sm cm-lb-more" data-lb-toggle aria-expanded="false">Show top ${fmt(doc.rows.length)}</button>` : ""}${note}`;
}

/** Combobox: arrow keys move, Enter opens, Escape/blur closes. */
function mountSearch(root, serverKey, isCurrent) {
    const input = root.querySelector("#cmSearch");
    const list = root.querySelector("#cmSearchResults");
    if (!input || !list) return;
    let active = -1;

    function options() { return list.querySelectorAll('[role="option"]'); }
    function show(html) {
        list.innerHTML = html;
        list.hidden = !html;
        input.setAttribute("aria-expanded", html ? "true" : "false");
        setActive(-1);
    }
    function close() { show(""); }
    function setActive(i) {
        const opts = options();
        active = opts.length ? Math.max(-1, Math.min(i, opts.length - 1)) : -1;
        opts.forEach(function (o, j) {
            o.classList.toggle("active", j === active);
            o.setAttribute("aria-selected", j === active ? "true" : "false");
        });
        if (active >= 0) {
            input.setAttribute("aria-activedescendant", opts[active].id);
            opts[active].scrollIntoView({ block: "nearest" });
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    input.addEventListener("input", debounce(function () {
        const q = input.value.trim();
        if (q.length < 2) { close(); return; }
        searchPlayers(serverKey, q).then(function (doc) {
            if (!isCurrent() || input.value.trim() !== q || document.activeElement !== input) return;
            const rows = (doc.rows || []).filter(function (p) { return isSafeId(p.playerId); });
            show(rows.length
                ? rows.map(function (p, i) {
                    return `<a role="option" id="cmOpt-${i}" aria-selected="false" tabindex="-1" href="${playerHref(p.playerId, serverKey)}"><span>${escapeHtml(p.name)}</span><small>${fmt(p.matches)} games</small></a>`;
                }).join("")
                : `<p class="cm-dim" role="presentation">No players found.</p>`);
        }).catch(function (err) { if (isCurrent()) show(errorBlock(err)); });
    }, 250));

    input.addEventListener("keydown", function (e) {
        const open = !list.hidden;
        if (e.key === "ArrowDown") {
            if (!open) return;
            e.preventDefault();
            setActive(active + 1 >= options().length ? 0 : active + 1);
        } else if (e.key === "ArrowUp") {
            if (!open) return;
            e.preventDefault();
            setActive(active <= 0 ? options().length - 1 : active - 1);
        } else if (e.key === "Enter") {
            const opt = options()[active];
            if (open && opt) { e.preventDefault(); location.hash = opt.getAttribute("href"); }
        } else if (e.key === "Escape") {
            if (open) { e.preventDefault(); close(); }
        }
    });
    // Keep focus in the input while tapping/clicking a result so the link still activates.
    list.addEventListener("mousedown", function (e) { e.preventDefault(); });
    input.addEventListener("blur", close);
}

function mountStats(root, server, state) {
    const gen = ++state.gen;
    const isCurrent = function () { return gen === state.gen && root.isConnected; };
    const body = root.querySelector("#cmStatsBody");
    body.innerHTML = statsBodyHtml(server);
    if (server.history === false) return;

    const recentEl = root.querySelector("#cmRecent");
    fetchMatches(server, 1).then(function (doc) {
        if (!isCurrent()) return;
        const maps = (doc.rows || []).slice(0, RECENT_SHOWN);
        const card = isLiveServer(server) ? wdMatchCard : matchCard;
        recentEl.innerHTML = maps.length ? maps.map(function (m) { return card(server, m); }).join("") : `<p class="result-empty">No matches recorded yet.</p>`;
    }).catch(function (err) { if (isCurrent()) recentEl.innerHTML = errorBlock(err); });

    if (!statsApiReady()) return;

    const glanceEl = root.querySelector("#cmGlance");
    fetchServerSummary(server.key).then(function (d) {
        if (!isCurrent()) return;
        // A Worker that isn't recording this server yet answers history: false.
        if (isLiveServer(server) && d && d.history === false) {
            state.gen++;
            body.innerHTML = noHistoryHtml(server);
            const all = root.querySelector("#cmAllMatches");
            if (all) all.hidden = true;
            return;
        }
        if (isLiveServer(server) && d && d.recordingSince) root.querySelector("#cmWdNote").innerHTML = wdNoteHtml(d.recordingSince);
        if (!d || d.history === false || !d.matches) { glanceEl.hidden = true; return; }
        glanceEl.innerHTML = isLiveServer(server) ? wdGlanceHtml(d) : glanceHtml(server, d);
        glanceEl.removeAttribute("aria-busy");
    }).catch(function () { if (isCurrent()) glanceEl.hidden = true; });

    const potwEl = root.querySelector("#cmPotw");
    fetchPotw(server.key).then(function (doc) {
        if (!isCurrent()) return;
        const html = doc ? potwHtml(server, doc) : "";
        if (!html) { potwEl.hidden = true; return; }
        potwEl.innerHTML = html;
        potwEl.removeAttribute("aria-busy");
    }).catch(function () { if (isCurrent()) potwEl.hidden = true; });

    const lbEl = root.querySelector("#cmLb");
    const statEl = root.querySelector("#cmLbStat");
    if (!lbStatsFor(server).some(function (s) { return s.id === state.stat; })) state.stat = "kills";
    statEl.value = state.stat;
    function drawLb() {
        root.querySelectorAll("[data-lb-period]").forEach(function (b) {
            const on = b.getAttribute("data-lb-period") === state.period;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        lbEl.classList.add("is-loading");
        lbEl.setAttribute("aria-busy", "true");
        const want = state.period + "/" + state.stat;
        fetchLeaderboard(server.key, state.period, state.stat, 25).then(function (doc) {
            if (!isCurrent() || want !== state.period + "/" + state.stat) return;
            lbEl.innerHTML = lbTable(server, doc);
        }).catch(function (err) {
            if (isCurrent()) lbEl.innerHTML = errorBlock(err);
        }).finally(function () {
            lbEl.classList.remove("is-loading");
            lbEl.removeAttribute("aria-busy");
        });
    }
    root.querySelectorAll("[data-lb-period]").forEach(function (b) {
        b.addEventListener("click", function () { state.period = b.getAttribute("data-lb-period"); drawLb(); });
    });
    statEl.addEventListener("change", function (e) { state.stat = e.target.value; drawLb(); });
    lbEl.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-lb-toggle]");
        if (!btn) return;
        const open = btn.getAttribute("aria-expanded") !== "true";
        lbEl.querySelectorAll("[data-lb-more]").forEach(function (tr) { tr.hidden = !open; });
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "Show top " + LB_SHOWN : "Show top " + fmt(lbEl.querySelectorAll("tbody tr").length);
    });
    drawLb();

    mountSearch(root, server.key, isCurrent);
}

function mountStatsSection(root) {
    const section = root.querySelector("#cmStats");
    if (!section) return;
    const state = { gen: 0, period: "week", stat: "kills", server: preferredServer(), loaded: false };
    function load() {
        state.loaded = true;
        mountStats(root, state.server, state);
    }
    section.querySelectorAll("button.cm-srv__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const s = getServer(btn.getAttribute("data-server"));
            if (s.key === state.server.key) return;
            state.server = s;
            setPreferredServer(s.key);
            section.querySelectorAll("button.cm-srv__btn").forEach(function (b) {
                const on = b === btn;
                b.classList.toggle("active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            section.querySelector("#cmStatsH").textContent = s.name;
            const all = section.querySelector("#cmAllMatches");
            all.href = matchesHref(s.key);
            all.hidden = s.history === false;
            root.querySelectorAll("#cmBfStats, #cmBfFull").forEach(function (a) { a.href = bifrostServerUrl(s); });
            load();
        });
    });
    whenNear(section, function () { if (!state.loaded) load(); });
}

function mountHub(root) {
    mountLive(root);
    mountDiscord(root);
    mountStatsSection(root);
}

/* ---------------- All matches ---------------- */

function matchesHtml(route) {
    const server = serverFromQuery(route.query);
    return `<div class="wrap wrap-wide">
        ${backLink("#/community", "Community")}
        <header class="section-head">
            <p class="eyebrow">${escapeHtml(server.name)}</p>
            <h1 class="gold-text">Match history</h1>
        </header>
        <div class="cm-page-toggle">${serverToggle(server, function (s) { return matchesHref(s.key); })}</div>
        <div class="cm-bf-row cm-bf-row--top">${bifrostBadge(bifrostServerUrl(server), { eager: true })}</div>
        ${server.history === false ? noHistoryHtml(server) : `<div class="cm-matches cm-matches--grid" id="cmAll">${skeleton(6, "cm-skel--match")}</div>
        <div class="cm-pager" id="cmPager"></div>`}
    </div>`;
}

function mountMatches(root, route) {
    bindToggleLinks(root);
    const server = serverFromQuery(route.query);
    if (server.history === false) return;
    const page = Math.max(1, Number(route.query.page) || 1);
    const listEl = root.querySelector("#cmAll");
    const pagerEl = root.querySelector("#cmPager");
    fetchMatches(server, page).then(function (doc) {
        if (doc.history === false) { listEl.outerHTML = noHistoryHtml(server); pagerEl.innerHTML = ""; return; }
        const maps = doc.rows || [];
        const card = isLiveServer(server) ? wdMatchCard : matchCard;
        listEl.innerHTML = maps.length ? maps.map(function (m) { return card(server, m); }).join("") : `<p class="result-empty">No matches on this page.</p>`;
        const pages = Math.max(1, Math.ceil((doc.total || 0) / (doc.pageSize || 25)));
        pagerEl.innerHTML = `${page > 1 ? `<a class="btn btn-ghost btn-sm" href="${matchesHref(server.key, page - 1)}">Newer</a>` : ""}
            <span class="cm-dim">Page ${page} of ${pages}</span>
            ${page < pages ? `<a class="btn btn-ghost btn-sm" href="${matchesHref(server.key, page + 1)}">Older</a>` : ""}`;
    }).catch(function (err) { listEl.innerHTML = errorBlock(err); });
}

/* ---------------- Match scoreboard ---------------- */

function matchHtml() {
    return `<div class="wrap wrap-wide">
        ${backLink("#/community", "Community")}
        <div id="cmMatch">${loadingBlock("Loading scoreboard…")}</div>
    </div>`;
}

/** [{ [key]: label, [val]: n }] -> [[label, n]], top `n`. */
function pairs(list, key, val, n) {
    return (Array.isArray(list) ? list : []).filter(function (e) { return e && e[key] != null; })
        .slice(0, n).map(function (e) { return [e[key], e[val]]; });
}

function playerRows(doc) {
    return (doc.rows || []).filter(function (p) { return (p.timeSeconds || 0) > 0; }).map(function (p) {
        return {
            id: p.hidden ? null : p.playerId,
            name: p.name || "Unknown",
            side: p.side || "",
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            kdr: (p.kills || 0) / Math.max(1, p.deaths || 0),
            combat: p.combat || 0,
            offense: p.offense || 0,
            defense: p.defense || 0,
            support: p.support || 0,
            time_seconds: p.timeSeconds || 0,
            streak: p.killsStreak || 0,
            weapons: pairs(p.topWeapons, "weapon", "kills", 3),
            victims: pairs(p.mostKilled, "name", "count", 3),
            nemesis: pairs(p.deathBy, "name", "count", 3)
        };
    });
}

function mvpCards(rows) {
    function best(key, filter) {
        const pool = filter ? rows.filter(filter) : rows;
        return pool.reduce(function (a, b) { return !a || b[key] > a[key] ? b : a; }, null);
    }
    const picks = [
        { t: "Most kills", p: best("kills"), v: function (p) { return fmt(p.kills); } },
        { t: "Top combat", p: best("combat"), v: function (p) { return fmt(p.combat); } },
        { t: "Top support", p: best("support"), v: function (p) { return fmt(p.support); } },
        { t: "Best K/D", p: best("kdr", function (r) { return r.kills >= 10; }), v: function (p) { return fmt(p.kdr, 2); } }
    ].filter(function (x) { return x.p; });
    return picks.map(function (x) {
        return `<div class="cm-mvp glass"><span class="cm-mvp__t">${escapeHtml(x.t)}</span><span class="cm-mvp__v">${x.v(x.p)}</span><span class="cm-mvp__n">${escapeHtml(x.p.name)}</span></div>`;
    }).join("");
}

function scoreboardRows(rows, sideNames, serverKey) {
    return rows.map(function (r, i) {
        const name = isSafeId(r.id) ? `<a href="${playerHref(r.id, serverKey)}">${escapeHtml(r.name)}</a>` : escapeHtml(r.name);
        const detail = [
            r.weapons.length ? `<div><dt>Top weapons</dt><dd>${r.weapons.map(function (w) { return `${escapeHtml(w[0])} <b>${escapeHtml(w[1])}</b>`; }).join(", ")}</dd></div>` : "",
            r.victims.length ? `<div><dt>Most killed</dt><dd>${r.victims.map(function (w) { return `${escapeHtml(w[0])} <b>${escapeHtml(w[1])}</b>`; }).join(", ")}</dd></div>` : "",
            r.nemesis.length ? `<div><dt>Killed by</dt><dd>${r.nemesis.map(function (w) { return `${escapeHtml(w[0])} <b>${escapeHtml(w[1])}</b>`; }).join(", ")}</dd></div>` : "",
            `<div><dt>Best streak</dt><dd><b>${escapeHtml(r.streak)}</b></dd></div>`
        ].join("");
        return `<tr class="cm-sb-row" data-row="${i}">
            <td class="cm-dim">${i + 1}</td>
            <td class="cm-sb-name"><button type="button" class="cm-expand" aria-expanded="false" aria-label="Show details for ${escapeHtml(r.name)}">${icon("plus")}</button>${name}</td>
            <td><span class="cm-side cm-side--${escapeHtml(r.side)}">${escapeHtml(sideNames[r.side] || "–")}</span></td>
            <td class="num">${fmt(r.kills)}</td><td class="num">${fmt(r.deaths)}</td><td class="num">${fmt(r.kdr, 2)}</td>
            <td class="num">${fmt(r.combat)}</td><td class="num">${fmt(r.offense)}</td><td class="num">${fmt(r.defense)}</td><td class="num">${fmt(r.support)}</td>
            <td class="num cm-dim">${minutes(r.time_seconds)}</td>
        </tr>
        <tr class="cm-sb-detail" data-detail="${i}" hidden><td></td><td colspan="10"><dl class="cm-sb-dl">${detail}</dl></td></tr>`;
    }).join("");
}

function mountMatch(root, route) {
    const server = serverFromQuery(route.query);
    const host = root.querySelector("#cmMatch");
    const mapId = route.extra[1];
    const matchId = route.extra[2];
    if (server.history === false) { host.innerHTML = noHistoryHtml(server); return; }
    fetchMatchDetail(server, matchId).then(function (match) {
        if (match.historySource === "live") {
            renderWdMatch(host, server, match, bifrostBadge(bifrostServerUrl(server), { label: "Wardogs server on Bifrost", eager: true }));
            return;
        }
        const sideNames = matchSides(match, server);
        const rows = playerRows(match);
        const state = { side: "all", sort: "kills" };
        const thumb = mapThumb(match);
        const bfMapId = match.mapId || mapId;
        const bfLink = isSafeId(bfMapId) ? bifrostMatchUrl(server, bfMapId, match.id || matchId) : bifrostServerUrl(server);
        const when = Date.parse(match.start);

        const hero = `<section class="cm-match-hero glass">
                ${thumb ? `<span class="cm-match__bg" style="background-image:url('${escapeHtml(thumb)}')" aria-hidden="true"></span>` : ""}
                <div class="cm-match-hero__body">
                    <p class="eyebrow">${[server.short, match.gameMode, isFinite(when) ? new Date(when).toLocaleString() : "", durationText(match.start, match.end)].filter(Boolean).map(escapeHtml).join(" · ")}</p>
                    <h1 class="gold-text">${escapeHtml(mapTitle(match))}</h1>
                    ${scoreHtml(match, sideNames, true)}
                    ${match.processed ? `<p class="cm-dim">${rows.length} players</p>` : ""}
                    <div class="cm-bf-row cm-bf-row--top">${bifrostBadge(bfLink, { label: "Full match on Bifrost", eager: true })}</div>
                </div>
            </section>`;
        if (!match.processed) {
            const msg = match.status === "unavailable"
                ? `<strong>No scoreboard for this match.</strong> Bifrost didn't have the match details when we tried to import them.`
                : `<strong>Scoreboard still importing — check back shortly.</strong> New matches are added every few minutes; the full match is already on Bifrost.`;
            host.innerHTML = `${hero}<div class="glass cm-soon cm-importing"><span class="cm-soon__icon">${icon("flag")}</span><p>${msg}</p></div>`;
            return;
        }

        const sortBtns = SB_COLS.map(function (c) { return `<th class="num" data-sort-th="${c.id}" aria-sort="none"><button type="button" class="cm-sort" data-sort="${c.id}">${escapeHtml(c.label)}</button></th>`; }).join("");
        host.innerHTML = `${hero}
            <div class="cm-mvps">${mvpCards(rows)}</div>
            <div class="filter-bar">
                <div class="filter-group" role="group" aria-label="Team">
                    <button type="button" class="chip" data-side="all">All</button>
                    <button type="button" class="chip" data-side="allies">${escapeHtml(sideNames.allies)}</button>
                    <button type="button" class="chip" data-side="axis">${escapeHtml(sideNames.axis)}</button>
                </div>
                <input class="field cm-sb-filter" id="cmSbFilter" type="search" placeholder="Filter players…" aria-label="Filter players" autocomplete="off">
            </div>
            <div class="matrix-scroll glass cm-sb-wrap"><table class="data-table cm-table cm-sb">
                <thead><tr><th>#</th><th>Player</th><th>Team</th>${sortBtns}</tr></thead>
                <tbody id="cmSbBody"></tbody>
            </table></div>`;

        const body = host.querySelector("#cmSbBody");
        const filterEl = host.querySelector("#cmSbFilter");
        function draw() {
            host.querySelectorAll("[data-side]").forEach(function (b) {
                const on = b.getAttribute("data-side") === state.side;
                b.classList.toggle("active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            host.querySelectorAll("[data-sort]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === state.sort); });
            host.querySelectorAll("[data-sort-th]").forEach(function (th) {
                th.setAttribute("aria-sort", th.getAttribute("data-sort-th") === state.sort ? "descending" : "none");
            });
            const q = filterEl.value.trim().toLowerCase();
            const list = rows.filter(function (x) {
                return (state.side === "all" || x.side === state.side) && (!q || String(x.name).toLowerCase().indexOf(q) !== -1);
            }).sort(function (a, b) { return b[state.sort] - a[state.sort]; });
            body.innerHTML = list.length ? scoreboardRows(list, sideNames, server.key) : `<tr><td colspan="11" class="result-empty">No players match.</td></tr>`;
        }
        host.querySelectorAll("[data-side]").forEach(function (b) { b.addEventListener("click", function () { state.side = b.getAttribute("data-side"); draw(); }); });
        host.querySelectorAll("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { state.sort = b.getAttribute("data-sort"); draw(); }); });
        filterEl.addEventListener("input", debounce(draw, 120));
        body.addEventListener("click", function (e) {
            const btn = e.target.closest(".cm-expand");
            if (!btn) return;
            const i = btn.closest("tr").getAttribute("data-row");
            const detail = body.querySelector(`[data-detail="${i}"]`);
            const open = detail.hidden;
            detail.hidden = !open;
            btn.setAttribute("aria-expanded", open ? "true" : "false");
            btn.classList.toggle("open", open);
        });
        draw();
    }).catch(function (err) { host.innerHTML = errorBlock(err); });
}

/* ---------------- Player profile ---------------- */

function playerHtml(route) {
    const server = serverFromQuery(route.query);
    const playerId = route.extra[1];
    return `<div class="wrap wrap-wide">
        ${backLink("#/community", "Community")}
        <div class="cm-page-toggle">${serverToggle(server, function (s) { return playerHref(playerId, s.key); })}</div>
        <div id="cmPlayer">${loadingBlock("Loading player…")}</div>
    </div>`;
}

function barList(items, labelKey, valueKey, serverKey) {
    if (!items || !items.length) return `<p class="cm-dim">No data yet.</p>`;
    const max = items[0][valueKey] || 1;
    return `<ul class="cm-bars">${items.map(function (it) {
        const label = serverKey && isSafeId(it.playerId)
            ? `<a href="${playerHref(it.playerId, serverKey)}">${escapeHtml(it[labelKey])}</a>`
            : escapeHtml(it[labelKey]);
        return `<li><span class="cm-bars__label">${label}</span><span class="cm-bars__track"><span style="width:${Math.max(4, Math.round((it[valueKey] / max) * 100))}%"></span></span><b>${fmt(it[valueKey])}</b></li>`;
    }).join("")}</ul>`;
}

/** Accepts ["a","b"] or [{ name }]; drops the current name. */
function pastNames(p) {
    const raw = p.names || p.nameHistory || p.pastNames || [];
    if (!Array.isArray(raw)) return [];
    const seen = new Set([p.name]);
    return raw.map(function (n) { return typeof n === "string" ? n : n && n.name; })
        .filter(function (n) { if (!n || seen.has(n)) return false; seen.add(n); return true; })
        .slice(0, 12);
}

function winLoss(p) {
    const t = p.totals || {};
    const rec = p.record || {};
    const w = [p.wins, t.wins, rec.wins].find(isNum);
    const l = [p.losses, t.losses, rec.losses].find(isNum);
    return isNum(w) && isNum(l) ? { w: w, l: l } : null;
}

function playerErrorHtml(err, server) {
    if (err && err.message === HIDDEN_PROFILE) {
        return `<div class="glass cm-soon"><span class="cm-soon__icon">${icon("lock")}</span><p><strong>This profile is hidden.</strong> The player asked for their stats not to be shown. Want yours hidden too? Ask in the <a href="https://discord.gg/AHO" target="_blank" rel="noopener">AHO Discord</a>.</p></div>`;
    }
    if (err && err.status === 404) {
        return `<div class="glass cm-soon"><span class="cm-soon__icon">${icon("users")}</span><p><strong>No stats for this player on ${escapeHtml(server.short)}.</strong> Try another server above, or search from the <a href="#/community">Community hub</a>.</p></div>`;
    }
    return errorBlock(err);
}

function mountPlayer(root, route) {
    bindToggleLinks(root);
    const host = root.querySelector("#cmPlayer");
    const playerId = route.extra[1];
    const server = serverFromQuery(route.query);
    if (!statsApiReady()) {
        host.innerHTML = `<div class="glass cm-soon"><span class="cm-soon__icon">${icon("users")}</span><p><strong>Player profiles are coming online.</strong> Check back soon.</p></div>`;
        return;
    }
    if (server.history === false) { host.innerHTML = noHistoryHtml(server); return; }
    fetchPlayer(server.key, playerId).then(function (p) {
        if (p.historySource === "live") {
            const wdShare = playerShareUrl(server.key, playerId);
            host.innerHTML = wdPlayerHtml(server, p, { cardUrl: playerCardUrl(server.key, playerId), badgeHtml: bifrostBadge(bifrostServerUrl(server), { eager: true }) });
            host.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });
            const wdBtn = host.querySelector("#cmShare");
            wdBtn.addEventListener("click", function () { copyText(wdShare, wdBtn, "Link copied"); });
            return;
        }
        const t = p.totals || {};
        const names = pastNames(p);
        const wl = winLoss(p);
        const recent = (p.recentMatches || []).map(function (m) {
            const res = m.won == null ? `<span class="cm-res">–</span>` : m.won ? `<span class="cm-res win">W</span>` : `<span class="cm-res loss">L</span>`;
            const href = isSafeId(m.mapId) && isSafeId(m.matchId) ? matchHref(server, m.mapId, m.matchId) : null;
            const inner = `${res}
                <span class="cm-recent__map">${escapeHtml(m.mapPretty || m.mapId)}<small>${escapeHtml(timeAgo(m.end))} · ${escapeHtml(m.gameMode || "")}</small></span>
                <span class="cm-recent__kd"><b>${fmt(m.kills)}</b>–${fmt(m.deaths)}</span>
                <span class="cm-dim">${fmt(m.combat)} combat</span>`;
            return href ? `<a class="cm-recent glass card-hover" href="${href}">${inner}</a>` : `<div class="cm-recent glass">${inner}</div>`;
        }).join("");
        const shareUrl = playerShareUrl(server.key, playerId);
        host.innerHTML = `<header class="section-head cm-player-head">
                <p class="eyebrow">${escapeHtml(server.name)}</p>
                <h1 class="gold-text">${escapeHtml(p.name)}</h1>
                ${names.length ? `<p class="cm-aka">Also played as ${names.map(function (n) { return `<span>${escapeHtml(n)}</span>`; }).join("")}</p>` : ""}
                <p class="lead">${fmt(t.matches)} matches · ${minutes(t.timeSeconds)} played · last seen ${escapeHtml(timeAgo(p.lastSeen))}</p>
                <div class="cm-player-actions">
                    <button type="button" class="btn btn-primary cm-join__btn" id="cmShare">${icon("share-nodes")} Share</button>
                    <a class="btn btn-ghost cm-join__btn" href="${escapeHtml(playerCardUrl(server.key, playerId))}" target="_blank" rel="noopener" download>${icon("download")} Download stat card</a>
                </div>
                <div class="cm-bf-row cm-bf-row--top">${bifrostBadge(bifrostServerUrl(server), { eager: true })}</div>
            </header>
            <dl class="spec-grid cm-totals reveal">
                <div class="spec"><dt>Kills</dt><dd>${fmt(t.kills)}</dd></div>
                <div class="spec"><dt>Deaths</dt><dd>${fmt(t.deaths)}</dd></div>
                <div class="spec"><dt>K/D</dt><dd>${fmt(p.kd, 2)}</dd></div>
                <div class="spec"><dt>Kills / min</dt><dd>${fmt(p.kpm, 2)}</dd></div>
                ${wl ? `<div class="spec"><dt>Wins</dt><dd>${fmt(wl.w)}</dd></div><div class="spec"><dt>Losses</dt><dd>${fmt(wl.l)}</dd></div>` : ""}
                <div class="spec"><dt>Combat</dt><dd>${fmt(t.combat)}</dd></div>
                <div class="spec"><dt>Support</dt><dd>${fmt(t.support)}</dd></div>
                <div class="spec"><dt>Best streak</dt><dd>${fmt(p.bestKillStreak)}</dd></div>
                <div class="spec"><dt>Vehicles destroyed</dt><dd>${fmt(t.vehiclesDestroyed)}</dd></div>
            </dl>
            <div class="cm-player-grid">
                <section class="tool-panel glass"><h3>${icon("crosshairs")} Top weapons</h3>${barList(p.topWeapons, "weapon", "kills")}</section>
                <section class="tool-panel glass"><h3>${icon("skull-crossbones")} Nemesis</h3>${barList(p.nemesis, "name", "count", server.key)}</section>
                <section class="tool-panel glass"><h3>${icon("bullseye")} Favourite targets</h3>${barList(p.victims, "name", "count", server.key)}</section>
            </div>
            <h2 class="gold-text" style="font-size:1.6rem;margin:2.2rem 0 1rem">Recent matches</h2>
            <div class="cm-recent-list">${recent || `<p class="cm-dim">No matches yet.</p>`}</div>`;
        host.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });
        const shareBtn = host.querySelector("#cmShare");
        shareBtn.addEventListener("click", function () { copyText(shareUrl, shareBtn, "Link copied"); });
    }).catch(function (err) { host.innerHTML = playerErrorHtml(err, server); });
}

/* ---------------- Dispatch ---------------- */

function sub(route) {
    const s = route && route.extra ? route.extra[0] : "";
    if (s === "match" && route.extra.length >= 3) return "match";
    if (s === "player" && route.extra.length >= 2) return "player";
    if (s === "matches") return "matches";
    return "hub";
}

export function render(route) {
    switch (sub(route)) {
        case "match": return matchHtml();
        case "player": return playerHtml(route);
        case "matches": return matchesHtml(route);
        default: return hubHtml();
    }
}

export function mount(root, route) {
    switch (sub(route)) {
        case "match": return mountMatch(root, route);
        case "player": return mountPlayer(root, route);
        case "matches": return mountMatches(root, route);
        default: return mountHub(root);
    }
}
