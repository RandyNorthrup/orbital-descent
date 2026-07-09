import type { ShipClass } from '../ships/ship';
import { applyPermanentUpgrades, type PermanentUpgrade } from '../ships/upgrades';
import {
  effectiveThrustAccel,
  summarizePassiveEffects,
  totalCarriedMass,
  type EquipmentItem,
  type EquippedPassiveEffects,
} from '../equipment/equipment';
import type { CelestialBody } from '../planets/celestial-body';
import { SCORE_TIME_PAR_MS, SHIP_BASE_HULL_POINTS } from '../constants';
import { simulateEncounter, type SimulatedWeapon } from '../combat/encounter';
import type { Base, HandlingBand, TWRBand } from './base';

const MILLISECONDS_PER_SECOND = 1000;
/** Below this ratio, the estimated fuel cost of a full-thrust descent (see
 * `estimateFuelNeeded` below) exceeds effective fuel capacity. */
const FUEL_MARGIN_WARNING_THRESHOLD = 1;

/**
 * @public consumed internally by this file's own `bandFor`/`BaseFitResult`
 * (both `twrBand`/`handlingBand` are typed against it) — not imported by
 * name anywhere else yet, since no scene wires `evaluateBaseFit` into live
 * UI this milestone (a deliberate, documented scope decision — see PLAN.md's
 * Milestone 9 certification notes). Not dead code — matches
 * `bases/base.ts`'s `HandlingBand`/`WeaponTier` precedent for a type alias
 * with no by-name importer yet.
 */
export type FitBand = 'impossible' | 'risky' | 'comfortable';

/**
 * PLAN.md §6b.2's facade result. `fuelMarginRatio` is a raw ratio (available
 * ÷ estimated-needed), not a banded verdict — the loadout UI turns a value
 * below `FUEL_MARGIN_WARNING_THRESHOLD` into a warning string itself, same
 * as every other soft signal in `warnings`.
 */
export interface BaseFitResult {
  readonly twr: number;
  readonly twrBand: FitBand;
  readonly fuelMarginRatio: number;
  readonly handlingBand: FitBand | 'not-applicable';
  readonly combatOutcome:
    { readonly cleared: boolean; readonly hullRemaining: number } | 'not-applicable';
  readonly warnings: readonly string[];
}

function bandFor(value: number, band: TWRBand | HandlingBand): FitBand {
  if (value < band.hardFloor) {
    return 'impossible';
  }
  if (value < band.comfortable) {
    return 'risky';
  }
  return 'comfortable';
}

/**
 * Closed-form fuel-needed estimate, not a full per-tick simulation of an
 * actual descent (a real autopilot capable of flying every curated base
 * would be its own substantial system, and isn't part of this milestone's
 * required tests — see the certification notes for this deliberate scope
 * boundary). Assumes the conservative worst case, continuous thrust for
 * `SCORE_TIME_PAR_MS` (this project's own "reference descent time," already
 * used the same way to tune hazard drain rates — see `planets/bodies.ts`'s
 * Pyrrhal Shallows), plus any passive corrosive drain over that same
 * window. Reads as a pessimistic pre-flight estimate, not a guarantee: a
 * skilled pilot burning less than continuously will do better than this
 * number suggests, matching how `twrBand`'s "risky" tier already reads as
 * "flyable, but tight" rather than a hard verdict.
 *
 * Deliberately NOT reused by `missions/relay.ts`'s hard feasibility gate
 * (Milestone 9.5): this estimate assumes continuous thrust for the whole
 * reference *flight* duration, calibrated as an always-fires soft warning
 * (see this function's own test file — even a doubled fuel capacity barely
 * clears it), which is fine for an advisory warning but would make every
 * relay in this game permanently infeasible if reused as a hard gate.
 * `relay.ts` estimates its two flown descent *legs* against a shorter,
 * separately-named braking-burn reference instead — see that file's own
 * `RELAY_DESCENT_BRAKING_SECONDS` doc comment.
 */
function estimateFuelNeeded(ship: ShipClass, passiveDrainRate: number): number {
  const referenceDescentSeconds = SCORE_TIME_PAR_MS / MILLISECONDS_PER_SECOND;
  return (ship.burnRate + passiveDrainRate) * referenceDescentSeconds;
}

/** The loadout's single most-effective weapon by raw damage, or `null` if
 * none is equipped — a simple, documented heuristic (not a full per-
 * encounter optimization over every equipped weapon) for this advisory
 * estimate: a real pilot can cycle (M9's Q key) to whichever weapon they
 * want mid-flight, so "the best one carried" is the fit-relevant question,
 * not "whichever happens to be active right now." */
function bestCarriedWeapon(loadout: readonly EquipmentItem[]): SimulatedWeapon | null {
  const weapons = loadout.filter(
    (item): item is Extract<EquipmentItem, { slotType: 'weapon' }> => item.slotType === 'weapon',
  );
  if (weapons.length === 0) {
    return null;
  }
  const strongest = weapons.reduce((best, item) => (item.damage > best.damage ? item : best));
  return { damage: strongest.damage, cooldownMs: strongest.cooldownMs };
}

/**
 * Milestone 11's real combat branch: `base.encounters.length === 0` for
 * every base authored before this milestone (`Base.encounters`'s own doc
 * comment) stays `'not-applicable'`, unchanged; a non-empty roster is
 * simulated via `combat/encounter.ts`'s `simulateEncounter` against the
 * loadout's best carried weapon and its summarized passive shield effect —
 * `cleared` requires every one of the base's encounters to clear, and
 * `hullRemaining` is the worst (lowest) result across them, matching this
 * project's "pessimistic advisory" philosophy elsewhere in this file
 * (`estimateFuelNeeded`'s own doc comment).
 */
function resolveCombatOutcome(
  base: Base,
  loadout: readonly EquipmentItem[],
  passiveEffects: EquippedPassiveEffects,
): BaseFitResult['combatOutcome'] {
  if (base.encounters.length === 0) {
    return 'not-applicable';
  }
  const weapon = bestCarriedWeapon(loadout);
  const results = base.encounters.map((encounter) =>
    simulateEncounter(encounter, weapon, passiveEffects.shieldHitsAvailable, SHIP_BASE_HULL_POINTS),
  );
  return {
    cleared: results.every((result) => result.cleared),
    hullRemaining: Math.min(...results.map((result) => result.hullRemaining)),
  };
}

/**
 * The three-branch facade (PLAN.md §6b.2): mechanical (thrust-to-weight,
 * fuel margin), spatial (handling), and combat (`'not-applicable'` for a
 * base with no encounters, otherwise `resolveCombatOutcome`'s real
 * `simulateEncounter` estimate). `upgrades`/`loadout` are folded onto
 * `ship` via `applyPermanentUpgrades`/`equipment.ts`'s mass-and-passive-
 * effect math before any comparison against `base.requirements`, so this
 * is the one place those thresholds are ever evaluated against a ship's
 * stats — never a second, independently computed verdict elsewhere.
 */
export function evaluateBaseFit(
  ship: ShipClass,
  upgrades: readonly PermanentUpgrade[],
  loadout: readonly EquipmentItem[],
  body: CelestialBody,
  base: Base,
): BaseFitResult {
  const upgradedShip = applyPermanentUpgrades(ship, upgrades);
  const carriedMass = totalCarriedMass(loadout);
  const passiveEffects = summarizePassiveEffects(loadout);

  const accel = effectiveThrustAccel(upgradedShip, carriedMass);
  const twr = accel / body.gravityAccel;
  const twrBand = bandFor(twr, base.requirements.minTWR);

  const effectiveFuelCapacity = upgradedShip.fuelCapacity + passiveEffects.fuelCapacityBonus;
  const passiveDrainRate =
    body.hazard?.type === 'corrosive' && !passiveEffects.corrosionResistant
      ? body.hazard.fuelDrainRate
      : 0;
  const fuelMarginRatio =
    effectiveFuelCapacity / estimateFuelNeeded(upgradedShip, passiveDrainRate);

  const handlingBand: FitBand | 'not-applicable' =
    base.requirements.handling === null
      ? 'not-applicable'
      : bandFor(upgradedShip.handling, base.requirements.handling);

  const combatOutcome = resolveCombatOutcome(base, loadout, passiveEffects);

  const warnings: string[] = [];
  if (twrBand === 'impossible') {
    warnings.push(
      "Thrust-to-weight ratio is below this base's minimum -- landing is not completable.",
    );
  } else if (twrBand === 'risky') {
    warnings.push(
      'Thrust-to-weight ratio is tight for this base -- flyable, but with little margin.',
    );
  }
  if (fuelMarginRatio < FUEL_MARGIN_WARNING_THRESHOLD) {
    warnings.push('Estimated fuel margin is insufficient for a full-thrust descent at this base.');
  }
  if (handlingBand === 'impossible') {
    warnings.push(
      "Handling is below this base's minimum -- precise maneuvers are not completable.",
    );
  } else if (handlingBand === 'risky') {
    warnings.push('Handling is tight for this base -- flyable, but with little margin.');
  }

  const ownedTags = new Set([
    ...upgrades.flatMap((upgrade) => upgrade.tags),
    ...loadout.flatMap((item) => item.tags),
  ]);
  const missingHazardCounters = base.requirements.hazardCounterTags.filter(
    (tag) => !ownedTags.has(tag),
  );
  if (missingHazardCounters.length > 0) {
    warnings.push(`No countermeasure equipped for: ${missingHazardCounters.join(', ')}.`);
  }

  return { twr, twrBand, fuelMarginRatio, handlingBand, combatOutcome, warnings };
}
