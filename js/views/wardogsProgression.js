/* Wardogs - Progression: XP to the next unlock or target level */
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, exitFocusLink, enterFocusLink, focusBarHTML, enterFocusBtn, bindFocusBar,
    loadPref, savePref, focusDocumentTitle
} from "../tool-mode.js";

const PREF = "aho.wd.prog.inputs";
const TOOL = "Progression";
const LEVEL_MAX = 100;
const XP_MAX = 99999999;

const DEFAULTS = { track: "driver", level: 1, into: 0, target: 0, mode: "hour", rate: { hour: 0, match: 0 } };

function seasonLabel(era) {
    const m = /^s(\d+)$/.exec(era || "");
    return m ? "Season " + m[1] : era;
}

function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
}

function fmtShort(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e5) return Math.round(n / 1e3) + "k";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(Math.round(n));
}

function digits(v) {
    const s = String(v == null ? "" : v).replace(/[^\d]/g, "");
    return s ? Number(s) : null;
}

function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}

function tag(text, title) {
    return `<span class="badge wd-badge--muted wp-tag"${title ? ` title="${escapeHtml(title)}"` : ""}>${escapeHtml(text)}</span>`;
}

function readState() {
    let s = {};
    try { s = JSON.parse(loadPref(PREF, "{}")) || {}; } catch (e) { s = {}; }
    const rate = Object.assign({}, DEFAULTS.rate, s.rate && typeof s.rate === "object" ? s.rate : {});
    return {
        track: typeof s.track === "string" ? s.track : DEFAULTS.track,
        level: clamp(Number(s.level) || 1, 1, LEVEL_MAX),
        into: Math.max(0, Number(s.into) || 0),
        target: clamp(Number(s.target) || 0, 0, LEVEL_MAX),
        mode: s.mode === "match" ? "match" : "hour",
        rate: { hour: Math.max(0, Number(rate.hour) || 0), match: Math.max(0, Number(rate.match) || 0) }
    };
}

/* ---------- curve ---------- */

function makeCurve(doc) {
    const raw = (doc.curve && Array.isArray(doc.curve.anchors) ? doc.curve.anchors : [])
        .filter(function (a) { return Number(a.level) > 1 && Number(a.xp) > 0; })
        .map(function (a) { return { level: Number(a.level), xp: Number(a.xp), verified: !!a.verified }; })
        .sort(function (a, b) { return a.level - b.level; });
    const pts = [{ level: 1, xp: 0, verified: false }].concat(raw);
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2] || { level: 0, xp: 0 };
    const tailRate = last.level > prev.level ? (last.xp - prev.xp) / (last.level - prev.level) : 0;

    function at(level, trustCurve) {
        const L = clamp(Math.round(level), 1, LEVEL_MAX);
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.level === L) return { xp: p.xp, exact: trustCurve && p.verified, kind: p.verified ? "official" : "start" };
            const n = pts[i + 1];
            if (n && L > p.level && L < n.level) {
                return { xp: p.xp + (n.xp - p.xp) * (L - p.level) / (n.level - p.level), exact: false, kind: "between" };
            }
        }
        return { xp: last.xp + tailRate * (L - last.level), exact: false, kind: "beyond" };
    }

    return { at: at, anchors: raw, top: last.level };
}

/* ---------- markup ---------- */

function stepper(id, label, hint) {
    return `<div class="wp-field">
        <label class="field-label" for="${id}">${escapeHtml(label)}</label>
        <div class="wp-step">
            <button type="button" class="wp-step__btn" data-step="${id}" data-delta="-1" aria-label="${escapeHtml(label)}: down one">−</button>
            <input class="field wp-num" id="${id}" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="next" maxlength="3"${hint ? ` aria-describedby="${id}Hint"` : ""}>
            <button type="button" class="wp-step__btn" data-step="${id}" data-delta="1" aria-label="${escapeHtml(label)}: up one">+</button>
        </div>
        ${hint ? `<p class="wp-hint" id="${id}Hint">${hint}</p>` : ""}
    </div>`;
}

function calcPanel(route, focus) {
    const head = focus ? "" : `<div class="calc-panel-head">
            <h3>${icon("rocket")} Next unlock</h3>
            ${enterFocusBtn(route, "1", "Open the progression calculator in focus mode")}
        </div>`;
    return `<section class="tool-panel glass wp-calc" aria-label="Progression calculator">
        ${head}
        <div class="wp-tracks calc-tabs" role="group" aria-label="Track" id="wpTracks"></div>
        <p class="wp-tracknote" id="wpTrackNote"></p>
        <div class="wp-grid">
            ${stepper("wpLevel", "Your level", "")}
            <div class="wp-field">
                <label class="field-label" for="wpInto">XP into level</label>
                <input class="field wp-num" id="wpInto" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="next" placeholder="0" maxlength="10" aria-describedby="wpIntoHint">
                <p class="wp-hint" id="wpIntoHint"></p>
            </div>
        </div>
        <div class="wp-grid wp-grid--target">
            ${stepper("wpTarget", "Target level", "")}
            <div class="wp-field">
                <label class="field-label" for="wpUnlock">Or pick an unlock</label>
                <select class="field wp-select" id="wpUnlock"></select>
            </div>
        </div>
        <div class="wp-pace">
            <span class="field-label" id="wpPaceLabel">Your pace</span>
            <div class="calc-tabs wp-modes" role="group" aria-labelledby="wpPaceLabel">
                <button type="button" class="calc-tab" data-mode="hour">XP / hour</button>
                <button type="button" class="calc-tab" data-mode="match">XP / match</button>
            </div>
            <label class="sr-only" for="wpRate" id="wpRateLabel">XP per hour</label>
            <input class="field wp-num wp-rate" id="wpRate" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" maxlength="9" aria-describedby="wpRateHint">
            <div class="wp-presets" id="wpPresets" role="group" aria-label="Pace presets"></div>
            <p class="wp-hint" id="wpRateHint"></p>
        </div>
        <div class="wp-out" id="wpOut" aria-live="polite" aria-atomic="true"></div>
        <div class="wp-trackbar" id="wpBar" aria-hidden="true"></div>
        <ol class="wp-way" id="wpWay" aria-label="Unlocks on the way"></ol>
    </section>`;
}

function infoPanel() {
    return `<section class="tool-panel glass wp-info">
        <div class="calc-panel-head"><h3>${icon("circle-info")} Where the numbers come from</h3></div>
        <div id="wpInfo"><div class="loading"><div class="spinner"></div></div></div>
    </section>`;
}

export const progression = {
    render: function (route) {
        if (isCalcFocus(route)) {
            return `<div class="wrap calc-focus-wrap wp-root">
                ${focusBarHTML(TOOL, exitFocusLink(route), enterFocusLink(route, "1"))}
                ${calcPanel(route, true)}
            </div>`;
        }
        return `<div class="wrap wrap-wide wp-root">
            <header class="section-head">
                <p class="eyebrow">Wardogs · ${escapeHtml(seasonLabel(route.era))}</p>
                <h1 class="gold-text">Progression</h1>
                <p class="lead">How far to your next unlock? Pick a track, enter your level and see the XP left and roughly how long it takes.</p>
            </header>
            <p class="notice wp-honest">${icon("circle-info")} <span>BULKHEAD published XP for every fifth level from 6 to 50. Levels in between are filled in on a straight line and marked <strong>Estimate</strong>. Anything not confirmed by an official post is marked <strong>Unconfirmed</strong>.</span></p>
            <div class="wp-layout">
                ${calcPanel(route, false)}
                ${infoPanel()}
            </div>
        </div>`;
    },
    mount: function (root, route) {
        const focus = isCalcFocus(route);
        if (focus) {
            bindFocusBar(root);
            document.title = focusDocumentTitle(TOOL);
        }
        fetch(`/data/wardogs/${encodeURIComponent(route.era)}/progression.json`).then(function (r) {
            if (!r.ok) throw new Error(`Failed to load Wardogs progression.json (${r.status})`);
            return r.json();
        }).then(function (doc) {
            if (root.querySelector(".wp-root")) start(root, doc, focus);
        }).catch(function (err) {
            console.warn(err);
            const host = root.querySelector(".wp-calc");
            if (host) host.innerHTML = `<div class="notice wd-error">${icon("triangle-exclamation")} ${escapeHtml(err.message || String(err))}</div>`;
        });
    }
};

/* ---------- info panel ---------- */

function sourceById(doc, id) {
    return (doc.sources || []).find(function (s) { return s.id === id; }) || null;
}

function sourceLink(doc, id) {
    const s = sourceById(doc, id);
    if (!s) return "";
    return `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a> <span class="wp-date">(${escapeHtml(s.date)})</span>`;
}

function renderInfo(host, doc, curve) {
    if (!host) return;
    const rows = curve.anchors.map(function (a, i) {
        const prev = i ? curve.anchors[i - 1] : null;
        const per = prev ? (a.xp - prev.xp) / (a.level - prev.level) : null;
        return `<tr><td>${a.level}</td><td>${fmt(a.xp)}${a.verified ? "" : " " + tag("Unconfirmed")}</td><td>${per ? "~" + fmt(per) : "-"}</td></tr>`;
    }).join("");
    const events = (doc.xpEvents || []).map(function (e) {
        return `<li><span>${escapeHtml(e.label)}</span><strong>${fmt(e.xp)} XP</strong>${e.verified ? "" : " " + tag("Unconfirmed")}</li>`;
    }).join("");
    const pace = doc.pace;
    const sources = (doc.sources || []).map(function (s) {
        return `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a><span class="wp-date">${escapeHtml(s.publisher || "")} · ${escapeHtml(s.date)}</span></li>`;
    }).join("");
    host.innerHTML = `<h4 class="wp-subhead">Role track XP <span class="badge wp-ok">Official</span></h4>
        <div class="wp-tablewrap"><table class="data-table wp-table">
            <thead><tr><th scope="col">Level</th><th scope="col">Total XP</th><th scope="col">XP / level</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="wd-fine wp-fine">Levels 1 to 5 were left unchanged and never published. "XP / level" is the average across each band, worked out here. ${doc.curve && doc.curve.cumulativeVerified ? "" : tag("Unconfirmed", "The changelog lists one XP figure per level. Reading it as total XP from level 1 is our interpretation.") + " Totals are read as XP from level 1, which the post implies but does not spell out."}</p>
        ${pace ? `<h4 class="wp-subhead">Pace target <span class="badge wp-ok">Official</span></h4>
        <p class="wp-para">BULKHEAD aims for the median player to reach about level ${escapeHtml(String(pace.level))} after ${escapeHtml(String(pace.hoursMin))} to ${escapeHtml(String(pace.hoursMax))} hours. The per-hour presets come from that, so treat them as a rough guide. The post doesn't say which track it means.</p>` : ""}
        ${events ? `<h4 class="wp-subhead">XP events with published values</h4><ul class="wp-events">${events}</ul>
        <p class="wd-fine wp-fine">These are the only per-action XP values published so far. XP farming servers and exploits lead to resets and bans (${sourceLink(doc, "patch-012")}).</p>` : ""}
        <h4 class="wp-subhead">Sources</h4>
        <ul class="wp-sources">${sources}</ul>`;
}

/* ---------- calculator ---------- */

function start(root, doc, focus) {
    const curve = makeCurve(doc);
    const tracks = Array.isArray(doc.tracks) && doc.tracks.length ? doc.tracks : [{ id: "role", label: "Role", curveVerified: true }];
    const unlocks = (Array.isArray(doc.unlocks) ? doc.unlocks : []).slice().sort(function (a, b) { return a.level - b.level; });
    const pace = doc.pace && doc.pace.level && doc.pace.hoursMin && doc.pace.hoursMax ? doc.pace : null;

    const state = readState();
    if (!tracks.some(function (t) { return t.id === state.track; })) state.track = tracks[0].id;

    const el = {
        tracks: root.querySelector("#wpTracks"),
        trackNote: root.querySelector("#wpTrackNote"),
        level: root.querySelector("#wpLevel"),
        into: root.querySelector("#wpInto"),
        intoHint: root.querySelector("#wpIntoHint"),
        target: root.querySelector("#wpTarget"),
        unlock: root.querySelector("#wpUnlock"),
        rate: root.querySelector("#wpRate"),
        rateLabel: root.querySelector("#wpRateLabel"),
        rateHint: root.querySelector("#wpRateHint"),
        presets: root.querySelector("#wpPresets"),
        out: root.querySelector("#wpOut"),
        bar: root.querySelector("#wpBar"),
        way: root.querySelector("#wpWay")
    };

    function track() { return tracks.find(function (t) { return t.id === state.track; }); }
    function trackUnlocks() { return unlocks.filter(function (u) { return u.track === state.track; }); }
    function trusted() { return track().curveVerified !== false; }
    function xpAt(level) { return curve.at(level, trusted()); }

    function presets() {
        if (state.mode !== "hour" || !pace) return [];
        const total = curve.at(pace.level, true).xp;
        return [
            { v: Math.round(total / pace.hoursMax / 100) * 100, t: "Median, steady" },
            { v: Math.round(total / pace.hoursMin / 100) * 100, t: "Median, quick" }
        ];
    }

    function defaultTarget() {
        const next = trackUnlocks().find(function (u) { return u.level > state.level; });
        return next ? next.level : Math.min(LEVEL_MAX, state.level + 1);
    }

    function save() {
        savePref(PREF, JSON.stringify(state));
    }

    function levelSpan(level) {
        return Math.max(0, xpAt(level + 1).xp - xpAt(level).xp);
    }

    function drawTracks() {
        el.tracks.innerHTML = tracks.map(function (t) {
            const on = t.id === state.track;
            return `<button type="button" class="calc-tab${on ? " active" : ""}" data-track="${escapeHtml(t.id)}" aria-pressed="${on}">${escapeHtml(t.label)}</button>`;
        }).join("");
        const t = track();
        el.trackNote.innerHTML = t.curveVerified === false
            ? `${tag("Unconfirmed")} ${escapeHtml(t.note || "No XP figures published for this track.")}`
            : "";
        el.trackNote.hidden = t.curveVerified !== false;
    }

    function drawUnlockSelect() {
        const list = trackUnlocks();
        const opts = [`<option value="">${list.length ? "Choose an unlock…" : "No published unlocks on this track"}</option>`].concat(list.map(function (u) {
            const done = u.level <= state.level;
            return `<option value="${escapeHtml(u.id)}"${done ? " disabled" : ""}>Lv ${u.level} · ${escapeHtml(u.label)}${done ? " (unlocked)" : ""}${u.verified ? "" : " (unconfirmed)"}</option>`;
        }));
        el.unlock.innerHTML = opts.join("");
        el.unlock.disabled = !list.length;
        const match = list.find(function (u) { return u.level === state.target && u.level > state.level; });
        el.unlock.value = match ? match.id : "";
    }

    function drawPace() {
        root.querySelectorAll("[data-mode]").forEach(function (b) {
            const on = b.getAttribute("data-mode") === state.mode;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        const v = state.rate[state.mode];
        el.rate.value = v ? fmt(v) : "";
        el.rate.placeholder = state.mode === "hour" ? "e.g. 10,000" : "From your end-of-match screen";
        el.rateLabel.textContent = state.mode === "hour" ? "XP per hour" : "XP per match";
        const ps = presets();
        el.presets.innerHTML = ps.map(function (p) {
            const on = p.v === v;
            return `<button type="button" class="chip wp-chip${on ? " active" : ""}" data-preset="${p.v}" aria-pressed="${on}">${escapeHtml(p.t)} · ${fmtShort(p.v)}/h</button>`;
        }).join("");
        el.presets.hidden = !ps.length;
        el.rateHint.innerHTML = state.mode === "hour"
            ? (pace ? `Presets come from BULKHEAD's median-player target. ${tag("Estimate")}` : "Enter your own XP per hour.")
            : "No official match length or XP per match has been published. Use your own number.";
    }

    function drawInputs() {
        el.level.value = String(state.level);
        el.into.value = state.into ? fmt(state.into) : "";
        el.target.value = String(state.target);
    }

    function timeText(xp) {
        const r = state.rate[state.mode];
        if (!r || xp <= 0) return null;
        if (state.mode === "match") {
            const n = Math.ceil(xp / r);
            return { v: fmt(n), u: n === 1 ? "match" : "matches", short: `${fmt(n)} ${n === 1 ? "match" : "matches"}` };
        }
        const h = xp / r;
        if (h < 1) {
            const m = Math.max(1, Math.round(h * 60));
            return { v: String(m), u: "min", short: `${m} min` };
        }
        const v = h < 10 ? h.toFixed(1).replace(/\.0$/, "") : fmt(h);
        return { v: v, u: "hours", short: `${v} h` };
    }

    function render() {
        const t = track();
        const span = levelSpan(state.level);
        if (span > 0 && state.into >= span) {
            state.into = span - 1;
            if (document.activeElement !== el.into) el.into.value = fmt(state.into);
        }
        const startXp = xpAt(state.level).xp + state.into;
        const cur = xpAt(state.level);
        const intoNote = cur.kind === "official" || cur.kind === "start" ? "" : ` ${tag("Estimate")}`;
        el.intoHint.innerHTML = span > 0 ? `Level ${state.level} → ${state.level + 1} is about ${fmt(span)} XP.${intoNote}` : "";

        if (state.target <= state.level) {
            el.out.innerHTML = `<p class="result-empty wp-empty">Set a target above level ${state.level}.</p>`;
            el.bar.innerHTML = "";
            el.way.innerHTML = "";
            if (focus) document.title = focusDocumentTitle(TOOL);
            return;
        }

        const goal = xpAt(state.target);
        const left = Math.max(0, goal.xp - startXp);
        const pct = goal.xp > 0 ? clamp(Math.round((startXp / goal.xp) * 100), 0, 100) : 0;
        const time = timeText(left);
        const exact = goal.exact && (state.level === 1 || cur.exact);
        const goalUnlock = trackUnlocks().filter(function (u) { return u.level === state.target; });
        const goalName = goalUnlock.length ? goalUnlock.map(function (u) { return u.label; }).join(", ") : `level ${state.target}`;
        const flags = [];
        if (t.curveVerified === false) flags.push(tag("Unconfirmed", "No XP figures published for this track"));
        else if (!exact) flags.push(tag("Estimate", "At least one end falls between published levels"));
        if (goal.kind === "beyond") flags.push(tag("Past level " + curve.top, "Extended at the rate of the last published band"));

        el.out.innerHTML = `<div class="wp-big"><span class="wp-big__k">XP to go</span><span class="wp-big__v">${escapeHtml(fmtShort(left))}</span><span class="wp-big__s">${fmt(left)}</span></div>
            <div class="wp-big"><span class="wp-big__k">${state.mode === "match" ? "Matches" : "Time"}</span>${time
                ? `<span class="wp-big__v">${escapeHtml(time.v)}<small>${escapeHtml(time.u)}</small></span><span class="wp-big__s">at ${fmt(state.rate[state.mode])} XP/${state.mode === "match" ? "match" : "h"}</span>`
                : `<span class="wp-big__v wp-big__v--dim">-</span><span class="wp-big__s">Add your pace</span>`}</div>
            <p class="wp-ctx">${escapeHtml(t.label)} ${state.level} → ${escapeHtml(goalName)}${goalUnlock.length ? ` (Lv ${state.target})` : ""} · ${pct}% of the way ${flags.join(" ")}</p>`;

        drawBar(startXp, goal.xp);
        drawWay(startXp);
        if (focus) document.title = focusDocumentTitle(`${fmtShort(left)} XP to ${goalName}`);
    }

    function drawBar(startXp, goalXp) {
        const list = trackUnlocks();
        const top = Math.max(curve.top, state.target, list.length ? list[list.length - 1].level : 0);
        const maxXp = xpAt(top).xp || 1;
        const pos = function (xp) { return clamp((xp / maxXp) * 100, 0, 100).toFixed(2) + "%"; };
        const ticks = list.map(function (u) {
            const done = u.level <= state.level;
            return `<span class="wp-bar__tick${done ? " is-done" : ""}" style="left:${pos(xpAt(u.level).xp)}"></span>`;
        }).join("");
        el.bar.innerHTML = `<div class="wp-bar">
                <span class="wp-bar__goal" style="width:${pos(goalXp)}"></span>
                <span class="wp-bar__fill" style="width:${pos(startXp)}"></span>
                ${ticks}
                <span class="wp-bar__target" style="left:${pos(goalXp)}"></span>
            </div>
            <div class="wp-bar__scale"><span>Lv 1</span><span>Lv ${top}</span></div>`;
    }

    function drawWay(startXp) {
        const inRange = trackUnlocks().filter(function (u) { return u.level > state.level && u.level <= state.target; });
        const rows = inRange.map(function (u) { return { level: u.level, label: u.label, unlock: u }; });
        if (!rows.some(function (r) { return r.level === state.target; })) rows.push({ level: state.target, label: "Target level", unlock: null });
        el.way.innerHTML = rows.map(function (r) {
            const at = xpAt(r.level);
            const need = Math.max(0, at.xp - startXp);
            const time = timeText(need);
            const isGoal = r.level === state.target;
            const bits = [];
            if (r.unlock && r.unlock.cost) bits.push(`$${fmt(r.unlock.cost)} listed`);
            if (r.unlock && !r.unlock.verified) bits.push(tag("Unconfirmed"));
            return `<li class="wp-way__row${isGoal ? " is-goal" : ""}">
                <span class="wp-way__lv">Lv ${r.level}</span>
                <span class="wp-way__name">${escapeHtml(r.label)}${bits.length ? ` <span class="wp-way__meta">${bits.join(" ")}</span>` : ""}</span>
                <span class="wp-way__xp">${fmtShort(need)} XP${time ? `<small>${escapeHtml(time.short)}</small>` : ""}</span>
            </li>`;
        }).join("");
    }

    function refresh(opts) {
        if (opts && opts.tracks) drawTracks();
        if (opts && opts.unlocks) drawUnlockSelect();
        if (opts && opts.pace) drawPace();
        render();
        save();
    }

    function setLevel(v) {
        state.level = clamp(v, 1, LEVEL_MAX);
        if (state.target <= state.level) state.target = defaultTarget();
        el.target.value = String(state.target);
        refresh({ unlocks: true });
    }

    function setTarget(v) {
        state.target = clamp(v, 1, LEVEL_MAX);
        refresh({ unlocks: true });
    }

    el.tracks.addEventListener("click", function (e) {
        const b = e.target.closest("[data-track]");
        if (!b || b.getAttribute("data-track") === state.track) return;
        state.track = b.getAttribute("data-track");
        state.target = defaultTarget();
        el.target.value = String(state.target);
        refresh({ tracks: true, unlocks: true });
    });

    el.level.addEventListener("input", function () {
        const v = digits(el.level.value);
        if (v == null) return;
        if (el.level.value !== String(clamp(v, 1, LEVEL_MAX))) el.level.value = String(clamp(v, 1, LEVEL_MAX));
        setLevel(v);
    });
    el.level.addEventListener("blur", function () { el.level.value = String(state.level); });

    el.target.addEventListener("input", function () {
        const v = digits(el.target.value);
        if (v == null) return;
        if (el.target.value !== String(clamp(v, 1, LEVEL_MAX))) el.target.value = String(clamp(v, 1, LEVEL_MAX));
        setTarget(v);
    });
    el.target.addEventListener("blur", function () { el.target.value = String(state.target); });

    el.into.addEventListener("input", function () {
        state.into = Math.min(XP_MAX, digits(el.into.value) || 0);
        refresh();
    });
    el.into.addEventListener("blur", function () { el.into.value = state.into ? fmt(state.into) : ""; });

    root.querySelectorAll("[data-step]").forEach(function (b) {
        b.addEventListener("click", function () {
            const d = Number(b.getAttribute("data-delta"));
            if (b.getAttribute("data-step") === "wpLevel") {
                setLevel(state.level + d);
                el.level.value = String(state.level);
                el.into.value = state.into ? fmt(state.into) : "";
            } else {
                setTarget(Math.max(state.level + 1, state.target + d));
                el.target.value = String(state.target);
            }
        });
    });

    el.unlock.addEventListener("change", function () {
        const u = unlocks.find(function (x) { return x.id === el.unlock.value; });
        if (!u) return;
        state.target = u.level;
        el.target.value = String(state.target);
        refresh();
    });

    root.querySelectorAll("[data-mode]").forEach(function (b) {
        b.addEventListener("click", function () {
            state.mode = b.getAttribute("data-mode");
            refresh({ pace: true });
        });
    });

    el.rate.addEventListener("input", function () {
        state.rate[state.mode] = Math.min(XP_MAX, digits(el.rate.value) || 0);
        el.presets.querySelectorAll("[data-preset]").forEach(function (c) {
            const on = Number(c.getAttribute("data-preset")) === state.rate[state.mode];
            c.classList.toggle("active", on);
            c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        refresh();
    });
    el.rate.addEventListener("blur", function () {
        const v = state.rate[state.mode];
        el.rate.value = v ? fmt(v) : "";
    });

    el.presets.addEventListener("click", function (e) {
        const c = e.target.closest("[data-preset]");
        if (!c) return;
        state.rate[state.mode] = Number(c.getAttribute("data-preset")) || 0;
        refresh({ pace: true });
    });

    [el.level, el.into, el.target, el.rate].forEach(function (input) {
        input.addEventListener("focus", function () { input.select(); });
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        });
    });

    if (!state.target || state.target <= state.level) state.target = defaultTarget();
    if (!state.rate.hour && pace) state.rate.hour = presets()[0] ? presets()[0].v : 0;
    drawTracks();
    drawInputs();
    drawUnlockSelect();
    drawPace();
    render();
    renderInfo(root.querySelector("#wpInfo"), doc, curve);
}
