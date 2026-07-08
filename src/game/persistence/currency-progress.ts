import type { KeyValueStorage } from './safe-local-storage';

export interface CurrencyState {
  readonly balance: number;
}

// Versioned (`:v1` suffix), same convention as `base-progress.ts`/
// `ship-progress.ts`/`high-scores.ts` — a future schema change moves to
// `:v2` and simply orphans old-shape data under the old key rather than
// migrating in place.
export const CURRENCY_STORAGE_KEY = 'orbital-descent:currency:v1';

function isCurrencyState(value: unknown): value is CurrencyState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  // A balance is a count of a whole-number currency (calculateScore always
  // rounds before scoreToCurrency touches it) -- matches
  // base-progress.ts's resupplyCounts precedent for a persisted count.
  return (
    typeof candidate['balance'] === 'number' &&
    Number.isInteger(candidate['balance']) &&
    candidate['balance'] >= 0
  );
}

/** A fresh save starts with zero credits. */
export function initialCurrencyState(): CurrencyState {
  return { balance: 0 };
}

/**
 * Reads and validates the stored currency state. Any parse failure or shape
 * mismatch rejects the whole read and falls back to a fresh
 * `initialCurrencyState`, rather than sanitizing down to a valid subset —
 * matches `loadShipProgress`/`loadBaseProgress`/`loadHighScores`'s exact
 * resilience philosophy.
 */
export function loadCurrencyState(storage: KeyValueStorage): CurrencyState {
  const raw = storage.getItem(CURRENCY_STORAGE_KEY);
  if (raw === null) {
    return initialCurrencyState();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialCurrencyState();
  }

  if (!isCurrencyState(parsed)) {
    return initialCurrencyState();
  }

  return parsed;
}

/**
 * Persists the given state. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, so a failed write is silently swallowed —
 * matches every other persistence module's own best-effort write.
 */
export function saveCurrencyState(storage: KeyValueStorage, state: CurrencyState): void {
  try {
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/** Pure state transition: adds `amount` to the balance, without mutating
 * `state`. `amount` is trusted non-negative -- every real call site derives
 * it from `scoreToCurrency`, which is itself pinned to a landing score that
 * `calculateScore` never returns negative. */
export function creditCurrency(state: CurrencyState, amount: number): CurrencyState {
  return { balance: state.balance + amount };
}

/**
 * Pure state transition: deducts `amount` from the balance, without
 * mutating `state`. Throws if `amount` exceeds the current balance -- the
 * store UI only ever offers a purchase once `canAfford` (`economy/
 * store.ts`) has already confirmed sufficient balance, so an insufficient-
 * funds call here is a real caller-programming-error, not a reachable UI
 * state, matching `selectShip`/`establishBase`'s throw-on-invalid-caller-
 * input convention.
 */
export function spendCurrency(state: CurrencyState, amount: number): CurrencyState {
  if (amount > state.balance) {
    throw new Error(
      `spendCurrency: amount ${amount.toString()} exceeds balance ${state.balance.toString()}.`,
    );
  }
  return { balance: state.balance - amount };
}
