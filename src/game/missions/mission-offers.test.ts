import { describe, expect, it } from 'vitest';
import {
  RELAY_ROUTES,
  buildMultiTripResupplyMission,
  buildRelayMission,
  buildSingleTripMission,
  deriveMissionFlavor,
  findRelayRoute,
  isRelaySelectable,
} from './mission-offers';
import { BASES } from '../bases/bases';
import { establishBase, initialBaseProgress } from '../persistence/base-progress';

function findBase(id: string): (typeof BASES)[number] {
  const base = BASES.find((candidate) => candidate.id === id);
  if (!base) {
    throw new Error(`test setup error: no base '${id}'`);
  }
  return base;
}

describe('RELAY_ROUTES', () => {
  it('has a unique id for every route', () => {
    const ids = new Set(RELAY_ROUTES.map((route) => route.id));
    expect(ids.size).toBe(RELAY_ROUTES.length);
  });

  it('references real BASES ids for every origin/destination', () => {
    const baseIds = new Set(BASES.map((base) => base.id));
    for (const route of RELAY_ROUTES) {
      expect(baseIds.has(route.originBaseId)).toBe(true);
      expect(baseIds.has(route.destinationBaseId)).toBe(true);
    }
  });

  it('includes the required always-infeasible Rustwell Landing -> Frostgate route', () => {
    expect(RELAY_ROUTES.some((route) => route.id === 'rustwell-landing--frostgate')).toBe(true);
  });
});

describe('findRelayRoute', () => {
  it('returns the matching route for a real id', () => {
    expect(findRelayRoute('anchor-station--scarp-outpost').destinationBaseId).toBe('scarp-outpost');
  });

  it('throws a clear error for an unknown id', () => {
    expect(() => findRelayRoute('nonexistent-route')).toThrow(/nonexistent-route/);
  });
});

describe('isRelaySelectable', () => {
  const route = findRelayRoute('anchor-station--scarp-outpost');

  it('is true once both endpoints are at least discovered-unclaimed', () => {
    // A fresh save: anchor-station starts discovered-unclaimed, scarp-outpost locked.
    const progress = initialBaseProgress(BASES);
    expect(isRelaySelectable(route, BASES, progress)).toBe(false);
  });

  it('becomes true once the locked endpoint is discovered via establishBase', () => {
    // Establishing anchor-station unlocks scarp-outpost (its own `unlocks` list).
    const progress = establishBase(BASES, initialBaseProgress(BASES), 'anchor-station', 0);
    expect(isRelaySelectable(route, BASES, progress)).toBe(true);
  });

  it('is false when the route names a base id absent from the given roster', () => {
    const brokenRoute = {
      id: 'broken',
      originBaseId: 'no-such-base',
      destinationBaseId: 'scarp-outpost',
    };
    const progress = initialBaseProgress(BASES);
    expect(isRelaySelectable(brokenRoute, BASES, progress)).toBe(false);
  });
});

describe('deriveMissionFlavor', () => {
  it('maps discovered-unclaimed to establish-presence', () => {
    expect(deriveMissionFlavor('discovered-unclaimed')).toBe('establish-presence');
  });

  it('maps established to resupply', () => {
    expect(deriveMissionFlavor('established')).toBe('resupply');
  });

  it('maps locked to null (no mission offered)', () => {
    expect(deriveMissionFlavor('locked')).toBeNull();
  });
});

describe('buildSingleTripMission', () => {
  it("requires the base's own garrisonRequirement in troops for establish-presence", () => {
    const anchor = findBase('anchor-station');
    const mission = buildSingleTripMission(anchor, 'establish-presence');
    expect(mission.structure).toBe('single-trip');
    expect(mission.minManifest).toEqual({ troops: anchor.garrisonRequirement });
    expect(mission.originBaseId).toBe('anchor-station');
    expect(mission.destinationBaseId).toBeNull();
  });

  it('carries no manifest minimum for resupply', () => {
    const anchor = findBase('anchor-station');
    const mission = buildSingleTripMission(anchor, 'resupply');
    expect(mission.minManifest).toEqual({});
  });
});

describe('buildMultiTripResupplyMission', () => {
  it('targets the shared 60-supply / 5-minute template with loseTripOnly', () => {
    const meridian = findBase('meridian-yard');
    const mission = buildMultiTripResupplyMission(meridian);
    expect(mission.structure).toBe('multi-trip-same-base');
    expect(mission.flavor).toBe('resupply');
    expect(mission.cargoTarget).toEqual({ type: 'supplies', units: 60 });
    expect(mission.timeLimitMs).toBe(300000);
    expect(mission.crashPolicy).toBe('loseTripOnly');
  });
});

describe('buildRelayMission', () => {
  it("requires the destination's garrisonRequirement for an establish-presence relay", () => {
    const route = findRelayRoute('anchor-station--scarp-outpost');
    const scarp = findBase('scarp-outpost');
    const mission = buildRelayMission(route, scarp, 'establish-presence');
    expect(mission.structure).toBe('relay');
    expect(mission.originBaseId).toBe('anchor-station');
    expect(mission.destinationBaseId).toBe('scarp-outpost');
    expect(mission.minManifest).toEqual({ troops: scarp.garrisonRequirement });
  });

  it('carries no manifest minimum for a resupply relay', () => {
    const route = findRelayRoute('anchor-station--scarp-outpost');
    const scarp = findBase('scarp-outpost');
    const mission = buildRelayMission(route, scarp, 'resupply');
    expect(mission.minManifest).toEqual({});
  });
});
