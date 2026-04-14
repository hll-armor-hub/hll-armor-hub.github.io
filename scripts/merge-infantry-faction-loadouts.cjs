/**
 * One-shot merge: adds United States, Soviet Union, Allies (British/Polish),
 * then clones Germany → German Africa Corps and British → British Eighth Army.
 * Run from repo root: node scripts/merge-infantry-faction-loadouts.cjs
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "data", "infantry-loadouts.json");

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function E(name, count) {
  return { name, count };
}

const US = {
  knife: { slot: "melee", name: "M3 Knife", count: 1 },
  frag2: { slot: "frag", name: "MK2 Grenade", count: 2 },
  smoke2: { slot: "smoke", name: "M18 Smoke Grenade", count: 2 },
  band2: { slot: "bandage", name: "Bandage", count: 2 },
  hammer: { slot: "utility", name: "Hammer", count: 1 },
  watch: { slot: "utility", name: "Watch", count: 1 },
  binocs: { slot: "binoculars", name: "Westinghouse M3 6×30 Binoculars", count: 1 },
};

const SU = {
  spade: { slot: "melee", name: "MPL-50 Spade", count: 1 },
  frag2: { slot: "frag", name: "RG-42 Grenade", count: 2 },
  smoke2: { slot: "smoke", name: "RDG-2 Smoke", count: 2 },
  band2: { slot: "bandage", name: "Bandage", count: 2 },
  hammer: { slot: "utility", name: "Hammer", count: 1 },
  watch: { slot: "utility", name: "Watch", count: 1 },
  binocs: { slot: "binoculars", name: "Binoculars", count: 1 },
};

const GB = {
  knife: { slot: "melee", name: "Fairbairn-Sykes", count: 1 },
  frag2: { slot: "frag", name: "Mills Bomb", count: 2 },
  smoke2: { slot: "smoke", name: "No.77 Smoke Grenade", count: 2 },
  band2: { slot: "bandage", name: "Bandage", count: 2 },
  hammer: { slot: "utility", name: "Hammer", count: 1 },
  watch: { slot: "utility", name: "Watch", count: 1 },
  binocs: { slot: "binoculars", name: "Prism No.2 MK II Binoculars", count: 1 },
};

function unitedStatesLoadouts() {
  return [
    {
      factionId: "united_states",
      classId: "commander",
      classLabel: "Commander",
      dataAsOfNote:
        "Compiled from Hell Let Loose Wiki (faction role lists / loadout tables, often Update 13). Verify in-game after balance patches.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Commander level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [{ name: "Colt M1911", magazines: 4 }],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Commander level 3",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [{ name: "Colt M1911", magazines: 4 }],
        },
      ],
      common: [
        US.smoke2,
        US.band2,
        US.watch,
        US.binocs,
        US.knife,
      ],
    },
    {
      factionId: "united_states",
      classId: "officer",
      classLabel: "Officer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Officer level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 8 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
          other: [
            E("MK2 Grenade", 2),
            E("M18 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Westinghouse M3 6×30 Binoculars", 1),
            E("M3 Knife", 1),
          ],
        },
        {
          id: "point_man",
          label: "Point Man",
          unlock: "Officer level 3",
          primary: [{ name: "M1 Garand", magazines: 10 }],
          secondary: [{ name: "Colt M1911", magazines: 4 }],
          other: [
            E("MK2 Grenade", 2),
            E("M18 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Westinghouse M3 6×30 Binoculars", 1),
            E("M3 Knife", 1),
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Officer level 6",
          primary: [{ name: "M1903 Springfield", magazines: 13 }],
          secondary: [],
          other: [
            E("MK2 Grenade", 3),
            E("M18 Smoke Grenade", 3),
            E("Bandage", 2),
            E("Watch", 1),
            E("Westinghouse M3 6×30 Binoculars", 1),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "united_states",
      classId: "rifleman",
      classLabel: "Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Rifleman level 1",
          primary: [{ name: "M1 Garand", magazines: 19 }],
          secondary: [],
        },
        {
          id: "point_man",
          label: "Point Man",
          unlock: "Rifleman level 3",
          primary: [{ name: "M1 Carbine", magazines: 12 }],
          secondary: [],
        },
        {
          id: "panzergrenadier",
          label: "Panzergrenadier",
          unlock: "Rifleman level 6",
          primary: [{ name: "M1 Garand", magazines: 8 }],
          secondary: [],
        },
      ],
      common: [
        US.frag2,
        US.hammer,
        US.band2,
        { slot: "ammo", name: "Small Ammunition Box", count: 1 },
        US.knife,
      ],
      commonByVariantNote:
        "Point Man: MK2 ×4, M18 ×2. Panzergrenadier: explosive ammo box instead of small ammo box; frag ×2 only (per wiki pattern).",
    },
    {
      factionId: "united_states",
      classId: "assault",
      classLabel: "Assault",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Assault level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Assault level 3",
          primary: [{ name: "M97 Trench Gun", magazines: 6 }],
          secondary: [],
        },
        {
          id: "grenadier",
          label: "Grenadier",
          unlock: "Assault level 6",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [],
        },
        {
          id: "raider",
          label: "Raider",
          unlock: "Assault level 9",
          primary: [{ name: "M3 Grease Gun", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [
        US.frag2,
        US.smoke2,
        US.hammer,
        US.band2,
        US.knife,
      ],
      commonByVariantNote:
        "Grenadier: MK2 ×6, M18 ×4. Raider: MK2 ×1, M18 ×2, Satchel ×1.",
    },
    {
      factionId: "united_states",
      classId: "automatic_rifleman",
      classLabel: "Automatic Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Automatic Rifleman level 1",
          primary: [{ name: "M1918A2 BAR", magazines: 10 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Automatic Rifleman level 3",
          primary: [{ name: "M1A1 Thompson", magazines: 10 }],
          secondary: [],
        },
        {
          id: "paratrooper_fg42",
          label: "Paratrooper",
          unlock: "Automatic Rifleman level 6",
          primary: [{ name: "M1918A2 BAR", magazines: 12 }],
          secondary: [],
        },
      ],
      common: [US.frag2, US.hammer, US.band2, US.knife],
      commonByVariantNote:
        "Veteran: M18 smoke ×2 instead of frag (wiki pattern for some factions). Verify in-game.",
    },
    {
      factionId: "united_states",
      classId: "medic",
      classLabel: "Medic",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Medic level 1",
          primary: [{ name: "M1 Carbine", magazines: 4 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
        },
        {
          id: "sanitater",
          label: "Combat Medic",
          unlock: "Medic level 3",
          primary: [],
          secondary: [{ name: "Colt M1911", magazines: 16 }],
        },
      ],
      common: [
        US.smoke2,
        { slot: "revive", name: "Morphine Syrette", count: 20 },
        { slot: "bandage", name: "Bandage", count: 20 },
        US.knife,
      ],
      commonByVariantNote: "Level 3: M18 ×4, Medical Supplies ×1 (per wiki-style Support/Medic notes).",
    },
    {
      factionId: "united_states",
      classId: "support",
      classLabel: "Support",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Support level 1",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Support level 3",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [],
        },
        {
          id: "flammenwerfer",
          label: "Flamethrower",
          unlock: "Support level 8",
          primary: [{ name: "M2 Flamethrower", magazines: null }],
          secondary: [{ name: "Colt M1911", magazines: 4 }],
        },
      ],
      common: [
        US.frag2,
        { slot: "utility", name: "Supplies crate", count: 1 },
        US.hammer,
        US.band2,
        US.knife,
      ],
      commonByVariantNote:
        "Ammo Carrier: small + explosive ammo boxes; wiki often omits frags on that row. Flamethrower: M18 ×2 instead of frag; supplies + hammer.",
    },
    {
      factionId: "united_states",
      classId: "machine_gunner",
      classLabel: "Machine Gunner",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Machine Gunner level 1",
          primary: [{ name: "Browning M1919", magazines: 10 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
          other: [E("Bandage", 2), E("M3 Knife", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Machine Gunner level 3",
          primary: [{ name: "Browning M1919", magazines: 8 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
          other: [E("Hammer", 1), E("Bandage", 2), E("M3 Knife", 1)],
        },
      ],
      common: [],
    },
    {
      factionId: "united_states",
      classId: "anti_tank",
      classLabel: "Anti-Tank",
      dataAsOfNote:
        "Wiki also lists a level-8 “Lend-Lease” style row for some factions; only three tiers mirrored here like Germany unless you extend.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Anti-Tank level 1",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [{ name: "Bazooka", rockets: 2 }],
        },
        {
          id: "gun_crew",
          label: "Gun Crew",
          unlock: "Anti-Tank level 3",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [],
        },
        {
          id: "ambusher",
          label: "Ambusher",
          unlock: "Anti-Tank level 6",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [US.frag2, US.band2, US.knife],
      commonByVariantNote:
        "Gun Crew: Hammer, 57mm M1 Wrench (emplacement tool). Ambusher: Hammer, Satchel ×1, M1A1 AT Mine ×4.",
    },
    {
      factionId: "united_states",
      classId: "engineer",
      classLabel: "Engineer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Engineer level 1",
          primary: [{ name: "M1 Carbine", magazines: 12 }],
          secondary: [],
        },
        {
          id: "pioneer",
          label: "Sapper",
          unlock: "Engineer level 3",
          primary: [{ name: "M97 Trench Gun", magazines: 6 }],
          secondary: [],
        },
        {
          id: "field_engineer",
          label: "Field Engineer",
          unlock: "Engineer level 6",
          primary: [{ name: "M3 Grease Gun", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [
        US.band2,
        { slot: "utility", name: "Wrench", count: 1 },
        US.hammer,
        { slot: "utility", name: "Blow torch", count: 1 },
        US.knife,
      ],
      commonByVariantNote:
        "Standard: M2 AP Mine ×2, M1A1 AT Mine ×1. Sapper: M2 AP ×2, M18 ×2, Satchel ×1, Hammer (wiki omits wrench/torch on some rows — verify). Field Engineer: MK2 ×2, M18 ×2, Torch (wiki).",
    },
    {
      factionId: "united_states",
      classId: "tank_commander",
      classLabel: "Tank Commander",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Tank Commander level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 4 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Tank Commander level 3",
          primary: [],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
        },
      ],
      common: [US.band2, US.binocs, US.knife],
      commonByVariantNote: "Mechanic: Blow torch replaces SMG primary (wiki pattern).",
    },
    {
      factionId: "united_states",
      classId: "crewman",
      classLabel: "Crewman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Crewman level 1",
          primary: [{ name: "Colt M1911", magazines: 6 }],
          secondary: [],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Crewman level 3",
          primary: [{ name: "Colt M1911", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [US.band2, US.knife],
      commonByVariantNote: "Mechanic: M18 ×2, Blow torch.",
    },
    {
      factionId: "united_states",
      classId: "spotter",
      classLabel: "Spotter",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Spotter level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 8 }],
          secondary: [],
          other: [
            E("MK2 Grenade", 2),
            E("Bandage", 2),
            E("M2 AP Mine", 1),
            E("Small Ammunition Box", 1),
            E("Watch", 1),
            E("Westinghouse M3 6×30 Binoculars", 1),
            E("M3 Knife", 1),
          ],
        },
        {
          id: "scout",
          label: "Scout",
          unlock: "Spotter level 3",
          primary: [{ name: "M1903 Springfield", magazines: 10 }],
          secondary: [],
          other: [
            E("M18 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Westinghouse M3 6×30 Binoculars", 1),
            E("Flare gun", 1),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "united_states",
      classId: "sniper",
      classLabel: "Sniper",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Sniper level 1",
          primary: [{ name: "M1903 Springfield (scoped)", magazines: 12 }],
          secondary: [{ name: "Colt M1911", magazines: 6 }],
          other: [E("MK2 Grenade", 2), E("Bandage", 2), E("M3 Knife", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Sniper level 3",
          primary: [{ name: "M1 Garand (scoped)", magazines: 8 }],
          secondary: [],
          other: [
            E("M18 Smoke Grenade", 2),
            E("M2 AP Mine", 1),
            E("Bandage", 2),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
      dataAsOfNote:
        "Sniper tier count varies by faction in-game; verify scope variants and ammo after patches.",
    },
    {
      factionId: "united_states",
      classId: "artillery_observer",
      classLabel: "Artillery Observer",
      dataAsOfNote:
        "Mirrors German artillery observer structure with US equipment; flare/cooldown behavior assumed same — verify in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Artillery Observer level 1",
          primary: [{ name: "M1A1 Thompson", magazines: 8 }],
          secondary: [],
          other: [
            E("MK2 Grenade (HE)", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("Hammer", 1),
            E("Bandage", 2),
            E("M3 Knife", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Artillery Observer level 3",
          primary: [{ name: "M1 Garand", magazines: 10 }],
          secondary: [{ name: "Colt M1911", magazines: 4 }],
          other: [
            E("M18 Smoke Grenade (smoke)", 2),
            E("M2 AP Mine", 1),
            E("Watch", 1),
            E("Binoculars", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
            E("Bandage", 2),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "united_states",
      classId: "artillery_operator",
      classLabel: "Operator",
      dataAsOfNote:
        "Mirrors German operator structure with US mines/tools; verify U19.1+ artillery squad UI names.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Operator level 1",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("Wrench", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("M2 AP Mine", 1),
            E("M1A1 AT Mine", 1),
            E("M3 Knife", 1),
          ],
        },
        {
          id: "pioneer",
          label: "Pioneer",
          unlock: "Operator level 3",
          primary: [{ name: "M1A1 Thompson", magazines: 6 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("M2 AP Mine", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "united_states",
      classId: "artillery_gunner",
      classLabel: "Gunner",
      dataAsOfNote:
        "Mirrors German gunner structure with US grenades/supplies; verify in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Gunner level 1",
          primary: [{ name: "M1 Garand", magazines: 12 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("MK2 Grenade (HE)", 2),
            E("Supplies", 1),
            E("Hammer", 1),
            E("M3 Knife", 1),
          ],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Gunner level 3",
          primary: [{ name: "M1A1 Thompson", magazines: 8 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("M18 Smoke Grenade (smoke)", 2),
            E("Supplies", 1),
            E("Explosive ammo box", 1),
            E("Hammer", 1),
            E("M3 Knife", 1),
          ],
        },
      ],
      common: [],
    },
  ];
}

function sovietUnionLoadouts() {
  return [
    {
      factionId: "soviet_union",
      classId: "commander",
      classLabel: "Commander",
      dataAsOfNote:
        "Compiled from Hell Let Loose Wiki loadout tables (often Update 13). Verify in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Commander level 1",
          primary: [{ name: "PPSh-41", magazines: 6 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 4 }],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Commander level 3",
          primary: [{ name: "SVT-40", magazines: 10 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 4 }],
        },
      ],
      common: [SU.smoke2, SU.band2, SU.watch, SU.binocs, SU.spade],
    },
    {
      factionId: "soviet_union",
      classId: "officer",
      classLabel: "Officer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Officer level 1",
          primary: [{ name: "PPSh-41", magazines: 8 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
          other: [
            E("RG-42 Grenade", 2),
            E("RDG-2 Smoke", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("MPL-50 Spade", 1),
          ],
        },
        {
          id: "point_man",
          label: "Point Man",
          unlock: "Officer level 3",
          primary: [{ name: "SVT-40", magazines: 10 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 4 }],
          other: [
            E("RG-42 Grenade", 2),
            E("RDG-2 Smoke", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("MPL-50 Spade", 1),
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Officer level 6",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 13 }],
          secondary: [],
          other: [
            E("RG-42 Grenade", 3),
            E("RDG-2 Smoke", 3),
            E("Bandage", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "rifleman",
      classLabel: "Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Rifleman level 1",
          primary: [{ name: "Mosin Nagant M1891", magazines: 12 }],
          secondary: [],
        },
        {
          id: "point_man",
          label: "Grenadier",
          unlock: "Rifleman level 3",
          primary: [{ name: "Mosin Nagant M38", magazines: 12 }],
          secondary: [],
        },
        {
          id: "panzergrenadier",
          label: "Trooper",
          unlock: "Rifleman level 6",
          primary: [{ name: "Mosin Nagant M38", magazines: 12 }],
          secondary: [],
        },
      ],
      common: [
        SU.frag2,
        SU.hammer,
        SU.band2,
        { slot: "ammo", name: "Small Ammunition Box", count: 1 },
        SU.spade,
      ],
      commonByVariantNote:
        "Level 3: RG-42 ×4, RDG-2 ×2, explosive ammo box. Level 6: RG-42 ×2 + explosive ammo box (wiki “Trooper” row).",
    },
    {
      factionId: "soviet_union",
      classId: "assault",
      classLabel: "Assault",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Assault level 1",
          primary: [{ name: "PPSh-41", magazines: 14 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Assault level 3",
          primary: [{ name: "PPSh-41 (drum)", magazines: 5 }],
          secondary: [],
        },
        {
          id: "grenadier",
          label: "Grenadier",
          unlock: "Assault level 6",
          primary: [{ name: "SVT-40", magazines: 12 }],
          secondary: [],
        },
        {
          id: "raider",
          label: "Flamer",
          unlock: "Assault level 9",
          primary: [{ name: "PPSh-41 (drum)", magazines: 5 }],
          secondary: [],
        },
      ],
      common: [SU.frag2, SU.smoke2, SU.hammer, SU.band2, SU.spade],
      commonByVariantNote:
        "Grenadier: RG-42 ×6, RDG-2 ×3. Flamer (Lv9): Molotov ×2, Satchel Charge ×1 instead of standard frag/smoke counts (wiki).",
    },
    {
      factionId: "soviet_union",
      classId: "automatic_rifleman",
      classLabel: "Automatic Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Automatic Rifleman level 1",
          primary: [{ name: "DP-27", magazines: 8 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Automatic Rifleman level 3",
          primary: [{ name: "PPSh-41", magazines: 10 }],
          secondary: [],
        },
        {
          id: "paratrooper_fg42",
          label: "Machine Rifleman",
          unlock: "Automatic Rifleman level 6",
          primary: [{ name: "DP-27", magazines: 10 }],
          secondary: [],
        },
      ],
      common: [SU.frag2, SU.hammer, SU.band2, SU.spade],
      commonByVariantNote: "Veteran: RDG-2 ×2 instead of frag (wiki-style). Verify.",
    },
    {
      factionId: "soviet_union",
      classId: "medic",
      classLabel: "Medic",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Medic level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 4 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
        },
        {
          id: "sanitater",
          label: "Sanitäter",
          unlock: "Medic level 3",
          primary: [],
          secondary: [{ name: "Tokarev TT-33", magazines: 16 }],
        },
      ],
      common: [
        SU.smoke2,
        { slot: "revive", name: "Morphine Ampoule", count: 20 },
        { slot: "bandage", name: "Bandage", count: 20 },
        SU.spade,
      ],
      commonByVariantNote: "Sanitäter: RDG-2 ×4, Medical Supplies ×1.",
    },
    {
      factionId: "soviet_union",
      classId: "support",
      classLabel: "Support",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Support level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 12 }],
          secondary: [],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Support level 3",
          primary: [{ name: "PPSh-41", magazines: 6 }],
          secondary: [],
        },
        {
          id: "flammenwerfer",
          label: "Flamethrower",
          unlock: "Support level 8",
          primary: [{ name: "ROKS-3 Flamethrower", magazines: null }],
          secondary: [{ name: "Tokarev TT-33", magazines: 4 }],
        },
      ],
      common: [
        SU.frag2,
        { slot: "utility", name: "Supplies crate", count: 1 },
        SU.hammer,
        SU.band2,
        SU.spade,
      ],
      commonByVariantNote:
        "Ammo Carrier: ammo boxes; frags often omitted on wiki row. Flamethrower: RDG-2 ×2 instead of frag.",
    },
    {
      factionId: "soviet_union",
      classId: "machine_gunner",
      classLabel: "Machine Gunner",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Machine Gunner level 1",
          primary: [{ name: "DP-27", magazines: 10 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
          other: [E("Bandage", 2), E("MPL-50 Spade", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Machine Gunner level 3",
          primary: [{ name: "DP-27", magazines: 8 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
          other: [E("Hammer", 1), E("Bandage", 2), E("MPL-50 Spade", 1)],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "anti_tank",
      classLabel: "Anti-Tank",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Anti-Tank level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 16 }],
          secondary: [{ name: "PTRS-41", rockets: 8 }],
        },
        {
          id: "gun_crew",
          label: "Gun Crew",
          unlock: "Anti-Tank level 3",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 12 }],
          secondary: [],
        },
        {
          id: "ambusher",
          label: "Ambusher",
          unlock: "Anti-Tank level 6",
          primary: [{ name: "PPSh-41", magazines: 8 }],
          secondary: [],
        },
      ],
      common: [SU.frag2, SU.band2, SU.spade],
      commonByVariantNote:
        "Gun Crew: Hammer, ZiS-2 Wrench. Ambusher: Hammer, Satchel Charge ×1, TM-35 AT Mine ×4.",
    },
    {
      factionId: "soviet_union",
      classId: "engineer",
      classLabel: "Engineer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Engineer level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 12 }],
          secondary: [],
        },
        {
          id: "pioneer",
          label: "Sapper",
          unlock: "Engineer level 3",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [
        SU.band2,
        { slot: "utility", name: "Wrench", count: 1 },
        SU.hammer,
        { slot: "utility", name: "Blow torch", count: 1 },
        SU.spade,
      ],
      commonByVariantNote:
        "Standard: POMZ AP Mine ×2, TM-35 AT Mine ×1. Sapper: POMZ ×2, RDG-2 ×2, Satchel Charge ×1, Hammer. Wiki Engineer table shows Field Engineer tier for US/Germany only — add a third Soviet tier here when you confirm in-game.",
    },
    {
      factionId: "soviet_union",
      classId: "tank_commander",
      classLabel: "Tank Commander",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Tank Commander level 1",
          primary: [{ name: "PPSh-41", magazines: 4 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Tank Commander level 3",
          primary: [],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
        },
      ],
      common: [SU.band2, SU.binocs, SU.spade],
      commonByVariantNote: "Mechanic: Blow torch replaces SMG primary.",
    },
    {
      factionId: "soviet_union",
      classId: "crewman",
      classLabel: "Crewman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Crewman level 1",
          primary: [{ name: "Tokarev TT-33", magazines: 6 }],
          secondary: [],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Crewman level 3",
          primary: [{ name: "Tokarev TT-33", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [SU.band2, SU.spade],
      commonByVariantNote: "Mechanic: RDG-2 ×2, Blow torch.",
    },
    {
      factionId: "soviet_union",
      classId: "spotter",
      classLabel: "Spotter",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Spotter level 1",
          primary: [{ name: "PPSh-41", magazines: 8 }],
          secondary: [],
          other: [
            E("RG-42 Grenade", 2),
            E("Bandage", 2),
            E("POMZ AP Mine", 1),
            E("Small Ammunition Box", 1),
            E("Watch", 1),
            E("Binoculars", 1),
            E("MPL-50 Spade", 1),
          ],
        },
        {
          id: "scout",
          label: "Scout",
          unlock: "Spotter level 3",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 10 }],
          secondary: [],
          other: [
            E("RDG-2 Smoke", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("Flare gun", 1),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "sniper",
      classLabel: "Sniper",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Sniper level 1",
          primary: [{ name: "Mosin Nagant M91/30 (scoped)", magazines: 19 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 6 }],
          other: [E("RG-42 Grenade", 2), E("Bandage", 2), E("MPL-50 Spade", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Sniper level 3",
          primary: [{ name: "SVT-40 (scoped)", magazines: 12 }],
          secondary: [],
          other: [
            E("RDG-2 Smoke", 2),
            E("POMZ AP Mine", 1),
            E("Bandage", 2),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "artillery_observer",
      classLabel: "Artillery Observer",
      dataAsOfNote: "Faction-equivalent layout to Germany; verify flare and grenade naming in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Artillery Observer level 1",
          primary: [{ name: "PPSh-41", magazines: 8 }],
          secondary: [],
          other: [
            E("RG-42 Grenade (HE)", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("Hammer", 1),
            E("Bandage", 2),
            E("MPL-50 Spade", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Artillery Observer level 3",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 10 }],
          secondary: [{ name: "Tokarev TT-33", magazines: 4 }],
          other: [
            E("RDG-2 Smoke (smoke)", 2),
            E("POMZ AP Mine", 1),
            E("Watch", 1),
            E("Binoculars", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
            E("Bandage", 2),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "artillery_operator",
      classLabel: "Operator",
      dataAsOfNote: "Faction-equivalent layout to Germany; verify mines and torch labels in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Operator level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 12 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("Wrench", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("POMZ AP Mine", 1),
            E("TM-35 AT Mine", 1),
            E("MPL-50 Spade", 1),
          ],
        },
        {
          id: "pioneer",
          label: "Pioneer",
          unlock: "Operator level 3",
          primary: [{ name: "PPSh-41", magazines: 6 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("POMZ AP Mine", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "soviet_union",
      classId: "artillery_gunner",
      classLabel: "Gunner",
      dataAsOfNote: "Faction-equivalent layout to Germany.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Gunner level 1",
          primary: [{ name: "Mosin Nagant M91/30", magazines: 12 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("RG-42 Grenade (HE)", 2),
            E("Supplies", 1),
            E("Hammer", 1),
            E("MPL-50 Spade", 1),
          ],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Gunner level 3",
          primary: [{ name: "PPSh-41", magazines: 8 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("RDG-2 Smoke (smoke)", 2),
            E("Supplies", 1),
            E("Explosive ammo box", 1),
            E("Hammer", 1),
            E("MPL-50 Spade", 1),
          ],
        },
      ],
      common: [],
    },
  ];
}

function britishPolishLoadouts() {
  return [
    {
      factionId: "allies_british_polish",
      classId: "commander",
      classLabel: "Commander",
      dataAsOfNote:
        "British (and Polish-using-British-kit) entries from Hell Let Loose Wiki faction lists. Verify Polish-specific cosmetic-only differences in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Commander level 1",
          primary: [{ name: "M1928A1 Thompson", magazines: 6 }],
          secondary: [{ name: "Webley MK VI", magazines: 4 }],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Commander level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [{ name: "Webley MK VI", magazines: 4 }],
        },
      ],
      common: [GB.smoke2, GB.band2, GB.watch, GB.binocs, GB.knife],
    },
    {
      factionId: "allies_british_polish",
      classId: "officer",
      classLabel: "Officer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Officer level 1",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
          other: [
            E("Mills Bomb", 2),
            E("No.77 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Prism No.2 MK II Binoculars", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
        {
          id: "point_man",
          label: "Point Man",
          unlock: "Officer level 3",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 10 }],
          secondary: [{ name: "Webley MK VI", magazines: 4 }],
          other: [
            E("Mills Bomb", 2),
            E("No.77 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Prism No.2 MK II Binoculars", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Officer level 6",
          primary: [{ name: "Rifle No.4 Mk I", magazines: 13 }],
          secondary: [],
          other: [
            E("Mills Bomb", 3),
            E("No.77 Smoke Grenade", 3),
            E("Bandage", 2),
            E("Watch", 1),
            E("Prism No.2 MK II Binoculars", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "rifleman",
      classLabel: "Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Rifleman level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 6 }],
          secondary: [],
        },
        {
          id: "point_man",
          label: "Grenadier",
          unlock: "Rifleman level 3",
          primary: [{ name: "Rifle No.4 Mk I", magazines: 6 }],
          secondary: [],
        },
        {
          id: "panzergrenadier",
          label: "Trooper",
          unlock: "Rifleman level 6",
          primary: [{ name: "Rifle No.4 Mk I", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [
        GB.frag2,
        GB.hammer,
        GB.band2,
        { slot: "ammo", name: "Small Ammunition Box", count: 1 },
        GB.knife,
      ],
      commonByVariantNote:
        "Level 3: Mills ×4, No.77 ×2. Level 6: Mills ×2 + explosive ammo box (wiki pattern).",
    },
    {
      factionId: "allies_british_polish",
      classId: "assault",
      classLabel: "Assault",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Assault level 1",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Assault level 3",
          primary: [{ name: "M1928A1 Thompson", magazines: 8 }],
          secondary: [],
        },
        {
          id: "grenadier",
          label: "Grenadier",
          unlock: "Assault level 6",
          primary: [{ name: "Rifle No.4 Mk I", magazines: 6 }],
          secondary: [],
        },
        {
          id: "raider",
          label: "Raider",
          unlock: "Assault level 9",
          primary: [{ name: "Sten Gun Mk.II", magazines: 8 }],
          secondary: [],
        },
      ],
      common: [GB.frag2, GB.smoke2, GB.hammer, GB.band2, GB.knife],
      commonByVariantNote:
        "Grenadier: Mills ×6, No.77 ×4. Raider: Mills ×1, No.77 ×2, Satchel Charge ×1.",
    },
    {
      factionId: "allies_british_polish",
      classId: "automatic_rifleman",
      classLabel: "Automatic Rifleman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Automatic Rifleman level 1",
          primary: [{ name: "Bren Gun", magazines: 10 }],
          secondary: [],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Automatic Rifleman level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
        },
        {
          id: "paratrooper_fg42",
          label: "Machine Rifleman",
          unlock: "Automatic Rifleman level 6",
          primary: [{ name: "Bren Gun", magazines: 12 }],
          secondary: [],
        },
      ],
      common: [GB.frag2, GB.hammer, GB.band2, GB.knife],
      commonByVariantNote: "Veteran: No.77 ×2 instead of frag (wiki-style). Verify.",
    },
    {
      factionId: "allies_british_polish",
      classId: "medic",
      classLabel: "Medic",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Medic level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 4 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
        },
        {
          id: "sanitater",
          label: "Combat Medic",
          unlock: "Medic level 3",
          primary: [],
          secondary: [{ name: "Webley MK VI", magazines: 16 }],
        },
      ],
      common: [
        GB.smoke2,
        { slot: "revive", name: "Morphine", count: 20 },
        { slot: "bandage", name: "Bandage", count: 20 },
        GB.knife,
      ],
      commonByVariantNote: "Level 3: No.77 ×4, Medical Supplies ×1.",
    },
    {
      factionId: "allies_british_polish",
      classId: "support",
      classLabel: "Support",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Support level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 12 }],
          secondary: [],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Support level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 5 }],
          secondary: [],
        },
        {
          id: "flammenwerfer",
          label: "Flamethrower",
          unlock: "Support level 8",
          primary: [{ name: "Flamethrower", magazines: null }],
          secondary: [{ name: "Webley MK VI", magazines: 4 }],
        },
      ],
      common: [
        GB.frag2,
        { slot: "utility", name: "Supplies crate", count: 1 },
        GB.hammer,
        GB.band2,
        GB.knife,
      ],
      commonByVariantNote:
        "Ammo Carrier: ammo boxes per wiki. Flamethrower: No.77 ×2 instead of frag; verify exact flamethrower model name in UI.",
    },
    {
      factionId: "allies_british_polish",
      classId: "machine_gunner",
      classLabel: "Machine Gunner",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Machine Gunner level 1",
          primary: [{ name: "Lewis Gun", magazines: 10 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
          other: [E("Bandage", 2), E("Fairbairn-Sykes", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Machine Gunner level 3",
          primary: [{ name: "Lewis Gun", magazines: 8 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
          other: [E("Hammer", 1), E("Bandage", 2), E("Fairbairn-Sykes", 1)],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "anti_tank",
      classLabel: "Anti-Tank",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Anti-Tank level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 6 }],
          secondary: [{ name: "PIAT", rockets: 2 }],
        },
        {
          id: "gun_crew",
          label: "Gun Crew",
          unlock: "Anti-Tank level 3",
          primary: [{ name: "Rifle No.4 Mk I", magazines: 6 }],
          secondary: [],
        },
        {
          id: "ambusher",
          label: "Ambusher",
          unlock: "Anti-Tank level 6",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
        },
      ],
      common: [GB.frag2, GB.band2, GB.knife],
      commonByVariantNote:
        "Gun Crew: Hammer, Ordnance QF 6-pounder Wrench. Ambusher: No.82 Grenade ×2, Hammer, Satchel Charge ×1, A.T. Mine G.S. Mk V ×4, AP mine ×1 (wiki row — verify counts).",
    },
    {
      factionId: "allies_british_polish",
      classId: "engineer",
      classLabel: "Engineer",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Engineer level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 6 }],
          secondary: [],
        },
        {
          id: "pioneer",
          label: "Sapper",
          unlock: "Engineer level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 5 }],
          secondary: [],
        },
      ],
      common: [
        GB.band2,
        { slot: "utility", name: "Wrench", count: 1 },
        GB.hammer,
        { slot: "utility", name: "Blow torch", count: 1 },
        GB.knife,
      ],
      commonByVariantNote:
        "Standard: A.P. Shrapnel Mine Mk II ×2, A.T. Mine G.S. Mk V ×1. Sapper: AP ×2, Mills ×2, Satchel ×1, Hammer. Wiki Field Engineer tier is US/Germany-focused — add a third British tier when verified in-game.",
    },
    {
      factionId: "allies_british_polish",
      classId: "tank_commander",
      classLabel: "Tank Commander",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Tank Commander level 1",
          primary: [{ name: "Sten Gun Mk.II", magazines: 4 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Tank Commander level 3",
          primary: [],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
        },
      ],
      common: [GB.band2, GB.binocs, GB.knife],
      commonByVariantNote: "Mechanic: Blow torch replaces SMG primary.",
    },
    {
      factionId: "allies_british_polish",
      classId: "crewman",
      classLabel: "Crewman",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Crewman level 1",
          primary: [{ name: "Webley MK VI", magazines: 6 }],
          secondary: [],
        },
        {
          id: "mechanic",
          label: "Mechanic",
          unlock: "Crewman level 3",
          primary: [{ name: "Webley MK VI", magazines: 6 }],
          secondary: [],
        },
      ],
      common: [GB.band2, GB.knife],
      commonByVariantNote: "Mechanic: No.77 ×2, Blow torch.",
    },
    {
      factionId: "allies_british_polish",
      classId: "spotter",
      classLabel: "Spotter",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Spotter level 1",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
          other: [
            E("Mills Bomb", 2),
            E("Bandage", 2),
            E("A.P. Shrapnel Mine Mk II", 1),
            E("Small Ammunition Box", 1),
            E("Watch", 1),
            E("Prism No.2 MK II Binoculars", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
        {
          id: "scout",
          label: "Scout",
          unlock: "Spotter level 3",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 10 }],
          secondary: [],
          other: [
            E("No.77 Smoke Grenade", 2),
            E("Bandage", 2),
            E("Watch", 1),
            E("Prism No.2 MK II Binoculars", 1),
            E("Flare gun", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "sniper",
      classLabel: "Sniper",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Sniper level 1",
          primary: [{ name: "Rifle No.4 Mk I (scoped)", magazines: 12 }],
          secondary: [{ name: "Webley MK VI", magazines: 6 }],
          other: [E("Mills Bomb", 2), E("Bandage", 2), E("Fairbairn-Sykes", 1)],
        },
        {
          id: "veteran",
          label: "Veteran",
          unlock: "Sniper level 3",
          primary: [{ name: "SMLE No.1 Mk III (scoped)", magazines: 10 }],
          secondary: [],
          other: [
            E("No.77 Smoke Grenade", 2),
            E("A.P. Shrapnel Mine Mk II", 1),
            E("Bandage", 2),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "artillery_observer",
      classLabel: "Artillery Observer",
      dataAsOfNote: "Faction-equivalent layout to Germany; verify in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Artillery Observer level 1",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
          other: [
            E("Mills Bomb (HE)", 2),
            E("Watch", 1),
            E("Binoculars", 1),
            E("Hammer", 1),
            E("Bandage", 2),
            E("Fairbairn-Sykes", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
          ],
        },
        {
          id: "nco",
          label: "NCO",
          unlock: "Artillery Observer level 3",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 10 }],
          secondary: [{ name: "Webley MK VI", magazines: 4 }],
          other: [
            E("No.77 Smoke (smoke)", 2),
            E("A.P. Shrapnel Mine Mk II", 1),
            E("Watch", 1),
            E("Binoculars", 1),
            {
              name: "Flare gun",
              count: 1,
              note: "Single round per resupply; ~5 min cooldown between shots",
            },
            E("Bandage", 2),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "artillery_operator",
      classLabel: "Operator",
      dataAsOfNote: "Faction-equivalent layout to Germany; verify in-game.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Operator level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 6 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("Wrench", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("A.P. Shrapnel Mine Mk II", 1),
            E("A.T. Mine G.S. Mk V", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
        {
          id: "pioneer",
          label: "Pioneer",
          unlock: "Operator level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 6 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("A.P. Shrapnel Mine Mk II", 1),
            E("Hammer", 1),
            E("Blowtorch", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
    {
      factionId: "allies_british_polish",
      classId: "artillery_gunner",
      classLabel: "Gunner",
      dataAsOfNote: "Faction-equivalent layout to Germany.",
      variants: [
        {
          id: "standard_issue",
          label: "Standard Issue",
          unlock: "Gunner level 1",
          primary: [{ name: "SMLE No.1 Mk III", magazines: 6 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("Mills Bomb (HE)", 2),
            E("Supplies", 1),
            E("Hammer", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
        {
          id: "ammo_carrier",
          label: "Ammo Carrier",
          unlock: "Gunner level 3",
          primary: [{ name: "Sten Gun Mk.V", magazines: 8 }],
          secondary: [],
          other: [
            E("Bandage", 2),
            E("No.77 Smoke (smoke)", 2),
            E("Supplies", 1),
            E("Explosive ammo box", 1),
            E("Hammer", 1),
            E("Fairbairn-Sykes", 1),
          ],
        },
      ],
      common: [],
    },
  ];
}

function main() {
  const raw = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(raw);

  const stripIds = new Set([
    "united_states",
    "soviet_union",
    "allies_british_polish",
    "german_africa_corps",
    "british_eighth_army",
  ]);

  data.loadouts = data.loadouts.filter((row) => !stripIds.has(row.factionId));

  const extra = [
    ...unitedStatesLoadouts(),
    ...sovietUnionLoadouts(),
    ...britishPolishLoadouts(),
  ];

  data.loadouts.push(...extra);

  const germany = data.loadouts.filter((r) => r.factionId === "germany");
  const british = data.loadouts.filter((r) => r.factionId === "allies_british_polish");

  for (const row of germany) {
    const c = deepClone(row);
    c.factionId = "german_africa_corps";
    data.loadouts.push(c);
  }
  for (const row of british) {
    const c = deepClone(row);
    c.factionId = "british_eighth_army";
    data.loadouts.push(c);
  }

  data.description =
    "Infantry equipment by faction, class, and role level. Germany (Western Europe) and artillery trio details are the most verified on-site; United States, Soviet Union, and Allies (British/Polish) are compiled primarily from Hell Let Loose Wiki loadout tables (often labeled Update 13) with artillery rows structurally mirrored from the German entries. German Africa Corps and British Eighth Army are the same weapon tables as Germany and British/Polish respectively (theater factions). Expect patch drift — compare in-game, especially after balance passes.";

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(
    "Wrote",
    data.loadouts.length,
    "loadout rows to",
    path.relative(root, dataPath),
  );
}

main();
