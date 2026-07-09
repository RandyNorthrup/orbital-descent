import type { ShipClass } from '../ships/ship';
import type { Base } from '../bases/base';
import type { CelestialBody } from '../planets/celestial-body';
import { RELAY_DESCENT_BRAKING_SECONDS, TRANSIT_LAUNCH_OVERHEAD } from '../constants';
import { cargoMass, type CargoManifest } from './cargo';

/**
 * Same-world relay-distance uses `Base.localOffset` (TU); cross-world uses
 * `CelestialBody.distance` (TU) instead — one formula, two magnitudes, no
 * special-casing (PLAN.md §9.5.6).
 */
export function transitDistanceTU(
  originBase: Base,
  originBody: CelestialBody,
  destBase: Base,
  destBody: CelestialBody,
): number {
  if (originBase.worldId === destBase.worldId) {
    return Math.abs(originBase.localOffset - destBase.localOffset);
  }
  return Math.abs(destBody.distance - originBody.distance);
}

/**
 * `TRANSIT_LAUNCH_OVERHEAD + distanceTU × fuelPerDistanceUnit ×
 * (dryMass + totalCarriedMass) / dryMass` (PLAN.md §9.5.6) — deducted from
 * the same fuel pool used for descent thrusting, deliberately: a ship must
 * arrive at the origin with enough reserve for (transit + a second flown
 * descent), not just enough to get there. `totalCarriedMass` here is the
 * mass actually carried *during transit* — equipment plus the cargo picked
 * up at the origin, since cargo loads before the transit leg begins.
 */
export function transitFuelCost(
  distanceTU: number,
  ship: ShipClass,
  totalCarriedMass: number,
): number {
  const massFactor = (ship.dryMass + totalCarriedMass) / ship.dryMass;
  return TRANSIT_LAUNCH_OVERHEAD + distanceTU * ship.fuelPerDistanceUnit * massFactor;
}

/**
 * Fuel left after paying `transitFuelCost` out of the origin leg's
 * touchdown reserve — negative means the transit would strand the ship
 * before it could ever fly the destination leg, PLAN.md §9.5.2's distinct
 * "stranded" failure mode (separate from a crash). Pulled out as its own
 * pure function, rather than left as inline arithmetic in `TransitScene`,
 * so this exact calculation is covered by a real unit test instead of only
 * a manual/e2e check of the rendered scene.
 */
export function remainingFuelAfterTransit(
  fuelRemainingAtTouchdown: number,
  transitCost: number,
): number {
  return fuelRemainingAtTouchdown - transitCost;
}

/** The reason string shown in the mission-select UI for each independent
 * feasibility gate (PLAN.md §9.5.6: "a relay may fail on cargo capacity
 * alone, fuel range alone, both, or neither"). Exported so the UI layer
 * quotes these verbatim rather than re-deriving its own wording. */
export const RELAY_REASON_CARGO_BAY = 'cargo exceeds hold capacity';
export const RELAY_REASON_MASS_BUDGET = 'cargo + equipment exceeds mass budget';
export const RELAY_REASON_FUEL_RANGE = 'insufficient fuel range';

export interface RelayFeasibilityResult {
  readonly feasible: boolean;
  /** Empty when `feasible`; otherwise every gate that failed, so the UI can
   * show all applicable reasons at once rather than only the first. */
  readonly reasons: readonly string[];
}

/** Only `corrosive` hazards drain fuel passively (a `cold` hazard reduces
 * thrust efficiency instead, `bases/fit-check.ts`'s own existing scope) —
 * mirrors that file's identical `passiveDrainRate` derivation so the two
 * features can't independently compute this differently. */
function passiveDrainRateFor(body: CelestialBody, corrosionResistant: boolean): number {
  return body.hazard?.type === 'corrosive' && !corrosionResistant ? body.hazard.fuelDrainRate : 0;
}

/** One flown descent leg's worst-case fuel estimate for relay's hard
 * feasibility gate — see `RELAY_DESCENT_BRAKING_SECONDS`'s own doc comment
 * for why this is a shorter, separately-calibrated reference than
 * `bases/fit-check.ts`'s whole-flight advisory estimate. */
function estimateRelayDescentFuel(
  ship: ShipClass,
  body: CelestialBody,
  corrosionResistant: boolean,
): number {
  const passiveDrainRate = passiveDrainRateFor(body, corrosionResistant);
  return (ship.burnRate + passiveDrainRate) * RELAY_DESCENT_BRAKING_SECONDS;
}

/**
 * The composed pre-launch feasibility gate (PLAN.md §9.5.6): cargo mass
 * against `cargoBayCapacity`, cargo plus equipment against `massBudget`,
 * and a worst-case fuel estimate (both flown descent legs plus the transit
 * itself) against `fuelCapacity`. All three are independent — a relay may
 * fail one, several, or none. The origin leg flies unloaded (equipment
 * only; cargo is picked up *at* the origin per PLAN.md §9.5.2), so only the
 * destination descent and the transit itself carry the mission's cargo
 * mass.
 */
export function relayFeasibility(
  ship: ShipClass,
  equipmentMass: number,
  manifest: CargoManifest,
  originBody: CelestialBody,
  destBody: CelestialBody,
  distanceTU: number,
  corrosionResistant: boolean,
): RelayFeasibilityResult {
  const reasons: string[] = [];
  const manifestMass = cargoMass(manifest);

  if (manifestMass > ship.cargoBayCapacity) {
    reasons.push(RELAY_REASON_CARGO_BAY);
  }
  if (equipmentMass + manifestMass > ship.massBudget) {
    reasons.push(RELAY_REASON_MASS_BUDGET);
  }

  const originDescentFuel = estimateRelayDescentFuel(ship, originBody, corrosionResistant);
  const destDescentFuel = estimateRelayDescentFuel(ship, destBody, corrosionResistant);
  const loadedMass = equipmentMass + manifestMass;
  const transitCost = transitFuelCost(distanceTU, ship, loadedMass);

  if (originDescentFuel + transitCost + destDescentFuel > ship.fuelCapacity) {
    reasons.push(RELAY_REASON_FUEL_RANGE);
  }

  return { feasible: reasons.length === 0, reasons };
}
