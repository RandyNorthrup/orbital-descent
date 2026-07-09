import type { CombatantDefinition, EncounterSpec } from '../bases/base';
import { createSeededRandom } from '../random/seeded-random';
import { absorbHit, effectiveDamage, type ShipCombatState } from './damage';
import { spawnCombatant, GLACIAN_WARDEN, VERDALIS_WASP, type CombatantState } from './combatant';

/**
 * Spawns every combatant `encounter.combatants` authors, spread
 * deterministically within `spawnCenterX Β± spawnHalfWidth` at a fixed
 * `spawnY` — centered on the player's own position when the encounter
 * triggers (`scenes/game-scene.ts`'s call site), not spread across the
 * whole world: a swarm spawning anywhere in a multi-screen-wide world
 * (Decision D19/Milestone 2.5) would take most of it long enough to reach
 * the player that it would rarely read as a real, close encounter. Reuses
 * this project's one seeded PRNG (`random/seeded-random.ts`, the same
 * Mulberry32 implementation `terrain-generator.ts`/the background starfield
 * already share) keyed off `encounter.seed`, so the same encounter always
 * spawns in the same layout relative to wherever the player triggers it,
 * matching this project's "deterministic given a seed" guarantee
 * everywhere else procedural placement happens.
 */
export function spawnEncounterCombatants(
  encounter: EncounterSpec,
  spawnCenterX: number,
  spawnHalfWidth: number,
  spawnY: number,
): readonly CombatantState[] {
  const random = createSeededRandom(encounter.seed);
  const combatants: CombatantState[] = [];
  for (const group of encounter.combatants) {
    for (let i = 0; i < group.count; i += 1) {
      const x = spawnCenterX + (random() * 2 - 1) * spawnHalfWidth;
      combatants.push(spawnCombatant(group.definition, { x, y: spawnY }));
    }
  }
  return combatants;
}

/** One combatant instance per authored `{definition, count}` group,
 * flattened — the shape both `simulateEncounter` below and
 * `spawnEncounterCombatants` above iterate over. */
function flattenCombatants(encounter: EncounterSpec): readonly CombatantDefinition[] {
  return encounter.combatants.flatMap((group) =>
    Array<CombatantDefinition>(group.count).fill(group.definition),
  );
}

export interface SimulatedWeapon {
  readonly damage: number;
  readonly cooldownMs: number;
}

export interface EncounterSimulationResult {
  readonly cleared: boolean;
  readonly hullRemaining: number;
}

/** `null` once `weapon` can never clear this combatant's armor floor (the
 * "Bruiser" hard-fail archetype) or no weapon is equipped at all —
 * otherwise the time, in ms, `weapon` needs to whittle it down to 0
 * health, firing every `cooldownMs`. */
function timeToDefeatMs(
  combatant: CombatantDefinition,
  weapon: SimulatedWeapon | null,
): number | null {
  if (weapon === null) {
    return null;
  }
  const perHit = effectiveDamage(weapon.damage, combatant.armorRating);
  if (perHit <= 0) {
    return null;
  }
  return Math.ceil(combatant.health / perHit) * weapon.cooldownMs;
}

/** Every hit `combatant.attack` could land against a target it never
 * leaves alive for less than `durationMs`, applied via `absorbHit` so a
 * shield already absorbing the encounter's earlier hits carries over
 * correctly. `combatant.attack === null` contributes no ranged hits.
 *
 * `+ 1` on the `Math.floor` division: `combatant.ts`'s `spawnCombatant`
 * starts a fresh combatant's `attackCooldownRemainingMs` at 0 (that field's
 * own doc comment: "ready to fire immediately"), and this project's real
 * encounter spawn geometry (`ENCOUNTER_SPAWN_HALF_WIDTH_PX`/
 * `SPAWN_Y_ABOVE_TRIGGER_ALTITUDE`) keeps a combatant well within its own
 * authored `attack.range` at the moment it spawns — so the very first hit
 * lands at t=0, before the first `cooldownMs` has even elapsed, and every
 * hit after that is spaced one `cooldownMs` apart. A bare
 * `Math.floor(durationMs / cooldownMs)` (no `+ 1`) silently assumes the
 * first hit only lands *after* a full cooldown, undercounting this
 * "worst case" estimate by exactly one hit — the opposite of what a
 * worst-case estimate should do. */
function applyRangedAttacks(
  combatant: CombatantDefinition,
  durationMs: number,
  combat: ShipCombatState,
): ShipCombatState {
  if (combatant.attack === null || durationMs <= 0) {
    return combat;
  }
  const hits = Math.floor(durationMs / combatant.attack.cooldownMs) + 1;
  let next = combat;
  for (let i = 0; i < hits; i += 1) {
    next = absorbHit(next, combatant.attack.damagePerHit);
  }
  return next;
}

/**
 * Closed-form, worst-case estimate of an encounter's outcome for a given
 * weapon/shield loadout — mirrors `fit-check.ts`'s own `estimateFuelNeeded`
 * philosophy: a pessimistic, illustrative pre-flight estimate, not a
 * frame-stepped replay of the real, skill-dependent combat
 * `scenes/game-scene.ts`/`combatant.ts` run live (a real pilot who
 * maneuvers well, or defeats combatants out of the assumed order, will do
 * better than this suggests — matching how `fit-check.ts`'s `twrBand`
 * "risky" tier already reads as "flyable, but tight" rather than a hard
 * verdict).
 *
 * Assumes the player faces every combatant in `encounter` for its own
 * `clearWindowMs`, defeating them one at a time in authored order while
 * every other combatant keeps attacking; a combatant `weapon` can never
 * defeat within the window (or at all, if its armor hard-fails `weapon`)
 * is assumed to keep attacking for the window's full remaining duration.
 * Every hit -- from a combatant being fought or one still waiting its
 * turn -- is resolved via `absorbHit` against the same running
 * `ShipCombatState`, so a shield absorbs whichever hit lands first,
 * regardless of source.
 */
export function simulateEncounter(
  encounter: EncounterSpec,
  weapon: SimulatedWeapon | null,
  shieldHitsAvailable: number,
  startingHull: number,
): EncounterSimulationResult {
  const combatants = flattenCombatants(encounter);
  let combat: ShipCombatState = { hull: startingHull, shieldHitsRemaining: shieldHitsAvailable };
  let elapsedMs = 0;
  let cleared = true;

  for (const combatant of combatants) {
    if (combatant.contactDamage > 0) {
      combat = absorbHit(combat, combatant.contactDamage);
    }

    const defeatMs = timeToDefeatMs(combatant, weapon);
    const remainingWindowMs = Math.max(0, encounter.clearWindowMs - elapsedMs);
    if (defeatMs === null || defeatMs > remainingWindowMs) {
      cleared = false;
      combat = applyRangedAttacks(combatant, remainingWindowMs, combat);
    } else {
      elapsedMs += defeatMs;
      combat = applyRangedAttacks(combatant, defeatMs, combat);
    }
  }

  return { cleared: cleared && combat.hull > 0, hullRemaining: combat.hull };
}

const SPAWN_Y_ABOVE_TRIGGER_ALTITUDE = 40;

/**
 * Milestone 11's first encounter: a swarm of four unarmored Verdalis
 * Wasps, introduced with no obstacles and no world hazard (Verdalis is
 * hazard-free) at Meridian Yard, once the player has descended to
 * `triggerAltitude`. Bare-handed survival is possible (4 x 6 = 24 contact
 * damage against `SHIP_BASE_HULL_POINTS` = 30) but risky -- any weapon at
 * all (`armorRating: 0`) clears the whole swarm easily.
 */
export const MERIDIAN_YARD_ENCOUNTER: EncounterSpec = {
  id: 'meridian-yard-swarm',
  combatants: [{ definition: VERDALIS_WASP, count: 4 }],
  clearWindowMs: 5000,
  triggerAltitude: 260,
  seed: 1101,
};

/**
 * Milestone 11's tougher encounter, guarding Frostgate: a single Glacian
 * Warden whose armor floor hard-fails the tier-1 Pulse Cannon, forcing the
 * tier-2 Autocannon (see `combatant.ts`'s own doc comment on
 * `GLACIAN_WARDEN`).
 */
export const FROSTGATE_ENCOUNTER: EncounterSpec = {
  id: 'frostgate-warden',
  combatants: [{ definition: GLACIAN_WARDEN, count: 1 }],
  clearWindowMs: 6000,
  triggerAltitude: 300,
  seed: 1102,
};

/** Every base's own `triggerAltitude` minus a small margin, so a swarm
 * spawns just above where it first becomes reachable rather than exactly
 * on top of the player. Exported for `scenes/game-scene.ts`'s spawn call to
 * share, so the two can't independently drift on the offset. */
export function encounterSpawnY(encounter: EncounterSpec): number {
  return encounter.triggerAltitude - SPAWN_Y_ABOVE_TRIGGER_ALTITUDE;
}
