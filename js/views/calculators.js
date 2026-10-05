/* Armor - Calculators (Artillery + SPA) */
import {
    calcArtillery, ARTILLERY_BOUNDS,
    calcSPA, getSPATypes, getSPATypeName,
    makeHistory
} from "../data.js";
import { escapeHtml, debounce } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, focusBarHTML, enterFocusBtn, exitFocusLink, enterFocusLink,
    bindFocusBar, distanceField, bindDistanceSteppers, historyCollapsible,
    loadPref, savePref, focusDocumentTitle
} from "../tool-mode.js";

const ARTY_FACTIONS = [
    { key: "usa", label: "USA" },
    { key: "german", label: "Germany" },
    { key: "soviet", label: "Soviet Union" },
    { key: "british", label: "Great Britain" }
];

const artyHistory = makeHistory("v2_artilleryResults", 3);
const spaHistory = makeHistory("v2_spaResults", 3);

const PREF_ARTY_FACTION = "v2_arty_faction";
const PREF_SPA_TYPE = "v2_spa_type";
const PREF_CALC_TAB = "v2_calc_tab";

function historyTable(entries, cols, kind) {
    if (!entries.length) return `<p class="result-empty">No calculations saved yet.</p>`;
    const head = cols.map(function (c) { return `<th>${escapeHtml(c)}</th>`; }).join("") + "<th></th>";
    const rows = entries.map(function (e) {
        const cells = [
            `<td><strong style="color:var(--gold-glow)">${escapeHtml(e.result)}</strong></td>`,
            `<td>${escapeHtml(String(e.distance))}m</td>`,
            `<td>${escapeHtml(e.label)}</td>`,
            `<td><button class="tk-del" data-del="${e.id}" data-kind="${kind}" aria-label="Delete">${icon("xmark")}</button></td>`
        ].join("");
        return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function panelHead(title, iconName, route, focusKey, focusLabel) {
    if (isCalcFocus(route)) return "";
    return `<div class="calc-panel-head">
        <h3>${icon(iconName)} ${escapeHtml(title)}</h3>
        ${enterFocusBtn(route, focusKey, focusLabel)}
    </div>`;
}

function artilleryPanel(route, focus) {
    const savedFaction = loadPref(PREF_ARTY_FACTION, "usa");
    const hist = historyCollapsible("Saved results", historyTable(artyHistory.all(), ["Result", "Distance", "Faction"], "arty"), focus);
    return `<section class="tool-panel glass calc-panel" id="calcArty" data-calc="artillery">
        ${panelHead("Artillery Calculator", "fa-explosion", route, "artillery", "Open artillery in focus mode")}
        ${focus ? `<p class="calc-focus-hint">Range ${ARTILLERY_BOUNDS.min}-${ARTILLERY_BOUNDS.max}m. Enter distance, get mills.</p>` : `<p class="lead">Range ${ARTILLERY_BOUNDS.min}-${ARTILLERY_BOUNDS.max}m.</p>`}
        <div class="form-row">
            ${distanceField("artyDist", "Distance (m)", ARTILLERY_BOUNDS, 50)}
            <div>
                <label class="field-label" for="artyFaction">Faction</label>
                <select class="field" id="artyFaction">${ARTY_FACTIONS.map(function (f) {
                    const sel = f.key === savedFaction ? " selected" : "";
                    return `<option value="${f.key}"${sel}>${f.label}</option>`;
                }).join("")}</select>
            </div>
            <div style="flex:0 0 auto">
                <label class="field-label">&nbsp;</label>
                <button class="btn btn-primary" id="artyCalc" type="button">Calculate</button>
            </div>
        </div>
        <div class="result-display${focus ? " result-display--sticky" : ""}" id="artyResult"><span class="result-empty">No calculation yet.</span></div>
        ${hist}
    </section>`;
}

function spaPanel(route, focus) {
    const spaTypes = getSPATypes();
    const savedType = loadPref(PREF_SPA_TYPE, spaTypes[0] ? spaTypes[0].key : "");
    const hist = historyCollapsible("Saved results", historyTable(spaHistory.all(), ["Result", "Distance", "Type"], "spa"), focus);
    return `<section class="tool-panel glass calc-panel" id="calcSpa" data-calc="spa">
        ${panelHead("SPA Calculator", "fa-truck-monster", route, "spa", "Open SPA in focus mode")}
        ${focus ? `<p class="calc-focus-hint">Self-propelled artillery with terrain/pitch adjustment.</p>` : `<p class="lead">Self-propelled artillery, with terrain/pitch adjustment.</p>`}
        <div class="form-row">
            <div>
                <label class="field-label" for="spaType">SPA type</label>
                <select class="field" id="spaType">${spaTypes.map(function (t) {
                    const sel = t.key === savedType ? " selected" : "";
                    return `<option value="${t.key}"${sel}>${escapeHtml(t.name)} (${t.min}-${t.max}m)</option>`;
                }).join("")}</select>
            </div>
            ${distanceField("spaDist", "Distance (m)", { min: 100, max: 800 }, 50)}
        </div>
        <div class="form-row" style="margin-top:1rem">
            <div style="flex:0 0 auto">
                <label class="field-label">Pitch</label>
                <button class="adjust-toggle" id="spaSign" type="button" title="Toggle sign">+</button>
            </div>
            <div>
                <label class="field-label" for="spaTerrain">Terrain / pitch (mils)</label>
                <input class="field" id="spaTerrain" type="number" inputmode="numeric" step="1" placeholder="0">
            </div>
            <div style="flex:0 0 auto">
                <label class="field-label">&nbsp;</label>
                <button class="btn btn-primary" id="spaCalc" type="button">Calculate</button>
            </div>
        </div>
        <p class="calc-footnote">+ subtracts mills from the solution; - adds mills (terrain angle and tank pitch).</p>
        <div class="result-display${focus ? " result-display--sticky" : ""}" id="spaResult"><span class="result-empty">No calculation yet.</span></div>
        ${hist}
    </section>`;
}

function calcTabs(active, route) {
    const artyHref = buildHash(route.branch, route.era, route.section, route.extra, { tab: "artillery" });
    const spaHref = buildHash(route.branch, route.era, route.section, route.extra, { tab: "spa" });
    return `<div class="calc-tabs" role="tablist" aria-label="Calculator type">
        <a class="calc-tab ${active === "artillery" ? "active" : ""}" role="tab" href="${artyHref}" aria-selected="${active === "artillery"}">Artillery</a>
        <a class="calc-tab ${active === "spa" ? "active" : ""}" role="tab" href="${spaHref}" aria-selected="${active === "spa"}">SPA</a>
    </div>`;
}

export function render(route) {
    route = route || { branch: "armor", era: "wwii", section: "calculators", query: {} };
    const focus = isCalcFocus(route);
    const focusTool = focus ? (route.query.focus === "spa" ? "spa" : "artillery") : null;
    const activeTab = focusTool || route.query.tab || loadPref(PREF_CALC_TAB, "artillery");

    if (focus) {
        const title = focusTool === "spa" ? "SPA Calculator" : "Artillery Calculator";
        const popHash = enterFocusLink(route, focusTool);
        return `<div class="wrap calc-focus-wrap">
            ${focusBarHTML(title, exitFocusLink(route), popHash)}
            ${focusTool === "spa" ? spaPanel(route, true) : artilleryPanel(route, true)}
        </div>`;
    }

    const showArty = activeTab !== "spa";
    const showSpa = activeTab === "spa";

    return `<div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">HLL WWII · Armor</p>
            <h1 class="gold-text">Calculators &amp; Sights</h1>
            <p class="lead">Turn grid distance into firing solutions. Artillery and self-propelled gun mil calculators, tuned to each faction.</p>
        </header>

        ${calcTabs(activeTab, route)}
        <div class="calc-panels">
            <div class="calc-panel-slot${showArty ? "" : " hidden"}" id="calcSlotArty">${artilleryPanel(route, false)}</div>
            <div class="calc-panel-slot${showSpa ? "" : " hidden"}" id="calcSlotSpa">${spaPanel(route, false)}</div>
        </div>

        <section style="margin-top:2.5rem">
            <p class="eyebrow">Gunnery</p>
            <h2 class="gold-text" style="font-size:clamp(1.6rem,3.5vw,2.4rem);margin:.4rem 0 1rem">Armor Sights practice</h2>
            <p class="lead" style="margin-bottom:1.4rem">Practice ranging through each tank's gunsight. AP-only sight pictures, tested at 1440p / 115 FOV.</p>
            <div id="sightsMount"></div>
        </section>
    </div>`;
}

export function mount(root, route) {
    route = route || { branch: "armor", era: "wwii", section: "calculators", query: {} };
    const focus = isCalcFocus(route);

    if (focus) {
        bindFocusBar(root);
        const tool = route.query.focus === "spa" ? "spa" : "artillery";
        document.title = focusDocumentTitle(tool === "spa" ? "SPA Calculator" : "Artillery Calculator");
    }

    if (!focus && route.query.tab) savePref(PREF_CALC_TAB, route.query.tab);

    mountArty(root, focus);
    mountSPA(root, focus);
    bindDeletes(root);

    if (!focus) {
        import("./sights.js").then(function (m) {
            const mountEl = root.querySelector("#sightsMount");
            if (mountEl && m && m.render) { mountEl.innerHTML = m.render(); if (m.mount) m.mount(mountEl); }
        }).catch(function () {});
    }
}

function mountArty(root, focus) {
    const artyDist = root.querySelector("#artyDist");
    if (!artyDist) return;
    const artyFaction = root.querySelector("#artyFaction");
    const artyResult = root.querySelector("#artyResult");

    function runArty() {
        const r = calcArtillery(artyDist.value, artyFaction.value);
        if (r.error) {
            artyResult.innerHTML = `<span class="result-empty" style="color:var(--danger)">${escapeHtml(r.error)}</span>`;
            return;
        }
        artyResult.innerHTML = `<span class="mills">${r.mills}</span><span class="ctx">mills · ${escapeHtml(r.factionName)} at ${escapeHtml(String(artyDist.value))}m</span>`;
        if (focus) document.title = focusDocumentTitle(r.mills + " mills · Artillery");
        artyHistory.add({ result: r.text, distance: Number(artyDist.value), label: r.factionName });
        renderHistory(root, "arty");
        artyDist.value = "";
        artyDist.focus();
    }

    function tryArty() {
        const d = Number(artyDist.value);
        if (!Number.isFinite(d) || d < ARTILLERY_BOUNDS.min || d > ARTILLERY_BOUNDS.max) return;
        runArty();
    }

    artyFaction.addEventListener("change", function () { savePref(PREF_ARTY_FACTION, artyFaction.value); tryArty(); });
    root.querySelector("#artyCalc").addEventListener("click", runArty);
    artyDist.addEventListener("keydown", function (e) { if (e.key === "Enter") runArty(); });
    artyDist.addEventListener("input", debounce(tryArty, 450));
    bindDistanceSteppers(root, "artyDist", ARTILLERY_BOUNDS, tryArty);
    if (focus && artyDist) artyDist.focus();
}

function mountSPA(root, focus) {
    const spaDist = root.querySelector("#spaDist");
    if (!spaDist) return;
    const spaType = root.querySelector("#spaType");
    const spaTerrain = root.querySelector("#spaTerrain");
    const spaSign = root.querySelector("#spaSign");
    const spaResult = root.querySelector("#spaResult");

    spaSign.addEventListener("click", function () { spaSign.textContent = spaSign.textContent === "+" ? "−" : "+"; });

    function runSPA() {
        const sign = spaSign.textContent === "+" ? "+" : "-";
        const r = calcSPA(spaDist.value, spaType.value, spaTerrain.value, sign);
        if (r.error) {
            spaResult.innerHTML = `<span class="result-empty" style="color:var(--danger)">${escapeHtml(r.error)}</span>`;
            return;
        }
        spaResult.innerHTML = `<span class="mills">${r.mills}</span><span class="ctx">mills · ${escapeHtml(r.typeName)} at ${escapeHtml(String(spaDist.value))}m</span>`;
        if (focus) document.title = focusDocumentTitle(r.mills + " mills · SPA");
        spaHistory.add({ result: r.text, distance: Number(spaDist.value), label: getSPATypeName(spaType.value) });
        renderHistory(root, "spa");
        spaDist.value = "";
        spaDist.focus();
    }

    function trySPA() {
        const d = Number(spaDist.value);
        const cfg = getSPATypes().find(function (t) { return t.key === spaType.value; });
        if (!cfg || !Number.isFinite(d) || d < cfg.min || d > cfg.max) return;
        runSPA();
    }

    root.querySelector("#spaCalc").addEventListener("click", runSPA);
    spaDist.addEventListener("keydown", function (e) { if (e.key === "Enter") runSPA(); });
    spaDist.addEventListener("input", debounce(trySPA, 450));
    spaType.addEventListener("change", function () { savePref(PREF_SPA_TYPE, spaType.value); trySPA(); });
    spaTerrain.addEventListener("input", debounce(trySPA, 450));
    bindDistanceSteppers(root, "spaDist", { min: 100, max: 800 }, trySPA);
    if (focus && spaDist) spaDist.focus();
}

function renderHistory(root, kind) {
    const sel = kind === "arty" ? "#calcArty .calc-history__body" : "#calcSpa .calc-history__body";
    const el = root.querySelector(sel);
    if (el) {
        el.innerHTML = historyTable(
            kind === "arty" ? artyHistory.all() : spaHistory.all(),
            kind === "arty" ? ["Result", "Distance", "Faction"] : ["Result", "Distance", "Type"],
            kind
        );
    }
    bindDeletes(root);
}

function bindDeletes(root) {
    root.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.onclick = function () {
            const id = Number(btn.getAttribute("data-del"));
            const kind = btn.getAttribute("data-kind");
            if (kind === "arty") artyHistory.remove(id); else spaHistory.remove(id);
            renderHistory(root, kind);
        };
    });
}