import { describe, expect, it } from 'vitest';
import { canAfford, listingStatus, shipListings, type StoreListing } from './store';
import { SHIPS } from '../ships/ships';

const LISTING: StoreListing = { kind: 'ship', id: 'vanguard', name: 'Vanguard', price: 750 };

describe('shipListings', () => {
  it('includes exactly the purchase-type ships in the registry, each as a real listing', () => {
    const listings = shipListings(SHIPS);
    expect(listings).toEqual([{ kind: 'ship', id: 'vanguard', name: 'Vanguard', price: 750 }]);
  });

  it('excludes every starter and unlock-type ship', () => {
    const listings = shipListings(SHIPS);
    expect(listings.some((listing) => listing.id === 'falcon')).toBe(false);
    expect(listings.some((listing) => listing.id === 'cryohauler')).toBe(false);
  });
});

describe('canAfford', () => {
  it('is true when balance meets or exceeds the price', () => {
    expect(canAfford(LISTING, 750)).toBe(true);
    expect(canAfford(LISTING, 1000)).toBe(true);
  });

  it('is false when balance is below the price', () => {
    expect(canAfford(LISTING, 749)).toBe(false);
    expect(canAfford(LISTING, 0)).toBe(false);
  });
});

describe('listingStatus', () => {
  it("is 'owned' when the listing's id is already in ownedIds, regardless of balance", () => {
    expect(listingStatus(LISTING, ['vanguard'], 0)).toBe('owned');
  });

  it("is 'affordable' when not owned and balance covers the price", () => {
    expect(listingStatus(LISTING, [], 750)).toBe('affordable');
    expect(listingStatus(LISTING, ['some-other-id'], 1000)).toBe('affordable');
  });

  it("is 'too-expensive' when not owned and balance falls short", () => {
    expect(listingStatus(LISTING, [], 0)).toBe('too-expensive');
  });
});
