/**
 * Damage resolution primitives (Milestone 11, PLAN.md §6b.2) — pure and
 * framework-free, shared by both `encounter.ts`'s closed-form
 * `simulateEncounter` estimate (consumed by `bases/fit-check.ts`) and
 * `scenes/game-scene.ts`'s real-time combat loop, so the two can't
 * independently drift on what "a hit" means.
 */

/**
 * `hit.damage - armorRating`, floored at 0 — a hit whose raw damage
 * doesn't clear the armor floor deals zero effective damage (the
 * "Bruiser" puzzle archetype, PLAN.md §6b.1's own table), a hard fail
 * against a too-weak weapon rather than a slow grind. Shared by weapon
 * fire against a `CombatantDefinition` (this module's own callers) and
 * against a clearable `terrain/obstacles.ts` `Obstacle.armorRating` —
 * one formula, not two independently-authored copies.
 */
export function effectiveDamage(rawDamage: number, armorRating: number): number {
  return Math.max(0, rawDamage - armorRating);
}

/** The player ship's live combat state for one flight — hull points and
 * however many incoming hits its equipped shield(s) can still absorb
 * outright (`equipment/equipment.ts`'s `shieldHitsAvailable`, summed once
 * per flight from every equipped passive shield item). */
export interface ShipCombatState {
  readonly hull: number;
  readonly shieldHitsRemaining: number;
}

/**
 * Resolves one incoming hit against `state`: a shield with at least one
 * hit remaining absorbs the hit outright (hull untouched, one shield hit
 * consumed), regardless of the hit's own damage magnitude — an
 * all-or-nothing block, not a percentage damage reduction, matching PLAN.md
 * M11's own acceptance criterion ("a shielded ship absorbs one hit before
 * taking hull damage"). With no shield hits remaining, `incomingDamage` is
 * subtracted from hull directly, floored at 0.
 */
export function absorbHit(state: ShipCombatState, incomingDamage: number): ShipCombatState {
  if (state.shieldHitsRemaining > 0) {
    return { ...state, shieldHitsRemaining: state.shieldHitsRemaining - 1 };
  }
  return { ...state, hull: Math.max(0, state.hull - incomingDamage) };
}
