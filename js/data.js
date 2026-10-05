/* ============================================================
   Armor Hub v2 - Data layer & combat math
   Faithful port of the original site's formulas so all
   results (Tankulator, artillery, SPA, mortar) are identical.
   Reuses the existing /data JSON as the source of truth.
   ============================================================ */

export const SPA_TANK_TYPE = "SPA (Self Propelled Artillery)";

const DATA_BASE = "/data";

const state = {
    ready: false,
    promise: null,
    wwii: {},        // faction-slug -> [tanks]
    vietnam: [],
    vnTankulator: null,
    u20: null,
    spaMeta: { strengths: "", weakSpots: "", type: SPA_TANK_TYPE },
    factions: []
};

/* ---------------- Loading ---------------- */
export function loadData() {
    if (state.promise) return state.promise;
    state.promise = Promise.all([
        fetchJSON(`${DATA_BASE}/tanks-wwii.json`),
        fetchJSON(`${DATA_BASE}/tanks-u20-overrides.json`),
        fetchJSON(`${DATA_BASE}/tanks-vietnam.json`).catch(() => ({ tanks: [] })),
        fetchJSON(`${DATA_BASE}/vietnam-tankulator.json`).catch(() => null)
    ]).then(function ([wwiiDoc, u20Doc, vnDoc, vnTkDoc]) {
        state.wwii = wwiiDoc.tanks || {};
        state.factions = wwiiDoc.factions || Object.keys(state.wwii);
        state.spaMeta = {
            type: wwiiDoc.spaTankType || SPA_TANK_TYPE,
            strengths: wwiiDoc.spaStrengths || "",
            weakSpots: wwiiDoc.spaWeakSpots || ""
        };
        state.u20 = u20Doc || {};
        state.vietnam = (vnDoc && vnDoc.tanks) || [];
        state.vnTankulator = vnTkDoc;
        applyU20StatPatches();
        state.ready = true;
        return state;
    }).catch(function (err) {
        state.promise = null;
        throw err;
    });
    return state.promise;
}

function fetchJSON(url) {
    return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
        return r.json();
    });
}

function applyU20StatPatches() {
    const patches = state.u20 && state.u20.detailedStats;
    if (!patches) return;
    Object.values(state.wwii).forEach(function (tanks) {
        tanks.forEach(function (tank) {
            const patch = patches[tank.name];
            if (!patch) return;
            tank.detailedStats = Object.assign({}, tank.detailedStats, patch);
            if (typeof patch.maxSpeed === "number") tank.speed = `${patch.maxSpeed} km/h`;
        });
    });
}

/* ---------------- Queries ---------------- */
export function getFactions() { return state.factions.slice(); }
export function getSpaMeta() { return state.spaMeta; }

export function getWWIIByFaction() { return state.wwii; }

export function getAllWWIITanks() {
    return Object.values(state.wwii).flat();
}

export function getVietnamTanks() { return state.vietnam.slice(); }

export function getVietnamTankulatorDoc() { return state.vnTankulator; }

export function findTankByName(name) {
    return getAllWWIITanks().find(function (t) { return t.name === name; })
        || state.vietnam.find(function (t) { return t.name === name; })
        || null;
}

/* ---------------- Hull penetration profiles ---------------- */
const FACE_ORDER = ["front", "left", "right", "rear"];
export const GUN_CLASSES = [
    { key: "recon", label: "Recon" },
    { key: "light", label: "Light" },
    { key: "medium", label: "Medium" },
    { key: "heavy", label: "Heavy" }
];

export function getDefaultHullPenProfile(tank) {
    const type = tank.type;
    const allTrue = { recon: true, light: true, medium: true, heavy: true };
    const medUp = { recon: false, light: false, medium: true, heavy: true };
    const lightUp = { recon: false, light: true, medium: true, heavy: true };
    const heavyFront = { recon: false, light: false, medium: false, heavy: true };
    const heavySide = { recon: false, light: false, medium: true, heavy: true };

    if (type === "Heavy Tank") {
        return {
            front: { tier: "heavy", pen: { ...heavyFront } },
            left: { tier: "medium", pen: { ...heavySide } },
            right: { tier: "medium", pen: { ...heavySide } },
            rear: { tier: "light", pen: { ...allTrue } }
        };
    }
    if (type === "Medium Tank") {
        return {
            front: { tier: "medium", pen: { ...medUp } },
            left: { tier: "light", pen: { ...lightUp }, note: "U20: side hull weakened - lights can pen." },
            right: { tier: "light", pen: { ...lightUp }, note: "U20: side hull weakened - lights can pen." },
            rear: { tier: "light", pen: { ...allTrue } }
        };
    }
    if (type === "Light Tank") {
        return {
            front: { tier: "light", pen: { ...lightUp }, note: "U20: light front hull mutual pen (except T-70)." },
            left: { tier: "light", pen: { ...lightUp } },
            right: { tier: "light", pen: { ...lightUp } },
            rear: { tier: "light", pen: { ...allTrue } }
        };
    }
    if (type === "Recon Vehicle") {
        return {
            front: { tier: "light", pen: { ...lightUp } },
            left: { tier: "light", pen: { ...lightUp } },
            right: { tier: "light", pen: { ...lightUp } },
            rear: { tier: "light", pen: { ...allTrue } }
        };
    }
    if (type === SPA_TANK_TYPE) {
        return {
            front: { tier: "medium", pen: { ...medUp } },
            left: { tier: "light", pen: { ...lightUp } },
            right: { tier: "light", pen: { ...lightUp } },
            rear: { tier: "light", pen: { ...allTrue } }
        };
    }
    return null;
}

export function getHullPenetrationProfile(tank) {
    const defaults = getDefaultHullPenProfile(tank);
    if (!defaults) return null;
    const overrides = state.u20 && state.u20.hullPenOverrides ? state.u20.hullPenOverrides[tank.name] : null;
    if (!overrides) return defaults;
    const profile = {};
    FACE_ORDER.forEach(function (key) {
        if (overrides[key]) {
            profile[key] = {
                tier: overrides[key].tier || defaults[key].tier,
                pen: { ...defaults[key].pen, ...overrides[key].pen },
                note: overrides[key].note || defaults[key].note || ""
            };
        } else {
            profile[key] = { tier: defaults[key].tier, pen: { ...defaults[key].pen }, note: defaults[key].note || "" };
        }
    });
    return profile;
}

/* ---------------- Resistance & damage ---------------- */
export function getArmorTierMeta(tierKey) {
    const tiers = state.u20 && state.u20.resistanceTiers;
    if (!tiers || !tiers[tierKey]) return { label: "Plate", percent: null };
    return tiers[tierKey];
}

export function getResistanceMultiplier(tierKey) {
    const tiers = state.u20 && state.u20.resistanceTiers;
    const pct = tiers && tiers[tierKey] ? tiers[tierKey].percent : null;
    if (typeof pct !== "number") return 0.92;
    return 1 - pct / 100;
}

export function getU20ResistTier(targetTank, face) {
    if (!targetTank || targetTank.routeGame === "vietnam") return "light";
    if (face === "rear") return "light";
    const type = targetTank.type;
    if (type === "Heavy Tank") return face === "front" ? "heavy" : "medium";
    if (type === "Medium Tank") return face === "front" ? "medium" : "light";
    if (type === SPA_TANK_TYPE) return face === "front" ? "medium" : "light";
    return "light";
}

export function getTankulatorModifier(targetTank, face, apDamage) {
    const resistTier = getU20ResistTier(targetTank, face);
    const modifier = getResistanceMultiplier(resistTier);
    const tierMeta = getArmorTierMeta(resistTier);
    const label = tierMeta.percent != null ? `−${tierMeta.percent}% resist` : tierMeta.label;
    const ap = Number(apDamage);
    const effectiveDamage = Number.isFinite(ap) && ap > 0 ? Math.max(1, Math.round(ap * modifier)) : null;
    return { tier: resistTier, modifier, label, effectiveDamage };
}

function getTankulatorClassKey(attacker) {
    if (!attacker) return "recon";
    if (attacker.type === "Heavy Tank") return "heavy";
    if (attacker.type === "Medium Tank") return "medium";
    if (attacker.type === "Light Tank") return "light";
    return "recon";
}

export function getTankulatorPenClass(attacker) {
    if (attacker && attacker.tankulatorPenClass) return attacker.tankulatorPenClass;
    return getTankulatorClassKey(attacker);
}

/* ---------------- Tankulator attackers & presets ---------------- */
export const INFANTRY_ATTACKERS = [
    { name: "Rocket Launcher", type: "Infantry AT", faction: "All factions", tankulatorPenClass: "medium", detailedStats: { apDamage: 420 } },
    { name: "AT Gun Emplacement", type: "Infantry AT", faction: "All factions", tankulatorPenClass: "heavy", detailedStats: { apDamage: 535 } }
];

export const TANKULATOR_PRESETS = [
    { label: "Tiger vs Jumbo (front)", attacker: "Tiger I", target: "Sherman 76 Jumbo", face: "front" },
    { label: "Panther vs Sherman", attacker: "Panther", target: "M4 Sherman", face: "front" },
    { label: "Firefly vs Panther", attacker: "Sherman Firefly", target: "Panther", face: "front" },
    { label: "IS-1 vs Tiger", attacker: "IS-1", target: "Tiger I", face: "front" },
    { label: "Tiger vs Panther (side)", attacker: "Tiger I", target: "Panther", face: "left" },
    { label: "Panzer IV vs Stuart", attacker: "Panzer IV", target: "M5A1 Stuart", face: "front" },
    { label: "Rocket vs Sherman (front)", attacker: "Rocket Launcher", target: "M4 Sherman", face: "front" },
    { label: "AT Gun vs Tiger (side)", attacker: "AT Gun Emplacement", target: "Tiger I", face: "left" }
];

export function collectTankulatorTanks() {
    return getAllWWIITanks()
        .filter(function (t) { return t.routeGame !== "vietnam" && t.detailedStats && Number.isFinite(Number(t.detailedStats.apDamage)); })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
}

export function findAttackerByName(name) {
    return INFANTRY_ATTACKERS.find(function (w) { return w.name === name; }) || findTankByName(name);
}

/* ---------------- Shot simulation ---------------- */
export function simulateComponentPool(poolHp, effectiveDamage, canPen, maxShots, startingHp) {
    if (!Number.isFinite(poolHp) || poolHp <= 0) return null;
    const start = startingHp != null && Number.isFinite(startingHp)
        ? Math.max(0, Math.min(poolHp, startingHp))
        : poolHp;
    if (start <= 0) {
        return { poolHp: 0, fullPoolHp: poolHp, depletedOnShot: 0, shotsToDeplete: 0, shotResults: [] };
    }
    let remaining = start;
    let depletedOnShot = null;
    const shotResults = [];
    for (let i = 1; i <= maxShots; i += 1) {
        const hpBefore = remaining;
        const dealt = canPen && remaining > 0 ? Math.min(remaining, effectiveDamage) : 0;
        remaining = Math.max(0, remaining - dealt);
        if (remaining === 0 && depletedOnShot == null && canPen) depletedOnShot = i;
        shotResults.push({ shot: i, dealt, remaining, hpBefore });
    }
    const shotsToDeplete = canPen && effectiveDamage > 0 ? Math.ceil(start / effectiveDamage) : null;
    return { poolHp: start, fullPoolHp: poolHp, depletedOnShot, shotsToDeplete, shotResults };
}

export function simulateTankulatorFace(attacker, target, face, maxShots, options) {
    maxShots = maxShots || 8;
    options = options || {};
    const apDamage = Number(attacker.detailedStats?.apDamage || 0);
    const hullHp = Number(target.detailedStats?.hullHealth || 0);
    const turretHp = Number(target.detailedStats?.turretHealth || 0);
    const engineHp = Number(target.detailedStats?.engineHealth || 0);
    const hullStart = options.hullHpRemaining != null ? options.hullHpRemaining : hullHp;
    const penClass = getTankulatorPenClass(attacker);
    const profile = getHullPenetrationProfile(target);
    const faceData = profile && profile[face] ? profile[face] : null;
    const canPen = !!(faceData && faceData.pen && faceData.pen[penClass]);
    const modMeta = getTankulatorModifier(target, face, apDamage);
    const effectiveDamage = canPen ? modMeta.effectiveDamage || 0 : 0;
    const hullSim = simulateComponentPool(hullHp, effectiveDamage, canPen, maxShots, hullStart);

    return {
        apDamage, hullHp, hullHpRemaining: hullSim ? hullSim.poolHp : 0,
        turretHp, engineHp, canPen, modMeta, effectiveDamage,
        killedOnShot: hullSim ? hullSim.depletedOnShot : null,
        shotsToKill: hullSim ? hullSim.shotsToDeplete : null,
        shotResults: hullSim ? hullSim.shotResults : [],
        turret: turretHp > 0 ? simulateComponentPool(turretHp, effectiveDamage, canPen, maxShots) : null,
        engine: face === "rear" && engineHp > 0 ? simulateComponentPool(engineHp, effectiveDamage, canPen, maxShots) : null
    };
}

/** Apply prior hull hits before the main attacker. priorHits: [{ attacker|attackerName, face, shots }] */
export function applyPriorHits(target, priorHits, maxShotsPerEntry) {
    const hullHp = Number(target?.detailedStats?.hullHealth || 0);
    const cap = Math.max(1, maxShotsPerEntry || 8);
    let remaining = hullHp;
    let totalDealt = 0;
    const ledger = [];
    const list = Array.isArray(priorHits) ? priorHits : [];

    for (let i = 0; i < list.length; i += 1) {
        if (remaining <= 0) break;
        const entry = list[i] || {};
        const name = entry.attackerName || entry.attacker;
        const face = entry.face || "front";
        const shots = Math.min(cap, Math.max(0, Math.floor(Number(entry.shots) || 0)));
        if (!name || shots < 1) continue;

        const attacker = findAttackerByName(name);
        if (!attacker) continue;

        const apDamage = Number(attacker.detailedStats?.apDamage || 0);
        const penClass = getTankulatorPenClass(attacker);
        const profile = getHullPenetrationProfile(target);
        const faceData = profile && profile[face] ? profile[face] : null;
        const canPen = !!(faceData && faceData.pen && faceData.pen[penClass]);
        const modMeta = getTankulatorModifier(target, face, apDamage);
        const effectiveDamage = canPen ? modMeta.effectiveDamage || 0 : 0;

        for (let s = 1; s <= shots; s += 1) {
            if (remaining <= 0) break;
            const hpBefore = remaining;
            const dealt = canPen && effectiveDamage > 0 ? Math.min(remaining, effectiveDamage) : 0;
            remaining = Math.max(0, remaining - dealt);
            totalDealt += dealt;
            ledger.push({
                attacker: attacker.name,
                face,
                shot: s,
                dealt,
                remaining,
                hpBefore,
                canPen,
                effectiveDamage
            });
        }
    }

    return {
        hullHp,
        hullRemaining: remaining,
        alreadyDead: hullHp > 0 && remaining <= 0,
        ledger,
        totalDealt
    };
}

/* ============================================================
   Firing-solution calculators (exact coefficients)
   ============================================================ */

const ARTILLERY_COEFFS = {
    soviet: { m: -0.2136691176, b: 1141.7215, name: "Soviet Union" },
    german: { m: -0.237035714285714, b: 1001.46547619048, name: "Germany" },
    british: { m: -0.1773, b: 550.69, name: "Great Britain" },
    usa: { m: -0.237035714285714, b: 1001.46547619048, name: "USA" }
};

export const ARTILLERY_BOUNDS = { min: 100, max: 1600 };

export function calcArtillery(distance, factionKey) {
    const d = Number(distance);
    if (!Number.isFinite(d) || d <= 0) return { error: "Please enter a valid distance" };
    if (d < ARTILLERY_BOUNDS.min || d > ARTILLERY_BOUNDS.max) {
        return { error: `Enter a distance between ${ARTILLERY_BOUNDS.min}m and ${ARTILLERY_BOUNDS.max}m` };
    }
    const c = ARTILLERY_COEFFS[factionKey] || ARTILLERY_COEFFS.usa;
    const mills = Math.round(c.m * d + c.b);
    return { mills, text: `${mills} mills`, factionName: c.name };
}

const SPA_TYPES = {
    us_sov: { min: 200, max: 600, name: "USA / Soviet Union", base: function (d) { return 0.665429 * (d - 49.6779); } },
    ger: { min: 200, max: 500, name: "Germany", base: function (d) { return 0.887 * (d - 87.5986); } },
    churchill_avre: { min: 100, max: 250, name: "British Churchill AVRE", base: function (d) { return 1.04 * (d - 3.84615); } },
    bishop: { min: 200, max: 800, name: "British Bishop", base: function (d) { return 0.19504 * (56.8058 + d); } }
};

const SPA_ALIASES = { usa: "us_sov", churchill: "churchill_avre" };

export function getSPATypes() {
    return Object.keys(SPA_TYPES).map(function (key) {
        return { key, name: SPA_TYPES[key].name, min: SPA_TYPES[key].min, max: SPA_TYPES[key].max };
    });
}

export function getSPATypeName(typeKey) {
    const key = SPA_ALIASES[typeKey] || typeKey;
    return SPA_TYPES[key] ? SPA_TYPES[key].name : typeKey;
}

/**
 * @param sign "+" subtracts mills from solution (default), "-" adds (inverted pitch logic)
 */
export function calcSPA(distance, typeKey, terrainAdjustment, sign) {
    const key = SPA_ALIASES[typeKey] || typeKey;
    const cfg = SPA_TYPES[key];
    if (!cfg) return { error: "Unknown SPA type" };
    const d = Number(distance);
    if (!Number.isFinite(d) || d <= 0) return { error: "Please enter a valid distance" };
    if (d < cfg.min || d > cfg.max) {
        return { error: `For this SPA type, enter a distance between ${cfg.min}m and ${cfg.max}m` };
    }
    const terrain = parseFloat(terrainAdjustment) || 0;
    const adjustmentSign = sign === "+" ? -1 : 1;
    const mills = Math.round(cfg.base(d) + terrain * adjustmentSign);
    return { mills, text: `${mills} mills`, typeName: cfg.name };
}

export const MORTAR_BOUNDS = { min: 100, max: 450 };

export function calcMortar(distance) {
    const d = Number(distance);
    if (!Number.isFinite(d) || d <= 0) return { error: "Please enter a valid distance" };
    if (d < MORTAR_BOUNDS.min || d > MORTAR_BOUNDS.max) {
        return { error: `Enter a distance between ${MORTAR_BOUNDS.min}m and ${MORTAR_BOUNDS.max}m` };
    }
    const mills = Math.round(109.466 - 0.243359 * d);
    return { mills, text: `${mills} mills` };
}

/* ---------------- Tiny localStorage history helper ---------------- */
export function makeHistory(storageKey, maxEntries) {
    maxEntries = maxEntries || 3;
    function read() {
        try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
        catch (e) { return []; }
    }
    function write(list) {
        try { localStorage.setItem(storageKey, JSON.stringify(list.slice(0, maxEntries))); } catch (e) {}
    }
    return {
        all: read,
        add: function (entry) {
            const list = read();
            list.unshift(Object.assign({ id: Date.now(), timestamp: new Date().toLocaleString() }, entry));
            write(list);
            return read();
        },
        remove: function (id) {
            write(read().filter(function (e) { return e.id !== id; }));
            return read();
        }
    };
}
