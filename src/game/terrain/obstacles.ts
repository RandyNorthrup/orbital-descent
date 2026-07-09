import type { Obstacle } from './terrain-generator';

/**
 * Circle-vs-axis-aligned-rectangle collision test between the lander
 * (a circle of `radius` centered at `position`) and `obstacle` — mirrors
 * `landing.ts`'s pure, dependency-free style (no Phaser import) so it's
 * unit-testable in plain Node and reusable if the renderer ever changes.
 * A `cleared` obstacle never collides, regardless of position. In practice
 * this branch is always `false`: `Obstacle` objects are shared, module-level
 * data exported from `bases.ts`, so `game-scene.ts` never mutates one's own
 * `cleared` field to record a real weapon-clear — it tracks per-flight
 * clearing in its own `clearedObstacleIndices: Set<number>` instead (see
 * that field's doc comment) and checks that set before ever calling this
 * function. `cleared: true` is only ever constructed directly by
 * `obstacles.test.ts`'s own fixtures, exercising this branch in isolation.
 */
export function isCollidingWithObstacle(
  position: { readonly x: number; readonly y: number },
  radius: number,
  obstacle: Obstacle,
): boolean {
  const closestX = Math.min(Math.max(position.x, obstacle.xStart), obstacle.xEnd);
  const closestY = Math.min(Math.max(position.y, obstacle.yTop), obstacle.yBottom);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  return dx * dx + dy * dy <= radius * radius && !(obstacle.cleared ?? false);
}
