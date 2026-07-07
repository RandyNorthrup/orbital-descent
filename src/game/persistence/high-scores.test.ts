import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSafeLocalStorage,
  HIGH_SCORES_STORAGE_KEY,
  loadHighScores,
  recordHighScore,
  type HighScoreEntry,
  type KeyValueStorage,
} from './high-scores';

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

describe('loadHighScores', () => {
  it('returns an empty list when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('returns an empty list when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, 'not valid json{{{');
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('returns an empty list when the parsed JSON is a plain object, not an array', () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify({ score: 100, achievedAt: 1 }));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('returns an empty list when the array holds numbers instead of entry objects', () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify([100, 200, 300]));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('returns an empty list when an entry is missing achievedAt', () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify([{ score: 100 }]));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's score is a string", () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify([{ score: '100', achievedAt: 1 }]));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's score is negative", () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify([{ score: -5, achievedAt: 1 }]));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's score is NaN", () => {
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, '[{"score": NaN, "achievedAt": 1}]');
    expect(loadHighScores(storage)).toEqual([]);
  });

  it("returns an empty list when an entry's score is a non-integer number", () => {
    // calculateScore always Math.round()s, so a fractional score can only
    // come from direct storage tampering, not real gameplay -- still
    // rejected outright, same as any other shape mismatch.
    const storage = new FakeStorage();
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify([{ score: 123.456, achievedAt: 1 }]));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('rejects the whole array when just one element among otherwise-valid entries is corrupt', () => {
    // Distinguishes the documented `!parsed.every(isHighScoreEntry)` "reject
    // everything" semantics from a lenient filter-and-keep-the-good-entries
    // alternative: every other corruption test above uses a uniformly
    // invalid array, which can't tell the two apart. A lenient
    // implementation would return the two valid entries here; the real
    // implementation must return nothing.
    const storage = new FakeStorage();
    storage.setItem(
      HIGH_SCORES_STORAGE_KEY,
      JSON.stringify([
        { score: 500, achievedAt: 1 },
        { score: 'not a number', achievedAt: 2 },
        { score: 300, achievedAt: 3 },
      ]),
    );
    expect(loadHighScores(storage)).toEqual([]);
  });
});

describe('getSafeLocalStorage', () => {
  // This suite runs under vitest's plain-Node environment (see
  // vitest.config.ts), which has no global `window` at all -- so each case
  // stubs one in, matching whichever real-browser condition it's proving.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the storage object when reading window.localStorage succeeds', () => {
    const storage = new FakeStorage();
    vi.stubGlobal('window', { localStorage: storage });
    expect(getSafeLocalStorage()).toBe(storage);
  });

  it('returns null instead of throwing when reading window.localStorage itself throws', () => {
    // Mirrors a real browser condition (a sandboxed cross-origin iframe
    // without allow-same-origin, or an all-storage-blocked privacy setting):
    // accessing the localStorage getter throws a SecurityError before any
    // caller-side code runs.
    vi.stubGlobal('window', {
      get localStorage(): never {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
    });
    expect(getSafeLocalStorage()).toBeNull();
  });

  it('returns null instead of throwing when window itself does not exist', () => {
    // Belt-and-suspenders: proves the try/catch also survives a bare
    // ReferenceError (e.g. this exact vitest environment), not just a
    // DOMException, since getSafeLocalStorage has no environment-specific
    // logic distinguishing the two.
    expect(getSafeLocalStorage()).toBeNull();
  });
});

describe('recordHighScore', () => {
  it('round-trips a single entry through recordHighScore then loadHighScores', () => {
    const storage = new FakeStorage();
    recordHighScore(storage, 500, 1_700_000_000_000, 10);
    expect(loadHighScores(storage)).toEqual([{ score: 500, achievedAt: 1_700_000_000_000 }]);
  });

  it('keeps multiple entries sorted descending by score', () => {
    const storage = new FakeStorage();
    recordHighScore(storage, 300, 1, 10);
    recordHighScore(storage, 900, 2, 10);
    recordHighScore(storage, 600, 3, 10);

    expect(loadHighScores(storage).map((entry) => entry.score)).toEqual([900, 600, 300]);
  });

  it('truncates to maxEntries, dropping the lowest scores', () => {
    const storage = new FakeStorage();
    const maxEntries = 3;
    [500, 100, 900, 300, 700].forEach((score, index) => {
      recordHighScore(storage, score, index, maxEntries);
    });

    const scores = loadHighScores(storage).map((entry) => entry.score);
    expect(scores).toEqual([900, 700, 500]);
    expect(scores).toHaveLength(maxEntries);
  });

  it('returns the correct in-memory list and does not throw when setItem throws', () => {
    const storage = new ThrowingStorage();
    let result: readonly HighScoreEntry[] | undefined;

    expect(() => {
      result = recordHighScore(storage, 750, 12345, 10);
    }).not.toThrow();
    expect(result).toEqual([{ score: 750, achievedAt: 12345 }]);
  });
});
