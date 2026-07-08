import { describe, expect, it } from 'vitest';
import { scoreToCurrency } from './currency';

describe('scoreToCurrency', () => {
  it('is pinned 1:1 to the input score', () => {
    expect(scoreToCurrency(0)).toBe(0);
    expect(scoreToCurrency(100)).toBe(100);
    expect(scoreToCurrency(1000)).toBe(1000);
  });

  it('does not alter a fractional input (calculateScore already rounds before this is called)', () => {
    expect(scoreToCurrency(742.5)).toBe(742.5);
  });
});
