import { describe, expect, it } from 'vitest';
import { isCollidingWithObstacle } from './obstacles';
import type { Obstacle } from './terrain-generator';

const SPIRE: Obstacle = { kind: 'spire', xStart: 100, xEnd: 120, yTop: 200, yBottom: 400 };
const RADIUS = 14;

describe('isCollidingWithObstacle', () => {
  it('collides when the lander center is directly inside the obstacle rectangle', () => {
    expect(isCollidingWithObstacle({ x: 110, y: 300 }, RADIUS, SPIRE)).toBe(true);
  });

  it('collides when the lander is outside the rectangle but within radius of its nearest edge', () => {
    expect(isCollidingWithObstacle({ x: 90, y: 300 }, RADIUS, SPIRE)).toBe(true);
  });

  it('does not collide when clearly outside both the rectangle and the radius margin', () => {
    expect(isCollidingWithObstacle({ x: 50, y: 300 }, RADIUS, SPIRE)).toBe(false);
  });

  it('does not collide just past the radius margin from the nearest edge', () => {
    // Nearest edge is x=100; center at x = 100 - (RADIUS + 1) is just outside.
    expect(isCollidingWithObstacle({ x: 100 - (RADIUS + 1), y: 300 }, RADIUS, SPIRE)).toBe(false);
  });

  it('collides exactly at the radius boundary (inclusive)', () => {
    expect(isCollidingWithObstacle({ x: 100 - RADIUS, y: 300 }, RADIUS, SPIRE)).toBe(true);
  });

  it('measures distance to the closest point on the rectangle (its corner), not just one axis', () => {
    // Diagonally outside the top-left corner (xStart=100, yTop=200): the
    // closest point on the rectangle is the corner itself, distance
    // sqrt(10^2 + 10^2) ~= 14.14, just outside a radius-14 lander.
    const corner = { x: 90, y: 190 };
    expect(isCollidingWithObstacle(corner, RADIUS, SPIRE)).toBe(false);
  });

  it('never collides once cleared, regardless of position', () => {
    const cleared: Obstacle = { ...SPIRE, cleared: true };
    expect(isCollidingWithObstacle({ x: 110, y: 300 }, RADIUS, cleared)).toBe(false);
  });

  it('collides when cleared is explicitly false, same as absent', () => {
    const explicitlyUncleared: Obstacle = { ...SPIRE, cleared: false };
    expect(isCollidingWithObstacle({ x: 110, y: 300 }, RADIUS, explicitlyUncleared)).toBe(true);
  });
});
