import { describe, expect, it } from 'vitest';
import { absorbHit, effectiveDamage } from './damage';

describe('effectiveDamage', () => {
  it('subtracts armorRating from raw damage', () => {
    expect(effectiveDamage(15, 5)).toBe(10);
  });

  it('floors at 0 when armorRating meets or exceeds the raw damage (the Bruiser hard-fail archetype)', () => {
    expect(effectiveDamage(15, 15)).toBe(0);
    expect(effectiveDamage(15, 20)).toBe(0);
  });

  it('is the raw damage unchanged against zero armor', () => {
    expect(effectiveDamage(15, 0)).toBe(15);
  });
});

describe('absorbHit', () => {
  it('consumes one shield hit and leaves hull untouched when a shield hit is available', () => {
    const result = absorbHit({ hull: 30, shieldHitsRemaining: 1 }, 18);
    expect(result).toEqual({ hull: 30, shieldHitsRemaining: 0 });
  });

  it('subtracts from hull once shield hits are exhausted', () => {
    const result = absorbHit({ hull: 30, shieldHitsRemaining: 0 }, 18);
    expect(result).toEqual({ hull: 12, shieldHitsRemaining: 0 });
  });

  it('floors hull at 0 rather than going negative', () => {
    const result = absorbHit({ hull: 10, shieldHitsRemaining: 0 }, 18);
    expect(result).toEqual({ hull: 0, shieldHitsRemaining: 0 });
  });

  it('absorbs the hit regardless of its damage magnitude -- an all-or-nothing block, not a reduction', () => {
    const result = absorbHit({ hull: 30, shieldHitsRemaining: 1 }, 1000);
    expect(result).toEqual({ hull: 30, shieldHitsRemaining: 0 });
  });
});
