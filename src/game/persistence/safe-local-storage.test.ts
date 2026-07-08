import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSafeLocalStorage, type KeyValueStorage } from './safe-local-storage';

/** Test-only in-memory stand-in for a real Storage object (localStorage). */
class FakeStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

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
