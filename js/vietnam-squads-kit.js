/**
 * Squads markdown → per-role equipment kits.
 * Source of truth for *which* items a class can take.
 * Dump JSON still supplies item weights / ammo / progression capacity.
 */

const SQUADS_MD = "/data/HLLV-Vietnam-loadouts-source.md";

const ROLE_ALIASES = {
    commander: "ArmyCommander",
    "squad leader": "SquadLeader",
    rifleman: "Rifleman",
    medic: "Medic",
    specialist: "Specialist",
    "machine gunner": "HeavyMachineGunner",
    grenadier: "Grenadier",
    engineer: "Engineer",
    "tank commander": "TankCommander",
    crewman: "Crewman",
    spotter: "Spotter",
    sniper: "Sniper",
    observer: "MortarObserver",
    support: "MortarSupport",
    gunner: "MortarGunner",
    pilot: "HelicopterPilot",
    "logistics officer": "HelicopterLogisticsOfficer"
};

const EQUIP_SECTION = /^(Weapons|Utility equipment|Lethal equipment|Role equipment)\s*:$/i;

function sectionKind(label) {
    const t = String(label || "").toLowerCase();
    if (t.indexOf("lethal") === 0) return "lethal";
    if (t.indexOf("utility") === 0) return "utility";
    if (t.indexOf("role") === 0) return "roleEquipment";
    if (t.indexOf("weapon") === 0) return "weapons";
    return null;
}

/** Explicit Squads-name → preferred dump id (per faction when needed). */
const NAME_ALIASES = {
    "m16a1 with bayonet": "M16A1_Bayonet",
    "m16a1-m203": "M203",
    "m1911a1": "1911A1",
    "model 77e": "Model_77E_Shotgun",
    "m61 frag grenade": "M61",
    "m61 frag grenade x2": "M61x2",
    "m61 frag grenade x3": "M61x3",
    "m18 smoke grenade": "M18_Smoke",
    "m18 smoke grenade x2": "M18_Smokex2",
    "m18 smoke grenade x3": "M18_Smokex3",
    "m18 claymore": "M18_Claymore",
    "m18 claymore x2": "M18_Claymorex2",
    "m183 demolition charge": "M183_Demo",
    "m21 at mine": "WFL_M21_AT",
    "m21 at mine x2": "WFL_M21_ATx2",
    "m2a1-7": "M2_FlameThrower",
    "m3 knife": "M3_Knife",
    "m3 binoculars": "WFL_USBinoculars",
    binoculars: "WFL_NVABinoculars",
    "an-m8 flare": "WFL_US_Flare",
    "chi com signal pistol": "WFL_NVAFlare",
    "blow torch": null, /* faction-resolved */
    "field pad": null,
    bandage: null,
    revive: null,
    "medical supplies": null,
    "medical supplies box": null,
    "small ammo box": "WFL_USAmmonbox",
    "small ammunition box": "WFL_USAmmonbox",
    "explosive ammo box": "WFL_USHEAmmoBox",
    "he ammo box": "WFL_NVAHEAmmoBox",
    "ammo box": "WFL_NVAAmmoBox",
    supplies: null,
    hammer: null,
    wrench: null,
    "type 53": "Type53_Bayonet",
    "type 53 w/ bayonet": "Type53_Bayonet",
    "type 53 w/bayonet": "Type53_Bayonet",
    "type 53 pu": "Type53_PU",
    "type 53 w/ n4 rifle launcher": "N4_Rifle_Launcher",
    "type 56 w/ bayonet": "Type56_AK_Bayonet",
    "k50m drum": "K50M_Drum",
    "rdg-1": "WFL_RDG1",
    "rdg-1 x2": "WFL_RDG1x2",
    "rdg-1 x3": "WFL_RDG1x3",
    "dh10 ap mine": "DH10_AP",
    "dh10 ap mine x2": "DH10_APx2",
    "tm-46 at mine": "TM-46",
    "tm-46 at mine x2": "TM-46x2",
    "type 67": "Type67",
    "type 67 x2": "Type67x2",
    "type 67 x3": "Type67x3",
    "satchel charge": "WFL_NVASatchel",
    "rpg-02": "RPG2",
    knife: "NVA_Knife",
    "light mortar": "USLightMortar"
};

function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/[^a-z0-9+./]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function sliceFaction(md, startMarker, endMarker) {
    const lines = md.split(/\r?\n/);
    let start = -1;
    let end = lines.length;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === startMarker.trim()) {
            start = i + 1;
            break;
        }
    }
    if (start === -1) return "";
    if (endMarker) {
        for (let i = start; i < lines.length; i++) {
            if (lines[i].trim() === endMarker.trim()) {
                end = i;
                break;
            }
        }
    }
    return lines.slice(start, end).join("\n");
}

function roleIdFromHeading(full) {
    const name = full.replace(/\s*\([^)]+\)\s*$/, "").trim();
    return ROLE_ALIASES[norm(name)] || null;
}

function isMetaLine(t) {
    if (!t) return true;
    if (/^none$/i.test(t)) return true;
    if (/^default unlocked$/i.test(t)) return true;
    if (/^unlocked role level\s+\d+/i.test(t)) return true;
    if (/^(primary|secondary)(,|\s|$)/i.test(t)) return true;
    if (/^(lethal|utility|equipment|role equipment)\b/i.test(t) && /,/.test(t)) return true;
    if (/grenade launcher/i.test(t) && /,/.test(t)) return true;
    /* Tag rows: "Primary, Rifle, Auto, Semi-Auto" / "Secondary, Launcher" */
    if (/,/.test(t) && /^(primary|secondary|rifle|pistol|shotgun|launcher|automatic|semi-auto|break action|pump)/i.test(t)) {
        return true;
    }
    return false;
}

function parseUnlockLevel(text, fallback) {
    const m = String(text || "").match(/unlocked role level\s+(\d+)/i);
    if (m) return Math.max(1, Number(m[1]) || 1);
    if (/default unlocked/i.test(text || "")) return 1;
    return fallback;
}

function stripUnlockSuffix(name) {
    return String(name || "")
        .replace(/\s*\(unlocked role level\s+\d+\)\s*$/i, "")
        .trim();
}

/**
 * Parse one faction block into { roleId: [{ name, unlockLevel }] }
 */
function parseFactionKits(block) {
    const lines = block.split(/\r?\n/);
    const kits = {};
    let roleId = null;
    let section = null;
    let pendingName = null;
    let pendingUnlock = 1;

    function flushPending() {
        if (!roleId || !pendingName) {
            pendingName = null;
            return;
        }
        if (!kits[roleId]) kits[roleId] = [];
        const list = kits[roleId];
        const key = norm(pendingName);
        const exists = list.some(function (e) { return norm(e.name) === key; });
        if (!exists) {
            list.push({
                name: pendingName,
                unlockLevel: pendingUnlock,
                section: section
            });
        }
        pendingName = null;
        pendingUnlock = 1;
    }

    lines.forEach(function (raw) {
        const line = raw.replace(/\s+$/, "");
        const t = line.trim();

        const roleHead = t.match(/^##\s+(.+)$/);
        if (roleHead && !t.startsWith("###")) {
            flushPending();
            roleId = roleIdFromHeading(roleHead[1]);
            section = null;
            return;
        }

        if (!roleId) return;

        if (/^###\s+/.test(t)) {
            flushPending();
            section = null;
            return;
        }

        if (EQUIP_SECTION.test(t)) {
            flushPending();
            section = sectionKind(t.replace(/:$/, ""));
            return;
        }

        if (/:$/.test(t)) {
            flushPending();
            section = null;
            return;
        }

        if (!section || !t) return;

        if (/^unlocked role level\s+\d+/i.test(t) || /^default unlocked$/i.test(t)) {
            if (pendingName) {
                pendingUnlock = parseUnlockLevel(t, pendingUnlock);
                flushPending();
            }
            return;
        }

        if (isMetaLine(t)) return;

        flushPending();
        const unlockInline = parseUnlockLevel(t, null);
        pendingName = stripUnlockSuffix(t);
        pendingUnlock = unlockInline != null ? unlockInline : 1;
        if (unlockInline != null) flushPending();
    });
    flushPending();
    return kits;
}

export function parseSquadsMarkdown(md) {
    const us = parseFactionKits(sliceFaction(md, "# US", "# NVA"));
    const nva = parseFactionKits(sliceFaction(md, "# NVA", null));
    return { US: us, NVA: nva };
}

function resolveSpecialName(factionId, roleId, key) {
    if (key === "bandage") {
        return roleId === "Medic"
            ? (factionId === "US" ? "WFL_USBandage_Medic" : "WFL_NVABandage_Medic")
            : (factionId === "US" ? "WFL_USBandage" : "WFL_NVABandage");
    }
    if (key === "field pad") {
        return roleId === "ArmyCommander"
            ? (factionId === "US" ? "WFL_USFieldPadCommander" : "WFL_NVAFieldPadCommander")
            : (factionId === "US" ? "WFL_USFieldPad" : "WFL_NVAFieldPad");
    }
    if (key === "blow torch") {
        return factionId === "US" ? "USTorch" : "RUSTorch";
    }
    if (key === "revive") {
        return factionId === "US" ? "WFL_USMedicKit" : "WFL_NVAMedicKit";
    }
    if (key === "medical supplies" || key === "medical supplies box") {
        return factionId === "US" ? "WFL_USMedicAmmoBox" : "NVA_MedicAmmoBox";
    }
    if (key === "supplies") {
        return factionId === "US" ? "WFL_USSupply" : "WFL_NVASupply";
    }
    if (key === "hammer") {
        return factionId === "US" ? "WFL_USHAmmer" : "WFL_NVAHammer";
    }
    if (key === "binoculars") {
        return factionId === "US" ? "WFL_USBinoculars" : "WFL_NVABinoculars";
    }
    if (key === "wrench") {
        if (roleId === "MortarGunner") {
            return factionId === "US" ? "WFL_USMortarWrench" : "NVA_MortarWrench";
        }
        return factionId === "US" ? "WFL_USWrench" : "NVA_Wrench";
    }
    return null;
}

function displayKey(item) {
    return norm(item.DisplayName || item.id || "");
}

/**
 * Map a Squads item name to a dump weapon id for this faction/role.
 */
export function resolveItemId(factionWeapons, factionId, roleId, squadsName) {
    const key = norm(squadsName);
    if (!key) return null;

    const special = resolveSpecialName(factionId, roleId, key);
    if (special && factionWeapons[special]) return special;

    const aliased = NAME_ALIASES[key];
    if (aliased && factionWeapons[aliased]) return aliased;

    /* Direct id hit */
    if (factionWeapons[squadsName]) return squadsName;

    let best = null;
    let bestScore = 0;
    Object.keys(factionWeapons).forEach(function (id) {
        if (id === "DEBUG_WEAPON") return;
        const item = factionWeapons[id];
        const dn = displayKey(item);
        if (!dn) return;
        let score = 0;
        if (dn === key) score = 100;
        else if (dn.replace(/\s+/g, "") === key.replace(/\s+/g, "")) score = 95;
        else if (dn.indexOf(key) === 0 || key.indexOf(dn) === 0) score = 80;
        else if (dn.indexOf(key) !== -1 || key.indexOf(dn) !== -1) score = 60;
        if (score > bestScore) {
            bestScore = score;
            best = id;
        }
    });
    return bestScore >= 60 ? best : null;
}

/**
 * Attach resolved itemIds onto kits using faction weapon tables.
 * Returns { kits, unmatched: [{faction, role, name}] }
 */
export function bindKitsToDump(parsed, factions) {
    const unmatched = [];
    const bound = { US: {}, NVA: {} };
    ["US", "NVA"].forEach(function (factionId) {
        const weapons = (factions[factionId] && factions[factionId].weapons) || {};
        const roles = parsed[factionId] || {};
        Object.keys(roles).forEach(function (roleId) {
            const entries = [];
            (roles[roleId] || []).forEach(function (row) {
                const id = resolveItemId(weapons, factionId, roleId, row.name);
                if (!id) {
                    unmatched.push({ faction: factionId, role: roleId, name: row.name });
                    return;
                }
                /* Prefer lowest unlock if duplicate ids */
                const prev = entries.find(function (e) { return e.itemId === id; });
                if (prev) {
                    prev.unlockLevel = Math.min(prev.unlockLevel, row.unlockLevel);
                    return;
                }
                entries.push({
                    itemId: id,
                    name: row.name,
                    unlockLevel: Math.max(1, Number(row.unlockLevel) || 1),
                    section: row.section || null
                });
            });
            bound[factionId][roleId] = entries;
        });
    });
    return { kits: bound, unmatched: unmatched };
}

export async function loadSquadsKits(factions) {
    const res = await fetch(SQUADS_MD);
    if (!res.ok) throw new Error("Failed to load Squads loadouts");
    const md = await res.text();
    const parsed = parseSquadsMarkdown(md);
    return bindKitsToDump(parsed, factions);
}

export function getRoleKit(kits, factionId, roleId) {
    if (!kits || !kits[factionId]) return null;
    return kits[factionId][roleId] || null;
}

export function kitUnlockLevel(kits, factionId, roleId, itemId) {
    const kit = getRoleKit(kits, factionId, roleId);
    if (!kit) return null;
    for (let i = 0; i < kit.length; i++) {
        if (kit[i].itemId === itemId) return kit[i].unlockLevel;
    }
    return null;
}
