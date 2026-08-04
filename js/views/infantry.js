/* Infantry - WWII + Vietnam */
import { calcMortar, MORTAR_BOUNDS, makeHistory } from "../data.js";
import { videoCard, escapeHtml, debounce } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";
import {
    isCalcFocus, focusBarHTML, enterFocusBtn, exitFocusLink, enterFocusLink,
    bindFocusBar, distanceField, bindDistanceSteppers, historyCollapsible,
    focusDocumentTitle
} from "../tool-mode.js";

/* ============================================================
   INFANTRY · WWII
   ============================================================ */

const WWII_GUIDE_VIDEOS = [
    { id: "9ENLfg-xOrU", title: "Rifleman guide" },
    { id: "M0wTm1nFTm8", title: "Anti-tank guide" },
    { id: "1MYgMt3fWXw", title: "Commander guide" }
];

const WWII_MAPS = [
    { name: "Hürtgen Forest", slug: "hurtgen-forest", key: "hurtgenforest-day.webp", tac: "hurtgenforest.webp", history: `The <strong>Battle of the Hürtgen Forest</strong> (1944–45) saw the U.S. First Army fight through dense woods and fortifications on the German–Belgian border. One of the longest and costliest American campaigns in Northwest Europe.` },
    { name: "Sainte-Marie-du-Mont", slug: "sainte-marie-du-mont", key: "stmariedumont-day.webp", tac: "stmariedumont.webp", history: `Behind <strong>Utah Beach</strong>, <strong>Sainte-Marie-du-Mont</strong> was part of the <strong>Normandy</strong> fighting in <strong>June 1944</strong> as U.S. airborne and seaborne troops cleared the <strong>Cotentin</strong> and linked up inland.` },
    { name: "Foy", slug: "foy", key: "foy-day.webp", tac: "foy.webp", history: `<strong>Foy</strong> sits near <strong>Bastogne</strong>, central to the <strong>Battle of the Bulge</strong> (December 1944–January 1945) when surrounded U.S. forces held the Ardennes before the counterattack east.` },
    { name: "Carentan", slug: "carentan", key: "carentan-day.webp", tac: "carentan.webp", history: `<strong>Carentan</strong> was fought over in <strong>June 1944</strong> as U.S. forces pushed inland to join the <strong>Omaha</strong> and <strong>Utah</strong> beachheads. A key crossroads in the <strong>Normandy</strong> bocage.` },
    { name: "Sainte-Mère-Église", slug: "sainte-mere-eglise", key: "stmereeglise-day.webp", tac: "stmereeglise.webp", history: `<strong>Sainte-Mère-Église</strong> was among the first towns liberated on <strong>D-Day</strong>; American paratroopers seized vital roads behind <strong>Utah Beach</strong> during <strong>Operation Neptune</strong>.` },
    { name: "Purple Heart Lane", slug: "purple-heart-lane", key: "purpleheartlane-rain.webp", tac: "purpleheartlane.webp", history: `The name evokes the grinding <strong>Normandy</strong> advance toward <strong>Saint-Lô</strong> in the <strong>summer of 1944</strong>, where hedgerows and German defenses made every lane costly for Allied infantry.` },
    { name: "Omaha Beach", slug: "omaha-beach", key: "omahabeach-day.webp", tac: "omahabeach.webp", history: `On <strong>6 June 1944</strong>, <strong>Omaha Beach</strong> was the hardest of the Allied landings. U.S. troops stormed bluffs and bunkers against a heavily prepared German defense.` },
    { name: "Utah Beach", slug: "utah-beach", key: "utahbeach-day.webp", tac: "utahbeach.webp", history: `The westernmost U.S. <strong>D-Day</strong> beach, <strong>Utah</strong> saw the <strong>4th Infantry Division</strong> land on <strong>6 June 1944</strong>, then drive inland to join American paratroopers holding the <strong>Cotentin</strong>.` },
    { name: "Juno Beach", slug: "juno-beach", key: "junobeach-day.png", tac: "junobeach.png", history: `On <strong>6 June 1944</strong>, Canadian forces stormed <strong>Juno Beach</strong> in <strong>Normandy</strong> against German coastal defenses. In Hell Let Loose this map pits <strong>Canadians</strong> against <strong>Germans</strong> across the landing and inland toward Courseulles and Bernières.` },
    { name: "Hill 400", slug: "hill-400", key: "hill400-day.webp", tac: "hill400.webp", history: `<strong>Hill 400</strong> (Bergstein) was contested in the <strong>Hürtgen Forest</strong> fighting of <strong>late 1944</strong>. An exposed height both sides attacked and counterattacked for control of the Roer river line.` },
    { name: "Kursk", slug: "kursk", key: "kursk-day.webp", tac: "kursk.webp", history: `<strong>Operation Citadel</strong> (July–August <strong>1943</strong>) produced the <strong>Battle of Kursk</strong>. The largest tank engagement of the war, as Germany tried to pinch off a Soviet salient on the Eastern Front.` },
    { name: "Stalingrad", slug: "stalingrad", key: "stalingrad-day.webp", tac: "stalingrad.webp", history: `The <strong>Battle of Stalingrad</strong> (<strong>1942–43</strong>) was a turning point on the Eastern Front: months of urban and riverside combat ended in encirclement and surrender of the German Sixth Army.` },
    { name: "Remagen", slug: "remagen", key: "remagen-day.webp", tac: "remagen.webp", history: `In <strong>March 1945</strong>, U.S. forces captured the <strong>Ludendorff Bridge</strong> at <strong>Remagen</strong>, gaining an unexpected <strong>Rhine</strong> crossing that accelerated the Allied drive into Germany.` },
    { name: "Driel", slug: "driel", key: "driel-day.webp", tac: "driel.webp", history: `Polish paratroopers dropped at <strong>Driel</strong> during <strong>Operation Market Garden</strong> (<strong>September 1944</strong>), trying to reinforce the British bridgehead at <strong>Arnhem</strong> on the <strong>Lower Rhine</strong>.` },
    { name: "El Alamein", slug: "el-alamein", key: "elalamein-day.webp", tac: "elalamein.webp", history: `The <strong>Second Battle of El Alamein</strong> (<strong>October–November 1942</strong>) broke Axis momentum in North Africa; Montgomery's Eighth Army pushed <strong>Rommel</strong> back from Egypt toward Tunisia.` },
    { name: "Kharkov", slug: "kharkov", key: "kharkov-day.webp", tac: "kharkov.webp", history: `<strong>Kharkov</strong> changed hands several times; the <strong>Third Battle of Kharkov</strong> (<strong>February–March 1943</strong>) was a major German counteroffensive after <strong>Stalingrad</strong> that briefly retook the city.` },
    { name: "Mortain", slug: "mortain", key: "mortain-day.webp", tac: "mortain.webp", history: `The German <strong>Operation Lüttich</strong> (<strong>August 1944</strong>) aimed at <strong>Mortain</strong> tried to cut off Patton's breakout; it failed and helped set up the <strong>Falaise Pocket</strong> encirclement.` },
    { name: "Elsenborn Ridge", slug: "elsenborn-ridge", key: "elsenbornridge-day.webp", tac: "elsenbornridge.webp", history: `On the <strong>northern shoulder of the Bulge</strong>, U.S. units held <strong>Elsenborn Ridge</strong> against <strong>6th Panzer Army</strong> attacks in the <strong>Ardennes</strong>, blunting the German winter offensive.` },
    { name: "Tobruk", slug: "tobruk", key: "tobruk-day.webp", tac: "tobruk.webp", history: `The <strong>siege of Tobruk</strong> (<strong>1941</strong>) saw Commonwealth forces defend the Libyan port for months against <strong>Rommel's</strong> <strong>Afrika Korps</strong>, a famous episode of the North African campaign.` },
    { name: "Smolensk", slug: "smolensk", key: "smolensk-day.webp", tac: "smolensk.webp", history: `The <strong>Smolensk</strong> region saw major fighting in <strong>1941</strong> and <strong>1943</strong> on the road to Moscow. Large-scale Soviet–German battles for a key rail and road hub on the Eastern Front.` }
];

const WWII_MODES = [
    { t: "Warfare", d: "The standard large-scale mode. Center starts neutral; after the first cap, two objectives stay active. Caps take a 2-minute minimum, and the strongpoint (black circle) counts as 3× weight.", win: "Hold the center at time, or capture all 5 and push the enemy off the map." },
    { t: "Offensive", d: "Asymmetric attack vs defend. One active objective with a fast 30-second flip; capture weight only counts inside the strongpoint.", win: "Attackers take all 5 before the timer and manpower run out; defenders hold any one." },
    { t: "Skirmish", d: "Smaller, faster fights on a single point and a significantly reduced battlefield. Frontline garrisons are used in this mode and can be placed closer together than a standard garrison.", win: "Functions like Warfare — whoever holds the center point at the end of the round wins — but manpower can be spent to extend the clock." }
];

const WWII_SERVER = [
    "Use Enlist → server browser.",
    "Prefer community servers (admins, Discord, rules, seeding).",
    "Avoid official servers - no active admins.",
    "After Hours Operators runs the Armor Hub's home server."
];

const WWII_SPAWNS = [
    "Garrisons: the main team spawn. 50 supplies in blue territory, 100 in red; build in the blue zone or the first two red sectors. An enemy within 100m (red) / ~15m (blue) locks spawning. Use the pyramid method - three around an objective in a triangle for backups.",
    "Outposts (OPs): squad-level spawns the officer drops. Faster to place and easier to hide, but easier to destroy - position them to re-engage without feeding a spawn camp.",
    "Frontline garrisons: Skirmish only. Not bound by the usual distance thresholds, so they sit between OPs and garrisons."
];

export const wwiiOverview = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · WWII</p>
                <h1 class="gold-text">Infantry Overview</h1>
                <p class="lead">New to the front? Start here. Servers, modes, comms, spawns and reading the fight.</p>
            </header>
            <div class="grid cols-3" style="margin-bottom:2.6rem">
                ${tile("fa-flag", "Getting Started", "First steps: servers, modes, comms, spawns, reading the fight.", buildHash("infantry", "wwii", "getting-started"), "/images/infantry/maps/utah-beach/utahbeach-day.webp")}
                ${tile("fa-map", "Maps", "All 20 WWII maps in Field Manual order with history blurbs.", buildHash("infantry", "wwii", "maps"), "/images/infantry/maps/elsenborn-ridge/elsenbornridge-day.webp")}
                ${tile("fa-explosion", "Artillery Calculator", "The same mil calculator from the Armor Hub.", buildHash("armor", "wwii", "calculators"), "/images/infantry/maps/kursk/kursk-day.webp")}
            </div>
            <section style="margin-bottom:2.6rem">
                <p class="eyebrow">Featured</p>
                <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">5 tips to get started</h2>
                <div class="grid cols-2">${videoCard("XWA3ma0OfTM", "5 tips to get started in Hell Let Loose", 64)}</div>
            </section>
            <section>
                <p class="eyebrow">Role guides</p>
                <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Learn your kit</h2>
                <div class="grid cols-3">${WWII_GUIDE_VIDEOS.map(function (v) { return videoCard(v.id, v.title); }).join("")}</div>
            </section>
        </div>`;
    }
};

export const wwiiGettingStarted = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · WWII</p>
                <h1 class="gold-text">Getting Started</h1>
                <p class="lead">The essentials every new infantryman should know before deploying.</p>
            </header>
            <div class="grid cols-2">
                ${panel("fa-server", "Finding a server", listOf(WWII_SERVER))}
                ${panel("fa-spawn", "Spawns", listOf(WWII_SPAWNS))}
            </div>
            <section style="margin-top:1.6rem">
                <p class="eyebrow">Game modes</p>
                <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">How matches play</h2>
                <div class="grid cols-3">${WWII_MODES.map(function (m) { return `<div class="tile glass reveal"><h3 style="font-size:1.05rem">${escapeHtml(m.t)}</h3><p>${escapeHtml(m.d)}</p><p class="mode-win"><span>Win</span> ${escapeHtml(m.win)}</p></div>`; }).join("")}</div>
            </section>
            <section style="margin-top:1.6rem">
                ${panel("fa-comments", "Comms", listOf([
                    "Squad + command channels; PC text chat only.",
                    "Use your mic sparingly and watch your volume peaking.",
                    "V = proximity · C = squad · X = command.",
                    "Officers: use command chat, mark spawns and vehicles."
                ]))}
            </section>
        </div>`;
    }
};

export const wwiiMaps = {
    render: function () {
        const cards = WWII_MAPS.map(function (m, i) {
            const base = "/images/infantry/maps/" + m.slug + "/";
            const keySrc = base + m.key;
            const tacSrc = base + m.tac;
            return `<article class="map-card glass card-hover reveal">
                <div class="map-card__head">
                    <span class="badge">Map ${String(i + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(m.name)}</h3>
                </div>
                <p class="map-card__history">${m.history}</p>
                <div class="map-card__imgs">
                    <figure class="map-fig">
                        <img class="map-img" src="${keySrc}" alt="${escapeHtml(m.name)} key art" width="960" height="540" loading="lazy" decoding="async" data-full="${keySrc}" data-title="${escapeHtml(m.name)} · key art" role="button" tabindex="0" aria-label="View ${escapeHtml(m.name)} key art full screen">
                        <figcaption>Key art</figcaption>
                    </figure>
                    <figure class="map-fig">
                        <img class="map-img" src="${tacSrc}" alt="${escapeHtml(m.name)} tactical map" width="1600" height="1600" loading="lazy" decoding="async" data-full="${tacSrc}" data-title="${escapeHtml(m.name)} · tactical map" role="button" tabindex="0" aria-label="View ${escapeHtml(m.name)} tactical map full screen">
                        <figcaption>Tactical map</figcaption>
                    </figure>
                </div>
            </article>`;
        }).join("");
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · WWII</p>
                <h1 class="gold-text">Maps</h1>
                <p class="lead">All 20 WWII maps in Field Manual order, with history and full-screen key art &amp; tactical maps. Interactive planning via <a href="https://mattw.io/maps-let-loose/" target="_blank" rel="noopener" style="color:var(--gold-glow)">Maps Let Loose</a>.</p>
            </header>
            <div class="map-grid">${cards}</div>
        </div>`;
    },
    mount: function (root) { bindMapLightbox(root); }
};

export const wwiiTips = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · WWII</p>
                <h1 class="gold-text">Tips from the Front</h1>
                <p class="lead">Perspective from After Hours Operators regulars. <a href="https://discord.gg/guFSTDfsCb" target="_blank" rel="noopener" style="color:var(--gold-glow)">Join the Discord</a> to share your own.</p>
            </header>
            <div id="tipsMount" class="grid cols-2"><div class="loading"><div class="spinner"></div></div></div>
        </div>`;
    },
    mount: function (root) {
        fetch("/data/infantry-aho-tips.json").then(function (r) { return r.json(); }).then(function (doc) {
            const tips = Array.isArray(doc) ? doc : (doc.tips || []);
            const mountEl = root.querySelector("#tipsMount");
            if (!tips.length) { mountEl.innerHTML = `<p class="result-empty">No tips yet.</p>`; return; }
            mountEl.innerHTML = tips.map(function (t) {
                const author = t.author || t.name || "Anonymous";
                const role = t.role ? ` · ${escapeHtml(t.role)}` : "";
                const quote = t.quote || t.tip || t.text || "";
                return `<blockquote class="tile glass">
                    <p style="color:var(--text-muted)">${escapeHtml(quote)}</p>
                    <footer style="margin-top:.8rem;color:var(--gold-glow);font-family:var(--font-display);font-size:.8rem">- ${escapeHtml(author)}${role}</footer>
                </blockquote>`;
            }).join("");
        }).catch(function () {
            root.querySelector("#tipsMount").innerHTML = `<p class="result-empty">Tips unavailable.</p>`;
        });
    }
};

/* ============================================================
   INFANTRY · VIETNAM
   ============================================================ */

const VN_SYSTEMS = [
    { icon: "fa-person-swimming", t: "Swimming", d: "Double-tap Ctrl to dive. ~6s before the drowning warning, ~6s more to death; up to ~11s if you time surfacing. Vault out of water works." },
    { icon: "fa-helicopter", t: "Helicopters", d: "M60D side guns (400 rounds + 1 spare). Damage zones: hull, engine, main rotor, tail rotor. Rotors don't hurt on collision but do while piloting." },
    { icon: "fa-mountain-sun", t: "Map & HQs", d: "A 3D live tactical map. All three HQs start with 150 supplies." },
    { icon: "fa-dungeon", t: "NVA tunnels", d: "100m build radius, no supply cost, ~120s cooldown. 500m link radius, max 4 links (5 sites), 15 tunnels/team. Instant connect, fast-travel any node." },
    { icon: "fa-truck", t: "Logistics & spawns", d: "150 HQ supplies; no jeeps/halftracks. Trucks drop 150. Garrisons 200m radius (50 blue / 100 red), not in neutral; OPs & tunnels can be neutral." },
    { icon: "fa-ship", t: "Boats", d: "Spawn from the deck when the engine is off (halftrack-style). Armed boats: M2 (300 + 1 belt). Drift with engine on." }
];

const VN_MODES = ["Warfare (~1h30m)", "Offensive", "Conquest", "Domination"];

export const vnOverview = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Infantry Overview</h1>
                <p class="lead">Closed beta details - subject to change at open beta and full release. Vietnam launches August 13th, 2026.</p>
            </header>
            <div class="grid cols-3" style="margin-bottom:2.6rem">
                ${tile("fa-flag", "Getting Started", "Vietnam-specific systems: modes, movement, logistics, and how it differs from WWII.", buildHash("infantry", "vietnam", "getting-started"), "/Vietnam/1920x1080_Camp.webp")}
                ${tile("fa-map", "Maps", "Vietnam theater maps with key art - tactical overlays coming at full release.", buildHash("infantry", "vietnam", "maps"), "/images/infantry/maps/thanh-hoa-bridge/thanh-hoa-bridge-day.webp")}
                ${tile("fa-people-group", "Squads & Equipment", "Every battlefield unit and role, from Commander to mortar crews.", buildHash("infantry", "vietnam", "squads"), "/Vietnam/1920x1080_Jungle.webp")}
                ${tile("fa-bomb", "Mortar Calculator", "Mil calculator for US & NVA mortars - same range band as in-game.", buildHash("infantry", "vietnam", "mortar"), "/Vietnam/1920x1080_Village.webp")}
            </div>
        </div>`;
    }
};

export const vnGettingStarted = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Getting Started</h1>
                <p class="lead">New systems and tweaks in Hell Let Loose: Vietnam for the closed beta.</p>
            </header>
            <div class="grid cols-3" style="margin-bottom:2rem">
                ${VN_SYSTEMS.map(function (s) { return `<div class="tile glass card-hover reveal"><span class="tile__icon">${icon(s.icon)}</span><h3 style="font-size:1.05rem">${escapeHtml(s.t)}</h3><p>${escapeHtml(s.d)}</p></div>`; }).join("")}
            </div>
            <div class="notice">${icon("circle-info")} Modes: ${VN_MODES.map(escapeHtml).join(" · ")}. New to HLL? Start with the WWII Getting Started first.</div>
        </div>`;
    }
};

export const vnSquads = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Squads &amp; Equipment</h1>
                <p class="lead">Closed-playtest classes and weapons — subject to change. For mix-and-match loadouts with the weight system, use the <a href="${buildHash("infantry", "vietnam", "loadout")}">Loadout Builder</a>.</p>
            </header>
            <div id="squadsMount"><div class="loading"><div class="spinner"></div><p>Loading loadouts…</p></div></div>
        </div>`;
    },
    mount: function (root) {
        fetch("/data/HLLV-Vietnam-loadouts-source.md").then(function (r) { return r.text(); }).then(function (md) {
            root.querySelector("#squadsMount").innerHTML = renderSquads(md);
            bindSquadTabs(root);
        }).catch(function () {
            root.querySelector("#squadsMount").innerHTML = `<p class="result-empty">Loadouts unavailable.</p>`;
        });
    }
};

const VN_MAPS = [
    { name: "Thanh Hóa Bridge", slug: "thanh-hoa-bridge", key: "thanh-hoa-bridge-day.webp", tac: null, history: `The <strong>Hàm Rồng</strong> (“Dragon’s Jaw”) bridge over the <strong>Mã River</strong> on Route 1 was a key north–south choke point. Bombed heavily during <strong>Rolling Thunder</strong> (1965–68) and again with laser-guided strikes in <strong>1972</strong>. In HLL:V it plays as a combined-arms ground fight for the crossing.` },
    { name: "Vạn Tường", slug: "van-tuong", key: "van-tuong-day.webp", tac: null, history: `<strong>Operation Starlite</strong> (<strong>August 1965</strong>) was the first major U.S. Marine Corps battle of the war, fought near <strong>Vạn Tường</strong> on the <strong>Quảng Ngãi</strong> coast against the 1st Viet Cong Regiment.` },
    { name: "Quảng Ngãi", slug: "quang-ngai", key: "quang-ngai-day.webp", tac: null, history: `<strong>Quảng Ngãi</strong> province on South Vietnam’s central coast saw persistent fighting through the mid-war years - villages, paddies, and jungle approaches that defined much of the I Corps infantry war.` },
    { name: "Huế Outskirts", slug: "hue-outskirts", key: "hue-outskirts-day.webp", tac: null, history: `Approaches to the imperial city of <strong>Huế</strong> were contested during the <strong>Tết Offensive</strong> (<strong>1968</strong>). The outskirts and river corridors became grinding infantry ground as U.S. and ARVN forces fought to retake the city.` },
    { name: "Đắk Tô Airfield", slug: "dak-to-airfield", key: "dak-to-airfield-day.webp", tac: null, history: `<strong>Đắk Tô</strong> in the Central Highlands was a major U.S. and ARVN base and airstrip. The <strong>Battles of Đắk Tô</strong> (<strong>1967</strong>) around the airfield and nearby hills were among the war’s fiercest hill fights.` },
    { name: "Cam Ranh Port", slug: "cam-ranh-port", key: "cam-ranh-port-day.webp", tac: null, history: `<strong>Cam Ranh Bay</strong> was one of the war’s great deep-water logistics hubs - a U.S. and allied port, airfield, and depot complex on the South China Sea that fed the entire southern theater.` }
];

export const vnMaps = {
    render: function () {
        const cards = VN_MAPS.map(function (m, i) {
            const base = "/images/infantry/maps/" + m.slug + "/";
            const keySrc = base + m.key;
            const tacFig = m.tac
                ? `<figure class="map-fig">
                        <img class="map-img" src="${base + m.tac}" alt="${escapeHtml(m.name)} tactical map" width="1600" height="1600" loading="lazy" decoding="async" data-full="${base + m.tac}" data-title="${escapeHtml(m.name)} · tactical map" role="button" tabindex="0" aria-label="View ${escapeHtml(m.name)} tactical map full screen">
                        <figcaption>Tactical map</figcaption>
                    </figure>`
                : `<figure class="map-fig">
                        <div class="map-img map-img--placeholder" role="img" aria-label="${escapeHtml(m.name)} tactical map placeholder">
                            <span class="map-img__ph-title">Tactical map</span>
                            <span class="map-img__ph-sub">Coming with full release</span>
                        </div>
                        <figcaption>Tactical map · TBD</figcaption>
                    </figure>`;
            return `<article class="map-card glass card-hover reveal">
                <div class="map-card__head">
                    <span class="badge">Map ${String(i + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(m.name)}</h3>
                </div>
                <p class="map-card__history">${m.history}</p>
                <div class="map-card__imgs">
                    <figure class="map-fig">
                        <img class="map-img" src="${keySrc}" alt="${escapeHtml(m.name)} key art" width="1024" height="576" loading="lazy" decoding="async" data-full="${keySrc}" data-title="${escapeHtml(m.name)} · key art" role="button" tabindex="0" aria-label="View ${escapeHtml(m.name)} key art full screen">
                        <figcaption>Key art</figcaption>
                    </figure>
                    ${tacFig}
                </div>
            </article>`;
        }).join("");
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Maps</h1>
                <p class="lead">Key art for the Vietnam theater maps. Tactical overlays land with full release.</p>
            </header>
            <div class="notice" style="margin-bottom:1.6rem">${icon("circle-info")} Per Vietnam open beta. This will be fully updated come full release.</div>
            <div class="map-grid">${cards}</div>
        </div>`;
    },
    mount: function (root) { bindMapLightbox(root); }
};

const vnMortarHistory = makeHistory("v2_vietnamMortarResults", 3);

export const vnMortar = {
    render: function (route) {
        route = route || { branch: "infantry", era: "vietnam", section: "mortar", query: {} };
        const focus = isCalcFocus(route);
        const hist = historyCollapsible("Saved results", mortarHistoryTable(vnMortarHistory.all()), focus);
        const header = focus ? "" : `<header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Mortar Calculator</h1>
                <p class="lead">Vietnam replaces WWII artillery with mortar squads. The mil solution is the same for US and NVA.</p>
            </header>`;
        const focusBar = focus
            ? focusBarHTML("Mortar Calculator", exitFocusLink(route), enterFocusLink(route, "1"))
            : `<div class="calc-panel-head calc-panel-head--solo"><span></span>${enterFocusBtn(route, "1", "Open mortar calculator in focus mode")}</div>`;

        return `<div class="wrap${focus ? " calc-focus-wrap" : ""}">
            ${focus ? focusBar : ""}
            ${header}
            ${focus ? "" : focusBar}
            <div class="tool-panel glass">
                ${focus ? `<p class="calc-focus-hint">Range ${MORTAR_BOUNDS.min}-${MORTAR_BOUNDS.max}m. Same mills for US and NVA.</p>` : ""}
                <div class="form-row">
                    ${distanceField("vnMortarDist", "Distance (m)", MORTAR_BOUNDS, 10)}
                    <div style="flex:0 0 auto">
                        <label class="field-label">&nbsp;</label>
                        <button class="btn btn-primary" id="vnMortarCalc" type="button">Calculate</button>
                    </div>
                </div>
                <div class="result-display${focus ? " result-display--sticky" : ""}" id="vnMortarResult"><span class="result-empty">No calculation yet.</span></div>
                ${hist}
            </div>
        </div>`;
    },
    mount: function (root, route) {
        route = route || { branch: "infantry", era: "vietnam", section: "mortar", query: {} };
        const focus = isCalcFocus(route);
        if (focus) {
            bindFocusBar(root);
            document.title = focusDocumentTitle("Mortar Calculator");
        }

        const dist = root.querySelector("#vnMortarDist");
        const out = root.querySelector("#vnMortarResult");
        function run() {
            const r = calcMortar(dist.value);
            if (r.error) { out.innerHTML = `<span class="result-empty" style="color:var(--danger)">${escapeHtml(r.error)}</span>`; return; }
            out.innerHTML = `<span class="mills">${r.mills}</span><span class="ctx">mills · US &amp; NVA at ${escapeHtml(String(dist.value))}m</span>`;
            if (focus) document.title = focusDocumentTitle(r.mills + " mills · Mortar");
            vnMortarHistory.add({ result: r.text, distance: Number(dist.value) });
            renderMortarHistory(root);
            dist.value = "";
            dist.focus();
        }
        function tryRun() {
            const d = Number(dist.value);
            if (!Number.isFinite(d) || d < MORTAR_BOUNDS.min || d > MORTAR_BOUNDS.max) return;
            run();
        }
        root.querySelector("#vnMortarCalc").addEventListener("click", run);
        dist.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
        dist.addEventListener("input", debounce(tryRun, 450));
        bindDistanceSteppers(root, "vnMortarDist", MORTAR_BOUNDS, tryRun);
        bindMortarDeletes(root);
        if (focus && dist) dist.focus();
    }
};

/* ---------------- helpers ---------------- */
function bindMapLightbox(root) {
    let lb = document.getElementById("mapLightbox");
    let opener = null;
    if (!lb) {
        lb = document.createElement("div");
        lb.id = "mapLightbox";
        lb.className = "img-lightbox";
        lb.setAttribute("role", "dialog");
        lb.setAttribute("aria-modal", "true");
        lb.setAttribute("aria-label", "Enlarged map image");
        lb.innerHTML = `<button class="img-lightbox__close" aria-label="Close enlarged image">&times;</button>`
            + `<figure class="img-lightbox__fig"><img alt=""><figcaption></figcaption></figure>`;
        document.body.appendChild(lb);
        const close = function () {
            lb.classList.remove("open");
            if (opener && typeof opener.focus === "function") opener.focus();
            opener = null;
        };
        lb._close = close;
        lb.addEventListener("click", function (e) {
            if (e.target === lb || e.target.closest(".img-lightbox__close")) close();
        });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) close(); });
    }
    const img = lb.querySelector("img");
    const cap = lb.querySelector("figcaption");
    const closeBtn = lb.querySelector(".img-lightbox__close");
    function open(el) {
        opener = el;
        img.src = el.getAttribute("data-full");
        img.alt = el.getAttribute("alt") || el.getAttribute("data-title") || "";
        cap.textContent = el.getAttribute("data-title") || "";
        lb.classList.add("open");
        if (closeBtn) closeBtn.focus();
    }
    root.querySelectorAll(".map-img").forEach(function (el) {
        el.addEventListener("click", function () { open(el); });
        el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); open(el); }
        });
    });
}

function tile(iconName, title, desc, href, bg) {
    const art = bg ? ` tile--art` : "";
    const bgEl = bg ? `<span class="tile__bg" style="background-image:url('${bg}')" aria-hidden="true"></span>` : "";
    return `<a class="tile glass card-hover reveal${art}" href="${href}">${bgEl}<span class="tile__icon">${icon(iconName)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(desc)}</p><span class="tile__link">Open</span></a>`;
}
function panel(iconName, title, inner) {
    return `<div class="glass reveal" style="padding:1.6rem"><h3 style="margin-bottom:1rem"><span style="color:var(--gold-glow)">${icon(iconName)}</span> ${escapeHtml(title)}</h3>${inner}</div>`;
}
function listOf(items) {
    return `<ul class="matrix-notes" style="font-size:.9rem;gap:.5rem">${items.map(function (i) { return `<li>${escapeHtml(i)}</li>`; }).join("")}</ul>`;
}

function mortarHistoryTable(entries) {
    if (!entries.length) return `<p class="result-empty">No calculations saved yet.</p>`;
    return `<table class="data-table"><thead><tr><th>Result</th><th>Distance</th><th></th></tr></thead><tbody>${entries.map(function (e) {
        return `<tr><td><strong style="color:var(--gold-glow)">${escapeHtml(e.result)}</strong></td><td>${escapeHtml(String(e.distance))}m</td><td><button class="tk-del" data-mdel="${e.id}" aria-label="Delete">${icon("xmark")}</button></td></tr>`;
    }).join("")}</tbody></table>`;
}
function renderMortarHistory(root) {
    const el = root.querySelector(".calc-history__body") || root.querySelector("#vnMortarHistory");
    if (el) el.innerHTML = mortarHistoryTable(vnMortarHistory.all());
    bindMortarDeletes(root);
}
function bindMortarDeletes(root) {
    root.querySelectorAll("[data-mdel]").forEach(function (b) {
        b.addEventListener("click", function () { vnMortarHistory.remove(Number(b.getAttribute("data-mdel"))); renderMortarHistory(root); });
    });
}

/* ---- Vietnam loadout markdown parser ---- */
function renderSquads(md) {
    const us = sliceFaction(md, "# US", "# NVA");
    const nva = sliceFaction(md, "# NVA", null);
    const usRoles = parseRoles(us);
    const nvaRoles = parseRoles(nva);

    function column(label, roles) {
        const items = roles.map(function (role, i) {
            return `<details class="squad-role glass" ${i === 0 ? "open" : ""}>
                <summary>${escapeHtml(role.name)}${role.tag ? `<span class="squad-tag">${escapeHtml(role.tag)}</span>` : ""}</summary>
                <div class="squad-body">${role.html}</div>
            </details>`;
        }).join("");
        return `<div class="squad-col" data-col="${label.toLowerCase()}"><h3 class="squad-col__head">${escapeHtml(label)}</h3>${items}</div>`;
    }

    return `<div class="squad-grid">
        ${column("United States", usRoles)}
        ${column("North Vietnamese Army", nvaRoles)}
    </div>`;
}

function sliceFaction(md, startMarker, endMarker) {
    const lines = md.split(/\r?\n/);
    let start = -1, end = lines.length;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === startMarker.trim()) { start = i + 1; break; }
    }
    if (start === -1) return "";
    if (endMarker) {
        for (let i = start; i < lines.length; i++) {
            if (lines[i].trim() === endMarker.trim()) { end = i; break; }
        }
    }
    return lines.slice(start, end).join("\n");
}

function parseRoles(block) {
    const lines = block.split(/\r?\n/);
    const roles = [];
    let cur = null;
    lines.forEach(function (raw) {
        const line = raw.replace(/\s+$/, "");
        const m = line.match(/^##\s+(.+)$/);
        if (m && !line.startsWith("###")) {
            if (cur) roles.push(finishRole(cur));
            const full = m[1].trim();
            const tagMatch = full.match(/\(([^)]+)\)\s*$/);
            cur = { name: full.replace(/\s*\([^)]+\)\s*$/, "").trim(), tag: tagMatch ? tagMatch[1] : "", lines: [] };
            return;
        }
        if (cur) cur.lines.push(line);
    });
    if (cur) roles.push(finishRole(cur));
    return roles;
}

function finishRole(role) {
    const html = mdBlockToHtml(role.lines);
    return { name: role.name, tag: role.tag, html: html };
}

function mdBlockToHtml(lines) {
    let html = "";
    let listOpen = false;
    function closeList() { if (listOpen) { html += "</ul>"; listOpen = false; } }
    lines.forEach(function (line) {
        const t = line.trim();
        if (!t) { closeList(); return; }
        const sub = t.match(/^###\s+(.+)$/);
        if (sub) { closeList(); html += `<h5 class="squad-sub">${escapeHtml(sub[1])}</h5>`; return; }
        if (/:$/.test(t)) { closeList(); html += `<p class="squad-label">${escapeHtml(t.replace(/:$/, ""))}</p>`; return; }
        if (!listOpen) { html += `<ul class="squad-list">`; listOpen = true; }
        html += `<li>${escapeHtml(t)}</li>`;
    });
    closeList();
    return html || "<p class=\"result-empty\">No data.</p>";
}

function bindSquadTabs() { /* reserved for future mobile tab switching */ }
