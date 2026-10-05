/* Armor Hub v2 - app orchestrator: nav model, routing, view dispatch */
import { loadData } from "./data.js";
import { parseHash, onRoute, buildHash } from "./router.js";
import { escapeHtml } from "./util.js";
import { isCalcFocus } from "./tool-mode.js";
import { icon } from "./icons.js";
import { applyTeam } from "./wardogs-team.js";

applyTeam();

const NAV = {
    community: { label: "Community", single: true },
    armor: {
        label: "Armor",
        eras: {
            wwii: { label: "WWII", sections: [
                { id: "overview", label: "Overview" },
                { id: "tanks", label: "Tank Database" },
                { id: "tankulator", label: "Tankulator" },
                { id: "calculators", label: "Calcs & Sights" },
                { id: "identification", label: "Identification" },
                { id: "getting-started", label: "Getting Started" }
            ] },
            vietnam: { label: "Vietnam", sections: [
                { id: "overview", label: "Overview" },
                { id: "tanks", label: "Tank Roster" },
                { id: "tankulator", label: "Tankulator" }
            ] }
        }
    },
    infantry: {
        label: "Infantry",
        eras: {
            wwii: { label: "WWII", sections: [
                { id: "overview", label: "Overview" },
                { id: "getting-started", label: "Getting Started" },
                { id: "maps", label: "Maps" },
                { id: "tips", label: "Tips" }
            ] },
            vietnam: { label: "Vietnam", sections: [
                { id: "overview", label: "Overview" },
                { id: "getting-started", label: "Getting Started" },
                { id: "squads", label: "Squads" },
                { id: "loadout", label: "Loadout Builder" },
                { id: "maps", label: "Maps" },
                { id: "mortar", label: "Mortar" }
            ] }
        }
    },
    wardogs: {
        label: "Wardogs",
        theme: "theme-wardogs",
        eras: {
            s1: { label: "Season 1", sections: [
                { id: "overview", label: "Overview" },
                { id: "cash", label: "Cash Planner" }
            ] }
        }
    }
};

/* Top-level tabs are games; HLL games map to the route era, Armor/Infantry to the route branch.
   Route format stays #/<branch>/<era>/<section> so existing links keep working. */
const GAMES = [
    { id: "community", label: "Community", short: "Community", icon: "users" },
    { id: "wardogs", label: "Wardogs", short: "Wardogs" },
    { id: "vietnam", label: "HLL Vietnam", short: "Vietnam" },
    { id: "wwii", label: "HLL WWII", short: "WWII" }
];
const GAME_LABELS = { wardogs: "Wardogs", vietnam: "HLL Vietnam", wwii: "HLL WWII" };
const HLL_BRANCHES = ["armor", "infantry"];
const BRANCH_ICONS = { armor: "tank", infantry: "crosshairs" };
let lastHllBranch = "armor";

const TANK_DATA_BRANCHES = new Set(["armor", "infantry"]);

const WARDOGS_WIP = ["getting-started", "armory", "vehicles", "loadouts", "maps", "progression"];

/* Per-route dynamic imports — cold start only loads the first view */
const VIEW_LOADERS = {
    "armor/wwii/overview": function () { return import("./views/overview.js"); },
    "armor/wwii/tanks": function () { return import("./views/tankdb.js"); },
    "armor/wwii/tankulator": function () { return import("./views/tankulator.js"); },
    "armor/wwii/calculators": function () { return import("./views/calculators.js"); },
    "armor/wwii/getting-started": function () { return import("./views/getting-started.js"); },
    "armor/wwii/identification": function () { return import("./views/identification.js"); },
    "armor/vietnam/overview": function () { return import("./views/armorVietnam.js").then(function (m) { return m.overview; }); },
    "armor/vietnam/tanks": function () { return import("./views/armorVietnam.js").then(function (m) { return m.roster; }); },
    "armor/vietnam/tankulator": function () { return import("./views/vnTankulator.js"); },
    "infantry/wwii/overview": function () { return import("./views/infantry.js").then(function (m) { return m.wwiiOverview; }); },
    "infantry/wwii/getting-started": function () { return import("./views/infantry.js").then(function (m) { return m.wwiiGettingStarted; }); },
    "infantry/wwii/maps": function () { return import("./views/infantry.js").then(function (m) { return m.wwiiMaps; }); },
    "infantry/wwii/tips": function () { return import("./views/infantry.js").then(function (m) { return m.wwiiTips; }); },
    "infantry/vietnam/overview": function () { return import("./views/infantry.js").then(function (m) { return m.vnOverview; }); },
    "infantry/vietnam/getting-started": function () { return import("./views/infantry.js").then(function (m) { return m.vnGettingStarted; }); },
    "infantry/vietnam/squads": function () { return import("./views/infantry.js").then(function (m) { return m.vnSquads; }); },
    "infantry/vietnam/loadout": function () { return import("./views/vnLoadoutBuilder.js").then(function (m) { return m.vnLoadoutBuilder; }); },
    "infantry/vietnam/maps": function () { return import("./views/infantry.js").then(function (m) { return m.vnMaps; }); },
    "infantry/vietnam/mortar": function () { return import("./views/infantry.js").then(function (m) { return m.vnMortar; }); },
    "wardogs/s1/overview": function () { return import("./views/wardogs.js").then(function (m) { return m.overview; }); },
    "wardogs/s1/cash": function () { return import("./views/wardogs.js").then(function (m) { return m.cash; }); },
    "community": function () { return import("./views/community.js"); }
};

WARDOGS_WIP.forEach(function (id) {
    VIEW_LOADERS["wardogs/s1/" + id] = function () { return import("./views/wardogs.js").then(function (m) { return m.wip; }); };
});

const viewCache = new Map();
let dispatchGen = 0;

function loadView(key) {
    if (viewCache.has(key)) return viewCache.get(key);
    const loader = VIEW_LOADERS[key];
    if (!loader) return Promise.resolve(null);
    const promise = loader().catch(function (err) {
        viewCache.delete(key);
        throw err;
    });
    viewCache.set(key, promise);
    return promise;
}

const gameTabsEl = document.getElementById("gameTabs");
const subnavEl = document.getElementById("appSubnav");
const branchToggleEl = document.getElementById("branchToggle");
const sectionLinksEl = document.getElementById("sectionLinks");
const viewEl = document.getElementById("view");

function gameOf(route) {
    return HLL_BRANCHES.indexOf(route.branch) >= 0 ? route.era : route.branch;
}

function findSection(branch, era, id) {
    const node = NAV[branch];
    const eraNode = node && node.eras ? node.eras[era] : null;
    return eraNode ? eraNode.sections.find(function (s) { return s.id === id; }) || null : null;
}

function landingSection(branch, era, section) {
    return section && findSection(branch, era, section) ? section : "overview";
}

function gameHref(game, route) {
    if (game === "community") return "#/community";
    const branch = game === "wardogs" ? "wardogs" : lastHllBranch;
    const era = game === "wardogs" ? "s1" : game;
    return buildHash(branch, era, landingSection(branch, era, route.section));
}

/* Breadcrumb-style labels: [game, branch?, section?] */
function routeLabels(route) {
    const sec = findSection(route.branch, route.era, route.section);
    const game = GAME_LABELS[gameOf(route)] || "";
    const branch = HLL_BRANCHES.indexOf(route.branch) >= 0 ? NAV[route.branch].label : null;
    return { game: game, branch: branch, section: sec ? sec.label : null };
}

function placeholder(route) {
    const labels = routeLabels(route);
    const title = labels.section || route.section || route.branch;
    return `<div class="wrap"><header class="section-head">
        <p class="eyebrow">${escapeHtml([labels.game, labels.branch].filter(Boolean).join(" · "))}</p>
        <h1 class="gold-text">${escapeHtml(title)}</h1>
        <p class="lead">This section is being rebuilt from the ground up in the new design. Coming together now.</p>
    </header>
    <div class="glass" style="padding:2.5rem; text-align:center; color:var(--text-muted)">
        <span style="font-size:2rem; color:var(--gold-glow)">${icon("screwdriver-wrench")}</span>
        <p style="margin-top:1rem">Hang tight - the <strong>${escapeHtml(title)}</strong> rebuild lands next.</p>
    </div></div>`;
}

function renderGameTabs(route) {
    const current = gameOf(route);
    gameTabsEl.innerHTML = GAMES.map(function (g) {
        const active = g.id === current;
        const cur = active ? ' aria-current="page"' : "";
        const ico = g.icon ? `<span class="game-tab__icon">${icon(g.icon)}</span>` : "";
        return `<a class="game-tab${g.icon ? " game-tab--icon" : ""}${active ? " active" : ""}" data-game="${g.id}" href="${gameHref(g.id, route)}" aria-label="${escapeHtml(g.label)}"${cur}>${ico}<span class="game-tab__full">${escapeHtml(g.label)}</span><span class="game-tab__short">${escapeHtml(g.short)}</span></a>`;
    }).join("");
    centerActive(gameTabsEl);
}

function renderSubnav(route) {
    const node = NAV[route.branch];
    if (!node || node.single) { subnavEl.style.display = "none"; return; }
    subnavEl.style.display = "";
    const isToggle = HLL_BRANCHES.indexOf(route.branch) >= 0;
    if (isToggle) branchToggleEl.setAttribute("role", "group");
    else branchToggleEl.removeAttribute("role");
    if (isToggle) {
        branchToggleEl.innerHTML = HLL_BRANCHES.map(function (b) {
            const active = b === route.branch;
            const cur = active ? ' aria-current="true"' : "";
            const href = buildHash(b, route.era, landingSection(b, route.era, route.section));
            return `<a class="branch-btn${active ? " active" : ""}" href="${href}"${cur}><span class="branch-btn__icon">${icon(BRANCH_ICONS[b])}</span>${escapeHtml(NAV[b].label)}</a>`;
        }).join("");
    } else {
        branchToggleEl.innerHTML = `<span class="branch-toggle__label">${escapeHtml(node.eras[route.era].label)}</span>`;
    }
    sectionLinksEl.innerHTML = node.eras[route.era].sections.map(function (s) {
        const cur = s.id === route.section ? ' aria-current="page"' : "";
        return `<a class="section-link ${s.id === route.section ? "active" : ""}" href="${buildHash(route.branch, route.era, s.id)}"${cur}>${escapeHtml(s.label)}</a>`;
    }).join("");
    centerActive(sectionLinksEl);
}

/* Horizontal scrollers (game tabs, section links): keep the active item visible
   and fade whichever edge has more content hidden behind it. */
function updateScrollFade(el) {
    const max = el.scrollWidth - el.clientWidth;
    el.classList.toggle("fade-start", max > 1 && el.scrollLeft > 1);
    el.classList.toggle("fade-end", max > 1 && el.scrollLeft < max - 1);
}

function centerActive(el) {
    const active = el.querySelector(".active");
    if (active && el.scrollWidth > el.clientWidth) {
        el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    } else {
        el.scrollLeft = 0;
    }
    updateScrollFade(el);
}

function bindScrollFades() {
    [gameTabsEl, sectionLinksEl].forEach(function (el) {
        el.addEventListener("scroll", function () { updateScrollFade(el); }, { passive: true });
    });
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(function (entries) {
            entries.forEach(function (e) { updateScrollFade(e.target); });
        });
        ro.observe(gameTabsEl);
        ro.observe(sectionLinksEl);
    } else {
        window.addEventListener("resize", function () {
            updateScrollFade(gameTabsEl);
            updateScrollFade(sectionLinksEl);
        });
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { centerActive(gameTabsEl); centerActive(sectionLinksEl); });
    }
}

function applyFocusChrome(route) {
    const focus = isCalcFocus(route);
    document.body.classList.toggle("calc-focus", focus);
    const foot = document.getElementById("appFoot");
    if (foot) foot.hidden = focus;
}

function normalizeRoute(route) {
    const node = NAV[route.branch];
    if (node && node.eras && !node.eras[route.era]) route.era = Object.keys(node.eras)[0];
    if (HLL_BRANCHES.indexOf(route.branch) >= 0) lastHllBranch = route.branch;
    return route;
}

function applyTheme(route) {
    Object.keys(NAV).forEach(function (key) {
        const theme = NAV[key].theme;
        if (theme) document.body.classList.toggle(theme, key === route.branch);
    });
}

async function dispatch(route) {
    const gen = ++dispatchGen;
    normalizeRoute(route);
    applyTheme(route);
    applyFocusChrome(route);
    renderGameTabs(route);
    renderSubnav(route);

    const key = route.branch === "community" ? "community" : `${route.branch}/${route.era}/${route.section}`;

    viewEl.classList.remove("view-enter");
    void viewEl.offsetWidth;

    let view = null;
    try {
        if (TANK_DATA_BRANCHES.has(route.branch)) {
            if (!viewEl.firstElementChild) viewEl.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading the Armor Hub…</p></div>`;
            await loadData();
        }
        view = await loadView(key);
    } catch (err) {
        if (gen !== dispatchGen) return;
        viewEl.innerHTML = `<div class="wrap"><div class="notice" style="color:var(--danger);background:rgba(248,113,113,.1)">${icon("triangle-exclamation")} Failed to load this section: ${escapeHtml(err.message || String(err))}</div></div>`;
        console.error(err);
        return;
    }
    if (gen !== dispatchGen) return;

    if (view && typeof view.render === "function") {
        viewEl.innerHTML = view.render(route);
        if (typeof view.mount === "function") view.mount(viewEl, route);
    } else {
        viewEl.innerHTML = placeholder(route);
    }
    viewEl.classList.add("view-enter");
    revealAll(viewEl);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (gen > 1) viewEl.focus({ preventScroll: true });
    if (!isCalcFocus(route)) document.title = routeTitle(route);
    setMetaDescription(route);
}

const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]').getAttribute("content");
const GAME_DESCRIPTIONS = {
    community: "After Hours Operators community hub: live server status, leaderboards, player stats, match history and VIP for our Hell Let Loose, HLL Vietnam and Wardogs servers.",
    wwii: "Hell Let Loose WWII guides and tools: tank database, Tankulator, artillery & SPA calculators, gunnery sights and infantry guides.",
    vietnam: "Hell Let Loose: Vietnam guides and tools: armor roster, Tankulator, squads, loadout builder, maps and mortar calculator.",
    wardogs: "Wardogs tools: cash planner with every payout in the game, ranked."
};

function setMetaDescription(route) {
    const el = document.querySelector('meta[name="description"]');
    const game = route.branch === "community" ? "community" : gameOf(route);
    const labels = routeLabels(route);
    const base = GAME_DESCRIPTIONS[game] || DEFAULT_DESCRIPTION;
    el.setAttribute("content", labels.section && labels.section !== "Overview" ? `${labels.section} · ${base}` : base);
}

const COMMUNITY_TITLES = { matches: "Match history", match: "Match", player: "Player" };

function routeTitle(route) {
    if (route.branch === "community") {
        const sub = COMMUNITY_TITLES[route.extra && route.extra[0]] || "Community";
        return "After Hours Operators · " + sub;
    }
    if (!NAV[route.branch]) return "Armor Hub";
    const labels = routeLabels(route);
    return [labels.game, labels.branch, labels.section].filter(Boolean).join(" · ") + " · Armor Hub";
}

function revealAll(root) {
    const els = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        els.forEach(function (e) { e.classList.add("in"); });
        return;
    }
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (e) { io.observe(e); });
}

function boot() {
    document.getElementById("year").textContent = new Date().getFullYear();
    bindScrollFades();
    onRoute(dispatch);
    dispatch(parseHash());
}

boot();
