/* Armor - Tank Database (WWII) with 360 viewer + hull pen matrix */
import {
    getWWIIByFaction, getHullPenetrationProfile, getU20ResistTier,
    getArmorTierMeta, GUN_CLASSES
} from "../data.js";
import { escapeHtml, slug } from "../util.js";
import { icon } from "../icons.js";
import { viewer360HTML, initViewers } from "../viewer360.js";

const FACTION_LABELS = { usa: "USA", germany: "Germany", soviet: "Soviet", british: "Britain" };
const TYPE_FILTERS = [
    { key: "all", label: "All" },
    { key: "heavy", label: "Heavy" },
    { key: "medium", label: "Medium" },
    { key: "light", label: "Light" },
    { key: "recon", label: "Recon" },
    { key: "spa", label: "SPA" }
];
const HP_MAX = { hull: 1300, turret: 1120, engine: 720, track: 1000 };

function typeMatches(tank, key) {
    if (key === "all") return true;
    const t = (tank.type || "").toLowerCase();
    if (key === "spa") return t.includes("spa") || t.includes("self propelled");
    if (key === "recon") return t.includes("recon");
    return t.includes(key);
}

function hpBar(label, val, max, cls) {
    if (!Number.isFinite(Number(val)) || Number(val) <= 0) return "";
    const pct = Math.min(100, (Number(val) / max) * 100);
    return `<div class="hp-bar">
        <div class="hp-bar__label"><span>${label}</span><span>${Number(val)}</span></div>
        <div class="hp-bar__track"><div class="hp-bar__fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
}

function spec(label, value) {
    if (value == null || value === "") return "";
    return `<div class="spec"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function hullPenMatrix(tank) {
    const profile = getHullPenetrationProfile(tank);
    if (!profile) return "";
    const faces = [["front", "Front"], ["left", "Left"], ["right", "Right"], ["rear", "Rear"]];
    const heads = GUN_CLASSES.map(function (g) { return `<th scope="col">${g.label}</th>`; }).join("");
    const rows = faces.map(function (f) {
        const face = profile[f[0]];
        const tierMeta = getArmorTierMeta(getU20ResistTier(tank, f[0]));
        const tierShort = tierMeta.percent != null ? `${tierMeta.percent}%` : escapeHtml(tierMeta.label);
        const cells = GUN_CLASSES.map(function (g) {
            const yes = !!face.pen[g.key];
            return `<td class="${yes ? "cell-yes" : "cell-no"}" title="${g.label} ${yes ? "can" : "cannot"} pen with AP">${yes ? "✓" : "-"}</td>`;
        }).join("");
        return `<tr><th scope="row">${f[1]}</th><td class="resist">${tierShort}</td>${cells}</tr>`;
    }).join("");
    const notes = faces.map(function (f) {
        const n = profile[f[0]] && profile[f[0]].note ? String(profile[f[0]].note).trim() : "";
        return n ? `<li><strong>${f[1]}:</strong> ${escapeHtml(n)}</li>` : "";
    }).filter(Boolean).join("");
    return `<div class="hull-pen">
        <h4>${icon("shield-halved")} Hull penetration (U20)</h4>
        <div class="matrix-scroll">
            <table class="matrix">
                <thead><tr><th>Face</th><th>Resist</th>${heads}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${notes ? `<ul class="matrix-notes">${notes}</ul>` : ""}
    </div>`;
}

function tankCard(tank, faction, idx) {
    const ds = tank.detailedStats || {};
    const isSPA = (tank.type || "").includes("SPA");
    const cost = isSPA ? ds.munitionsCost : ds.fuelCost;
    const costLabel = isSPA ? "Munitions" : "Fuel";
    const specs = [
        spec("Gun", tank.gun),
        spec("Speed", tank.speed),
        spec("Crew", tank.crew),
        spec("Reload", ds.reloadSpeed ? ds.reloadSpeed + "s" : null),
        spec("AP dmg", ds.apDamage),
        spec("AP shells", ds.maxShellsAP),
        spec(costLabel, cost),
        spec("Range", ds.weaponRange)
    ].filter(Boolean).join("");

    const bars = [
        hpBar("Hull", ds.hullHealth, HP_MAX.hull, "hull"),
        hpBar("Turret", ds.turretHealth, HP_MAX.turret, "turret"),
        hpBar("Engine", ds.engineHealth, HP_MAX.engine, "engine"),
        hpBar("Track", ds.trackHealth, HP_MAX.track, "track")
    ].join("");

    return `<article class="tank-card glass card-hover reveal" id="tank-${slug(tank.name)}" data-faction="${faction}" data-type="${escapeHtml(tank.type || "")}">
        <div class="tank-card__head">
            <div>
                <h3 class="tank-card__title">${escapeHtml(tank.name)}</h3>
                <span class="tank-card__faction">${escapeHtml(tank.faction || FACTION_LABELS[faction] || "")}</span>
            </div>
            <span class="tank-card__type">${escapeHtml((tank.type || "").replace(/\s*\(.*\)/, ""))}</span>
        </div>
        <div class="tank-card__body">
            ${viewer360HTML(tank, faction + "-" + idx)}
            ${tank.description ? `<p class="desc">${escapeHtml(tank.description)}</p>` : ""}
            <dl class="spec-grid">${specs}</dl>
            ${bars ? `<div class="hp-bars">${bars}</div>` : ""}
            ${tank.strengths ? `<dl class="callout strong"><dt>Strengths</dt><dd>${escapeHtml(tank.strengths)}</dd></dl>` : ""}
            ${tank.weakSpots ? `<dl class="callout weak"><dt>Weak spots</dt><dd>${escapeHtml(tank.weakSpots)}</dd></dl>` : ""}
            ${hullPenMatrix(tank)}
        </div>
    </article>`;
}

let activeFaction = "all";
let activeType = "all";

function renderGrid() {
    const byFaction = getWWIIByFaction();
    const cards = [];
    Object.keys(byFaction).forEach(function (faction) {
        if (activeFaction !== "all" && activeFaction !== faction) return;
        byFaction[faction].forEach(function (tank, i) {
            if (!typeMatches(tank, activeType)) return;
            cards.push(tankCard(tank, faction, i));
        });
    });
    return cards.length ? cards.join("") : `<p class="result-empty">No tanks match these filters.</p>`;
}

export function render() {
    const factionBtns = ["all"].concat(Object.keys(getWWIIByFaction()))
        .map(function (f) {
            const label = f === "all" ? "All factions" : (FACTION_LABELS[f] || f);
            return `<button class="chip ${f === activeFaction ? "active" : ""}" data-faction-filter="${f}">${escapeHtml(label)}</button>`;
        }).join("");
    const typeBtns = TYPE_FILTERS.map(function (t) {
        return `<button class="chip ${t.key === activeType ? "active" : ""}" data-type-filter="${t.key}">${t.label}</button>`;
    }).join("");

    return `<div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">Armor · WWII</p>
            <h1 class="gold-text">Tank Database</h1>
            <p class="lead">Every WWII tank with U20 stats - armor, gunnery, component HP, and hull penetration by attacker class. Drag any model to inspect it in 360°.</p>
        </header>
        <div class="filter-bar">
            <div class="filter-group" data-group="faction">${factionBtns}</div>
            <span style="width:1px;height:24px;background:var(--hairline);margin:0 .4rem"></span>
            <div class="filter-group" data-group="type">${typeBtns}</div>
        </div>
        <div class="grid cols-2" id="tankGrid">${renderGrid()}</div>
    </div>`;
}

export function mount(root) {
    root.querySelectorAll("[data-faction-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            activeFaction = btn.getAttribute("data-faction-filter");
            refresh(root);
        });
    });
    root.querySelectorAll("[data-type-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            activeType = btn.getAttribute("data-type-filter");
            refresh(root);
        });
    });
    initViewers(root);
    revealCards(root);
}

function refresh(root) {
    root.querySelectorAll("[data-faction-filter]").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-faction-filter") === activeFaction);
    });
    root.querySelectorAll("[data-type-filter]").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-type-filter") === activeType);
    });
    const grid = root.querySelector("#tankGrid");
    grid.innerHTML = renderGrid();
    initViewers(root);
    revealCards(root);
}

function revealCards(root) {
    const els = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
}
