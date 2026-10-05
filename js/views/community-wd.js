/* Wardogs variants of the community stats views. Wardogs matches are recorded by the stats Worker from
   Bifrost's live feed once a minute: three factions, and only kills, deaths, cash and approximate time. */
import { escapeHtml, debounce } from "../util.js";
import { icon } from "../icons.js";
import { factionColour, mapTitle, durationText, timeAgo, minutes, isSafeId } from "../community-data.js";

export const WD_LB_STATS = [
    { id: "kills", label: "Kills" },
    { id: "deaths", label: "Deaths" },
    { id: "kd", label: "K/D" },
    { id: "cash", label: "Cash" },
    { id: "matches", label: "Matches" },
    { id: "time", label: "Time played" }
];

const SB_COLS = [
    { id: "kills", label: "K" },
    { id: "deaths", label: "D" },
    { id: "kdr", label: "K/D" },
    { id: "cash", label: "Cash" },
    { id: "time_seconds", label: "Time" }
];

function fmt(n, digits) {
    if (n == null || !isFinite(n)) return "–";
    return digits ? Number(n).toFixed(digits) : Math.round(n).toLocaleString("en-US");
}

function withServer(path, serverKey) {
    return path + "?server=" + encodeURIComponent(serverKey);
}

function playerHref(playerId, serverKey) {
    return withServer("#/community/player/" + encodeURIComponent(playerId), serverKey);
}

function matchHref(server, mapId, matchId) {
    return withServer("#/community/match/" + encodeURIComponent(mapId || "match") + "/" + encodeURIComponent(matchId), server.key);
}

function shortDate(iso) {
    const t = Date.parse(iso);
    return isFinite(t) ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

/** Approximation note; `since` is the Worker's recordingSince (ISO) when known. */
export function wdNoteHtml(since) {
    const date = shortDate(since);
    return `<p class="cm-wd-note">${icon("circle-info")}<span>Wardogs stats are recorded from live server data once a minute${date ? ` and started on ${escapeHtml(date)}` : ""}; numbers are approximate.</span></p>`;
}

export function factionChip(name, colour) {
    return `<span class="cm-fchip" style="--fc:${factionColour(name, colour)}"><i aria-hidden="true"></i>${escapeHtml(name || "–")}</span>`;
}

function factionList(m) {
    return Array.isArray(m && m.factionScores) ? m.factionScores.filter(function (f) { return f && f.name; }) : [];
}

/** Three-faction score line; the top-scoring faction is highlighted. */
export function factionScoreHtml(m, big) {
    const list = factionList(m);
    if (!list.length) return "";
    return `<div class="cm-fscore${big ? " cm-fscore--big" : ""}">${list.map(function (f) {
        const win = m.winner && f.name === m.winner;
        return `<span class="cm-fscore__f${win ? " win" : ""}" style="--fc:${factionColour(f.name, f.colour)}"${win ? ' title="Winner"' : ""}>`
            + `<i aria-hidden="true"></i><span class="cm-fscore__n">${escapeHtml(f.name)}</span><b>${f.score == null ? "–" : escapeHtml(f.score)}</b></span>`;
    }).join("")}</div>`;
}

/** m: a Wardogs match row from /v1/matches. */
export function wdMatchCard(server, m) {
    const meta = [timeAgo(m.end), durationText(m.start, m.end)];
    if (typeof m.playerCount === "number") meta.push(m.playerCount + " players");
    return `<a class="cm-match cm-match--wd glass card-hover" href="${matchHref(server, m.mapId, m.id)}" data-processed="1">
        <span class="cm-match__bg" aria-hidden="true"></span>
        <div class="cm-match__body">
            <div class="cm-match__head">
                <span class="cm-match__map">${escapeHtml(mapTitle(m))}</span>
                <span class="badge">${escapeHtml(m.gameMode || "")}</span>
            </div>
            ${factionScoreHtml(m)}
            <div class="cm-match__meta">${escapeHtml(meta.filter(Boolean).join(" · "))}</div>
        </div>
    </a>`;
}

/** Glance panel for /v1/servers/aho-wd/summary: totals plus faction win rates. */
export function wdGlanceHtml(d) {
    const stats = [
        ["Matches", fmt(d.matches)],
        ["Unique players", fmt(d.players)],
        ["Total kills", fmt(d.kills)],
        ["Avg players", typeof d.avgPlayers === "number" ? fmt(d.avgPlayers, 1) : "–"],
        ["Last match", d.lastMatchAt ? escapeHtml(timeAgo(d.lastMatchAt)) : "–"]
    ];
    const factions = (d.factionStats || []).filter(function (f) { return f && f.name && f.matches > 0; });
    const rates = factions.map(function (f) {
        const pct = Math.round(((f.wins || 0) / Math.max(1, f.matches)) * 100);
        const colour = factionColour(f.name, f.colour);
        return `<li>
            <span class="cm-fwr__name">${factionChip(f.name, f.colour)}</span>
            <span class="cm-fwr__bar" role="img" aria-label="${escapeHtml(f.name)} won ${pct}% of ${fmt(f.matches)} matches"><span style="width:${pct}%;background:${colour}"></span></span>
            <span class="cm-fwr__pct"><b>${pct}%</b><small>${fmt(f.wins)}/${fmt(f.matches)}</small></span>
        </li>`;
    }).join("");
    return `<div class="cm-glance__stats">${stats.map(function (s) { return `<div class="cm-glance__stat"><span>${s[0]}</span><b>${s[1]}</b></div>`; }).join("")}</div>
        ${rates ? `<div class="cm-wr cm-fwr">
            <div class="cm-wr__head"><h3>Faction win rates</h3><span class="cm-dim">Top score wins · ties not counted</span></div>
            <ul class="cm-fwr__list">${rates}</ul>
        </div>` : ""}`;
}

function scoreboardRows(doc) {
    return (doc.rows || []).filter(function (p) { return (p.timeSeconds || 0) > 0; }).map(function (p) {
        return {
            id: p.hidden ? null : p.playerId,
            name: p.name || "Unknown",
            side: p.side || "",
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            kdr: (p.kills || 0) / Math.max(1, p.deaths || 0),
            cash: p.cash || 0,
            time_seconds: p.timeSeconds || 0
        };
    });
}

function mvpCards(rows) {
    function best(key, filter) {
        const pool = filter ? rows.filter(filter) : rows;
        return pool.reduce(function (a, b) { return !a || b[key] > a[key] ? b : a; }, null);
    }
    return [
        { t: "Most kills", p: best("kills"), v: function (p) { return fmt(p.kills); } },
        { t: "Top earner", p: best("cash"), v: function (p) { return fmt(p.cash); } },
        { t: "Best K/D", p: best("kdr", function (r) { return r.kills >= 5; }), v: function (p) { return fmt(p.kdr, 2); } }
    ].filter(function (x) { return x.p; }).map(function (x) {
        return `<div class="cm-mvp glass"><span class="cm-mvp__t">${escapeHtml(x.t)}</span><span class="cm-mvp__v">${x.v(x.p)}</span><span class="cm-mvp__n">${escapeHtml(x.p.name)}</span></div>`;
    }).join("");
}

/** Renders the Wardogs match page into `host` and wires sorting/filtering. badgeHtml: the Bifrost credit link. */
export function renderWdMatch(host, server, match, badgeHtml) {
    const rows = scoreboardRows(match);
    const factions = factionList(match);
    const colours = {};
    factions.forEach(function (f) { colours[f.name] = f.colour; });
    const sides = factions.length ? factions.map(function (f) { return f.name; })
        : rows.map(function (r) { return r.side; }).filter(function (s, i, a) { return s && a.indexOf(s) === i; });
    const when = Date.parse(match.start);
    const state = { side: "all", sort: "kills" };

    const sortBtns = SB_COLS.map(function (c) { return `<th class="num" data-sort-th="${c.id}" aria-sort="none"><button type="button" class="cm-sort" data-sort="${c.id}">${escapeHtml(c.label)}</button></th>`; }).join("");
    host.innerHTML = `<section class="cm-match-hero glass">
            <div class="cm-match-hero__body">
                <p class="eyebrow">${[server.short, match.gameMode, isFinite(when) ? new Date(when).toLocaleString() : "", durationText(match.start, match.end)].filter(Boolean).map(escapeHtml).join(" · ")}</p>
                <h1 class="gold-text">${escapeHtml(mapTitle(match))}</h1>
                ${factionScoreHtml(match, true)}
                <p class="cm-dim">${rows.length} players</p>
                <div class="cm-bf-row cm-bf-row--top">${badgeHtml}</div>
            </div>
        </section>
        ${wdNoteHtml(null)}
        ${rows.length ? `<div class="cm-mvps cm-mvps--3">${mvpCards(rows)}</div>` : ""}
        <div class="filter-bar">
            <div class="filter-group" role="group" aria-label="Faction">
                <button type="button" class="chip" data-side="all">All</button>
                ${sides.map(function (s) { return `<button type="button" class="chip cm-fchip-btn" data-side="${escapeHtml(s)}" style="--fc:${factionColour(s, colours[s])}">${escapeHtml(s)}</button>`; }).join("")}
            </div>
            <input class="field cm-sb-filter" id="cmSbFilter" type="search" placeholder="Filter players…" aria-label="Filter players" autocomplete="off">
        </div>
        <div class="matrix-scroll glass cm-sb-wrap"><table class="data-table cm-table cm-sb cm-sb--wd">
            <thead><tr><th>#</th><th>Player</th><th>Faction</th>${sortBtns}</tr></thead>
            <tbody id="cmSbBody"></tbody>
        </table></div>`;

    const body = host.querySelector("#cmSbBody");
    const filterEl = host.querySelector("#cmSbFilter");
    function draw() {
        host.querySelectorAll("[data-side]").forEach(function (b) {
            const on = b.getAttribute("data-side") === state.side;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        host.querySelectorAll("[data-sort]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === state.sort); });
        host.querySelectorAll("[data-sort-th]").forEach(function (th) {
            th.setAttribute("aria-sort", th.getAttribute("data-sort-th") === state.sort ? "descending" : "none");
        });
        const q = filterEl.value.trim().toLowerCase();
        const list = rows.filter(function (x) {
            return (state.side === "all" || x.side === state.side) && (!q || String(x.name).toLowerCase().indexOf(q) !== -1);
        }).sort(function (a, b) { return b[state.sort] - a[state.sort]; });
        body.innerHTML = list.length ? list.map(function (r, i) {
            const name = isSafeId(r.id) ? `<a href="${playerHref(r.id, server.key)}">${escapeHtml(r.name)}</a>` : escapeHtml(r.name);
            return `<tr class="cm-sb-row">
                <td class="cm-dim">${i + 1}</td>
                <td class="cm-sb-name">${name}</td>
                <td>${r.side ? factionChip(r.side, colours[r.side]) : "–"}</td>
                <td class="num">${fmt(r.kills)}</td><td class="num">${fmt(r.deaths)}</td><td class="num">${fmt(r.kdr, 2)}</td>
                <td class="num">${fmt(r.cash)}</td><td class="num cm-dim">${minutes(r.time_seconds)}</td>
            </tr>`;
        }).join("") : `<tr><td colspan="8" class="result-empty">No players match.</td></tr>`;
    }
    host.querySelectorAll("[data-side]").forEach(function (b) { b.addEventListener("click", function () { state.side = b.getAttribute("data-side"); draw(); }); });
    host.querySelectorAll("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { state.sort = b.getAttribute("data-sort"); draw(); }); });
    filterEl.addEventListener("input", debounce(draw, 120));
    draw();
}

/** Wardogs player profile body. opts: { cardUrl, badgeHtml }. The caller wires #cmShare. */
export function wdPlayerHtml(server, p, opts) {
    const t = p.totals || {};
    const recent = (p.recentMatches || []).map(function (m) {
        const res = m.won == null ? `<span class="cm-res">–</span>` : m.won ? `<span class="cm-res win">W</span>` : `<span class="cm-res loss">L</span>`;
        const href = isSafeId(m.mapId) && isSafeId(m.matchId) ? matchHref(server, m.mapId, m.matchId) : null;
        const inner = `${res}
            <span class="cm-recent__map">${escapeHtml(String(m.mapPretty || m.mapId || "").replace(/\s*\(.*$/, ""))}<small>${m.side ? factionChip(m.side) : ""} ${escapeHtml(timeAgo(m.end))}</small></span>
            <span class="cm-recent__kd"><b>${fmt(m.kills)}</b>–${fmt(m.deaths)}</span>
            <span class="cm-dim">${fmt(m.cash)} cash</span>`;
        return href ? `<a class="cm-recent glass card-hover" href="${href}">${inner}</a>` : `<div class="cm-recent glass">${inner}</div>`;
    }).join("");
    return `<header class="section-head cm-player-head">
            <p class="eyebrow">${escapeHtml(server.name)}</p>
            <h1 class="gold-text">${escapeHtml(p.name)}</h1>
            <p class="lead">${fmt(t.matches)} matches · ${minutes(t.timeSeconds)} played · last seen ${escapeHtml(timeAgo(p.lastSeen))}</p>
            <div class="cm-player-actions">
                <button type="button" class="btn btn-primary cm-join__btn" id="cmShare">${icon("share-nodes")} Share</button>
                <a class="btn btn-ghost cm-join__btn" href="${escapeHtml(opts.cardUrl)}" target="_blank" rel="noopener" download>${icon("download")} Download stat card</a>
            </div>
            <div class="cm-bf-row cm-bf-row--top">${opts.badgeHtml}</div>
        </header>
        <dl class="spec-grid cm-totals reveal">
            <div class="spec"><dt>Kills</dt><dd>${fmt(t.kills)}</dd></div>
            <div class="spec"><dt>Deaths</dt><dd>${fmt(t.deaths)}</dd></div>
            <div class="spec"><dt>K/D</dt><dd>${fmt(p.kd, 2)}</dd></div>
            <div class="spec"><dt>Cash</dt><dd>${fmt(t.cash)}</dd></div>
            <div class="spec"><dt>Wins</dt><dd>${fmt(p.wins)}</dd></div>
            <div class="spec"><dt>Losses</dt><dd>${fmt(p.losses)}</dd></div>
            <div class="spec"><dt>Matches</dt><dd>${fmt(t.matches)}</dd></div>
            <div class="spec"><dt>Time played</dt><dd>${minutes(t.timeSeconds)}</dd></div>
        </dl>
        ${wdNoteHtml(null)}
        <h2 class="gold-text" style="font-size:1.6rem;margin:2.2rem 0 1rem">Recent matches</h2>
        <div class="cm-recent-list">${recent || `<p class="cm-dim">No matches yet.</p>`}</div>`;
}
