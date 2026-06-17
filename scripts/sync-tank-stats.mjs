#!/usr/bin/env node
/**
 * Hell Let Loose Armor Hub — tank stat sync
 *
 * Single source of truth: Hell Let Loose Tank Stats.xlsx (sheet "Tank Stats")
 *
 *   npm run sync:tanks:push     — write current merged JSON stats → xlsx
 *   npm run sync:tanks          — read xlsx → tanks-wwii.json (clears stat overrides in u20)
 *   npm run sync:tanks:validate — compare xlsx vs live JSON (exit 1 on mismatch)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'Hell Let Loose Tank Stats.xlsx');
const WWII_PATH = path.join(ROOT, 'data', 'tanks-wwii.json');
const U20_PATH = path.join(ROOT, 'data', 'tanks-u20-overrides.json');

const HEADER_ROW = 6;
const COL = {
    faction: 0,
    tank: 1,
    type: 2,
    fuel: 3,
    mun: 4,
    ap: 5,
    hull: 6,
    turret: 7,
    engine: 8,
    track: 9,
    reload: 10,
    apClip: 11,
    heClip: 12,
    speed: 13,
    explDmg: 14,
    explRad: 15,
    gear: 16,
    pitchMax: 17,
    pitchMin: 18,
    pitchRate: 19,
    yawRate: 20
};

/** Site tank name → xlsx "Tank" column label */
const JSON_TO_XLSX = {
    'Churchill Mk III': 'Churchill Mk.III',
    'Churchill Mk.VII': 'Churchill Mk.VII',
    'Sherman Firefly': 'Sherman Firefly',
    Panther: 'Panther',
    'Tiger I': 'Tiger I',
    'IS-1': 'IS-1',
    'Sherman 75 Jumbo': 'Jumbo Sherman 75',
    'Sherman 76 Jumbo': 'Jumbo Sherman 76',
    "M3 Stuart 'Honey'": 'M3 Stuart Honey',
    Tetrarch: 'Tetrarch',
    Luchs: 'Luchs',
    'T-70': 'T-70',
    'M5A1 Stuart': 'M5A1 Stuart',
    Cromwell: 'Cromwell Mk.IV',
    'Crusader Mk III': 'Crusader Mk.III',
    'Panzer IV': 'Panzer IV',
    'T-34': 'T-34',
    'M4 Sherman': 'M4A3',
    Daimler: 'Daimler',
    Puma: 'Puma',
    'BA-10 Scout Car': 'BA-10',
    Greyhound: 'Greyhound',
    'Bishop SP 25pdr': 'Bishop SP 25PDR',
    'Churchill Mk III A.V.R.E.': 'Churchill Mk III A.V.R.E.',
    'Panzer III Ausf.N': 'Panzer III',
    'Sturmpanzer IV Brummbar': 'Sturmpanzer IV Brummbar',
    'KV-2': 'KV-2',
    'Sherman M4A3 105': 'Sherman M4A3 105'
};

const XLSX_TO_JSON = Object.fromEntries(
    Object.entries(JSON_TO_XLSX).map(([jsonName, xlsxName]) => [xlsxName, jsonName])
);

const STAT_FIELDS = [
    'hullHealth',
    'turretHealth',
    'engineHealth',
    'trackHealth',
    'apDamage',
    'reloadSpeed',
    'maxShellsAP',
    'maxShellsHE',
    'maxSpeed',
    'explosionDamage',
    'explosionRadius',
    'gearSwitchTime',
    'pitchAngleMax',
    'pitchAngleMin',
    'pitchRate',
    'yawRate',
    'fuelCost',
    'munitionsCost'
];

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadWorkbook() {
    if (!fs.existsSync(XLSX_PATH)) {
        throw new Error(`Missing spreadsheet: ${XLSX_PATH}`);
    }
    const wb = XLSX.readFile(XLSX_PATH);
    const sheet = wb.Sheets['Tank Stats'];
    if (!sheet) {
        throw new Error('Sheet "Tank Stats" not found in xlsx');
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    return { wb, rows };
}

function saveWorkbook(wb, rows) {
    wb.Sheets['Tank Stats'] = XLSX.utils.aoa_to_sheet(rows);
    XLSX.writeFile(wb, XLSX_PATH);
}

function getMergedTanks() {
    const wwii = loadJson(WWII_PATH);
    const u20 = loadJson(U20_PATH);
    const merged = {};

    for (const tanks of Object.values(wwii.tanks || {})) {
        for (const tank of tanks) {
            const detailedStats = { ...(tank.detailedStats || {}) };
            const patch = u20.detailedStats?.[tank.name];
            if (patch) {
                Object.assign(detailedStats, patch);
            }
            merged[tank.name] = {
                name: tank.name,
                type: tank.type,
                detailedStats
            };
        }
    }
    return merged;
}

function isSpaType(type) {
    return String(type).includes('SPA');
}

function numOrNull(value) {
    if (value === '' || value === 'N/A' || value == null) {
        return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function detailedStatsFromRow(row, type) {
    const isSpa = isSpaType(type);
    const stats = {
        hullHealth: numOrNull(row[COL.hull]),
        turretHealth: numOrNull(row[COL.turret]),
        engineHealth: numOrNull(row[COL.engine]),
        trackHealth: numOrNull(row[COL.track]),
        apDamage: numOrNull(row[COL.ap]),
        reloadSpeed: numOrNull(row[COL.reload]),
        maxShellsAP: numOrNull(row[COL.apClip]),
        maxShellsHE: numOrNull(row[COL.heClip]),
        maxSpeed: numOrNull(row[COL.speed]),
        gearSwitchTime: numOrNull(row[COL.gear]),
        pitchAngleMax: numOrNull(row[COL.pitchMax]),
        pitchAngleMin: numOrNull(row[COL.pitchMin]),
        pitchRate: numOrNull(row[COL.pitchRate]),
        yawRate: numOrNull(row[COL.yawRate])
    };

    if (isSpa) {
        stats.munitionsCost = numOrNull(row[COL.mun]);
    } else {
        stats.fuelCost = numOrNull(row[COL.fuel]);
        stats.explosionDamage = numOrNull(row[COL.explDmg]);
        stats.explosionRadius = numOrNull(row[COL.explRad]);
    }

    for (const key of Object.keys(stats)) {
        if (stats[key] == null) {
            delete stats[key];
        }
    }
    return stats;
}

function rowFromDetailedStats(row, tank) {
    const ds = tank.detailedStats;
    const isSpa = isSpaType(tank.type);

    row[COL.fuel] = isSpa ? 'N/A' : (ds.fuelCost ?? 'N/A');
    row[COL.mun] = isSpa ? (ds.munitionsCost ?? 'N/A') : 'N/A';
    row[COL.ap] = ds.apDamage ?? '';
    row[COL.hull] = ds.hullHealth ?? '';
    row[COL.turret] = ds.turretHealth ?? '';
    row[COL.engine] = ds.engineHealth ?? '';
    row[COL.track] = ds.trackHealth ?? '';
    row[COL.reload] = ds.reloadSpeed ?? '';
    row[COL.apClip] = ds.maxShellsAP ?? 'N/A';
    row[COL.heClip] = ds.maxShellsHE ?? 'N/A';
    row[COL.speed] = ds.maxSpeed ?? '';
    row[COL.explDmg] = isSpa ? '' : (ds.explosionDamage ?? '');
    row[COL.explRad] = isSpa ? '' : (ds.explosionRadius ?? '');
    row[COL.gear] = ds.gearSwitchTime ?? '';
    row[COL.pitchMax] = ds.pitchAngleMax ?? '';
    row[COL.pitchMin] = ds.pitchAngleMin ?? '';
    row[COL.pitchRate] = ds.pitchRate ?? '';
    row[COL.yawRate] = ds.yawRate ?? '';
}

function readXlsxStats(rows) {
    const byJsonName = {};
    for (let r = HEADER_ROW + 1; r < rows.length; r++) {
        const row = rows[r];
        const xlsxName = String(row[COL.tank] || '').trim();
        if (!xlsxName) {
            continue;
        }
        const jsonName = XLSX_TO_JSON[xlsxName];
        if (!jsonName) {
            throw new Error(`Unknown xlsx tank name "${xlsxName}" (row ${r + 1})`);
        }
        byJsonName[jsonName] = detailedStatsFromRow(row, row[COL.type]);
    }
    return byJsonName;
}

function applyStatsToWwiiTank(tank, stats) {
    if (!tank.detailedStats) {
        tank.detailedStats = {};
    }
    for (const key of STAT_FIELDS) {
        if (stats[key] != null) {
            tank.detailedStats[key] = stats[key];
        }
    }
    if (stats.maxSpeed != null) {
        tank.speed = `${stats.maxSpeed} km/h`;
    }
}

function pullFromXlsx() {
    const wwii = loadJson(WWII_PATH);
    const u20 = loadJson(U20_PATH);
    const { rows } = loadWorkbook();
    const xlsxStats = readXlsxStats(rows);
    let updated = 0;

    for (const tanks of Object.values(wwii.tanks || {})) {
        for (const tank of tanks) {
            const stats = xlsxStats[tank.name];
            if (!stats) {
                throw new Error(`tanks-wwii.json tank "${tank.name}" not found in xlsx`);
            }
            applyStatsToWwiiTank(tank, stats);
            updated += 1;
        }
    }

    u20.detailedStats = {};

    fs.writeFileSync(WWII_PATH, `${JSON.stringify(wwii, null, 2)}\n`, 'utf8');
    fs.writeFileSync(U20_PATH, `${JSON.stringify(u20, null, 2)}\n`, 'utf8');
    console.log(
        `Pulled ${updated} tanks from xlsx → ${path.relative(ROOT, WWII_PATH)} (cleared stat overrides in u20)`
    );
}

function pushToXlsx() {
    const merged = getMergedTanks();
    const { wb, rows } = loadWorkbook();
    let updated = 0;

    for (let r = HEADER_ROW + 1; r < rows.length; r++) {
        const row = rows[r];
        const xlsxName = String(row[COL.tank] || '').trim();
        const jsonName = XLSX_TO_JSON[xlsxName];
        if (!jsonName || !merged[jsonName]) {
            continue;
        }
        rowFromDetailedStats(row, merged[jsonName]);
        updated += 1;
    }

    if (rows[2]) {
        rows[2][1] =
            'Tank stats — single source of truth. Edit here, then run: npm run sync:tanks';
    }

    saveWorkbook(wb, rows);
    console.log(`Pushed ${updated} tank stat rows to ${path.basename(XLSX_PATH)}`);
}

function validate() {
    const wwii = loadJson(WWII_PATH);
    const { rows } = loadWorkbook();
    const xlsxStats = readXlsxStats(rows);
    const mismatches = [];

    for (const tanks of Object.values(wwii.tanks || {})) {
        for (const tank of tanks) {
            const fromXlsx = xlsxStats[tank.name];
            if (!fromXlsx) {
                mismatches.push({ name: tank.name, issue: 'missing from xlsx' });
                continue;
            }
            for (const key of STAT_FIELDS) {
                const a = tank.detailedStats?.[key];
                const b = fromXlsx[key];
                if (a == null && b == null) {
                    continue;
                }
                if (a !== b) {
                    mismatches.push({ name: tank.name, field: key, json: a, xlsx: b });
                }
            }
        }
    }

    if (mismatches.length) {
        console.error(`Validation failed: ${mismatches.length} mismatch(es)`);
        for (const m of mismatches.slice(0, 20)) {
            console.error(m);
        }
        process.exit(1);
    }
    console.log('Validated — xlsx matches tanks-wwii.json');
}

const mode = process.argv[2] || 'validate';
if (mode === 'push') {
    pushToXlsx();
} else if (mode === 'pull') {
    pullFromXlsx();
} else if (mode === 'validate') {
    validate();
} else {
    console.error('Usage: node scripts/sync-tank-stats.mjs [push|pull|validate]');
    process.exit(1);
}
