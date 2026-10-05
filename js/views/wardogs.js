/* Wardogs - overview, getting started, cash planner */
import { escapeHtml, debounce, videoCard } from "../util.js";
import { buildHash } from "../router.js";
import { icon } from "../icons.js";
import { loadPref, savePref } from "../tool-mode.js";
import { loadCashRewards, payout, zoneMultiplier, findAction, formatCash } from "../wardogs-data.js";
import { WD_FACTIONS, getTeam, setTeam } from "../wardogs-team.js";

const IMG = "/images/wardogs";

const FACTIONS = WD_FACTIONS;

const ROLES = [
    { id: "infantry", name: "Infantry" },
    { id: "medic", name: "Medic" },
    { id: "support", name: "Support" },
    { id: "recon", name: "Recon" },
    { id: "driver", name: "Driver" },
    { id: "pilot", name: "Pilot" }
];

const SECTIONS = [
    { id: "cash", icon: "trophy", t: "Cash Planner", d: "Every payout in the game, ranked. Toggle zone bonuses and see how fast you can afford your next kit.", live: true },
    { id: "getting-started", icon: "graduation-cap", t: "Getting Started" },
    { id: "armory", icon: "crosshairs", t: "Armory" },
    { id: "vehicles", icon: "truck-monster", t: "Vehicles" },
    { id: "loadouts", icon: "box", t: "Loadout Builder" },
    { id: "maps", icon: "map", t: "Maps & Fire Mission" },
    { id: "progression", icon: "rocket", t: "Progression" }
];

function seasonLabel(era) {
    const m = /^s(\d+)$/.exec(era || "");
    return m ? "Season " + m[1] : era;
}

function head(route, title, lead) {
    return `<header class="section-head">
        <p class="eyebrow">Wardogs · ${escapeHtml(seasonLabel(route.era))}</p>
        <h1 class="gold-text">${escapeHtml(title)}</h1>
        ${lead ? `<p class="lead">${lead}</p>` : ""}
    </header>`;
}

function errorNotice(err) {
    return `<div class="notice wd-error">${icon("triangle-exclamation")} ${escapeHtml(err.message || String(err))}</div>`;
}

/* ---------------- Overview ---------------- */

function sectionTile(route, s) {
    if (!s.live) {
        return `<div class="tile glass reveal wd-tile--wip" aria-disabled="true">
            <span class="tile__icon">${icon(s.icon)}</span>
            <h3>${escapeHtml(s.t)} <span class="badge">WIP</span></h3>
        </div>`;
    }
    return `<a class="tile glass card-hover reveal" href="${buildHash("wardogs", route.era, s.id)}">
        <span class="tile__icon">${icon(s.icon)}</span>
        <h3>${escapeHtml(s.t)}</h3>
        <p>${escapeHtml(s.d)}</p>
        <span class="tile__link">Open</span>
    </a>`;
}

export const overview = {
    render: function (route) {
        const cashHref = buildHash("wardogs", route.era, "cash");
        const team = getTeam();
        const factions = FACTIONS.map(function (f) {
            const on = f.id === team;
            return `<button type="button" class="wd-faction${on ? " active" : ""}" data-team="${f.id}" aria-pressed="${on}"><img src="${IMG}/factions/${f.id}.png" alt="" loading="lazy"><span class="wd-faction__name">${escapeHtml(f.name)}</span></button>`;
        }).join("");
        return `<div class="wrap wrap-wide">
            <section class="glass-strong glass reveal wd-hero">
                <p class="eyebrow center">Wardogs · ${escapeHtml(seasonLabel(route.era))}</p>
                <h1 class="display gold-text wd-hero__title">Wardogs Field Desk</h1>
                <p class="lead" style="margin:0 auto 1.6rem">Three factions, one Control Zone, and every life paid for in cash. Tools built from the game's own numbers.</p>
                <p class="wd-pick" id="wdPickLabel">Pick your team</p>
                <div class="wd-factions${team ? " has-team" : ""}" role="group" aria-labelledby="wdPickLabel">${factions}</div>
                <p class="wd-pick-hint" id="wdPickHint">${team ? "Tap your team again to go back to default" : "Recolours the Wardogs pages to your faction"}</p>
                <div class="hero__cta" style="margin-top:2rem">
                    <a class="btn btn-primary" href="${cashHref}">Open Cash Planner</a>
                </div>
            </section>

            <dl class="spec-grid wd-facts reveal">
                <div class="spec"><dt>Players</dt><dd>Up to 100</dd></div>
                <div class="spec"><dt>Factions</dt><dd>3</dd></div>
                <div class="spec"><dt>Win condition</dt><dd>First to 100 points</dd></div>
                <div class="spec"><dt>Starting cash</dt><dd>$10,000</dd></div>
            </dl>

            <p class="eyebrow">Tools</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Pick your desk</h2>
            <div class="grid cols-3">${SECTIONS.map(function (s) { return sectionTile(route, s); }).join("")}</div>

            <p class="eyebrow" style="margin-top:2.6rem">Featured</p>
            <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">What is Wardogs?</h2>
            <div class="grid cols-2">${videoCard("nmkg48Y_vOk", "They built the ultimate 100-player military simulator", 11)}</div>
        </div>`;
    },
    mount: function (root) {
        const group = root.querySelector(".wd-factions");
        const hint = root.querySelector("#wdPickHint");
        group.addEventListener("click", function (e) {
            const btn = e.target.closest("[data-team]");
            if (!btn) return;
            const id = btn.getAttribute("data-team");
            const team = getTeam() === id ? null : id;
            setTeam(team);
            group.classList.toggle("has-team", !!team);
            group.querySelectorAll("[data-team]").forEach(function (b) {
                const on = b.getAttribute("data-team") === team;
                b.classList.toggle("active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            hint.textContent = team ? "Tap your team again to go back to default" : "Recolours the Wardogs pages to your faction";
        });
    }
};

/* ---------------- Getting started ---------------- */

function tip(doc, id, zoneId, text) {
    const a = findAction(doc, id);
    if (!a) return "";
    return text(a, payout(a, zoneId || "none"));
}

function gettingStartedTips(doc) {
    const kill = findAction(doc, "playerkill-context-defaultreward");
    const killValue = kill ? payout(kill, "none") : 0;
    const rows = [
        tip(doc, "playerkill-context-defaultreward", "none", function (a, v) {
            return { i: "crosshairs", t: "Fight inside the zone", d: `A kill pays ${formatCash(v)} anywhere, ${formatCash(payout(a, "cz"))} in the Control Zone and ${formatCash(payout(a, "hz"))} in the Hot Zone. The same fight is worth up to ×${zoneMultiplier(a, "hz")} more in the right place.` };
        }),
        tip(doc, "revive-context-defaultreward", "none", function (a, v) {
            const kills = killValue ? ` That's the same as ${Math.round(v / killValue)} kills.` : "";
            return { i: "heart-crack", t: "Medics get paid", d: `One revive pays ${formatCash(v)}, and ×${zoneMultiplier(a, "hz")} in the Hot Zone.${kills} Picking teammates up is one of the fastest ways to fund your kit.` };
        }),
        tip(doc, "playerkill-context-defaultreward", "none", function (a) {
            if (!a.teamPenalty) return null;
            const gone = killValue ? ` That's ${Math.round(Math.abs(a.teamPenalty) / killValue)} enemy kills gone.` : "";
            return { i: "ban", t: "Check your fire", d: `A team kill costs you ${formatCash(Math.abs(a.teamPenalty))}.${gone}` };
        }),
        tip(doc, "hotzonemagnet-matchscore-magnetactivatedinstigator", "none", function (a, v) {
            return { i: "bolt", t: "Play the magnet", d: `Activating the magnet pays ${formatCash(v)}, and everyone nearby gets paid too. Destroying an enemy magnet pays ${formatCash(payout(findAction(doc, "deployabledestroyed-buildable-hotzonemagnet") || a, "none"))}.` };
        }),
        tip(doc, "deployabledestroyed-buildable-fob", "none", function (a, v) {
            return { i: "bomb", t: "Hunt FOBs", d: `Destroying an enemy FOB pays ${formatCash(v)}. Placing your own pays ${formatCash(payout(findAction(doc, "buildableplaced-buildable-fob") || a, "none"))}.` };
        }),
        tip(doc, "vehicledestroyed-rotary-havoc", "none", function (a, v) {
            return { i: "helicopter", t: "Big game", d: `A Havoc is worth ${formatCash(v)} and a heavy tank ${formatCash(payout(findAction(doc, "vehicledestroyed-tnk-01-heavy") || a, "none"))}. Bring launchers when they show up.` };
        })
    ].filter(Boolean);
    return rows.map(function (r) {
        return `<div class="gs-row glass reveal"><span class="gs-row__icon">${icon(r.i)}</span><div class="gs-row__body"><h3>${escapeHtml(r.t)}</h3><p>${escapeHtml(r.d)}</p></div></div>`;
    }).join("");
}

export const gettingStarted = {
    render: function (route) {
        const roles = ROLES.map(function (r) {
            return `<figure class="wd-role"><img src="${IMG}/roles/${r.id}.png" alt="" loading="lazy"><figcaption>${escapeHtml(r.name)}</figcaption></figure>`;
        }).join("");
        return `<div class="wrap">
            ${head(route, "Getting Started", "The short version: hold the zone, stay alive, and spend smart. Every life is bought, so cash is your real health bar.")}

            <div class="gs-rows" style="margin-bottom:2.4rem">
                <div class="gs-row glass reveal"><span class="gs-row__icon">${icon("flag")}</span><div class="gs-row__body"><h3>How a match is won</h3><p>Three factions fight over a Control Zone that moves around a huge map. Holding it scores points, and the first faction to 100 wins.</p></div></div>
                <div class="gs-row glass reveal"><span class="gs-row__icon">${icon("weight-hanging")}</span><div class="gs-row__body"><h3>Money is everything</h3><p>You start with $10,000 and buy your loadout every time you deploy. Cash carries between matches, so every kill, revive, and crate adds up.</p></div></div>
            </div>

            <p class="eyebrow">Roles</p>
            <h2 class="gold-text" style="font-size:1.6rem;margin:.4rem 0 1rem">Six ways to play</h2>
            <div class="wd-roles reveal" style="margin-bottom:2.4rem">${roles}</div>

            <p class="eyebrow">Earn faster</p>
            <h2 class="gold-text" style="font-size:1.6rem;margin:.4rem 0 1rem">Where the money is</h2>
            <div class="gs-rows" id="wdTips"><div class="loading"><div class="spinner"></div></div></div>
            <p style="margin-top:1.4rem"><a class="btn btn-ghost" href="${buildHash("wardogs", route.era, "cash")}">${icon("trophy")} See every payout in the Cash Planner</a></p>
        </div>`;
    },
    mount: function (root, route) {
        const el = root.querySelector("#wdTips");
        loadCashRewards(route.era).then(function (doc) {
            el.innerHTML = gettingStartedTips(doc);
            el.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });
        }).catch(function (err) { el.innerHTML = errorNotice(err); });
    }
};

/* ---------------- Cash planner ---------------- */

const PREF_ZONE = "wd-cash-zone";
const PREF_CAT = "wd-cash-cat";
const PREF_GOAL = "wd-cash-goal";
const PREF_TICKS = "wd-cash-ticks";

function actionIcon(doc, a) {
    if (a.img) return `<img class="wd-cash-row__img" src="${IMG}/vehicles/${escapeHtml(a.img)}.png" alt="" loading="lazy">`;
    const cat = doc.categories.find(function (c) { return c.id === a.category; });
    return `<span class="wd-cash-row__glyph">${icon(cat ? cat.icon : "circle-info")}</span>`;
}

function timesNeeded(goal, value) {
    if (!goal || value <= 0) return null;
    return Math.ceil(goal / value);
}

function cashRow(doc, a, zoneId, max, goal) {
    const value = payout(a, zoneId);
    const mult = zoneMultiplier(a, zoneId);
    const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
    const cat = doc.categories.find(function (c) { return c.id === a.category; });
    const n = timesNeeded(goal, value);
    const per = a.unit === "tick" ? " / tick" : "";
    const bits = [];
    if (mult !== 1) bits.push(`<span class="badge">×${mult} zone</span>`);
    if (a.unit === "tick") bits.push(`<span class="badge wd-badge--muted">Repeats</span>`);
    if (a.teamPenalty) bits.push(`<span class="wd-penalty" title="What you lose doing this to your own side">Friendly: ${formatCash(a.teamPenalty)}</span>`);
    return `<li class="wd-cash-row glass">
        ${actionIcon(doc, a)}
        <div class="wd-cash-row__main">
            <div class="wd-cash-row__top">
                <span class="wd-cash-row__label">${escapeHtml(a.label)}</span>
                <span class="wd-cash-row__value">${formatCash(value)}<small>${per}</small></span>
            </div>
            <div class="wd-cash-bar"><span style="width:${pct}%"></span></div>
            <div class="wd-cash-row__meta">
                <span class="wd-cash-row__cat">${escapeHtml(cat ? cat.label : a.category)}</span>
                ${bits.join("")}
                ${n ? `<span class="wd-cash-row__goal">${n.toLocaleString("en-US")}× to reach ${formatCash(goal)}</span>` : ""}
            </div>
            ${a.note ? `<p class="wd-cash-row__note">${escapeHtml(a.note)}</p>` : ""}
        </div>
    </li>`;
}

function quickWins(doc, list, zoneId) {
    const top = list.filter(function (a) { return a.unit !== "tick"; }).slice(0, 3);
    return top.map(function (a, i) {
        return `<div class="wd-win glass">
            <span class="wd-win__rank">#${i + 1}</span>
            <span class="wd-win__value">${formatCash(payout(a, zoneId))}</span>
            <span class="wd-win__label">${escapeHtml(a.label)}</span>
        </div>`;
    }).join("");
}

export const cash = {
    render: function (route) {
        return `<div class="wrap wrap-wide">
            ${head(route, "Cash Planner", "Every way to earn in Wardogs, ranked by payout. Pick where you're fighting and what you're saving for.")}
            <div id="wdCash"><div class="loading"><div class="spinner"></div><p>Loading payouts…</p></div></div>
        </div>`;
    },
    mount: function (root, route) {
        const host = root.querySelector("#wdCash");
        loadCashRewards(route.era).then(function (doc) {
            mountPlanner(host, doc);
        }).catch(function (err) { host.innerHTML = errorNotice(err); });
    }
};

function mountPlanner(host, doc) {
    const state = {
        zone: loadPref(PREF_ZONE, "none"),
        cat: loadPref(PREF_CAT, "all"),
        goal: Number(loadPref(PREF_GOAL, "10000")) || 0,
        ticks: loadPref(PREF_TICKS, "1") === "1",
        q: ""
    };
    if (!doc.zones.some(function (z) { return z.id === state.zone; })) state.zone = "none";
    if (state.cat !== "all" && !doc.categories.some(function (c) { return c.id === state.cat; })) state.cat = "all";

    const zoneBtns = doc.zones.map(function (z) {
        return `<button type="button" class="calc-tab" data-zone="${z.id}">${escapeHtml(z.label)}</button>`;
    }).join("");
    const catChips = [{ id: "all", label: "All" }].concat(doc.categories).map(function (c) {
        return `<button type="button" class="chip" data-cat="${c.id}">${c.icon ? icon(c.icon) : ""}${escapeHtml(c.label)}</button>`;
    }).join("");

    host.innerHTML = `<div class="wd-cash-layout">
        <aside class="tool-panel glass wd-cash-controls">
            <label class="field-label">Where you're fighting</label>
            <div class="calc-tabs" role="group" aria-label="Zone">${zoneBtns}</div>
            <label class="field-label" for="wdGoal">Saving for</label>
            <div class="wd-goal">
                <span>$</span><input class="field" id="wdGoal" type="number" inputmode="numeric" min="0" step="500" value="${state.goal || ""}" placeholder="10000">
            </div>
            <label class="field-label" for="wdSearch" style="margin-top:1.1rem">Search</label>
            <input class="field" id="wdSearch" type="search" placeholder="Revive, FOB, Havoc…" autocomplete="off">
            <label class="wd-check"><input type="checkbox" id="wdTicks"${state.ticks ? " checked" : ""}> Include repeating rewards (zone holds, repairs)</label>
            <p class="wd-fine">Payouts are base values from the game's reward tables, with the zone bonus applied. Some rewards scale with health restored or assists.</p>
        </aside>
        <section class="wd-cash-results">
            <div class="wd-wins" id="wdWins"></div>
            <div class="filter-bar"><div class="filter-group" role="group" aria-label="Category">${catChips}</div></div>
            <ol class="wd-cash-list" id="wdList"></ol>
        </section>
    </div>`;

    const listEl = host.querySelector("#wdList");
    const winsEl = host.querySelector("#wdWins");

    function draw() {
        host.querySelectorAll("[data-zone]").forEach(function (b) {
            const on = b.getAttribute("data-zone") === state.zone;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        host.querySelectorAll("[data-cat]").forEach(function (b) {
            const on = b.getAttribute("data-cat") === state.cat;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        const q = state.q.trim().toLowerCase();
        const list = doc.actions.filter(function (a) {
            if (state.cat !== "all" && a.category !== state.cat) return false;
            if (!state.ticks && a.unit === "tick") return false;
            if (q && a.label.toLowerCase().indexOf(q) === -1) return false;
            return true;
        }).sort(function (x, y) { return payout(y, state.zone) - payout(x, state.zone); });
        const max = list.length ? payout(list[0], state.zone) : 0;
        winsEl.innerHTML = quickWins(doc, list, state.zone);
        listEl.innerHTML = list.length
            ? list.map(function (a) { return cashRow(doc, a, state.zone, max, state.goal); }).join("")
            : `<li class="result-empty">No payouts match.</li>`;
    }

    host.querySelectorAll("[data-zone]").forEach(function (b) {
        b.addEventListener("click", function () {
            state.zone = b.getAttribute("data-zone");
            savePref(PREF_ZONE, state.zone);
            draw();
        });
    });
    host.querySelectorAll("[data-cat]").forEach(function (b) {
        b.addEventListener("click", function () {
            state.cat = b.getAttribute("data-cat");
            savePref(PREF_CAT, state.cat);
            draw();
        });
    });
    host.querySelector("#wdGoal").addEventListener("input", debounce(function (e) {
        state.goal = Math.max(0, Number(e.target.value) || 0);
        savePref(PREF_GOAL, String(state.goal));
        draw();
    }, 120));
    host.querySelector("#wdSearch").addEventListener("input", debounce(function (e) {
        state.q = e.target.value || "";
        draw();
    }, 120));
    host.querySelector("#wdTicks").addEventListener("change", function (e) {
        state.ticks = e.target.checked;
        savePref(PREF_TICKS, state.ticks ? "1" : "0");
        draw();
    });

    draw();
}

/* ---------------- Work in progress ---------------- */

export const wip = {
    render: function (route) {
        const s = SECTIONS.find(function (x) { return x.id === route.section; });
        const title = s ? s.t : "Work in progress";
        return `<div class="wrap">
            ${head(route, title, "")}
            <div class="glass wd-soon">
                <span class="wd-soon__icon">${icon("screwdriver-wrench")}</span>
                <p><strong>WIP</strong></p>
                <a class="btn btn-ghost" href="${buildHash("wardogs", route.era, "cash")}">${icon("trophy")} Open the Cash Planner</a>
            </div>
        </div>`;
    }
};
