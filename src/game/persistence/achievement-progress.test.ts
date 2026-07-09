import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_PROGRESS_STORAGE_KEY,
  loadUnlockedAchievements,
  recordUnlockedAchievements,
  type UnlockedAchievement,
} from './achievement-progress';
import type { AchievementDefinition } from '../achievements/achievements';
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

const FIRST_PRESENCE: AchievementDefinition = {
  id: 'first-presence',
  displayText: 'Boots on the Ground',
};
const FRONTIER_CLAIMED: AchievementDefinition = {
  id: 'frontier-claimed',
  displayText: 'Frontier Claimed',
};

describe('loadUnlockedAchievements', () => {
  it('returns an empty list when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it('returns an empty list when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, 'not valid json{{{');
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it('returns an empty list when the parsed JSON is a plain object, not an array', () => {
    const storage = new FakeStorage();
    storage.setItem(
      ACHIEVEMENT_PROGRESS_STORAGE_KEY,
      JSON.stringify({ id: 'first-presence', unlockedAt: 1 }),
    );
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it('returns an empty list when the array holds strings instead of entry objects', () => {
    const storage = new FakeStorage();
    storage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify(['first-presence']));
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it('returns an empty list when an entry is missing unlockedAt', () => {
    const storage = new FakeStorage();
    storage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify([{ id: 'first-presence' }]));
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's id is a number instead of a string", () => {
    const storage = new FakeStorage();
    storage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify([{ id: 42, unlockedAt: 1 }]));
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's unlockedAt is NaN", () => {
    const storage = new FakeStorage();
    storage.setItem(
      ACHIEVEMENT_PROGRESS_STORAGE_KEY,
      '[{"id": "first-presence", "unlockedAt": NaN}]',
    );
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });

  it('rejects the whole array when just one element among otherwise-valid entries is corrupt', () => {
    // Distinguishes the documented `!parsed.every(isUnlockedAchievement)`
    // "reject everything" semantics from a lenient filter-and-keep-the-
    // good-entries alternative, same rationale as high-scores.test.ts's
    // identical test.
    const storage = new FakeStorage();
    storage.setItem(
      ACHIEVEMENT_PROGRESS_STORAGE_KEY,
      JSON.stringify([
        { id: 'first-presence', unlockedAt: 1 },
        { id: 'frontier-claimed' }, // missing unlockedAt
        { id: 'resupply-streak-5', unlockedAt: 3 },
      ]),
    );
    expect(loadUnlockedAchievements(storage)).toEqual([]);
  });
});

describe('recordUnlockedAchievements', () => {
  it('round-trips a single newly-unlocked achievement through load', () => {
    const storage = new FakeStorage();
    recordUnlockedAchievements(storage, [FIRST_PRESENCE], 1_700_000_000_000);
    expect(loadUnlockedAchievements(storage)).toEqual([
      { id: 'first-presence', unlockedAt: 1_700_000_000_000 },
    ]);
  });

  it('appends one entry per newly-unlocked definition passed in a single call', () => {
    const storage = new FakeStorage();
    recordUnlockedAchievements(storage, [FIRST_PRESENCE, FRONTIER_CLAIMED], 5);
    expect(loadUnlockedAchievements(storage)).toEqual([
      { id: 'first-presence', unlockedAt: 5 },
      { id: 'frontier-claimed', unlockedAt: 5 },
    ]);
  });

  it('accumulates across separate calls rather than overwriting the previous list', () => {
    const storage = new FakeStorage();
    recordUnlockedAchievements(storage, [FIRST_PRESENCE], 1);
    recordUnlockedAchievements(storage, [FRONTIER_CLAIMED], 2);
    expect(loadUnlockedAchievements(storage)).toEqual([
      { id: 'first-presence', unlockedAt: 1 },
      { id: 'frontier-claimed', unlockedAt: 2 },
    ]);
  });

  it('returns the correct in-memory list and does not throw when setItem throws', () => {
    const storage = new ThrowingStorage();
    let result: readonly UnlockedAchievement[] | undefined;

    expect(() => {
      result = recordUnlockedAchievements(storage, [FIRST_PRESENCE], 1_234);
    }).not.toThrow();
    expect(result).toEqual([{ id: 'first-presence', unlockedAt: 1_234 }]);
  });
});
