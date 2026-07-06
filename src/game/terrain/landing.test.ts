import { describe, expect, it } from 'vitest';
import { isOnLandingPad, isSafeLanding } from './landing';
import type { LandingPad } from './terrain-generator';

const PAD: LandingPad = { xStart: 100, xEnd: 150, y: 500 };
const THRESHOLDS = { maxSafeSpeed: 60, maxSafeAngleRadians: Math.PI / 12 };

describe('isOnLandingPad', () => {
  it('is true strictly inside the pad', () => {
    expect(isOnLandingPad(125, PAD)).toBe(true);
  });

  it('is true exactly on either boundary (inclusive)', () => {
    expect(isOnLandingPad(100, PAD)).toBe(true);
    expect(isOnLandingPad(150, PAD)).toBe(true);
  });

  it('is false outside the pad', () => {
    expect(isOnLandingPad(99, PAD)).toBe(false);
    expect(isOnLandingPad(151, PAD)).toBe(false);
  });
});

describe('isSafeLanding', () => {
  const gentle = { velocity: { x: 0, y: 30 }, rotationRadians: 0 };

  it('is safe when slow, upright, and on the pad', () => {
    expect(isSafeLanding(gentle, true, THRESHOLDS)).toBe(true);
  });

  it('is unsafe off the pad even when slow and upright', () => {
    expect(isSafeLanding(gentle, false, THRESHOLDS)).toBe(false);
  });

  it('is unsafe when too fast, even on the pad and upright', () => {
    const fast = { velocity: { x: 0, y: 200 }, rotationRadians: 0 };
    expect(isSafeLanding(fast, true, THRESHOLDS)).toBe(false);
  });

  it('is unsafe when too tilted, even on the pad and slow', () => {
    const tilted = { velocity: { x: 0, y: 30 }, rotationRadians: Math.PI / 2 };
    expect(isSafeLanding(tilted, true, THRESHOLDS)).toBe(false);
  });

  it('measures speed as the velocity vector magnitude, not a single axis', () => {
    // 40-30-50 right triangle: neither axis alone exceeds maxSafeSpeed (60),
    // but the combined magnitude (50) is still within it, so this is safe —
    // and a version that checked axes independently would agree here, so
    // also check a case where only the combined magnitude fails.
    const combined = { velocity: { x: 40, y: 30 }, rotationRadians: 0 };
    expect(isSafeLanding(combined, true, THRESHOLDS)).toBe(true);

    const combinedTooFast = { velocity: { x: 45, y: 45 }, rotationRadians: 0 };
    expect(isSafeLanding(combinedTooFast, true, THRESHOLDS)).toBe(false);
  });

  it('treats rotation just past a full turn the same as the equivalent small angle', () => {
    const spun = { velocity: { x: 0, y: 30 }, rotationRadians: Math.PI * 2 + 0.01 };
    expect(isSafeLanding(spun, true, THRESHOLDS)).toBe(true);
  });
});
