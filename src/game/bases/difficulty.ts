import type { BaseDifficultyProfile, BaseRequirements } from './base';
import type { CelestialBody } from '../planets/celestial-body';
import type { GenerateTerrainOptions } from '../terrain/terrain-generator';

/**
 * The one ship-intrinsic number this module needs (the bare thrust
 * acceleration used to compute a base's mechanical TWR-deficit term) —
 * passed in explicitly rather than imported from `../constants`, matching
 * this project's established "pure logic module takes every tunable as an
 * explicit parameter, never reaches into `constants.ts` for a balance dial
 * itself" pattern (see `terrain-generator.ts`'s `GenerateTerrainOptions`).
 * Milestone 7's real `ShipClass` roster supplies this at the real call
 * site; this module doesn't need (and must not import) the rest of that
 * type.
 */
export interface DifficultyShipReference {
  readonly thrustAccel: number;
}

// Every base's inherent "gravity exists at all" baseline mechanical
// difficulty — present even for the most trivial tutorial base (§6b.2's
// worked "Aerthos Flats" example: mechanical === 1 with a comfortable TWR
// and no hazard).
const MECHANICAL_BASE_SCORE = 1;

// Max additional mechanical points awarded when a base's own authored
// `requirements.minTWR` bands are so tight relative to the target body's
// gravity that even a bare ship's thrust-to-weight ratio falls toward/below
// the `hardFloor`. Scales linearly via `computeMechanicalAxis`'s `deficit`
// term.
const MECHANICAL_TWR_DEFICIT_MAX_SCORE = 4;

// Flat mechanical-axis bumps for a corrosive/cold hazard respectively —
// corrosive independently drains fuel regardless of piloting skill, cold
// weakens all thrust output; both are objectively mechanical-axis
// difficulty per this project's own archetype taxonomy (PLAN.md §6b.1's
// "Corrosive drain puzzle" / "Cold penalty puzzle" rows).
const MECHANICAL_CORROSIVE_HAZARD_SCORE = 4;
const MECHANICAL_COLD_HAZARD_SCORE = 3;

// The narrowest and most generous landing-pad segment counts this game
// authors. A pad at/below TIGHT scores the maximum spatial contribution
// from pad width alone; a pad at/above COMFORTABLE scores zero from pad
// width.
const PAD_SEGMENTS_TIGHT = 2;
const PAD_SEGMENTS_COMFORTABLE = 8;

// The two components summing to the spatial axis (max 10 combined).
const SPATIAL_PAD_MAX_SCORE = 7;
const SPATIAL_ROUGHNESS_MAX_SCORE = 3;

// A `maxStepFraction` at/above this is this game's roughest authored
// terrain (full roughness contribution); scales linearly below it.
const SPATIAL_ROUGHNESS_REFERENCE = 0.08;

// Every axis at/below this value classifies the base as `dominant:
// 'tutorial'` rather than naming a specific axis.
const TUTORIAL_MAX_AXIS = 1;

// A base classifies as `dominant: 'capstone-balanced'` only when every axis
// is at least CAPSTONE_MIN_AXIS AND the spread between the highest and
// lowest axis is at most CAPSTONE_MAX_SPREAD (checked only once the
// tutorial case doesn't already apply).
const CAPSTONE_MIN_AXIS = 4;
const CAPSTONE_MAX_SPREAD = 2;

// `BaseDifficultyProfile.budget`'s own doc comment (base.ts): non-capstone
// budget = DOMINANT_AXIS_BUDGET_COEFFICIENT * dominantAxisScore +
// OTHER_AXES_BUDGET_COEFFICIENT * (sum of the other two axes); capstone
// budget = CAPSTONE_BUDGET_COEFFICIENT * (sum of all three axes).
const DOMINANT_AXIS_BUDGET_COEFFICIENT = 1.0;
const OTHER_AXES_BUDGET_COEFFICIENT = 0.4;
const CAPSTONE_BUDGET_COEFFICIENT = 0.7;

// Each axis is independently 0-10 (`BaseDifficultyProfile.axes`'s own doc
// comment) — the upper clamp bound `clampAxis` enforces.
const AXIS_SCORE_MAX = 10;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Rounds to the nearest integer *first*, then clamps to [0, 10] — in that
 * order, so a computed value like 10.4 clamps to 10 rather than rounding to
 * 10 and only then happening to already be in range. */
function clampAxis(value: number): number {
  return Math.min(AXIS_SCORE_MAX, Math.max(0, Math.round(value)));
}

/**
 * A base's mechanical-axis score (0-10): the inherent "gravity exists"
 * baseline, plus how close the target body's gravity pushes a bare ship's
 * thrust-to-weight ratio toward this base's own authored `minTWR.hardFloor`,
 * plus a flat bump for a corrosive/cold hazard on the target body.
 */
export function computeMechanicalAxis(
  requirements: BaseRequirements,
  body: CelestialBody,
  shipReference: DifficultyShipReference,
): number {
  const bareTWR = shipReference.thrustAccel / body.gravityAccel;
  const deficit = clamp01(
    (requirements.minTWR.comfortable - bareTWR) /
      (requirements.minTWR.comfortable - requirements.minTWR.hardFloor),
  );

  const hazard = body.hazard;
  const hazardScore =
    hazard === null
      ? 0
      : hazard.type === 'corrosive'
        ? MECHANICAL_CORROSIVE_HAZARD_SCORE
        : MECHANICAL_COLD_HAZARD_SCORE;

  return clampAxis(
    MECHANICAL_BASE_SCORE + deficit * MECHANICAL_TWR_DEFICIT_MAX_SCORE + hazardScore,
  );
}

/**
 * A base's spatial-axis score (0-10): how tight the authored landing pad is
 * relative to this game's tightest/most generous authored pads, plus how
 * rough the authored terrain's bounded-random-walk step is relative to this
 * game's roughest authored terrain.
 */
export function computeSpatialAxis(terrainOptions: GenerateTerrainOptions): number {
  const padTightness = clamp01(
    (PAD_SEGMENTS_COMFORTABLE - terrainOptions.padSegmentCount) /
      (PAD_SEGMENTS_COMFORTABLE - PAD_SEGMENTS_TIGHT),
  );
  const roughness = clamp01(terrainOptions.maxStepFraction / SPATIAL_ROUGHNESS_REFERENCE);

  return clampAxis(padTightness * SPATIAL_PAD_MAX_SCORE + roughness * SPATIAL_ROUGHNESS_MAX_SCORE);
}

/** The dominant-axis score used in the budget formula, per `base.ts`'s own
 * doc comment: for `dominant === 'tutorial'` this is the `mechanical` axis
 * specifically (every tutorial base's one nonzero axis is mechanical by
 * construction), which is also why this reduces to plain `mechanical` for
 * `dominant === 'mechanical'` too. */
function dominantAxisScore(
  axes: { readonly mechanical: number; readonly spatial: number; readonly combat: number },
  dominant: BaseDifficultyProfile['dominant'],
): number {
  if (dominant === 'spatial') {
    return axes.spatial;
  }
  if (dominant === 'combat') {
    return axes.combat;
  }
  return axes.mechanical;
}

function computeBudget(
  axes: { readonly mechanical: number; readonly spatial: number; readonly combat: number },
  dominant: BaseDifficultyProfile['dominant'],
): number {
  const total = axes.mechanical + axes.spatial + axes.combat;
  if (dominant === 'capstone-balanced') {
    return CAPSTONE_BUDGET_COEFFICIENT * total;
  }

  const dominantScore = dominantAxisScore(axes, dominant);
  const otherAxesSum = total - dominantScore;
  return (
    DOMINANT_AXIS_BUDGET_COEFFICIENT * dominantScore + OTHER_AXES_BUDGET_COEFFICIENT * otherAxesSum
  );
}

/**
 * Computes a base's full `BaseDifficultyProfile` from its own authored
 * `requirements`/`terrainOptions` plus the target body's own authored
 * hazard/gravity — never a hardcoded, independent number (this milestone's
 * own acceptance criterion).
 */
export function computeDifficultyProfile(
  requirements: BaseRequirements,
  terrainOptions: GenerateTerrainOptions,
  body: CelestialBody,
  shipReference: DifficultyShipReference,
): BaseDifficultyProfile {
  const mechanical = computeMechanicalAxis(requirements, body, shipReference);
  const spatial = computeSpatialAxis(terrainOptions);
  // Unconditionally 0: a base's `encounters` array is always empty until
  // Milestone 11 populates real combatant/encounter data (base.ts's own
  // "empty until Milestone 11" convention; PLAN.md §6b.3's amendment
  // explicitly assigns "populates Base.difficulty.axes.combat" to
  // Milestone 11, not Milestone 6). This function deliberately doesn't even
  // take `encounters` as a parameter — there is nothing meaningful to
  // compute from an array that's always empty today.
  const combat = 0;
  const axes = { mechanical, spatial, combat };

  const highest = Math.max(mechanical, spatial, combat);
  const lowest = Math.min(mechanical, spatial, combat);

  let dominant: BaseDifficultyProfile['dominant'];
  if (highest <= TUTORIAL_MAX_AXIS) {
    dominant = 'tutorial';
  } else if (lowest >= CAPSTONE_MIN_AXIS && highest - lowest <= CAPSTONE_MAX_SPREAD) {
    dominant = 'capstone-balanced';
  } else if (mechanical >= spatial && mechanical >= combat) {
    dominant = 'mechanical';
  } else if (spatial >= combat) {
    dominant = 'spatial';
  } else {
    dominant = 'combat';
  }

  return { axes, dominant, budget: computeBudget(axes, dominant) };
}
