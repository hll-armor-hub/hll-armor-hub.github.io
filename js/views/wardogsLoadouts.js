/* Wardogs - loadout builder with shareable links */
import { escapeHtml } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";
import { loadPref, savePref } from "../tool-mode.js";
import { loadCashRewards, payout, findAction, formatCash } from "../wardogs-data.js";

const IMG = "/images/wardogs";
const DISCORD = "https://discord.gg/guFSTDfsCb";
const PREF_LAST = "wd-lo-last";
const CODE_VERSION = "1";
const ID_RE = /^[a-z0-9]+$/;

const dataCache = new Map();

function loadLoadouts(season) {
    if (!dataCache.has(season)) {
        const p = fetch(`/data/wardogs/${encodeURIComponent(season)}/loadouts.json`).then(function (r) {
            if (!r.ok) throw new Error(`Failed to load Wardogs loadouts.json (${r.status})`);
            return r.json();
        }).catch(function (err) {
            dataCache.delete(season);
            throw err;
        });
        dataCache.set(season, p);
    }
    return dataCache.get(season);
}

function seasonLabel(era) {
    const m = /^s(\d+)$/.exec(era || "");
    return m ? "Season " + m[1] : era;
}

function list(v) { return Array.isArray(v) ? v : []; }

function byId(arr) {
    const map = {};
    arr.forEach(function (x) { map[x.id] = x; });
    return map;
}

function normalize(raw) {
    const valid = function (x) { return x && typeof x.id === "string" && ID_RE.test(x.id); };
    const slots = list(raw.slots).filter(function (s) { return valid(s) && typeof s.code === "string" && ID_RE.test(s.code); });
    const slotMap = byId(slots);
    const items = list(raw.items).filter(function (i) { return valid(i) && slotMap[i.slot]; });
    const factions = list(raw.factions).filter(valid);
    const roles = list(raw.roles).filter(valid);
    const codeMap = {};
    slots.forEach(function (s) { codeMap[s.code] = s; });
    return {
        raw: raw,
        slots: slots,
        items: items,
        factions: factions,
        roles: roles,
        presets: list(raw.presets).filter(valid),
        sources: list(raw.sources),
        gaps: list(raw.gaps),
        slotMap: slotMap,
        codeMap: codeMap,
        itemMap: byId(items),
        factionMap: byId(factions),
        roleMap: byId(roles),
        sourceMap: byId(list(raw.sources))
    };
}

function emptyState(d) {
    const items = {};
    d.slots.forEach(function (s) { items[s.id] = []; });
    return {
        faction: d.factions[0] ? d.factions[0].id : "",
        role: d.roles[0] ? d.roles[0].id : "",
        items: items
    };
}

function canAdd(d, state, item) {
    if (!item || item.disabled) return false;
    const slot = d.slotMap[item.slot];
    const cur = state.items[slot.id];
    if (cur.indexOf(item.id) !== -1) return false;
    return slot.max == null || slot.max > 1 || cur.length === 0;
}

function encode(d, state) {
    const parts = [CODE_VERSION, state.faction, state.role];
    d.slots.forEach(function (s) {
        const ids = state.items[s.id];
        if (ids && ids.length) parts.push(s.code + "-" + ids.join("_"));
    });
    return parts.join(".");
}

function decode(d, str) {
    const parts = String(str || "").split(".");
    if (parts[0] !== CODE_VERSION || parts.length < 3) return null;
    const state = emptyState(d);
    let dropped = 0;
    if (d.factionMap[parts[1]]) state.faction = parts[1];
    else dropped++;
    if (d.roleMap[parts[2]]) state.role = parts[2];
    else dropped++;
    parts.slice(3).forEach(function (seg) {
        const dash = seg.indexOf("-");
        const slot = dash > 0 ? d.codeMap[seg.slice(0, dash)] : null;
        const ids = dash > 0 ? seg.slice(dash + 1).split("_").filter(Boolean) : [seg];
        ids.forEach(function (id) {
            const item = d.itemMap[id];
            if (!slot || !item || item.slot !== slot.id || item.disabled) { dropped++; return; }
            const cur = state.items[slot.id];
            if (cur.indexOf(id) !== -1) return;
            if (slot.max != null && cur.length >= slot.max) { dropped++; return; }
            cur.push(id);
        });
    });
    return { state: state, dropped: dropped };
}

function applyPreset(d, preset) {
    const state = emptyState(d);
    if (d.factionMap[preset.faction]) state.faction = preset.faction;
    if (d.roleMap[preset.role]) state.role = preset.role;
    Object.keys(preset.items || {}).forEach(function (slotId) {
        list(preset.items[slotId]).forEach(function (id) {
            const item = d.itemMap[id];
            if (item && item.slot === slotId && canAdd(d, state, item)) state.items[slotId].push(id);
        });
    });
    return state;
}

function chosenItems(d, state) {
    const out = [];
    d.slots.forEach(function (s) {
        state.items[s.id].forEach(function (id) {
            if (d.itemMap[id]) out.push(d.itemMap[id]);
        });
    });
    return out;
}

function totals(d, state) {
    const items = chosenItems(d, state);
    const t = { count: items.length, buy: 0, buyKnown: 0, track: 0, trackKnown: 0, unconfirmed: 0, warnings: [] };
    items.forEach(function (i) {
        if (typeof i.buyPrice === "number") { t.buy += i.buyPrice; t.buyKnown++; }
        if (typeof i.trackPrice === "number") { t.track += i.trackPrice; t.trackKnown++; }
        if (!i.verified) t.unconfirmed++;
        if (i.requires && !items.some(function (x) { return x.id === i.requires; })) {
            const need = d.itemMap[i.requires];
            t.warnings.push(`${i.name} needs the ${need ? need.name : i.requires}.`);
        }
    });
    return t;
}

function trackLabel(d, item) {
    if (!item.track) return "";
    if (item.track === "vendor") return "Vendor";
    const role = d.roleMap[item.track];
    const name = role ? (role.track || role.name) : item.track;
    return item.unlockLevel ? `${name} L${item.unlockLevel}` : name;
}

function itemTags(d, item, state) {
    const tags = [];
    const tl = trackLabel(d, item);
    if (tl) tags.push(`<span class="wl-tag${item.track === state.role ? " wl-tag--role" : ""}" title="Unlock track">${escapeHtml(tl)}</span>`);
    if (typeof item.buyPrice === "number") tags.push(`<span class="wl-tag wl-tag--cash" title="In-match vendor price">${escapeHtml(formatCash(item.buyPrice))} vendor</span>`);
    if (typeof item.trackPrice === "number") tags.push(`<span class="wl-tag wl-tag--cash" title="Price listed against the role track in the patch notes">${escapeHtml(formatCash(item.trackPrice))} track</span>`);
    if (item.bulky) tags.push(`<span class="wl-tag" title="Takes more loadout room">Bulky</span>`);
    if (item.disabled) tags.push(`<span class="wl-tag wl-tag--off">Disabled</span>`);
    if (!item.verified) tags.push(`<span class="wl-tag wl-tag--warn" title="Not confirmed by an official source">Unconfirmed</span>`);
    return tags.join("");
}

function sortForRole(d, items, roleId) {
    const rank = function (i) {
        if (i.track === roleId) return 0;
        if (i.track === "career") return 1;
        if (i.track === "vendor") return 2;
        if (!i.track) return 3;
        return 4;
    };
    return items.slice().sort(function (a, b) {
        return (rank(a) - rank(b)) || ((a.disabled ? 1 : 0) - (b.disabled ? 1 : 0)) || ((a.unlockLevel || 0) - (b.unlockLevel || 0)) || a.name.localeCompare(b.name);
    });
}

function copyText(text) {
    const legacy = function () {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        ta.remove();
        return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacy(); });
    }
    return Promise.resolve(legacy());
}

export const loadouts = {
    render: function (route) {
        return `<div class="wrap wrap-wide wl-root">
            <header class="section-head">
                <p class="eyebrow">Wardogs · ${escapeHtml(seasonLabel(route.era))}</p>
                <h1 class="gold-text">Loadouts</h1>
                <p class="lead">Put a kit together, see what it costs, and send it to your squad as a link.</p>
            </header>
            <div id="wlMount"><div class="loading"><div class="spinner"></div><p>Loading loadout data…</p></div></div>
        </div>`;
    },
    mount: function (root, route) {
        const host = root.querySelector("#wlMount");
        const rewardsP = loadCashRewards(route.era).catch(function () { return null; });
        loadLoadouts(route.era).then(function (raw) {
            return rewardsP.then(function (rewards) {
                if (host.isConnected) start(host, route, normalize(raw), rewards);
            });
        }).catch(function (err) {
            console.warn(err);
            host.innerHTML = `<div class="notice wd-error">${icon("triangle-exclamation")} Loadout data unavailable.</div>`;
        });
    }
};

function start(host, route, d, rewards) {
    let state = emptyState(d);
    let notice = "";
    const fromLink = route.query && route.query.l;
    const restored = decode(d, fromLink || loadPref(PREF_LAST, ""));
    if (restored) {
        state = restored.state;
        if (fromLink && restored.dropped) notice = `${restored.dropped} part${restored.dropped === 1 ? "" : "s"} of this link didn't match the current item list and ${restored.dropped === 1 ? "was" : "were"} skipped.`;
        else if (fromLink) notice = "Loadout loaded from a shared link.";
    }

    const kill = rewards ? findAction(rewards, "playerkill-context-defaultreward") : null;
    let sheetSlot = null;
    let sheetReturn = null;
    let copyTimer = null;

    host.innerHTML = `<p class="sr-only" aria-live="polite" id="wlLive"></p>
        <div id="wlMain"></div>
        <div id="wlSheet"></div>`;
    const live = host.querySelector("#wlLive");
    const main = host.querySelector("#wlMain");
    const sheetHost = host.querySelector("#wlSheet");

    function shareHash() {
        return buildHash("wardogs", route.era, "loadouts", null, { l: encode(d, state) });
    }

    function shareUrl() {
        return location.href.split("#")[0] + shareHash();
    }

    function persist() {
        const code = encode(d, state);
        savePref(PREF_LAST, code);
        if (location.hash.indexOf("#/wardogs/" + route.era + "/loadouts") === 0) {
            try { history.replaceState(history.state, "", shareHash()); } catch (e) { /* ignore */ }
        }
    }

    function faction() { return d.factionMap[state.faction] || d.factions[0] || { id: "", name: "", color: "#FB923C" }; }
    function role() { return d.roleMap[state.role] || d.roles[0] || { id: "", name: "" }; }

    function sourceLinks(ids) {
        return list(ids).map(function (id) {
            const s = d.sourceMap[id];
            return s ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>` : "";
        }).filter(Boolean).join(", ");
    }

    function factionPicker() {
        return d.factions.map(function (f) {
            const on = f.id === state.faction;
            return `<button type="button" class="wl-faction${on ? " is-on" : ""}" data-action="faction" data-id="${escapeHtml(f.id)}" data-fk="faction-${escapeHtml(f.id)}" aria-pressed="${on}" style="--fc:${escapeHtml(f.color)}">
                <img src="${IMG}/factions/${escapeHtml(f.image || f.id)}.png" alt="" loading="lazy" width="36" height="36">
                <span>${escapeHtml(f.name)}</span>
            </button>`;
        }).join("");
    }

    function rolePicker() {
        return d.roles.map(function (r) {
            const on = r.id === state.role;
            const track = r.track && r.track !== r.name ? `<small>${escapeHtml(r.track)} track</small>` : "";
            return `<button type="button" class="wl-role${on ? " is-on" : ""}" data-action="role" data-id="${escapeHtml(r.id)}" data-fk="role-${escapeHtml(r.id)}" aria-pressed="${on}">
                <img src="${IMG}/roles/${escapeHtml(r.image || r.id)}.png" alt="" loading="lazy" width="28" height="28">
                <span class="wl-role__name">${escapeHtml(r.name)}${track}${r.verified ? "" : `<span class="wl-tag wl-tag--warn" title="${escapeHtml(r.note || "Not confirmed by an official source")}">Unconfirmed</span>`}</span>
            </button>`;
        }).join("");
    }

    function presetPicker() {
        if (!d.presets.length) return "";
        const btns = d.presets.map(function (p) {
            const f = d.factionMap[p.faction];
            return `<button type="button" class="wl-preset" data-action="preset" data-id="${escapeHtml(p.id)}" data-fk="preset-${escapeHtml(p.id)}" style="--fc:${escapeHtml(f ? f.color : "#FB923C")}">
                <span class="wl-preset__name">${escapeHtml(p.name)}${p.verified ? "" : ` <span class="wl-tag wl-tag--warn">Unconfirmed</span>`}</span>
                ${p.note ? `<small>${escapeHtml(p.note)}</small>` : ""}
            </button>`;
        }).join("");
        return `<section class="wl-panel glass" aria-labelledby="wlPresetsH">
            <h2 class="wl-h" id="wlPresetsH">Starter kits</h2>
            <div class="wl-presets">${btns}</div>
            <p class="wl-fine">Based on the three starter weapons named in the official Supporter Edition announcement.</p>
        </section>`;
    }

    function slotRow(s) {
        const ids = state.items[s.id];
        const chips = ids.map(function (id) {
            const item = d.itemMap[id];
            if (!item) return "";
            return `<li class="wl-chip">
                <span class="wl-chip__name">${escapeHtml(item.name)}${item.verified ? "" : ` <span class="wl-tag wl-tag--warn">Unconfirmed</span>`}</span>
                <button type="button" class="wl-chip__x" data-action="remove" data-slot="${escapeHtml(s.id)}" data-id="${escapeHtml(id)}" data-fk="rm-${escapeHtml(id)}" aria-label="Remove ${escapeHtml(item.name)}">${icon("xmark")}</button>
            </li>`;
        }).join("");
        const count = d.items.filter(function (i) { return i.slot === s.id; }).length;
        const full = s.max != null && ids.length >= s.max;
        const verb = s.max === 1 ? (ids.length ? "Change" : "Choose") : "Add";
        return `<div class="wl-slot">
            <div class="wl-slot__head">
                <span class="wl-slot__icon">${icon(s.icon || "box")}</span>
                <h3 class="wl-slot__name">${escapeHtml(s.name)}</h3>
                <span class="wl-slot__count">${s.max === 1 ? "1 max" : `${ids.length} picked`}</span>
            </div>
            ${ids.length ? `<ul class="wl-chips">${chips}</ul>` : `<p class="wl-slot__empty">Nothing picked</p>`}
            <button type="button" class="wl-slot__add" data-action="open" data-slot="${escapeHtml(s.id)}" data-fk="open-${escapeHtml(s.id)}" aria-haspopup="dialog" ${count ? "" : "disabled"}>
                ${icon(full && s.max !== 1 ? "lock" : "plus")}<span>${count ? `${verb} ${escapeHtml(s.name.toLowerCase())}` : "No items in the data yet"}</span>
            </button>
        </div>`;
    }

    function slotBoard() {
        const groups = [];
        d.slots.forEach(function (s) {
            const g = s.group || "Loadout";
            let entry = groups.find(function (x) { return x.name === g; });
            if (!entry) { entry = { name: g, slots: [] }; groups.push(entry); }
            entry.slots.push(s);
        });
        return groups.map(function (g) {
            return `<section class="wl-panel glass wl-group" aria-label="${escapeHtml(g.name)}">
                <h2 class="wl-h">${escapeHtml(g.name)}</h2>
                <div class="wl-slots">${g.slots.map(slotRow).join("")}</div>
            </section>`;
        }).join("");
    }

    function costBlock(t) {
        const rows = [];
        const buyNote = t.count ? `${t.buyKnown} of ${t.count} item${t.count === 1 ? "" : "s"} priced` : "No items yet";
        const buyValue = t.count && !t.buyKnown ? "Not published" : formatCash(t.buy);
        rows.push(`<div class="wl-cost"><dt>Vendor cost per life</dt><dd><strong${t.count && !t.buyKnown ? ' class="wl-cost__na"' : ""}>${escapeHtml(buyValue)}</strong><small>${escapeHtml(buyNote)}</small></dd></div>`);
        if (t.trackKnown) rows.push(`<div class="wl-cost"><dt>Track prices listed</dt><dd><strong>${escapeHtml(formatCash(t.track))}</strong><small>${t.trackKnown} item${t.trackKnown === 1 ? "" : "s"}, read as unlock prices</small></dd></div>`);
        if (kill && t.buy > 0) {
            const any = payout(kill, "none");
            const hz = payout(kill, "hz");
            if (any > 0) rows.push(`<div class="wl-cost"><dt>Earned back in</dt><dd><strong>${Math.ceil(t.buy / any).toLocaleString("en-US")} kills</strong><small>or ${Math.ceil(t.buy / Math.max(1, hz)).toLocaleString("en-US")} in the Hot Zone</small></dd></div>`);
        }
        const start = d.raw.startingCash && typeof d.raw.startingCash.value === "number" ? d.raw.startingCash.value : null;
        if (start != null) rows.push(`<div class="wl-cost"><dt>Starting cash</dt><dd><strong>${escapeHtml(formatCash(start))}</strong></dd></div>`);
        return `<dl class="wl-costs">${rows.join("")}</dl>`;
    }

    function card() {
        const f = faction();
        const r = role();
        const t = totals(d, state);
        const rows = d.slots.filter(function (s) { return state.items[s.id].length; }).map(function (s) {
            const names = state.items[s.id].map(function (id) {
                const i = d.itemMap[id];
                return `<li>${escapeHtml(i.name)}${i.verified ? "" : ` <span class="wl-tag wl-tag--warn">Unconfirmed</span>`}</li>`;
            }).join("");
            return `<div class="wl-card__row"><dt>${escapeHtml(s.name)}</dt><dd><ul>${names}</ul></dd></div>`;
        }).join("");
        const warn = t.warnings.map(function (w) {
            return `<p class="wl-card__warn">${icon("triangle-exclamation")} ${escapeHtml(w)}</p>`;
        }).join("");
        return `<article class="wl-card glass-strong" style="--fc:${escapeHtml(f.color || "#FB923C")}" aria-labelledby="wlCardTitle">
            <header class="wl-card__head">
                <img class="wl-card__logo" src="${IMG}/factions/${escapeHtml(f.image || f.id)}.png" alt="" width="48" height="48">
                <div class="wl-card__id">
                    <p class="wl-card__faction">${escapeHtml(f.name)}</p>
                    <h2 class="wl-card__title" id="wlCardTitle">${escapeHtml(r.name)} loadout</h2>
                </div>
                ${r.image ? `<img class="wl-card__role" src="${IMG}/roles/${escapeHtml(r.image)}.png" alt="" width="32" height="32">` : ""}
            </header>
            ${rows ? `<dl class="wl-card__list">${rows}</dl>` : `<p class="wl-card__empty">Empty loadout. Pick a starter kit or add items.</p>`}
            ${warn}
            ${t.unconfirmed ? `<p class="wl-card__note">${icon("circle-info")} ${t.unconfirmed} item${t.unconfirmed === 1 ? " is" : "s are"} unconfirmed.</p>` : ""}
            ${costBlock(t)}
            <div class="wl-card__actions">
                <button type="button" class="btn btn-primary wl-copy" data-action="copy" data-fk="copy">${icon("share-nodes")}<span class="wl-copy__label">Copy share link</span></button>
                <button type="button" class="btn btn-ghost wl-reset" data-action="reset" data-fk="reset" ${t.count ? "" : "disabled"}>${icon("rotate-left")} Clear</button>
            </div>
        </article>`;
    }

    function sourcesBlock() {
        const srcs = d.sources.map(function (s) {
            return `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`;
        }).join("");
        const gaps = d.gaps.map(function (g) { return `<li>${escapeHtml(g)}</li>`; }).join("");
        const confirmed = d.items.filter(function (i) { return i.verified; }).length;
        return `<details class="wl-sources glass" id="wlSources">
            <summary>Sources and missing data</summary>
            <div class="wl-sources__body">
                <p>${confirmed} of ${d.items.length} items are confirmed from official sources. ${d.raw.structureNote ? escapeHtml(d.raw.structureNote) : ""}</p>
                <h3>Sources</h3>
                <ul>${srcs}</ul>
                ${gaps ? `<h3>Still missing</h3><ul>${gaps}</ul>` : ""}
                <p class="wl-fine">Data: ${escapeHtml(d.raw.updated || "-")}${d.raw.gameVersion ? " · game " + escapeHtml(d.raw.gameVersion) : ""}</p>
            </div>
        </details>`;
    }

    function render() {
        const active = document.activeElement;
        const fk = active && main.contains(active) ? active.getAttribute("data-fk") : null;
        const confirmed = d.items.filter(function (i) { return i.verified; }).length;
        main.innerHTML = `${notice ? `<div class="notice wl-notice" role="status">${icon("circle-info")}<span>${escapeHtml(notice)}</span></div>` : ""}
            <p class="wl-honest">${icon("flask")}<span>Built only from official patch notes and store text: ${confirmed} of ${d.items.length} items confirmed. Anything tagged <span class="wl-tag wl-tag--warn">Unconfirmed</span> is our best reading. <button type="button" class="wl-link" data-action="sources">Sources and gaps</button></span></p>
            <div class="wl-layout">
                <div class="wl-build">
                    <section class="wl-panel glass" aria-labelledby="wlFactionH">
                        <h2 class="wl-h" id="wlFactionH">Faction</h2>
                        <div class="wl-factions" role="group" aria-labelledby="wlFactionH">${factionPicker()}</div>
                    </section>
                    <section class="wl-panel glass" aria-labelledby="wlRoleH">
                        <h2 class="wl-h" id="wlRoleH">Role</h2>
                        <div class="wl-roles" role="group" aria-labelledby="wlRoleH">${rolePicker()}</div>
                        <p class="wl-fine">Your role's track is listed first when you pick items. Nothing is hidden, since carry rules aren't published.</p>
                    </section>
                    ${presetPicker()}
                    ${slotBoard()}
                </div>
                <aside class="wl-side">
                    ${card()}
                    <a class="wl-discord glass" href="${DISCORD}" target="_blank" rel="noopener">
                        <span class="wl-discord__icon">${icon("discord")}</span>
                        <span><strong>Looking for a squad?</strong> Find one in the AHO Discord</span>
                        ${icon("up-right-from-square")}
                    </a>
                </aside>
            </div>
            ${sourcesBlock()}`;
        if (fk) {
            const el = main.querySelector(`[data-fk="${fk}"]`);
            if (el && !el.disabled) el.focus({ preventScroll: true });
        }
    }

    function change(next) {
        state = next;
        notice = "";
        persist();
        render();
        if (sheetSlot) refreshSheet();
    }

    function cloneItems() {
        const items = {};
        Object.keys(state.items).forEach(function (k) { items[k] = state.items[k].slice(); });
        return { faction: state.faction, role: state.role, items: items };
    }

    function toggleItem(id) {
        const item = d.itemMap[id];
        if (!item || item.disabled) return;
        const slot = d.slotMap[item.slot];
        const next = cloneItems();
        const cur = next.items[slot.id];
        const idx = cur.indexOf(id);
        if (idx !== -1) {
            cur.splice(idx, 1);
            live.textContent = `${item.name} removed`;
        } else if (slot.max === 1) {
            next.items[slot.id] = [id];
            live.textContent = `${item.name} equipped`;
        } else {
            if (slot.max != null && cur.length >= slot.max) {
                live.textContent = `${slot.name} is full`;
                return;
            }
            cur.push(id);
            live.textContent = `${item.name} added`;
        }
        change(next);
    }

    /* ---------- picker sheet ---------- */
    function sheetItems(slotId) {
        return sortForRole(d, d.items.filter(function (i) { return i.slot === slotId; }), state.role);
    }

    function sheetRow(item) {
        const on = state.items[item.slot].indexOf(item.id) !== -1;
        const slot = d.slotMap[item.slot];
        const role = slot.max === 1 ? "radio" : "checkbox";
        const notes = [item.kind, item.note].filter(Boolean).map(escapeHtml).join(" · ");
        return `<li><button type="button" class="wl-pick${on ? " is-on" : ""}" role="${role}" aria-checked="${on}" data-pick="${escapeHtml(item.id)}" ${item.disabled ? 'aria-disabled="true" disabled' : ""}>
            <span class="wl-pick__check" aria-hidden="true">${on ? "✓" : ""}</span>
            <span class="wl-pick__body">
                <span class="wl-pick__name">${escapeHtml(item.name)}</span>
                ${notes ? `<span class="wl-pick__note">${notes}</span>` : ""}
                <span class="wl-pick__tags">${itemTags(d, item, state)}</span>
                ${item.source ? `<span class="wl-pick__src">Source: ${sourceLinks(item.source)}</span>` : ""}
            </span>
        </button></li>`;
    }

    function openSheet(slotId, trigger) {
        const slot = d.slotMap[slotId];
        if (!slot) return;
        sheetSlot = slotId;
        sheetReturn = trigger ? trigger.getAttribute("data-fk") : null;
        const single = slot.max === 1;
        sheetHost.innerHTML = `<div class="wl-backdrop" data-action="close-sheet"></div>
            <div class="wl-sheet" role="dialog" aria-modal="true" aria-labelledby="wlSheetTitle">
                <div class="wl-sheet__head">
                    <div>
                        <p class="wl-sheet__eyebrow">${escapeHtml(role().name)} · ${single ? "pick one" : "pick any"}</p>
                        <h2 class="wl-sheet__title" id="wlSheetTitle">${escapeHtml(slot.name)}</h2>
                    </div>
                    <button type="button" class="wl-sheet__close" data-action="close-sheet" aria-label="Close">${icon("xmark")}</button>
                </div>
                <ul class="wl-sheet__list" role="${single ? "radiogroup" : "group"}" aria-labelledby="wlSheetTitle"></ul>
                <div class="wl-sheet__foot">
                    <button type="button" class="btn btn-primary wl-sheet__done" data-action="close-sheet">Done</button>
                </div>
            </div>`;
        refreshSheet();
        document.body.classList.add("wl-lock");
        document.addEventListener("keydown", onSheetKey);
        const first = sheetHost.querySelector(".wl-pick.is-on:not([disabled])") || sheetHost.querySelector(".wl-pick:not([disabled])");
        if (first) first.focus({ preventScroll: true });
    }

    function refreshSheet() {
        const ul = sheetHost.querySelector(".wl-sheet__list");
        if (!ul) return;
        const focusId = document.activeElement && ul.contains(document.activeElement) ? document.activeElement.getAttribute("data-pick") : null;
        ul.innerHTML = sheetItems(sheetSlot).map(sheetRow).join("");
        if (focusId) {
            const el = ul.querySelector(`[data-pick="${focusId}"]`);
            if (el) el.focus({ preventScroll: true });
        }
    }

    function closeSheet() {
        if (!sheetSlot) return;
        sheetSlot = null;
        sheetHost.innerHTML = "";
        document.body.classList.remove("wl-lock");
        document.removeEventListener("keydown", onSheetKey);
        const back = sheetReturn ? main.querySelector(`[data-fk="${sheetReturn}"]`) : null;
        if (back) back.focus({ preventScroll: true });
    }

    function onSheetKey(e) {
        if (!sheetSlot) return;
        if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
        if (e.key !== "Tab") return;
        const els = Array.from(sheetHost.querySelectorAll(".wl-sheet button:not([disabled]), .wl-sheet a[href]"));
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    /* ---------- actions ---------- */
    function copyLink(btn) {
        const url = shareUrl();
        copyText(url).then(function (ok) {
            const label = btn.querySelector(".wl-copy__label");
            if (ok) {
                live.textContent = "Copied share link";
                if (label) label.textContent = "Copied";
                btn.classList.add("is-done");
            } else {
                live.textContent = "Copy failed, the link is in the address bar";
                window.prompt("Copy this link:", url);
            }
            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(function () {
                copyTimer = null;
                if (!btn.isConnected) return;
                if (label) label.textContent = "Copy share link";
                btn.classList.remove("is-done");
            }, 2000);
        });
    }

    host.addEventListener("click", function (e) {
        const pick = e.target.closest("[data-pick]");
        if (pick && sheetHost.contains(pick)) {
            if (pick.disabled) return;
            const item = d.itemMap[pick.getAttribute("data-pick")];
            toggleItem(pick.getAttribute("data-pick"));
            if (item && d.slotMap[item.slot].max === 1 && state.items[item.slot].indexOf(item.id) !== -1) closeSheet();
            return;
        }
        if (e.target.closest("a[href]")) return;
        const el = e.target.closest("[data-action]");
        if (!el || el.disabled) return;
        const action = el.getAttribute("data-action");
        const id = el.getAttribute("data-id");
        if (action === "faction" && d.factionMap[id]) {
            const next = cloneItems();
            next.faction = id;
            live.textContent = `${d.factionMap[id].name} selected`;
            change(next);
        } else if (action === "role" && d.roleMap[id]) {
            const next = cloneItems();
            next.role = id;
            live.textContent = `${d.roleMap[id].name} selected`;
            change(next);
        } else if (action === "preset") {
            const p = d.presets.find(function (x) { return x.id === id; });
            if (!p) return;
            live.textContent = `${p.name} loaded`;
            change(applyPreset(d, p));
        } else if (action === "remove") {
            const slotId = el.getAttribute("data-slot");
            const next = cloneItems();
            if (!next.items[slotId]) return;
            next.items[slotId] = next.items[slotId].filter(function (x) { return x !== id; });
            const item = d.itemMap[id];
            live.textContent = `${item ? item.name : "Item"} removed`;
            change(next);
            if (!main.contains(document.activeElement)) {
                const open = main.querySelector(`[data-fk="open-${slotId}"]`);
                if (open) open.focus({ preventScroll: true });
            }
        } else if (action === "open") {
            openSheet(el.getAttribute("data-slot"), el);
        } else if (action === "close-sheet") {
            closeSheet();
        } else if (action === "copy") {
            copyLink(el);
        } else if (action === "reset") {
            const next = emptyState(d);
            next.faction = state.faction;
            next.role = state.role;
            live.textContent = "Loadout cleared";
            change(next);
        } else if (action === "sources") {
            const det = main.querySelector("#wlSources");
            if (det) {
                det.open = true;
                det.scrollIntoView({ behavior: "smooth", block: "start" });
                const sum = det.querySelector("summary");
                if (sum) sum.focus({ preventScroll: true });
            }
        }
    });

    window.addEventListener("hashchange", function cleanup() {
        document.body.classList.remove("wl-lock");
        document.removeEventListener("keydown", onSheetKey);
    }, { once: true });

    persist();
    render();
}
