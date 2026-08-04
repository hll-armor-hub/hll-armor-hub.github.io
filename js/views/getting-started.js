/* Armor - Getting Started (WWII) */
import { videoCard, escapeHtml } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";

const VIDEOS = [
    { id: "PBzYfTpN7Hs", title: "Tank Tactics - Tank Basics" },
    { id: "G5vl86AZ1TU", title: "Combat Guide" }
];

const ROLES = [
    { t: "Tank Commander", img: "/images/HLL_Icons/Roles/icn_tankCommand.png", d: "Squad leader of the crew. Spots and marks targets - the recommended spotter. Two subclasses (SMG vs pistol + repair torch); take the SMG to defend against satchels." },
    { t: "Tank Crewman", img: "/images/HLL_Icons/Roles/icn_tankCrew.png", badge: "U19", d: "Driver / gunner. Two subclasses - always equip the blow torch (Lv3). Carries a supply crate for field repairs (U19)." },
    { t: "Tank Technician", img: "/images/HLL_Icons/Roles/icn_tankCrew.png", badge: "U18", d: "Lv7 crewman. Builds 4 barricades (25 supplies each), 1 repair station (50) and 1 tank ammo depot (50)." }
];

const HEALTH = [
    { t: "Hull", img: "/images/HLL_Icons/Unsorted/T_HUD_Status_Body_80.png", d: "Overall vehicle health gauge - when it's gone, you're dead." },
    { t: "Turret", img: "/images/HLL_Icons/Unsorted/T_HUD_Status_Turret_80.png", d: "Damage slows rotation and can disable the coax MG." },
    { t: "Engine", img: "/images/HLL_Icons/Unsorted/T_HUD_Status_Engine_80.png", d: "CRITICAL - smoking means engine off. Repair to 100% then restart." },
    { t: "Tracks", img: "/images/HLL_Icons/Unsorted/T_HUD_Status_Tracks_80.png", d: "Limits mobility; a blown track can lock you in first gear." }
];

const TYPES = [
    { t: "SPA (Self Propelled Artillery)", img: "/images/HLL_Icons/Vehicles/SPA.png", badge: "U19", htmlDesc: `Bunker-busters firing arcing rounds out to ~600m. See <a href="${buildHash("armor", "wwii", "calculators")}" style="color:var(--gold-glow);font-weight:600">Calcs &amp; Sights</a>.` },
    { t: "Heavy Tank", img: "/images/HLL_Icons/Vehicles/icn_tank_heavy.png", d: "Breakthrough armor and long-range engagements." },
    { t: "Medium Tank", img: "/images/HLL_Icons/Vehicles/icn_tank_med.png", d: "Balanced - supports infantry advances." },
    { t: "Light Tank", img: "/images/HLL_Icons/Vehicles/icn_tank_light.png", d: "Scouting, flanking and hit-and-run." },
    { t: "Recon Vehicle", img: "/images/HLL_Icons/Vehicles/icn_tank_recon.png", d: "Intel and fire support with the spotter recon ability." }
];

const PRO_TIPS = [
    { t: "Communication", d: "Gunner / driver / spotter callouts using clock directions. \u201cAss back right\u201d gets you out of trouble fast." },
    { t: "Focus the hull. ALWAYS", d: "HLL armor is simplified vs War Thunder / Squad 44 - put rounds into the hull." },
    { t: "Engine positioning", d: "Protect your rear; the engine is your most fragile component." },
    { t: "How to ricochet", d: "Peek at ~30\u00b0 angles; higher elevation helps rounds skip off your armor." },
    { t: "The smoke trick", d: "Ping targets through smoke to keep the gunner on target." },
    { t: "Retreat timing", d: "Survival beats a single kill - pull back before you're flanked." }
];

const AT_THREATS = [
    {
        icon: "fa-rocket",
        t: "Rocket launchers",
        weapons: "Bazooka \u00b7 Panzerschreck \u00b7 PIAT",
        level: "high",
        stat: "<strong>420</strong> damage per hit <span class=\"gs-at-delta\">(was 330)</span> \u00b7 <strong>2</strong> rockets carried <span class=\"gs-at-delta\">(was 3)</span>",
        boxTitle: "High threat: hull shots to destroy",
        shots: [
            { n: "1 shot", target: "Recon vehicles", delta: "(new in U20)" },
            { n: "2 shots", target: "Light tanks" },
            { n: "3 shots", target: "Medium & Heavy tanks" }
        ],
        note: "<strong>U20 penetration:</strong> Launchers can now pen the <strong>front hull</strong> of several mediums (e.g. M4 Sherman, T-34), not just sides and rear. Heavies still demand side/rear angles or multiple hits. Each shot hurts more, but AT infantry only gets two rockets. Finish the job or they are empty."
    },
    {
        icon: "fa-chess-rook",
        t: "Anti-tank guns",
        weapons: "Deployed 57 mm emplacements (all factions)",
        level: "high",
        stat: "<strong>535</strong> damage per hit <span class=\"gs-at-delta\">(was 400)</span>",
        boxTitle: "High threat: hull shots to destroy",
        shots: [
            { n: "3 shots", target: "Heavy tanks", delta: "(was 4)" },
            { n: "2 shots", target: "Medium tanks", delta: "(was 3)" },
            { n: "2 shots", target: "Light tanks" }
        ],
        note: "<strong>U20 change:</strong> Emplaced AT guns hit substantially harder. A gun line that covers a lane is more dangerous than pre-U20. Clear AT emplacements before pushing or expect faster hull bursts."
    },
    {
        icon: "fa-bullseye",
        t: "AT rifles",
        weapons: "PTRS-41 \u00b7 Boys \u00b7 etc.",
        level: "medium",
        stat: "Approx. <strong>64</strong> damage per hit <span class=\"gs-at-delta\">(unchanged in U20)</span>",
        boxTitle: "Medium threat: harassment & chip damage",
        shots: [
            { n: "19 shots", target: "Heavy tanks" },
            { n: "14 shots", target: "Medium tanks" },
            { n: "10 shots", target: "Light tanks" }
        ],
        note: "Still a nuisance for tracks and modules, not a primary kill tool vs full-health armor. U20 hull HP rebalance may shift exact counts slightly. Treat as harassment."
    },
    {
        icon: "fa-bomb",
        t: "Anti-tank mines",
        level: "high",
        stat: "Approx. <strong>600</strong> damage per hit",
        boxTitle: "Extreme threat",
        shots: [
            { n: "2 shots", target: "Heavy & Medium tanks" },
            { n: "1 shot", target: "Light tanks" }
        ],
        note: "Watch road shoulders and choke points. Unchanged role, still deletes careless pushes."
    }
];

function cardList(items) {
    return items.map(function (i) {
        return `<div class="tile glass reveal"><h3 style="font-size:1.05rem">${escapeHtml(i.t)}</h3><p>${escapeHtml(i.d)}</p></div>`;
    }).join("");
}

function iconRows(items) {
    return `<div class="gs-rows">${items.map(function (i) {
        const badge = i.badge ? `<span class="badge badge-gold">${escapeHtml(i.badge)}</span>` : "";
        return `<article class="gs-row glass reveal">
            <img class="gs-row__icon" src="${i.img}" alt="" loading="lazy" decoding="async">
            <div class="gs-row__body">
                <h3>${escapeHtml(i.t)} ${badge}</h3>
                <p>${i.htmlDesc || escapeHtml(i.d)}</p>
            </div>
        </article>`;
    }).join("")}</div>`;
}

function atThreatPanel(threat) {
    const weapons = threat.weapons ? `<span class="gs-at-weapons">${escapeHtml(threat.weapons)}</span>` : "";
    const shots = threat.shots.map(function (s) {
        const delta = s.delta ? ` <span class="gs-at-delta">${escapeHtml(s.delta)}</span>` : "";
        return `<li><strong>${escapeHtml(s.n)}</strong> - ${escapeHtml(s.target)}${delta}</li>`;
    }).join("");
    return `<article class="gs-at-panel gs-at-panel--${threat.level} glass reveal">
        <div class="gs-at-head">
            ${icon(threat.icon)}
            <strong>${escapeHtml(threat.t)}</strong>
            ${weapons}
        </div>
        <p class="gs-at-stat">${threat.stat}</p>
        <div class="gs-at-box gs-at-box--${threat.level}">
            <p class="gs-at-box__title">${escapeHtml(threat.boxTitle)}</p>
            <ul>${shots}</ul>
        </div>
        <p class="gs-at-note">${threat.note}</p>
    </article>`;
}

function atThreatsSection() {
    const tanksHref = buildHash("armor", "wwii", "tanks");
    const tankulatorHref = buildHash("armor", "wwii", "tankulator");
    return `<section style="margin-bottom:2.6rem">
        <p class="eyebrow">Infantry threats</p>
        <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 .6rem;display:flex;flex-wrap:wrap;align-items:center;gap:.55rem">
            <span style="font-size:1.4rem;color:var(--gold-glow)">${icon("crosshairs")}</span>
            Anti-tank damage
            <span class="badge badge-gold">U20</span>
        </h2>
        <p class="lead" style="margin-bottom:1.2rem;font-size:1rem">Know what infantry can bring against your hull in U20: rocket counts, emplaced AT gun damage, and where launchers can pen after the armor rework.</p>
        <div class="gs-at-grid">${AT_THREATS.map(atThreatPanel).join("")}</div>
        <p class="gs-at-footer">Tank vs tank damage uses the new <strong>armor resistance</strong> system (32 / 16 / 8% plate reduction). See the <a href="${tanksHref}">Tanks</a> reference panel or <a href="${tankulatorHref}">Tankulator</a> for AP matchups. <a href="https://www.hellletloose.com/blog/update-20-changelog" target="_blank" rel="noopener noreferrer">Official U20 changelog</a></p>
    </section>`;
}

export function render() {
    return `<div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">Armor · WWII</p>
            <h1 class="gold-text">Getting Started in Tanking</h1>
            <p class="lead">Essential fundamentals and beginner-friendly tips for new tank crews.</p>
        </header>

        <section style="margin-bottom:2.6rem">
            <p class="eyebrow">Essential videos</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Watch first</h2>
            <div class="grid cols-2">${VIDEOS.map(function (v) { return videoCard(v.id, v.title); }).join("")}</div>
        </section>

        <section style="margin-bottom:2.6rem">
            <p class="eyebrow">Crew roles</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Who does what</h2>
            ${iconRows(ROLES)}
        </section>

        <section style="margin-bottom:2.6rem">
            <p class="eyebrow">Modular damage (U18+)</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Health management</h2>
            <p class="notice" style="margin-bottom:1.2rem">${icon("wrench")} U18: damage is modular - repair each component by looking at it. Repair stations still prioritize tracks first.</p>
            ${iconRows(HEALTH)}
        </section>

        <section style="margin-bottom:2.6rem">
            <p class="eyebrow">Know your tools</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Tank types</h2>
            ${iconRows(TYPES)}
        </section>

        ${atThreatsSection()}

        <section>
            <p class="eyebrow">From the BEER clan</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Pro tips</h2>
            <div class="grid cols-3">${cardList(PRO_TIPS)}</div>
        </section>
    </div>`;
}
