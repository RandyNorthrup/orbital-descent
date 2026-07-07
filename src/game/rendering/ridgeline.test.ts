import { describe, expect, it } from 'vitest';
import { generateRidgeline, type GenerateRidgelineOptions } from './ridgeline';

const BASE_OPTIONS: GenerateRidgelineOptions = {
  seed: 71,
  width: 960,
  height: 640,
  segments: 12,
  minHeightFraction: 0.28,
  maxHeightFraction: 0.4,
  maxStepFraction: 0.03,
};

describe('generateRidgeline', () => {
  it('is deterministic given the same seed', () => {
    expect(generateRidgeline(BASE_OPTIONS)).toEqual(generateRidgeline(BASE_OPTIONS));
  });

  it('produces a different profile for a different seed', () => {
    const a = generateRidgeline(BASE_OPTIONS);
    const b = generateRidgeline({ ...BASE_OPTIONS, seed: 72 });
    expect(a).not.toEqual(b);
  });

  it('generates segments + 1 points spanning exactly the requested width', () => {
    const ridge = generateRidgeline(BASE_OPTIONS);
    expect(ridge).toHaveLength(BASE_OPTIONS.segments + 1);
    expect(ridge[0]?.x).toBe(0);
    expect(ridge[ridge.length - 1]?.x).toBe(BASE_OPTIONS.width);
  });

  it('keeps every point within the configured height band', () => {
    const ridge = generateRidgeline(BASE_OPTIONS);
    const minHeight = BASE_OPTIONS.height * BASE_OPTIONS.minHeightFraction;
    const maxHeight = BASE_OPTIONS.height * BASE_OPTIONS.maxHeightFraction;
    for (const point of ridge) {
      expect(point.y).toBeGreaterThanOrEqual(minHeight - Number.EPSILON);
      expect(point.y).toBeLessThanOrEqual(maxHeight + Number.EPSILON);
    }
  });

  it('never changes height between adjacent points by more than the max step', () => {
    const ridge = generateRidgeline(BASE_OPTIONS);
    const maxStep = BASE_OPTIONS.height * BASE_OPTIONS.maxStepFraction;
    for (let i = 1; i < ridge.length; i += 1) {
      const previous = ridge[i - 1];
      const current = ridge[i];
      if (!previous || !current) {
        continue;
      }
      expect(Math.abs(current.y - previous.y)).toBeLessThanOrEqual(maxStep + Number.EPSILON);
    }
  });
});
