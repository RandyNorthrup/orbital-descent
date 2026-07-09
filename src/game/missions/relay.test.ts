import { describe, expect, it } from 'vitest';
import {
  RELAY_REASON_CARGO_BAY,
  RELAY_REASON_FUEL_RANGE,
  RELAY_REASON_MASS_BUDGET,
  relayFeasibility,
  remainingFuelAfterTransit,
  transitDistanceTU,
  transitFuelCost,
} from './relay';
import { BASES, findBodyById } from '../bases/bases';
import { findShipById } from '../ships/ships';
import { EMPTY_MANIFEST, type CargoManifest } from './cargo';

function findBase(id: string): (typeof BASES)[number] {
  const base = BASES.find((candidate) => candidate.id === id);
  if (!base) {
    throw new Error(`test setup error: no base '${id}'`);
  }
  return base;
}

describe('transitDistanceTU', () => {
  it('uses |localOffset delta| for a same-world pair (PLAN.md §9.5.7 Example D)', () => {
    const anchor = findBase('anchor-station');
    const scarp = findBase('scarp-outpost');
    const kesselsReach = findBodyById('kessels-reach');
    expect(transitDistanceTU(anchor, kesselsReach, scarp, kesselsReach)).toBeCloseTo(2.4);
  });

  it('uses |CelestialBody.distance delta| for a cross-world pair (PLAN.md §9.5.7 Example E)', () => {
    const meridian = findBase('meridian-yard');
    const rustwell = findBase('rustwell-landing');
    const verdalis = findBodyById('verdalis');
    const pyrrhineExpanse = findBodyById('pyrrhine-expanse');
    expect(transitDistanceTU(meridian, verdalis, rustwell, pyrrhineExpanse)).toBe(
      Math.abs(95 - 42),
    );
  });
});

describe('transitFuelCost', () => {
  const courier = findShipById('courier'); // dryMass 400, fuelPerDistanceUnit 1.0

  it('matches PLAN.md §9.5.7 Example D exactly: distance 2.4, 100 MU carried', () => {
    expect(transitFuelCost(2.4, courier, 100)).toBeCloseTo(11.0);
  });

  it('scales with distance', () => {
    expect(transitFuelCost(10, courier, 0)).toBeGreaterThan(transitFuelCost(5, courier, 0));
  });

  it('scales with carried mass (heavier load = costlier transit)', () => {
    expect(transitFuelCost(50, courier, 300)).toBeGreaterThan(transitFuelCost(50, courier, 0));
  });

  it('always includes the flat TRANSIT_LAUNCH_OVERHEAD even at zero distance/mass', () => {
    expect(transitFuelCost(0, courier, 0)).toBe(8);
  });
});

describe('remainingFuelAfterTransit', () => {
  it('subtracts the transit cost from the touchdown reserve', () => {
    expect(remainingFuelAfterTransit(50, 11)).toBe(39);
  });

  it('goes negative when the transit would strand the ship (PLAN.md §9.5.2)', () => {
    expect(remainingFuelAfterTransit(5, 11)).toBe(-6);
  });

  it('is exactly zero at the boundary (not itself stranded)', () => {
    expect(remainingFuelAfterTransit(11, 11)).toBe(0);
  });
});

describe('relayFeasibility', () => {
  const kesselsReach = findBodyById('kessels-reach'); // no hazard
  const glacianDrift = findBodyById('glacian-drift'); // cold hazard (no fuel-drain effect)
  const heavyManifest: CargoManifest = { troops: 30, supplies: 0 }; // 300 MU

  it('is feasible with no reasons when every gate clears (Scout, empty manifest, short hop)', () => {
    const scout = findShipById('scout');
    const result = relayFeasibility(scout, 0, EMPTY_MANIFEST, kesselsReach, kesselsReach, 1, false);
    expect(result.feasible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('fails only the cargo-bay gate when manifest mass exceeds cargoBayCapacity but not massBudget', () => {
    // Scout: cargoBayCapacity 60, massBudget 90. 7 troop squads = 70 MU.
    const scout = findShipById('scout');
    const manifest: CargoManifest = { troops: 7, supplies: 0 };
    const result = relayFeasibility(scout, 0, manifest, kesselsReach, kesselsReach, 0, false);
    expect(result.reasons).toContain(RELAY_REASON_CARGO_BAY);
    expect(result.reasons).not.toContain(RELAY_REASON_MASS_BUDGET);
  });

  it('fails only the mass-budget gate when equipment + cargo exceeds massBudget but cargo alone fits the bay', () => {
    // Scout: cargoBayCapacity 60, massBudget 90. 5 troop squads = 50 MU fits the bay,
    // but + 45 equipment = 95 > 90 massBudget.
    const scout = findShipById('scout');
    const manifest: CargoManifest = { troops: 5, supplies: 0 };
    const result = relayFeasibility(scout, 45, manifest, kesselsReach, kesselsReach, 0, false);
    expect(result.reasons).not.toContain(RELAY_REASON_CARGO_BAY);
    expect(result.reasons).toContain(RELAY_REASON_MASS_BUDGET);
  });

  it('fails only the fuel-range gate on a long-haul relay with an otherwise-fitting manifest', () => {
    // Hauler: cargoBayCapacity 340, massBudget 380 -- 300 MU manifest fits both,
    // but a very long distance exhausts fuelCapacity (260).
    const hauler = findShipById('hauler');
    const result = relayFeasibility(
      hauler,
      0,
      heavyManifest,
      kesselsReach,
      glacianDrift,
      5000,
      false,
    );
    expect(result.reasons).not.toContain(RELAY_REASON_CARGO_BAY);
    expect(result.reasons).not.toContain(RELAY_REASON_MASS_BUDGET);
    expect(result.reasons).toContain(RELAY_REASON_FUEL_RANGE);
  });

  it('can fail all three gates at once', () => {
    const scout = findShipById('scout');
    const result = relayFeasibility(
      scout,
      45,
      heavyManifest,
      kesselsReach,
      glacianDrift,
      5000,
      false,
    );
    expect(result.feasible).toBe(false);
    expect(result.reasons).toEqual([
      RELAY_REASON_CARGO_BAY,
      RELAY_REASON_MASS_BUDGET,
      RELAY_REASON_FUEL_RANGE,
    ]);
  });

  it('matches PLAN.md §9.5.7 Example F: infeasible on fuel range for the entire ship roster', () => {
    const rustwellLanding = findBase('rustwell-landing');
    const frostgate = findBase('frostgate');
    const pyrrhineExpanse = findBodyById('pyrrhine-expanse');
    const distanceTU = transitDistanceTU(rustwellLanding, pyrrhineExpanse, frostgate, glacianDrift);
    const manifest: CargoManifest = { troops: 30, supplies: 0 };

    for (const ship of [findShipById('scout'), findShipById('courier'), findShipById('hauler')]) {
      const result = relayFeasibility(
        ship,
        0,
        manifest,
        pyrrhineExpanse,
        glacianDrift,
        distanceTU,
        false,
      );
      expect(result.feasible).toBe(false);
    }
  });
});
