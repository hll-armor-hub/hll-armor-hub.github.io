/* Vietnam Tankulator - % hit-location simulation (shared M48 / T-54 model) */
export { getVietnamTankulatorDoc } from "./data.js";
import { getVietnamTankulatorDoc, getVietnamTanks } from "./data.js";

const DEFAULT_MAX = 8;

export function getVietnamTankulatorLocations() {
    const doc = getVietnamTankulatorDoc();
    return (doc && doc.locations) || [];
}

export function getVietnamTankulatorNote() {
    const doc = getVietnamTankulatorDoc();
    return (doc && doc.note) || "";
}

export function getVietnamRearBaseline() {
    const doc = getVietnamTankulatorDoc();
    const n = doc && Number(doc.rearBaselineHullDamage);
    if (Number.isFinite(n) && n > 0) return n;
    const rear = findVietnamLocation("rear");
    return rear && Number.isFinite(Number(rear.hullDamagePerShot)) ? Number(rear.hullDamagePerShot) : 75;
}

/** Human-readable damage calc for the selected hit location (resistance when relevant). */
export function describeVietnamDamage(locationKey) {
    const loc = findVietnamLocation(locationKey);
    if (!loc) return null;

    if (loc.kind === "hull") {
        const baseline = getVietnamRearBaseline();
        const resist = Number(loc.resistanceVsRearPct);
        const effective = Number(loc.hullDamagePerShot);
        const hasResist = Number.isFinite(resist) && resist > 0;
        return {
            kind: "hull",
            label: loc.label,
            baseline,
            resistancePct: Number.isFinite(resist) ? resist : 0,
            effective,
            shotsToKill: loc.shotsToKill,
            formula: hasResist
                ? `${baseline}% rear baseline - ${resist}% resist = ${effective}% hull/shot`
                : `${baseline}% rear baseline - 0% resist = ${effective}% hull/shot`
        };
    }

    return {
        kind: "component",
        label: loc.label,
        component: loc.component,
        shotsToKill: loc.shotsToKill,
        shots: (loc.shots || []).slice(),
        postKoHullDamage: Number(loc.postKoHullDamage) || 0,
        formula: loc.component === "turret"
            ? "Turret path: component spill into hull (no hull-face resist)"
            : "Tracks path: component spill into hull (no hull-face resist)"
    };
}

export function getVietnamTankulatorTankNames() {
    const doc = getVietnamTankulatorDoc();
    if (doc && Array.isArray(doc.tanks) && doc.tanks.length) return doc.tanks.slice();
    return getVietnamTanks().map(function (t) { return t.name; });
}

export function findVietnamLocation(key) {
    return getVietnamTankulatorLocations().find(function (loc) { return loc.key === key; }) || null;
}

function clampPct(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}

function roundPct(n) {
    return Math.round(n * 10) / 10;
}

/**
 * Simulate consecutive hits to one location from a full-health tank.
 * options (future prior): { hullPct, turretPct, tracksPct }
 */
export function simulateVietnamHit(locationKey, maxShots, options) {
    maxShots = maxShots || DEFAULT_MAX;
    options = options || {};
    const loc = findVietnamLocation(locationKey);
    if (!loc) return null;

    let hull = clampPct(options.hullPct != null ? options.hullPct : 100);
    let turret = clampPct(options.turretPct != null ? options.turretPct : 100);
    let tracks = clampPct(options.tracksPct != null ? options.tracksPct : 100);

    const shotResults = [];
    let shotsToKill = null;

    if (hull <= 0) {
        return {
            location: loc,
            shotsToKill: 0,
            shotResults: [],
            start: { hull, turret, tracks },
            end: { hull, turret, tracks }
        };
    }

    const start = { hull, turret, tracks };

    for (let i = 1; i <= maxShots; i += 1) {
        const before = { hull, turret, tracks };
        let hullDealt = 0;
        let componentDealt = 0;
        let componentKey = null;

        if (loc.kind === "hull") {
            hullDealt = Math.min(hull, Number(loc.hullDamagePerShot) || 0);
            hull = clampPct(hull - hullDealt);
        } else {
            componentKey = loc.component;
            const table = loc.shots || [];
            const row = i <= table.length ? table[i - 1] : null;
            const compBefore = componentKey === "turret" ? turret : tracks;

            if (row) {
                componentDealt = Math.min(compBefore, Number(row.componentDamage) || 0);
                hullDealt = Math.min(hull, Number(row.hullDamage) || 0);
            } else {
                componentDealt = 0;
                hullDealt = Math.min(hull, Number(loc.postKoHullDamage) || 0);
            }

            if (componentKey === "turret") {
                turret = clampPct(turret - componentDealt);
            } else if (componentKey === "tracks") {
                tracks = clampPct(tracks - componentDealt);
            }
            hull = clampPct(hull - hullDealt);
        }

        const after = { hull, turret, tracks };
        const killed = hull <= 0;
        if (killed && shotsToKill == null) shotsToKill = i;

        shotResults.push({
            shot: i,
            hullDealt: roundPct(hullDealt),
            componentDealt: roundPct(componentDealt),
            componentKey,
            before: {
                hull: roundPct(before.hull),
                turret: roundPct(before.turret),
                tracks: roundPct(before.tracks)
            },
            after: {
                hull: roundPct(after.hull),
                turret: roundPct(after.turret),
                tracks: roundPct(after.tracks)
            },
            killed
        });

        if (killed) break;
    }

    return {
        location: loc,
        shotsToKill,
        shotResults,
        start: {
            hull: roundPct(start.hull),
            turret: roundPct(start.turret),
            tracks: roundPct(start.tracks)
        },
        end: {
            hull: roundPct(hull),
            turret: roundPct(turret),
            tracks: roundPct(tracks)
        }
    };
}
