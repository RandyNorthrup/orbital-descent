import { headingVector, integrate, type Vector2 } from '../physics/lander-physics';

/**
 * A player-fired projectile in flight (Milestone 11, PLAN.md §11's own
 * "projectile physics (pure-function trajectories, not Arcade Physics
 * bodies)" scope note) — plain data, framework-free like every other model
 * in `physics/`/`flight/`, so `scenes/game-scene.ts` is the only place that
 * ever touches Phaser for this.
 */
export interface Projectile {
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly damage: number;
  /** Straight-line distance traveled since `spawnProjectile`, px — compared
   * against `WEAPON_PROJECTILE_RANGE` by `isProjectileExpired` below. */
  readonly distanceTraveled: number;
}

/**
 * Spawns a projectile at `origin`, traveling at `speed` px/s along
 * `headingRadians` — the same heading-to-vector convention
 * `physics/lander-physics.ts`'s `thrustVector` already uses for the ship's
 * own thrust, so a weapon fires in whatever direction the ship is currently
 * facing, not a separately-invented aiming model.
 */
export function spawnProjectile(
  origin: Vector2,
  headingRadians: number,
  speed: number,
  damage: number,
): Projectile {
  return {
    position: origin,
    velocity: headingVector(headingRadians, speed),
    damage,
    distanceTraveled: 0,
  };
}

/** Advances `projectile` by one tick of straight-line motion (no gravity/drag
 * — a fired shot, unlike the lander itself, isn't subject to this game's
 * flight physics), accumulating `distanceTraveled` for the range check. */
export function advanceProjectile(projectile: Projectile, dtSeconds: number): Projectile {
  const nextPosition = integrate(projectile.position, projectile.velocity, dtSeconds);
  const dx = nextPosition.x - projectile.position.x;
  const dy = nextPosition.y - projectile.position.y;
  return {
    ...projectile,
    position: nextPosition,
    distanceTraveled: projectile.distanceTraveled + Math.hypot(dx, dy),
  };
}

/** True once a projectile has traveled at least `maxRange` unspent — the
 * caller (`GameScene`) removes it rather than letting it travel forever. */
export function isProjectileExpired(projectile: Projectile, maxRange: number): boolean {
  return projectile.distanceTraveled >= maxRange;
}
