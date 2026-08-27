/* Armor - Vietnam Tankulator (% hit-location simulator) */
import {
    getVietnamTankulatorLocations,
    getVietnamTankulatorNote,
    getVietnamTankulatorTankNames,
    findVietnamLocation,
    simulateVietnamHit,
    describeVietnamDamage
} from "../vn-tankulator.js";
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, focusBarHTML, enterFocusBtn, exitFocusLink, enterFocusLink,
    bindFocusBar, focusDocumentTitle
} from "../tool-mode.js";

const MAX_SHOTS = 8;

let sel = {
    attacker: "M48 Patton",
    target: "T-54",
    location: "front"
};

function tankOptionsHtml(names, selected) {
    return names.map(function (name) {
        return `<option value="${escapeHtml(name)}"${name === selected ? " selected" : ""}>${escapeHtml(name)}</option>`;
    }).join("");
}

function locationOptionsHtml(locations, selected) {
    return locations.map(function (loc) {
        return `<option value="${escapeHtml(loc.key)}"${loc.key === selected ? " selected" : ""}>${escapeHtml(loc.label)}</option>`;
    }).join("");
}

function pct(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0%";
    return (Math.round(v * 10) / 10) + "%";
}

function barAccent(loc) {
    if (!loc) return "hull";
    if (loc.key === "turret") return "turret";
    if (loc.key === "tracks") return "tracks";
    return "hull";
}

function componentBar(title, poolStart, shotResults, dealtKey, accent, footLabel) {
    const shots = shotResults.length;
    if (!shots) return "";
    const barHp = poolStart > 0 ? poolStart : 100;
    const segs = shotResults.map(function (s, idx) {
        const dealt = Number(s[dealtKey]) || 0;
        const beforeVal = dealtKey === "hullDealt"
            ? s.before.hull
            : (s.componentKey === "turret" ? s.before.turret : s.before.tracks);
        const w = (Math.min(beforeVal, dealt) / barHp) * 100;
        if (dealt <= 0 && dealtKey !== "hullDealt") {
            return `<span class="tk-seg tk-seg--${idx + 1}" style="width:0" title="Shot ${idx + 1}: no component damage"></span>`;
        }
        const killed = dealtKey === "hullDealt" ? s.killed : (beforeVal - dealt) <= 0;
        const num = idx + 1;
        const label = w >= 14 ? `<span class="tk-seg__n">${num}</span>` : "";
        const tip = dealtKey === "hullDealt"
            ? `Shot ${num}: −${pct(dealt)} hull → ${pct(s.after.hull)} left`
            : `Shot ${num}: −${pct(dealt)} → ${pct(beforeVal - dealt)} left`;
        return `<span class="tk-seg tk-seg--${num} ${killed ? "kill" : ""}" style="width:${Math.max(w, 0)}%" title="${escapeHtml(tip)}">${label}</span>`;
    }).join("");

    const legend = shotResults.map(function (s, idx) {
        const dealt = Number(s[dealtKey]) || 0;
        if (dealt <= 0 && dealtKey !== "hullDealt") return "";
        const killed = dealtKey === "hullDealt" ? s.killed : false;
        return `<span class="tk-shot ${killed ? "kill" : ""}"><span class="tk-shot__n">${idx + 1}</span><span class="tk-shot__dmg">−${pct(dealt)}</span></span>`;
    }).filter(Boolean).join("");

    return `<div class="tk-comp">
        <div class="tk-comp__head"><span>${escapeHtml(title)}</span><span class="tk-comp__hp">${pct(poolStart)}</span></div>
        <div class="tk-comp__bar ${accent}" role="img" aria-label="${escapeHtml(title)}">${segs}</div>
        ${legend ? `<div class="tk-comp__legend">${legend}</div>` : ""}
        <div class="tk-comp__foot">${footLabel}</div>
    </div>`;
}

function renderResult() {
    const loc = findVietnamLocation(sel.location);
    const sim = simulateVietnamHit(sel.location, MAX_SHOTS);
    const calc = describeVietnamDamage(sel.location);
    if (!loc || !sim) return `<p class="result-empty">Select a hit location.</p>`;

    const stk = sim.shotsToKill;
    const hullShots = sim.shotResults;
    const accent = barAccent(loc);

    let componentHtml = "";
    if (loc.kind === "component") {
        const compStart = loc.component === "turret" ? sim.start.turret : sim.start.tracks;
        const compLabel = loc.component === "turret" ? "Turret" : "Tracks";
        const untilKo = hullShots.filter(function (s) {
            const before = loc.component === "turret" ? s.before.turret : s.before.tracks;
            return before > 0;
        });
        const koShot = untilKo.length;
        componentHtml = componentBar(
            compLabel,
            compStart,
            untilKo,
            "componentDealt",
            accent,
            koShot ? `<strong>${koShot}</strong> shot${koShot === 1 ? "" : "s"} to knock out ${compLabel.toLowerCase()}` : "-"
        );
    }

    const hullFoot = stk
        ? `<strong>${stk}</strong> shot${stk === 1 ? "" : "s"} to kill (hull 0%)`
        : "-";

    const shotList = (stk != null ? hullShots.slice(0, stk) : hullShots);
    let shotLine = "";
    if (loc.kind === "hull") {
        shotLine = shotList.map(function (s) {
            return `<span class="tk-dmg-shot">Shot ${s.shot} <strong>${pct(s.hullDealt)}</strong> dmg</span>`;
        }).join("");
    } else {
        shotLine = shotList.map(function (s) {
            const bits = [];
            if (s.componentDealt > 0) bits.push(`${pct(s.componentDealt)} ${s.componentKey}`);
            if (s.hullDealt > 0) bits.push(`${pct(s.hullDealt)} hull`);
            return `<span class="tk-dmg-shot">Shot ${s.shot} <strong>${bits.join(" + ") || "0%"}</strong></span>`;
        }).join("");
    }

    let resistLine = "";
    if (calc && calc.kind === "hull") {
        resistLine = `<p>${icon("shield-halved")} ${escapeHtml(loc.label)} has <strong>${pct(calc.resistancePct)}</strong> dmg resistance</p>`;
    } else if (calc && calc.kind === "component") {
        resistLine = `<p>${icon("shield-halved")} ${escapeHtml(loc.label)} path has <strong>0%</strong> hull-face dmg resistance</p>`;
    }

    return `<div class="tk-verdict tk-verdict--yes">
            <div class="tk-verdict__big"><strong>${stk != null ? stk : "-"}</strong><span>shot${stk === 1 ? "" : "s"} to kill</span></div>
            <div class="tk-verdict__meta">
                <p>${icon("crosshairs")} Hit · <strong>${escapeHtml(loc.label)}</strong></p>
                ${shotLine ? `<div class="tk-dmg-line"><span class="tk-dmg-line__label">${icon("bolt")} Damage dealt</span><div class="tk-dmg-line__shots">${shotLine}</div></div>` : ""}
                ${resistLine}
            </div>
        </div>
        <div class="tk-comps">
            ${componentBar("Hull", sim.start.hull, hullShots, "hullDealt", "hull", hullFoot)}
            ${componentHtml}
        </div>`;
}

export function render(route) {
    route = route || { branch: "armor", era: "vietnam", section: "tankulator", query: {} };
    const focus = isCalcFocus(route);
    const names = getVietnamTankulatorTankNames();
    const locations = getVietnamTankulatorLocations();
    const note = getVietnamTankulatorNote();

    if (names.length && names.indexOf(sel.attacker) < 0) sel.attacker = names[0];
    if (names.length && names.indexOf(sel.target) < 0) {
        sel.target = names.find(function (n) { return n !== sel.attacker; }) || names[0];
    }
    if (locations.length && !findVietnamLocation(sel.location)) sel.location = locations[0].key;

    const chips = locations.map(function (loc) {
        return `<button type="button" class="chip${loc.key === sel.location ? " active" : ""}" data-vn-loc="${escapeHtml(loc.key)}">${escapeHtml(loc.label)}</button>`;
    }).join("");

    const presetsBlock = focus
        ? `<details class="calc-history"><summary>Hit locations</summary><div class="calc-history__body"><div class="filter-group" id="vnTkLocs">${chips}</div></div></details>`
        : `<div class="history"><h4>Hit locations</h4><div class="filter-group" id="vnTkLocs">${chips}</div></div>`;

    const header = focus ? "" : `<header class="section-head">
            <p class="eyebrow">Armor · Vietnam</p>
            <h1 class="gold-text">Tankulator</h1>
            <p class="lead">Vietnam tank vs tank shots-to-kill by hit location. Hull, turret, and tracks use the live <strong>%</strong> health format. M48 Patton and T-54 share the same damage model.</p>
        </header>`;

    const focusBar = focus
        ? focusBarHTML("Vietnam Tankulator", exitFocusLink(route), enterFocusLink(route, "1"))
        : `<div class="calc-panel-head calc-panel-head--solo"><span></span>${enterFocusBtn(route, "1", "Open Vietnam Tankulator in focus mode")}</div>`;

    const noteHtml = note
        ? `<div class="notice" style="margin-bottom:1.2rem">${icon("circle-info")} ${escapeHtml(note)}</div>`
        : "";

    return `<div class="wrap${focus ? " calc-focus-wrap" : ""}">
        ${focus ? focusBar : ""}
        ${header}
        ${focus ? "" : focusBar}
        ${focus ? "" : noteHtml}
        <div class="tool-panel glass-strong glass">
            <div class="form-row">
                <div>
                    <label class="field-label" for="vnTkAttacker">Attacker</label>
                    <select class="field" id="vnTkAttacker">${tankOptionsHtml(names, sel.attacker)}</select>
                </div>
                <div style="flex:0 0 auto">
                    <label class="field-label">&nbsp;</label>
                    <button class="adjust-toggle" id="vnTkSwap" title="Swap attacker & target" aria-label="Swap">${icon("right-left")}</button>
                </div>
                <div>
                    <label class="field-label" for="vnTkTarget">Target</label>
                    <select class="field" id="vnTkTarget">${tankOptionsHtml(names, sel.target)}</select>
                </div>
                <div>
                    <label class="field-label" for="vnTkLoc">Hit location</label>
                    <select class="field" id="vnTkLoc">${locationOptionsHtml(locations, sel.location)}</select>
                </div>
            </div>

            <div id="vnTkResult" class="tk-result${focus ? " tk-result--focus" : ""}">${renderResult()}</div>

            ${presetsBlock}
        </div>
    </div>`;
}

export function mount(root, route) {
    route = route || { branch: "armor", era: "vietnam", section: "tankulator", query: {} };
    const focus = isCalcFocus(route);
    if (focus) {
        bindFocusBar(root);
        document.title = focusDocumentTitle("Vietnam Tankulator");
    }

    const aEl = root.querySelector("#vnTkAttacker");
    const tEl = root.querySelector("#vnTkTarget");
    const lEl = root.querySelector("#vnTkLoc");
    const out = root.querySelector("#vnTkResult");
    const swap = root.querySelector("#vnTkSwap");
    const chips = root.querySelector("#vnTkLocs");

    function syncSelects() {
        if (aEl && [...aEl.options].some(function (o) { return o.value === sel.attacker; })) aEl.value = sel.attacker;
        if (tEl && [...tEl.options].some(function (o) { return o.value === sel.target; })) tEl.value = sel.target;
        if (lEl) lEl.value = sel.location;
        if (chips) {
            chips.querySelectorAll("[data-vn-loc]").forEach(function (btn) {
                btn.classList.toggle("active", btn.getAttribute("data-vn-loc") === sel.location);
            });
        }
    }

    function update() {
        if (out) out.innerHTML = renderResult();
        syncSelects();
    }

    if (aEl) aEl.addEventListener("change", function () { sel.attacker = aEl.value; update(); });
    if (tEl) tEl.addEventListener("change", function () { sel.target = tEl.value; update(); });
    if (lEl) lEl.addEventListener("change", function () { sel.location = lEl.value; update(); });
    if (swap) {
        swap.addEventListener("click", function () {
            const tmp = sel.attacker;
            sel.attacker = sel.target;
            sel.target = tmp;
            update();
        });
    }
    if (chips) {
        chips.addEventListener("click", function (e) {
            const btn = e.target.closest("[data-vn-loc]");
            if (!btn) return;
            sel.location = btn.getAttribute("data-vn-loc");
            update();
        });
    }

    syncSelects();
}
