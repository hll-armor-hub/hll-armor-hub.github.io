/* Armor - Vietnam (overview + roster) */
import { getVietnamTanks } from "../data.js";
import { escapeHtml, videoCard } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";
import { viewer360HTML, initViewers } from "../viewer360.js";
import { getVietnamTankulatorLocations, getVietnamTankulatorDoc } from "../vn-tankulator.js";

const FEATURES = [
    {
        icon: "fa-tank",
        t: "Vietnam Tank Roster",
        d: "M48 Patton and T-54: matched mediums with a shared damage model, resistance, and weak spots.",
        to: ["armor", "vietnam", "tanks"],
        bg: "/images/360/m48-patton/1.webp?v=face"
    },
    {
        icon: "fa-calculator",
        t: "Vietnam Tankulator",
        d: "Shots-to-kill by hull face, turret, and tracks, in the same % format as HLLV.",
        to: ["armor", "vietnam", "tankulator"],
        bg: "/images/360/t-54/1.webp?v=face"
    }
];

function featureTile(f) {
    const href = buildHash(f.to[0], f.to[1], f.to[2]);
    const art = f.bg ? " tile--art tile--tank" : "";
    const bgEl = f.bg ? `<span class="tile__bg" style="background-image:url('${f.bg}')" aria-hidden="true"></span>` : "";
    return `<a class="tile glass card-hover reveal${art}" href="${href}">${bgEl}
        <span class="tile__icon">${icon(f.icon)}</span>
        <h3>${escapeHtml(f.t)}</h3>
        <p>${escapeHtml(f.d)}</p>
        <span class="tile__link">Open</span>
    </a>`;
}

function formatResist(pct) {
    if (pct == null || !Number.isFinite(Number(pct))) return "-";
    const n = Number(pct);
    return (Math.round(n * 10) / 10) + "%";
}

function resistGridHtml() {
    const hull = getVietnamTankulatorLocations().filter(function (loc) { return loc.kind === "hull"; });
    if (!hull.length) return "";
    const cells = hull.map(function (loc) {
        const face = loc.label.replace(/ hull$/i, "");
        return `<div class="spec"><dt>${escapeHtml(face)}</dt><dd>${escapeHtml(formatResist(loc.resistanceVsRearPct))}</dd></div>`;
    }).join("");
    return `<div class="vn-resist">
        <p class="vn-resist__label">${icon("shield-halved")} Hull resistance <span>(vs rear)</span></p>
        <dl class="spec-grid spec-grid--3">${cells}</dl>
    </div>`;
}

function weakSpotsHtml() {
    const doc = getVietnamTankulatorDoc();
    const ws = doc && doc.weakSpots;
    if (!ws) return "";
    const lines = (ws.options || []).map(function (o) {
        return `<li><strong>${escapeHtml(o.spot)}</strong>: ${o.shotsToKill} shot${o.shotsToKill === 1 ? "" : "s"} to kill</li>`;
    }).join("");
    return `<dl class="callout weak">
        <dt>Weak spots</dt>
        <dd>
            <p>${escapeHtml(ws.summary || "")}</p>
            ${lines ? `<ul class="vn-weak-list">${lines}</ul>` : ""}
        </dd>
    </dl>`;
}

export const overview = {
    render: function () {
        const rosterHref = buildHash("armor", "vietnam", "tanks");
        const tkHref = buildHash("armor", "vietnam", "tankulator");
        return `<div class="wrap wrap-wide">
            <section class="glass-strong glass reveal" style="padding:clamp(2rem,5vw,3.5rem);border-radius:var(--r-xl);text-align:center;margin-bottom:2.6rem;background:linear-gradient(160deg,rgba(234,179,8,.12),var(--glass))">
                <p class="eyebrow center">Hell Let Loose: Vietnam</p>
                <h1 class="display gold-text" style="font-size:clamp(2.4rem,7vw,4.5rem);margin:.6rem 0">Armor - Vietnam</h1>
                <p class="lead" style="margin:0 auto 1.6rem">Live HLLV armor tools: roster specs and a percentage-based Tankulator for the M48 and T-54.</p>
                <div class="hero__cta" style="margin-top:2rem">
                    <a class="btn btn-primary" href="${tkHref}">Open Vietnam Tankulator</a>
                    <a class="btn btn-ghost" href="${rosterHref}">Tank roster</a>
                </div>
            </section>

            <div class="grid cols-2" style="margin-bottom:2.6rem">
                ${FEATURES.map(featureTile).join("")}
            </div>

            <p class="eyebrow">Featured</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Armor gameplay</h2>
            <div class="grid cols-2">${videoCard("RlySIaNX3Ug", "How to run a tank column in Hell Let Loose: Vietnam - USA armor gameplay")}</div>

            <p style="margin-top:1.4rem;color:var(--text-dim);font-size:.82rem">Damage values as of the current live Vietnam build.</p>
        </div>`;
    }
};

export const roster = {
    render: function () {
        const tkHref = buildHash("armor", "vietnam", "tankulator");
        const tanks = getVietnamTanks();
        const resistBlock = resistGridHtml();
        const weakBlock = weakSpotsHtml();
        const cards = tanks.length ? tanks.map(function (t, idx) {
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
                    ${viewer360HTML(t, "vn-" + idx)}
                    ${t.description ? `<p class="desc">${escapeHtml(t.description)}</p>` : ""}
                    <dl class="spec-grid">${specs}</dl>
                    ${resistBlock}
                    ${weakBlock}
                    <div class="notice" style="margin:0">${icon("circle-info")} <span>Shared damage model on both tanks. Open the <a href="${tkHref}">Tankulator</a> for full % shot bars.</span></div>
                </div>
            </article>`;
        }).join("") : `<p class="result-empty">Vietnam tank roster unavailable.</p>`;

        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">HLL Vietnam · Armor</p>
                <h1 class="gold-text">Vietnam Tank Roster</h1>
                <p class="lead">Two playable gun tanks: the M48 Patton (US) and T-54 (NVA). Drag either model for a full 360°. Both share one damage model; shell load, speed, and reload from live specs.</p>
            </header>
            <div class="grid cols-2">${cards}</div>
        </div>`;
    },
    mount: function (root) {
        initViewers(root);
    }
};
