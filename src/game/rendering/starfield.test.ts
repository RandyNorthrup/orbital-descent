import { describe, expect, it } from 'vitest';
import { generateStarfield, type GenerateStarfieldOptions } from './starfield';

const BASE_OPTIONS: GenerateStarfieldOptions = {
  seed: 42,
  width: 960,
  height: 640,
  count: 50,
  maxRadius: 1.4,
  maxAlpha: 0.9,
  sparkleFraction: 0.15,
  sparkleRadiusMultiplier: 2.5,
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

  it('keeps every star within the configured bounds (sparkles allowed up to the multiplied radius)', () => {
    const stars = generateStarfield(BASE_OPTIONS);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(BASE_OPTIONS.width);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(BASE_OPTIONS.height);
      expect(star.radius).toBeGreaterThanOrEqual(0);
      expect(star.radius).toBeLessThanOrEqual(
        star.sparkle
          ? BASE_OPTIONS.maxRadius * BASE_OPTIONS.sparkleRadiusMultiplier
          : BASE_OPTIONS.maxRadius,
      );
      expect(star.alpha).toBeGreaterThanOrEqual(0);
      expect(star.alpha).toBeLessThanOrEqual(BASE_OPTIONS.maxAlpha);
    }
  });

  it('produces a mix of sparkles and dots at a nonzero sparkle fraction', () => {
    const stars = generateStarfield({ ...BASE_OPTIONS, count: 200 });
    const sparkles = stars.filter((star) => star.sparkle).length;
    expect(sparkles).toBeGreaterThan(0);
    expect(sparkles).toBeLessThan(stars.length);
  });

  it('produces no sparkles at fraction 0 and only sparkles at fraction 1', () => {
    const none = generateStarfield({ ...BASE_OPTIONS, sparkleFraction: 0 });
    const all = generateStarfield({ ...BASE_OPTIONS, sparkleFraction: 1 });
    expect(none.every((star) => !star.sparkle)).toBe(true);
    expect(all.every((star) => star.sparkle)).toBe(true);
  });
});
