import type { ShipClass } from './ship';
import type { LoadoutTag } from '../bases/base';

/**
 * Which `ShipClass` stat a permanent upgrade modifies (Decision D14). Every
 * upgrade is additive — `amount` is signed so "lighter materials"/"burn
 * efficiency" upgrades (which improve their stat by *decreasing* it) still
 * fold through the same `ship[stat] + amount` formula as "stronger
 * engines"/"longer boost" (which improve theirs by increasing it), rather
 * than needing a second, subtractive code path.
 *
 * @public every entry in this file's own `UPGRADES` registry authors a
 * `stat` value satisfying this type structurally (a plain string literal);
 * this named alias isn't imported by name anywhere else yet since no code
 * outside this file branches on it. Not dead code — matches
 * `ships/ship.ts`'s `ShipArchetype`/`bases/base.ts`'s `HandlingBand`/
 * `WeaponTier` precedent for a field's type alias with no by-name importer
 * yet.
 */
export type PermanentUpgradeStat = 'baseThrustAccel' | 'dryMass' | 'fuelCapacity' | 'burnRate';

export interface PermanentUpgrade {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly stat: PermanentUpgradeStat;
  readonly amount: number;
  /** Soft hint for `bases/fit-check.ts`'s loadout-tag matching (PLAN.md
   * §6b.2's `BaseRequirements.hazardCounterTags`/`recommendedTags`) — never
   * a hard gate on its own. Empty for an upgrade with no natural tag. */
  readonly tags: readonly LoadoutTag[];
}

/**
 * Milestone 9's hand-authored permanent-upgrade roster (Decision D14),
 * naming the exact items PLAN.md §6b.1's puzzle-countermeasure table
 * already names (`Stronger Engines`, `Lighter Hull Alloy`,
 * `Extended Fuel Cells`) plus `Efficient Injectors` for D14's separately
 * named "burn efficiency" lever. Bought once, always active, no slot cost
 * (unlike `equipment/equipment.ts`'s slotted items) — `dryMass`'s reduction
 * and `burnRate`'s reduction are each the only upgrade touching that stat,
 * so even every upgrade owned simultaneously can't drive a ship's mass or
 * burn rate to zero or negative for any registered `ShipClass`.
 */
export const UPGRADES: readonly PermanentUpgrade[] = [
  {
    id: 'stronger-engines',
    name: 'Stronger Engines',
    price: 300,
    stat: 'baseThrustAccel',
    amount: 10,
    tags: ['high-thrust'],
  },
  {
    id: 'lighter-hull-alloy',
    name: 'Lighter Hull Alloy',
    price: 350,
    stat: 'dryMass',
    amount: -25,
    tags: ['lightweight'],
  },
  {
    id: 'extended-fuel-cells',
    name: 'Extended Fuel Cells',
    price: 250,
    stat: 'fuelCapacity',
    amount: 40,
    tags: ['fuel-efficient'],
  },
  {
    id: 'efficient-injectors',
    name: 'Efficient Injectors',
    price: 280,
    stat: 'burnRate',
    amount: -3,
    tags: ['fuel-efficient'],
  },
];

/**
 * Looks up a `PermanentUpgrade` by id in this registry. A caller referencing
 * a nonexistent upgrade id (a stale persisted `purchasedUpgradeIds` entry
 * surviving a roster change) is a real data-integrity bug, not a reachable
 * runtime condition otherwise — throwing surfaces it loudly, matching
 * `ships/ships.ts`'s `findShipById` convention.
 */
export function findUpgradeById(id: string): PermanentUpgrade {
  const upgrade = UPGRADES.find((candidate) => candidate.id === id);
  if (!upgrade) {
    throw new Error(`findUpgradeById: no PermanentUpgrade registered with id '${id}'`);
  }
  return upgrade;
}

/**
 * Folds every owned upgrade's stat modification onto `ship`, returning a new
 * `ShipClass` (never mutates the input) — the single point every other M9
 * system (equipment mass math, `fit-check.ts`, `GameScene`) reads an
 * upgraded ship's stats through, so "which upgrades are owned" can't drift
 * into two independently-computed answers.
 */
export function applyPermanentUpgrades(
  ship: ShipClass,
  upgrades: readonly PermanentUpgrade[],
): ShipClass {
  return upgrades.reduce(
    (current, upgrade) => ({ ...current, [upgrade.stat]: current[upgrade.stat] + upgrade.amount }),
    ship,
  );
}
