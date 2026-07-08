import { describe, expect, it } from 'vitest';
import type { ShipClass } from '../ships/ship';
import type { BaseProgressMap } from './base-progress';
import {
  SHIP_PROGRESS_STORAGE_KEY,
  initialShipProgress,
  isShipAvailable,
  loadShipProgress,
  saveShipProgress,
  selectShip,
  type ShipProgressState,
} from './ship-progress';
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

function createShip(id: string, acquisition: ShipClass['acquisition']): ShipClass {
  return {
    id,
    name: id,
    archetype: 'balanced',
    dryMass: 100,
    baseThrustAccel: 46,
    fuelCapacity: 100,
    burnRate: 18,
    handling: 150,
    equipmentSlots: 3,
    massBudget: 150,
    cargoBayCapacity: 100,
    fuelPerDistanceUnit: 1.2,
    acquisition,
  };
}

const SHIP_STARTER = createShip('ship-starter', { type: 'starter' });
const SHIP_PURCHASE = createShip('ship-purchase', { type: 'purchase', price: 500 });
const SHIP_UNLOCK = createShip('ship-unlock', {
  type: 'unlock',
  requiredBaseId: 'test-base',
  description: 'Establish Test Base',
});
const SHIPS: readonly [ShipClass, ...ShipClass[]] = [SHIP_STARTER, SHIP_PURCHASE, SHIP_UNLOCK];

describe('initialShipProgress', () => {
  it('selects the first registered ship and owns no purchases', () => {
    expect(initialShipProgress(SHIPS)).toEqual({
      selectedShipId: 'ship-starter',
      purchasedShipIds: [],
    });
  });
});

describe('loadShipProgress', () => {
  it('falls back to initialShipProgress when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadShipProgress(storage, SHIPS)).toEqual(initialShipProgress(SHIPS));
  });

  it('falls back to initialShipProgress, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(SHIP_PROGRESS_STORAGE_KEY, 'not valid json{{{');

    let result: ShipProgressState | undefined;
    expect(() => {
      result = loadShipProgress(storage, SHIPS);
    }).not.toThrow();
    expect(result).toEqual(initialShipProgress(SHIPS));
  });

  it('round-trips a valid, previously-saved state through saveShipProgress then loadShipProgress', () => {
    const storage = new FakeStorage();
    const saved: ShipProgressState = {
      selectedShipId: 'ship-purchase',
      purchasedShipIds: ['ship-purchase'],
    };

    saveShipProgress(storage, saved);
    expect(loadShipProgress(storage, SHIPS)).toEqual(saved);
  });

  it('falls back to initialShipProgress when the parsed value is null', () => {
    const storage = new FakeStorage();
    storage.setItem(SHIP_PROGRESS_STORAGE_KEY, JSON.stringify(null));
    expect(loadShipProgress(storage, SHIPS)).toEqual(initialShipProgress(SHIPS));
  });

  it('falls back to initialShipProgress when selectedShipId is missing', () => {
    const storage = new FakeStorage();
    storage.setItem(SHIP_PROGRESS_STORAGE_KEY, JSON.stringify({ purchasedShipIds: [] }));
    expect(loadShipProgress(storage, SHIPS)).toEqual(initialShipProgress(SHIPS));
  });

  it('falls back to initialShipProgress when purchasedShipIds is not an array of strings', () => {
    const storage = new FakeStorage();
    storage.setItem(
      SHIP_PROGRESS_STORAGE_KEY,
      JSON.stringify({ selectedShipId: 'ship-starter', purchasedShipIds: [1, 2] }),
    );
    expect(loadShipProgress(storage, SHIPS)).toEqual(initialShipProgress(SHIPS));
  });

  it('falls back to initialShipProgress when selectedShipId names a ship not in the current registry', () => {
    // Simulates a roster change between app versions leaving a stale
    // reference behind -- must fail closed rather than let a later
    // findShipById(selectedShipId) throw far from this read.
    const storage = new FakeStorage();
    storage.setItem(
      SHIP_PROGRESS_STORAGE_KEY,
      JSON.stringify({ selectedShipId: 'retired-ship', purchasedShipIds: [] }),
    );
    expect(loadShipProgress(storage, SHIPS)).toEqual(initialShipProgress(SHIPS));
  });
});

describe('saveShipProgress', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    expect(() => {
      saveShipProgress(storage, initialShipProgress(SHIPS));
    }).not.toThrow();
  });
});

describe('selectShip', () => {
  it('equips the named ship, leaving purchasedShipIds untouched', () => {
    const initial = initialShipProgress(SHIPS);
    const updated = selectShip(SHIPS, initial, 'ship-purchase');
    expect(updated).toEqual({ selectedShipId: 'ship-purchase', purchasedShipIds: [] });
  });

  it('does not mutate the progress object passed in', () => {
    const initial = initialShipProgress(SHIPS);
    const before = { ...initial };
    selectShip(SHIPS, initial, 'ship-purchase');
    expect(initial).toEqual(before);
  });

  it('throws when called with an unknown ship id', () => {
    const initial = initialShipProgress(SHIPS);
    expect(() => selectShip(SHIPS, initial, 'no-such-ship')).toThrow();
  });
});

describe('isShipAvailable', () => {
  const baseProgress: BaseProgressMap = {
    'test-base': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
  };
  const noProgress: BaseProgressMap = {
    'test-base': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
  };

  it('is always available for a starter ship', () => {
    expect(isShipAvailable(SHIP_STARTER, initialShipProgress(SHIPS), noProgress)).toBe(true);
  });

  it('is unavailable for a purchase-type ship until its id is in purchasedShipIds', () => {
    expect(isShipAvailable(SHIP_PURCHASE, initialShipProgress(SHIPS), noProgress)).toBe(false);
    const owned: ShipProgressState = {
      selectedShipId: 'ship-starter',
      purchasedShipIds: ['ship-purchase'],
    };
    expect(isShipAvailable(SHIP_PURCHASE, owned, noProgress)).toBe(true);
  });

  it("is unavailable for an unlock-type ship until its requiredBaseId reaches 'established'", () => {
    expect(isShipAvailable(SHIP_UNLOCK, initialShipProgress(SHIPS), noProgress)).toBe(false);
    expect(isShipAvailable(SHIP_UNLOCK, initialShipProgress(SHIPS), baseProgress)).toBe(true);
  });

  it('is unavailable for an unlock-type ship when its requiredBaseId has no progress entry at all', () => {
    expect(isShipAvailable(SHIP_UNLOCK, initialShipProgress(SHIPS), {})).toBe(false);
  });
});
