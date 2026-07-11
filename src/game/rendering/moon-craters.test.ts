import { describe, expect, it } from 'vitest';
import { generateMoonCraters, type GenerateMoonCratersOptions } from './moon-craters';

const OPTIONS: GenerateMoonCratersOptions = {
  seed: 99,
  moonRadius: 46,
  count: 6,
  minRadiusFraction: 0.1,
  maxRadiusFraction: 0.22,
};

describe('generateMoonCraters', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a = generateMoonCraters(OPTIONS);
    const b = generateMoonCraters(OPTIONS);
    const c = generateMoonCraters({ ...OPTIONS, seed: 100 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('produces exactly count craters', () => {
    expect(generateMoonCraters(OPTIONS)).toHaveLength(OPTIONS.count);
  });

  it('keeps every crater fully inside the moon disc', () => {
    for (const crater of generateMoonCraters(OPTIONS)) {
      const centerDistance = Math.hypot(crater.x, crater.y);
      expect(centerDistance + crater.radius).toBeLessThanOrEqual(OPTIONS.moonRadius);
    }
  });

  it('keeps every crater radius within the configured fraction range', () => {
    for (const crater of generateMoonCraters(OPTIONS)) {
      expect(crater.radius).toBeGreaterThanOrEqual(OPTIONS.moonRadius * OPTIONS.minRadiusFraction);
      expect(crater.radius).toBeLessThanOrEqual(OPTIONS.moonRadius * OPTIONS.maxRadiusFraction);
    }
  });
});
