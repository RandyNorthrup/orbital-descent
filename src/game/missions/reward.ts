import {
  CARGO_RISK_BONUS_COEFFICIENT,
  ESTABLISH_PRESENCE_BONUS_MULTIPLIER,
  EXTRACTION_MATERIAL_UNIT_VALUE,
  EXTRACTION_MATERIALS_UNITS,
  MISSION_BASE_COMPLETION_REWARD,
} from '../constants';
import { cargoValue, type CargoManifest } from './cargo';
import type { MissionFlavor } from './mission';

/** `totalCarriedMass / massBudget`, 0..1+ (a caller only ever passes an
 * already-fit-checked load, so this stays within [0, 1] in practice, but
 * this function itself doesn't clamp — `riskBonus` below is the one place
 * that would matter, and it's a straight linear scale with no ceiling
 * baked in). */
export function massUtilization(totalCarriedMass: number, massBudget: number): number {
  return totalCarriedMass / massBudget;
}

/** `1 + CARGO_RISK_BONUS_COEFFICIENT × massUtilization` (PLAN.md §9.5.5) —
 * range 1.0-1.5 at the coefficient's current value, rewarding committing
 * more of a ship's shared mass budget to the mission. */
export function riskBonus(utilization: number): number {
  return 1 + CARGO_RISK_BONUS_COEFFICIENT * utilization;
}

/** `ESTABLISH_PRESENCE_BONUS_MULTIPLIER` for Establish Presence — the
 * one-time bonus a base can only ever pay once (PLAN.md §9.5.4) — and
 * `1.0` for every repeatable flavor (Resupply, and Milestone 15's
 * Extraction, whose materials haul is already its own payout). */
export function flavorMultiplier(flavor: MissionFlavor): number {
  return flavor === 'establish-presence' ? ESTABLISH_PRESENCE_BONUS_MULTIPLIER : 1;
}

/** `Σ over cargo types: unitsDeliveredThisTrip × baseUnitValue(type) ×
 * riskBonus` (PLAN.md §9.5.5) — one trip/leg's cargo reward, before the
 * mission-wide flavor multiplier is applied. */
export function perTripCargoReward(
  unitsDeliveredThisTrip: CargoManifest,
  riskBonusValue: number,
): number {
  return cargoValue(unitsDeliveredThisTrip) * riskBonusValue;
}

/**
 * One trip's reward for whatever that trip's flavor actually pays on
 * (Milestone 15): an extraction touchdown pays the fixed raw-materials
 * haul it loads at the pad (the trip delivers nothing outbound, so its
 * delivered-cargo value is always zero by construction); every other
 * flavor pays `perTripCargoReward` on what was delivered. The riskBonus
 * multiplier applies either way — a heavier-committed ship earns more per
 * run regardless of which direction the value flows. The one place this
 * flavor branch lives, so `GameScene` calls this with plain data and never
 * re-implements it (AGENTS.md's "scenes render state" rule).
 */
export function perTripReward(
  flavor: MissionFlavor,
  unitsDeliveredThisTrip: CargoManifest,
  riskBonusValue: number,
): number {
  if (flavor === 'extraction') {
    return EXTRACTION_MATERIALS_UNITS * EXTRACTION_MATERIAL_UNIT_VALUE * riskBonusValue;
  }
  return perTripCargoReward(unitsDeliveredThisTrip, riskBonusValue);
}

export interface MissionRewardInputs {
  readonly flavor: MissionFlavor;
  /** Sum of every credited trip/leg's `perTripCargoReward` across the whole
   * mission — naturally prorates a partial multi-trip mission, no separate
   * proration formula needed (PLAN.md §9.5.5). */
  readonly cargoRewardAccumulated: number;
  /** Sum of every credited trip/leg's existing Milestone 4 `calculateScore`
   * output — summed unchanged, not itself scaled by `flavorMultiplier`. */
  readonly scoreAccumulated: number;
}

/**
 * `MISSION_BASE_COMPLETION_REWARD + missionCargoReward × flavorMultiplier +
 * Σ m4ScoreBonus` (PLAN.md §9.5.5) — only meaningful for a mission that
 * resolved `'success'` or `'partial'`; a caller never calls this for
 * `'failure'` (PLAN.md: the completion reward is "paid once, only on
 * success or partial").
 */
export function missionReward(inputs: MissionRewardInputs): number {
  return (
    MISSION_BASE_COMPLETION_REWARD +
    inputs.cargoRewardAccumulated * flavorMultiplier(inputs.flavor) +
    inputs.scoreAccumulated
  );
}
