export interface ScoreInputs {
  /** The FlightSnapshot.fuel value at the moment of touchdown, 0..maxFuel. */
  readonly fuelRemaining: number;
  /** Real flight duration from spawn to touchdown, in ms. */
  readonly elapsedMs: number;
  /** Lander x position at the moment of ground contact. */
  readonly touchdownX: number;
  /** (landingPad.xStart + landingPad.xEnd) / 2. */
  readonly padCenterX: number;
  /**
   * (landingPad.xEnd - landingPad.xStart) / 2 -- always > 0 given the
   * current terrain generator's pad-flattening (padSegmentCount >= 2), so
   * this never divides by zero.
   */
  readonly padHalfWidth: number;
}

export interface ScoreWeights {
  /** Matches the flying ship's own `fuelCapacity` (`ships/ship.ts`,
   * Milestone 7) -- needed here only to normalize fuelRemaining into a
   * 0..1 fraction. */
  readonly maxFuel: number;
  /** Flat points for any confirmed safe landing, regardless of the other
   * three factors. */
  readonly baseLandingBonus: number;
  /** Max additional points at fuelRemaining == maxFuel, scales linearly to
   * 0 at fuelRemaining == 0. */
  readonly maxFuelBonus: number;
  /** Max additional points for touching down exactly at padCenterX, scales
   * linearly to 0 at the pad edge. */
  readonly maxPrecisionBonus: number;
  /** Max additional points for landing at or before timeParMs after spawn,
   * scales linearly to 0 by timeParMs and never negative beyond it. */
  readonly maxTimeBonus: number;
  /** The "par" flight duration for the full time bonus. */
  readonly timeParMs: number;
}

/** Clamps to [0, 1]. Defensive insurance against floating-point edge cases
 * and out-of-range inputs (e.g. a landing far slower than timeParMs) --
 * cheap enough to apply uniformly to every fraction below rather than
 * reasoning per-case about which ones can actually go out of range. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Scores a confirmed safe landing.
 *
 * This is only ever called by its one real caller (GameScene) after
 * `isSafeLanding()` has already returned true -- it is never invoked for a
 * crash, so there is deliberately no "outcome" field and no crash branch
 * here. A crash's scoring (if any) is a separate concern.
 */
export function calculateScore(inputs: ScoreInputs, weights: ScoreWeights): number {
  const fuelFraction = clamp01(inputs.fuelRemaining / weights.maxFuel);
  const timeFraction = clamp01(1 - inputs.elapsedMs / weights.timeParMs);
  const precisionFraction = clamp01(
    1 - Math.abs(inputs.touchdownX - inputs.padCenterX) / inputs.padHalfWidth,
  );

  const rawScore =
    weights.baseLandingBonus +
    fuelFraction * weights.maxFuelBonus +
    timeFraction * weights.maxTimeBonus +
    precisionFraction * weights.maxPrecisionBonus;

  return Math.round(rawScore);
}
