import { describe, expect, it } from 'vitest';
import {
  canAfford,
  equipmentListings,
  listingStatus,
  shipListings,
  upgradeListings,
  type StoreListing,
} from './store';
import { SHIPS } from '../ships/ships';
import { findUpgradeById, UPGRADES } from '../ships/upgrades';
import { EQUIPMENT_ITEMS } from '../equipment/equipment';

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

describe('upgradeListings', () => {
  it('projects every registered upgrade, since every upgrade is purchase-only', () => {
    const listings = upgradeListings(UPGRADES);
    expect(listings).toHaveLength(UPGRADES.length);
    expect(listings.every((listing) => listing.kind === 'upgrade')).toBe(true);
    expect(listings.map((listing) => listing.id)).toEqual(UPGRADES.map((upgrade) => upgrade.id));
  });

  it('carries each upgrade’s real name and price through unchanged', () => {
    const strongerEngines = findUpgradeById('stronger-engines');
    const listing = upgradeListings(UPGRADES).find(
      (candidate) => candidate.id === 'stronger-engines',
    );
    expect(listing).toEqual({
      kind: 'upgrade',
      id: strongerEngines.id,
      name: strongerEngines.name,
      price: strongerEngines.price,
    });
  });
});

describe('equipmentListings', () => {
  it('includes exactly the purchase-type equipment items in the registry', () => {
    const listings = equipmentListings(EQUIPMENT_ITEMS);
    const expectedIds = EQUIPMENT_ITEMS.filter((item) => item.acquisition.type === 'purchase').map(
      (item) => item.id,
    );
    expect(listings.map((listing) => listing.id)).toEqual(expectedIds);
    expect(listings.every((listing) => listing.kind === 'equipment')).toBe(true);
  });

  it('excludes every unlock-type equipment item', () => {
    const listings = equipmentListings(EQUIPMENT_ITEMS);
    const unlockIds = EQUIPMENT_ITEMS.filter((item) => item.acquisition.type === 'unlock').map(
      (item) => item.id,
    );
    for (const unlockId of unlockIds) {
      expect(listings.some((listing) => listing.id === unlockId)).toBe(false);
    }
    expect(unlockIds.length).toBeGreaterThan(0);
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
