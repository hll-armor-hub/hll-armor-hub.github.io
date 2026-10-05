/* Wardogs - Maps & Fire Mission: grid-ref fire calculator + 2D click map */
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, exitFocusLink, enterFocusLink, focusBarHTML, enterFocusBtn, bindFocusBar,
    loadPref, savePref, focusDocumentTitle
} from "../tool-mode.js";
import { loadFireMission } from "../wardogs-data.js";
import { gridSpec, colLetters, parseRef, formatRef, solve, adjust, elevationFor } from "../wardogs-fire-math.js";

const PREF_GUN = "wd-fm-gun";
const PREF_MAP = "wd-fm-map";
const PREF_HIST = "wd-fm-hist";
const PREF_GRID = "wd-fm-grid";
const HIST_MAX = 8;
const TOOL = "Fire Mission";

const FALLBACK_DOC = {
    milsPerCircle: 6400,
    maps: [{ id: "custom", name: "Plain grid (no map image)", image: null, sizeMeters: 2000, gridCols: 10, gridRows: 10, keypad: true, verified: false }],
    weapons: []
};

const ADJUSTS = [
    { add: -100, right: 0, t: "Drop 100" },
    { add: -50, right: 0, t: "Drop 50" },
    { add: 50, right: 0, t: "Add 50" },
    { add: 100, right: 0, t: "Add 100" },
    { add: 0, right: -100, t: "L 100" },
    { add: 0, right: -50, t: "L 50" },
    { add: 0, right: 50, t: "R 50" },
    { add: 0, right: 100, t: "R 100" }
];

function readJSON(key, fallback) {
    try {
        const v = JSON.parse(loadPref(key, ""));
        return v == null ? fallback : v;
    } catch (e) { return fallback; }
}

function seasonLabel(era) {
    const m = /^s(\d+)$/.exec(era || "");
    return m ? "Season " + m[1] : era;
}

function focusMode(route) {
    if (!isCalcFocus(route)) return null;
    return route.query.focus === "map" ? "map" : "calc";
}

function calcPanel(route, focus) {
    const adj = ADJUSTS.map(function (a) {
        return `<button type="button" class="wdf-adj" data-add="${a.add}" data-right="${a.right}">${escapeHtml(a.t)}</button>`;
    }).join("");
    const head = focus ? "" : `<div class="calc-panel-head">
            <h3>${icon("crosshairs")} Fire mission</h3>
            ${enterFocusBtn(route, "1", "Open the fire mission calculator in focus mode")}
        </div>`;
    return `<section class="tool-panel glass wdf-calc">
        ${head}
        <div class="wdf-inputs">
            <div class="wdf-field">
                <label class="field-label" for="wdfGun">Gun position</label>
                <input class="field wdf-ref" id="wdfGun" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" enterkeyhint="next" placeholder="D7-3">
                <p class="wdf-msg" id="wdfGunMsg" aria-live="polite"></p>
            </div>
            <button type="button" class="wdf-swap" id="wdfSwap" aria-label="Swap gun and target" title="Swap gun and target">${icon("right-left")}</button>
            <div class="wdf-field">
                <label class="field-label" for="wdfTgt">Target</label>
                <input class="field wdf-ref" id="wdfTgt" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" enterkeyhint="done" placeholder="F4-9">
                <p class="wdf-msg" id="wdfTgtMsg" aria-live="polite"></p>
            </div>
        </div>
        <div class="wdf-out" id="wdfOut" aria-live="polite"></div>
        <div class="wdf-adjusts" role="group" aria-label="Adjust fire">${adj}</div>
        <div class="wdf-weapons" id="wdfWeapons"></div>
        <details class="calc-history" open>
            <summary>Recent targets</summary>
            <div class="calc-history__body" id="wdfHist"></div>
        </details>
        <p class="calc-footnote">Grid: letter column + row, then keypad digits (7 8 9 top, 1 2 3 bottom), e.g. D7-3 or D73. Meters: X Y from the top-left corner, e.g. 1240 860. Enter logs the target. ↑ / ↓ in the target box add or drop 50 m (Shift for 100).</p>
    </section>`;
}

function mapPanel(route, focus) {
    const head = focus ? "" : `<div class="calc-panel-head">
            <h3>${icon("map")} 2D map</h3>
            ${enterFocusBtn(route, "map", "Open the 2D map in focus mode")}
        </div>`;
    return `<section class="tool-panel glass wdf-mappanel">
        ${head}
        <div class="wdf-maptools">
            <label class="sr-only" for="wdfMap">Map</label>
            <select class="field wdf-mapselect" id="wdfMap"></select>
            <div class="wdf-place" role="group" aria-label="Clicking the map places">
                <button type="button" class="calc-tab" data-place="gun">Gun</button>
                <button type="button" class="calc-tab" data-place="tgt">Target</button>
            </div>
        </div>
        <div class="wdf-canvas-wrap"><canvas id="wdfCanvas" role="img" aria-label="Map grid. Click to place the gun, then the target."></canvas></div>
        <p class="wdf-hover" id="wdfHover">Tap your gun, then the target. Shift-click always moves the gun.</p>
        <details class="wdf-gridset">
            <summary>Grid settings</summary>
            <div class="form-row">
                <div><label class="field-label" for="wdfSize">Map size (m)</label><input class="field" id="wdfSize" type="number" inputmode="numeric" min="100" max="50000" step="100"></div>
                <div><label class="field-label" for="wdfSquares">Grid squares per side</label><input class="field" id="wdfSquares" type="number" inputmode="numeric" min="1" max="26" step="1"></div>
                <div><button type="button" class="btn btn-ghost btn-sm" id="wdfGridReset">${icon("rotate-left")} Reset</button></div>
            </div>
            <p class="wd-fine" id="wdfMapNote"></p>
        </details>
    </section>`;
}

export const fireMission = {
    render: function (route) {
        const focus = focusMode(route);
        if (focus) {
            const bar = focusBarHTML(focus === "map" ? "Fire Mission Map" : "Fire Mission", exitFocusLink(route), enterFocusLink(route, focus === "map" ? "map" : "1"));
            return `<div class="wrap calc-focus-wrap wdf-root">
                ${bar}
                ${focus === "map" ? mapPanel(route, true) : ""}
                ${calcPanel(route, true)}
            </div>`;
        }
        return `<div class="wrap wrap-wide wdf-root">
            <header class="section-head">
                <p class="eyebrow">Wardogs · ${escapeHtml(seasonLabel(route.era))}</p>
                <h1 class="gold-text">Maps &amp; Fire Mission</h1>
                <p class="lead">No ping-to-range in Wardogs, so range off the map grid. Type the gun and target squares, or tap them on the map, and read off distance and bearing.</p>
            </header>
            <p class="notice wdf-honest">${icon("circle-info")} Distance and bearing are pure geometry, exact for the grid you set. Elevation needs each weapon's range table from the game files. Until then it shows <strong>Needs data</strong> rather than a guess.</p>
            <div class="wdf-layout">
                ${calcPanel(route, false)}
                ${mapPanel(route, false)}
            </div>
        </div>`;
    },
    mount: function (root, route) {
        const focus = focusMode(route);
        if (focus) {
            bindFocusBar(root);
            document.title = focusDocumentTitle(TOOL);
        }
        loadFireMission(route.era).catch(function (err) {
            console.warn(err);
            return FALLBACK_DOC;
        }).then(function (doc) {
            if (root.querySelector(".wdf-root")) start(root, doc, focus);
        });
    }
};

function normalizeDoc(doc) {
    const maps = Array.isArray(doc && doc.maps) && doc.maps.length ? doc.maps : FALLBACK_DOC.maps;
    const weapons = Array.isArray(doc && doc.weapons) ? doc.weapons : [];
    const mpc = Number(doc && doc.milsPerCircle) > 0 ? Number(doc.milsPerCircle) : 6400;
    return { maps: maps, weapons: weapons, milsPerCircle: mpc };
}

function specSig(spec) { return spec.size + "/" + spec.cols + "/" + spec.rows; }

function fmtElevation(w, r) {
    const unit = w.elevationUnit === "deg" ? "°" : " mil";
    if (r.status === "ok") return `<strong class="wdf-elev">${escapeHtml((w.elevationUnit === "deg" ? r.value.toFixed(1) : String(Math.round(r.value))) + unit)}</strong>`;
    if (r.status === "short") return `<span class="wdf-warn">Too close${r.min != null ? ` (min ${escapeHtml(String(r.min))} m)` : ""}</span>`;
    if (r.status === "long") return `<span class="wdf-warn">Out of range${r.max != null ? ` (max ${escapeHtml(String(r.max))} m)` : ""}</span>`;
    return `<span class="wdf-nodata">Needs data</span>`;
}

function adjNote(adj) {
    const parts = [];
    if (adj.add) parts.push((adj.add > 0 ? "Add " : "Drop ") + Math.abs(adj.add));
    if (adj.right) parts.push((adj.right > 0 ? "R " : "L ") + Math.abs(adj.right));
    return parts.join(", ");
}

function start(root, rawDoc, focus) {
    const doc = normalizeDoc(rawDoc);
    const gunIn = root.querySelector("#wdfGun");
    const tgtIn = root.querySelector("#wdfTgt");
    const gunMsg = root.querySelector("#wdfGunMsg");
    const tgtMsg = root.querySelector("#wdfTgtMsg");
    const outEl = root.querySelector("#wdfOut");
    const weaponsEl = root.querySelector("#wdfWeapons");
    const histEl = root.querySelector("#wdfHist");
    const canvas = root.querySelector("#wdfCanvas");
    const mapSel = root.querySelector("#wdfMap");
    const sizeIn = root.querySelector("#wdfSize");
    const squaresIn = root.querySelector("#wdfSquares");
    const hoverEl = root.querySelector("#wdfHover");
    const noteEl = root.querySelector("#wdfMapNote");

    const overrides = readJSON(PREF_GRID, {});
    let history = readJSON(PREF_HIST, []);
    if (!Array.isArray(history)) history = [];
    let mapIdx = Math.max(0, doc.maps.findIndex(function (m) { return m.id === loadPref(PREF_MAP, ""); }));
    let spec = null;
    let img = null;
    let imgOk = false;
    const state = { gun: null, tgt: null, adj: { add: 0, right: 0 }, place: "gun", hover: null };

    function currentMap() { return doc.maps[mapIdx]; }

    function applySpec() {
        const m = currentMap();
        const o = overrides[m.id] || {};
        spec = gridSpec(Object.assign({}, m, o));
        if (sizeIn) sizeIn.value = String(spec.size);
        if (squaresIn) squaresIn.value = String(spec.cols);
        if (noteEl) {
            const bits = [];
            bits.push(m.verified ? "Grid checked against the game." : "Unverified grid: confirm map size and squares in-game.");
            if (m.note) bits.push(String(m.note));
            if (m.image && !imgOk) bits.push("Map image not loaded, showing a plain grid.");
            noteEl.textContent = bits.join(" ");
        }
    }

    function loadImage() {
        const m = currentMap();
        img = null;
        imgOk = false;
        if (!canvas || !m.image) return;
        const el = new Image();
        el.decoding = "async";
        el.onload = function () {
            if (img !== el) return;
            imgOk = true;
            applySpec();
            draw();
        };
        el.onerror = function () {
            if (img !== el) return;
            imgOk = false;
            applySpec();
            draw();
        };
        img = el;
        el.src = String(m.image);
    }

    function saveGun() {
        if (!state.gun) { savePref(PREF_GUN, ""); return; }
        savePref(PREF_GUN, JSON.stringify({ text: gunIn.value, x: state.gun.x, y: state.gun.y, p: state.gun.precision, ref: state.gun.ref, sig: specSig(spec) }));
    }

    function readInput(which) {
        const input = which === "gun" ? gunIn : tgtIn;
        const msg = which === "gun" ? gunMsg : tgtMsg;
        const r = parseRef(input.value, spec);
        if (r.empty || r.error) {
            state[which] = null;
            msg.textContent = r.error || "";
            input.setAttribute("aria-invalid", r.error ? "true" : "false");
        } else {
            state[which] = { x: r.x, y: r.y, ref: r.ref, precision: r.precision };
            msg.textContent = r.outside ? "Outside the map edge" : "";
            input.setAttribute("aria-invalid", "false");
        }
        if (which === "tgt") state.adj = { add: 0, right: 0 };
        if (which === "gun") saveGun();
    }

    function setPoint(which, x, y) {
        const ref = formatRef(x, y, spec, 2);
        state[which] = { x: x, y: y, ref: ref, precision: 0 };
        const input = which === "gun" ? gunIn : tgtIn;
        input.value = ref;
        input.setAttribute("aria-invalid", "false");
        (which === "gun" ? gunMsg : tgtMsg).textContent = "";
        if (which === "tgt") state.adj = { add: 0, right: 0 };
        if (which === "gun") saveGun();
    }

    function solution() {
        if (!state.gun || !state.tgt) return null;
        return solve(state.gun, state.tgt, doc.milsPerCircle);
    }

    function renderOut() {
        const s = solution();
        if (!s) {
            outEl.innerHTML = `<span class="result-empty">${state.gun ? "Enter a target." : "Enter your gun position, then the target."}</span>`;
            if (focus) document.title = focusDocumentTitle(TOOL);
        } else {
            const d = Math.round(s.distance);
            const deg = s.bearingDeg.toFixed(1);
            const mil = Math.round(s.bearingMil) % Math.round(doc.milsPerCircle);
            const acc = Math.round(state.gun.precision + state.tgt.precision);
            const note = adjNote(state.adj);
            outEl.innerHTML = `<div class="wdf-big"><span class="wdf-big__k">Distance</span><span class="wdf-big__v">${d}<small>m</small></span></div>
                <div class="wdf-big"><span class="wdf-big__k">Bearing</span><span class="wdf-big__v">${deg}<small>°</small></span></div>
                <div class="wdf-big"><span class="wdf-big__k">Bearing</span><span class="wdf-big__v">${mil}<small>mil</small></span></div>
                <p class="wdf-ctx">${escapeHtml(state.gun.ref)} → ${escapeHtml(state.tgt.ref)}${note ? ` · ${escapeHtml(note)}` : ""}${acc > 0 ? ` · ±${acc} m from grid size, add keypad digits to tighten` : ""}</p>`;
            if (focus) document.title = focusDocumentTitle(`${d} m · ${deg}°`);
        }
        renderWeapons(s);
    }

    function renderWeapons(s) {
        if (!doc.weapons.length) {
            weaponsEl.innerHTML = `<p class="wd-fine">No weapons in the data file yet.</p>`;
            return;
        }
        const rows = doc.weapons.map(function (w) {
            const cell = s ? fmtElevation(w, elevationFor(w, s.distance)) : `<span class="wdf-nodata">-</span>`;
            const badge = w.verified ? "" : ` <span class="badge wd-badge--muted" title="Numbers not yet confirmed from game files">Unverified</span>`;
            return `<tr><td>${escapeHtml(w.name || w.id)}${badge}</td><td>${cell}</td></tr>`;
        }).join("");
        weaponsEl.innerHTML = `<table class="data-table wdf-table"><thead><tr><th>Weapon</th><th>Elevation</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function renderHistory() {
        if (!history.length) {
            histEl.innerHTML = `<p class="result-empty">No targets logged yet. Press Enter in the target box.</p>`;
            return;
        }
        histEl.innerHTML = `<ol class="wdf-hist">${history.map(function (e, i) {
            return `<li><button type="button" class="wdf-hist__go" data-hist="${i}" title="Load this target">
                <strong>${escapeHtml(e.ref)}</strong>
                <span>${escapeHtml(String(e.d))} m · ${escapeHtml(String(e.b))}° · ${escapeHtml(String(e.m))} mil</span>
            </button></li>`;
        }).join("")}</ol>
        <button type="button" class="btn btn-ghost btn-sm wdf-hist__clear" id="wdfHistClear">${icon("xmark")} Clear</button>`;
    }

    function logTarget() {
        const s = solution();
        if (!s) return;
        const entry = {
            ref: state.tgt.ref,
            x: state.tgt.x, y: state.tgt.y, p: state.tgt.precision,
            d: Math.round(s.distance),
            b: s.bearingDeg.toFixed(1),
            m: Math.round(s.bearingMil) % Math.round(doc.milsPerCircle)
        };
        const last = history[0];
        if (last && last.ref === entry.ref && last.d === entry.d) return;
        history.unshift(entry);
        history = history.slice(0, HIST_MAX);
        savePref(PREF_HIST, JSON.stringify(history));
        renderHistory();
    }

    function update() {
        renderOut();
        draw();
    }

    function adjustBy(add, right) {
        if (!state.gun || !state.tgt) return;
        const p = adjust(state.gun, state.tgt, add, right);
        const prev = state.adj;
        state.tgt = { x: p.x, y: p.y, ref: formatRef(p.x, p.y, spec, 2), precision: state.tgt.precision };
        state.adj = { add: prev.add + add, right: prev.right + right };
        tgtIn.value = state.tgt.ref;
        tgtMsg.textContent = "";
        update();
    }

    /* ---------- map canvas ---------- */
    const ctx = canvas ? canvas.getContext("2d") : null;
    let dpr = 1;

    function sizeCanvas() {
        if (!canvas) return;
        const w = canvas.clientWidth;
        if (!w) return;
        dpr = Math.min(3, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(w * dpr);
        draw();
    }

    function themeColor(name, fallback) {
        const v = getComputedStyle(document.body).getPropertyValue(name).trim();
        return v || fallback;
    }

    function draw() {
        if (!ctx || !spec) return;
        const W = canvas.width;
        const H = canvas.height;
        if (!W || !H) return;
        const k = W / spec.size;
        const accent = themeColor("--gold-glow", "#FB923C");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (img && imgOk) {
            ctx.drawImage(img, 0, 0, W, H);
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.fillStyle = "#16120f";
            ctx.fillRect(0, 0, W, H);
        }

        const cw = spec.cellW * k;
        const ch = spec.cellH * k;
        if (spec.keypad && cw > 54 * dpr) {
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let c = 0; c < spec.cols; c++) {
                for (let t = 1; t < 3; t++) {
                    const x = Math.round((c + t / 3) * cw) + 0.5;
                    ctx.moveTo(x, 0); ctx.lineTo(x, H);
                }
            }
            for (let r = 0; r < spec.rows; r++) {
                for (let t = 1; t < 3; t++) {
                    const y = Math.round((r + t / 3) * ch) + 0.5;
                    ctx.moveTo(0, y); ctx.lineTo(W, y);
                }
            }
            ctx.stroke();
        }
        ctx.strokeStyle = "rgba(251,146,60,0.38)";
        ctx.lineWidth = Math.max(1, dpr);
        ctx.beginPath();
        for (let c = 0; c <= spec.cols; c++) {
            const x = Math.round(c * cw) + 0.5;
            ctx.moveTo(x, 0); ctx.lineTo(x, H);
        }
        for (let r = 0; r <= spec.rows; r++) {
            const y = Math.round(r * ch) + 0.5;
            ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        ctx.stroke();

        const labelEvery = Math.max(1, Math.ceil((16 * dpr) / Math.min(cw, ch)));
        ctx.font = `600 ${Math.round(11 * dpr)}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let c = 0; c < spec.cols; c += labelEvery) ctx.fillText(colLetters(c), (c + 0.5) * cw, 3 * dpr);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (let r = 0; r < spec.rows; r += labelEvery) ctx.fillText(String(r + 1), 3 * dpr, (r + 0.5) * ch);

        const g = state.gun;
        const t = state.tgt;
        if (g && t) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2 * dpr;
            ctx.setLineDash([6 * dpr, 5 * dpr]);
            ctx.beginPath();
            ctx.moveTo(g.x * k, g.y * k);
            ctx.lineTo(t.x * k, t.y * k);
            ctx.stroke();
            ctx.setLineDash([]);
            const s = solution();
            const label = `${Math.round(s.distance)} m · ${s.bearingDeg.toFixed(1)}°`;
            ctx.font = `700 ${Math.round(12 * dpr)}px system-ui, sans-serif`;
            const tw = ctx.measureText(label).width + 10 * dpr;
            const mx = Math.min(W - tw / 2, Math.max(tw / 2, (g.x + t.x) / 2 * k));
            const my = Math.min(H - 12 * dpr, Math.max(12 * dpr, (g.y + t.y) / 2 * k));
            ctx.fillStyle = "rgba(12,10,9,0.85)";
            ctx.fillRect(mx - tw / 2, my - 10 * dpr, tw, 20 * dpr);
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, mx, my);
        }
        if (g) {
            ctx.fillStyle = accent;
            ctx.strokeStyle = "#0c0a09";
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            ctx.arc(g.x * k, g.y * k, 7 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            markerLabel("GUN", g.x * k, g.y * k, accent);
        }
        if (t) {
            const x = t.x * k;
            const y = t.y * k;
            const r = 9 * dpr;
            ctx.strokeStyle = "#f87171";
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x - r * 0.4, y);
            ctx.moveTo(x + r * 0.4, y); ctx.lineTo(x + r * 1.6, y);
            ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y - r * 0.4);
            ctx.moveTo(x, y + r * 0.4); ctx.lineTo(x, y + r * 1.6);
            ctx.stroke();
            markerLabel("TGT", x, y, "#f87171");
        }
    }

    function markerLabel(text, x, y, color) {
        ctx.font = `700 ${Math.round(10 * dpr)}px system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(12,10,9,0.8)";
        const tw = ctx.measureText(text).width + 8 * dpr;
        const lx = Math.min(canvas.width - tw, x + 12 * dpr);
        ctx.fillRect(lx, y - 8 * dpr, tw, 16 * dpr);
        ctx.fillStyle = color;
        ctx.fillText(text, lx + 4 * dpr, y);
    }

    function eventToMeters(e) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return null;
        const x = ((e.clientX - rect.left) / rect.width) * spec.size;
        const y = ((e.clientY - rect.top) / rect.height) * spec.size;
        return { x: Math.max(0, Math.min(spec.size, x)), y: Math.max(0, Math.min(spec.size, y)) };
    }

    function syncPlaceChips() {
        root.querySelectorAll("[data-place]").forEach(function (b) {
            const on = b.getAttribute("data-place") === state.place;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    const HOVER_IDLE = hoverEl ? hoverEl.textContent : "";

    if (canvas) {
        canvas.addEventListener("click", function (e) {
            const p = eventToMeters(e);
            if (!p) return;
            const which = e.shiftKey ? "gun" : state.place;
            setPoint(which, p.x, p.y);
            if (which === "gun") {
                state.place = "tgt";
                syncPlaceChips();
            } else {
                update();
                logTarget();
                return;
            }
            update();
        });
        canvas.addEventListener("pointermove", function (e) {
            if (e.pointerType === "touch") return;
            const p = eventToMeters(e);
            if (!p) return;
            let txt = `${formatRef(p.x, p.y, spec, 2)} · ${Math.round(p.x)} / ${Math.round(spec.yUp ? spec.size - p.y : p.y)} m`;
            if (state.gun) {
                const s = solve(state.gun, p, doc.milsPerCircle);
                txt += ` · ${Math.round(s.distance)} m at ${s.bearingDeg.toFixed(0)}° from gun`;
            }
            hoverEl.textContent = txt;
        });
        canvas.addEventListener("pointerleave", function () { hoverEl.textContent = HOVER_IDLE; });

        root.querySelectorAll("[data-place]").forEach(function (b) {
            b.addEventListener("click", function () {
                state.place = b.getAttribute("data-place");
                syncPlaceChips();
            });
        });

        mapSel.innerHTML = doc.maps.map(function (m, i) {
            return `<option value="${i}">${escapeHtml(m.name || m.id)}${m.verified ? "" : " (unverified)"}</option>`;
        }).join("");
        mapSel.value = String(mapIdx);
        mapSel.addEventListener("change", function () {
            mapIdx = Number(mapSel.value) || 0;
            savePref(PREF_MAP, currentMap().id);
            loadImage();
            respec();
        });

        function onGridInput() {
            const size = Number(sizeIn.value);
            const n = Math.round(Number(squaresIn.value));
            if (!(size >= 100 && size <= 50000) || !(n >= 1 && n <= 26)) return;
            overrides[currentMap().id] = { sizeMeters: size, gridCols: n, gridRows: n };
            savePref(PREF_GRID, JSON.stringify(overrides));
            respec();
        }
        sizeIn.addEventListener("change", onGridInput);
        squaresIn.addEventListener("change", onGridInput);
        root.querySelector("#wdfGridReset").addEventListener("click", function () {
            delete overrides[currentMap().id];
            savePref(PREF_GRID, JSON.stringify(overrides));
            respec();
        });

        if ("ResizeObserver" in window) {
            const ro = new ResizeObserver(function () {
                if (!canvas.isConnected) { ro.disconnect(); return; }
                sizeCanvas();
            });
            ro.observe(canvas);
        } else {
            const onResize = function () {
                if (!canvas.isConnected) { window.removeEventListener("resize", onResize); return; }
                sizeCanvas();
            };
            window.addEventListener("resize", onResize);
        }
    }

    function respec() {
        applySpec();
        if (gunIn.value) readInput("gun");
        if (tgtIn.value) readInput("tgt");
        update();
    }

    /* ---------- calculator wiring ---------- */
    gunIn.addEventListener("input", function () { readInput("gun"); update(); });
    tgtIn.addEventListener("input", function () { readInput("tgt"); update(); });
    gunIn.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); tgtIn.focus(); tgtIn.select(); }
    });
    tgtIn.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); logTarget(); tgtIn.select(); }
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const step = e.shiftKey ? 100 : 50;
            adjustBy(e.key === "ArrowUp" ? step : -step, 0);
        }
    });
    root.querySelectorAll(".wdf-adj").forEach(function (b) {
        b.addEventListener("click", function () {
            adjustBy(Number(b.getAttribute("data-add")), Number(b.getAttribute("data-right")));
        });
    });
    root.querySelector("#wdfSwap").addEventListener("click", function () {
        const gv = gunIn.value;
        const g = state.gun;
        gunIn.value = tgtIn.value;
        tgtIn.value = gv;
        state.gun = state.tgt;
        state.tgt = g;
        state.adj = { add: 0, right: 0 };
        gunMsg.textContent = "";
        tgtMsg.textContent = "";
        saveGun();
        update();
    });
    histEl.addEventListener("click", function (e) {
        if (e.target.closest("#wdfHistClear")) {
            history = [];
            savePref(PREF_HIST, "[]");
            renderHistory();
            return;
        }
        const btn = e.target.closest("[data-hist]");
        if (!btn) return;
        const h = history[Number(btn.getAttribute("data-hist"))];
        if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) return;
        state.tgt = { x: h.x, y: h.y, ref: String(h.ref), precision: Number(h.p) || 0 };
        state.adj = { add: 0, right: 0 };
        tgtIn.value = String(h.ref);
        tgtMsg.textContent = "";
        update();
    });

    /* ---------- boot ---------- */
    loadImage();
    applySpec();
    const saved = readJSON(PREF_GUN, null);
    if (saved && typeof saved.text === "string" && saved.text) {
        gunIn.value = saved.text;
        if (saved.sig === specSig(spec) && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
            state.gun = { x: saved.x, y: saved.y, ref: String(saved.ref || saved.text), precision: Number(saved.p) || 0 };
        } else {
            readInput("gun");
        }
    }
    if (state.gun) state.place = "tgt";
    syncPlaceChips();
    renderHistory();
    renderOut();
    sizeCanvas();

    if (focus && !window.matchMedia("(pointer: coarse)").matches) {
        (state.gun ? tgtIn : gunIn).focus();
    }
}
