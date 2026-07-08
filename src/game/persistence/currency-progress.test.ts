import { describe, expect, it } from 'vitest';
import {
  CURRENCY_STORAGE_KEY,
  creditCurrency,
  initialCurrencyState,
  loadCurrencyState,
  saveCurrencyState,
  spendCurrency,
  type CurrencyState,
} from './currency-progress';
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

describe('initialCurrencyState', () => {
  it('starts at a zero balance', () => {
    expect(initialCurrencyState()).toEqual({ balance: 0 });
  });
});

describe('loadCurrencyState', () => {
  it('falls back to initialCurrencyState when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });

  it('falls back to initialCurrencyState, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, 'not valid json{{{');

    let result: CurrencyState | undefined;
    expect(() => {
      result = loadCurrencyState(storage);
    }).not.toThrow();
    expect(result).toEqual(initialCurrencyState());
  });

  it('round-trips a valid, previously-saved state through saveCurrencyState then loadCurrencyState', () => {
    const storage = new FakeStorage();
    const saved: CurrencyState = { balance: 750 };

    saveCurrencyState(storage, saved);
    expect(loadCurrencyState(storage)).toEqual(saved);
  });

  it('falls back to initialCurrencyState when the parsed value is null', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(null));
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });

  it('falls back to initialCurrencyState when balance is missing', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify({}));
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });

  it('falls back to initialCurrencyState when balance is a non-integer number', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify({ balance: 12.5 }));
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });

  it('falls back to initialCurrencyState when balance is negative', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify({ balance: -1 }));
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });

  it('falls back to initialCurrencyState when balance is a string', () => {
    const storage = new FakeStorage();
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify({ balance: '750' }));
    expect(loadCurrencyState(storage)).toEqual(initialCurrencyState());
  });
});

describe('saveCurrencyState', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    expect(() => {
      saveCurrencyState(storage, initialCurrencyState());
    }).not.toThrow();
  });
});

describe('creditCurrency', () => {
  it('adds the amount to the balance without mutating the original state', () => {
    const before = { balance: 100 };
    const after = creditCurrency(before, 50);
    expect(after).toEqual({ balance: 150 });
    expect(before).toEqual({ balance: 100 });
  });

  it('supports crediting zero as a no-op amount', () => {
    expect(creditCurrency({ balance: 100 }, 0)).toEqual({ balance: 100 });
  });
});

describe('spendCurrency', () => {
  it('deducts the amount from the balance without mutating the original state', () => {
    const before = { balance: 750 };
    const after = spendCurrency(before, 750);
    expect(after).toEqual({ balance: 0 });
    expect(before).toEqual({ balance: 750 });
  });

  it('allows spending exactly the full balance', () => {
    expect(spendCurrency({ balance: 100 }, 100)).toEqual({ balance: 0 });
  });

  it('throws when the amount exceeds the balance', () => {
    expect(() => spendCurrency({ balance: 100 }, 101)).toThrow();
  });
});
