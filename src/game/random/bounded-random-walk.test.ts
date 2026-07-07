import { describe, expect, it } from 'vitest';
import { boundedRandomWalk } from './bounded-random-walk';
import { createSeededRandom } from './seeded-random';

describe('boundedRandomWalk', () => {
  const min = 100;
  const max = 200;
  const maxStep = 10;
  const steps = 50;

  it('returns steps + 1 values', () => {
    const walk = boundedRandomWalk(createSeededRandom(1), steps, min, max, maxStep);
    expect(walk).toHaveLength(steps + 1);
  });

  it('keeps every value within [min, max]', () => {
    const walk = boundedRandomWalk(createSeededRandom(7), steps, min, max, maxStep);
    for (const value of walk) {
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it('never changes by more than maxStep between adjacent values', () => {
    const walk = boundedRandomWalk(createSeededRandom(7), steps, min, max, maxStep);
    for (let i = 1; i < walk.length; i += 1) {
      const previous = walk[i - 1];
      const current = walk[i];
      if (previous === undefined || current === undefined) {
        continue;
      }
      expect(Math.abs(current - previous)).toBeLessThanOrEqual(maxStep + Number.EPSILON);
    }
  });

  it('is deterministic for the same random-function seed', () => {
    const a = boundedRandomWalk(createSeededRandom(42), steps, min, max, maxStep);
    const b = boundedRandomWalk(createSeededRandom(42), steps, min, max, maxStep);
    expect(a).toEqual(b);
  });

  it('actually walks in both directions, not just up (or just down) to a clamp', () => {
    // "Bounded random WALK" means the value can rise and fall — a
    // regression that made every step monotonic (e.g. dropping the `* 2 - 1`
    // sign flip) would still satisfy every other test above (still in
    // bounds, still within maxStep), since a one-directional climb to the
    // ceiling is technically both.
    const walk = boundedRandomWalk(createSeededRandom(3), steps, min, max, maxStep);
    let sawIncrease = false;
    let sawDecrease = false;
    for (let i = 1; i < walk.length; i += 1) {
      const previous = walk[i - 1];
      const current = walk[i];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (current > previous) {
        sawIncrease = true;
      }
      if (current < previous) {
        sawDecrease = true;
      }
    }
    expect(sawIncrease).toBe(true);
    expect(sawDecrease).toBe(true);
  });
});
