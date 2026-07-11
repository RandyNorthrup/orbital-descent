import { describe, expect, it } from 'vitest';
import type { ShipClass } from '../ships/ship';
import type { EquipmentItem } from '../equipment/equipment';
import type { BaseProgressMap } from './base-progress';
import {
  EQUIPMENT_PROGRESS_STORAGE_KEY,
  cycleActiveUtility,
  cycleActiveWeapon,
  equipItem,
  initialEquipmentProgress,
  isEquipmentAvailable,
  loadEquipmentProgress,
  purchaseEquipment,
  saveEquipmentProgress,
  unequipItem,
  type EquipmentProgressState,
} from './equipment-progress';
import type { KeyValueStorage } from './safe-local-storage';

/** Test-only in-memory stand-in for a real Storage object (localStorage),
 * so this module can be unit-tested in plain Node without jsdom. */
class FakeStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/** A FakeStorage whose setItem always throws, simulating Safari
 * private-browsing mode's zero storage quota. */
class ThrowingStorage implements KeyValueStorage {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

const WEAPON_A: EquipmentItem = {
  slotType: 'weapon',
  id: 'weapon-a',
  name: 'Weapon A',
  mass: 20,
  acquisition: { type: 'purchase', price: 100 },
  tier: 1,
  damage: 10,
  cooldownMs: 300,
  projectileColor: 0xf5e050,
  tags: [],
};
const WEAPON_B: EquipmentItem = {
  slotType: 'weapon',
  id: 'weapon-b',
  name: 'Weapon B',
  mass: 20,
  acquisition: {
    type: 'unlock',
    requiredBaseId: 'test-base',
    description: 'Establish Test Base',
  },
  tier: 2,
  damage: 20,
  cooldownMs: 500,
  projectileColor: 0xf5e050,
  tags: [],
};
const UTILITY_A: EquipmentItem = {
  slotType: 'utility',
  id: 'utility-a',
  name: 'Utility A',
  mass: 10,
  acquisition: { type: 'purchase', price: 50 },
  effect: { kind: 'repairKit', fuelRestored: 25 },
  tags: [],
};
const ALL_ITEMS: readonly EquipmentItem[] = [WEAPON_A, WEAPON_B, UTILITY_A];

const SHIP: ShipClass = {
  id: 'test-ship',
  name: 'Test Ship',
  archetype: 'balanced',
  dryMass: 100,
  baseThrustAccel: 46,
  fuelCapacity: 100,
  burnRate: 18,
  handling: 150,
  equipmentSlots: 2,
  massBudget: 45,
  cargoBayCapacity: 100,
  fuelPerDistanceUnit: 1.2,
  hullFillColorTop: 0xffffff,
  hullFillColorBottom: 0x888888,
  accentColor: 0xd94040,
  trimColor: 0xf2b64a,
  detailColor: 0x2b5fb0,
  acquisition: { type: 'starter' },
};

describe('initialEquipmentProgress', () => {
  it('owns and equips nothing', () => {
    expect(initialEquipmentProgress()).toEqual({
      purchasedEquipmentIds: [],
      equippedItemIds: [],
      activeWeaponId: null,
      activeUtilityId: null,
    });
  });
});

describe('loadEquipmentProgress', () => {
  it('falls back to initialEquipmentProgress when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadEquipmentProgress(storage, ALL_ITEMS)).toEqual(initialEquipmentProgress());
  });

  it('falls back to initialEquipmentProgress, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(EQUIPMENT_PROGRESS_STORAGE_KEY, 'not valid json{{{');
    let result: EquipmentProgressState | undefined;
    expect(() => {
      result = loadEquipmentProgress(storage, ALL_ITEMS);
    }).not.toThrow();
    expect(result).toEqual(initialEquipmentProgress());
  });

  it('falls back to initialEquipmentProgress when the parsed value is null', () => {
    const storage = new FakeStorage();
    storage.setItem(EQUIPMENT_PROGRESS_STORAGE_KEY, JSON.stringify(null));
    expect(loadEquipmentProgress(storage, ALL_ITEMS)).toEqual(initialEquipmentProgress());
  });

  it('falls back to initialEquipmentProgress when a required field is missing', () => {
    const storage = new FakeStorage();
    storage.setItem(
      EQUIPMENT_PROGRESS_STORAGE_KEY,
      JSON.stringify({ purchasedEquipmentIds: [], equippedItemIds: [] }),
    );
    expect(loadEquipmentProgress(storage, ALL_ITEMS)).toEqual(initialEquipmentProgress());
  });

  it('falls back to initialEquipmentProgress when an id names an item not in the current registry', () => {
    const storage = new FakeStorage();
    storage.setItem(
      EQUIPMENT_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        purchasedEquipmentIds: ['retired-item'],
        equippedItemIds: [],
        activeWeaponId: null,
        activeUtilityId: null,
      }),
    );
    expect(loadEquipmentProgress(storage, ALL_ITEMS)).toEqual(initialEquipmentProgress());
  });

  it('round-trips a valid, previously-saved state', () => {
    const storage = new FakeStorage();
    const saved: EquipmentProgressState = {
      purchasedEquipmentIds: ['weapon-a', 'utility-a'],
      equippedItemIds: ['weapon-a', 'utility-a'],
      activeWeaponId: 'weapon-a',
      activeUtilityId: 'utility-a',
    };
    saveEquipmentProgress(storage, saved);
    expect(loadEquipmentProgress(storage, ALL_ITEMS)).toEqual(saved);
  });
});

describe('saveEquipmentProgress', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    expect(() => {
      saveEquipmentProgress(storage, initialEquipmentProgress());
    }).not.toThrow();
  });
});

describe('purchaseEquipment', () => {
  it('adds the id, idempotently', () => {
    const once = purchaseEquipment(initialEquipmentProgress(), 'weapon-a');
    expect(once.purchasedEquipmentIds).toEqual(['weapon-a']);
    const twice = purchaseEquipment(once, 'weapon-a');
    expect(twice).toEqual(once);
  });
});

describe('isEquipmentAvailable', () => {
  const baseProgress: BaseProgressMap = {
    'test-base': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
  };
  const noProgress: BaseProgressMap = {
    'test-base': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
  };

  it('is unavailable for a purchase-type item until purchased', () => {
    expect(isEquipmentAvailable(WEAPON_A, initialEquipmentProgress(), noProgress)).toBe(false);
    const owned = purchaseEquipment(initialEquipmentProgress(), 'weapon-a');
    expect(isEquipmentAvailable(WEAPON_A, owned, noProgress)).toBe(true);
  });

  it("is unavailable for an unlock-type item until its requiredBaseId reaches 'established'", () => {
    expect(isEquipmentAvailable(WEAPON_B, initialEquipmentProgress(), noProgress)).toBe(false);
    expect(isEquipmentAvailable(WEAPON_B, initialEquipmentProgress(), baseProgress)).toBe(true);
  });
});

describe('equipItem / unequipItem', () => {
  it('equips an item that fits within the slot count and mass budget', () => {
    const updated = equipItem(initialEquipmentProgress(), SHIP, ALL_ITEMS, 'weapon-a');
    expect(updated.equippedItemIds).toEqual(['weapon-a']);
    expect(updated.activeWeaponId).toBe('weapon-a');
  });

  it('is a no-op when the item would exceed the mass budget', () => {
    // SHIP has a 45 MU budget; weapon-a (20) + weapon-b (20) + utility-a (10) = 50 > 45.
    const withTwoWeapons = equipItem(
      equipItem(initialEquipmentProgress(), SHIP, ALL_ITEMS, 'weapon-a'),
      SHIP,
      ALL_ITEMS,
      'weapon-b',
    );
    const attempted = equipItem(withTwoWeapons, SHIP, ALL_ITEMS, 'utility-a');
    expect(attempted).toEqual(withTwoWeapons);
  });

  it('is idempotent: equipping an already-equipped item is a no-op', () => {
    const once = equipItem(initialEquipmentProgress(), SHIP, ALL_ITEMS, 'weapon-a');
    const twice = equipItem(once, SHIP, ALL_ITEMS, 'weapon-a');
    expect(twice).toEqual(once);
  });

  it('does not mutate the progress object passed in', () => {
    const initial = initialEquipmentProgress();
    const before = { ...initial };
    equipItem(initial, SHIP, ALL_ITEMS, 'weapon-a');
    expect(initial).toEqual(before);
  });

  it('unequips an item and falls back the active selection to null when nothing of that type remains', () => {
    const equipped = equipItem(initialEquipmentProgress(), SHIP, ALL_ITEMS, 'weapon-a');
    const unequipped = unequipItem(equipped, ALL_ITEMS, 'weapon-a');
    expect(unequipped.equippedItemIds).toEqual([]);
    expect(unequipped.activeWeaponId).toBeNull();
  });

  it('unequipping is idempotent for an item that was never equipped', () => {
    const initial = initialEquipmentProgress();
    expect(unequipItem(initial, ALL_ITEMS, 'weapon-a')).toEqual(initial);
  });
});

describe('cycleActiveWeapon / cycleActiveUtility', () => {
  it('cycles through carried weapons of that slot type only', () => {
    const withBoth = equipItem(
      equipItem(initialEquipmentProgress(), { ...SHIP, massBudget: 100 }, ALL_ITEMS, 'weapon-a'),
      { ...SHIP, massBudget: 100 },
      ALL_ITEMS,
      'weapon-b',
    );
    const wideShip = { ...SHIP, massBudget: 100 };
    const cycled = cycleActiveWeapon(withBoth, wideShip, ALL_ITEMS);
    expect(cycled.activeWeaponId).toBe('weapon-b');
    const cycledAgain = cycleActiveWeapon(cycled, wideShip, ALL_ITEMS);
    expect(cycledAgain.activeWeaponId).toBe('weapon-a');
  });

  it('only cycles through what the current ship actually carries after a budget-trimming ship switch', () => {
    const wideShip = { ...SHIP, massBudget: 100, equipmentSlots: 3 };
    const loaded = equipItem(
      equipItem(initialEquipmentProgress(), wideShip, ALL_ITEMS, 'weapon-a'),
      wideShip,
      ALL_ITEMS,
      'weapon-b',
    );
    // Switch to a ship whose budget only fits one of the two weapons.
    const narrowShip = { ...SHIP, massBudget: 20, equipmentSlots: 3 };
    const cycled = cycleActiveWeapon(loaded, narrowShip, ALL_ITEMS);
    expect(cycled.activeWeaponId).toBe('weapon-a');
  });

  it('cycles the active utility item independently of the active weapon', () => {
    const wideShip = { ...SHIP, massBudget: 100 };
    const equipped = equipItem(initialEquipmentProgress(), wideShip, ALL_ITEMS, 'utility-a');
    const cycled = cycleActiveUtility(equipped, wideShip, ALL_ITEMS);
    expect(cycled.activeUtilityId).toBe('utility-a');
    expect(cycled.activeWeaponId).toBeNull();
  });
});
