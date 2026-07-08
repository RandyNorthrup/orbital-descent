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
    gravityAccel: 18,
    atmosphereDensity: 0,
    hazard: null,
    distance: 0,
    terrainPalette: { fillTopColor: 0x8f8aa8, fillBottomColor: 0x4a4560, etchStyle: 'rock' },
  },
  {
    id: 'verdalis',
    name: 'Verdalis',
    gravityAccel: 14,
    atmosphereDensity: 0.01,
    hazard: null,
    distance: 42,
    terrainPalette: { fillTopColor: 0xd9c191, fillBottomColor: 0x9c8054, etchStyle: 'sand' },
  },
  {
    id: 'pyrrhine-expanse',
    name: 'Pyrrhine Expanse',
    gravityAccel: 22,
    atmosphereDensity: 0.05,
    hazard: { type: 'corrosive', fuelDrainRate: 4 },
    distance: 95,
    terrainPalette: { fillTopColor: 0xa8b877, fillBottomColor: 0x5c6b3f, etchStyle: 'rock' },
  },
  {
    id: 'glacian-drift',
    name: 'Glacian Drift',
    gravityAccel: 12,
    atmosphereDensity: 0.005,
    hazard: { type: 'cold', thrustEfficiency: 0.7 },
    distance: 210,
    terrainPalette: { fillTopColor: 0xd8ecf5, fillBottomColor: 0x8fb8c9, etchStyle: 'water' },
  },
  {
    id: 'thessaly-shoals',
    name: 'Thessaly Shoals',
    gravityAccel: 16,
    atmosphereDensity: 0.02,
    hazard: null,
    distance: 15,
    terrainPalette: { fillTopColor: 0x8fd0c0, fillBottomColor: 0x3f7d6e, etchStyle: 'water' },
  },
  {
    id: 'umbral-fen',
    name: 'Umbral Fen',
    gravityAccel: 19,
    atmosphereDensity: 0.035,
    hazard: { type: 'corrosive', fuelDrainRate: 2 },
    distance: 60,
    terrainPalette: { fillTopColor: 0x6b8f5c, fillBottomColor: 0x35472c, etchStyle: 'foliage' },
  },
  {
    id: 'kharun-wastes',
    name: 'Kharun Wastes',
    gravityAccel: 20,
    atmosphereDensity: 0.015,
    hazard: null,
    distance: 30,
    terrainPalette: { fillTopColor: 0xc98a4b, fillBottomColor: 0x7a4f26, etchStyle: 'sand' },
  },
  {
    id: 'solenne-vault',
    name: 'Solenne Vault',
    gravityAccel: 26,
    atmosphereDensity: 0,
    hazard: null,
    distance: 75,
    terrainPalette: { fillTopColor: 0x6a6a76, fillBottomColor: 0x2e2e38, etchStyle: 'rock' },
  },
  {
    id: 'aurelic-marsh',
    name: 'Aurelic Marsh',
    gravityAccel: 15,
    atmosphereDensity: 0.025,
    hazard: { type: 'cold', thrustEfficiency: 0.85 },
    distance: 130,
    terrainPalette: { fillTopColor: 0x9fc9a0, fillBottomColor: 0x547a58, etchStyle: 'foliage' },
  },
  {
    id: 'corvexa-shallows',
    name: 'Corvexa Shallows',
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
    terrainPalette: { fillTopColor: 0x7fc9b0, fillBottomColor: 0x3a7f68, etchStyle: 'water' },
  },
  {
    id: 'nimbus-scar',
    name: 'Nimbus Scar',
    gravityAccel: 9,
    atmosphereDensity: 0.06,
    hazard: null,
    distance: 180,
    terrainPalette: { fillTopColor: 0xb0a8c0, fillBottomColor: 0x6a6078, etchStyle: 'rock' },
  },
  {
    id: 'thornreach-expanse',
    name: 'Thornreach Expanse',
    gravityAccel: 21,
    atmosphereDensity: 0.01,
    hazard: { type: 'cold', thrustEfficiency: 0.6 },
    distance: 250,
    terrainPalette: { fillTopColor: 0xe0d8c0, fillBottomColor: 0x9c9480, etchStyle: 'sand' },
  },
];
