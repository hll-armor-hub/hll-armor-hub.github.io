/* Armor - WWII Overview */
import { buildHash } from "../router.js";
import { videoCard, escapeHtml } from "../util.js";
import { icon } from "../icons.js";

const TILES = [
    { icon: "fa-shield-halved", title: "Tanks", desc: "Complete database of every tank with detailed stats, armor values and U20 combat analysis.", to: ["armor", "wwii", "tanks"], bg: "/images/360/tiger-i/1.webp" },
    { icon: "fa-graduation-cap", title: "Getting Started", desc: "Essential fundamentals and beginner-friendly tips for new tank crews.", to: ["armor", "wwii", "getting-started"], bg: "/images/360/m4-sherman/1.webp" },
    { icon: "fa-magnifying-glass", title: "Identification", desc: "Learn to identify enemy tanks at a glance and understand their capabilities.", to: ["armor", "wwii", "identification"], bg: "/images/360/panther/2.webp" },
    { icon: "fa-calculator", title: "Tankulator", desc: "Tank vs. tank AP shot calculator built for pro tankers. In partnership with WIX.", to: ["armor", "wwii", "tankulator"], bg: "/images/360/churchill-vii/2.webp" },
    { icon: "fa-crosshairs", title: "Calculators & Sights", desc: "Artillery and SPA mill calculators, plus armor sight practice for distance reads.", to: ["armor", "wwii", "calculators"], bg: "/images/360/sherman-firefly/1.webp" },
    { icon: "fa-users", title: "Community", desc: "Connect with other tank crews, share strategies, and join the community.", to: ["community"], bg: "/images/360/cromwell/1.webp" }
];

const U20_CHANGES = [
    "<strong>Plate resistance is new.</strong> Penetrating AP no longer deals full listed damage - hull plates cut it by 32% (heavy front), 16% (medium front &amp; heavy sides) or 8% (medium sides, light fronts, all rears).",
    "<strong>Medium side hulls weakened.</strong> Light tanks can now penetrate medium-tank side hull with AP - side-scrape angles matter more.",
    "<strong>Light-tank fronts opened up.</strong> Most lights now have mutual front-hull pen at range. The T-70 is the exception.",
    "<strong>Sherman Firefly hull softened.</strong> Front hull is medium-tier; sides/top are light-tier.",
    "<strong>Panther side armor reworked.</strong> Upper side plates need medium+ AP; lower plate behind the tracks can be penned by lights.",
    "<strong>Bishop SPA sides toughened.</strong> Side hull now needs medium+ AP.",
    "<strong>Rocket launchers vs hull.</strong> All faction launchers now deal 420 damage with 2 rockets (was 330 / 3).",
    "<strong>Anti-Tank emplacements buffed.</strong> Deployable 57 mm guns now deal 535 damage per hit (was 400).",
    "<strong>Full tank stat pass.</strong> Hull HP, AP damage, shell counts and fuel/munitions costs rebalanced across the WWII roster.",
    "<strong>Hotfix 2 - engine HP.</strong> Medium tanks +100, heavies +50, other SPA +100 engine HP. Reflected in Tankulator rear-engine sims."
];

const VIDEOS = [
    { id: "mh1lbHyKQzI", title: "Update 20 - Massive Armor Rework Explained by a Top Tanker", start: 282 },
    { id: "ltDPlcPjuD8", title: "Churchill A.V.R.E - the strongest tank in the game", start: 1 },
    { id: "nrDLLtcZPe0", title: "First matches on the Update 20 tank rework", start: 156 }
];

function tile(t) {
    const href = t.to.length === 1 ? "#/community" : buildHash(t.to[0], t.to[1], t.to[2]);
    const art = t.bg ? " tile--art tile--tank" : "";
    const bgEl = t.bg ? `<span class="tile__bg" style="background-image:url('${t.bg}')" aria-hidden="true"></span>` : "";
    return `<a class="tile glass card-hover reveal${art}" href="${href}">${bgEl}
        <span class="tile__icon">${icon(t.icon)}</span>
        <h3>${escapeHtml(t.title)}</h3>
        <p>${escapeHtml(t.desc)}</p>
        <span class="tile__link">Open</span>
    </a>`;
}

export function render() {
    return `
    <div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">Armor · WWII</p>
            <h1 class="gold-text">Armor Overview</h1>
            <p class="lead">Master the art of tank warfare in Hell Let Loose. Everything a crew needs - tuned for Update&nbsp;20.</p>
        </header>

        <a class="tile glass card-hover reveal tile--art tile--tank" href="${buildHash("armor", "vietnam", "overview")}"
           style="--col:100%; flex-direction:row; align-items:center; gap:1.4rem; margin-bottom:1.4rem; min-height:120px">
            <span class="tile__bg" style="background-image:url('/images/360/m48-patton/1.webp?v=face')" aria-hidden="true"></span>
            <span class="tile__icon" style="width:56px;height:56px;font-size:1.4rem;margin:0">${icon("tank")}</span>
            <div style="flex:1;min-width:0">
                <h3 style="margin:0 0 .25rem">Looking for Vietnam?</h3>
                <p style="margin:0">M48 Patton, T-54 roster, and the Vietnam Tankulator (% damage model).</p>
            </div>
            <span class="btn btn-primary">Go to Vietnam Armor</span>
        </a>

        <div class="notice">${icon("circle-info")} Update 20 values are now up to date across tank cards and the Tankulator.</div>

        <div class="grid cols-3" style="margin-bottom:3rem">${TILES.map(tile).join("")}</div>

        <a class="tile glass card-hover reveal" href="https://discord.gg/guFSTDfsCb" target="_blank" rel="noopener"
           style="--col:100%; flex-direction:row; align-items:center; gap:1.4rem; margin-bottom:3rem; background:linear-gradient(120deg, rgba(234,179,8,0.12), var(--glass));">
            <span class="tile__icon" style="width:60px;height:60px;font-size:1.6rem">${icon("discord")}</span>
            <div style="flex:1">
                <h3>Join After Hours Operators</h3>
                <p>A Hell Let Loose community built for quality games, good people, and organized fun. The Armor Hub's home server.</p>
            </div>
            <span class="btn btn-primary">Join Discord</span>
        </a>

        <section style="margin-bottom:3rem">
            <p class="eyebrow">What changed</p>
            <h2 class="gold-text" style="font-size:clamp(1.6rem,3.5vw,2.4rem); margin:.4rem 0 1.4rem">Update 20 - armor &amp; shots-to-kill</h2>
            <div class="glass" style="padding:1.6rem">
                <ul class="stack" style="display:grid; gap:0.9rem">
                    ${U20_CHANGES.map(function (c) { return `<li style="display:flex; gap:.7rem; color:var(--text-muted)"><span style="color:var(--gold-glow); margin-top:.35rem">${icon("angle-right")}</span><span>${c}</span></li>`; }).join("")}
                </ul>
                <p style="margin-top:1.2rem; font-size:.85rem">
                    <a href="https://www.hellletloose.com/blog/update-20-changelog" target="_blank" rel="noopener" style="color:var(--gold-glow)">Official Update 20 changelog ↗</a>
                </p>
            </div>
        </section>

        <section>
            <p class="eyebrow">Featured</p>
            <h2 class="gold-text" style="font-size:clamp(1.6rem,3.5vw,2.4rem); margin:.4rem 0 1.4rem">Watch the rework explained</h2>
            <div class="grid cols-3">${VIDEOS.map(function (v) { return videoCard(v.id, v.title, v.start); }).join("")}</div>
        </section>
    </div>`;
}
