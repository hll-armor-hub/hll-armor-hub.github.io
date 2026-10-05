/* Wardogs data layer: per-season JSON under /data/wardogs/<season>/ */

const cache = new Map();

function fetchSeasonFile(season, file) {
    const key = season + "/" + file;
    if (!cache.has(key)) {
        const p = fetch(`/data/wardogs/${encodeURIComponent(season)}/${file}`).then(function (r) {
            if (!r.ok) throw new Error(`Failed to load Wardogs ${file} (${r.status})`);
            return r.json();
        }).catch(function (err) {
            cache.delete(key);
            throw err;
        });
        cache.set(key, p);
    }
    return cache.get(key);
}

export function loadCashRewards(season) {
    return fetchSeasonFile(season, "cash-rewards.json");
}

export function loadFireMission(season) {
    return fetchSeasonFile(season, "fire-mission.json");
}

export function zoneMultiplier(action, zoneId) {
    if (!zoneId || zoneId === "none") return 1;
    const m = action.zone && action.zone[zoneId];
    return typeof m === "number" ? m : 1;
}

export function payout(action, zoneId) {
    return Math.round(action.base * zoneMultiplier(action, zoneId));
}

export function findAction(doc, id) {
    return doc.actions.find(function (a) { return a.id === id; }) || null;
}

export function formatCash(n) {
    const sign = n < 0 ? "−" : "";
    return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
}
