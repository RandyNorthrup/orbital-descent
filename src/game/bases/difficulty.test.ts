import { describe, expect, it } from 'vitest';
import {
  computeCombatAxis,
  computeDifficultyProfile,
  computeMechanicalAxis,
  computeSpatialAxis,
  type DifficultyShipReference,
} from './difficulty';
import type { BaseRequirements, CombatantDefinition, EncounterSpec, TWRBand } from './base';
import type { CelestialBody, Hazard } from '../planets/celestial-body';
import type { GenerateTerrainOptions, Obstacle } from '../terrain/terrain-generator';

/** Only `minTWR` is exercised by this module — the rest of `BaseRequirements`
 * is filled with arbitrary-but-valid placeholder values so each test can
 * pass just the one field it cares about. */
function makeRequirements(minTWR: TWRBand): BaseRequirements {
  return {
    minTWR,
    handling: null,
    hazardCounterTags: [],
    recommendedTags: [],
    combat: { minWeaponTier: 0, minShieldTier: 0 },
  };
}

/** Only `gravityAccel`/`hazard` are exercised by this module — the rest of
 * `CelestialBody` is filled with arbitrary-but-valid placeholder values. */
function makeBody(gravityAccel: number, hazard: Hazard): CelestialBody {
  return {
    id: 'test-body',
    name: 'Test Body',
    kind: 'moon',
    landform: 'crater-field',
    gravityAccel,
    atmosphereDensity: 0,
    hazard,
    terrainPalette: {
      fillTopColor: 0x000000,
      fillBottomColor: 0xffffff,
      strataColors: { upper: 0x6a6584, lower: 0x474155 },
      etchStyle: 'rock',
    },
    skyPalette: {
      daylight: 'night',
      skyTopColor: 0x000000,
      skyBottomColor: 0xffffff,
      moonColor: 0xffffff,
      ridgeColor: 0x888888,
      starColor: 0xffffff,
    },
    distance: 0,
  };
}

/** Only `padSegmentCount`/`maxStepFraction` are exercised by this module —
 * the rest of `GenerateTerrainOptions` is filled with arbitrary-but-valid
 * placeholder values. */
/** Content is irrelevant -- `computeSpatialAxis` only reads `.length`. */
function makeObstacles(count: number): Obstacle[] {
  return Array.from({ length: count }, () => ({
    kind: 'debris' as const,
    xStart: 0,
    xEnd: 0,
    yTop: 0,
    yBottom: 0,
  }));
}

function makeTerrainOptions(
  padSegmentCount: number,
  maxStepFraction: number,
  obstacleCount = 0,
): GenerateTerrainOptions {
  return {
    seed: 1,
    width: 960,
    height: 640,
    segments: 40,
    minHeightFraction: 0.6,
    maxHeightFraction: 0.85,
    maxStepFraction,
    padSegmentCount,
    ...(obstacleCount > 0 ? { obstacles: makeObstacles(obstacleCount) } : {}),
  };
}

const SHIP_REFERENCE: DifficultyShipReference = { thrustAccel: 46, hullPoints: 30 };

// The bands from PLAN.md §6b.5's "Aerthos Flats" worked example — generous
// enough that bareTWR never approaches hardFloor for any gravityAccel used
// below, so the TWR-deficit term is 0 wherever this constant is reused.
const GENEROUS_TWR: TWRBand = { hardFloor: 1.05, comfortable: 1.3 };

describe('computeMechanicalAxis', () => {
  it('scores just the base score with generous bands and no hazard', () => {
    const body = makeBody(18, null);
    // bareTWR = 46/18 ≈ 2.556, well above comfortable (1.3) -> deficit clamps to 0.
    // mechanical = 1 (base) + 0*4 (deficit) + 0 (no hazard) = 1.
    expect(computeMechanicalAxis(makeRequirements(GENEROUS_TWR), body, SHIP_REFERENCE)).toBe(1);
  });

  it('adds exactly the corrosive bump for a corrosive-hazard body', () => {
    const body = makeBody(18, { type: 'corrosive', fuelDrainRate: 4 });
    // 1 (base) + 0 (deficit, same generous bands) + 4 (corrosive) = 5.
    expect(computeMechanicalAxis(makeRequirements(GENEROUS_TWR), body, SHIP_REFERENCE)).toBe(5);
  });

  it('adds exactly the cold bump for a cold-hazard body', () => {
    const body = makeBody(18, { type: 'cold', thrustEfficiency: 0.7 });
    // 1 (base) + 0 (deficit) + 3 (cold) = 4.
    expect(computeMechanicalAxis(makeRequirements(GENEROUS_TWR), body, SHIP_REFERENCE)).toBe(4);
  });

  it('contributes a nonzero, correctly-computed deficit when minTWR bands are tight relative to bareTWR', () => {
    // No currently-authored base has bands this tight relative to its
    // world's gravity (all 5 real bases use generous bands) -- this is the
    // one case that must be exercised with synthetic inputs, or the
    // deficit branch has zero coverage anywhere in the codebase.
    const body = makeBody(20, null); // bareTWR = 46/20 = 2.3
    const requirements = makeRequirements({ hardFloor: 1.0, comfortable: 3.0 });
    // deficit = (3.0 - 2.3) / (3.0 - 1.0) = 0.7/2.0 = 0.35
    // mechanical = 1 (base) + 0.35*4 (deficit=1.4) + 0 (no hazard) = 2.4 -> rounds to 2.
    expect(computeMechanicalAxis(requirements, body, SHIP_REFERENCE)).toBe(2);
  });
});

describe('computeSpatialAxis', () => {
  it('scores 0 for a generous pad and perfectly smooth terrain', () => {
    // padTightness = (8-8)/(8-2) = 0; roughness = 0/0.08 = 0.
    expect(computeSpatialAxis(makeTerrainOptions(8, 0))).toBe(0);
  });

  it('scores the full pad component for a pad at the tight threshold', () => {
    // padTightness = (8-2)/(8-2) = 1 -> 1*7 = 7; roughness = 0.
    expect(computeSpatialAxis(makeTerrainOptions(2, 0))).toBe(7);
  });

  it('scores the full roughness component for terrain at the roughness reference', () => {
    // padTightness = 0 (comfortable pad); roughness = 0.08/0.08 = 1 -> 1*3 = 3.
    expect(computeSpatialAxis(makeTerrainOptions(8, 0.08))).toBe(3);
  });

  it('computes a fully hand-derived mid-range score', () => {
    // padTightness = (8-5)/(8-2) = 3/6 = 0.5 -> 0.5*7 = 3.5
    // roughness    = 0.04/0.08 = 0.5          -> 0.5*3 = 1.5
    // total = 5.0 -> rounds to 5.
    expect(computeSpatialAxis(makeTerrainOptions(5, 0.04))).toBe(5);
  });

  it('contributes 0 from obstacles when none are authored (every pre-Milestone-10 base)', () => {
    expect(computeSpatialAxis(makeTerrainOptions(8, 0, 0))).toBe(0);
  });

  it('scores the full obstacle component at/above the density reference (Milestone 10)', () => {
    // padTightness = 0; roughness = 0; obstacleDensity = 3/3 = 1 -> 1*3 = 3.
    expect(computeSpatialAxis(makeTerrainOptions(8, 0, 3))).toBe(3);
  });

  it('scales obstacle contribution linearly below the density reference', () => {
    // obstacleDensity = 1/3 -> (1/3)*3 = 1.
    expect(computeSpatialAxis(makeTerrainOptions(8, 0, 1))).toBe(1);
  });

  it('caps the combined total at 10 for a base with both a tight pad and a dense obstacle layout', () => {
    // padTightness = 1 -> 7; roughness = 1 -> 3; obstacleDensity = 1 -> 3.
    // Raw total = 13, clamped to 10.
    expect(computeSpatialAxis(makeTerrainOptions(2, 0.08, 3))).toBe(10);
  });
});

/** Only `armorRating`/`contactDamage`/`attack` are exercised by
 * `computeCombatAxis` — the rest of `CombatantDefinition` is filled with
 * arbitrary-but-valid placeholder values. */
function makeCombatant(overrides: Partial<CombatantDefinition> = {}): CombatantDefinition {
  return {
    id: 'test-combatant',
    health: 10,
    armorRating: 0,
    contactDamage: 0,
    attack: null,
    movement: { kind: 'static' },
    ...overrides,
  };
}

function makeEncounter(
  combatant: CombatantDefinition,
  clearWindowMs = 5000,
  count = 1,
): EncounterSpec {
  return {
    id: 'test-encounter',
    combatants: [{ definition: combatant, count }],
    clearWindowMs,
    triggerAltitude: 100,
    seed: 1,
  };
}

describe('computeCombatAxis', () => {
  it('scores 0 for a base with no encounters (every base before Milestone 11)', () => {
    expect(computeCombatAxis([], SHIP_REFERENCE)).toBe(0);
  });

  it('scores the full threat component when worst-case contact threat meets the hull multiple', () => {
    // threat = 90 (contactDamage * count); reference = 3 * hullPoints(30) = 90 -> threatScore = 1 -> 1*6 = 6.
    const encounter = makeEncounter(makeCombatant({ contactDamage: 90 }));
    expect(computeCombatAxis([encounter], SHIP_REFERENCE)).toBe(6);
  });

  it('scores the full armor component when armorRating meets the armor reference', () => {
    // armorScore = 25/25 = 1 -> 1*4 = 4; threat = 0.
    const encounter = makeEncounter(makeCombatant({ armorRating: 25 }));
    expect(computeCombatAxis([encounter], SHIP_REFERENCE)).toBe(4);
  });

  it('scales both components linearly below their references and sums them', () => {
    // threat = 45 -> threatScore = 45/90 = 0.5 -> 0.5*6 = 3.
    // armor = 12.5 -> armorScore = 12.5/25 = 0.5 -> 0.5*4 = 2. Total = 5.
    const encounter = makeEncounter(makeCombatant({ contactDamage: 45, armorRating: 12.5 }));
    expect(computeCombatAxis([encounter], SHIP_REFERENCE)).toBe(5);
  });

  it('sums ranged-attack damage across only the hits landable within clearWindowMs, plus the guaranteed immediate hit', () => {
    // damagePerHit 18, cooldownMs 2000, clearWindowMs 6000 -> floor(6000/2000) + 1
    // (the "+1" is the guaranteed t=0 hit -- a freshly spawned combatant's
    // attackCooldownRemainingMs starts at 0) = 4 hits -> 72 threat.
    // threatScore = 72/90 = 0.8 -> 0.8*6 = 4.8; armor = 0 -> total rounds to 5.
    const encounter = makeEncounter(
      makeCombatant({ attack: { damagePerHit: 18, cooldownMs: 2000, range: 200 } }),
      6000,
    );
    expect(computeCombatAxis([encounter], SHIP_REFERENCE)).toBe(5);
  });

  it('takes the worst single encounter across multiple, not their sum', () => {
    const weak = makeEncounter(makeCombatant({ contactDamage: 10 }));
    const strong = makeEncounter(makeCombatant({ contactDamage: 90, armorRating: 25 }));
    expect(computeCombatAxis([weak, strong], SHIP_REFERENCE)).toBe(
      computeCombatAxis([strong], SHIP_REFERENCE),
    );
  });

  it('clamps at 10 when both components exceed their references', () => {
    const encounter = makeEncounter(makeCombatant({ contactDamage: 200, armorRating: 200 }));
    expect(computeCombatAxis([encounter], SHIP_REFERENCE)).toBe(10);
  });
});

describe('computeDifficultyProfile', () => {
  it('classifies a low-every-axis base as tutorial with the correctly-computed budget', () => {
    const body = makeBody(18, null);
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(8, 0);
    // mechanical = 1, spatial = 0, combat = 0 (no encounters).
    // highest = 1 <= TUTORIAL_MAX_AXIS(1) -> 'tutorial'.
    // budget uses mechanical as the dominant score: 1.0*1 + 0.4*(0+0) = 1.
    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      [],
      body,
      SHIP_REFERENCE,
    );
    expect(profile).toEqual({
      axes: { mechanical: 1, spatial: 0, combat: 0 },
      dominant: 'tutorial',
      budget: 1,
    });
  });

  it('classifies a corrosive-hazard, easy-terrain base as mechanical-dominant', () => {
    const body = makeBody(18, { type: 'corrosive', fuelDrainRate: 4 });
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(8, 0);
    // mechanical = 5, spatial = 0, combat = 0.
    // budget = 1.0*5 (dominant) + 0.4*(0+0) (others) = 5.
    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      [],
      body,
      SHIP_REFERENCE,
    );
    expect(profile).toEqual({
      axes: { mechanical: 5, spatial: 0, combat: 0 },
      dominant: 'mechanical',
      budget: 5,
    });
  });

  it('classifies a tight-pad, generous-TWR base as spatial-dominant', () => {
    const body = makeBody(18, null);
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(2, 0);
    // mechanical = 1, spatial = 7, combat = 0.
    // budget = 1.0*7 (dominant) + 0.4*(1+0) (others) = 7.4.
    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      [],
      body,
      SHIP_REFERENCE,
    );
    expect(profile.axes).toEqual({ mechanical: 1, spatial: 7, combat: 0 });
    expect(profile.dominant).toBe('spatial');
    expect(profile.budget).toBeCloseTo(7.4);
  });

  it('breaks a tie between equal mechanical and spatial axes in favor of mechanical', () => {
    const body = makeBody(18, { type: 'corrosive', fuelDrainRate: 4 });
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(5, 0.04);
    // mechanical = 5 (1 base + 4 corrosive, per the corrosive test above).
    // spatial = 5 (the mid-range case from computeSpatialAxis's own test above).
    // combat = 0. mechanical and spatial are jointly highest -> tie-break
    // picks mechanical first (mechanical, then spatial, then combat).
    // budget = 1.0*5 (dominant) + 0.4*(5+0) (others) = 5 + 2 = 7.
    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      [],
      body,
      SHIP_REFERENCE,
    );
    expect(profile).toEqual({
      axes: { mechanical: 5, spatial: 5, combat: 0 },
      dominant: 'mechanical',
      budget: 7,
    });
  });

  it('classifies a base whose combat axis strictly exceeds both others as combat-dominant', () => {
    const body = makeBody(18, null);
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(8, 0);
    // mechanical = 1, spatial = 0.
    // combat: armorRating at the armor reference (25) alone -> 4*1 = 4 (see
    // computeCombatAxis's own "scores the full armor component" test).
    const encounters = [makeEncounter(makeCombatant({ armorRating: 25 }))];
    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      encounters,
      body,
      SHIP_REFERENCE,
    );
    expect(profile.axes).toEqual({ mechanical: 1, spatial: 0, combat: 4 });
    expect(profile.dominant).toBe('combat');
    // budget = 1.0*4 (dominant) + 0.4*(1+0) (others) = 4.4.
    expect(profile.budget).toBeCloseTo(4.4);
  });

  it('classifies exactly-at-threshold as tutorial and just-above as dominant-axis, proving the branches are mutually exclusive and correctly ordered', () => {
    const terrainOptions = makeTerrainOptions(8, 0); // spatial = 0 throughout this test

    const atThreshold = computeDifficultyProfile(
      makeRequirements(GENEROUS_TWR),
      terrainOptions,
      [],
      makeBody(18, null),
      SHIP_REFERENCE,
    );
    // mechanical = 1 = TUTORIAL_MAX_AXIS exactly -> the inclusive `<=` boundary must still read tutorial.
    expect(atThreshold.axes.mechanical).toBe(1);
    expect(atThreshold.dominant).toBe('tutorial');

    const aboveThreshold = computeDifficultyProfile(
      makeRequirements({ hardFloor: 1.0, comfortable: 3.0 }),
      terrainOptions,
      [],
      makeBody(20, null),
      SHIP_REFERENCE,
    );
    // mechanical = 2 (see computeMechanicalAxis's own deficit test above for
    // the arithmetic) -- strictly above TUTORIAL_MAX_AXIS(1), so this must
    // NOT read tutorial; it must fall through to the dominant-axis branch.
    expect(aboveThreshold.axes.mechanical).toBe(2);
    expect(aboveThreshold.dominant).toBe('mechanical');
  });

  it("classifies a base with every axis at 4 as 'capstone-balanced' (Milestone 11 makes this reachable for the first time)", () => {
    // mechanical: cold hazard + generous TWR -> 1 (base) + 0 (deficit) + 3 (cold) = 4.
    const body = makeBody(18, { type: 'cold', thrustEfficiency: 0.7 });
    const requirements = makeRequirements(GENEROUS_TWR);
    // spatial: comfortable pad (padTightness 0) + roughness at its reference
    // (3) + one obstacle (obstacleDensity 1/3 * 3 = 1) = 4.
    const terrainOptions = makeTerrainOptions(8, 0.08, 1);
    // combat: armorRating at the armor reference (25) alone -> 4 (see
    // computeCombatAxis's own "scores the full armor component" test above).
    const encounters = [makeEncounter(makeCombatant({ armorRating: 25 }))];

    const profile = computeDifficultyProfile(
      requirements,
      terrainOptions,
      encounters,
      body,
      SHIP_REFERENCE,
    );
    expect(profile.axes).toEqual({ mechanical: 4, spatial: 4, combat: 4 });
    expect(profile.dominant).toBe('capstone-balanced');
    // budget = 0.7 * (4+4+4) = 8.4.
    expect(profile.budget).toBeCloseTo(8.4);
  });
});
