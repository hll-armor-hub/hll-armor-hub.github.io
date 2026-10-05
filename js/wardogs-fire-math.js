/* Wardogs fire mission geometry: grid refs <-> meters, distance, bearing, elevation lookup.
   Internal coordinates are meters from the map's top-left corner, X east, Y south. */

export function gridSpec(map) {
    const size = Number(map && map.sizeMeters) > 0 ? Number(map.sizeMeters) : 2000;
    const cols = Math.max(1, Math.min(52, Math.round(Number(map && map.gridCols) || 10)));
    const rows = Math.max(1, Math.min(99, Math.round(Number(map && map.gridRows) || cols)));
    return {
        size: size,
        cols: cols,
        rows: rows,
        cellW: size / cols,
        cellH: size / rows,
        keypad: !(map && map.keypad === false),
        yUp: !!(map && map.yUp)
    };
}

export function colLetters(i) {
    let s = "";
    let n = i;
    do {
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
}

function letterIndex(letters) {
    let n = 0;
    for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
}

function round1(n) { return Math.round(n * 10) / 10; }

const XY_RE = /^X?\s*(-?\d+(?:\.\d+)?)\s*(?:[,;/]\s*|\s+)Y?\s*(-?\d+(?:\.\d+)?)$/;
const GRID_RE = /^([A-Z]{1,2})\s*[-.]?\s*(\d+)([\s\-.,/:K\d]*)$/;

/** Parse "D7", "D7-3", "d73", "D7-3-5", or raw meters "1240 860" / "x1240 y860". */
export function parseRef(text, spec) {
    const raw = String(text == null ? "" : text).trim().toUpperCase();
    if (!raw) return { empty: true };

    const xy = XY_RE.exec(raw);
    if (xy) {
        const x = Number(xy[1]);
        const yIn = Number(xy[2]);
        const y = spec.yUp ? spec.size - yIn : yIn;
        const outside = x < 0 || y < 0 || x > spec.size || y > spec.size;
        return { x: x, y: y, precision: 0, ref: `${round1(x)} / ${round1(yIn)}`, raw: true, outside: outside };
    }

    const g = GRID_RE.exec(raw);
    if (!g) return { error: "Use a grid like D7 or D7-3, or meters like 1240 860" };

    const col = letterIndex(g[1]);
    if (col >= spec.cols) return { error: `Column ${g[1]} is off this map (A-${colLetters(spec.cols - 1)})` };

    let digits = g[2];
    let tail = g[3].replace(/[\s\-.,/:K]/g, "");
    let row = parseInt(digits, 10);
    if (row > spec.rows) {
        let split = -1;
        for (let k = digits.length - 1; k >= 1; k--) {
            const r = parseInt(digits.slice(0, k), 10);
            if (r >= 1 && r <= spec.rows) { split = k; break; }
        }
        if (split < 0) return { error: `Row ${digits} is off this map (1-${spec.rows})` };
        row = parseInt(digits.slice(0, split), 10);
        tail = digits.slice(split) + tail;
    }
    if (row < 1 || row > spec.rows) return { error: `Row ${row} is off this map (1-${spec.rows})` };
    if (/[^1-9]/.test(tail)) return { error: "Keypad digits are 1-9 (7 8 9 top row, 1 2 3 bottom)" };
    if (tail.length && !spec.keypad) return { error: "This map has no keypad subdivision" };
    if (tail.length > 4) return { error: "Up to 4 keypad levels" };

    let x0 = col * spec.cellW;
    let y0 = (row - 1) * spec.cellH;
    let w = spec.cellW;
    let h = spec.cellH;
    for (let i = 0; i < tail.length; i++) {
        const kp = Number(tail[i]) - 1;
        w /= 3;
        h /= 3;
        x0 += (kp % 3) * w;
        y0 += (2 - Math.floor(kp / 3)) * h;
    }
    const ref = colLetters(col) + row + (tail.length ? "-" + tail.split("").join("-") : "");
    return { x: x0 + w / 2, y: y0 + h / 2, precision: Math.max(w, h) / 2, ref: ref };
}

/** Grid ref for a point, with `levels` keypad digits. */
export function formatRef(x, y, spec, levels) {
    const col = Math.max(0, Math.min(spec.cols - 1, Math.floor(x / spec.cellW)));
    const row = Math.max(0, Math.min(spec.rows - 1, Math.floor(y / spec.cellH)));
    let ref = colLetters(col) + (row + 1);
    if (!spec.keypad) return ref;
    let lx = x - col * spec.cellW;
    let ly = y - row * spec.cellH;
    let w = spec.cellW;
    let h = spec.cellH;
    const n = levels == null ? 1 : levels;
    for (let i = 0; i < n; i++) {
        w /= 3;
        h /= 3;
        const kc = Math.max(0, Math.min(2, Math.floor(lx / w)));
        const kr = Math.max(0, Math.min(2, Math.floor(ly / h)));
        ref += "-" + ((2 - kr) * 3 + kc + 1);
        lx -= kc * w;
        ly -= kr * h;
    }
    return ref;
}

/** Distance (m) and bearing from gun to target. North is up (toward Y = 0). */
export function solve(gun, tgt, milsPerCircle) {
    const mpc = Number(milsPerCircle) > 0 ? Number(milsPerCircle) : 6400;
    const dx = tgt.x - gun.x;
    const dn = gun.y - tgt.y;
    const distance = Math.hypot(dx, dn);
    let deg = Math.atan2(dx, dn) * 180 / Math.PI;
    if (deg < 0) deg += 360;
    if (deg >= 359.95) deg = 0;
    return {
        distance: distance,
        bearingDeg: deg,
        bearingMil: (deg / 360) * mpc,
        backDeg: (deg + 180) % 360
    };
}

/** Move the target along / across the gun-target line. add > 0 = further, right > 0 = right as seen from the gun. */
export function adjust(gun, tgt, add, right) {
    const dx = tgt.x - gun.x;
    const dy = tgt.y - gun.y;
    const d = Math.hypot(dx, dy);
    const ux = d > 0 ? dx / d : 0;
    const uy = d > 0 ? dy / d : -1;
    return { x: tgt.x + ux * add - uy * right, y: tgt.y + uy * add + ux * right };
}

/** Elevation from a weapon's range table, linear between rows. Never extrapolates. */
export function elevationFor(weapon, distance) {
    const min = Number.isFinite(weapon.minRange) ? weapon.minRange : null;
    const max = Number.isFinite(weapon.maxRange) ? weapon.maxRange : null;
    if (min != null && distance < min) return { status: "short", min: min, max: max };
    if (max != null && distance > max) return { status: "long", min: min, max: max };
    const table = Array.isArray(weapon.table)
        ? weapon.table.filter(function (r) { return Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]); })
            .slice().sort(function (a, b) { return a[0] - b[0]; })
        : [];
    if (table.length < 2) return { status: "nodata", min: min, max: max };
    if (distance < table[0][0]) return { status: "short", min: table[0][0], max: table[table.length - 1][0] };
    if (distance > table[table.length - 1][0]) return { status: "long", min: table[0][0], max: table[table.length - 1][0] };
    for (let i = 1; i < table.length; i++) {
        const a = table[i - 1];
        const b = table[i];
        if (distance <= b[0]) {
            const t = b[0] === a[0] ? 0 : (distance - a[0]) / (b[0] - a[0]);
            return { status: "ok", value: a[1] + (b[1] - a[1]) * t };
        }
    }
    return { status: "nodata" };
}
