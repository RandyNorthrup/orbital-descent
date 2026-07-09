import type { CargoManifest } from './cargo';
import {
  isTargetMet,
  isTimeExpired,
  recordDelivery,
  resolveFinalStatus,
  type MissionState,
  type MissionStatus,
} from './mission';

export interface TripResolution {
  readonly missionState: MissionState;
  /** Non-`null` once the mission concludes as a result of this trip/leg —
   * the caller (`GameScene`/world-map orchestration) stops offering further
   * trips and shows this as the mission's outcome. `null` means the mission
   * is still active (offer another trip/leg to the same mission). */
  readonly missionStatus: MissionStatus | null;
}

/**
 * Resolves what a single trip/leg's flight outcome means for its mission —
 * whether to credit this trip's delivered cargo, and whether the mission
 * concludes here. The one place this branching lives, so `GameScene` only
 * calls this with plain data (outcome, this trip's manifest/reward/score,
 * the current wall-clock time) and renders whatever it returns, matching
 * this project's "scenes render state, they don't compute it" rule
 * (AGENTS.md) — `GameScene` never re-implements any of this itself.
 *
 * Cargo is credited only on a confirmed safe touchdown that arrives before
 * the mission-wide timer expires (PLAN.md §9.5.2's touchdown-only
 * invariant, and §9.5.3 point 4's timer-expiry-suppresses-crediting rule —
 * `isTimeExpired` is a pure function of wall-clock time against
 * `missionState.startedAtMs`, so checking it once here at resolution time,
 * rather than continuously polling a latched flag during flight, already
 * captures "the instant the timer hit zero" correctly: once true it can
 * never un-become true).
 *
 * A mission concludes the moment its own completion requirement is met
 * (`isTargetMet`) — this single rule already covers every structure
 * without special-casing any of them: `'single-trip'` always meets or
 * fails its requirement after its one and only trip (so it is also given
 * an unconditional "always concludes" rule below, since a failed
 * single-trip attempt has nothing further to credit); `'relay'`'s origin
 * (cargo-pickup) leg delivers an empty manifest and so is never met yet,
 * correctly leaving the mission active until its destination leg actually
 * meets `minManifest`; `'multi-trip-same-base'` stays active across
 * however many trips its cumulative `cargoTarget` takes.
 *
 * Otherwise (a crash under any policy other than
 * `crashPolicy: 'loseTripOnly'`, or a safe landing that arrived after the
 * timer already expired), the mission concludes now without crediting this
 * trip.
 */
export function resolveTripOutcome(
  missionState: MissionState,
  safe: boolean,
  manifestThisTrip: CargoManifest,
  cargoRewardThisTrip: number,
  scoreThisTrip: number,
  nowMs: number,
): TripResolution {
  const { structure, crashPolicy } = missionState.definition;
  const timerExpired = isTimeExpired(missionState, nowMs);

  if (safe && !timerExpired) {
    const updated = recordDelivery(
      missionState,
      manifestThisTrip,
      cargoRewardThisTrip,
      scoreThisTrip,
    );
    const concludes = structure === 'single-trip' || isTargetMet(updated);
    return { missionState: updated, missionStatus: concludes ? resolveFinalStatus(updated) : null };
  }

  if (
    !safe &&
    structure === 'multi-trip-same-base' &&
    crashPolicy === 'loseTripOnly' &&
    !timerExpired
  ) {
    return { missionState, missionStatus: null };
  }

  if (!safe && structure === 'single-trip') {
    // Single-trip is strictly binary (PLAN.md §9.5.2): a crash is always
    // 'failure', never resolved via resolveFinalStatus/isTargetMet. Those
    // check meetsMinManifest, which is vacuously true when minManifest is
    // empty (Resupply flavor's intentional "no minimum" — §9.5.4) — a
    // valid success signal only after the safe branch above has actually
    // recorded a delivery, never a substitute for "did this trip land
    // safely at all." Without this branch, a Resupply single-trip mission
    // crash incorrectly resolved as 'success' against the mission's own
    // untouched (zeroed) `delivered`, since `meetsMinManifest(zero, {})`
    // is trivially true.
    return { missionState, missionStatus: 'failure' };
  }

  return { missionState, missionStatus: resolveFinalStatus(missionState) };
}
