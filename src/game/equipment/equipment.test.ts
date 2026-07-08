import { describe, expect, it } from 'vitest';
import {
  effectiveThrustAccel,
  EQUIPMENT_ITEMS,
  findEquipmentById,
  summarizePassiveEffects,
  totalCarriedMass,
  type EquipmentItem,
} from './equipment';
import { SHIPS } from '../ships/ships';

describe('EQUIPMENT_ITEMS registry', () => {
  it('has a unique id for every item', () => {
    const ids = EQUIPMENT_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes at least one weapon and one utility item', () => {
    expect(EQUIPMENT_ITEMS.some((item) => item.slotType === 'weapon')).toBe(true);
    expect(EQUIPMENT_ITEMS.some((item) => item.slotType === 'utility')).toBe(true);
  });

  it('includes at least one purchase-type and one unlock-type item', () => {
    expect(EQUIPMENT_ITEMS.some((item) => item.acquisition.type === 'purchase')).toBe(true);
    expect(EQUIPMENT_ITEMS.some((item) => item.acquisition.type === 'unlock')).toBe(true);
  });
});

describe('findEquipmentById', () => {
  it('returns the matching item', () => {
    expect(findEquipmentById('fuel-tank').name).toBe('Fuel Tank');
  });

  it('throws for an unknown id', () => {
    expect(() => findEquipmentById('nonexistent')).toThrow(/nonexistent/);
  });
});

describe('totalCarriedMass', () => {
  it('is 0 for an empty loadout', () => {
    expect(totalCarriedMass([])).toBe(0);
  });

  it('sums every equipped item’s mass', () => {
    const items: readonly EquipmentItem[] = [
      findEquipmentById('pulse-cannon'),
      findEquipmentById('fuel-tank'),
    ];
    expect(totalCarriedMass(items)).toBe(
      findEquipmentById('pulse-cannon').mass + findEquipmentById('fuel-tank').mass,
    );
  });
});

describe('effectiveThrustAccel', () => {
  const falcon = SHIPS[0];

  it('equals baseThrustAccel exactly at zero carried mass', () => {
    expect(effectiveThrustAccel(falcon, 0)).toBe(falcon.baseThrustAccel);
  });

  it('decreases as carried mass increases', () => {
    const light = effectiveThrustAccel(falcon, 20);
    const heavy = effectiveThrustAccel(falcon, 80);
    expect(heavy).toBeLessThan(light);
    expect(light).toBeLessThan(falcon.baseThrustAccel);
  });

  it('matches the closed-form formula directly', () => {
    const carriedMass = 50;
    const expected = (falcon.baseThrustAccel * falcon.dryMass) / (falcon.dryMass + carriedMass);
    expect(effectiveThrustAccel(falcon, carriedMass)).toBeCloseTo(expected, 10);
  });
});

describe('summarizePassiveEffects', () => {
  it('is all-zero/false for an empty loadout', () => {
    expect(summarizePassiveEffects([])).toEqual({
      fuelCapacityBonus: 0,
      corrosionResistant: false,
      coldResistant: false,
    });
  });

  it('sums fuel capacity bonuses and flags resistance from the matching items', () => {
    const items: readonly EquipmentItem[] = [
      findEquipmentById('fuel-tank'),
      findEquipmentById('corrosion-coating'),
      findEquipmentById('thermal-lining'),
    ];
    expect(summarizePassiveEffects(items)).toEqual({
      fuelCapacityBonus: 40,
      corrosionResistant: true,
      coldResistant: true,
    });
  });

  it('ignores weapons and active-use utility items (repair kit, thrust booster)', () => {
    const items: readonly EquipmentItem[] = [
      findEquipmentById('pulse-cannon'),
      findEquipmentById('repair-kit'),
      findEquipmentById('thrust-booster'),
    ];
    expect(summarizePassiveEffects(items)).toEqual({
      fuelCapacityBonus: 0,
      corrosionResistant: false,
      coldResistant: false,
    });
  });
});
