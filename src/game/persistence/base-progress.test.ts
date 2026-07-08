import { describe, expect, it } from 'vitest';
import type { Base, BaseDifficultyProfile, BaseRequirements } from '../bases/base';
import type { GenerateTerrainOptions } from '../terrain/terrain-generator';
import {
  BASE_PROGRESS_STORAGE_KEY,
  establishBase,
  initialBaseProgress,
  loadBaseProgress,
  saveBaseProgress,
  type BaseProgressMap,
} from './base-progress';
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

const TERRAIN_OPTIONS: GenerateTerrainOptions = {
  seed: 1,
  width: 800,
  height: 600,
  segments: 20,
  minHeightFraction: 0.6,
  maxHeightFraction: 0.9,
  maxStepFraction: 0.05,
  padSegmentCount: 3,
};

const REQUIREMENTS: BaseRequirements = {
  minTWR: { hardFloor: 1.1, comfortable: 1.4 },
  handling: null,
  hazardCounterTags: [],
  recommendedTags: [],
  combat: { minWeaponTier: 0, minShieldTier: 0 },
};

const DIFFICULTY: BaseDifficultyProfile = {
  axes: { mechanical: 2, spatial: 2, combat: 0 },
  dominant: 'tutorial',
  budget: 10,
};

/** Builds a minimal, valid `Base` fixture -- every field besides
 * id/status/unlocks is a fixed, real (not placeholder/any-cast) value,
 * since only id/status/unlocks matter to this module. */
function createBase(id: string, status: Base['status'], unlocks: readonly string[]): Base {
  return {
    id,
    name: id,
    worldId: 'kessels-reach',
    order: 0,
    terrainOptions: TERRAIN_OPTIONS,
    encounters: [],
    requirements: REQUIREMENTS,
    difficulty: DIFFICULTY,
    firstClearCredits: 100,
    status,
    isCriticalPath: true,
    unlocks,
    localOffset: 0,
  };
}

// A small unlock chain: A unlocks [B, C], B unlocks [D], C and D unlock
// nothing -- enough to exercise direct flips, cascades, and "leave
// untouched" all at once.
const BASE_A = createBase('base-a', 'discovered-unclaimed', ['base-b', 'base-c']);
const BASE_B = createBase('base-b', 'locked', ['base-d']);
const BASE_C = createBase('base-c', 'locked', []);
const BASE_D = createBase('base-d', 'locked', []);
const BASES: readonly Base[] = [BASE_A, BASE_B, BASE_C, BASE_D];

describe('initialBaseProgress', () => {
  it('gives every base its own authored status, a null establishedAt, and zero resupplyCounts', () => {
    expect(initialBaseProgress(BASES)).toEqual({
      'base-a': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
      'base-b': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      'base-c': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      'base-d': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
    });
  });
});

describe('loadBaseProgress', () => {
  it('falls back to initialBaseProgress when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it('falls back to initialBaseProgress, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(BASE_PROGRESS_STORAGE_KEY, 'not valid json{{{');

    let result: BaseProgressMap | undefined;
    expect(() => {
      result = loadBaseProgress(storage, BASES);
    }).not.toThrow();
    expect(result).toEqual(initialBaseProgress(BASES));
  });

  it('round-trips a valid, previously-saved map through saveBaseProgress then loadBaseProgress', () => {
    const storage = new FakeStorage();
    const saved: BaseProgressMap = {
      'base-a': { status: 'established', establishedAt: 1_700_000_000_000, resupplyCounts: 2 },
      'base-b': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
      'base-c': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      'base-d': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
    };

    saveBaseProgress(storage, saved);
    expect(loadBaseProgress(storage, BASES)).toEqual(saved);
  });

  it('falls back to initialBaseProgress, without throwing, when an entry is null', () => {
    // Exercises isBaseProgress's `value === null` guard specifically: a
    // `Record<string, unknown>` cast of `null` would throw a TypeError on
    // the very first `candidate['status']` property read if that guard
    // were ever removed, so this must fail closed (fall back), not throw.
    const storage = new FakeStorage();
    storage.setItem(BASE_PROGRESS_STORAGE_KEY, JSON.stringify({ 'base-a': null }));

    let result: BaseProgressMap | undefined;
    expect(() => {
      result = loadBaseProgress(storage, BASES);
    }).not.toThrow();
    expect(result).toEqual(initialBaseProgress(BASES));
  });

  it('falls back to initialBaseProgress when an entry is a non-object primitive', () => {
    const storage = new FakeStorage();
    storage.setItem(BASE_PROGRESS_STORAGE_KEY, JSON.stringify({ 'base-a': 'garbage' }));
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it('falls back to initialBaseProgress when the parsed JSON is an array, not a map', () => {
    const storage = new FakeStorage();
    storage.setItem(
      BASE_PROGRESS_STORAGE_KEY,
      JSON.stringify([{ status: 'locked', establishedAt: null, resupplyCounts: 0 }]),
    );
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it('falls back to initialBaseProgress when an entry is missing resupplyCounts', () => {
    const storage = new FakeStorage();
    storage.setItem(
      BASE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ 'base-a': { status: 'locked', establishedAt: null } }),
    );
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it("falls back to initialBaseProgress when an entry's status is an unrecognized string", () => {
    const storage = new FakeStorage();
    storage.setItem(
      BASE_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        'base-a': { status: 'unknown-status', establishedAt: null, resupplyCounts: 0 },
      }),
    );
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it("falls back to initialBaseProgress when an entry's resupplyCounts is a non-integer number", () => {
    const storage = new FakeStorage();
    storage.setItem(
      BASE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ 'base-a': { status: 'locked', establishedAt: null, resupplyCounts: 1.5 } }),
    );
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });

  it("falls back to initialBaseProgress when an entry's resupplyCounts is negative", () => {
    const storage = new FakeStorage();
    storage.setItem(
      BASE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ 'base-a': { status: 'locked', establishedAt: null, resupplyCounts: -1 } }),
    );
    expect(loadBaseProgress(storage, BASES)).toEqual(initialBaseProgress(BASES));
  });
});

describe('establishBase', () => {
  it("flips exactly the ids in the established base's own unlocks from locked to discovered-unclaimed, leaving every other base untouched", () => {
    const initial = initialBaseProgress(BASES);
    const updated = establishBase(BASES, initial, 'base-a', 1000);

    expect(updated['base-a']).toEqual({
      status: 'established',
      establishedAt: 1000,
      resupplyCounts: 0,
    });
    expect(updated['base-b']).toEqual({
      status: 'discovered-unclaimed',
      establishedAt: null,
      resupplyCounts: 0,
    });
    expect(updated['base-c']).toEqual({
      status: 'discovered-unclaimed',
      establishedAt: null,
      resupplyCounts: 0,
    });
    // base-d is only reachable via base-b, not directly via base-a.
    expect(updated['base-d']).toEqual({ status: 'locked', establishedAt: null, resupplyCounts: 0 });
  });

  it('does not mutate the progress map passed in', () => {
    const initial = initialBaseProgress(BASES);
    const before = { ...initial };
    establishBase(BASES, initial, 'base-a', 1000);
    expect(initial).toEqual(before);
  });

  it('does not downgrade or otherwise change an unlock target that is already established', () => {
    const initial = initialBaseProgress(BASES);
    const alreadyEstablished: BaseProgressMap = {
      ...initial,
      'base-c': { status: 'established', establishedAt: 500, resupplyCounts: 3 },
    };

    const updated = establishBase(BASES, alreadyEstablished, 'base-a', 1000);

    expect(updated['base-c']).toEqual({
      status: 'established',
      establishedAt: 500,
      resupplyCounts: 3,
    });
    // base-b, having no special prior status, still flips normally.
    expect(updated['base-b']).toEqual({
      status: 'discovered-unclaimed',
      establishedAt: null,
      resupplyCounts: 0,
    });
  });

  it('preserves the original establishedAt when establishing an already-established base again', () => {
    const initial = initialBaseProgress(BASES);
    const firstCall = establishBase(BASES, initial, 'base-a', 1000);
    const secondCall = establishBase(BASES, firstCall, 'base-a', 2000);

    expect(secondCall['base-a']).toEqual({
      status: 'established',
      establishedAt: 1000,
      resupplyCounts: 0,
    });
  });

  it('cascades correctly across a full chain: establishing A then the now-unlocked B unlocks D', () => {
    const initial = initialBaseProgress(BASES);
    const afterA = establishBase(BASES, initial, 'base-a', 1000);
    const afterB = establishBase(BASES, afterA, 'base-b', 2000);

    expect(afterB['base-b']).toEqual({
      status: 'established',
      establishedAt: 2000,
      resupplyCounts: 0,
    });
    expect(afterB['base-d']).toEqual({
      status: 'discovered-unclaimed',
      establishedAt: null,
      resupplyCounts: 0,
    });
  });

  it('throws when called with an unknown base id', () => {
    const initial = initialBaseProgress(BASES);
    expect(() => establishBase(BASES, initial, 'no-such-base', 1000)).toThrow();
  });
});

describe('saveBaseProgress', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    const progress = initialBaseProgress(BASES);
    expect(() => {
      saveBaseProgress(storage, progress);
    }).not.toThrow();
  });
});
