/* Vietnam Loadout Builder UI */
import { escapeHtml } from "../util.js";
import { loadPref, savePref } from "../tool-mode.js";
import { icon } from "../icons.js";
import {
    loadVietnamLoadoutData,
    getMeta,
    getRoles,
    getRoleMeta,
    getProgression,
    getItem,
    itemDisplayName,
    itemCost,
    clampAmmo,
    getAvailableItems,
    totalWeight,
    validateLoadout,
    emptyLoadoutState,
    defaultStarterLoadout,
    serializePreset,
    applyPresetToState,
    countsTowardWeight,
    buildSuggestedLoadout,
    isHealItem,
    clampHealAmmo,
    healDisplayName
} from "../vietnam-loadout.js";

const PREF_FACTION = "v2_vnLbFaction";
const PREF_ROLE = "v2_vnLbRole";
const PREF_LEVEL = "v2_vnLbLevel";
const PRESETS_KEY = "v2_vnLoadoutPresets";
const MAX_PRESETS = 20;

function readPresets() {
    try {
        const list = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function writePresets(list) {
    try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
    } catch (e) { /* ignore */ }
}

function cloneState(state) {
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

function weightSegments(used, capacity) {
    const cap = Math.max(0, capacity | 0);
    const u = Math.max(0, used | 0);
    let html = "";
    for (let i = 0; i < cap; i++) {
        html += `<span class="lb-seg${i < u ? " is-filled" : ""}${u > cap && i < u ? " is-over" : ""}"></span>`;
    }
    if (u > cap) {
        for (let i = 0; i < u - cap; i++) {
            html += `<span class="lb-seg is-filled is-over"></span>`;
        }
    }
    return html;
}

function slotLabel(kind) {
    return ({
        primary: "Primary",
        secondary: "Secondary",
        lethal: "Lethal",
        utility: "Utility",
        roleEquipment: "Role Equipment",
        heal: "Heal"
    })[kind] || kind;
}

export const vnLoadoutBuilder = {
    render: function () {
        return `<div class="wrap wrap-wide">
            <header class="section-head">
                <p class="eyebrow">Infantry · Vietnam</p>
                <h1 class="gold-text">Loadout Builder</h1>
                <p class="lead">Mix and match gear by class level and weight before you dig through the in-game UI.</p>
            </header>
            <div class="notice" role="status">
                ${icon("flask")}
                <span>This is a work in progress. This will be fully updated upon HLLV full release.</span>
            </div>
            <div id="lbMount"><div class="loading"><div class="spinner"></div><p>Loading balance data…</p></div></div>
        </div>`;
    },
    mount: function (root) {
        const mount = root.querySelector("#lbMount");
        document.body.classList.remove("lb-sheet-open");
        loadVietnamLoadoutData().then(function (data) {
            let state = emptyLoadoutState(
                loadPref(PREF_FACTION, "US"),
                loadPref(PREF_ROLE, "Rifleman"),
                Number(loadPref(PREF_LEVEL, "4")) || 4
            );
            const roles0 = getRoles(data, state.faction);
            if (!roles0.some(function (r) { return r.id === state.role; })) {
                state.role = roles0[0] ? roles0[0].id : "Rifleman";
            }
            state = defaultStarterLoadout(data, state.faction, state.role, state.level);
            let activePresetId = null;
            let picker = null;
            let flash = "";
            let flashTimer = null;

            function persistPrefs() {
                savePref(PREF_FACTION, state.faction);
                savePref(PREF_ROLE, state.role);
                savePref(PREF_LEVEL, String(state.level));
            }

            function flashMsg(msg) {
                flash = msg;
                if (flashTimer) clearTimeout(flashTimer);
                render();
                flashTimer = setTimeout(function () {
                    flash = "";
                    flashTimer = null;
                    render();
                }, 2200);
            }

            function setFaction(faction) {
                state.faction = faction;
                const nextRoles = getRoles(data, faction);
                if (!nextRoles.some(function (r) { return r.id === state.role; })) {
                    state.role = nextRoles[0] ? nextRoles[0].id : "Rifleman";
                }
                state = defaultStarterLoadout(data, state.faction, state.role, state.level);
                activePresetId = null;
                picker = null;
                persistPrefs();
                render();
            }

            function setRole(roleId) {
                state.role = roleId;
                state = defaultStarterLoadout(data, state.faction, state.role, state.level);
                activePresetId = null;
                picker = null;
                persistPrefs();
                render();
            }

            function setLevel(level) {
                const prog = getProgression(data, state.role, level);
                state.level = prog.level;
                if (!prog.unlockSecondary) state.secondary = null;
                state.lethal = (state.lethal || []).filter(Boolean).slice(0, prog.lethalCapacity);
                state.utility = (state.utility || []).filter(Boolean).slice(0, prog.utilityCapacity);
                Object.keys(state.ammo || {}).forEach(function (id) {
                    const item = getItem(data, state.faction, id);
                    if (!item) return;
                    state.ammo[id] = isHealItem(item)
                        ? clampHealAmmo(item, state.ammo[id])
                        : clampAmmo(item, state.ammo[id], prog.enableAdditionalAmmo);
                });
                persistPrefs();
                render();
            }

            function syncBandageFlag() {
                let fromUtil = null;
                (state.utility || []).forEach(function (id) {
                    if (!id || fromUtil) return;
                    const item = getItem(data, state.faction, id);
                    if (item && isHealItem(item)) fromUtil = id;
                });
                if (fromUtil) {
                    state.bandage = fromUtil;
                    return;
                }
                if (state.bandage) {
                    const item = getItem(data, state.faction, state.bandage);
                    if (!item || !isHealItem(item)) state.bandage = null;
                }
            }

            function removeHealFromUtility(next, healId) {
                if (!healId) return;
                next.utility = (next.utility || []).map(function (id) {
                    return id === healId ? null : id;
                });
                if (next.ammo) delete next.ammo[healId];
            }

            function placeHealInUtility(next, healId, prog) {
                if (!healId || prog.utilityCapacity <= 0) return;
                while (next.utility.length < prog.utilityCapacity) next.utility.push(null);
                const idx = next.utility.indexOf(healId);
                if (idx !== -1) return;
                const empty = next.utility.findIndex(function (id) { return !id; });
                if (empty !== -1) next.utility[empty] = healId;
                else next.utility[0] = healId;
            }

            function healPickerList() {
                const seen = {};
                const out = [];
                ["utility", "roleEquipment"].forEach(function (slot) {
                    getAvailableItems(data, state.faction, state.role, state.level, slot).forEach(function (entry) {
                        if (!isHealItem(entry.item) || seen[entry.item.id]) return;
                        seen[entry.item.id] = true;
                        out.push(entry);
                    });
                });
                return out;
            }

            function tryEquip(kind, index, itemId) {
                const next = cloneState(state);
                const item = getItem(data, state.faction, itemId);
                if (!item) return { ok: false, message: "Unknown item" };
                const prog = getProgression(data, state.role, state.level);

                if (kind === "primary") {
                    next.primary = itemId;
                    next.ammo[itemId] = clampAmmo(item, item.BaseAmmo, prog.enableAdditionalAmmo);
                } else if (kind === "secondary") {
                    if (!prog.unlockSecondary) return { ok: false, message: "Secondary unlocks at level 2" };
                    next.secondary = itemId;
                    next.ammo[itemId] = clampAmmo(item, item.BaseAmmo, prog.enableAdditionalAmmo);
                } else if (kind === "lethal") {
                    while (next.lethal.length < prog.lethalCapacity) next.lethal.push(null);
                    next.lethal[index] = itemId;
                    next.lethal = next.lethal.slice(0, prog.lethalCapacity);
                } else if (kind === "heal") {
                    if (!isHealItem(item)) return { ok: false, message: "Not a heal item" };
                    removeHealFromUtility(next, next.bandage);
                    next.bandage = itemId;
                    next.ammo[itemId] = clampHealAmmo(item, 2);
                    placeHealInUtility(next, itemId, prog);
                } else if (kind === "utility") {
                    while (next.utility.length < prog.utilityCapacity) next.utility.push(null);
                    const prev = next.utility[index];
                    if (prev && isHealItem(getItem(data, state.faction, prev) || {})) {
                        next.bandage = null;
                        if (next.ammo) delete next.ammo[prev];
                    }
                    next.utility[index] = itemId;
                    next.utility = next.utility.slice(0, prog.utilityCapacity);
                    if (isHealItem(item)) {
                        removeHealFromUtility(next, next.bandage && next.bandage !== itemId ? next.bandage : null);
                        next.bandage = itemId;
                        next.ammo[itemId] = clampHealAmmo(item, next.ammo[itemId] != null ? next.ammo[itemId] : 2);
                        /* ensure this slot holds it */
                        next.utility[index] = itemId;
                    }
                } else if (kind === "roleEquipment") {
                    while (next.roleEquipment.length <= index) next.roleEquipment.push(null);
                    next.roleEquipment[index] = itemId;
                }

                const check = validateLoadout(data, next);
                if (check.errors.some(function (e) { return e.code === "overweight"; })) {
                    return { ok: false, message: "Not enough weight (" + check.used + "/" + check.capacity + ")" };
                }
                state = next;
                if (kind === "utility" || kind === "heal") syncBandageFlag();
                picker = null;
                render();
                return { ok: true };
            }

            function clearSlot(kind, index) {
                if (kind === "primary") {
                    if (state.primary && state.ammo) delete state.ammo[state.primary];
                    state.primary = null;
                } else if (kind === "secondary") {
                    if (state.secondary && state.ammo) delete state.ammo[state.secondary];
                    state.secondary = null;
                } else if (kind === "lethal") {
                    state.lethal[index] = null;
                } else if (kind === "heal") {
                    const id = state.bandage;
                    if (id) {
                        if (state.ammo) delete state.ammo[id];
                        state.utility = (state.utility || []).map(function (uid) {
                            return uid === id ? null : uid;
                        });
                    }
                    state.bandage = null;
                } else if (kind === "utility") {
                    const id = (state.utility || [])[index];
                    if (id && state.ammo) delete state.ammo[id];
                    if (id && id === state.bandage) state.bandage = null;
                    state.utility[index] = null;
                    syncBandageFlag();
                } else if (kind === "roleEquipment") {
                    state.roleEquipment[index] = null;
                }
                picker = null;
                render();
            }

            function setAmmo(itemId, ammo) {
                const item = getItem(data, state.faction, itemId);
                if (!item) return;
                const prog = getProgression(data, state.role, state.level);
                const next = cloneState(state);
                next.ammo[itemId] = isHealItem(item)
                    ? clampHealAmmo(item, ammo)
                    : clampAmmo(item, ammo, prog.enableAdditionalAmmo);
                const check = validateLoadout(data, next);
                if (check.errors.some(function (e) { return e.code === "overweight"; })) {
                    flashMsg("Not enough weight for extra charges");
                    return;
                }
                state = next;
                render();
            }

            function openPicker(kind, index) {
                picker = { kind: kind, index: index };
                render();
            }

            function renderSlotCard(kind, index, itemId, opts) {
                opts = opts || {};
                const locked = !!opts.locked;
                const item = itemId ? getItem(data, state.faction, itemId) : null;
                const prog = getProgression(data, state.role, state.level);
                let body = "";
                let ammoRow = "";
                if (locked) {
                    body = `<div class="lb-slot__empty">${icon("lock")}<span>Locked</span></div>`;
                } else if (!item) {
                    body = `<div class="lb-slot__empty">${icon("plus")}<span>Empty</span></div>`;
                } else {
                    const heal = isHealItem(item);
                    const ammo = heal
                        ? clampHealAmmo(item, state.ammo[itemId])
                        : clampAmmo(item, state.ammo[itemId], prog.enableAdditionalAmmo);
                    const cost = itemCost(item, ammo, prog.enableAdditionalAmmo);
                    const showAmmo = heal
                        ? Number(item.MaxAmmo) > 1
                        : ((kind === "primary" || kind === "secondary") &&
                            prog.enableAdditionalAmmo &&
                            Number(item.MaxAmmo) > Number(item.BaseAmmo));
                    body = `<span class="lb-slot__weight">${cost}</span>
                        <span class="lb-slot__name">${escapeHtml(heal ? healDisplayName(item, state.faction) : itemDisplayName(item))}</span>`;
                    if (showAmmo) {
                        ammoRow = `<div class="lb-ammo" data-ammo-for="${escapeHtml(itemId)}"${heal ? ' data-ammo-heal="1"' : ""}>
                            <button type="button" class="lb-ammo__btn" data-ammo-delta="-1" aria-label="Less">−</button>
                            <span class="lb-ammo__val">${icon("box")} ×${ammo}</span>
                            <button type="button" class="lb-ammo__btn" data-ammo-delta="1" aria-label="More">+</button>
                        </div>`;
                    } else if (kind === "primary" || kind === "secondary" || heal) {
                        ammoRow = `<div class="lb-slot__ammo-static">${icon("box")} ×${ammo}</div>`;
                    }
                }
                return `<div class="lb-slot-wrap">
                    <button type="button" class="lb-slot${locked ? " is-locked" : ""}${item ? " has-item" : ""}"
                        data-slot-kind="${kind}" data-slot-index="${index}" ${locked ? "disabled" : ""}>
                        ${body}
                    </button>
                    ${ammoRow}
                </div>`;
            }

            function renderCapacitySlots(kind, capacity, items) {
                const cap = Math.max(0, capacity | 0);
                if (cap === 0) {
                    return `<p class="lb-muted lb-muted--inline">None at this level</p>`;
                }
                const filled = (items || []).slice();
                let html = "";
                for (let i = 0; i < cap; i++) {
                    html += renderSlotCard(kind, i, filled[i] || null);
                }
                return html;
            }

            function renderUtilitySlots(capacity) {
                const cap = Math.max(0, capacity | 0);
                if (cap === 0) {
                    return `<p class="lb-muted lb-muted--inline">None at this level</p>`;
                }
                let html = "";
                let shown = 0;
                for (let i = 0; i < cap; i++) {
                    const id = (state.utility || [])[i] || null;
                    const item = id ? getItem(data, state.faction, id) : null;
                    /* Heal is shown in its own section — skip it here */
                    if (item && isHealItem(item)) continue;
                    html += renderSlotCard("utility", i, id);
                    shown++;
                }
                if (!shown && state.bandage) {
                    return `<p class="lb-muted lb-muted--inline">No extra utility items (heal uses one slot).</p>`;
                }
                return html;
            }

            function renderRoleEquipment() {
                const available = getAvailableItems(data, state.faction, state.role, state.level, "roleEquipment")
                    .filter(function (x) { return x.unlocked; });
                const equipped = (state.roleEquipment || []).slice();
                const count = Math.max(available.length, equipped.length, 1);
                let html = "";
                for (let i = 0; i < count; i++) {
                    html += renderSlotCard("roleEquipment", i, equipped[i] || null);
                }
                return html;
            }

            function renderSheet() {
                if (!picker) return "";
                const kind = picker.kind;
                const list = kind === "heal"
                    ? healPickerList()
                    : getAvailableItems(data, state.faction, state.role, state.level, kind)
                        .filter(function (entry) {
                            /* Heal kits are picked from the Heal section */
                            return kind !== "utility" || !isHealItem(entry.item);
                        });
                const prog = getProgression(data, state.role, state.level);
                const rows = list.map(function (entry) {
                    const item = entry.item;
                    const ammo = isHealItem(item)
                        ? clampHealAmmo(item, 2)
                        : clampAmmo(item, item.BaseAmmo, prog.enableAdditionalAmmo);
                    const cost = countsTowardWeight(item) ? itemCost(item, ammo, prog.enableAdditionalAmmo) : 0;
                    const locked = !entry.unlocked;
                    const unlockTxt = locked
                        ? (entry.unlockLevel == null ? "Unavailable" : "Unlocks L" + entry.unlockLevel)
                        : ("Weight " + cost);
                    const label = isHealItem(item)
                        ? healDisplayName(item, state.faction)
                        : itemDisplayName(item);
                    return `<button type="button" class="lb-pick${locked ? " is-locked" : ""}" data-pick-id="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}>
                        <span class="lb-pick__name">${escapeHtml(label)}</span>
                        <span class="lb-pick__meta">${escapeHtml(unlockTxt)}</span>
                    </button>`;
                }).join("") || `<p class="lb-muted">No items in this slot.</p>`;

                return `<div class="lb-sheet-backdrop" data-picker-close>
                    <div class="lb-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(slotLabel(kind))}" data-sheet-panel>
                        <div class="lb-sheet__grab" aria-hidden="true"></div>
                        <div class="lb-sheet__head">
                            <div>
                                <p class="lb-sheet__eyebrow">Choose equipment</p>
                                <h2 class="lb-sheet__title">${escapeHtml(slotLabel(kind))}</h2>
                            </div>
                            <button type="button" class="btn btn-ghost btn-sm" data-picker-close aria-label="Close">Close</button>
                        </div>
                        <div class="lb-sheet__actions">
                            <button type="button" class="btn btn-ghost btn-sm" data-clear-slot>Clear slot</button>
                        </div>
                        <div class="lb-sheet__list">${rows}</div>
                    </div>
                </div>`;
            }

            function renderPresets() {
                const presets = readPresets();
                const options = presets.map(function (p) {
                    const sel = p.id === activePresetId ? " selected" : "";
                    return `<option value="${escapeHtml(p.id)}"${sel}>${escapeHtml(p.name)} (${escapeHtml(p.faction)} · L${p.level})</option>`;
                }).join("");
                return `<div class="lb-presets glass">
                    <div class="lb-presets__row">
                        <label class="field-label" for="lbPresetSelect">Presets</label>
                        <select id="lbPresetSelect" class="field">
                            <option value="">— Select preset —</option>
                            ${options}
                        </select>
                    </div>
                    <div class="lb-presets__btns">
                        <button type="button" class="btn btn-primary btn-sm" data-preset-save>Save</button>
                        <button type="button" class="btn btn-ghost btn-sm" data-preset-saveas>Save As</button>
                        <button type="button" class="btn btn-ghost btn-sm" data-preset-rename ${activePresetId ? "" : "disabled"}>Rename</button>
                        <button type="button" class="btn btn-ghost btn-sm" data-preset-delete ${activePresetId ? "" : "disabled"}>Delete</button>
                    </div>
                </div>`;
            }

            function renderLevelControl(maxLevel) {
                const levels = [];
                for (let i = 1; i <= maxLevel; i++) {
                    levels.push(`<button type="button" class="lb-level-chip${i === state.level ? " is-active" : ""}" data-set-level="${i}">${i}</button>`);
                }
                return `<div class="lb-level-wrap">
                    <div class="lb-level-step">
                        <button type="button" class="lb-level-btn" data-level-delta="-1" aria-label="Decrease level" ${state.level <= 1 ? "disabled" : ""}>−</button>
                        <div class="lb-level-display" aria-live="polite"><span class="lb-level-display__num">${state.level}</span><span class="lb-level-display__lbl">/ ${maxLevel}</span></div>
                        <button type="button" class="lb-level-btn" data-level-delta="1" aria-label="Increase level" ${state.level >= maxLevel ? "disabled" : ""}>+</button>
                    </div>
                    <div class="lb-level-chips" role="group" aria-label="Class level">${levels.join("")}</div>
                </div>`;
            }

            function render() {
                const roles = getRoles(data, state.faction);
                const roleMeta = getRoleMeta(data, state.role);
                const prog = getProgression(data, state.role, state.level);
                const used = totalWeight(data, state);
                const validation = validateLoadout(data, state);
                const meta = getMeta(data);
                const maxLevel = prog.maxLevel || 10;

                const roleOpts = roles.map(function (r) {
                    return `<option value="${escapeHtml(r.id)}"${r.id === state.role ? " selected" : ""}>${escapeHtml(r.label)} (${escapeHtml(r.category)})</option>`;
                }).join("");

                const errHtml = validation.errors.length
                    ? `<div class="lb-errors">${validation.errors.map(function (e) {
                        return `<div class="lb-error">${icon("triangle-exclamation")} ${escapeHtml(e.message)}</div>`;
                    }).join("")}</div>`
                    : "";

                document.body.classList.toggle("lb-sheet-open", !!picker);

                mount.innerHTML = `
                <div class="lb-layout">
                    <aside class="lb-sidebar">
                        <div class="lb-controls glass">
                            <div class="lb-faction" role="group" aria-label="Faction">
                                <button type="button" class="lb-faction__btn${state.faction === "US" ? " is-active" : ""}" data-faction="US">US</button>
                                <button type="button" class="lb-faction__btn${state.faction === "NVA" ? " is-active" : ""}" data-faction="NVA">NVA</button>
                            </div>
                            <label class="field-label" for="lbRole">Class</label>
                            <select id="lbRole" class="field">${roleOpts}</select>
                            <p class="field-label">Class level</p>
                            ${renderLevelControl(maxLevel)}
                            <div class="lb-caps">
                                <span>Weight <strong>${used}/${prog.weightPoints}</strong></span>
                                <span>Lethal <strong>${prog.lethalCapacity}</strong></span>
                                <span>Utility <strong>${prog.utilityCapacity}</strong></span>
                            </div>
                            <button type="button" class="btn btn-primary lb-suggest-btn" data-suggest-loadout>
                                ${icon("wand-magic-sparkles")} Make me a loadout
                            </button>
                        </div>
                        ${renderPresets()}
                    </aside>
                    <div class="lb-main">
                        <div class="lb-weight glass">
                            <div class="lb-weight__label">${icon("weight-hanging")} ${used}/${prog.weightPoints}</div>
                            <div class="lb-weight__bar" aria-hidden="true">${weightSegments(used, prog.weightPoints)}</div>
                            <div class="lb-weight__role">${escapeHtml(roleMeta ? roleMeta.label : state.role)} · Level ${state.level}</div>
                        </div>
                        ${flash ? `<div class="lb-flash" role="status">${escapeHtml(flash)}</div>` : ""}
                        ${errHtml}
                        <div class="lb-board glass">
                            <div class="lb-weapons">
                                <div class="lb-group">
                                    <h3 class="lb-group__title">Primary</h3>
                                    <div class="lb-slots">${renderSlotCard("primary", 0, state.primary)}</div>
                                </div>
                                <div class="lb-group">
                                    <h3 class="lb-group__title">Secondary</h3>
                                    <div class="lb-slots">${renderSlotCard("secondary", 0, state.secondary, { locked: !prog.unlockSecondary })}</div>
                                </div>
                            </div>
                            <div class="lb-group">
                                <h3 class="lb-group__title">Lethal <span class="lb-group__cap">${prog.lethalCapacity}</span></h3>
                                <div class="lb-slots">${renderCapacitySlots("lethal", prog.lethalCapacity, state.lethal)}</div>
                            </div>
                            <div class="lb-group">
                                <h3 class="lb-group__title">Heal</h3>
                                <div class="lb-slots">${renderSlotCard("heal", 0, state.bandage || null)}</div>
                            </div>
                            <div class="lb-group">
                                <h3 class="lb-group__title">Utility <span class="lb-group__cap">${prog.utilityCapacity}</span></h3>
                                <div class="lb-slots">${renderUtilitySlots(prog.utilityCapacity)}</div>
                            </div>
                            <div class="lb-group">
                                <h3 class="lb-group__title">Role Equipment</h3>
                                <div class="lb-slots">${renderRoleEquipment()}</div>
                            </div>
                        </div>
                        <p class="lb-meta">Balance data: ${escapeHtml(meta.updated || "—")}${meta.patchNote ? " — " + escapeHtml(meta.patchNote) : ""}</p>
                    </div>
                </div>
                ${renderSheet()}`;

                bind();
            }

            function bind() {
                mount.querySelectorAll("[data-faction]").forEach(function (btn) {
                    btn.addEventListener("click", function () { setFaction(btn.getAttribute("data-faction")); });
                });
                const roleSel = mount.querySelector("#lbRole");
                if (roleSel) roleSel.addEventListener("change", function () { setRole(roleSel.value); });

                mount.querySelectorAll("[data-level-delta]").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        setLevel(state.level + Number(btn.getAttribute("data-level-delta")));
                    });
                });
                mount.querySelectorAll("[data-set-level]").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        setLevel(Number(btn.getAttribute("data-set-level")));
                    });
                });

                const suggestBtn = mount.querySelector("[data-suggest-loadout]");
                if (suggestBtn) {
                    suggestBtn.addEventListener("click", function () {
                        state = buildSuggestedLoadout(data, state.faction, state.role, state.level);
                        activePresetId = null;
                        picker = null;
                        persistPrefs();
                        const v = validateLoadout(data, state);
                        flashMsg(v.ok
                            ? ("Suggested loadout · " + v.used + "/" + v.capacity + " weight")
                            : "Suggested loadout applied (check warnings)");
                        render();
                    });
                }

                mount.querySelectorAll("[data-slot-kind]").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        openPicker(btn.getAttribute("data-slot-kind"), Number(btn.getAttribute("data-slot-index")) || 0);
                    });
                });

                mount.querySelectorAll("[data-ammo-for]").forEach(function (row) {
                    const id = row.getAttribute("data-ammo-for");
                    const healAmmo = row.getAttribute("data-ammo-heal") === "1";
                    row.querySelectorAll("[data-ammo-delta]").forEach(function (b) {
                        b.addEventListener("click", function (ev) {
                            ev.stopPropagation();
                            const item = getItem(data, state.faction, id);
                            if (!item) return;
                            const prog = getProgression(data, state.role, state.level);
                            const cur = healAmmo || isHealItem(item)
                                ? clampHealAmmo(item, state.ammo[id])
                                : clampAmmo(item, state.ammo[id], prog.enableAdditionalAmmo);
                            setAmmo(id, cur + Number(b.getAttribute("data-ammo-delta")));
                        });
                    });
                });

                mount.querySelectorAll("[data-picker-close]").forEach(function (el) {
                    el.addEventListener("click", function (ev) {
                        /* Backdrop: only close when the dimmed area itself is clicked */
                        if (el.classList.contains("lb-sheet-backdrop") && ev.target !== el) return;
                        picker = null;
                        render();
                    });
                });
                const sheet = mount.querySelector("[data-sheet-panel]");
                if (sheet) sheet.addEventListener("click", function (ev) { ev.stopPropagation(); });
                const clear = mount.querySelector("[data-clear-slot]");
                if (clear) clear.addEventListener("click", function (ev) {
                    ev.stopPropagation();
                    if (picker) clearSlot(picker.kind, picker.index);
                });
                mount.querySelectorAll("[data-pick-id]").forEach(function (btn) {
                    btn.addEventListener("click", function (ev) {
                        ev.stopPropagation();
                        if (!picker) return;
                        const res = tryEquip(picker.kind, picker.index, btn.getAttribute("data-pick-id"));
                        if (!res.ok) flashMsg(res.message || "Cannot equip");
                    });
                });

                const presetSel = mount.querySelector("#lbPresetSelect");
                if (presetSel) {
                    presetSel.addEventListener("change", function () {
                        const id = presetSel.value;
                        if (!id) { activePresetId = null; render(); return; }
                        const presets = readPresets();
                        const p = presets.find(function (x) { return x.id === id; });
                        if (!p) return;
                        state = applyPresetToState(p);
                        activePresetId = p.id;
                        persistPrefs();
                        const v = validateLoadout(data, state);
                        if (!v.ok) flashMsg("Preset loaded with warnings — check locked or missing items");
                        picker = null;
                        render();
                    });
                }

                const saveBtn = mount.querySelector("[data-preset-save]");
                if (saveBtn) saveBtn.addEventListener("click", function () {
                    const presets = readPresets();
                    if (activePresetId) {
                        const idx = presets.findIndex(function (p) { return p.id === activePresetId; });
                        if (idx !== -1) {
                            const updated = serializePreset(state, presets[idx].name);
                            updated.id = presets[idx].id;
                            presets[idx] = updated;
                            writePresets(presets);
                            flashMsg("Preset saved");
                            render();
                            return;
                        }
                    }
                    const name = window.prompt("Preset name", (getRoleMeta(data, state.role) || {}).label || "Preset");
                    if (!name) return;
                    const p = serializePreset(state, name.trim());
                    presets.unshift(p);
                    writePresets(presets);
                    activePresetId = p.id;
                    flashMsg("Preset saved");
                    render();
                });

                const saveAs = mount.querySelector("[data-preset-saveas]");
                if (saveAs) saveAs.addEventListener("click", function () {
                    const name = window.prompt("New preset name", (getRoleMeta(data, state.role) || {}).label || "Preset");
                    if (!name) return;
                    const presets = readPresets();
                    const p = serializePreset(state, name.trim());
                    presets.unshift(p);
                    writePresets(presets);
                    activePresetId = p.id;
                    flashMsg("Preset created");
                    render();
                });

                const rename = mount.querySelector("[data-preset-rename]");
                if (rename) rename.addEventListener("click", function () {
                    if (!activePresetId) return;
                    const presets = readPresets();
                    const idx = presets.findIndex(function (p) { return p.id === activePresetId; });
                    if (idx === -1) return;
                    const name = window.prompt("Rename preset", presets[idx].name);
                    if (!name) return;
                    presets[idx].name = name.trim();
                    presets[idx].updatedAt = new Date().toISOString();
                    writePresets(presets);
                    render();
                });

                const del = mount.querySelector("[data-preset-delete]");
                if (del) del.addEventListener("click", function () {
                    if (!activePresetId) return;
                    if (!window.confirm("Delete this preset?")) return;
                    writePresets(readPresets().filter(function (p) { return p.id !== activePresetId; }));
                    activePresetId = null;
                    flashMsg("Preset deleted");
                    render();
                });
            }

            render();
        }).catch(function (err) {
            console.error(err);
            mount.innerHTML = `<p class="result-empty">Loadout data unavailable.</p>`;
        });
    }
};
