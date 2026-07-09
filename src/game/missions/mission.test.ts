import { describe, expect, it } from 'vitest';
import {
  createMissionState,
  isTargetMet,
  isTimeExpired,
  recordDelivery,
  resolveFinalStatus,
  type MissionDefinition,
} from './mission';

const SINGLE_TRIP_ESTABLISH: MissionDefinition = {
  id: 'establish-anchor-station',
  structure: 'single-trip',
  flavor: 'establish-presence',
  originBaseId: 'anchor-station',
  destinationBaseId: null,
  minManifest: { troops: 6 },
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

const MULTI_TRIP_RESUPPLY: MissionDefinition = {
  id: 'resupply-meridian-yard',
  structure: 'multi-trip-same-base',
  flavor: 'resupply',
  originBaseId: 'meridian-yard',
  destinationBaseId: null,
  minManifest: {},
  cargoTarget: { type: 'supplies', units: 60 },
  timeLimitMs: 300000,
  crashPolicy: 'loseTripOnly',
};

const RELAY_ESTABLISH: MissionDefinition = {
  id: 'relay-anchor-to-scarp',
  structure: 'relay',
  flavor: 'establish-presence',
  originBaseId: 'anchor-station',
  destinationBaseId: 'scarp-outpost',
  minManifest: { troops: 10 },
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

/** A Resupply-flavored relay's `minManifest` is `{}` (matching
 * single-trip Resupply's "no minimum" rule) — the regression fixture for
 * the origin-leg-trivially-concludes-the-mission bug this file's
 * `isTargetMet` tests below pin the fix for. */
const RELAY_RESUPPLY: MissionDefinition = {
  id: 'relay-meridian-to-rustwell-resupply',
  structure: 'relay',
  flavor: 'resupply',
  originBaseId: 'meridian-yard',
  destinationBaseId: 'rustwell-landing',
  minManifest: {},
  cargoTarget: null,
  timeLimitMs: null,
  crashPolicy: null,
};

describe('createMissionState', () => {
  it('starts with zero delivered cargo and zero accumulated reward/score', () => {
    const state = createMissionState(SINGLE_TRIP_ESTABLISH, 1000);
    expect(state.delivered).toEqual({ troops: 0, supplies: 0 });
    expect(state.cargoRewardAccumulated).toBe(0);
    expect(state.scoreAccumulated).toBe(0);
    expect(state.startedAtMs).toBe(1000);
  });
});

describe('recordDelivery', () => {
  it('accumulates delivered cargo, cargo reward, and score without mutating the input state', () => {
    const before = createMissionState(SINGLE_TRIP_ESTABLISH, 0);
    const after = recordDelivery(before, { troops: 6, supplies: 0 }, 173, 620);

    expect(after.delivered).toEqual({ troops: 6, supplies: 0 });
    expect(after.cargoRewardAccumulated).toBe(173);
    expect(after.scoreAccumulated).toBe(620);
    // Original untouched.
    expect(before.delivered).toEqual({ troops: 0, supplies: 0 });
    expect(before.cargoRewardAccumulated).toBe(0);
  });

  it('sums across multiple calls (multi-trip accumulation)', () => {
    let state = createMissionState(MULTI_TRIP_RESUPPLY, 0);
    state = recordDelivery(state, { troops: 0, supplies: 20 }, 110, 500);
    state = recordDelivery(state, { troops: 0, supplies: 20 }, 110, 480);

    expect(state.delivered).toEqual({ troops: 0, supplies: 40 });
    expect(state.cargoRewardAccumulated).toBe(220);
    expect(state.scoreAccumulated).toBe(980);
  });
});

describe('isTargetMet', () => {
  it('single-trip: false below minManifest, true once met', () => {
    let state = createMissionState(SINGLE_TRIP_ESTABLISH, 0);
    expect(isTargetMet(state)).toBe(false);
    state = recordDelivery(state, { troops: 5, supplies: 0 }, 0, 0);
    expect(isTargetMet(state)).toBe(false);
    state = recordDelivery(state, { troops: 1, supplies: 0 }, 0, 0);
    expect(isTargetMet(state)).toBe(true);
  });

  it('relay: checked the same way as single-trip, against minManifest', () => {
    let state = createMissionState(RELAY_ESTABLISH, 0);
    expect(isTargetMet(state)).toBe(false);
    state = recordDelivery(state, { troops: 10, supplies: 0 }, 0, 0);
    expect(isTargetMet(state)).toBe(true);
  });

  it('multi-trip-same-base: compares cumulative delivered against cargoTarget.units for cargoTarget.type', () => {
    let state = createMissionState(MULTI_TRIP_RESUPPLY, 0);
    expect(isTargetMet(state)).toBe(false);
    state = recordDelivery(state, { troops: 0, supplies: 59 }, 0, 0);
    expect(isTargetMet(state)).toBe(false);
    state = recordDelivery(state, { troops: 0, supplies: 1 }, 0, 0);
    expect(isTargetMet(state)).toBe(true);
  });

  it('multi-trip-same-base throws if authored without a cargoTarget (data-integrity bug)', () => {
    const broken: MissionDefinition = { ...MULTI_TRIP_RESUPPLY, cargoTarget: null };
    const state = createMissionState(broken, 0);
    expect(() => isTargetMet(state)).toThrow(/cargoTarget/);
  });

  it('relay + resupply: an empty-manifest leg (the origin/pickup leg) never trivially meets an unconstrained minManifest', () => {
    const state = createMissionState(RELAY_RESUPPLY, 0);
    // Regression: minManifest is `{}` for Resupply relays, same as
    // single-trip Resupply's intentional "no minimum" — without the
    // cargoMass>0 guard in isTargetMet, this would incorrectly be true.
    expect(isTargetMet(state)).toBe(false);
  });

  it('relay + resupply: the destination leg meets the target once real cargo is delivered', () => {
    let state = createMissionState(RELAY_RESUPPLY, 0);
    state = recordDelivery(state, { troops: 0, supplies: 15 }, 0, 0);
    expect(isTargetMet(state)).toBe(true);
  });
});

describe('isTimeExpired', () => {
  it('is always false for a mission with no timeLimitMs (single-trip/relay)', () => {
    const state = createMissionState(SINGLE_TRIP_ESTABLISH, 0);
    expect(isTimeExpired(state, 10_000_000)).toBe(false);
  });

  it('is false before the limit and true at/after it, relative to startedAtMs', () => {
    const state = createMissionState(MULTI_TRIP_RESUPPLY, 1000);
    expect(isTimeExpired(state, 1000 + 299_999)).toBe(false);
    expect(isTimeExpired(state, 1000 + 300_000)).toBe(true);
    expect(isTimeExpired(state, 1000 + 400_000)).toBe(true);
  });
});

describe('resolveFinalStatus', () => {
  it('single-trip: success once minManifest met, failure otherwise (never partial)', () => {
    const met = recordDelivery(
      createMissionState(SINGLE_TRIP_ESTABLISH, 0),
      { troops: 6, supplies: 0 },
      0,
      0,
    );
    expect(resolveFinalStatus(met)).toBe('success');

    const unmet = recordDelivery(
      createMissionState(SINGLE_TRIP_ESTABLISH, 0),
      { troops: 5, supplies: 0 },
      0,
      0,
    );
    expect(resolveFinalStatus(unmet)).toBe('failure');
  });

  it('relay: success once minManifest met, failure otherwise (never partial)', () => {
    const met = recordDelivery(
      createMissionState(RELAY_ESTABLISH, 0),
      { troops: 10, supplies: 0 },
      0,
      0,
    );
    expect(resolveFinalStatus(met)).toBe('success');

    const zero = createMissionState(RELAY_ESTABLISH, 0);
    expect(resolveFinalStatus(zero)).toBe('failure');
  });

  it('multi-trip-same-base: success at target, partial with some progress, failure with none', () => {
    const success = recordDelivery(
      createMissionState(MULTI_TRIP_RESUPPLY, 0),
      { troops: 0, supplies: 60 },
      0,
      0,
    );
    expect(resolveFinalStatus(success)).toBe('success');

    const partial = recordDelivery(
      createMissionState(MULTI_TRIP_RESUPPLY, 0),
      { troops: 0, supplies: 20 },
      0,
      0,
    );
    expect(resolveFinalStatus(partial)).toBe('partial');

    const failure = createMissionState(MULTI_TRIP_RESUPPLY, 0);
    expect(resolveFinalStatus(failure)).toBe('failure');
  });
});
