import { describe, expect, it } from 'vitest';
import {
  computeDifficultyProfile,
  computeMechanicalAxis,
  computeSpatialAxis,
  type DifficultyShipReference,
} from './difficulty';
import type { BaseRequirements, TWRBand } from './base';
import type { CelestialBody, Hazard } from '../planets/celestial-body';
import type { GenerateTerrainOptions } from '../terrain/terrain-generator';

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
    gravityAccel,
    atmosphereDensity: 0,
    hazard,
    terrainPalette: { fillTopColor: 0x000000, fillBottomColor: 0xffffff, etchStyle: 'rock' },
    distance: 0,
  };
}

/** Only `padSegmentCount`/`maxStepFraction` are exercised by this module —
 * the rest of `GenerateTerrainOptions` is filled with arbitrary-but-valid
 * placeholder values. */
function makeTerrainOptions(
  padSegmentCount: number,
  maxStepFraction: number,
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
  };
}

const SHIP_REFERENCE: DifficultyShipReference = { thrustAccel: 46 };

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
});

describe('computeDifficultyProfile', () => {
  it('classifies a low-every-axis base as tutorial with the correctly-computed budget', () => {
    const body = makeBody(18, null);
    const requirements = makeRequirements(GENEROUS_TWR);
    const terrainOptions = makeTerrainOptions(8, 0);
    // mechanical = 1, spatial = 0, combat = 0 (always).
    // highest = 1 <= TUTORIAL_MAX_AXIS(1) -> 'tutorial'.
    // budget uses mechanical as the dominant score: 1.0*1 + 0.4*(0+0) = 1.
    const profile = computeDifficultyProfile(requirements, terrainOptions, body, SHIP_REFERENCE);
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
    const profile = computeDifficultyProfile(requirements, terrainOptions, body, SHIP_REFERENCE);
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
    const profile = computeDifficultyProfile(requirements, terrainOptions, body, SHIP_REFERENCE);
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
    const profile = computeDifficultyProfile(requirements, terrainOptions, body, SHIP_REFERENCE);
    expect(profile).toEqual({
      axes: { mechanical: 5, spatial: 5, combat: 0 },
      dominant: 'mechanical',
      budget: 7,
    });
  });

  it('classifies exactly-at-threshold as tutorial and just-above as dominant-axis, proving the branches are mutually exclusive and correctly ordered', () => {
    const terrainOptions = makeTerrainOptions(8, 0); // spatial = 0 throughout this test

    const atThreshold = computeDifficultyProfile(
      makeRequirements(GENEROUS_TWR),
      terrainOptions,
      makeBody(18, null),
      SHIP_REFERENCE,
    );
    // mechanical = 1 = TUTORIAL_MAX_AXIS exactly -> the inclusive `<=` boundary must still read tutorial.
    expect(atThreshold.axes.mechanical).toBe(1);
    expect(atThreshold.dominant).toBe('tutorial');

    const aboveThreshold = computeDifficultyProfile(
      makeRequirements({ hardFloor: 1.0, comfortable: 3.0 }),
      terrainOptions,
      makeBody(20, null),
      SHIP_REFERENCE,
    );
    // mechanical = 2 (see computeMechanicalAxis's own deficit test above for
    // the arithmetic) -- strictly above TUTORIAL_MAX_AXIS(1), so this must
    // NOT read tutorial; it must fall through to the dominant-axis branch.
    expect(aboveThreshold.axes.mechanical).toBe(2);
    expect(aboveThreshold.dominant).toBe('mechanical');

    // A true 'capstone-balanced' classification (every axis >=
    // CAPSTONE_MIN_AXIS with a spread <= CAPSTONE_MAX_SPREAD) is NOT
    // reachable through computeDifficultyProfile's public inputs today:
    // `combat` is unconditionally 0 inside the function (Milestone 11 has
    // not landed), so `lowest` is always <= 0 -- below CAPSTONE_MIN_AXIS(4)
    // -- and the capstone branch's condition can never be satisfied until
    // Milestone 11 gives combat a real nonzero value. The two assertions
    // above still prove the tutorial check and the dominant-axis fallback
    // are mutually exclusive and evaluated in the right order (tutorial
    // checked, and wins, before the dominant-axis fallback is ever reached;
    // the capstone check sits between the two in source order and is
    // implemented completely, just unreachable given today's always-zero
    // combat axis).
  });
});
