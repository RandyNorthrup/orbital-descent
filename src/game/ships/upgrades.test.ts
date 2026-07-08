import { describe, expect, it } from 'vitest';
import { applyPermanentUpgrades, findUpgradeById, UPGRADES } from './upgrades';
import { SHIPS } from './ships';

describe('UPGRADES registry', () => {
  it('has a unique id for every upgrade', () => {
    const ids = UPGRADES.map((upgrade) => upgrade.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('findUpgradeById', () => {
  it('returns the matching upgrade', () => {
    expect(findUpgradeById('stronger-engines').name).toBe('Stronger Engines');
  });

  it('throws for an unknown id', () => {
    expect(() => findUpgradeById('nonexistent')).toThrow(/nonexistent/);
  });
});

describe('applyPermanentUpgrades', () => {
  const falcon = SHIPS[0];

  it('returns the ship unchanged when given no upgrades', () => {
    expect(applyPermanentUpgrades(falcon, [])).toEqual(falcon);
  });

  it('adds a single upgrade stat modification', () => {
    const strongerEngines = findUpgradeById('stronger-engines');
    const upgraded = applyPermanentUpgrades(falcon, [strongerEngines]);
    expect(upgraded.baseThrustAccel).toBe(falcon.baseThrustAccel + strongerEngines.amount);
    // Every other stat is untouched.
    expect(upgraded.dryMass).toBe(falcon.dryMass);
    expect(upgraded.fuelCapacity).toBe(falcon.fuelCapacity);
  });

  it('composes multiple upgrades additively, including negative-amount ones', () => {
    const lighterHull = findUpgradeById('lighter-hull-alloy');
    const extendedFuel = findUpgradeById('extended-fuel-cells');
    const upgraded = applyPermanentUpgrades(falcon, [lighterHull, extendedFuel]);
    expect(upgraded.dryMass).toBe(falcon.dryMass + lighterHull.amount);
    expect(upgraded.fuelCapacity).toBe(falcon.fuelCapacity + extendedFuel.amount);
  });

  it('does not mutate the input ship', () => {
    const snapshot = { ...falcon };
    applyPermanentUpgrades(falcon, [findUpgradeById('efficient-injectors')]);
    expect(falcon).toEqual(snapshot);
  });

  it('every registered upgrade keeps every ship class stat positive when applied alone', () => {
    for (const ship of SHIPS) {
      for (const upgrade of UPGRADES) {
        const upgraded = applyPermanentUpgrades(ship, [upgrade]);
        expect(upgraded.dryMass).toBeGreaterThan(0);
        expect(upgraded.burnRate).toBeGreaterThan(0);
      }
    }
  });
});
