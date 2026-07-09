import { describe, expect, it } from 'vitest';
import { isWithinRadius } from './collision';

describe('isWithinRadius', () => {
  it('is true when two points are exactly on top of each other, for any positive radius', () => {
    expect(isWithinRadius({ x: 10, y: 10 }, { x: 10, y: 10 }, 5)).toBe(true);
  });

  it('is true when the distance is strictly less than the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 10)).toBe(true);
  });

  it('is true exactly at the radius boundary (inclusive)', () => {
    // distance = sqrt(3^2 + 4^2) = 5, radius = 5.
    expect(isWithinRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
  });

  it('is false just past the radius boundary', () => {
    expect(isWithinRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.999)).toBe(false);
  });

  it('is false when far outside the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 20)).toBe(false);
  });

  it('is symmetric regardless of argument order', () => {
    const a = { x: 12, y: -8 };
    const b = { x: -4, y: 30 };
    expect(isWithinRadius(a, b, 50)).toBe(isWithinRadius(b, a, 50));
  });

  it('is false for a zero radius unless the points coincide exactly', () => {
    expect(isWithinRadius({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 0)).toBe(false);
    expect(isWithinRadius({ x: 5, y: 5 }, { x: 5, y: 5 }, 0)).toBe(true);
  });
});
