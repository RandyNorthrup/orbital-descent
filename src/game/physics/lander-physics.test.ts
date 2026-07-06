import { describe, expect, it } from 'vitest';
import {
  addVectors,
  applyWorldBounds,
  consumeFuel,
  degreesToRadians,
  integrate,
  integrateRotation,
  thrustVector,
  ZERO_VECTOR,
} from './lander-physics';

describe('addVectors', () => {
  it('sums components independently', () => {
    expect(addVectors({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });

  it('is the identity when adding the zero vector', () => {
    expect(addVectors({ x: 5, y: -5 }, ZERO_VECTOR)).toEqual({ x: 5, y: -5 });
  });
});

describe('degreesToRadians', () => {
  it('converts 180 degrees to pi', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });

  it('converts 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0);
  });
});

describe('thrustVector', () => {
  it('points straight up (negative y) at heading 0', () => {
    const v = thrustVector(0, 10);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(-10);
  });

  it('points right (positive x) at a quarter turn clockwise', () => {
    const v = thrustVector(Math.PI / 2, 10);
    expect(v.x).toBeCloseTo(10);
    expect(v.y).toBeCloseTo(0);
  });

  it('scales linearly with thrust magnitude', () => {
    const half = thrustVector(0, 5);
    const full = thrustVector(0, 10);
    expect(full.y).toBeCloseTo(half.y * 2);
  });
});

describe('integrate', () => {
  it('applies rate of change over the elapsed time', () => {
    const next = integrate({ x: 0, y: 0 }, { x: 10, y: -20 }, 0.5);
    expect(next).toEqual({ x: 5, y: -10 });
  });

  it('is a no-op over zero elapsed time', () => {
    const start = { x: 3, y: 7 };
    expect(integrate(start, { x: 100, y: 100 }, 0)).toEqual(start);
  });
});

describe('integrateRotation', () => {
  it('rotates clockwise for positive input', () => {
    expect(integrateRotation(0, 1, Math.PI, 1)).toBeCloseTo(Math.PI);
  });

  it('rotates counter-clockwise for negative input', () => {
    expect(integrateRotation(0, -1, Math.PI, 1)).toBeCloseTo(-Math.PI);
  });

  it('holds steady when there is no rotation input', () => {
    expect(integrateRotation(1.23, 0, Math.PI, 1)).toBeCloseTo(1.23);
  });
});

describe('consumeFuel', () => {
  it('depletes proportionally to burn rate and elapsed time', () => {
    expect(consumeFuel(100, 10, 2)).toBe(80);
  });

  it('never goes negative', () => {
    expect(consumeFuel(5, 10, 2)).toBe(0);
  });
});

describe('applyWorldBounds', () => {
  const bounds = { width: 100, height: 100, floorMargin: 10 };

  it('leaves position and velocity untouched mid-flight', () => {
    const result = applyWorldBounds({ x: 50, y: 50 }, { x: 1, y: 2 }, bounds);
    expect(result).toEqual({ position: { x: 50, y: 50 }, velocity: { x: 1, y: 2 } });
  });

  it('wraps horizontally past the right edge', () => {
    const result = applyWorldBounds({ x: 110, y: 50 }, { x: 1, y: 0 }, bounds);
    expect(result.position.x).toBeCloseTo(10);
  });

  it('wraps horizontally past the left edge', () => {
    const result = applyWorldBounds({ x: -10, y: 50 }, { x: -1, y: 0 }, bounds);
    expect(result.position.x).toBeCloseTo(90);
  });

  it('stops descent at the floor and zeroes downward velocity', () => {
    const result = applyWorldBounds({ x: 50, y: 95 }, { x: 0, y: 20 }, bounds);
    expect(result.position.y).toBe(90);
    expect(result.velocity.y).toBe(0);
  });

  it('does not clamp upward velocity at the floor', () => {
    const result = applyWorldBounds({ x: 50, y: 95 }, { x: 0, y: -5 }, bounds);
    expect(result.velocity.y).toBe(-5);
  });
});
