import type { Vector2 } from '../physics/lander-physics';

/**
 * Circle-vs-circle collision test — mirrors `terrain/obstacles.ts`'s own
 * dedicated collision module for the same reason: a pure, dependency-free
 * home shared by every combat collision check (`scenes/game-scene.ts`'s
 * ship-vs-combatant contact hit, weapon-vs-combatant hit, and
 * weapon-vs-obstacle hit) rather than each call site re-deriving the same
 * distance-squared comparison.
 */
export function isWithinRadius(a: Vector2, b: Vector2, radius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radius * radius;
}
