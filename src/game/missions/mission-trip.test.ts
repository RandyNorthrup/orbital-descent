import { describe, expect, it } from 'vitest';
import { resolveTripOutcome } from './mission-trip';
import { createMissionState, type MissionDefinition } from './mission';
import { EMPTY_MANIFEST, type CargoManifest } from './cargo';

const SINGLE_TRIP: MissionDefinition = {
  id: 'single-trip--establish-presence--anchor-station',
  structure: 'single-trip',
  flavor: 'establish-presence',
  originBaseId: 'anchor-station',
  destinationBaseId: null,
  minManifest: { troops: 6 },
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

/** A Resupply-flavored single-trip's `minManifest` is `{}` (no minimum) —
 * regression fixture for the crash-trivially-resolves-as-success bug
 * `resolveTripOutcome`'s explicit `!safe && structure === 'single-trip'`
 * branch now guards against (a crash never reached resolveFinalStatus's
 * own isTargetMet check before, which — like relay's identical empty-
 * minManifest hazard — was vacuously true against the untouched, zeroed
 * `delivered` a crash never updates). */
const SINGLE_TRIP_RESUPPLY: MissionDefinition = {
  id: 'single-trip--resupply--meridian-yard',
  structure: 'single-trip',
  flavor: 'resupply',
  originBaseId: 'meridian-yard',
  destinationBaseId: null,
  minManifest: {},
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

const MULTI_TRIP_LOSE_TRIP_ONLY: MissionDefinition = {
  id: 'multi-trip--resupply--meridian-yard',
  structure: 'multi-trip-same-base',
  flavor: 'resupply',
  originBaseId: 'meridian-yard',
  destinationBaseId: null,
  minManifest: {},
  cargoTarget: { type: 'supplies', units: 60 },
  timeLimitMs: 300000,
  crashPolicy: 'loseTripOnly',
};

const MULTI_TRIP_END_MISSION: MissionDefinition = {
  ...MULTI_TRIP_LOSE_TRIP_ONLY,
  crashPolicy: 'endMission',
};

const RELAY: MissionDefinition = {
  id: 'relay--anchor-station--scarp-outpost',
  structure: 'relay',
  flavor: 'establish-presence',
  originBaseId: 'anchor-station',
  destinationBaseId: 'scarp-outpost',
  minManifest: { troops: 10 },
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

/** A Resupply-flavored relay's `minManifest` is `{}`, unlike `RELAY`
 * above — regression fixture for the origin-leg-trivially-concludes bug
 * (`mission.ts`'s `isTargetMet` guards against it with a `cargoMass > 0`
 * check specifically for `structure === 'relay'`). */
const RELAY_RESUPPLY: MissionDefinition = {
  id: 'relay--meridian-yard--rustwell-landing--resupply',
  structure: 'relay',
  flavor: 'resupply',
  originBaseId: 'meridian-yard',
  destinationBaseId: 'rustwell-landing',
  minManifest: {},
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

const TEN_TROOPS: CargoManifest = { troops: 10, supplies: 0 };
const SIX_TROOPS: CargoManifest = { troops: 6, supplies: 0 };
const TWENTY_SUPPLIES: CargoManifest = { troops: 0, supplies: 20 };

describe('resolveTripOutcome — single-trip', () => {
  it('safe landing meeting minManifest concludes success and credits the trip', () => {
    const state = createMissionState(SINGLE_TRIP, 0);
    const result = resolveTripOutcome(state, true, SIX_TROOPS, 173, 620, 1000);
    expect(result.missionStatus).toBe('success');
    expect(result.missionState.delivered).toEqual({ troops: 6, supplies: 0 });
    expect(result.missionState.cargoRewardAccumulated).toBe(173);
    expect(result.missionState.scoreAccumulated).toBe(620);
  });

  it('a crash concludes failure without crediting anything', () => {
    const state = createMissionState(SINGLE_TRIP, 0);
    const result = resolveTripOutcome(state, false, EMPTY_MANIFEST, 0, 0, 1000);
    expect(result.missionStatus).toBe('failure');
  });

  it('regression: a crash on a Resupply single-trip (minManifest {}) is still failure, never a vacuous success', () => {
    const state = createMissionState(SINGLE_TRIP_RESUPPLY, 0);
    const result = resolveTripOutcome(state, false, EMPTY_MANIFEST, 0, 0, 1000);
    expect(result.missionStatus).toBe('failure');
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
  });

  it('a safe landing on a Resupply single-trip with zero cargo still concludes success (intentional "no minimum" rule)', () => {
    const state = createMissionState(SINGLE_TRIP_RESUPPLY, 0);
    const result = resolveTripOutcome(state, true, EMPTY_MANIFEST, 0, 500, 1000);
    expect(result.missionStatus).toBe('success');
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
  });
});

describe('resolveTripOutcome — multi-trip-same-base', () => {
  it('a safe landing below the cumulative target credits the trip but stays active', () => {
    const state = createMissionState(MULTI_TRIP_LOSE_TRIP_ONLY, 0);
    const result = resolveTripOutcome(state, true, TWENTY_SUPPLIES, 110, 500, 1000);
    expect(result.missionStatus).toBeNull();
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 20 });
  });

  it('a safe landing that reaches the cumulative target concludes success', () => {
    let state = createMissionState(MULTI_TRIP_LOSE_TRIP_ONLY, 0);
    state = resolveTripOutcome(state, true, TWENTY_SUPPLIES, 110, 500, 1000).missionState;
    state = resolveTripOutcome(state, true, TWENTY_SUPPLIES, 110, 480, 2000).missionState;
    const result = resolveTripOutcome(state, true, TWENTY_SUPPLIES, 110, 470, 3000);
    expect(result.missionStatus).toBe('success');
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 60 });
  });

  it("a crash under 'loseTripOnly' loses this trip's cargo but keeps the mission active and the clock running", () => {
    const state = resolveTripOutcome(
      createMissionState(MULTI_TRIP_LOSE_TRIP_ONLY, 0),
      true,
      TWENTY_SUPPLIES,
      110,
      500,
      1000,
    ).missionState;
    const result = resolveTripOutcome(state, false, TWENTY_SUPPLIES, 110, 500, 2000);
    expect(result.missionStatus).toBeNull();
    // Unchanged from before the crash -- nothing credited.
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 20 });
    expect(result.missionState).toBe(state);
  });

  it("a crash under 'endMission' ends the mission immediately as 'partial' when some progress was already banked", () => {
    const state = resolveTripOutcome(
      createMissionState(MULTI_TRIP_END_MISSION, 0),
      true,
      TWENTY_SUPPLIES,
      110,
      500,
      1000,
    ).missionState;
    const result = resolveTripOutcome(state, false, TWENTY_SUPPLIES, 110, 500, 2000);
    expect(result.missionStatus).toBe('partial');
  });

  it("a crash under 'endMission' on the very first trip ends the mission as 'failure' (nothing ever delivered)", () => {
    const state = createMissionState(MULTI_TRIP_END_MISSION, 0);
    const result = resolveTripOutcome(state, false, TWENTY_SUPPLIES, 110, 500, 1000);
    expect(result.missionStatus).toBe('failure');
  });

  it('a safe landing that arrives after the mission timer already expired suppresses crediting and concludes now', () => {
    const state = createMissionState(MULTI_TRIP_LOSE_TRIP_ONLY, 0); // timeLimitMs 300000
    const result = resolveTripOutcome(state, true, TWENTY_SUPPLIES, 110, 500, 300_000);
    expect(result.missionStatus).toBe('failure'); // nothing was ever delivered
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
  });

  it('a crash that arrives after the mission timer already expired concludes now regardless of crashPolicy', () => {
    const state = resolveTripOutcome(
      createMissionState(MULTI_TRIP_LOSE_TRIP_ONLY, 0),
      true,
      TWENTY_SUPPLIES,
      110,
      500,
      1000,
    ).missionState;
    const result = resolveTripOutcome(state, false, TWENTY_SUPPLIES, 110, 500, 300_000);
    expect(result.missionStatus).toBe('partial');
  });
});

describe('resolveTripOutcome — relay', () => {
  it("the origin (pickup) leg's safe landing, with an empty manifest, credits nothing and stays active", () => {
    const state = createMissionState(RELAY, 0);
    const result = resolveTripOutcome(state, true, EMPTY_MANIFEST, 0, 500, 1000);
    expect(result.missionStatus).toBeNull();
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
    expect(result.missionState.scoreAccumulated).toBe(500);
  });

  it("the destination leg's safe landing, meeting minManifest, concludes success and credits the full payload", () => {
    const afterOrigin = resolveTripOutcome(
      createMissionState(RELAY, 0),
      true,
      EMPTY_MANIFEST,
      0,
      500,
      1000,
    ).missionState;
    const result = resolveTripOutcome(afterOrigin, true, TEN_TROOPS, 313, 700, 2000);
    expect(result.missionStatus).toBe('success');
    expect(result.missionState.delivered).toEqual({ troops: 10, supplies: 0 });
    expect(result.missionState.scoreAccumulated).toBe(1200);
  });

  it('a crash on either leg ends the mission as failure and loses the cargo (relay is always binary, no retry-in-place)', () => {
    const state = createMissionState(RELAY, 0);
    const result = resolveTripOutcome(state, false, TEN_TROOPS, 313, 0, 1000);
    expect(result.missionStatus).toBe('failure');
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
  });

  it("regression: a Resupply-flavored relay's origin leg (empty manifest, minManifest {}) must NOT trivially conclude success", () => {
    const state = createMissionState(RELAY_RESUPPLY, 0);
    const result = resolveTripOutcome(state, true, EMPTY_MANIFEST, 0, 500, 1000);
    expect(result.missionStatus).toBeNull();
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 0 });
  });

  it('a Resupply-flavored relay concludes success once the destination leg actually delivers cargo', () => {
    const afterOrigin = resolveTripOutcome(
      createMissionState(RELAY_RESUPPLY, 0),
      true,
      EMPTY_MANIFEST,
      0,
      500,
      1000,
    ).missionState;
    const result = resolveTripOutcome(afterOrigin, true, TWENTY_SUPPLIES, 144, 700, 2000);
    expect(result.missionStatus).toBe('success');
    expect(result.missionState.delivered).toEqual({ troops: 0, supplies: 20 });
  });
});
