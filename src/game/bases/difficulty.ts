import type { BaseDifficultyProfile, BaseRequirements, EncounterSpec } from './base';
import type { CelestialBody } from '../planets/celestial-body';
import type { GenerateTerrainOptions } from '../terrain/terrain-generator';

/**
 * The reference numbers this module needs but must not import from
 * `constants.ts` directly — passed in explicitly instead, matching this
 * project's established "pure logic module takes every tunable as an
 * explicit parameter, never reaches into `constants.ts` for a balance dial
 * itself" pattern (see `terrain-generator.ts`'s `GenerateTerrainOptions`).
 * `thrustAccel` is genuinely ship-intrinsic (Milestone 7's `ShipClass`
 * roster supplies it at the real call site; this module doesn't need, and
 * must not import, the rest of that type). `hullPoints` (Milestone 11) is
 * actually a flat, ship-independent constant (`constants.ts`'s
 * `SHIP_BASE_HULL_POINTS`) threaded through this same parameter object
 * rather than imported directly, for the same reason.
 */
export interface DifficultyShipReference {
  readonly thrustAccel: number;
  readonly hullPoints: number;
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

// The three components contributing to the spatial axis. Pad tightness and
// roughness alone already sum to 10 (unchanged since before Milestone 10,
// preserving every base authored before obstacles existed); obstacles are
// a genuinely additive, independent difficulty source on top of that, not
// a fourth slice carved out of the existing 10-point budget -- `clampAxis`
// caps the combined total at 10 for a base with both a tight pad and a
// dense obstacle layout, same as `computeMechanicalAxis`'s own independent
// terms can already exceed 10 pre-clamp.
const SPATIAL_PAD_MAX_SCORE = 7;
const SPATIAL_ROUGHNESS_MAX_SCORE = 3;
const SPATIAL_OBSTACLE_MAX_SCORE = 3;

// A `maxStepFraction` at/above this is this game's roughest authored
// terrain (full roughness contribution); scales linearly below it.
const SPATIAL_ROUGHNESS_REFERENCE = 0.08;

// An obstacle count at/above this is treated as this game's densest
// authored layout (full obstacle contribution); scales linearly below it,
// same shape as SPATIAL_ROUGHNESS_REFERENCE above. Milestone 10's own
// curated bases author at most 2.
const SPATIAL_OBSTACLE_COUNT_REFERENCE = 3;

// The two components contributing to the combat axis (Milestone 11): how
// much of the player's baseline hull an encounter could threaten within
// its own clearWindowMs, worst case, and how far the toughest combatant's
// armorRating pushes past this game's own current armor ceiling -- the
// same additive, independently-clamped-at-the-end shape as the mechanical/
// spatial axes above.
const COMBAT_THREAT_MAX_SCORE = 6;
const COMBAT_ARMOR_MAX_SCORE = 4;

// A worst-case encounter threat at/above this multiple of the player's
// baseline hull (DifficultyShipReference.hullPoints) scores the maximum
// threat contribution; scales linearly below it. >1 (rather than exactly
// 1) deliberately leaves room to differentiate encounters that could kill
// the player several times over from ones that merely could kill once.
const COMBAT_THREAT_HULL_MULTIPLE = 3;

// An armorRating at/above this value scores the maximum armor
// contribution; scales linearly below it, same shape as
// SPATIAL_OBSTACLE_COUNT_REFERENCE above. Milestone 11's own toughest
// authored combatant (Glacian Warden, armorRating 20) sits comfortably
// below this, leaving headroom for a future, tougher encounter.
const COMBAT_ARMOR_REFERENCE = 25;

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
 * relative to this game's tightest/most generous authored pads, how rough
 * the authored terrain's bounded-random-walk step is relative to this
 * game's roughest authored terrain, and (Milestone 10) how many static
 * obstacles the base's own `terrainOptions.obstacles` authors relative to
 * this game's densest authored layout — a base with none (every base
 * authored before Milestone 10, and any Milestone 10+ base that simply
 * doesn't opt in) contributes exactly 0 from this term, unchanged from
 * before this milestone.
 */
export function computeSpatialAxis(terrainOptions: GenerateTerrainOptions): number {
  const padTightness = clamp01(
    (PAD_SEGMENTS_COMFORTABLE - terrainOptions.padSegmentCount) /
      (PAD_SEGMENTS_COMFORTABLE - PAD_SEGMENTS_TIGHT),
  );
  const roughness = clamp01(terrainOptions.maxStepFraction / SPATIAL_ROUGHNESS_REFERENCE);
  const obstacleDensity = clamp01(
    (terrainOptions.obstacles?.length ?? 0) / SPATIAL_OBSTACLE_COUNT_REFERENCE,
  );

  return clampAxis(
    padTightness * SPATIAL_PAD_MAX_SCORE +
      roughness * SPATIAL_ROUGHNESS_MAX_SCORE +
      obstacleDensity * SPATIAL_OBSTACLE_MAX_SCORE,
  );
}

/** Every hit `combatant.contactDamage`/`attack` could land against a
 * target it never leaves alive for less than `clearWindowMs`, worst case —
 * a one-shot contact hit (if any) plus as many ranged `attack` hits as its
 * own `cooldownMs` allows inside the full window. `+ 1` on the ranged-hit
 * count for the same reason `combat/encounter.ts`'s `applyRangedAttacks`
 * doc comment gives: a freshly spawned combatant's `attackCooldownRemainingMs`
 * starts at 0 ("ready to fire immediately," `combatant.ts`'s own doc
 * comment), and this game's real spawn geometry keeps it well within its
 * own `attack.range` at that moment — so the first hit lands at t=0, not
 * after a full `cooldownMs`, and a bare `Math.floor` division would
 * undercount this worst-case estimate by exactly one hit. */
function worstCaseThreat(encounter: EncounterSpec): number {
  return encounter.combatants.reduce((total, group) => {
    const { definition } = group;
    const rangedHits =
      definition.attack === null
        ? 0
        : Math.floor(encounter.clearWindowMs / definition.attack.cooldownMs) + 1;
    const rangedDamage =
      definition.attack === null ? 0 : rangedHits * definition.attack.damagePerHit;
    return total + group.count * (definition.contactDamage + rangedDamage);
  }, 0);
}

/**
 * A base's combat-axis score (0-10, Milestone 11): the worst-case damage
 * its toughest single `EncounterSpec` could inflict on an unshielded ship
 * within that encounter's own `clearWindowMs`, relative to this project's
 * flat combat hull pool (`shipReference.hullPoints`), plus how far the
 * toughest combatant's `armorRating` pushes past this game's own current
 * armor ceiling — the same "Bruiser hard-fail" archetype
 * `terrain/obstacles.ts`'s own `armorRating` already models for a static
 * obstacle. A base with `encounters: []` (every base before Milestone 11,
 * and any Milestone 11+ base that doesn't opt in) contributes exactly 0,
 * unchanged from before this milestone.
 */
export function computeCombatAxis(
  encounters: readonly EncounterSpec[],
  shipReference: DifficultyShipReference,
): number {
  if (encounters.length === 0) {
    return 0;
  }

  const worstThreat = Math.max(...encounters.map(worstCaseThreat));
  const toughestArmor = Math.max(
    ...encounters.flatMap((encounter) =>
      encounter.combatants.map((group) => group.definition.armorRating),
    ),
  );

  const threatScore = clamp01(
    worstThreat / (COMBAT_THREAT_HULL_MULTIPLE * shipReference.hullPoints),
  );
  const armorScore = clamp01(toughestArmor / COMBAT_ARMOR_REFERENCE);

  return clampAxis(threatScore * COMBAT_THREAT_MAX_SCORE + armorScore * COMBAT_ARMOR_MAX_SCORE);
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
 * `requirements`/`terrainOptions`/`encounters` plus the target body's own
 * authored hazard/gravity — never a hardcoded, independent number (this
 * project's own acceptance criterion since Milestone 6).
 */
export function computeDifficultyProfile(
  requirements: BaseRequirements,
  terrainOptions: GenerateTerrainOptions,
  encounters: readonly EncounterSpec[],
  body: CelestialBody,
  shipReference: DifficultyShipReference,
): BaseDifficultyProfile {
  const mechanical = computeMechanicalAxis(requirements, body, shipReference);
  const spatial = computeSpatialAxis(terrainOptions);
  const combat = computeCombatAxis(encounters, shipReference);
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
