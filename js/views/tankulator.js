/* Armor - Tankulator (AP shot simulator, U20) */
import {
    collectTankulatorTanks, INFANTRY_ATTACKERS, TANKULATOR_PRESETS,
    findAttackerByName, findTankByName, simulateTankulatorFace, applyPriorHits,
    getTankulatorPenClass, getU20ResistTier, getArmorTierMeta
} from "../data.js";
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, focusBarHTML, enterFocusBtn, exitFocusLink, enterFocusLink,
    bindFocusBar, focusDocumentTitle
} from "../tool-mode.js";

const FACES = [
    { key: "front", label: "Front" },
    { key: "left", label: "Left side" },
    { key: "right", label: "Right side" },
    { key: "rear", label: "Rear" }
];
const MAX_SHOTS = 8;
const MAX_PRIOR = 5;

let priorIdSeq = 1;
let sel = { attacker: "Tiger I", target: "Sherman 76 Jumbo", face: "front", priorHits: [] };

function faceLabel(key) {
    return (FACES.find(function (f) { return f.key === key; }) || {}).label || key;
}

function optionList(tanks) {
    return tanks.map(function (t) {
        const label = t.type === "Infantry AT" ? `${t.name} - All Factions` : `${t.name} (${t.type})`;
        return `<option value="${escapeHtml(t.name)}">${escapeHtml(label)}</option>`;
    }).join("");
}

function attackerOptionsHtml(tanks, selected) {
    const pick = function (name) {
        return name === selected ? " selected" : "";
    };
    const infantry = INFANTRY_ATTACKERS.map(function (t) {
        return `<option value="${escapeHtml(t.name)}"${pick(t.name)}>${escapeHtml(t.name)} - All Factions</option>`;
    }).join("");
    const tankOpts = tanks.map(function (t) {
        return `<option value="${escapeHtml(t.name)}"${pick(t.name)}>${escapeHtml(t.name)} (${escapeHtml(t.type)})</option>`;
    }).join("");
    return `<optgroup label="Infantry AT">${infantry}</optgroup><optgroup label="Tanks">${tankOpts}</optgroup>`;
}

function faceOptionsHtml(selected) {
    return FACES.map(function (f) {
        return `<option value="${f.key}"${f.key === selected ? " selected" : ""}>${escapeHtml(f.label)}</option>`;
    }).join("");
}

function componentBar(title, sim, effectiveDamage, accent) {
    if (!sim) return "";
    const shots = sim.shotsToDeplete;
    const shotList = shots ? sim.shotResults.slice(0, shots) : [];
    const barHp = sim.poolHp > 0 ? sim.poolHp : 1;
    const segs = shotList.map(function (s, idx) {
        const w = (Math.min(s.hpBefore, effectiveDamage) / barHp) * 100;
        const killed = s.remaining === 0;
        const num = idx + 1;
        const label = w >= 14 ? `<span class="tk-seg__n">${num}</span>` : "";
        return `<span class="tk-seg tk-seg--${num} ${killed ? "kill" : ""}" style="width:${w}%" title="Shot ${num}: −${s.dealt} HP → ${s.remaining} HP left">${label}</span>`;
    }).join("");
    const legend = shotList.map(function (s, idx) {
        const killed = s.remaining === 0;
        return `<span class="tk-shot ${killed ? "kill" : ""}"><span class="tk-shot__n">${idx + 1}</span><span class="tk-shot__dmg">−${s.dealt}</span></span>`;
    }).join("");
    return `<div class="tk-comp">
        <div class="tk-comp__head"><span>${escapeHtml(title)}</span><span class="tk-comp__hp">${sim.poolHp} HP</span></div>
        <div class="tk-comp__bar ${accent}" role="img" aria-label="${escapeHtml(title)}: ${shots || 0} shots to deplete">${segs}</div>
        ${legend ? `<div class="tk-comp__legend">${legend}</div>` : ""}
        <div class="tk-comp__foot">${shots ? `<strong>${shots}</strong> shot${shots === 1 ? "" : "s"} to knock out` : "-"}</div>
    </div>`;
}

function summarizeLedger(ledger) {
    if (!ledger || !ledger.length) return [];
    const groups = [];
    let cur = null;
    ledger.forEach(function (row) {
        const key = row.attacker + "|" + row.face + "|" + (row.canPen ? "1" : "0");
        if (!cur || cur.key !== key) {
            cur = { key, attacker: row.attacker, face: row.face, canPen: row.canPen, shots: 0, dealt: 0 };
            groups.push(cur);
        }
        cur.shots += 1;
        cur.dealt += row.dealt;
    });
    return groups;
}

function priorLedgerHtml(prior) {
    if (!prior || !prior.ledger.length) return "";
    const groups = summarizeLedger(prior.ledger);
    const items = groups.map(function (g) {
        const face = faceLabel(g.face);
        if (!g.canPen) {
            return `<li class="tk-prior-ledger__item tk-prior-ledger__item--nopen"><strong>${escapeHtml(g.attacker)}</strong> ${escapeHtml(face.toLowerCase())} ×${g.shots} — no pen</li>`;
        }
        return `<li class="tk-prior-ledger__item"><strong>${escapeHtml(g.attacker)}</strong> ${escapeHtml(face.toLowerCase())} ×${g.shots} (−${g.dealt} HP)</li>`;
    }).join("");
    return `<ul class="tk-prior-ledger">${items}</ul>`;
}

function renderPriorSection(tanks) {
    const rows = sel.priorHits.map(function (h, idx) {
        return `<div class="tk-prior-row" data-prior-id="${h.id}">
            <div class="tk-prior-row__attacker">
                <label class="field-label" for="tkPriorAtk-${h.id}">Prior attacker ${idx + 1}</label>
                <select class="field" id="tkPriorAtk-${h.id}" data-prior-field="attacker">${attackerOptionsHtml(tanks, h.attacker)}</select>
            </div>
            <div class="tk-prior-row__face">
                <label class="field-label" for="tkPriorFace-${h.id}">Face</label>
                <select class="field" id="tkPriorFace-${h.id}" data-prior-field="face">${faceOptionsHtml(h.face)}</select>
            </div>
            <div class="tk-prior-row__shots">
                <label class="field-label" for="tkPriorShots-${h.id}">Shots</label>
                <input class="field" type="number" id="tkPriorShots-${h.id}" data-prior-field="shots" min="1" max="${MAX_SHOTS}" value="${h.shots}">
            </div>
            <div class="tk-prior-row__remove">
                <label class="field-label">&nbsp;</label>
                <button type="button" class="tk-prior-remove" data-prior-remove="${h.id}" title="Remove prior hit" aria-label="Remove prior hit">${icon("xmark")}</button>
            </div>
        </div>`;
    }).join("");

    const body = sel.priorHits.length
        ? `<div class="tk-prior-list" id="tkPriorList">${rows}</div>`
        : `<p class="tk-prior-empty">Optional — soften the target before your attacker shoots.</p>`;

    const addDisabled = sel.priorHits.length >= MAX_PRIOR ? " disabled" : "";

    return `<details class="tk-prior" open>
        <summary class="tk-prior__summary">Prior damage${sel.priorHits.length ? ` <span class="tk-prior__count">${sel.priorHits.length}</span>` : ""}</summary>
        <div class="tk-prior__body">
            ${body}
            <button type="button" class="chip tk-prior-add" id="tkPriorAdd"${addDisabled}>+ Add prior hit</button>
        </div>
    </details>`;
}

function renderResult() {
    const attacker = findAttackerByName(sel.attacker);
    const target = findTankByName(sel.target);
    if (!attacker || !target) return `<p class="result-empty">Select an attacker and target.</p>`;

    const prior = applyPriorHits(target, sel.priorHits, MAX_SHOTS);
    const hasPrior = prior.ledger.length > 0;
    const faceLbl = faceLabel(sel.face);
    const penClass = getTankulatorPenClass(attacker);
    const tierMeta = getArmorTierMeta(getU20ResistTier(target, sel.face));
    const resistTxt = tierMeta.percent != null ? `−${tierMeta.percent}% plate resist` : tierMeta.label;

    if (prior.alreadyDead) {
        return `<div class="tk-verdict tk-verdict--prior-kill">
            ${icon("skull-crossbones")}
            <div>
                <strong>Already destroyed by prior hits</strong>
                <span>Hull ${prior.hullHp} → 0 (−${prior.totalDealt} HP) before ${escapeHtml(attacker.name)} fires.</span>
                ${priorLedgerHtml(prior)}
            </div>
        </div>`;
    }

    const r = simulateTankulatorFace(attacker, target, sel.face, MAX_SHOTS, {
        hullHpRemaining: prior.hullRemaining
    });

    if (!r.canPen) {
        const priorNote = hasPrior
            ? `<p class="tk-prior-note">Hull ${prior.hullHp} → <strong>${prior.hullRemaining}</strong> after prior (−${prior.totalDealt} HP)</p>${priorLedgerHtml(prior)}`
            : "";
        return `<div class="tk-verdict tk-verdict--no">
            ${icon("ban")}
            <div><strong>Cannot penetrate</strong><span>${escapeHtml(attacker.name)} (${penClass} AP) can't pen the ${escapeHtml(faceLbl.toLowerCase())} of the ${escapeHtml(target.name)}.</span>
            ${priorNote}</div>
        </div>`;
    }

    const hullTitle = hasPrior
        ? `If hull shot (from ${r.hullHpRemaining} HP)`
        : "If hull shot";
    const priorMeta = hasPrior
        ? `<p>${icon("heart-crack")} Hull ${prior.hullHp} → <strong>${prior.hullRemaining}</strong> after prior (−${prior.totalDealt} HP)</p>${priorLedgerHtml(prior)}`
        : "";

    return `<div class="tk-verdict tk-verdict--yes">
            <div class="tk-verdict__big"><strong>${r.shotsToKill}</strong><span>shot${r.shotsToKill === 1 ? "" : "s"} to kill</span></div>
            <div class="tk-verdict__meta">
                <p>${icon("bolt")} ${r.apDamage} base AP → <strong>${r.effectiveDamage}</strong> effective dmg/shot</p>
                <p>${icon("shield-halved")} ${escapeHtml(faceLbl)} hull · ${escapeHtml(resistTxt)}</p>
                ${priorMeta}
            </div>
        </div>
        <div class="tk-comps">
            ${componentBar(hullTitle, { poolHp: r.hullHpRemaining, shotsToDeplete: r.shotsToKill, shotResults: r.shotResults }, r.effectiveDamage, "hull")}
            ${componentBar("If turret shot", r.turret, r.effectiveDamage, "turret")}
            ${sel.face === "rear" ? componentBar("If rear engine shot", r.engine, r.effectiveDamage, "engine") : ""}
        </div>`;
}

function defaultPriorAttacker() {
    return INFANTRY_ATTACKERS[0] ? INFANTRY_ATTACKERS[0].name : "Rocket Launcher";
}

export function render(route) {
    route = route || { branch: "armor", era: "wwii", section: "tankulator", query: {} };
    const focus = isCalcFocus(route);
    const tanks = collectTankulatorTanks();
    const presetBtns = TANKULATOR_PRESETS.map(function (p, i) {
        return `<button class="chip" data-preset="${i}">${escapeHtml(p.label)}</button>`;
    }).join("");

    const presetsBlock = focus
        ? `<details class="calc-history"><summary>Quick matchups</summary><div class="calc-history__body"><div class="filter-group" id="tkPresets">${presetBtns}</div></div></details>`
        : `<div class="history"><h4>Quick matchups</h4><div class="filter-group" id="tkPresets">${presetBtns}</div></div>`;

    const header = focus ? "" : `<header class="section-head">
            <p class="eyebrow">HLL WWII · Armor</p>
            <h1 class="gold-text">Tankulator</h1>
            <p class="lead">Simulate AP shots with Update&nbsp;20 plate resistance - shots-to-kill against hull, turret and rear engine. Built in partnership with WIX.</p>
        </header>`;

    const focusBar = focus
        ? focusBarHTML("Tankulator", exitFocusLink(route), enterFocusLink(route, "1"))
        : `<div class="calc-panel-head calc-panel-head--solo"><span></span>${enterFocusBtn(route, "1", "Open Tankulator in focus mode")}</div>`;

    return `<div class="wrap${focus ? " calc-focus-wrap" : ""}">
        ${focus ? focusBar : ""}
        ${header}
        ${focus ? "" : focusBar}
        <div class="tool-panel glass-strong glass">
            <div class="form-row">
                <div>
                    <label class="field-label" for="tkAttacker">Attacker</label>
                    <select class="field" id="tkAttacker">
                        <optgroup label="Infantry AT">${optionList(INFANTRY_ATTACKERS)}</optgroup>
                        <optgroup label="Tanks">${optionList(tanks)}</optgroup>
                    </select>
                </div>
                <div style="flex:0 0 auto">
                    <label class="field-label">&nbsp;</label>
                    <button class="adjust-toggle" id="tkSwap" title="Swap attacker & target" aria-label="Swap">${icon("right-left")}</button>
                </div>
                <div>
                    <label class="field-label" for="tkTarget">Target</label>
                    <select class="field" id="tkTarget">${optionList(tanks)}</select>
                </div>
                <div>
                    <label class="field-label" for="tkFace">Hit face</label>
                    <select class="field" id="tkFace">${FACES.map(function (f) { return `<option value="${f.key}">${f.label}</option>`; }).join("")}</select>
                </div>
            </div>

            <div id="tkPriorWrap">${renderPriorSection(tanks)}</div>

            <div id="tkResult" class="tk-result${focus ? " tk-result--focus" : ""}">${renderResult()}</div>

            ${presetsBlock}
        </div>
    </div>`;
}

export function mount(root, route) {
    route = route || { branch: "armor", era: "wwii", section: "tankulator", query: {} };
    const focus = isCalcFocus(route);
    if (focus) {
        bindFocusBar(root);
        document.title = focusDocumentTitle("Tankulator");
    }
    const aEl = root.querySelector("#tkAttacker");
    const tEl = root.querySelector("#tkTarget");
    const fEl = root.querySelector("#tkFace");
    const out = root.querySelector("#tkResult");
    const priorWrap = root.querySelector("#tkPriorWrap");
    const tanks = collectTankulatorTanks();

    function syncSelectsFromState() {
        if ([...aEl.options].some(function (o) { return o.value === sel.attacker; })) aEl.value = sel.attacker;
        if ([...tEl.options].some(function (o) { return o.value === sel.target; })) tEl.value = sel.target;
        fEl.value = sel.face;
    }

    function refreshPrior() {
        priorWrap.innerHTML = renderPriorSection(tanks);
        bindPrior();
    }

    function update() {
        out.innerHTML = renderResult();
    }

    function refreshAll() {
        refreshPrior();
        update();
    }

    function bindPrior() {
        const addBtn = priorWrap.querySelector("#tkPriorAdd");
        if (addBtn) {
            addBtn.addEventListener("click", function () {
                if (sel.priorHits.length >= MAX_PRIOR) return;
                sel.priorHits.push({
                    id: priorIdSeq++,
                    attacker: defaultPriorAttacker(),
                    face: "left",
                    shots: 1
                });
                refreshAll();
            });
        }

        priorWrap.querySelectorAll("[data-prior-remove]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const id = Number(btn.getAttribute("data-prior-remove"));
                sel.priorHits = sel.priorHits.filter(function (h) { return h.id !== id; });
                refreshAll();
            });
        });

        priorWrap.querySelectorAll(".tk-prior-row").forEach(function (row) {
            const id = Number(row.getAttribute("data-prior-id"));
            row.querySelectorAll("[data-prior-field]").forEach(function (el) {
                const field = el.getAttribute("data-prior-field");
                const evt = el.tagName === "INPUT" ? "input" : "change";
                el.addEventListener(evt, function () {
                    const hit = sel.priorHits.find(function (h) { return h.id === id; });
                    if (!hit) return;
                    if (field === "shots") {
                        let n = Math.floor(Number(el.value) || 1);
                        if (n < 1) n = 1;
                        if (n > MAX_SHOTS) n = MAX_SHOTS;
                        hit.shots = n;
                        if (String(el.value) !== String(n)) el.value = String(n);
                    } else {
                        hit[field] = el.value;
                    }
                    update();
                });
            });
        });
    }

    syncSelectsFromState();
    bindPrior();

    aEl.addEventListener("change", function () { sel.attacker = aEl.value; update(); });
    tEl.addEventListener("change", function () { sel.target = tEl.value; update(); });
    fEl.addEventListener("change", function () { sel.face = fEl.value; update(); });

    root.querySelector("#tkSwap").addEventListener("click", function () {
        const a = sel.attacker;
        sel.attacker = sel.target;
        sel.target = a;
        sel.priorHits = [];
        syncSelectsFromState();
        refreshAll();
    });

    root.querySelectorAll("[data-preset]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const p = TANKULATOR_PRESETS[Number(btn.getAttribute("data-preset"))];
            sel = { attacker: p.attacker, target: p.target, face: p.face, priorHits: [] };
            syncSelectsFromState();
            refreshAll();
        });
    });

    update();
}
