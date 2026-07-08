import { describe, expect, it } from 'vitest';
import type { PermanentUpgrade } from '../ships/upgrades';
import {
  UPGRADE_PROGRESS_STORAGE_KEY,
  initialUpgradeProgress,
  loadUpgradeProgress,
  ownedUpgrades,
  purchaseUpgrade,
  saveUpgradeProgress,
  type UpgradeProgressState,
} from './upgrade-progress';
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

const UPGRADE_A: PermanentUpgrade = {
  id: 'upgrade-a',
  name: 'Upgrade A',
  price: 100,
  stat: 'baseThrustAccel',
  amount: 10,
  tags: [],
};
const UPGRADE_B: PermanentUpgrade = {
  id: 'upgrade-b',
  name: 'Upgrade B',
  price: 200,
  stat: 'dryMass',
  amount: -10,
  tags: [],
};
const UPGRADES: readonly PermanentUpgrade[] = [UPGRADE_A, UPGRADE_B];

describe('initialUpgradeProgress', () => {
  it('owns no upgrades', () => {
    expect(initialUpgradeProgress()).toEqual({ purchasedUpgradeIds: [] });
  });
});

describe('loadUpgradeProgress', () => {
  it('falls back to initialUpgradeProgress when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(initialUpgradeProgress());
  });

  it('falls back to initialUpgradeProgress, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(UPGRADE_PROGRESS_STORAGE_KEY, 'not valid json{{{');

    let result: UpgradeProgressState | undefined;
    expect(() => {
      result = loadUpgradeProgress(storage, UPGRADES);
    }).not.toThrow();
    expect(result).toEqual(initialUpgradeProgress());
  });

  it('falls back to initialUpgradeProgress when the parsed value is null', () => {
    const storage = new FakeStorage();
    storage.setItem(UPGRADE_PROGRESS_STORAGE_KEY, JSON.stringify(null));
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(initialUpgradeProgress());
  });

  it('falls back to initialUpgradeProgress when purchasedUpgradeIds is missing', () => {
    const storage = new FakeStorage();
    storage.setItem(UPGRADE_PROGRESS_STORAGE_KEY, JSON.stringify({}));
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(initialUpgradeProgress());
  });

  it('falls back to initialUpgradeProgress when purchasedUpgradeIds is not an array of strings', () => {
    const storage = new FakeStorage();
    storage.setItem(UPGRADE_PROGRESS_STORAGE_KEY, JSON.stringify({ purchasedUpgradeIds: [1, 2] }));
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(initialUpgradeProgress());
  });

  it('falls back to initialUpgradeProgress when an id names an upgrade not in the current registry', () => {
    const storage = new FakeStorage();
    storage.setItem(
      UPGRADE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ purchasedUpgradeIds: ['retired-upgrade'] }),
    );
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(initialUpgradeProgress());
  });

  it('round-trips a valid, previously-saved state through saveUpgradeProgress then loadUpgradeProgress', () => {
    const storage = new FakeStorage();
    const saved: UpgradeProgressState = { purchasedUpgradeIds: ['upgrade-a'] };
    saveUpgradeProgress(storage, saved);
    expect(loadUpgradeProgress(storage, UPGRADES)).toEqual(saved);
  });
});

describe('saveUpgradeProgress', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    expect(() => {
      saveUpgradeProgress(storage, initialUpgradeProgress());
    }).not.toThrow();
  });
});

describe('purchaseUpgrade', () => {
  it('adds the id to purchasedUpgradeIds', () => {
    const updated = purchaseUpgrade(initialUpgradeProgress(), 'upgrade-a');
    expect(updated).toEqual({ purchasedUpgradeIds: ['upgrade-a'] });
  });

  it('does not mutate the progress object passed in', () => {
    const initial = initialUpgradeProgress();
    const before = { ...initial };
    purchaseUpgrade(initial, 'upgrade-a');
    expect(initial).toEqual(before);
  });

  it('is idempotent: purchasing an already-owned upgrade does not duplicate its id', () => {
    const owned: UpgradeProgressState = { purchasedUpgradeIds: ['upgrade-a'] };
    const updated = purchaseUpgrade(owned, 'upgrade-a');
    expect(updated).toEqual(owned);
    expect(updated.purchasedUpgradeIds).toEqual(['upgrade-a']);
  });
});

describe('ownedUpgrades', () => {
  it('resolves owned ids to their full PermanentUpgrade objects', () => {
    const progress: UpgradeProgressState = { purchasedUpgradeIds: ['upgrade-b'] };
    expect(ownedUpgrades(progress, UPGRADES)).toEqual([UPGRADE_B]);
  });

  it('returns an empty list when nothing is owned', () => {
    expect(ownedUpgrades(initialUpgradeProgress(), UPGRADES)).toEqual([]);
  });
});
