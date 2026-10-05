#!/usr/bin/env node
/**
 * Hell Let Loose Armor Hub — Wardogs cash rewards build
 *
 * Converts a raw CashRewardsDataTable export (folder of DT_Reward_Cash_*.json)
 * into the clean data file the Cash Planner reads.
 *
 *   npm run wardogs:cash -- <path-to-CashRewardsDataTable> [season]
 *
 * Only rows listed in ACTIONS are published. Rows present in the export but
 * missing from ACTIONS are reported so new patch content is never silently dropped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const CATEGORIES = [
    { id: 'combat', label: 'Combat', icon: 'crosshairs' },
    { id: 'vehicles', label: 'Vehicle kills', icon: 'explosion' },
    { id: 'objectives', label: 'Objectives', icon: 'flag' },
    { id: 'medical', label: 'Medical', icon: 'heart-crack' },
    { id: 'logistics', label: 'Logistics', icon: 'truck' },
    { id: 'building', label: 'Building', icon: 'wrench' },
    { id: 'sabotage', label: 'Sabotage', icon: 'bomb' }
];

const ZONES = [
    { id: 'none', label: 'Anywhere' },
    { id: 'cz', label: 'Control Zone' },
    { id: 'hz', label: 'Hot Zone' },
    { id: 'hzm', label: 'Magnet Zone' }
];

/* [table, row tag, category, label, extra] — extra: { unit, note, img } */
const ACTIONS = [
    ['DT_Reward_Cash_PlayerKill', 'Meta.Progression.Context.DefaultReward', 'combat', 'Kill an enemy player'],
    ['DT_Reward_Cash_PlayerKill', 'Vehicle.Variant.Land.Tracked.TNK_01.Artillery', 'combat', 'Artillery kill (gun outside the zone)', { img: 'artillery' }],
    ['DT_Reward_Cash_PlayerKill', 'Meta.Progression.Context.DefaultReward.Vehicle.InZone', 'combat', 'Artillery kill (gun inside the zone)', { img: 'artillery', note: 'Firing from inside the zone pays a fraction of an outside-zone artillery kill.' }],

    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Wheeled.Bobcat', 'vehicles', 'Destroy a Bobcat'],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Wheeled.Kodiak', 'vehicles', 'Destroy a Kodiak'],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Wheeled.Humvee', 'vehicles', 'Destroy a Humvee', { img: 'humvee' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Wheeled.DuneBuggy', 'vehicles', 'Destroy a Dune Buggy', { img: 'dune-buggy' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Air.Rotary.Littlebird', 'vehicles', 'Destroy a Littlebird', { img: 'littlebird' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Air.Rotary.Huey', 'vehicles', 'Destroy a Huey', { img: 'huey' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Air.Rotary.Havoc', 'vehicles', 'Destroy a Havoc', { img: 'havoc' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Tracked.SpawnVehicle', 'vehicles', 'Destroy a spawn vehicle'],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Tracked.TNK_01.Heavy', 'vehicles', 'Destroy a heavy tank', { img: 'heavy-tank' }],
    ['DT_Reward_Cash_VehicleDestroyed', 'Vehicle.Variant.Land.Tracked.TNK_01.Artillery', 'vehicles', 'Destroy an artillery vehicle', { img: 'artillery' }],

    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.MagnetActivatedInstigator', 'objectives', 'Activate the magnet'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.MagnetActivated', 'objectives', 'Be near the magnet when it activates'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.MagnetDestroyedInstigator', 'objectives', 'Deactivate the magnet'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.CapturedTowerInstigatorHostile', 'objectives', 'Capture an enemy tower'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.CapturedTowerHostile', 'objectives', 'Be near an enemy tower capture'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.CapturedTowerInstigator', 'objectives', 'Capture a neutral tower'],
    ['DT_Reward_Cash_HotZoneMagnet', 'Meta.Progression.Context.MatchScore.CapturedTower', 'objectives', 'Be near a neutral tower capture'],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.ControlZoneEntered', 'objectives', 'Enter the Control Zone (once per life)'],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.ControlZoneOwned', 'objectives', 'Hold the Control Zone (owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.ControlZoneContested', 'objectives', 'Hold the Control Zone (contested)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.ControlZoneNotOwned', 'objectives', 'Hold the Control Zone (enemy owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.HotzoneOwned', 'objectives', 'Hold the Hot Zone (owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.HotzoneContested', 'objectives', 'Hold the Hot Zone (contested)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.HotzoneNotOwned', 'objectives', 'Hold the Hot Zone (enemy owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.MagnetZoneOwned', 'objectives', 'Hold the Magnet Zone (owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.MagnetZoneContested', 'objectives', 'Hold the Magnet Zone (contested)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.MagnetZoneNotOwned', 'objectives', 'Hold the Magnet Zone (enemy owned)', { unit: 'tick' }],
    ['DT_Reward_Cash_ControlZoneReward', 'Meta.Progression.Resources.MatchScore.ObjectiveScore.SpawnVehicle.ControlZoneEntered', 'objectives', 'Drive a spawn vehicle into the Control Zone'],
    ['DT_Reward_Cash_EndGameFactionReward', 'Meta.Progression.Resources.MatchScore.Faction.FirstPlace', 'objectives', 'Faction finishes 1st'],
    ['DT_Reward_Cash_EndGameFactionReward', 'Meta.Progression.Resources.MatchScore.Faction.SecondPlace', 'objectives', 'Faction finishes 2nd'],
    ['DT_Reward_Cash_EndGameFactionReward', 'Meta.Progression.Resources.MatchScore.Faction.ThirdPlace', 'objectives', 'Faction finishes 3rd'],

    ['DT_Reward_Cash_Revive', 'Meta.Progression.Context.DefaultReward', 'medical', 'Revive (no item)'],
    ['DT_Reward_Cash_Revive', 'Id.Item.Defibrillator', 'medical', 'Revive with a Defibrillator', { note: 'Scales with health restored.' }],
    ['DT_Reward_Cash_Revive', 'Id.Item.Resuscitator', 'medical', 'Revive with a Resuscitator', { note: 'Scales with health restored.' }],
    ['DT_Reward_Cash_Revive', 'Id.Item.MedKit', 'medical', 'Revive with a Med Kit', { note: 'Scales with health restored.' }],
    ['DT_Reward_Cash_Revive', 'Id.Item.StimPen', 'medical', 'Revive with a Stim Pen'],
    ['DT_Reward_Cash_Revive', 'Id.Item.AdrenalinePen', 'medical', 'Revive with an Adrenaline Pen', { note: 'Scales with health restored.' }],
    ['DT_Reward_Cash_Heal', 'Id.Item.Defibrillator', 'medical', 'Heal bonus: Defibrillator revive'],
    ['DT_Reward_Cash_Heal', 'Id.Item.Resuscitator', 'medical', 'Heal bonus: Resuscitator revive'],
    ['DT_Reward_Cash_Heal', 'Id.Item.AdrenalinePen', 'medical', 'Heal bonus: Adrenaline Pen revive'],
    ['DT_Reward_Cash_Heal', 'Id.Item.SuperBandage', 'medical', 'Heal with a Super Bandage'],
    ['DT_Reward_Cash_Heal', 'Id.Item.Bandage', 'medical', 'Heal with a Bandage'],
    ['DT_Reward_Cash_Heal', 'ID.Item.MedKit.Standard', 'medical', 'Heal with a Med Kit'],

    ['DT_Reward_Cash_DeployedSupplyCrate', 'ID.Item.VehicleSupplyCrate.Large', 'logistics', 'Deploy a large supply crate'],
    ['DT_Reward_Cash_DeployedSupplyCrate', 'ID.Item.VehicleSupplyCrate.Large.Armoured', 'logistics', 'Deploy a large armoured supply crate'],
    ['DT_Reward_Cash_DeployedSupplyCrate', 'ID.Item.VehicleSupplyCrate.Small', 'logistics', 'Deploy a small supply crate'],
    ['DT_Reward_Cash_DeployedSupplyCrate', 'ID.Item.VehicleSupplyCrate.Small.Armoured', 'logistics', 'Deploy a small armoured supply crate'],
    ['DT_Reward_Cash_DeployedSupplyCrate', 'ID.Item.VehicleSupplyCrate.Container.Free', 'logistics', 'Deploy a free supply container'],
    ['DT_Reward_Cash_VehicleTransport', 'Meta.Progression.Context.Vehicle.Transported', 'logistics', 'Transport a passenger'],
    ['DT_Reward_Cash_VehicleTransport', 'Meta.Progression.Context.Vehicle.SpawnedOn', 'logistics', 'Teammate spawns on your vehicle'],
    ['DT_Reward_Cash_VehicleTransport', 'Meta.Progression.Context.DefaultReward', 'logistics', 'Driving teammates', { unit: 'tick' }],
    ['DT_Reward_Cash_Repair', 'ID.Item.RepairTool.Drill.Heavy', 'logistics', 'Repair with a Heavy Drill', { unit: 'tick' }],
    ['DT_Reward_Cash_Repair', 'ID.Item.RepairTool.Drill.Light', 'logistics', 'Repair with a Light Drill', { unit: 'tick' }],
    ['DT_Reward_Cash_Repair', 'ID.Item.RepairTool.Wrench.Standard', 'logistics', 'Repair with a Wrench', { unit: 'tick' }],
    ['DT_Reward_Cash_Refuel', 'Meta.Progression.Context.DefaultReward', 'logistics', 'Refuel a vehicle', { unit: 'tick' }],

    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.FOB', 'building', 'Place a FOB'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.HBlockQuadWall', 'building', 'Place an H-block quad wall'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.AirRaidShelter', 'building', 'Place an air raid shelter'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.Bunker', 'building', 'Place a bunker'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.Gate', 'building', 'Place a gate'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.Mortar', 'building', 'Place a mortar'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.TallHBlock', 'building', 'Place a tall H-block'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.HBlock', 'building', 'Place an H-block'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.TankTrap', 'building', 'Place a tank trap'],
    ['DT_Reward_Cash_BuildablePlaced', 'Id.Buildable.BarbedWire', 'building', 'Place barbed wire'],

    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.FOB', 'sabotage', 'Destroy an enemy FOB'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.HotzoneMagnet', 'sabotage', 'Destroy an enemy magnet'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.Bunker', 'sabotage', 'Destroy an enemy bunker'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.AirRaidShelter', 'sabotage', 'Destroy an enemy air raid shelter'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.CrowsNest', 'sabotage', "Destroy an enemy crow's nest"],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.Gate', 'sabotage', 'Destroy an enemy gate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.Mortar', 'sabotage', 'Destroy an enemy mortar'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.TankTrap', 'sabotage', 'Destroy an enemy tank trap'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Large', 'sabotage', 'Destroy a large supply crate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Small.Armoured', 'sabotage', 'Destroy a small armoured supply crate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Large.Armoured', 'sabotage', 'Destroy a large armoured supply crate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Small', 'sabotage', 'Destroy a small supply crate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Free', 'sabotage', 'Destroy a free supply crate'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.VehicleSupplyCrate.Container.Free', 'sabotage', 'Destroy a free supply container'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.HBlockQuadWall', 'sabotage', 'Destroy an enemy H-block quad wall'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.HBlock', 'sabotage', 'Destroy an enemy H-block'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.TallHBlock', 'sabotage', 'Destroy an enemy tall H-block'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.SandbagWall', 'sabotage', 'Destroy an enemy sandbag wall'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.Door', 'sabotage', 'Destroy an enemy door'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Item.Claymore', 'sabotage', 'Destroy an enemy Claymore'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Item.C4Explosive', 'sabotage', 'Destroy enemy C4'],
    ['DT_Reward_Cash_DeployableDestroyed', 'ID.Item.ATMine', 'sabotage', 'Destroy an enemy AT mine'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.BarbedWire', 'sabotage', 'Destroy enemy barbed wire'],
    ['DT_Reward_Cash_DeployableDestroyed', 'Id.Buildable.CamoNetTent', 'sabotage', 'Destroy an enemy camo net tent']
];

/* FriendlyModifier only reads as "you hit your own side" for destruction rows. */
const PENALTY_CATEGORIES = new Set(['combat', 'vehicles', 'sabotage']);

/* Rows deliberately left out: fallbacks, zero-value, unused, and per-progress build ticks. */
const IGNORED = new Set([
    'DT_Reward_Cash_BuildableBuilt:*',
    'DT_Reward_Cash_BuildablePlacedInFOB:*',
    'DT_Reward_Cash_BuildablePlaced:Meta.Progression.Context.DefaultReward',
    'DT_Reward_Cash_DeployableDestroyed:Meta.Progression.Context.DefaultReward',
    'DT_Reward_Cash_DeployedSupplyCrate:Meta.Progression.Context.DefaultReward',
    'DT_Reward_Cash_Heal:Meta.Progression.Context.DefaultReward',
    'DT_Reward_Cash_Heal:Id.Item.StimPen',
    'DT_Reward_Cash_HotZoneMagnet:Meta.Progression.Context.MatchScore.MagnetDestroyed',
    'DT_Reward_Cash_ControlZoneReward:Meta.Progression.Resources.MatchScore.ObjectiveScore.HotzoneEntered',
    'DT_Reward_Cash_EndGameFactionReward:Meta.Progression.Context.DefaultReward',
    'DT_Reward_Cash_Repair:Meta.Progression.Context.DefaultReward'
]);

function readTables(dir) {
    const tables = {};
    (function walk(d) {
        for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, ent.name);
            if (ent.isDirectory()) walk(p);
            else if (/^DT_Reward_Cash_.*\.json$/i.test(ent.name)) {
                const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
                const table = Array.isArray(doc) ? doc[0] : doc;
                tables[table.Name] = table.Rows || {};
            }
        }
    })(dir);
    return tables;
}

function round(n) {
    return Math.round(n * 100) / 100;
}

function slugify(table, tag) {
    const t = table.replace(/^DT_Reward_Cash_/, '');
    const last = tag.split('.').slice(-2).join('-');
    return (t + '-' + last).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function build(dir, season) {
    const tables = readTables(dir);
    const used = new Set();
    const errors = [];

    const actions = ACTIONS.map(function ([table, tag, category, label, extra]) {
        const row = tables[table] && tables[table][tag];
        if (!row) {
            errors.push(`missing row ${table}:${tag}`);
            return null;
        }
        used.add(table + ':' + tag);
        const ex = extra || {};
        const action = {
            id: slugify(table, tag),
            category,
            label,
            base: round(row.base),
            zone: { cz: round(row.ModifierCZ), hz: round(row.ModifierHZ), hzm: round(row.ModifierHZM) },
            unit: ex.unit || 'event'
        };
        if (row.FriendlyModifier < 0 && PENALTY_CATEGORIES.has(category)) {
            action.teamPenalty = Math.round(row.base * row.FriendlyModifier);
        }
        if (ex.note) action.note = ex.note;
        if (ex.img) action.img = ex.img;
        return action;
    }).filter(Boolean);

    const unlisted = [];
    for (const [table, rows] of Object.entries(tables)) {
        if (IGNORED.has(table + ':*')) continue;
        for (const tag of Object.keys(rows)) {
            const key = table + ':' + tag;
            if (!used.has(key) && !IGNORED.has(key)) unlisted.push(key);
        }
    }

    return {
        doc: {
            season,
            generated: new Date().toISOString().slice(0, 10),
            zones: ZONES,
            categories: CATEGORIES,
            actions
        },
        errors,
        unlisted
    };
}

function main() {
    const [dirArg, seasonArg] = process.argv.slice(2);
    if (!dirArg) {
        console.error('Usage: npm run wardogs:cash -- <path-to-CashRewardsDataTable> [season]');
        process.exit(1);
    }
    const season = seasonArg || 's1';
    const { doc, errors, unlisted } = build(path.resolve(dirArg), season);

    if (errors.length) {
        console.error('Export is missing rows the site expects:\n  ' + errors.join('\n  '));
        process.exit(1);
    }

    const outDir = path.join(ROOT, 'data', 'wardogs', season);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'cash-rewards.json');
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
    console.log(`Wrote ${doc.actions.length} actions to ${path.relative(ROOT, outPath)}`);

    if (unlisted.length) {
        console.warn('\nNew rows in this export (add them to ACTIONS or IGNORED):\n  ' + unlisted.join('\n  '));
    }
}

main();
