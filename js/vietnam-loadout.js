/* Vietnam loadout engine — weights/progression from data/vietnam/*.json;
   class equipment lists from Squads markdown (HLLV-Vietnam-loadouts-source.md). */

import {
    loadSquadsKits,
    getRoleKit,
    kitUnlockLevel
} from "./vietnam-squads-kit.js";

const DATA_BASE = "/data/vietnam";
const IGNORE_ITEM_IDS = { DEBUG_WEAPON: true };

let cache = null;

function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export async function loadVietnamLoadoutData() {
    if (cache) return cache;
    const [us, nva, progression, rolesDoc, meta] = await Promise.all([
        fetch(DATA_BASE + "/faction_US.json").then(function (r) { return r.json(); }),
        fetch(DATA_BASE + "/faction_NVA.json").then(function (r) { return r.json(); }),
        fetch(DATA_BASE + "/progression.json").then(function (r) { return r.json(); }),
        fetch(DATA_BASE + "/roles.json").then(function (r) { return r.json(); }),
        fetch(DATA_BASE + "/meta.json").then(function (r) { return r.json(); })
    ]);
    const factions = { US: us, NVA: nva };
    let squadsKits = null;
    let squadsUnmatched = [];
    try {
        const bound = await loadSquadsKits(factions);
        squadsKits = bound.kits;
        squadsUnmatched = bound.unmatched || [];
        if (squadsUnmatched.length && typeof console !== "undefined") {
            console.warn("[vn-loadout] Squads items with no dump match:", squadsUnmatched);
        }
    } catch (err) {
        if (typeof console !== "undefined") {
            console.warn("[vn-loadout] Squads kit load failed; falling back to dump unlocks", err);
        }
    }
    cache = {
        factions: factions,
        progression: progression || {},
        roles: (rolesDoc && rolesDoc.roles) || [],
        meta: meta || {},
        squadsKits: squadsKits,
        squadsUnmatched: squadsUnmatched
    };
    return cache;
}

export function getMeta(data) {
    return (data && data.meta) || {};
}

export function getRoles(data, faction) {
    const list = (data && data.roles) || [];
    return list.filter(function (r) {
        return !faction || (r.factions || []).indexOf(faction) !== -1;
    });
}

export function getRoleMeta(data, roleId) {
    const list = (data && data.roles) || [];
    for (let i = 0; i < list.length; i++) {
        if (list[i].id === roleId) return list[i];
    }
    return null;
}

function progressionKeyForRole(data, roleId) {
    const meta = getRoleMeta(data, roleId);
    if (meta && meta.progressionKey) return meta.progressionKey;
    if (data.progression && data.progression[roleId]) return roleId;
    return "Default";
}

export function getProgression(data, roleId, level) {
    const key = progressionKeyForRole(data, roleId);
    const curves = data.progression || {};
    const curve = curves[key] || curves.Default || {};
    const unlocks = curve.LevelUnlocks || [];
    const idx = Math.max(0, Math.min(unlocks.length - 1, (Number(level) || 1) - 1));
    const row = unlocks[idx] || {};
    return {
        weightPoints: num(row.WeightPoints, 0),
        utilityCapacity: num(row.UtilityCapacity, 0),
        lethalCapacity: num(row.LethalCapacity, 0),
        enableAdditionalAmmo: !!row.bEnableAdditionalAmmo,
        unlockSecondary: !!row.bUnlockSecondarySlot,
        level: idx + 1,
        maxLevel: unlocks.length || 10
    };
}

export function getFaction(data, factionId) {
    return (data && data.factions && data.factions[factionId]) || null;
}

export function getItem(data, factionId, itemId) {
    if (!itemId || IGNORE_ITEM_IDS[itemId]) return null;
    const faction = getFaction(data, factionId);
    if (!faction || !faction.weapons) return null;
    const item = faction.weapons[itemId];
    if (!item) return null;
    return Object.assign({ id: itemId }, item);
}

export function itemDisplayName(item) {
    if (!item) return "";
    const name = item.DisplayName || item.id || "";
    return String(name).replace(/_/g, " ").trim();
}

function tagsOf(item) {
    return (item && item.Tags) || [];
}

export function isBandage(item) {
    if (!item) return false;
    const name = (item.DisplayName || item.id || "").toLowerCase();
    return /bandage/.test(name);
}

export function isFieldPad(item) {
    if (!item) return false;
    const name = (item.DisplayName || item.id || "").toLowerCase();
    return /field\s*pad/.test(name);
}

/** Self-heal items: NVA Bandage and US Field Pad (same role in loadouts). */
export function isHealItem(item) {
    return isBandage(item) || isFieldPad(item);
}

export function itemSlot(item) {
    const tags = tagsOf(item);
    if (tags.indexOf("Primary") !== -1) return "primary";
    if (tags.indexOf("Secondary") !== -1) return "secondary";
    if (tags.indexOf("Lethal") !== -1) return "lethal";
    /* Heal kits occupy the dedicated heal / utility slot in the builder */
    if (isHealItem(item)) return "utility";
    /* Role Equipment before Utility — hammer/supplies are dual-tagged */
    if (tags.indexOf("Role Equipment") !== -1) return "roleEquipment";
    if (tags.indexOf("Utility") !== -1) return "utility";
    if (tags.indexOf("Melee") !== -1) return "melee";
    return null;
}

export function countsTowardWeight(item) {
    if (!item) return false;
    const slot = itemSlot(item);
    if (slot === "melee") return false;
    return slot === "primary" || slot === "secondary" || slot === "lethal" ||
        slot === "utility" || slot === "roleEquipment";
}

export function roleUnlockLevel(item, roleId, data, factionId) {
    if (!item) return null;
    /* Squads markdown is source of truth for class equipment lists */
    if (data && data.squadsKits && factionId) {
        const kit = getRoleKit(data.squadsKits, factionId, roleId);
        if (kit) {
            const lvl = kitUnlockLevel(data.squadsKits, factionId, roleId, item.id);
            return lvl;
        }
    }
    const map = item.RolesLevelRequirement || {};
    const keys = Object.keys(map);
    if (keys.length === 0) {
        const all = num(item.AllRolesLevelRequirement, 0);
        return all;
    }
    if (!Object.prototype.hasOwnProperty.call(map, roleId)) return null;
    return num(map[roleId], 0);
}

export function isItemUnlockedForRole(item, roleId, level, data, factionId) {
    const req = roleUnlockLevel(item, roleId, data, factionId);
    if (req === null) return false;
    /* When Squads kit is active, unlock level is absolute (no dump AllRoles floor) */
    if (data && data.squadsKits && factionId && getRoleKit(data.squadsKits, factionId, roleId)) {
        return (Number(level) || 1) >= req;
    }
    const floor = num(item.AllRolesLevelRequirement, 0);
    const need = Math.max(req, floor);
    return (Number(level) || 1) >= need;
}

function matchesSlot(item, slot) {
    const s = itemSlot(item);
    if (slot === "roleEquipment") {
        return s === "roleEquipment" || (tagsOf(item).indexOf("Role Equipment") !== -1);
    }
    return s === slot;
}

export function getAvailableItems(data, factionId, roleId, level, slot) {
    const faction = getFaction(data, factionId);
    if (!faction || !faction.weapons) return [];
    const out = [];
    const kit = data && data.squadsKits ? getRoleKit(data.squadsKits, factionId, roleId) : null;

    if (kit) {
        kit.forEach(function (entry) {
            if (IGNORE_ITEM_IDS[entry.itemId]) return;
            const raw = faction.weapons[entry.itemId];
            if (!raw) return;
            const item = Object.assign({ id: entry.itemId }, raw);
            /* Squads section wins for utility / lethal / role gear; weapons still use dump tags */
            if (entry.section === "utility" || entry.section === "lethal" || entry.section === "roleEquipment") {
                if (entry.section !== slot) return;
            } else if (!matchesSlot(item, slot)) {
                return;
            }
            const unlocked = (Number(level) || 1) >= entry.unlockLevel;
            out.push({
                item: item,
                unlocked: unlocked,
                unlockLevel: entry.unlockLevel
            });
        });
    } else {
        Object.keys(faction.weapons).forEach(function (id) {
            if (IGNORE_ITEM_IDS[id]) return;
            const item = Object.assign({ id: id }, faction.weapons[id]);
            if (!matchesSlot(item, slot)) return;
            const unlocked = isItemUnlockedForRole(item, roleId, level, data, factionId);
            const req = roleUnlockLevel(item, roleId, data, factionId);
            out.push({
                item: item,
                unlocked: unlocked,
                unlockLevel: req === null ? null : Math.max(req, num(item.AllRolesLevelRequirement, 0))
            });
        });
    }

    out.sort(function (a, b) {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const la = a.unlockLevel == null ? 999 : a.unlockLevel;
        const lb = b.unlockLevel == null ? 999 : b.unlockLevel;
        if (la !== lb) return la - lb;
        return itemDisplayName(a.item).localeCompare(itemDisplayName(b.item));
    });
    return out;
}

export function clampAmmo(item, ammo, enableAdditionalAmmo) {
    if (!item) return 0;
    const base = num(item.BaseAmmo, 1);
    const max = num(item.MaxAmmo, base);
    let a = num(ammo, base);
    if (!enableAdditionalAmmo) a = base;
    if (a < base) a = base;
    if (a > max) a = max;
    return a;
}

export function itemCost(item, ammo, enableAdditionalAmmo) {
    if (!item || !countsTowardWeight(item)) return 0;
    /* Heal kits: 1 weight per charge (×1 = 1, ×2 = 2, …) */
    if (isHealItem(item)) {
        const a = clampHealAmmo(item, ammo);
        const per = num(item.AmmoWeight, 0) || num(item.ItemWeight, 1) || 1;
        return a * per;
    }
    const base = num(item.BaseAmmo, 1);
    const a = clampAmmo(item, ammo, enableAdditionalAmmo);
    const weight = num(item.ItemWeight, 0);
    const ammoW = num(item.AmmoWeight, 0);
    return weight + Math.max(0, a - base) * ammoW;
}

export function emptyLoadoutState(factionId, roleId, level) {
    return {
        faction: factionId || "US",
        role: roleId || "Rifleman",
        level: Number(level) || 1,
        primary: null,
        secondary: null,
        lethal: [],
        utility: [],
        roleEquipment: [],
        bandage: null,
        ammo: {}
    };
}

function equippedEntries(state) {
    const list = [];
    if (state.primary) list.push({ id: state.primary, kind: "primary" });
    if (state.secondary) list.push({ id: state.secondary, kind: "secondary" });
    (state.lethal || []).forEach(function (id) { if (id) list.push({ id: id, kind: "lethal" }); });
    (state.utility || []).forEach(function (id) { if (id) list.push({ id: id, kind: "utility" }); });
    (state.roleEquipment || []).forEach(function (id) { if (id) list.push({ id: id, kind: "roleEquipment" }); });
    /* Bandage always-on when not already placed in a utility slot */
    if (state.bandage) {
        const inUtility = (state.utility || []).indexOf(state.bandage) !== -1;
        if (!inUtility) list.push({ id: state.bandage, kind: "bandage" });
    }
    return list;
}

export function totalWeight(data, state) {
    const prog = getProgression(data, state.role, state.level);
    let total = 0;
    equippedEntries(state).forEach(function (e) {
        const item = getItem(data, state.faction, e.id);
        if (!item) return;
        const ammo = state.ammo && state.ammo[e.id] != null ? state.ammo[e.id] : num(item.BaseAmmo, 1);
        total += itemCost(item, ammo, prog.enableAdditionalAmmo);
    });
    return total;
}

export function validateLoadout(data, state) {
    const errors = [];
    const prog = getProgression(data, state.role, state.level);

    if (state.secondary && !prog.unlockSecondary) {
        errors.push({ code: "secondary_locked", message: "Secondary slot unlocks at level 2" });
    }

    if ((state.lethal || []).filter(Boolean).length > prog.lethalCapacity) {
        errors.push({ code: "lethal_capacity", message: "Too many lethal items for this level" });
    }
    if ((state.utility || []).filter(Boolean).length > prog.utilityCapacity) {
        errors.push({ code: "utility_capacity", message: "Too many utility items for this level" });
    }

    equippedEntries(state).forEach(function (e) {
        const item = getItem(data, state.faction, e.id);
        if (!item) {
            errors.push({ code: "missing_item", message: "Item no longer exists: " + e.id, itemId: e.id });
            return;
        }
        if (!isItemUnlockedForRole(item, state.role, state.level, data, state.faction)) {
            const need = roleUnlockLevel(item, state.role, data, state.faction);
            errors.push({
                code: "locked_item",
                message: itemDisplayName(item) + " unlocks at level " + (need == null ? "?" : need),
                itemId: e.id
            });
        }
        const kitSlot = (function () {
            const kit = data && data.squadsKits ? getRoleKit(data.squadsKits, state.faction, state.role) : null;
            if (!kit) return null;
            for (let i = 0; i < kit.length; i++) {
                if (kit[i].itemId !== e.id) continue;
                const s = kit[i].section;
                if (s === "utility" || s === "lethal" || s === "roleEquipment") return s;
            }
            return null;
        })();
        const slot = kitSlot || itemSlot(item);
        if (e.kind === "primary" && slot !== "primary") {
            errors.push({ code: "wrong_slot", message: itemDisplayName(item) + " is not a primary", itemId: e.id });
        }
        if (e.kind === "secondary" && slot !== "secondary") {
            errors.push({ code: "wrong_slot", message: itemDisplayName(item) + " is not a secondary", itemId: e.id });
        }
        if (e.kind === "lethal" && slot !== "lethal") {
            errors.push({ code: "wrong_slot", message: itemDisplayName(item) + " is not lethal", itemId: e.id });
        }
        if (e.kind === "utility" && slot !== "utility") {
            errors.push({ code: "wrong_slot", message: itemDisplayName(item) + " is not utility", itemId: e.id });
        }
        if (e.kind === "roleEquipment" && slot !== "roleEquipment") {
            errors.push({ code: "wrong_slot", message: itemDisplayName(item) + " is not role equipment", itemId: e.id });
        }
    });

    const used = totalWeight(data, state);
    if (used > prog.weightPoints) {
        errors.push({
            code: "overweight",
            message: "Loadout is " + used + "/" + prog.weightPoints + " weight"
        });
    }

    return { ok: errors.length === 0, errors: errors, used: used, capacity: prog.weightPoints, progression: prog };
}

/** Would equipping this item (replacing slot contents) exceed weight? */
export function wouldExceedWeight(data, state, nextState) {
    const v = validateLoadout(data, nextState);
    return v.errors.some(function (e) { return e.code === "overweight"; });
}

export function serializePreset(state, name) {
    return {
        id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
        name: name || "Preset",
        faction: state.faction,
        role: state.role,
        level: state.level,
        slots: {
            primary: state.primary || null,
            secondary: state.secondary || null,
            lethal: (state.lethal || []).slice(),
            utility: (state.utility || []).slice(),
            roleEquipment: (state.roleEquipment || []).slice(),
            bandage: state.bandage || null
        },
        ammo: Object.assign({}, state.ammo || {}),
        updatedAt: new Date().toISOString()
    };
}

export function applyPresetToState(preset) {
    if (!preset) return emptyLoadoutState("US", "Rifleman", 1);
    const slots = preset.slots || {};
    return {
        faction: preset.faction || "US",
        role: preset.role || "Rifleman",
        level: Number(preset.level) || 1,
        primary: slots.primary || null,
        secondary: slots.secondary || null,
        lethal: (slots.lethal || []).slice(),
        utility: (slots.utility || []).slice(),
        roleEquipment: (slots.roleEquipment || []).slice(),
        bandage: slots.bandage || null,
        ammo: Object.assign({}, preset.ammo || {})
    };
}

export function defaultStarterLoadout(data, factionId, roleId, level) {
    const state = emptyLoadoutState(factionId, roleId, level);
    const prog = getProgression(data, roleId, level);
    /* Heal is optional — only "Make me a loadout" auto-equips it */
    const primaries = getAvailableItems(data, factionId, roleId, level, "primary").filter(function (x) { return x.unlocked; });
    if (primaries.length) {
        const next = cloneLoadout(state);
        next.primary = primaries[0].item.id;
        next.ammo[next.primary] = num(primaries[0].item.BaseAmmo, 1);
        if (!validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) {
            state.primary = next.primary;
            state.ammo = next.ammo;
        }
    }
    if (prog.unlockSecondary) {
        const secs = getAvailableItems(data, factionId, roleId, level, "secondary").filter(function (x) { return x.unlocked; });
        if (secs.length) {
            const next = cloneLoadout(state);
            next.secondary = secs[0].item.id;
            next.ammo[next.secondary] = num(secs[0].item.BaseAmmo, 1);
            if (!validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) {
                state.secondary = next.secondary;
                state.ammo = next.ammo;
            }
        }
    }
    return state;
}

function tagsInclude(item, tag) {
    return tagsOf(item).indexOf(tag) !== -1;
}

/** Rocket AT tubes (M72 / RPG) — not underbarrel / rifle grenade launchers. */
export function isRocketLauncher(item) {
    if (!item) return false;
    return tagsInclude(item, "Launcher") && !tagsInclude(item, "Grenade Launcher");
}

function baseCost(item) {
    return itemCost(item, num(item.BaseAmmo, 1), false);
}

function remainingBudget(data, state) {
    const prog = getProgression(data, state.role, state.level);
    return prog.weightPoints - totalWeight(data, state);
}

function trySetWeapon(data, state, kind, item) {
    if (!item) return false;
    const next = cloneLoadout(state);
    const prog = getProgression(data, state.role, state.level);
    const ammo = clampAmmo(item, item.BaseAmmo, prog.enableAdditionalAmmo);
    if (kind === "primary") {
        next.primary = item.id;
        next.ammo[item.id] = ammo;
    } else if (kind === "secondary") {
        if (!prog.unlockSecondary) return false;
        next.secondary = item.id;
        next.ammo[item.id] = ammo;
    } else {
        return false;
    }
    if (validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) return false;
    state.primary = next.primary;
    state.secondary = next.secondary;
    state.ammo = next.ammo;
    return true;
}

function tryPushSlot(data, state, kind, item) {
    if (!item) return false;
    const next = cloneLoadout(state);
    const prog = getProgression(data, state.role, state.level);
    if (kind === "lethal") {
        if (next.lethal.filter(Boolean).length >= prog.lethalCapacity) return false;
        next.lethal.push(item.id);
    } else if (kind === "utility") {
        if (next.utility.filter(Boolean).length >= prog.utilityCapacity) return false;
        next.utility.push(item.id);
    } else if (kind === "roleEquipment") {
        next.roleEquipment.push(item.id);
    } else {
        return false;
    }
    if (validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) return false;
    state.lethal = next.lethal;
    state.utility = next.utility;
    state.roleEquipment = next.roleEquipment;
    return true;
}

function cloneLoadout(state) {
    return {
        faction: state.faction,
        role: state.role,
        level: state.level,
        primary: state.primary,
        secondary: state.secondary,
        lethal: (state.lethal || []).slice(),
        utility: (state.utility || []).slice(),
        roleEquipment: (state.roleEquipment || []).slice(),
        bandage: state.bandage || null,
        ammo: Object.assign({}, state.ammo || {})
    };
}

function unlockedItems(data, factionId, roleId, level, slot) {
    return getAvailableItems(data, factionId, roleId, level, slot)
        .filter(function (x) { return x.unlocked; })
        .map(function (x) { return x.item; });
}

function pickBestFitting(items, budget, scoreFn) {
    let best = null;
    let bestScore = -Infinity;
    items.forEach(function (item) {
        const cost = baseCost(item);
        if (cost > budget) return;
        const score = scoreFn(item, cost, budget);
        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    });
    return best;
}

function scorePrimary(item, cost, budget) {
    let score = 0;
    const tags = tagsOf(item);
    if (tags.indexOf("Rifle") !== -1) score += 40;
    if (tags.indexOf("Automatic") !== -1) score += 12;
    if (tags.indexOf("Machine Gun") !== -1) score += 35;
    if (tags.indexOf("Sniper") !== -1) score += 30;
    if (tags.indexOf("Shotgun") !== -1) score += 18;
    if (tags.indexOf("Incendiary Weapon") !== -1) score += 10;
    if (tags.indexOf("Grenade Launcher") !== -1) score += 8;
    /* Prefer filling weight without overflowing later slots: denser is better when under budget */
    score += Math.min(cost, budget) * 2;
    score += (num(item.BaseAmmo, 0) * 0.5);
    return score;
}

function scoreSecondary(item, cost, budget) {
    if (isRocketLauncher(item)) return 1000 + cost;
    let score = 10;
    if (tagsInclude(item, "Grenade Launcher")) score += 25;
    if (tagsInclude(item, "Pistol")) score += 15;
    score += Math.min(cost, budget);
    return score;
}

function scoreLethal(item, cost, budget) {
    let score = cost * 3;
    const name = (item.DisplayName || item.id || "").toLowerCase();
    if (/satchel|demo|demolition/.test(name)) score += 20;
    if (/mine|claymore|at /.test(name)) score += 16;
    if (/x3/.test(name)) score += 12;
    if (/x2/.test(name)) score += 8;
    if (/frag|grenade/.test(name)) score += 6;
    score += Math.min(cost, budget) * 0.5;
    return score;
}

function scoreUtility(item, cost, budget) {
    let score = cost * 2.5;
    const name = (item.DisplayName || item.id || "").toLowerCase();
    if (/ammo/.test(name)) score += 18;
    if (/smoke/.test(name)) score += 14;
    if (/x3/.test(name)) score += 10;
    if (/x2/.test(name)) score += 7;
    if (/torch|flare|supply/.test(name)) score += 8;
    score += Math.min(cost, budget) * 0.5;
    return score;
}

function scoreRoleEquipment(item, cost, budget) {
    let score = 5;
    const name = (item.DisplayName || item.id || "").toLowerCase();
    if (/binocular/.test(name)) score += 30;
    if (/hammer/.test(name)) score += 22;
    if (/ammo|supply|medic|revive/.test(name)) score += 18;
    if (/wrench|field pad|watch/.test(name)) score += 12;
    score += Math.min(cost, budget);
    return score;
}

function spendAmmoBudget(data, state) {
    const prog = getProgression(data, state.role, state.level);
    const order = [state.bandage, state.primary, state.secondary].filter(Boolean);
    let guard = 0;
    while (guard++ < 40) {
        let improved = false;
        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const item = getItem(data, state.faction, id);
            if (!item) continue;
            const heal = isHealItem(item);
            if (!heal && !prog.enableAdditionalAmmo) continue;
            const cur = heal ? clampHealAmmo(item, state.ammo[id]) : clampAmmo(item, state.ammo[id], true);
            const max = num(item.MaxAmmo, cur);
            if (cur >= max) continue;
            const next = cloneLoadout(state);
            next.ammo[id] = cur + 1;
            if (validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) continue;
            state.ammo[id] = next.ammo[id];
            improved = true;
            break;
        }
        if (!improved) break;
    }
}

function findHealItemForRole(data, factionId, roleId, level) {
    const faction = getFaction(data, factionId);
    if (!faction || !faction.weapons) return null;
    const heals = [];
    Object.keys(faction.weapons).forEach(function (id) {
        const item = Object.assign({ id: id }, faction.weapons[id]);
        if (!isHealItem(item)) return;
        if (!isItemUnlockedForRole(item, roleId, level, data, factionId)) return;
        heals.push(item);
    });
    if (!heals.length) {
        (faction.onAllLoadouts || []).forEach(function (id) {
            const item = getItem(data, factionId, id);
            if (item && isHealItem(item)) heals.push(item);
        });
    }
    if (!heals.length) return null;

    /* Prefer stackable heals (can reach 2+ charges). Field Pad in dumps is MaxAmmo 1. */
    const stackable = heals.filter(function (item) { return num(item.MaxAmmo, 1) >= 2; });
    const pool = stackable.length ? stackable : heals;
    const pads = pool.filter(isFieldPad);
    const bandages = pool.filter(isBandage);

    if (roleId === "Medic") {
        const medic = bandages.find(function (b) { return /medic/i.test(b.id); });
        if (medic) return medic;
    }

    /* NVA → Bandage naming; US → Field Pad if stackable exists, else Bandage */
    if (factionId === "NVA") {
        return bandages.find(function (b) { return !/medic/i.test(b.id); }) || bandages[0] || pads[0] || pool[0];
    }
    if (pads.length) {
        const standardPad = pads.find(function (b) { return !/commander/i.test(b.id); });
        return standardPad || pads[0];
    }
    return bandages.find(function (b) { return !/medic/i.test(b.id); }) || bandages[0] || pool[0];
}

/** Aim for at least 2 heal charges when the item supports it. */
function healTargetAmmo(item) {
    if (!item) return 1;
    const max = num(item.MaxAmmo, 1);
    return Math.min(2, max);
}

/** Heal kits: free adjust from 1..MaxAmmo (not gated by class additional-ammo). */
export function clampHealAmmo(item, ammo) {
    if (!item) return 0;
    const max = Math.max(1, num(item.MaxAmmo, 1));
    let a = num(ammo, healTargetAmmo(item));
    if (a < 1) a = 1;
    if (a > max) a = max;
    return a;
}

/** UI label: US stackable heal shows as Field Pad; NVA as Bandage. */
export function healDisplayName(item, factionId) {
    if (!item) return "";
    if (isBandage(item)) {
        if (factionId === "US") return "Field Pad";
        return itemDisplayName(item) || "Bandage";
    }
    return itemDisplayName(item);
}

/**
 * Build a strong loadout for the current class/level that fills toward max weight.
 * Always includes a bandage (at least 2 charges when possible).
 * If a rocket launcher (AT tube) is unlocked for the role, it is almost always taken in Secondary.
 */
export function buildSuggestedLoadout(data, factionId, roleId, level) {
    const prog = getProgression(data, roleId, level);
    const state = emptyLoadoutState(factionId, roleId, level);
    state.level = prog.level;

    const secondaries = unlockedItems(data, factionId, roleId, level, "secondary");
    const rockets = secondaries.filter(isRocketLauncher);
    const primaries = unlockedItems(data, factionId, roleId, level, "primary");
    const lethals = unlockedItems(data, factionId, roleId, level, "lethal");
    const utilities = unlockedItems(data, factionId, roleId, level, "utility").filter(function (item) {
        return !isHealItem(item);
    });
    const roleGear = unlockedItems(data, factionId, roleId, level, "roleEquipment");
    const bandage = findHealItemForRole(data, factionId, roleId, level);

    function lightestCost(items) {
        if (!items.length) return 0;
        let min = Infinity;
        items.forEach(function (item) {
            const c = baseCost(item);
            if (c < min) min = c;
        });
        return min === Infinity ? 0 : min;
    }

    function usedSet(list) {
        const map = {};
        (list || []).forEach(function (id) { if (id) map[id] = true; });
        return map;
    }

    function fillOne(kind, pool, scoreFn, keepAside) {
        const list = kind === "lethal" ? state.lethal
            : kind === "utility" ? state.utility
            : state.roleEquipment;
        const map = usedSet(list);
        const candidates = pool.filter(function (item) { return !map[item.id]; });
        const budget = remainingBudget(data, state) - (keepAside || 0);
        const pick = pickBestFitting(candidates, Math.max(0, budget), scoreFn)
            || pickBestFitting(candidates, remainingBudget(data, state), scoreFn);
        if (pick) tryPushSlot(data, state, kind, pick);
    }

    let bandageCost = 0;
    if (bandage) {
        const ammo = healTargetAmmo(bandage);
        bandageCost = itemCost(bandage, ammo, prog.enableAdditionalAmmo);
        state.bandage = bandage.id;
        state.ammo[bandage.id] = ammo;
        if (prog.utilityCapacity > 0) state.utility = [bandage.id];
    }

    const reserveLethal = prog.lethalCapacity > 0 ? lightestCost(lethals) : 0;
    const reserveExtraUtility = (prog.utilityCapacity > 1) ? lightestCost(utilities) : 0;
    const reserved = bandageCost + reserveLethal + reserveExtraUtility;

    if (prog.unlockSecondary && rockets.length) {
        const rocket = pickBestFitting(rockets, prog.weightPoints - reserved, scoreSecondary)
            || pickBestFitting(rockets, Math.max(0, prog.weightPoints - bandageCost), scoreSecondary);
        if (rocket) trySetWeapon(data, state, "secondary", rocket);
    }

    {
        const keep = bandageCost + reserveLethal + reserveExtraUtility;
        const primary = pickBestFitting(primaries, Math.max(0, remainingBudget(data, state) - (reserveLethal + reserveExtraUtility)), scorePrimary)
            || pickBestFitting(primaries, remainingBudget(data, state), scorePrimary);
        if (primary) trySetWeapon(data, state, "primary", primary);
        /* If primary ate the bandage budget, shed until bandage fits again */
        if (bandage) enforceMandatoryBandage(data, state, bandage);
    }

    if (prog.unlockSecondary && !state.secondary) {
        const keep = reserveLethal + reserveExtraUtility;
        const secondary = pickBestFitting(secondaries, Math.max(0, remainingBudget(data, state) - keep), scoreSecondary)
            || pickBestFitting(secondaries, remainingBudget(data, state), scoreSecondary);
        if (secondary) trySetWeapon(data, state, "secondary", secondary);
    }

    if (prog.lethalCapacity > 0) fillOne("lethal", lethals, scoreLethal, reserveExtraUtility);
    if (roleGear.length) fillOne("roleEquipment", roleGear, scoreRoleEquipment, 0);

    for (let i = state.lethal.filter(Boolean).length; i < prog.lethalCapacity; i++) {
        fillOne("lethal", lethals, scoreLethal, 0);
    }
    for (let i = state.utility.filter(Boolean).length; i < prog.utilityCapacity; i++) {
        fillOne("utility", utilities, scoreUtility, 0);
    }

    {
        const map = usedSet(state.roleEquipment);
        const sorted = roleGear.slice().sort(function (a, b) {
            return scoreRoleEquipment(b, baseCost(b), 99) - scoreRoleEquipment(a, baseCost(a), 99);
        });
        for (let i = 0; i < sorted.length; i++) {
            if (map[sorted[i].id]) continue;
            if (!tryPushSlot(data, state, "roleEquipment", sorted[i])) continue;
            map[sorted[i].id] = true;
        }
    }

    if (bandage) {
        state.bandage = bandage.id;
        if (prog.utilityCapacity > 0) {
            const hasBandage = (state.utility || []).some(function (id) {
                return id && isHealItem(getItem(data, factionId, id));
            });
            if (!hasBandage) {
                if (state.utility.length < prog.utilityCapacity) {
                    state.utility.unshift(bandage.id);
                    state.utility = state.utility.slice(0, prog.utilityCapacity);
                } else if (state.utility.length) {
                    state.utility[0] = bandage.id;
                } else {
                    state.utility = [bandage.id];
                }
            }
        }
        const want = healTargetAmmo(bandage);
        state.ammo[bandage.id] = want;
        enforceMandatoryBandage(data, state, bandage);
    }

    spendAmmoBudget(data, state);
    topOffPacks(data, state, lethals, "lethal", scoreLethal);
    topOffPacks(data, state, utilities, "utility", scoreUtility);
    spendAmmoBudget(data, state);

    /* Final pass — bandage is non-negotiable even after pack upgrades */
    if (bandage) enforceMandatoryBandage(data, state, bandage);

    return state;
}

/** Keep bandage equipped; shed other gear until the loadout is valid. */
function enforceMandatoryBandage(data, state, bandage) {
    if (!bandage) return;
    const prog = getProgression(data, state.role, state.level);
    state.bandage = bandage.id;
    if (!state.ammo[bandage.id]) {
        state.ammo[bandage.id] = healTargetAmmo(bandage);
    }
    if (prog.utilityCapacity > 0) {
        const idx = (state.utility || []).findIndex(function (id) {
            return id && isHealItem(getItem(data, state.faction, id));
        });
        if (idx === -1) {
            const next = (state.utility || []).filter(Boolean);
            next.unshift(bandage.id);
            state.utility = next.slice(0, prog.utilityCapacity);
        } else if (state.utility[idx] !== bandage.id) {
            state.utility[idx] = bandage.id;
        }
    }

    function overweight() {
        return validateLoadout(data, state).errors.some(function (e) { return e.code === "overweight"; });
    }

    /* Shed role equipment first */
    while (overweight() && (state.roleEquipment || []).filter(Boolean).length) {
        state.roleEquipment.pop();
    }
    /* Then non-bandage utilities */
    while (overweight() && (state.utility || []).length > 1) {
        let removed = false;
        for (let i = state.utility.length - 1; i >= 0; i--) {
            const item = getItem(data, state.faction, state.utility[i]);
            if (item && isHealItem(item)) continue;
            state.utility.splice(i, 1);
            removed = true;
            break;
        }
        if (!removed) break;
    }
    /* Then lethals */
    while (overweight() && (state.lethal || []).filter(Boolean).length) {
        state.lethal.pop();
    }
    /* Then extra ammo on guns */
    while (overweight()) {
        let trimmed = false;
        [state.primary, state.secondary].forEach(function (id) {
            if (!id || trimmed) return;
            const item = getItem(data, state.faction, id);
            if (!item) return;
            const base = num(item.BaseAmmo, 1);
            const cur = clampAmmo(item, state.ammo[id], true);
            if (cur > base) {
                state.ammo[id] = cur - 1;
                trimmed = true;
            }
        });
        if (!trimmed) break;
    }
    /* Last resort: drop secondary if not a rocket, else drop primary */
    if (overweight() && state.secondary && !isRocketLauncher(getItem(data, state.faction, state.secondary))) {
        delete state.ammo[state.secondary];
        state.secondary = null;
    }
    if (overweight() && state.primary) {
        const lighter = unlockedItems(data, state.faction, state.role, state.level, "primary")
            .filter(function (item) { return baseCost(item) < baseCost(getItem(data, state.faction, state.primary) || { ItemWeight: 99 }); })
            .sort(function (a, b) { return baseCost(a) - baseCost(b); })[0];
        if (lighter) {
            state.primary = lighter.id;
            state.ammo[lighter.id] = num(lighter.BaseAmmo, 1);
        }
    }
    if (overweight() && state.primary && !isRocketLauncher(getItem(data, state.faction, state.secondary))) {
        delete state.ammo[state.primary];
        state.primary = null;
    }
    /* Absolute floor: guns may go, bandage stays */
    if (overweight() && state.secondary && isRocketLauncher(getItem(data, state.faction, state.secondary))) {
        /* keep rocket if possible; drop primary */
        if (state.primary) {
            delete state.ammo[state.primary];
            state.primary = null;
        }
    }
}

function topOffPacks(data, state, pool, kind, scoreFn) {
    const prog = getProgression(data, state.role, state.level);
    const list = kind === "lethal" ? state.lethal : state.utility;
    const cap = kind === "lethal" ? prog.lethalCapacity : prog.utilityCapacity;
    for (let i = 0; i < list.length; i++) {
        const current = getItem(data, state.faction, list[i]);
        if (!current) continue;
        if (kind === "utility" && isHealItem(current)) continue; /* don't swap away heal kit during top-off */
        const budget = remainingBudget(data, state) + baseCost(current);
        const better = pickBestFitting(pool, budget, function (item, cost, bud) {
            if (item.id === current.id) return -Infinity;
            if (cost <= baseCost(current)) return -Infinity;
            if (kind === "utility" && isHealItem(item)) return -Infinity;
            return scoreFn(item, cost, bud);
        });
        if (!better) continue;
        const next = cloneLoadout(state);
        if (kind === "lethal") next.lethal[i] = better.id;
        else next.utility[i] = better.id;
        if (!validateLoadout(data, next).errors.some(function (e) { return e.code === "overweight"; })) {
            if (kind === "lethal") state.lethal = next.lethal;
            else state.utility = next.utility;
        }
    }
    while ((kind === "lethal" ? state.lethal : state.utility).filter(Boolean).length < cap) {
        const usedIds = {};
        (kind === "lethal" ? state.lethal : state.utility).forEach(function (id) { if (id) usedIds[id] = true; });
        const pick = pickBestFitting(pool.filter(function (item) { return !usedIds[item.id]; }), remainingBudget(data, state), scoreFn);
        if (!pick) break;
        if (!tryPushSlot(data, state, kind, pick)) break;
    }
}
