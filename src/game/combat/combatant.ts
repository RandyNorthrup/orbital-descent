import type { CombatantDefinition } from '../bases/base';
import {
  degreesToRadians,
  headingVector,
  integrate,
  normalizeAngle,
  type Vector2,
} from '../physics/lander-physics';

/**
 * A live combatant instance mid-flight — `definition` is the authored,
 * immutable stats/behavior (below); the rest is this specific spawn's
 * mutable-in-spirit runtime state (a fresh object each tick, matching
 * `flight/flight-state.ts`'s `FlightSnapshot` convention, never mutated in
 * place).
 */
export interface CombatantState {
  readonly definition: CombatantDefinition;
  readonly position: Vector2;
  /** Current facing, radians (0 = up, clockwise-positive — the same
   * convention as the lander's own rotation). Only meaningful for
   * `'homing'` movement, which turns toward the player at a bounded
   * `turnRateDegPerSec` rather than snapping instantly; `'static'`/
   * `'diveStrafe'` combatants never read it. */
  readonly headingRadians: number;
  readonly health: number;
  /** Counts down to 0 in `scenes/game-scene.ts`'s combat loop; a ranged
   * `definition.attack` only lands a hit once this reaches 0, then it
   * resets to `attack.cooldownMs`. Irrelevant (stays 0) for a combatant
   * with `attack: null`. */
  readonly attackCooldownRemainingMs: number;
}

/** Spawns a fresh `CombatantState` for `definition` at `position` — full
 * health, no facing yet (only matters once `advanceCombatantState`'s
 * `'homing'` branch first turns it), attack ready to fire immediately. */
export function spawnCombatant(definition: CombatantDefinition, position: Vector2): CombatantState {
  return {
    definition,
    position,
    headingRadians: 0,
    health: definition.health,
    attackCooldownRemainingMs: 0,
  };
}

function angleToward(from: Vector2, to: Vector2): number {
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

/** Turns `current` toward `target` by at most `maxDeltaRadians` this tick,
 * via whichever signed direction around the circle is shorter — reuses
 * `physics/lander-physics.ts`'s own `normalizeAngle` for the wrapped
 * difference rather than a second angle-wrapping implementation. */
function turnToward(current: number, target: number, maxDeltaRadians: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxDeltaRadians) {
    return target;
  }
  return current + Math.sign(diff) * maxDeltaRadians;
}

/**
 * Advances one combatant by one tick, per its own `definition.movement`
 * (PLAN.md §6b.2's three patterns) — "simple behavior, not necessarily
 * complex AI" (Milestone 11's own scope note): no pathfinding, no
 * acceleration curve, just these closed-form rules.
 *
 * `'static'` never moves. `'homing'` turns toward the player's current
 * position at up to `turnRateDegPerSec`, then moves forward along its
 * (possibly still-turning) heading at `speed`. `'diveStrafe'` moves
 * directly toward the player's x position while holding its own authored
 * `diveAltitude` in y — its simpler type authors no turn rate, so it isn't
 * turn-limited the way `'homing'` is.
 */
export function advanceCombatantState(
  state: CombatantState,
  playerPosition: Vector2,
  dtSeconds: number,
): CombatantState {
  const { movement } = state.definition;

  if (movement.kind === 'static') {
    return state;
  }

  if (movement.kind === 'homing') {
    const targetHeading = angleToward(state.position, playerPosition);
    const maxDeltaRadians = degreesToRadians(movement.turnRateDegPerSec) * dtSeconds;
    const headingRadians = turnToward(state.headingRadians, targetHeading, maxDeltaRadians);
    const position = integrate(
      state.position,
      headingVector(headingRadians, movement.speed),
      dtSeconds,
    );
    return { ...state, position, headingRadians };
  }

  // 'diveStrafe': hold this combatant's own authored altitude, closing
  // straight-line distance to the player (who may also be above or below
  // that altitude, not just to one side of it).
  const target: Vector2 = { x: playerPosition.x, y: movement.diveAltitude };
  const dx = target.x - state.position.x;
  const dy = target.y - state.position.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return state;
  }
  const step = Math.min(distance, movement.speed * dtSeconds);
  const position: Vector2 = {
    x: state.position.x + (dx / distance) * step,
    y: state.position.y + (dy / distance) * step,
  };
  return { ...state, position };
}

/**
 * Milestone 11's first hostile: a weak, unarmored swarm combatant
 * introduced alone (no obstacles, no world hazard — Verdalis is
 * hazard-free, `planets/bodies.ts`) at Meridian Yard, matching PLAN.md
 * §6b.1's own pacing rule of introducing one new mechanic at a time.
 * `contactDamage` is a one-shot ramming hit — see `encounter.ts`'s
 * `resolveContactHit` — not continuous per-frame damage.
 */
export const VERDALIS_WASP: CombatantDefinition = {
  id: 'verdalis-wasp',
  health: 1,
  armorRating: 0,
  contactDamage: 6,
  attack: null,
  movement: { kind: 'homing', speed: 50, turnRateDegPerSec: 180 },
};

/**
 * Milestone 11's tougher hostile, guarding this game's already-hardest
 * base (Frostgate — cold hazard, tightest-among-obstacle-bases pad, two
 * static obstacles since Milestone 10). `armorRating: 20` hard-fails the
 * tier-1 Pulse Cannon's 15 damage (`effectiveDamage(15, 20) === 0` — the
 * "Bruiser" archetype), forcing the tier-2 Autocannon; its own
 * `attack.damagePerHit: 18` survives one hit against `SHIP_BASE_HULL_
 * POINTS` (30) but not a second within its `cooldownMs` without shielding
 * or repositioning — the genuine skill/gear demand PLAN.md §6b.5's
 * capstone worked example calls for.
 */
export const GLACIAN_WARDEN: CombatantDefinition = {
  id: 'glacian-warden',
  health: 30,
  armorRating: 20,
  contactDamage: 0,
  attack: { damagePerHit: 18, cooldownMs: 2200, range: 280 },
  movement: { kind: 'homing', speed: 25, turnRateDegPerSec: 60 },
};
