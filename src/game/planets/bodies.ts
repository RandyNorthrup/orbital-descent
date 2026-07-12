import type { CelestialBody } from './celestial-body';

/**
 * Starter registry of fictional worlds/moons (Decision D11/D20 — "at least
 * 12", never real celestial bodies).
 *
 * - `gravityAccel` spans roughly 9-26 px/s²; ignoring hazard thrust-
 *   efficiency penalties, that's always well under even the roster's
 *   weakest ship (Hauler's 40 px/s² `baseThrustAccel`, `ships/ships.ts`,
 *   Milestone 7). Under a `cold` hazard's `thrustEfficiency` multiplier
 *   (`flight/flight-state.ts`), the actual worst case in this registry is
 *   `thornreach-expanse` (gravityAccel 21, thrustEfficiency 0.6): Hauler's
 *   effective thrust is `40 × 0.6 = 24`, TWR ≈ 1.14 -- razor-thin, not
 *   "well under." Currently latent: `bases/bases.ts` only registers bases
 *   on 4 of these 12 bodies (kessels-reach/verdalis/pyrrhine-expanse/
 *   glacian-drift), so thornreach-expanse has no base yet and isn't
 *   reachable via Start or World Map today -- re-check this margin before
 *   it ever gets one paired with a cold hazard and the roster's weakest
 *   ship.
 * - `atmosphereDensity` spans 0 (airless) up to ~0.06 (thick); at typical
 *   in-flight speeds this is a meaningfully-felt but not overwhelming drag
 *   force relative to gravity/thrust.
 * - Hazards are spread across all three categories (`null`, `corrosive`,
 *   `cold`) roughly evenly.
 * - `etchStyle` covers all four materials (`rock`, `sand`, `water`,
 *   `foliage`) at least twice each.
 * - `skyPalette` (Milestone 14, papercraft-diorama art pass): each world's
 *   six hand-authored sky anchor colors, designed to harmonize with its own
 *   `terrainPalette` and to *communicate* its hazard — corrosive worlds get
 *   jaundiced/acid skies, cold worlds frost-blue ones. `cloudColor` is
 *   present exactly when `atmosphereDensity > 0` (airless worlds render a
 *   companion moon and denser stars instead of clouds — pinned by
 *   `bodies.test.ts`).
 * - `kind`/`skyPalette.daylight` (Milestone 15, Decision D22): the registry
 *   spans 3 moons / 4 barren / 5 lush and 4 day / 4 dusk / 4 night scenes,
 *   so the map reads as a varied system, not twelve night dioramas. Moons
 *   are exactly the airless bodies and are always authored `night`
 *   (`bodies.test.ts` pins both); hostile encounters live only on lush
 *   worlds (`bases.test.ts` pins that against the base registry).
 *
 * Kessel's Reach's `gravityAccel` (18) and terrain palette colors are a
 * byte-for-byte match to this project's original Milestone 1/2 hardcoded
 * single-world constants (`GRAVITY_ACCEL`, `TERRAIN_FILL_COLOR_TOP` /
 * `TERRAIN_FILL_COLOR_BOTTOM`) — deliberately, so the default/home world is
 * a continuation of the certified M1-M4 experience, not a competing numeric
 * universe (same philosophy PLAN.md §6b.6 item 1 already established for
 * ship stats).
 */
// A non-empty tuple type (not just `readonly CelestialBody[]`) so
// `BODIES[0]` (GameScene's default-body fallback) is statically known to
// be a real `CelestialBody`, not `CelestialBody | undefined`, under this
// project's `noUncheckedIndexedAccess` — without needing a non-null
// assertion (disallowed by this project's eslint config) or a dead
// "can't actually happen" runtime guard.
export const BODIES: readonly [CelestialBody, ...CelestialBody[]] = [
  {
    id: 'kessels-reach',
    name: "Kessel's Reach",
    kind: 'moon',
    landform: 'crater-field',
    gravityAccel: 18,
    atmosphereDensity: 0,
    hazard: null,
    distance: 0,
    terrainPalette: {
      fillTopColor: 0xd8d4e4,
      fillBottomColor: 0xaaa4c0,
      strataColors: { upper: 0x7e76a0, lower: 0x554e78 },
      etchStyle: 'rock',
    },
    // Home moon: deep indigo night under a warm gold moon — the game's
    // signature look. Airless, so no cloudColor: its sky gets a companion
    // moon and a denser starfield instead.
    skyPalette: {
      daylight: 'night',
      skyTopColor: 0x191434,
      skyBottomColor: 0x4d3d78,
      moonColor: 0xf6d77c,
      ridgeColor: 0x3c3660,
      starColor: 0xfff2d0,
    },
  },
  {
    id: 'verdalis',
    name: 'Verdalis',
    kind: 'lush',
    landform: 'dune-sea',
    gravityAccel: 14,
    atmosphereDensity: 0.01,
    hazard: null,
    distance: 42,
    terrainPalette: {
      fillTopColor: 0xf2dfa8,
      fillBottomColor: 0xe0bc74,
      strataColors: { upper: 0xd08a44, lower: 0x96602e },
      etchStyle: 'sand',
    },
    // Lush prairie at full day: clear noon blue melting into a green-gold
    // horizon, white clouds, sunlit grass-green hills — alive enough that
    // the wasps nesting here (bases.ts's meridian-yard) feel at home.
    skyPalette: {
      daylight: 'day',
      skyTopColor: 0x6db4e0,
      skyBottomColor: 0xcfe8b4,
      moonColor: 0xfff2b0,
      cloudColor: 0xf6fbee,
      ridgeColor: 0x3f7d46,
      starColor: 0xffffff,
    },
  },
  {
    id: 'pyrrhine-expanse',
    name: 'Pyrrhine Expanse',
    kind: 'barren',
    landform: 'mesa',
    gravityAccel: 22,
    atmosphereDensity: 0.05,
    hazard: { type: 'corrosive', fuelDrainRate: 4 },
    distance: 95,
    terrainPalette: {
      fillTopColor: 0xe6dcae,
      fillBottomColor: 0xc2bc80,
      strataColors: { upper: 0x8d9754, lower: 0x5f6838 },
      etchStyle: 'rock',
    },
    // Dead corrosive world at harsh noon: a jaundiced acid-amber haze with
    // a white-hot sun smeared behind it — the sky itself warns you about
    // the fuel drain. Barren: rustwell-landing's missions here lean on
    // raw-material extraction, not life.
    skyPalette: {
      daylight: 'day',
      skyTopColor: 0xc3b264,
      skyBottomColor: 0xe6da9c,
      moonColor: 0xfffbd8,
      cloudColor: 0xcfc47e,
      ridgeColor: 0x6b6434,
      starColor: 0xf4eec2,
    },
  },
  {
    id: 'glacian-drift',
    name: 'Glacian Drift',
    kind: 'lush',
    landform: 'ice-spikes',
    gravityAccel: 12,
    atmosphereDensity: 0.005,
    hazard: { type: 'cold', thrustEfficiency: 0.7 },
    distance: 210,
    terrainPalette: {
      fillTopColor: 0xf8fcfe,
      fillBottomColor: 0xd6f0f4,
      strataColors: { upper: 0x8fd8e6, lower: 0x3e64a8 },
      etchStyle: 'water',
    },
    // Boreal world at polar dusk: steel-blue twilight, an ice-white moon
    // over glacier blues. Lush despite the cold — a hardy boreal biosphere,
    // which is why the Glacian Warden (bases.ts's frostgate) can live here.
    skyPalette: {
      daylight: 'dusk',
      skyTopColor: 0x3f9eb4,
      skyBottomColor: 0xa8e4e0,
      moonColor: 0xeaf6ff,
      cloudColor: 0xf0f8fa,
      ridgeColor: 0x27498e,
      starColor: 0xffffff,
    },
  },
  {
    id: 'thessaly-shoals',
    name: 'Thessaly Shoals',
    kind: 'lush',
    landform: 'wave-swell',
    gravityAccel: 16,
    atmosphereDensity: 0.02,
    hazard: null,
    distance: 15,
    terrainPalette: {
      fillTopColor: 0xe2f6ee,
      fillBottomColor: 0xaee0d2,
      strataColors: { upper: 0x54a696, lower: 0x2c6e62 },
      etchStyle: 'water',
    },
    // Living sea at bright day: clear sky over sunlit royal-blue swells,
    // white clouds, a warm sun — the postcard face of a water world teeming
    // with life.
    skyPalette: {
      daylight: 'day',
      skyTopColor: 0x4f9ed6,
      skyBottomColor: 0xb4e0ea,
      moonColor: 0xffefaf,
      cloudColor: 0xffffff,
      ridgeColor: 0x2f6f9e,
      starColor: 0xd6ecff,
    },
  },
  {
    id: 'umbral-fen',
    name: 'Umbral Fen',
    kind: 'lush',
    landform: 'hummocks',
    gravityAccel: 19,
    atmosphereDensity: 0.035,
    hazard: { type: 'corrosive', fuelDrainRate: 2 },
    distance: 60,
    terrainPalette: {
      fillTopColor: 0xd2e0b0,
      fillBottomColor: 0xa2c080,
      strataColors: { upper: 0x6d9450, lower: 0x466330 },
      etchStyle: 'foliage',
    },
    // Corrosive swamp at night: murky violet dark sinking into bog-green,
    // lit by a sickly green moon. Lush — the fen is thick with (hostile-
    // capable) life; the corrosion is the bog's own doing.
    skyPalette: {
      daylight: 'night',
      skyTopColor: 0x191126,
      skyBottomColor: 0x3c4c34,
      moonColor: 0xbce87e,
      cloudColor: 0x5e7a56,
      ridgeColor: 0x2f4628,
      starColor: 0xd8f0c4,
    },
  },
  {
    id: 'kharun-wastes',
    name: 'Kharun Wastes',
    kind: 'barren',
    landform: 'rift-canyon',
    gravityAccel: 20,
    atmosphereDensity: 0.015,
    hazard: null,
    distance: 30,
    terrainPalette: {
      fillTopColor: 0xf6d8a4,
      fillBottomColor: 0xe8ae6a,
      strataColors: { upper: 0xbc6438, lower: 0x843e22 },
      etchStyle: 'sand',
    },
    // Dead desert at blazing noon: heat-bleached amber sky over rust dunes,
    // a white-gold sun overhead — nothing lives here, but the ground is
    // full of ore.
    skyPalette: {
      daylight: 'day',
      skyTopColor: 0xe0a35c,
      skyBottomColor: 0xf4dcae,
      moonColor: 0xfff6d2,
      cloudColor: 0xf0d2ac,
      ridgeColor: 0x8c3a2a,
      starColor: 0xffe8c4,
    },
  },
  {
    id: 'solenne-vault',
    name: 'Solenne Vault',
    kind: 'moon',
    landform: 'basin',
    gravityAccel: 26,
    atmosphereDensity: 0,
    hazard: null,
    distance: 75,
    terrainPalette: {
      fillTopColor: 0xd4cfc4,
      fillBottomColor: 0xa49e90,
      strataColors: { upper: 0x746e5e, lower: 0x4b463a },
      etchStyle: 'rock',
    },
    // Highest gravity in the registry, airless moon: a stark near-black
    // void with a harsh white moon — the sky itself feels heavy. No
    // cloudColor; companion moon + dense stars instead.
    skyPalette: {
      daylight: 'night',
      skyTopColor: 0x0b0b12,
      skyBottomColor: 0x2c2534,
      moonColor: 0xfff3d4,
      ridgeColor: 0x353026,
      starColor: 0xffffff,
    },
  },
  {
    id: 'aurelic-marsh',
    name: 'Aurelic Marsh',
    kind: 'lush',
    landform: 'terraces',
    gravityAccel: 15,
    atmosphereDensity: 0.025,
    hazard: { type: 'cold', thrustEfficiency: 0.85 },
    distance: 130,
    terrainPalette: {
      fillTopColor: 0xdcecc0,
      fillBottomColor: 0xacca8c,
      strataColors: { upper: 0x6f9c54, lower: 0x47683a },
      etchStyle: 'foliage',
    },
    // Cold living marsh at aurora dusk — frost-pale moon, mint clouds over
    // a green wetland biosphere.
    skyPalette: {
      daylight: 'dusk',
      skyTopColor: 0x7a5a94,
      skyBottomColor: 0xf0c8a8,
      moonColor: 0xdcf2b6,
      cloudColor: 0xf4e4d4,
      ridgeColor: 0x5c4874,
      starColor: 0xc8ffd8,
    },
  },
  {
    id: 'corvexa-shallows',
    name: 'Corvexa Shallows',
    kind: 'barren',
    landform: 'cracked-flats',
    gravityAccel: 17,
    atmosphereDensity: 0.04,
    // 4, not the originally-tuned 5: at 5, passive drain alone (with zero
    // thrust used at all) fully empties Falcon's fuelCapacity (100,
    // `ships/ships.ts`) in exactly 20s --
    // precisely SCORE_TIME_PAR_MS, this game's own "comfortably beats par"
    // reference duration -- leaving zero fuel margin for the braking burn
    // every real landing needs, regardless of skill. Found by Milestone 5's
    // adversarial gameplay-balance review; 4 (tied with pyrrhine-expanse
    // rather than uniquely worse) leaves real margin at par time while
    // still meaningfully harsher than umbral-fen's introductory rate.
    hazard: { type: 'corrosive', fuelDrainRate: 4 },
    distance: 160,
    terrainPalette: {
      fillTopColor: 0xe0eee6,
      fillBottomColor: 0xaed2c6,
      strataColors: { upper: 0x549886, lower: 0x316354 },
      etchStyle: 'water',
    },
    // Corrosive shallows at dusk: acid-teal lagoon glow, a pale
    // phosphorescent moon — beautiful and visibly wrong, like still water
    // you shouldn't touch. Barren: the acid killed this sea long ago.
    skyPalette: {
      daylight: 'dusk',
      skyTopColor: 0x3f7a8e,
      skyBottomColor: 0xbfe0d8,
      moonColor: 0xaaf0da,
      cloudColor: 0xecf4ee,
      ridgeColor: 0x2c5a62,
      starColor: 0xc0fff0,
    },
  },
  {
    id: 'nimbus-scar',
    name: 'Nimbus Scar',
    kind: 'barren',
    landform: 'volcano',
    gravityAccel: 9,
    atmosphereDensity: 0.06,
    hazard: null,
    distance: 180,
    terrainPalette: {
      fillTopColor: 0xe0d6dc,
      fillBottomColor: 0xb4a2ae,
      strataColors: { upper: 0x8c4450, lower: 0x5c2834 },
      etchStyle: 'rock',
    },
    // Thickest atmosphere in the registry — THE cloud world, at violet
    // dusk: magenta sky stacked with pink-lavender paper clouds around a
    // bright gold moon. Barren: permanent storm scouring bare rock; the
    // beauty is all in the sky.
    skyPalette: {
      daylight: 'dusk',
      skyTopColor: 0x5c3468,
      skyBottomColor: 0xc89ab0,
      moonColor: 0xffd24a,
      cloudColor: 0xe8d4e0,
      ridgeColor: 0x46202c,
      starColor: 0xffe4ff,
    },
  },
  {
    id: 'thornreach-expanse',
    name: 'Thornreach Expanse',
    kind: 'moon',
    landform: 'needle-spires',
    gravityAccel: 21,
    atmosphereDensity: 0,
    hazard: { type: 'cold', thrustEfficiency: 0.6 },
    distance: 250,
    terrainPalette: {
      fillTopColor: 0xeee6cc,
      fillBottomColor: 0xccc0a0,
      strataColors: { upper: 0x968a6c, lower: 0x645c46 },
      etchStyle: 'sand',
    },
    // Harshest cold in the registry, an airless frozen moon: salt flats
    // under a dim violet night, a frostbitten blue-white moon. Airless
    // (Milestone 15 — was 0.01 before it was reclassified as a moon; no
    // base flies here yet, so no certified flight feel changed), so no
    // cloudColor: companion moon + dense stars instead.
    skyPalette: {
      daylight: 'night',
      skyTopColor: 0x1b1426,
      skyBottomColor: 0x4c4a6e,
      moonColor: 0xd2e2f2,
      ridgeColor: 0x443e30,
      starColor: 0xe8f0ff,
    },
  },
];
