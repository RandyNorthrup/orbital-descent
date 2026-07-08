import { describe, expect, it } from 'vitest';
import { SHIPS, findShipById } from './ships';
import { BASES } from '../bases/bases';

describe('SHIPS', () => {
  it('has exactly 7 entries: 5 starters + 1 purchase + 1 unlock', () => {
    expect(SHIPS).toHaveLength(7);
    const byType = { starter: 0, purchase: 0, unlock: 0 };
    for (const ship of SHIPS) {
      byType[ship.acquisition.type] += 1;
    }
    expect(byType).toEqual({ starter: 5, purchase: 1, unlock: 1 });
  });

  it('has a unique id and name for every ship', () => {
    const ids = new Set(SHIPS.map((ship) => ship.id));
    const names = new Set(SHIPS.map((ship) => ship.name));
    expect(ids.size).toBe(SHIPS.length);
    expect(names.size).toBe(SHIPS.length);
  });

  it('gives every ship strictly positive core stats', () => {
    for (const ship of SHIPS) {
      expect(ship.dryMass).toBeGreaterThan(0);
      expect(ship.baseThrustAccel).toBeGreaterThan(0);
      expect(ship.fuelCapacity).toBeGreaterThan(0);
      expect(ship.burnRate).toBeGreaterThan(0);
      expect(ship.handling).toBeGreaterThan(0);
      expect(ship.equipmentSlots).toBeGreaterThan(0);
      expect(ship.massBudget).toBeGreaterThan(0);
      expect(ship.fuelPerDistanceUnit).toBeGreaterThan(0);
      // cargoBayCapacity alone is documented as validly 0 (a pure-combat
      // class with no cargo bay) -- none of this roster's ships use that,
      // but the check below only asserts non-negative, matching the type's
      // own contract rather than this roster's incidental choices.
      expect(ship.cargoBayCapacity).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every ship a distinct full stat configuration', () => {
    const signatures = new Set(SHIPS.map((ship) => JSON.stringify(ship)));
    expect(signatures.size).toBe(SHIPS.length);
  });

  it('prices every purchase-type ship above zero', () => {
    for (const ship of SHIPS) {
      if (ship.acquisition.type === 'purchase') {
        expect(ship.acquisition.price).toBeGreaterThan(0);
      }
    }
  });

  it('points every unlock-type ship at a real base id in BASES, with a non-empty description', () => {
    const baseIds = new Set(BASES.map((base) => base.id));
    for (const ship of SHIPS) {
      if (ship.acquisition.type === 'unlock') {
        expect(baseIds.has(ship.acquisition.requiredBaseId)).toBe(true);
        expect(ship.acquisition.description.length).toBeGreaterThan(0);
      }
    }
  });

  // Pin test: Falcon is this project's default ship (`SHIPS[0]`,
  // `persistence/ship-progress.ts`'s fresh-save default), and its four
  // flight-relevant stats reproduce Milestones 1-6's certified global
  // constants exactly -- every e2e test written before ship selection
  // existed depends on these values without importing this module at all
  // (see `e2e/high-scores.spec.ts`'s own `ROTATE_HOLD_MS` comment). A
  // casual future rebalance of Falcon specifically would silently break
  // those tests without this pin.
  it('keeps Falcon (the default ship) matching the pre-Milestone-7 certified constants', () => {
    const falcon = findShipById('falcon');
    expect(falcon.baseThrustAccel).toBe(46);
    expect(falcon.fuelCapacity).toBe(100);
    expect(falcon.burnRate).toBe(18);
    expect(falcon.handling).toBe(150);
  });

  it('is Falcon first, so SHIPS[0] is the default ship', () => {
    expect(SHIPS[0].id).toBe('falcon');
  });

  // Pin test: PLAN.md §9.5.7's worked-example table (Examples A-F's
  // relay/cargo arithmetic) depends on Scout/Courier/Hauler's exact
  // dryMass/baseThrustAccel/massBudget/cargoBayCapacity/equipmentSlots/
  // fuelCapacity/fuelPerDistanceUnit values, the same reason
  // `bases.test.ts` pins BASES' Milestone-9.5-load-bearing fields. A
  // casual future rebalance of any of these three ships would pass every
  // other test in this file (positive-stats, uniqueness, distinct-
  // signature) while silently invalidating §9.5.7's worked examples.
  describe('pins the PLAN.md §9.5.7 worked-example fields of Scout/Courier/Hauler', () => {
    it('scout', () => {
      const scout = findShipById('scout');
      expect(scout.dryMass).toBe(250);
      expect(scout.baseThrustAccel).toBe(54);
      expect(scout.massBudget).toBe(90);
      expect(scout.cargoBayCapacity).toBe(60);
      expect(scout.equipmentSlots).toBe(2);
      expect(scout.fuelCapacity).toBe(140);
      expect(scout.fuelPerDistanceUnit).toBe(1.4);
    });

    it('courier', () => {
      const courier = findShipById('courier');
      expect(courier.dryMass).toBe(400);
      expect(courier.baseThrustAccel).toBe(46);
      expect(courier.massBudget).toBe(200);
      expect(courier.cargoBayCapacity).toBe(160);
      expect(courier.equipmentSlots).toBe(3);
      expect(courier.fuelCapacity).toBe(180);
      expect(courier.fuelPerDistanceUnit).toBe(1.0);
    });

    it('hauler', () => {
      const hauler = findShipById('hauler');
      expect(hauler.dryMass).toBe(650);
      expect(hauler.baseThrustAccel).toBe(40);
      expect(hauler.massBudget).toBe(380);
      expect(hauler.cargoBayCapacity).toBe(340);
      expect(hauler.equipmentSlots).toBe(4);
      expect(hauler.fuelCapacity).toBe(260);
      expect(hauler.fuelPerDistanceUnit).toBe(0.75);
    });
  });
});

describe('findShipById', () => {
  it('returns the matching ShipClass for a real id', () => {
    expect(findShipById('hauler')).toBe(SHIPS.find((ship) => ship.id === 'hauler'));
  });

  it('throws a clear error for an id not in SHIPS', () => {
    expect(() => findShipById('nonexistent-ship')).toThrow(/nonexistent-ship/);
  });
});
