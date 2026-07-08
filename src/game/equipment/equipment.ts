import type { ShipClass } from '../ships/ship';
import type { LoadoutTag, WeaponTier } from '../bases/base';

export type EquipmentSlotType = 'weapon' | 'utility';

/**
 * Mirrors `ships/ship.ts`'s `ShipAcquisition` exactly, minus the `'starter'`
 * variant — no equipment item is owned from a fresh save (Milestone 9's own
 * scope text: "each equipment item is acquired either by purchase (M8) or
 * by unlock (progression) — same dual model as ships, same reasoning: not
 * everything should be a flat currency purchase"). Kept as its own type
 * rather than reusing `ShipAcquisition` by name — the same small, deliberate
 * per-domain duplication `bases/base.ts`'s `TWRBand`/`HandlingBand` already
 * establish for this project — since a `'starter'` equipment item isn't a
 * real Milestone 9 concept.
 */
export type EquipmentAcquisition =
  | { readonly type: 'purchase'; readonly price: number }
  | { readonly type: 'unlock'; readonly requiredBaseId: string; readonly description: string };

/** A weapon's stats, consumed by Milestone 11's combat resolution — this
 * milestone only stores them and exposes cycle/trigger input over them (see
 * `equipment/loadout.ts` and `scenes/game-scene.ts`); firing one has no
 * gameplay effect yet (§6b.2/M9's own scope note: "hands off to M11"). */
export interface WeaponEquipmentItem {
  readonly slotType: 'weapon';
  readonly id: string;
  readonly name: string;
  readonly mass: number;
  readonly acquisition: EquipmentAcquisition;
  readonly tier: WeaponTier;
  /** Benefit stat paired with `mass` per M9's "pros-and-cons bundle" rule —
   * consumed by M11's `damagePerHit − armorRating` combat math, not read by
   * anything in this milestone. */
  readonly damage: number;
  readonly tags: readonly LoadoutTag[];
}

/**
 * A utility item's effect (Decision D14's "boost" category). Two shapes:
 * **passive** effects (`fuelCapacityBonus`/`corrosionResistance`/
 * `coldResistance`) apply automatically for the whole flight the moment the
 * item is equipped, with no cycle/trigger involved — these are the exact
 * named countermeasures PLAN.md §6b.1's puzzle table already calls for
 * (`Fuel Tank`, `Corrosion Coating`, `Thermal Lining`). **Active** effects
 * (`repairKit`/`thrustBurst`) are the ones the cycle/trigger mechanic
 * actually selects and fires — `GameScene` "applies the utility effect
 * directly" (M9's own scope note) only for this half of the union; the
 * passive half has nothing left to do at trigger time; it's already active.
 */
export type UtilityEffect =
  | { readonly kind: 'fuelCapacityBonus'; readonly amount: number }
  | { readonly kind: 'corrosionResistance' }
  | { readonly kind: 'coldResistance' }
  | { readonly kind: 'repairKit'; readonly fuelRestored: number }
  | {
      readonly kind: 'thrustBurst';
      readonly bonusThrustAccel: number;
      readonly durationMs: number;
    };

export interface UtilityEquipmentItem {
  readonly slotType: 'utility';
  readonly id: string;
  readonly name: string;
  readonly mass: number;
  readonly acquisition: EquipmentAcquisition;
  readonly effect: UtilityEffect;
  readonly tags: readonly LoadoutTag[];
}

export type EquipmentItem = WeaponEquipmentItem | UtilityEquipmentItem;

/**
 * Milestone 9's hand-authored equipment roster (Decision D14), naming the
 * exact items PLAN.md §6b.1's puzzle-countermeasure table already names for
 * the fuel-margin, corrosive-drain, and cold-penalty archetypes (`Fuel
 * Tank`, `Corrosion Coating`, `Thermal Lining`), plus a repair kit and
 * thrust booster for the "boost" utility examples in M9's own Goal text, and
 * two weapons (tiers 1/2) so Milestone 11 has real gear to resolve combat
 * against. Every `EquipmentAcquisition` variant is represented at least
 * once across both slot types, mirroring `ships/ships.ts`'s own roster
 * convention.
 */
export const EQUIPMENT_ITEMS: readonly EquipmentItem[] = [
  {
    slotType: 'weapon',
    id: 'pulse-cannon',
    name: 'Pulse Cannon',
    mass: 20,
    acquisition: { type: 'purchase', price: 200 },
    tier: 1,
    damage: 15,
    tags: ['combat-capable'],
  },
  {
    slotType: 'weapon',
    id: 'autocannon',
    name: 'Autocannon',
    mass: 35,
    acquisition: {
      type: 'unlock',
      requiredBaseId: 'scarp-outpost',
      description: 'Establish Scarp Outpost',
    },
    tier: 2,
    damage: 30,
    tags: ['combat-capable'],
  },
  {
    slotType: 'utility',
    id: 'fuel-tank',
    name: 'Fuel Tank',
    mass: 20,
    acquisition: { type: 'purchase', price: 180 },
    effect: { kind: 'fuelCapacityBonus', amount: 40 },
    tags: ['fuel-efficient'],
  },
  {
    slotType: 'utility',
    id: 'corrosion-coating',
    name: 'Corrosion Coating',
    mass: 15,
    acquisition: {
      type: 'unlock',
      requiredBaseId: 'rustwell-landing',
      description: 'Establish Rustwell Landing',
    },
    effect: { kind: 'corrosionResistance' },
    tags: ['corrosion-resistant'],
  },
  {
    slotType: 'utility',
    id: 'thermal-lining',
    name: 'Thermal Lining',
    mass: 15,
    acquisition: {
      type: 'unlock',
      requiredBaseId: 'frostgate',
      description: 'Establish Frostgate',
    },
    effect: { kind: 'coldResistance' },
    tags: ['cold-hardened'],
  },
  {
    slotType: 'utility',
    id: 'repair-kit',
    name: 'Repair Kit',
    mass: 10,
    acquisition: { type: 'purchase', price: 120 },
    effect: { kind: 'repairKit', fuelRestored: 25 },
    tags: [],
  },
  {
    slotType: 'utility',
    id: 'thrust-booster',
    name: 'Thrust Booster',
    mass: 15,
    acquisition: { type: 'purchase', price: 150 },
    effect: { kind: 'thrustBurst', bonusThrustAccel: 20, durationMs: 3000 },
    tags: ['high-thrust'],
  },
];

/**
 * Looks up an `EquipmentItem` by id in this registry. A caller referencing a
 * nonexistent equipment id (a stale persisted id surviving a roster change)
 * is a real data-integrity bug, not a reachable runtime condition otherwise
 * — throwing surfaces it loudly, matching `ships/ships.ts`'s `findShipById`
 * convention.
 */
export function findEquipmentById(id: string): EquipmentItem {
  const item = EQUIPMENT_ITEMS.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`findEquipmentById: no EquipmentItem registered with id '${id}'`);
  }
  return item;
}

/** Sum of every equipped item's mass — the one place `totalCarriedMass` is
 * computed, so `effectiveThrustAccel` below and `fit-check.ts`'s mechanical
 * branch can't silently drift into two independently-summed answers. */
export function totalCarriedMass(items: readonly EquipmentItem[]): number {
  return items.reduce((sum, item) => sum + item.mass, 0);
}

/**
 * PLAN.md §9's named formula, made explicit so Milestone 9.5 reuses it
 * exactly instead of reinventing it (that milestone extends `carriedMass`
 * to also include cargo — same formula, same variable, no parallel
 * formula). `ship` should already have any owned `PermanentUpgrade`s folded
 * in via `ships/upgrades.ts`'s `applyPermanentUpgrades` — this function only
 * owns the mass-vs-thrust relationship, not upgrade stacking.
 */
export function effectiveThrustAccel(ship: ShipClass, carriedMass: number): number {
  return (ship.baseThrustAccel * ship.dryMass) / (ship.dryMass + carriedMass);
}

/** The always-on effect of every equipped *passive* utility item, folded
 * into one summary — the one place `GameScene` and `bases/fit-check.ts`
 * both go from "which items are equipped" to "what passive bonus/hazard
 * negation applies," so the two can't independently compute this
 * differently. `repairKit`/`thrustBurst` are *active*-use effects (only
 * applied at the moment they're triggered, not summarized here) and are
 * deliberately excluded — see `UtilityEffect`'s own doc comment for the
 * passive/active split. */
export interface EquippedPassiveEffects {
  readonly fuelCapacityBonus: number;
  readonly corrosionResistant: boolean;
  readonly coldResistant: boolean;
}

export function summarizePassiveEffects(items: readonly EquipmentItem[]): EquippedPassiveEffects {
  let fuelCapacityBonus = 0;
  let corrosionResistant = false;
  let coldResistant = false;

  for (const item of items) {
    if (item.slotType !== 'utility') {
      continue;
    }
    switch (item.effect.kind) {
      case 'fuelCapacityBonus':
        fuelCapacityBonus += item.effect.amount;
        break;
      case 'corrosionResistance':
        corrosionResistant = true;
        break;
      case 'coldResistance':
        coldResistant = true;
        break;
      case 'repairKit':
      case 'thrustBurst':
        break;
    }
  }

  return { fuelCapacityBonus, corrosionResistant, coldResistant };
}
