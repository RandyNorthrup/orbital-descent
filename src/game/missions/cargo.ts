import {
  CARGO_SUPPLY_UNIT_MASS,
  CARGO_SUPPLY_UNIT_VALUE,
  CARGO_TROOP_UNIT_MASS,
  CARGO_TROOP_UNIT_VALUE,
} from '../constants';
import type { ShipClass } from '../ships/ship';

/**
 * The two cargo types (PLAN.md §9.5.1), deliberately built to behave
 * differently: troops are discrete, whole-unit-only ("squad" = personnel +
 * minimal gear — you can't deliver 0.6 of a squad); supplies are
 * continuously loadable, mirroring how fuel is already a continuous 0..100
 * gauge elsewhere in this codebase.
 */
export type CargoType = 'troops' | 'supplies';

/** Mass units per cargo unit, keyed by type — read by `cargoMass` below so
 * `troops`/`supplies` share one lookup instead of two hardcoded literals. */
const CARGO_UNIT_MASS: Readonly<Record<CargoType, number>> = {
  troops: CARGO_TROOP_UNIT_MASS,
  supplies: CARGO_SUPPLY_UNIT_MASS,
};

/** Credits per cargo unit before `reward.ts`'s `riskBonus` scales it up —
 * read by `cargoValue` below. */
const CARGO_UNIT_VALUE: Readonly<Record<CargoType, number>> = {
  troops: CARGO_TROOP_UNIT_VALUE,
  supplies: CARGO_SUPPLY_UNIT_VALUE,
};

/** A concrete cargo load — always both fields present (0 for "none of this
 * type"), unlike `MinManifest` below which is deliberately partial. */
export interface CargoManifest {
  readonly troops: number;
  readonly supplies: number;
}

export const EMPTY_MANIFEST: CargoManifest = { troops: 0, supplies: 0 };

/** A mission's minimum cargo requirement (e.g. "≥6 troop squads") — partial
 * because most missions only constrain one cargo type; an absent key means
 * "no minimum for this type," not zero-and-therefore-blocking. */
export interface MinManifest {
  readonly troops?: number;
  readonly supplies?: number;
}

/** `totalCarriedMass = equipmentMass + cargoMass` (PLAN.md §9.5.1's amended
 * formula) — this function owns only the cargo half; callers add
 * `equipment/equipment.ts`'s `totalCarriedMass` for the equipment half
 * themselves, same composition `bases/fit-check.ts` already uses. */
export function cargoMass(manifest: CargoManifest): number {
  return manifest.troops * CARGO_UNIT_MASS.troops + manifest.supplies * CARGO_UNIT_MASS.supplies;
}

/** Sum of `unitValue × unitsCarried` across both cargo types, before
 * `reward.ts`'s `riskBonus` multiplier is applied. */
export function cargoValue(manifest: CargoManifest): number {
  return manifest.troops * CARGO_UNIT_VALUE.troops + manifest.supplies * CARGO_UNIT_VALUE.supplies;
}

/** `delivered` meets `minManifest` once every named minimum is met — an
 * absent key in `minManifest` imposes no constraint on that cargo type. */
export function meetsMinManifest(delivered: CargoManifest, minManifest: MinManifest): boolean {
  return (
    delivered.troops >= (minManifest.troops ?? 0) &&
    delivered.supplies >= (minManifest.supplies ?? 0)
  );
}

/**
 * The two independent gates a launch's manifest must clear (PLAN.md
 * §9.5.1): the cargo portion alone against `cargoBayCapacity`, and cargo
 * plus already-equipped mass together against the ship's one shared
 * `massBudget`. Both are checked together; failing either blocks launch —
 * mirrors `relayFeasibility`'s identical two-gate composition for the
 * relay-specific case.
 */
export interface CargoFitResult {
  readonly fitsCargoBay: boolean;
  readonly fitsMassBudget: boolean;
}

export function evaluateCargoFit(
  ship: ShipClass,
  equipmentMass: number,
  manifest: CargoManifest,
): CargoFitResult {
  const mass = cargoMass(manifest);
  return {
    fitsCargoBay: mass <= ship.cargoBayCapacity,
    fitsMassBudget: equipmentMass + mass <= ship.massBudget,
  };
}
