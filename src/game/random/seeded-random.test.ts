import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './seeded-random';

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRandom(12345);
    const b = createSeededRandom(12345);
    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());
    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('always returns a float in [0, 1)', () => {
    const random = createSeededRandom(999);
    for (let i = 0; i < 200; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('matches known-good reference output for seed 1 (pins the exact Mulberry32 arithmetic)', () => {
    // Guards against a transposed shift amount or mixing constant silently
    // changing every downstream layout (terrain/starfield/ridgeline all
    // build on this PRNG) without any test noticing — determinism/range
    // checks alone would still pass even if the mixing itself were wrong.
    const random = createSeededRandom(1);
    const sequence = Array.from({ length: 5 }, () => random());
    expect(sequence).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
      0.9683778982143849,
    ]);
  });
});
