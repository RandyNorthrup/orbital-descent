import type { GenerateTerrainOptions } from '../terrain/terrain-generator';

/**
 * Defined here, not imported from Milestone 11's combat module — `Base`
 * needs this type from Milestone 6's first line of code (the `encounters`
 * field below), and a type-only import of a file that doesn't exist until
 * Milestone 11 (four milestones later) is a real compile failure, not a
 * "populate later" deferral (that pattern only works for *values*, e.g.
 * `encounters: []`, not for the *type* of a field). Milestone 11's own
 * `src/game/combat/encounter.ts`/`combatant.ts` import these types from
 * here (a backward reference) and are where real combatant instances get
 * authored and movement/attack/damage resolution actually runs — this file
 * only owns the shape.
 *
 * @public not imported anywhere yet (nothing authors a real combatant
 * until Milestone 11) — deliberately forward-declared, not dead code;
 * this tag tells knip so it isn't flagged as an unused export.
 */
export interface CombatantDefinition {
  readonly id: string;
  readonly health: number;
  /** effectiveDamage = max(0, hit.damage - armorRating). */
  readonly armorRating: number;
  readonly contactDamage: number;
  readonly attack: {
    readonly damagePerHit: number;
    readonly cooldownMs: number;
    readonly range: number;
  } | null;
  readonly movement:
    | { readonly kind: 'static' }
    | { readonly kind: 'homing'; readonly speed: number; readonly turnRateDegPerSec: number }
    | { readonly kind: 'diveStrafe'; readonly speed: number; readonly diveAltitude: number };
}

/** @public forward-declared for Milestone 11, same rationale as
 * `CombatantDefinition` above — not dead code. */
export interface EncounterSpec {
  readonly id: string;
  readonly combatants: readonly {
    readonly definition: CombatantDefinition;
    readonly count: number;
  }[];
  readonly clearWindowMs: number;
  readonly triggerAltitude: number;
  readonly seed: number;
}

/** @public forward-declared for Milestone 9's loadout-select UI (its
 * `hazardCounterTags`/`recommendedTags` hints below reference these tag
 * values as plain string literals today, satisfying `BaseRequirements`
 * structurally without importing this type by name — the type itself
 * isn't consumed elsewhere until M9 builds real tag-matching logic). Not
 * dead code. */
export type LoadoutTag =
  | 'fuel-efficient'
  | 'high-thrust'
  | 'lightweight'
  | 'corrosion-resistant'
  | 'cold-hardened'
  | 'high-handling'
  | 'combat-capable';

export interface TWRBand {
  /** Below this thrust-to-weight ratio, the UI flags "not completable". */
  readonly hardFloor: number;
  /** At/above this ratio, no warning is shown at all. Between the two
   * bands is "risky": flyable by a skilled pilot, a soft warning, never a
   * hard block. */
  readonly comfortable: number;
}

/** @public every M6-era base authors `requirements.handling: null` (no
 * obstacles to dodge yet, Milestone 10's job) — this type isn't
 * instantiated anywhere until a base actually needs a handling band. Not
 * dead code. */
export interface HandlingBand {
  /** deg/s. Below this, threading a gate/pad precisely is not completable. */
  readonly hardFloor: number;
  /** deg/s. At/above this, no warning is shown at all. */
  readonly comfortable: number;
}

/**
 * Weapon-tier scale (PLAN.md §6b.2). Pulled out as its own top-level type
 * alias — rather than an inline `0 | 1 | 2 | 3` on the `combat.minWeaponTier`
 * field below — because `@typescript-eslint/no-magic-numbers`'s
 * `ignoreNumericLiteralTypes` option (see `eslint.config.js`) only recognizes
 * a numeric literal union as compile-time-only when it's the entire RHS of a
 * `type X = ...` alias declaration, not when it's inline in an interface
 * property's type position.
 *
 * @public every M6-era base authors `combat.minWeaponTier: 0` as a plain
 * literal (satisfying `BaseRequirements` structurally); this named alias
 * isn't imported by name anywhere until Milestone 9 builds real
 * weapon-tier comparisons. Not dead code.
 */
export type WeaponTier = 0 | 1 | 2 | 3;

export interface BaseRequirements {
  readonly minTWR: TWRBand;
  /** null = this base places no spatial precision demand beyond the
   * default pad width. */
  readonly handling: HandlingBand | null;
  /** Soft hints surfaced in the loadout-select UI — never a hard gate on
   * their own (the underlying fuel-margin/TWR/handling/combat checks are
   * the hard gates). */
  readonly hazardCounterTags: readonly LoadoutTag[];
  readonly recommendedTags: readonly LoadoutTag[];
  readonly combat: {
    /** The tier below which every equipped weapon deals zero effective
     * damage against this base's toughest combatant. 0 = no weapon
     * required at all (obstacle-avoidable or zero-combat base). Enforced
     * as a hard gate once Milestone 9's `evaluateBaseFit` lands. */
    readonly minWeaponTier: WeaponTier;
    /** Soft, UI-only recommendation — never enforced as a gate. */
    readonly minShieldTier: 0 | 1 | 2;
  };
}

export interface BaseDifficultyProfile {
  /** Each axis independently 0-10. `combat` stays 0 until Milestone 11
   * populates real encounter data for a given base — the world-map UI
   * hides a zero-value axis badge rather than fake one. */
  readonly axes: { readonly mechanical: number; readonly spatial: number; readonly combat: number };
  readonly dominant: 'tutorial' | 'mechanical' | 'spatial' | 'combat' | 'capstone-balanced';
  readonly budget: number;
}

/**
 * A base's persisted, per-save-file progress — deliberately NOT baked
 * into the static `Base` record itself (which is fixed, authored design
 * content shared by every save). `bases.ts`'s registry only supplies each
 * base's *initial* status for a fresh save; `src/game/persistence/
 * base-progress.ts` tracks the actual current status per playthrough.
 */
export interface BaseProgress {
  readonly status: 'locked' | 'discovered-unclaimed' | 'established';
  /** Epoch ms of the first successful establishment, or null if never
   * established yet. */
  readonly establishedAt: number | null;
  /** Starts at 0; Milestone 12 reads this. Milestone 6 only needs the
   * field to exist and persist correctly, not to increment it — nothing
   * before Milestone 9.5's mission system can produce a resupply yet. */
  readonly resupplyCounts: number;
}

export interface Base {
  readonly id: string;
  readonly name: string;
  /** A `CelestialBody.id` (Milestone 5). */
  readonly worldId: string;
  /** Position within this world's base-select list. */
  readonly order: number;

  /** Milestone 2's existing generator options, extended by Milestone 10
   * with optional obstacle/override fields later — every field Milestone
   * 10 adds is optional so a base authored at Milestone 6 time keeps
   * compiling and behaving identically. */
  readonly terrainOptions: GenerateTerrainOptions;

  /** Always an array, never undefined — empty until Milestone 11 ships,
   * and empty is itself meaningful (the zero-combat-trap archetype). */
  readonly encounters: readonly EncounterSpec[];

  readonly requirements: BaseRequirements;
  readonly difficulty: BaseDifficultyProfile;

  /** First-clear reward (Milestone 8). Replay reward is a separate,
   * always-nonzero derived value, not modeled on this record. */
  readonly firstClearCredits: number;

  /** This base's status for a brand-new save — NOT the live, current
   * status (see `BaseProgress`/`base-progress.ts` for that). */
  readonly status: BaseProgress['status'];
  /** True for bases on the critical path to farther worlds/bases. */
  readonly isCriticalPath: boolean;
  /** Base ids that flip `locked -> discovered-unclaimed` once *this* base
   * reaches `established`. */
  readonly unlocks: readonly string[];
  /** Same-world distance (Transit Units, TU) from that world's reference
   * point — same-world relay-distance math (Milestone 9.5); cross-world
   * legs use `CelestialBody.distance` instead. */
  readonly localOffset: number;
}
