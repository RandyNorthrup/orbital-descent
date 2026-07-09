import {
  cargoMass,
  EMPTY_MANIFEST,
  meetsMinManifest,
  type CargoManifest,
  type CargoType,
  type MinManifest,
} from './cargo';

/**
 * The three mission structures (PLAN.md §9.5.2), sharing this one
 * `MissionDefinition`/`MissionState` shape so flavor, progression, and
 * achievement logic don't need to know or care which structure produced a
 * given landing.
 *
 * @public every `MissionDefinition` authors `structure` as a plain string
 * literal (`mission-offers.ts`), satisfying this type structurally without
 * importing it by name — not dead code, matches `bases/base.ts`'s
 * `HandlingBand`/`WeaponTier` precedent for a field's type alias with no
 * by-name importer yet.
 */
export type MissionStructure = 'single-trip' | 'multi-trip-same-base' | 'relay';

/** The two mission flavors (PLAN.md §9.5.4), orthogonal to `MissionStructure`
 * above. */
export type MissionFlavor = 'establish-presence' | 'resupply';

/** Multi-trip-same-base only (PLAN.md §9.5.2): whether a crash ends the
 * mission early with partial progress banked, or merely loses that one
 * trip's cargo while the mission clock keeps running. Relay legs have no
 * equivalent choice — a crash on either leg always ends the mission
 * (PLAN.md §9.5.8 item 7), so `MissionDefinition.crashPolicy` is `null` for
 * that structure.
 *
 * @public every multi-trip `MissionDefinition` authors `crashPolicy` as a
 * plain string literal (`mission-offers.ts`), satisfying this type
 * structurally without importing it by name — not dead code, same
 * `HandlingBand`/`WeaponTier` precedent as `MissionStructure` above. */
export type CrashPolicy = 'endMission' | 'loseTripOnly';

/** What a mission resolved to — deliberately has no `'active'` member.
 * "Still in progress" isn't a property of `MissionState` itself; it's a
 * decision the caller (world-map/mission orchestration) makes about
 * *when* to ask `resolveFinalStatus` at all (on target-met, on time-expiry,
 * or on a crash under `crashPolicy: 'endMission'`). */
export type MissionStatus = 'success' | 'partial' | 'failure';

/** Multi-trip-same-base's one cumulative target (PLAN.md §9.5.7 Example C
 * targets 60 supply units) — a single cargo type, matching every mission
 * this project ships; a future mission needing a multi-type cumulative
 * target is a real, currently out-of-scope extension of this shape.
 *
 * @public every multi-trip `MissionDefinition` authors `cargoTarget` as a
 * plain object literal (`mission-offers.ts`'s `buildMultiTripResupplyMission`),
 * satisfying this interface structurally without importing it by name —
 * not dead code, same precedent as this file's other `@public` types. */
export interface MultiTripCargoTarget {
  readonly type: CargoType;
  readonly units: number;
}

export interface MissionDefinition {
  readonly id: string;
  readonly structure: MissionStructure;
  readonly flavor: MissionFlavor;
  /** The base this mission is launched from — for `'single-trip'`/
   * `'multi-trip-same-base'`, also the target being established/resupplied. */
  readonly originBaseId: string;
  /** Non-`null` only for `'relay'` — the base cargo is carried to. */
  readonly destinationBaseId: string | null;
  /** `'single-trip'`/`'relay'`'s completion requirement — checked against
   * the one payload delivered. Unused (always `{}`) for
   * `'multi-trip-same-base'`, which uses `cargoTarget` instead. */
  readonly minManifest: MinManifest;
  /** `'multi-trip-same-base'` only. */
  readonly cargoTarget: MultiTripCargoTarget | null;
  /** `'multi-trip-same-base'` only, in ms — the mission-wide countdown that
   * runs continuously regardless of how many trips happen inside it. */
  readonly timeLimitMs: number | null;
  /** `'multi-trip-same-base'` only. */
  readonly crashPolicy: CrashPolicy | null;
}

/**
 * A mission's live, in-progress state — lives on `this.registry` (Phaser's
 * game-global `DataManager`) while a mission is underway, per PLAN.md
 * §9.5.3 point 6; never itself Phaser-dependent. `startedAtMs` is an actual
 * wall-clock timestamp (not an accumulated tick counter) since the
 * mission-wide timer must keep running even while the player is on the
 * world-map screen between trips, not just while a `GameScene` is
 * ticking — matches `persistence/high-scores.ts`'s existing convention of
 * taking an explicit epoch-ms parameter rather than calling `Date.now()`
 * internally, so this stays deterministically testable.
 */
export interface MissionState {
  readonly definition: MissionDefinition;
  readonly startedAtMs: number;
  /** Cumulative across every credited trip/leg so far. */
  readonly delivered: CargoManifest;
  /** Cumulative `perTripCargoReward` across every credited trip/leg —
   * `reward.ts`'s `missionReward` sums this against the mission-wide
   * flavor multiplier once, on resolution. */
  readonly cargoRewardAccumulated: number;
  /** Cumulative Milestone 4 `calculateScore` output across every credited
   * trip/leg. */
  readonly scoreAccumulated: number;
}

export function createMissionState(
  definition: MissionDefinition,
  startedAtMs: number,
): MissionState {
  return {
    definition,
    startedAtMs,
    delivered: EMPTY_MANIFEST,
    cargoRewardAccumulated: 0,
    scoreAccumulated: 0,
  };
}

/**
 * Credits one trip/leg's delivered cargo and rewards — the single place
 * this ever happens, called from exactly one branch (a confirmed safe
 * touchdown at the correct base/pad, PLAN.md §9.5.2's touchdown-only
 * invariant), never from a timer-expiry or crash branch. Pure: returns a
 * new `MissionState`, doesn't mutate `state`.
 */
export function recordDelivery(
  state: MissionState,
  unitsThisTrip: CargoManifest,
  cargoRewardThisTrip: number,
  scoreThisTrip: number,
): MissionState {
  return {
    ...state,
    delivered: {
      troops: state.delivered.troops + unitsThisTrip.troops,
      supplies: state.delivered.supplies + unitsThisTrip.supplies,
    },
    cargoRewardAccumulated: state.cargoRewardAccumulated + cargoRewardThisTrip,
    scoreAccumulated: state.scoreAccumulated + scoreThisTrip,
  };
}

/**
 * Whether `state.delivered` already satisfies this mission's completion
 * requirement — `'multi-trip-same-base'` compares against its cumulative
 * `cargoTarget`; `'single-trip'`/`'relay'` compare against `minManifest`.
 */
export function isTargetMet(state: MissionState): boolean {
  const { structure, minManifest, cargoTarget } = state.definition;
  if (structure === 'multi-trip-same-base') {
    if (cargoTarget === null) {
      throw new Error('isTargetMet: multi-trip-same-base mission is missing its cargoTarget.');
    }
    return state.delivered[cargoTarget.type] >= cargoTarget.units;
  }
  if (structure === 'relay') {
    // A relay's origin/pickup leg always credits an `EMPTY_MANIFEST`
    // (`mission-trip.ts`'s `resolveTripOutcome`, PLAN.md §9.5.3) precisely
    // so it can never conclude the relay by itself — only the destination
    // leg's real manifest should. That relies on `meetsMinManifest` being
    // false for zero cargo, which holds for Establish Presence relays
    // (`minManifest` names real troops) but not Resupply ones, whose
    // `minManifest` is `{}` (matching single-trip Resupply's intentional
    // "no minimum" rule) and so is trivially satisfied by nothing at all.
    // Requiring nonzero delivered mass closes that gap for relay without
    // changing single-trip Resupply's own zero-cargo-succeeds behavior.
    return cargoMass(state.delivered) > 0 && meetsMinManifest(state.delivered, minManifest);
  }
  return meetsMinManifest(state.delivered, minManifest);
}

/** `'multi-trip-same-base'` only — always `false` for the other two
 * structures (`timeLimitMs` is `null` for both). */
export function isTimeExpired(state: MissionState, nowMs: number): boolean {
  const { timeLimitMs } = state.definition;
  return timeLimitMs !== null && nowMs - state.startedAtMs >= timeLimitMs;
}

/**
 * `'success'` once `isTargetMet`; otherwise `'single-trip'`/`'relay'`
 * resolve straight to `'failure'` (strictly binary, PLAN.md §9.5.2 — no
 * partial concept for either structure); `'multi-trip-same-base'` resolves
 * to `'partial'` if any cargo was delivered at all, `'failure'` only if
 * none was. Callers decide *when* to call this (target met, time expired,
 * or a crash under `crashPolicy: 'endMission'`) — it doesn't decide that
 * itself.
 */
export function resolveFinalStatus(state: MissionState): MissionStatus {
  if (isTargetMet(state)) {
    return 'success';
  }
  if (state.definition.structure !== 'multi-trip-same-base') {
    return 'failure';
  }
  const deliveredAny = state.delivered.troops > 0 || state.delivered.supplies > 0;
  return deliveredAny ? 'partial' : 'failure';
}
