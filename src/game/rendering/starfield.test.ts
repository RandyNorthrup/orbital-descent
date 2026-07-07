import { describe, expect, it } from 'vitest';
import { generateStarfield, type GenerateStarfieldOptions } from './starfield';

const BASE_OPTIONS: GenerateStarfieldOptions = {
  seed: 42,
  width: 960,
  height: 640,
  count: 50,
  maxRadius: 1.4,
  maxAlpha: 0.9,
};

describe('generateStarfield', () => {
  it('is deterministic given the same seed', () => {
    expect(generateStarfield(BASE_OPTIONS)).toEqual(generateStarfield(BASE_OPTIONS));
  });

  it('produces a different layout for a different seed', () => {
    const a = generateStarfield(BASE_OPTIONS);
    const b = generateStarfield({ ...BASE_OPTIONS, seed: 43 });
    expect(a).not.toEqual(b);
  });

  it('produces exactly `count` stars', () => {
    expect(generateStarfield(BASE_OPTIONS)).toHaveLength(BASE_OPTIONS.count);
  });

  it('keeps every star within the configured bounds', () => {
    const stars = generateStarfield(BASE_OPTIONS);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(BASE_OPTIONS.width);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(BASE_OPTIONS.height);
      expect(star.radius).toBeGreaterThanOrEqual(0);
      expect(star.radius).toBeLessThanOrEqual(BASE_OPTIONS.maxRadius);
      expect(star.alpha).toBeGreaterThanOrEqual(0);
      expect(star.alpha).toBeLessThanOrEqual(BASE_OPTIONS.maxAlpha);
    }
  });
});
