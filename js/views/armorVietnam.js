/* Armor - Vietnam (overview + roster) */
import { getVietnamTanks } from "../data.js";
import { videoCard, escapeHtml } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";

const LAUNCH = "2026-08-13T00:00:00Z";
const FEATURES = [
    { icon: "fa-tank", t: "Vietnam-Era Tanks", d: "M48 Patton and T-54 gun tanks enter the fight." },
    { icon: "fa-tree", t: "Jungle Warfare", d: "Dense terrain reshapes how armor pushes and hides." },
    { icon: "fa-gears", t: "New Combat Mechanics", d: "Tunnels, helicopters, boats and swimming change the battlefield." }
];

function countdownMarkup() {
    return `<div class="vn-countdown" id="vnCountdown" data-target="${LAUNCH}">
        <div class="vn-cd"><span data-cd="d">--</span><small>Days</small></div>
        <div class="vn-cd"><span data-cd="h">--</span><small>Hrs</small></div>
        <div class="vn-cd"><span data-cd="m">--</span><small>Min</small></div>
        <div class="vn-cd"><span data-cd="s">--</span><small>Sec</small></div>
    </div>`;
}

export const overview = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <section class="glass-strong glass reveal" style="padding:clamp(2rem,5vw,3.5rem);border-radius:var(--r-xl);text-align:center;margin-bottom:2.6rem;background:linear-gradient(160deg,rgba(234,179,8,.12),var(--glass))">
                <p class="eyebrow center">Hell Let Loose: Vietnam</p>
                <h1 class="display gold-text" style="font-size:clamp(2.4rem,7vw,4.5rem);margin:.6rem 0">Armor - Vietnam</h1>
                <p class="lead" style="margin:0 auto 1.6rem">Experience the next chapter of armored warfare. Vietnam launches <strong>August 13th, 2026</strong>.</p>
                ${countdownMarkup()}
                <div class="hero__cta" style="margin-top:2rem">
                    <a class="btn btn-primary" href="${buildHash("armor", "vietnam", "tanks")}">Open Vietnam tank roster</a>
                </div>
            </section>

            <div class="grid cols-3" style="margin-bottom:2.6rem">
                ${FEATURES.map(function (f) { return `<div class="tile glass reveal"><span class="tile__icon">${icon(f.icon)}</span><h3>${escapeHtml(f.t)}</h3><p>${escapeHtml(f.d)}</p></div>`; }).join("")}
            </div>

            <p class="eyebrow">Featured</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Newest details on Vietnam</h2>
            <div class="grid cols-2">${videoCard("yxEbE8fTJ80", "Newest details on Hell Let Loose: Vietnam")}</div>
            <p style="margin-top:1.4rem;color:var(--text-dim);font-size:.82rem">Closed beta details - subject to change upon open beta and full release.</p>
        </div>`;
    },
    mount: function (root) { startCountdown(root); }
};

export const roster = {
    render: function () {
        const tanks = getVietnamTanks();
        const cards = tanks.length ? tanks.map(function (t) {
            const ds = t.detailedStats || {};
            const specs = [
                ["Gun", t.gun], ["Speed", t.speed], ["Crew", t.crew],
                ["Reload", ds.reloadSpeed ? ds.reloadSpeed + "s" : null],
                ["AP shells", ds.maxShellsAP], ["HE shells", ds.maxShellsHE]
            ].filter(function (s) { return s[1] != null && s[1] !== ""; })
                .map(function (s) { return `<div class="spec"><dt>${escapeHtml(s[0])}</dt><dd>${escapeHtml(String(s[1]))}</dd></div>`; }).join("");
            return `<article class="tank-card glass card-hover reveal">
                <div class="tank-card__head">
                    <div><h3 class="tank-card__title">${escapeHtml(t.name)}</h3><span class="tank-card__faction">${escapeHtml(t.faction || "")}</span></div>
                    <span class="tank-card__type">${escapeHtml((t.type || "").replace(/\s*\(.*\)/, ""))}</span>
                </div>
                <div class="tank-card__body">
                    ${t.description ? `<p class="desc">${escapeHtml(t.description)}</p>` : ""}
                    <dl class="spec-grid">${specs}</dl>
                    <div class="notice" style="margin:0">${icon("circle-info")} Armor &amp; penetration values TBD pending published stats.</div>
                </div>
            </article>`;
        }).join("") : `<p class="result-empty">Roster coming with the Vietnam launch.</p>`;

        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Armor · Vietnam</p>
                <h1 class="gold-text">Vietnam Tank Roster</h1>
                <p class="lead">Two playable gun tanks - the M48 Patton (US) and T-54 (NVA). Shell load, speed and reload from playtest notes; remaining stats TBD.</p>
            </header>
            <div class="grid cols-2">${cards}</div>
        </div>`;
    }
};

function startCountdown(root) {
    const el = root.querySelector("#vnCountdown");
    if (!el) return;
    const target = new Date(el.getAttribute("data-target")).getTime();
    function tick() {
        const diff = Math.max(0, target - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const set = function (k, v) { const n = el.querySelector(`[data-cd="${k}"]`); if (n) n.textContent = String(v).padStart(2, "0"); };
        set("d", d); set("h", h); set("m", m); set("s", s);
    }
    tick();
    el._timer = setInterval(tick, 1000);
}
