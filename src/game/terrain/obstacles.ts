import type { Obstacle } from './terrain-generator';

/**
 * Circle-vs-axis-aligned-rectangle collision test between the lander
 * (a circle of `radius` centered at `position`) and `obstacle` — mirrors
 * `landing.ts`'s pure, dependency-free style (no Phaser import) so it's
 * unit-testable in plain Node and reusable if the renderer ever changes.
 * A `cleared` obstacle (Milestone 11) never collides, regardless of
 * position — Milestone 10 itself never sets `cleared` on anything it
 * authors or generates, so this branch is always `false` for this
 * milestone's own content, but the check is correct now rather than
 * deferred to whichever milestone first sets `cleared: true`.
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
