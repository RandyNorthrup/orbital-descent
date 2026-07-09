import type { Base, BaseRequirements } from './base';
import { computeDifficultyProfile, type DifficultyShipReference } from './difficulty';
import type { CelestialBody } from '../planets/celestial-body';
import { BODIES } from '../planets/bodies';
import { findShipById } from '../ships/ships';
import type { GenerateTerrainOptions, Obstacle } from '../terrain/terrain-generator';
import {
  GAME_HEIGHT,
  TERRAIN_MAX_HEIGHT_FRACTION,
  TERRAIN_MIN_HEIGHT_FRACTION,
  TERRAIN_SEGMENTS,
  WORLD_WIDTH,
} from '../constants';

/**
 * Looks up a `CelestialBody` by id in the Milestone 5 registry
 * (`planets/bodies.ts`). A base referencing a nonexistent world id would be
 * a real data-integrity bug in this file, not a reachable runtime
 * condition, so this throws rather than silently falling back — the same
 * lookup `GameScene` needs for a base's target world, exported here so
 * that call site and this one can't silently drift into two copies of the
 * same logic.
 */
export function findBodyById(id: string): CelestialBody {
  const body = BODIES.find((candidate) => candidate.id === id);
  if (!body) {
    throw new Error(`findBodyById: no CelestialBody registered with id '${id}'`);
  }
  return body;
}

/** The one ship-intrinsic number `computeDifficultyProfile` needs (see
 * `difficulty.ts`'s own doc comment on `DifficultyShipReference`) — every
 * base here is scored against Falcon, this project's default ship
 * (`ships/ships.ts`'s `SHIPS[0]`), matching every other Milestone 1-6
 * system's assumption of an unmodified, unequipped starter ship. Not a
 * live, per-player "your currently equipped ship" difficulty score — that
 * would make a base's badge change as the player's loadout changes, a
 * bigger, currently out-of-scope redesign this milestone doesn't need. */
const SHIP_REFERENCE: DifficultyShipReference = {
  thrustAccel: findShipById('falcon').baseThrustAccel,
};

/** Shared `terrainOptions` fields across every registered base — only
 * `seed`/`maxStepFraction`/`padSegmentCount` differ per base (see each
 * base's own literal in `BASES` below). */
const COMMON_TERRAIN_OPTIONS: Omit<
  GenerateTerrainOptions,
  'seed' | 'maxStepFraction' | 'padSegmentCount'
> = {
  width: WORLD_WIDTH,
  height: GAME_HEIGHT,
  segments: TERRAIN_SEGMENTS,
  minHeightFraction: TERRAIN_MIN_HEIGHT_FRACTION,
  maxHeightFraction: TERRAIN_MAX_HEIGHT_FRACTION,
};

/** Shared `requirements` fields across every registered base — only
 * `hazardCounterTags`/`recommendedTags` differ per base. Every base in this
 * milestone's roster uses the same generous `minTWR` bands and places no
 * `handling` demand or combat gate; a future base with a tighter TWR band,
 * a handling requirement, or a real weapon-tier gate authors its own
 * `requirements` object instead of spreading this one. */
const COMMON_REQUIREMENTS: Omit<BaseRequirements, 'hazardCounterTags' | 'recommendedTags'> = {
  minTWR: { hardFloor: 1.05, comfortable: 1.3 },
  handling: null,
  combat: { minWeaponTier: 0, minShieldTier: 0 },
};

/** Milestone 10's curated obstacle layout for Scarp Outpost (this game's
 * already-tightest authored pad, `padSegmentCount: 3`). Placement was
 * computed by directly running `generateTerrain` with this base's exact
 * `terrainOptions` (seed 602, this file's own `COMMON_TERRAIN_OPTIONS`),
 * not eyeballed — the pad lands at x=[1368, 1416]; this spire sits 54px
 * clear of its right edge, well outside a 14px-radius lander's collision
 * margin. `bases.test.ts` pins this non-overlap with a real
 * `generateTerrain` call, not just this comment's own arithmetic. */
const SCARP_OUTPOST_OBSTACLES: readonly Obstacle[] = [
  { kind: 'spire', xStart: 1470, xEnd: 1494, yTop: 180, yBottom: 430 },
];

/** Milestone 10's curated obstacle layout for Frostgate (this game's
 * hardest base — PLAN.md §9.5.7 Example F, infeasible for the entire ship
 * roster via relay). Placement computed the same way as Scarp Outpost's
 * above: the pad lands at x=[1056, 1176] for this exact seed (605); both
 * obstacles sit well clear of it and of each other. */
const FROSTGATE_OBSTACLES: readonly Obstacle[] = [
  { kind: 'spire', xStart: 1240, xEnd: 1264, yTop: 180, yBottom: 430 },
  { kind: 'debris', xStart: 1330, xEnd: 1370, yTop: 260, yBottom: 330 },
];

/** Everything about a base except its computed `difficulty`/always-empty
 * `encounters` — `buildBase` derives those two from the rest so every
 * base's `difficulty` is a real function of its own authored data, never a
 * hand-typed literal that can silently drift out of sync with it. */
interface BaseSpec {
  readonly id: string;
  readonly name: string;
  readonly worldId: string;
  readonly order: number;
  readonly localOffset: number;
  readonly isCriticalPath: boolean;
  readonly unlocks: readonly string[];
  readonly status: Base['status'];
  readonly terrainOptions: GenerateTerrainOptions;
  readonly requirements: BaseRequirements;
  readonly garrisonRequirement: number;
}

function buildBase(spec: BaseSpec): Base {
  const body = findBodyById(spec.worldId);
  const difficulty = computeDifficultyProfile(
    spec.requirements,
    spec.terrainOptions,
    body,
    SHIP_REFERENCE,
  );
  return { ...spec, encounters: [], difficulty };
}

/**
 * Milestone 6's hand-authored base roster (Decision D17/D20). Exactly these
 * 5 entries, in this exact order — Milestone 9.5's own worked examples
 * (PLAN.md §9.5.7) do exact relay-distance/unlock-graph reasoning against
 * this precise id/localOffset/unlocks/status roster, so changing any of
 * them here is a design-breaking change there, not a free refactor.
 */
export const BASES: readonly Base[] = [
  buildBase({
    id: 'anchor-station',
    name: 'Anchor Station',
    worldId: 'kessels-reach',
    order: 0,
    localOffset: 0,
    isCriticalPath: true,
    unlocks: ['meridian-yard', 'scarp-outpost'],
    status: 'discovered-unclaimed',
    terrainOptions: {
      ...COMMON_TERRAIN_OPTIONS,
      seed: 601,
      maxStepFraction: 0.01,
      padSegmentCount: 8,
    },
    requirements: { ...COMMON_REQUIREMENTS, hazardCounterTags: [], recommendedTags: [] },
    // PLAN.md §9.5.7 Example A: the tutorial Establish Presence mission.
    garrisonRequirement: 6,
  }),
  buildBase({
    id: 'scarp-outpost',
    name: 'Scarp Outpost',
    worldId: 'kessels-reach',
    order: 1,
    localOffset: 2.4,
    isCriticalPath: false,
    unlocks: [],
    status: 'locked',
    terrainOptions: {
      ...COMMON_TERRAIN_OPTIONS,
      seed: 602,
      maxStepFraction: 0.05,
      padSegmentCount: 3,
      // Milestone 10: pins the pad to the exact index this seed/options
      // combination already produced (confirmed by directly running
      // generateTerrain before authoring this), byte-for-byte identical
      // output to the pre-Milestone-10 random draw -- but now an explicit,
      // authored constant rather than an emergent property of the seed,
      // so SCARP_OUTPOST_OBSTACLES below can be placed relative to a
      // *known* pad position, exactly this field's own documented purpose.
      padStartIndexOverride: 57,
      // One spire just past the pad's own right edge (pad is x=[1368,
      // 1416] for the pinned index above) -- this spire sits 54px clear
      // of it, well outside a 14px-radius lander's collision margin -- so
      // this already-tightest-pad base (padSegmentCount 3) also carries
      // real spatial obstacle difficulty.
      obstacles: SCARP_OUTPOST_OBSTACLES,
    },
    requirements: { ...COMMON_REQUIREMENTS, hazardCounterTags: [], recommendedTags: [] },
    // PLAN.md §9.5.7 Example D's same-world relay establishes this base.
    garrisonRequirement: 10,
  }),
  buildBase({
    id: 'meridian-yard',
    name: 'Meridian Yard',
    worldId: 'verdalis',
    order: 0,
    localOffset: 0,
    isCriticalPath: true,
    unlocks: ['rustwell-landing'],
    status: 'locked',
    terrainOptions: {
      ...COMMON_TERRAIN_OPTIONS,
      seed: 603,
      maxStepFraction: 0.03,
      padSegmentCount: 5,
    },
    requirements: { ...COMMON_REQUIREMENTS, hazardCounterTags: [], recommendedTags: [] },
    garrisonRequirement: 15,
  }),
  buildBase({
    id: 'rustwell-landing',
    name: 'Rustwell Landing',
    worldId: 'pyrrhine-expanse',
    order: 0,
    localOffset: 0,
    isCriticalPath: true,
    unlocks: ['frostgate'],
    status: 'locked',
    terrainOptions: {
      ...COMMON_TERRAIN_OPTIONS,
      seed: 604,
      maxStepFraction: 0.03,
      padSegmentCount: 6,
    },
    // Pyrrhine Expanse's hazard is corrosive (`planets/bodies.ts`) — the
    // hazard-counter/recommended tags reflect that specific hazard, not a
    // generic default.
    requirements: {
      ...COMMON_REQUIREMENTS,
      hazardCounterTags: ['corrosion-resistant'],
      recommendedTags: ['fuel-efficient'],
    },
    // PLAN.md §9.5.7 Example E's cross-world relay establishes this base.
    garrisonRequirement: 30,
  }),
  buildBase({
    id: 'frostgate',
    name: 'Frostgate',
    worldId: 'glacian-drift',
    order: 0,
    localOffset: 0,
    isCriticalPath: true,
    unlocks: [],
    status: 'locked',
    terrainOptions: {
      ...COMMON_TERRAIN_OPTIONS,
      seed: 605,
      maxStepFraction: 0.03,
      padSegmentCount: 6,
      // Milestone 10: pins the pad to the exact index this seed/options
      // combination already produced (same rationale as Scarp Outpost's
      // own padStartIndexOverride above) -- byte-for-byte identical output
      // to the pre-Milestone-10 random draw, now an authored constant.
      padStartIndexOverride: 44,
      // This game's hardest base (Example F: infeasible for the entire
      // ship roster via relay) also carries its densest obstacle layout --
      // a spire and a floating debris chunk, both placed relative to the
      // pinned pad above (x=[1056, 1176]).
      obstacles: FROSTGATE_OBSTACLES,
    },
    // Glacian Drift's hazard is cold (`planets/bodies.ts`).
    requirements: {
      ...COMMON_REQUIREMENTS,
      hazardCounterTags: ['cold-hardened'],
      recommendedTags: [],
    },
    // PLAN.md §9.5.7 Example F: infeasible for the entire ship roster.
    garrisonRequirement: 30,
  }),
];
