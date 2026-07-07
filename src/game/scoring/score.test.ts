import { describe, expect, it } from 'vitest';
import { calculateScore, type ScoreInputs, type ScoreWeights } from './score';

const MAX_FUEL = 100;
const BASE_LANDING_BONUS = 100;
const MAX_FUEL_BONUS = 200;
const MAX_PRECISION_BONUS = 150;
const MAX_TIME_BONUS = 150;
const TIME_PAR_MS = 10000;

const WEIGHTS: ScoreWeights = {
  maxFuel: MAX_FUEL,
  baseLandingBonus: BASE_LANDING_BONUS,
  maxFuelBonus: MAX_FUEL_BONUS,
  maxPrecisionBonus: MAX_PRECISION_BONUS,
  maxTimeBonus: MAX_TIME_BONUS,
  timeParMs: TIME_PAR_MS,
};

const PAD_CENTER_X = 500;
const PAD_HALF_WIDTH = 50;

function inputs(overrides: Partial<ScoreInputs>): ScoreInputs {
  return {
    fuelRemaining: MAX_FUEL,
    elapsedMs: 0,
    touchdownX: PAD_CENTER_X,
    padCenterX: PAD_CENTER_X,
    padHalfWidth: PAD_HALF_WIDTH,
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('scores a perfect landing (full fuel, instant, dead-center) as the sum of every max bonus', () => {
    // 100 + 200 + 150 + 150 = 600 -- every fraction is exactly 1.
    const score = calculateScore(inputs({}), WEIGHTS);
    expect(score).toBe(BASE_LANDING_BONUS + MAX_FUEL_BONUS + MAX_TIME_BONUS + MAX_PRECISION_BONUS);
    expect(score).toBe(600);
  });

  it('scores the worst safe landing (no fuel, very late, on the pad edge) as just the base bonus', () => {
    // All three fractions clamp to 0: fuelFraction = 0/100 = 0,
    // timeFraction = 1 - 50000/10000 = -4 -> clamped to 0,
    // precisionFraction = 1 - 50/50 = 0 (touchdown exactly at the pad edge).
    const score = calculateScore(
      inputs({
        fuelRemaining: 0,
        elapsedMs: TIME_PAR_MS * 5,
        touchdownX: PAD_CENTER_X - PAD_HALF_WIDTH,
      }),
      WEIGHTS,
    );
    expect(score).toBe(BASE_LANDING_BONUS);
    expect(score).toBe(100);
  });

  it('scores touchdowns equidistant left and right of pad center identically', () => {
    const offset = 25;
    const left = calculateScore(inputs({ touchdownX: PAD_CENTER_X - offset }), WEIGHTS);
    const right = calculateScore(inputs({ touchdownX: PAD_CENTER_X + offset }), WEIGHTS);
    // precisionFraction = 1 - 25/50 = 0.5 either way:
    // 100 + 200 + 150 + 0.5 * 150 = 525.
    expect(left).toBe(right);
    expect(left).toBe(525);
  });

  it('clamps the time bonus to 0 instead of letting a very late landing go negative', () => {
    // Unclamped this would be 1 - 1_000_000/10_000 = -99, i.e. -99 * 150 of
    // "negative bonus" if the clamp were missing. With the clamp it must
    // land on exactly the same score as landing precisely at timeParMs
    // (timeFraction = 0 either way), proving the clamp -- not coincidence --
    // is what keeps this from going negative.
    const wayLate = calculateScore(inputs({ elapsedMs: TIME_PAR_MS * 100 }), WEIGHTS);
    const exactlyAtPar = calculateScore(inputs({ elapsedMs: TIME_PAR_MS }), WEIGHTS);
    expect(wayLate).toBe(exactlyAtPar);
    expect(wayLate).toBe(BASE_LANDING_BONUS + MAX_FUEL_BONUS + MAX_PRECISION_BONUS);
    expect(wayLate).toBe(450);
  });

  it('hand-computes a mid-range landing (half fuel, half time, half precision)', () => {
    // fuelFraction = 50/100 = 0.5, timeFraction = 1 - 5000/10000 = 0.5,
    // precisionFraction = 1 - 25/50 = 0.5.
    // 100 + 0.5*200 + 0.5*150 + 0.5*150 = 100 + 100 + 75 + 75 = 350.
    const score = calculateScore(
      inputs({
        fuelRemaining: 50,
        elapsedMs: 5000,
        touchdownX: PAD_CENTER_X - 25,
      }),
      WEIGHTS,
    );
    expect(score).toBe(350);
  });

  it('hand-computes a second mid-range landing at quarter fractions', () => {
    // fuelFraction = 25/100 = 0.25, timeFraction = 1 - 7500/10000 = 0.25,
    // precisionFraction = 1 - 37.5/50 = 0.25.
    // 100 + 0.25*200 + 0.25*150 + 0.25*150 = 100 + 50 + 37.5 + 37.5 = 225.
    const score = calculateScore(
      inputs({
        fuelRemaining: 25,
        elapsedMs: 7500,
        touchdownX: PAD_CENTER_X + 37.5,
      }),
      WEIGHTS,
    );
    expect(score).toBe(225);
  });

  it('rounds a fractional raw score to the nearest integer', () => {
    // Isolate rounding from the other bonuses: only maxFuelBonus is
    // nonzero, and it's small enough that half of it is a clean .5.
    // rawScore = 100 (base) + 0.5 * 1 (half fuel) = 100.5 -> rounds to 101.
    const roundingWeights: ScoreWeights = {
      ...WEIGHTS,
      maxFuelBonus: 1,
      maxPrecisionBonus: 0,
      maxTimeBonus: 0,
    };
    const score = calculateScore(inputs({ fuelRemaining: 50 }), roundingWeights);
    expect(score).toBe(101);
  });

  it('is pure: identical inputs and weights produce an identical result', () => {
    const sameInputs = inputs({ fuelRemaining: 75, elapsedMs: 2500, touchdownX: 510 });
    expect(calculateScore(sameInputs, WEIGHTS)).toBe(calculateScore(sameInputs, WEIGHTS));
  });
});
