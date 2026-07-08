import { describe, expect, it } from 'vitest';
import {
  cycleActiveItem,
  equipmentIdsOfSlotType,
  resolveEquippedItems,
  resolvedCarriedMass,
} from './loadout';
import { EQUIPMENT_ITEMS, findEquipmentById } from './equipment';
import { SHIPS, findShipById } from '../ships/ships';

describe('resolveEquippedItems', () => {
  const falcon = findShipById('falcon'); // equipmentSlots: 3, massBudget: 150

  it('returns an empty list for an empty loadout', () => {
    expect(resolveEquippedItems(falcon, [], EQUIPMENT_ITEMS)).toEqual([]);
  });

  it('resolves every id that fits within slot count and mass budget', () => {
    const ids = ['pulse-cannon', 'fuel-tank']; // 20 + 20 = 40 MU, 2 items
    const resolved = resolveEquippedItems(falcon, ids, EQUIPMENT_ITEMS);
    expect(resolved.map((item) => item.id)).toEqual(ids);
  });

  it('drops an id once the slot count is exhausted', () => {
    const ids = ['pulse-cannon', 'fuel-tank', 'repair-kit', 'thrust-booster']; // 4 items, only 3 slots
    const resolved = resolveEquippedItems(falcon, ids, EQUIPMENT_ITEMS);
    expect(resolved).toHaveLength(3);
    expect(resolved.map((item) => item.id)).toEqual(['pulse-cannon', 'fuel-tank', 'repair-kit']);
  });

  it('skips an id that alone would exceed the mass budget, but keeps checking later ids that still fit', () => {
    const vanguard = findShipById('vanguard'); // massBudget: 110, equipmentSlots: 3
    const tightBudgetShip = { ...vanguard, massBudget: 30 };
    const resolved = resolveEquippedItems(
      tightBudgetShip,
      ['autocannon', 'repair-kit'],
      EQUIPMENT_ITEMS,
    );
    // autocannon (35 MU) exceeds the 30 MU budget entirely and is skipped; repair-kit (10 MU) still fits.
    expect(resolved.map((item) => item.id)).toEqual(['repair-kit']);
  });

  it('silently ignores an id not present in allItems (a stale persisted id)', () => {
    const resolved = resolveEquippedItems(falcon, ['not-a-real-id', 'fuel-tank'], EQUIPMENT_ITEMS);
    expect(resolved.map((item) => item.id)).toEqual(['fuel-tank']);
  });

  it('trims an over-budget persisted loadout down after switching to a smaller ship', () => {
    const hauler = findShipById('hauler'); // massBudget: 380, equipmentSlots: 4
    const ids = ['pulse-cannon', 'autocannon', 'fuel-tank', 'corrosion-coating', 'thermal-lining'];
    const onHauler = resolveEquippedItems(hauler, ids, EQUIPMENT_ITEMS);
    expect(onHauler.length).toBeGreaterThan(0);

    const vanguard = findShipById('vanguard'); // massBudget: 110, equipmentSlots: 3
    const onVanguard = resolveEquippedItems(vanguard, ids, EQUIPMENT_ITEMS);
    expect(onVanguard.length).toBeLessThanOrEqual(3);
    const carried = onVanguard.reduce((sum, item) => sum + item.mass, 0);
    expect(carried).toBeLessThanOrEqual(vanguard.massBudget);
  });
});

describe('resolvedCarriedMass', () => {
  it('matches the sum of the resolved items’ mass', () => {
    const falcon = findShipById('falcon');
    const ids = ['pulse-cannon', 'fuel-tank'];
    expect(resolvedCarriedMass(falcon, ids, EQUIPMENT_ITEMS)).toBe(
      findEquipmentById('pulse-cannon').mass + findEquipmentById('fuel-tank').mass,
    );
  });
});

describe('equipmentIdsOfSlotType', () => {
  it('filters to only the requested slot type, preserving order', () => {
    const items = [
      findEquipmentById('pulse-cannon'),
      findEquipmentById('fuel-tank'),
      findEquipmentById('autocannon'),
    ];
    expect(equipmentIdsOfSlotType(items, 'weapon')).toEqual(['pulse-cannon', 'autocannon']);
    expect(equipmentIdsOfSlotType(items, 'utility')).toEqual(['fuel-tank']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(equipmentIdsOfSlotType([], 'weapon')).toEqual([]);
  });
});

describe('cycleActiveItem', () => {
  it('returns null when nothing is equipped', () => {
    expect(cycleActiveItem(null, [])).toBeNull();
    expect(cycleActiveItem('pulse-cannon', [])).toBeNull();
  });

  it('selects the first item when nothing is currently active', () => {
    expect(cycleActiveItem(null, ['pulse-cannon', 'autocannon'])).toBe('pulse-cannon');
  });

  it('advances to the next item', () => {
    expect(cycleActiveItem('pulse-cannon', ['pulse-cannon', 'autocannon'])).toBe('autocannon');
  });

  it('wraps around from the last item back to the first', () => {
    expect(cycleActiveItem('autocannon', ['pulse-cannon', 'autocannon'])).toBe('pulse-cannon');
  });

  it('wraps to the first item when the current active id is no longer equipped', () => {
    expect(cycleActiveItem('unequipped-stale-id', ['pulse-cannon', 'autocannon'])).toBe(
      'pulse-cannon',
    );
  });

  it('is a no-op cycle across a single-item list (always returns that one item)', () => {
    expect(cycleActiveItem('pulse-cannon', ['pulse-cannon'])).toBe('pulse-cannon');
    expect(cycleActiveItem(null, ['pulse-cannon'])).toBe('pulse-cannon');
  });
});

describe('registry cross-check', () => {
  it('every SHIPS class has at least one equipment slot, so loadout mechanics are reachable', () => {
    for (const ship of SHIPS) {
      expect(ship.equipmentSlots).toBeGreaterThan(0);
    }
  });
});
