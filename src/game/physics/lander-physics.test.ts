import { describe, expect, it } from 'vitest';
import {
  addVectors,
  atmosphericDrag,
  consumeFuel,
  degreesToRadians,
  integrate,
  integrateRotation,
  normalizeAngle,
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

describe('atmosphericDrag', () => {
  it('opposes rightward velocity with leftward drag', () => {
    const drag = atmosphericDrag({ x: 10, y: 0 }, 0.5);
    expect(drag.x).toBeLessThan(0);
    expect(drag.y).toBeCloseTo(0);
  });

  it('opposes downward velocity with upward drag', () => {
    const drag = atmosphericDrag({ x: 0, y: 10 }, 0.5);
    expect(drag.x).toBeCloseTo(0);
    expect(drag.y).toBeLessThan(0);
  });

  it('scales linearly with the drag coefficient', () => {
    const velocity = { x: 6, y: -8 };
    const single = atmosphericDrag(velocity, 0.4);
    const doubled = atmosphericDrag(velocity, 0.8);
    expect(doubled.x).toBeCloseTo(single.x * 2);
    expect(doubled.y).toBeCloseTo(single.y * 2);
  });

  it('scales linearly with speed', () => {
    const dragCoefficient = 0.3;
    const slow = atmosphericDrag({ x: 4, y: -2 }, dragCoefficient);
    const fast = atmosphericDrag({ x: 8, y: -4 }, dragCoefficient);
    expect(fast.x).toBeCloseTo(slow.x * 2);
    expect(fast.y).toBeCloseTo(slow.y * 2);
  });

  it('is exactly zero when the drag coefficient is zero, regardless of velocity', () => {
    const drag = atmosphericDrag({ x: 1e6, y: -1e6 }, 0);
    expect(drag.x).toBeCloseTo(0);
    expect(drag.y).toBeCloseTo(0);
  });

  it('is exactly zero when velocity is the zero vector, regardless of coefficient', () => {
    const drag = atmosphericDrag(ZERO_VECTOR, 500);
    expect(drag.x).toBeCloseTo(0);
    expect(drag.y).toBeCloseTo(0);
  });

  it('hand-computed: diagonal velocity {x: 3, y: -4} with coefficient 2.5', () => {
    // drag.x = -velocity.x * dragCoefficient = -3 * 2.5 = -7.5
    // drag.y = -velocity.y * dragCoefficient = -(-4) * 2.5 = 10
    expect(atmosphericDrag({ x: 3, y: -4 }, 2.5)).toEqual({ x: -7.5, y: 10 });
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

describe('normalizeAngle', () => {
  it('leaves angles already within (-PI, PI] untouched', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
    expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('maps -PI to PI (the boundary is inclusive on the positive side)', () => {
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
  });

  it('wraps more than a full turn back to the equivalent angle', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(Math.PI);
  });

  it('wraps one and a half turns to the equivalent quarter-turn angle', () => {
    expect(normalizeAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });
});
