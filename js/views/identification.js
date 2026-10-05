/* Armor - Identification (WWII): interactive silhouette guessing game */
import { getAllWWIITanks } from "../data.js";
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";

const MODES = [
    { key: "easy", t: "Easy", d: "Different tank types, side-on silhouette." },
    { key: "medium", t: "Medium", d: "Similar tank types, sharpen the details." },
    { key: "hard", t: "Hard", d: "Any angle, similar tanks, SPAs included." }
];

const HOME_TANK = { easy: "M5A1 Stuart", medium: "M4 Sherman", hard: "Sherman 76 Jumbo" };

const TIPS = [
    "Read the overall silhouette and proportions first",
    "Check the turret shape and gun barrel length",
    "Count the road wheels and their spacing",
    "Note the hull profile, glacis angle and side skirts",
    "Watch for the commander's cupola and engine deck"
];

let allTanks = [];
let difficulty = "easy";
let current = null;       // { tank, angle, options }
let lastName = null;
let correct = 0;
let streak = 0;
let best = 0;
let answered = false;
let playing = false;

function isSPA(t) {
    const ty = (t.type || "").toLowerCase();
    return ty.includes("spa") || ty.includes("self propelled");
}

function pool() {
    const base = allTanks.filter(function (t) { return t.images360 && t.has360View; });
    return difficulty === "hard" ? base : base.filter(function (t) { return !isSPA(t); });
}

function frameSrc(tank, n) {
    const p = (tank.images360 && tank.images360.prefix) || "";
    const pre = p.charAt(0) === "/" ? p : "/" + p;
    const suffix = (tank.images360 && tank.images360.suffix) || ".webp";
    return pre + n + suffix;
}

function findTank(name) {
    return allTanks.find(function (t) { return t.name === name; }) || null;
}

function homeTank() {
    const name = HOME_TANK[difficulty];
    return findTank(name) || pool()[0] || null;
}

function pickRound() {
    const tanks = pool();
    if (tanks.length < 2) return null;

    let tank, guard = 0;
    do {
        tank = tanks[Math.floor(Math.random() * tanks.length)];
        guard++;
    } while (lastName && tank.name === lastName && guard < 40);
    lastName = tank.name;

    const angle = difficulty === "hard" ? String(1 + Math.floor(Math.random() * 7)) : "2";

    let others = tanks.filter(function (t) { return t.name !== tank.name; });
    if (difficulty === "hard") {
        const sameType = others.filter(function (t) { return t.type === tank.type; });
        if (sameType.length >= 3) others = sameType;
    }
    const options = [tank.name];
    let g = 0;
    while (options.length < 4 && others.length && g < 80) {
        const cand = others[Math.floor(Math.random() * others.length)].name;
        if (options.indexOf(cand) === -1) options.push(cand);
        g++;
    }
    g = 0;
    while (options.length < 4 && g < 80) {
        const cand = tanks[Math.floor(Math.random() * tanks.length)].name;
        if (options.indexOf(cand) === -1) options.push(cand);
        g++;
    }
    options.sort(function () { return Math.random() - 0.5; });

    return { tank: tank, angle: angle, options: options };
}

function scoreBar() {
    return `<div class="id-score">
        <div class="id-stat"><span class="id-stat__num" id="idCorrect">${correct}</span><span class="id-stat__lbl">Correct</span></div>
        <div class="id-stat"><span class="id-stat__num" id="idStreak">${streak}</span><span class="id-stat__lbl">Streak</span></div>
        <div class="id-stat"><span class="id-stat__num" id="idBest">${best}</span><span class="id-stat__lbl">Best</span></div>
    </div>`;
}

function modeBtns() {
    return MODES.map(function (m) {
        return `<button type="button" class="chip ${m.key === difficulty ? "active" : ""}" data-diff="${m.key}" title="${escapeHtml(m.d)}">${escapeHtml(m.t)}</button>`;
    }).join("");
}

function idleStage() {
    const tank = homeTank();
    if (!tank) {
        return `<p class="result-empty">No tanks with 360° images are available for practice.</p>`;
    }
    return `<div class="id-stage id-stage--idle">
        <div class="id-frame">
            <img src="${frameSrc(tank, "2")}" alt="${escapeHtml(tank.name)} preview" draggable="false">
            <span class="id-frame__tag">Preview · ${escapeHtml(MODES.find(function (m) { return m.key === difficulty; }).t)} mode</span>
        </div>
        <div class="id-panel id-panel--idle">
            <p class="id-intro">Study the silhouettes, then start a round. You'll get a blacked-out tank and four names to choose from.</p>
            <button type="button" class="btn btn-primary" id="idStart">${icon("play")} Start practice</button>
        </div>
    </div>`;
}

function quizStage() {
    if (!current) {
        return `<p class="result-empty">Could not start a round - not enough tanks in the pool.</p>`;
    }
    const tank = current.tank;
    const optsHtml = current.options.map(function (name, idx) {
        return `<button type="button" class="id-option" data-idx="${idx}">${escapeHtml(name)}</button>`;
    }).join("");
    return `<div class="id-stage">
        <div class="id-frame">
            <img id="idImg" class="silhouette" src="${frameSrc(tank, current.angle)}" alt="Unidentified tank silhouette" draggable="false">
            <span class="id-frame__tag" id="idTag">Identify this tank</span>
        </div>
        <div class="id-panel">
            <div class="id-options" id="idOptions">${optsHtml}</div>
            <div class="id-result" id="idResult" hidden></div>
        </div>
    </div>`;
}

function renderGame(root) {
    const host = root.querySelector("#idGame");
    if (!host) return;
    host.innerHTML = `
        <div class="id-game__bar">
            <div class="filter-group">${modeBtns()}</div>
            ${scoreBar()}
        </div>
        ${playing ? quizStage() : idleStage()}`;
}

function startRound(root) {
    current = pickRound();
    if (!current) {
        playing = false;
        renderGame(root);
        return;
    }
    playing = true;
    answered = false;
    renderGame(root);
}

function setDifficulty(root, key) {
    if (key === difficulty) return;
    difficulty = key;
    streak = 0;
    playing = false;
    current = null;
    answered = false;
    renderGame(root);
}

function answer(root, idx) {
    if (answered || !current || !playing) return;
    const chosen = current.options[idx];
    if (chosen == null) return;

    answered = true;
    const truth = current.tank.name;
    const isRight = chosen === truth;

    if (isRight) { correct++; streak++; if (streak > best) best = streak; }
    else { streak = 0; }

    const img = root.querySelector("#idImg");
    if (img) img.classList.remove("silhouette");
    const tag = root.querySelector("#idTag");
    if (tag) { tag.textContent = truth; tag.classList.add("revealed"); }

    root.querySelectorAll(".id-option").forEach(function (b) {
        b.disabled = true;
        const i = Number(b.getAttribute("data-idx"));
        const name = current.options[i];
        if (name === truth) b.classList.add("correct");
        else if (name === chosen) b.classList.add("wrong");
    });

    const c = root.querySelector("#idCorrect"); if (c) c.textContent = correct;
    const s = root.querySelector("#idStreak"); if (s) s.textContent = streak;
    const bb = root.querySelector("#idBest"); if (bb) bb.textContent = best;

    const t = current.tank;
    const res = root.querySelector("#idResult");
    if (res) {
        res.hidden = false;
        res.innerHTML = `
            <p class="id-verdict ${isRight ? "ok" : "no"}">${isRight ? "Correct" : "Not quite"} - that's a <strong>${escapeHtml(truth)}</strong>.</p>
            <dl class="id-facts">
                <div><dt>Faction</dt><dd>${escapeHtml(t.faction || "-")}</dd></div>
                <div><dt>Type</dt><dd>${escapeHtml((t.type || "-").replace(/\s*\(.*\)/, ""))}</dd></div>
                <div><dt>Gun</dt><dd>${escapeHtml(t.gun || "-")}</dd></div>
            </dl>
            <button type="button" class="btn btn-primary" id="idNext">Next tank ${icon("arrow-right")}</button>`;
    }
}

function bindGame(root) {
    const host = root.querySelector("#idGame");
    if (!host || host.dataset.bound === "1") return;
    host.dataset.bound = "1";
    host.addEventListener("click", function (e) {
        const diffBtn = e.target.closest("[data-diff]");
        if (diffBtn) {
            setDifficulty(root, diffBtn.getAttribute("data-diff"));
            return;
        }
        if (e.target.closest("#idStart")) {
            startRound(root);
            return;
        }
        const opt = e.target.closest(".id-option");
        if (opt) {
            answer(root, Number(opt.getAttribute("data-idx")));
            return;
        }
        if (e.target.closest("#idNext")) {
            startRound(root);
        }
    });
}

export function render() {
    return `<div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">HLL WWII · Armor</p>
            <h1 class="gold-text">Tank Identification</h1>
            <p class="lead">Spot the tank from its silhouette - the difference between a clean first shot and a brewed-up crew. Pick a difficulty and start identifying.</p>
        </header>

        <div class="glass id-game" id="idGame" style="padding:1.4rem;margin-bottom:2.4rem"></div>

        <div class="glass reveal" style="padding:1.6rem;margin-bottom:2.6rem">
            <h3 style="margin-bottom:1rem"><span style="color:var(--gold-glow)">${icon("lightbulb")}</span> How to read a tank</h3>
            <ul class="matrix-notes" style="font-size:.9rem;gap:.5rem">${TIPS.map(function (t) { return `<li>${escapeHtml(t)}</li>`; }).join("")}</ul>
        </div>

        <p class="eyebrow">Reference</p>
        <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Spot every tank</h2>
        <div class="grid cols-3" id="idReference"></div>
    </div>`;
}

export function mount(root) {
    allTanks = getAllWWIITanks();
    difficulty = "easy";
    correct = 0; streak = 0; best = 0; lastName = null;
    playing = false; current = null; answered = false;

    bindGame(root);
    renderGame(root);
    renderReference(root);
}

function renderReference(root) {
    const host = root.querySelector("#idReference");
    if (!host) return;
    const tanks = allTanks.filter(function (t) { return t.images360 && t.has360View; });
    host.innerHTML = tanks.map(function (t) {
        const note = t.description || "";
        return `<article class="glass card-hover reveal" style="border-radius:var(--r-lg);overflow:hidden">
            <div style="aspect-ratio:4/3;background:radial-gradient(circle at 50% 40%,var(--stone-800),var(--stone-950));display:grid;place-items:center">
                <img src="${frameSrc(t, "2")}" alt="${escapeHtml(t.name)}" loading="lazy" style="max-width:82%;max-height:82%;object-fit:contain" onerror="this.style.opacity=.2">
            </div>
            <div style="padding:1rem 1.1rem">
                <h3 style="font-size:1.05rem">${escapeHtml(t.name)}</h3>
                <span class="tank-card__faction">${escapeHtml(t.faction || "")} · ${escapeHtml((t.type || "").replace(/\s*\(.*\)/, ""))}</span>
                ${note ? `<p class="desc" style="margin-top:.5rem;font-size:.85rem">${escapeHtml(note)}</p>` : ""}
            </div>
        </article>`;
    }).join("");
}
