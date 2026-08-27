/* Armor Hub v2 - app orchestrator: nav model, routing, view dispatch */
import { loadData } from "./data.js";
import { parseHash, onRoute, buildHash } from "./router.js";
import { escapeHtml } from "./util.js";
import { isCalcFocus } from "./tool-mode.js";
import { icon } from "./icons.js";

const NAV = {
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
    community: { label: "Community", single: true }
};

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
    "community": function () { return import("./views/community.js"); }
};

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

const branchTabsEl = document.getElementById("branchTabs");
const subnavEl = document.getElementById("appSubnav");
const eraToggleEl = document.getElementById("eraToggle");
const sectionLinksEl = document.getElementById("sectionLinks");
const viewEl = document.getElementById("view");

function placeholder(route) {
    const node = NAV[route.branch];
    const eraNode = node && node.eras ? node.eras[route.era] : null;
    const sec = eraNode ? eraNode.sections.find(function (s) { return s.id === route.section; }) : null;
    const title = sec ? sec.label : (route.section || route.branch);
    return `<div class="wrap"><header class="section-head">
        <p class="eyebrow">${escapeHtml((node ? node.label : "") + (eraNode ? " · " + eraNode.label : ""))}</p>
        <h1 class="gold-text">${escapeHtml(title)}</h1>
        <p class="lead">This section is being rebuilt from the ground up in the new design. Coming together now.</p>
    </header>
    <div class="glass" style="padding:2.5rem; text-align:center; color:var(--text-muted)">
        <span style="font-size:2rem; color:var(--gold-glow)">${icon("screwdriver-wrench")}</span>
        <p style="margin-top:1rem">Hang tight - the <strong>${escapeHtml(title)}</strong> rebuild lands next.</p>
    </div></div>`;
}

function renderBranchTabs(route) {
    branchTabsEl.innerHTML = Object.keys(NAV).map(function (key) {
        const n = NAV[key];
        let href;
        if (n.single) {
            href = "#/community";
        } else {
            const era = (route.era && n.eras && n.eras[route.era]) ? route.era : "wwii";
            href = buildHash(key, era, "overview");
        }
        const cur = key === route.branch ? ' aria-current="page"' : "";
        return `<a class="branch-tab ${key === route.branch ? "active" : ""}" href="${href}"${cur}>${escapeHtml(n.label)}</a>`;
    }).join("");
}

function renderSubnav(route) {
    const node = NAV[route.branch];
    if (!node || node.single) { subnavEl.style.display = "none"; return; }
    subnavEl.style.display = "";
    const eras = Object.keys(node.eras);
    eraToggleEl.innerHTML = eras.map(function (e) {
        const cur = e === route.era ? ' aria-current="true"' : "";
        return `<a class="era-btn ${e === route.era ? "active" : ""}" href="${buildHash(route.branch, e, "overview")}"${cur}>${escapeHtml(node.eras[e].label)}</a>`;
    }).join("");
    const eraNode = node.eras[route.era] || node.eras[eras[0]];
    sectionLinksEl.innerHTML = eraNode.sections.map(function (s) {
        const cur = s.id === route.section ? ' aria-current="page"' : "";
        return `<a class="section-link ${s.id === route.section ? "active" : ""}" href="${buildHash(route.branch, route.era, s.id)}"${cur}>${escapeHtml(s.label)}</a>`;
    }).join("");
}

function applyFocusChrome(route) {
    const focus = isCalcFocus(route);
    document.body.classList.toggle("calc-focus", focus);
    const foot = document.getElementById("appFoot");
    if (foot) foot.hidden = focus;
}

async function dispatch(route) {
    const gen = ++dispatchGen;
    applyFocusChrome(route);
    renderBranchTabs(route);
    renderSubnav(route);

    const key = route.branch === "community" ? "community" : `${route.branch}/${route.era}/${route.section}`;

    viewEl.classList.remove("view-enter");
    void viewEl.offsetWidth;

    let view = null;
    try {
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
    if (!isCalcFocus(route)) {
        document.title = "Armor Hub · " + (NAV[route.branch] ? NAV[route.branch].label : "");
    }
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
    viewEl.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading the Armor Hub…</p></div>`;
    loadData().then(function () {
        dispatch(parseHash());
        onRoute(dispatch);
    }).catch(function (err) {
        viewEl.innerHTML = `<div class="wrap"><div class="notice" style="color:var(--danger);background:rgba(248,113,113,.1)">${icon("triangle-exclamation")} Failed to load tank data: ${escapeHtml(err.message)}</div></div>`;
        console.error(err);
    });
    document.getElementById("year").textContent = new Date().getFullYear();
}

boot();
