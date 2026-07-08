import type { ShipClass } from '../ships/ship';
import type { PermanentUpgrade } from '../ships/upgrades';
import type { EquipmentItem } from '../equipment/equipment';

/**
 * A listing's domain — routes `StoreScene`'s purchase-completion logic to
 * the right domain-specific "mark this owned" persistence call
 * (`purchaseShip`/`purchaseUpgrade`/`purchaseEquipment`). Milestone 8's own
 * PLAN.md scope text anticipated exactly this extension: `StoreScene`'s
 * generic listing/afford/purchase mechanism didn't need to change to grow
 * from one member to three.
 */
export type StoreListingKind = 'ship' | 'upgrade' | 'equipment';

/**
 * One sellable item, generic across domains — a `ShipClass` (Milestone 7)
 * projects down to one of these; a future `EquipmentItem` (Milestone 9)
 * will too. Deliberately just `{kind, id, name, price}`: the store's own
 * mechanism (afford-check, balance deduction, ownership persistence) only
 * ever needs these four fields, regardless of which domain a listing came
 * from.
 */
export interface StoreListing {
  readonly kind: StoreListingKind;
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

/**
 * Projects every `'purchase'`-type ship in `ships` down to a
 * `StoreListing` — the store's only catalog source at Milestone 8's own
 * build time (Milestone 8 depends on Milestone 7, so a direct `ShipClass`
 * import here is a normal forward dependency, not a layering violation —
 * `bases/bases.ts` already imports `ships/ships.ts` the same way).
 * Milestone 9 adds its own equipment-listing builder alongside this one;
 * `StoreScene` concatenates both into one flat list — `StoreScene` is
 * what changes then, not this function or the store mechanism it feeds.
 */
export function shipListings(ships: readonly ShipClass[]): readonly StoreListing[] {
  return ships
    .filter(
      (
        ship,
      ): ship is ShipClass & {
        readonly acquisition: { readonly type: 'purchase'; readonly price: number };
      } => ship.acquisition.type === 'purchase',
    )
    .map((ship) => ({
      kind: 'ship',
      id: ship.id,
      name: ship.name,
      price: ship.acquisition.price,
    }));
}

/**
 * Projects every `PermanentUpgrade` down to a `StoreListing` — unlike ships
 * and equipment, every permanent upgrade is purchase-only (Decision D14:
 * "bought once, always active"), so there is no acquisition-type filter to
 * apply first.
 */
export function upgradeListings(upgrades: readonly PermanentUpgrade[]): readonly StoreListing[] {
  return upgrades.map((upgrade) => ({
    kind: 'upgrade',
    id: upgrade.id,
    name: upgrade.name,
    price: upgrade.price,
  }));
}

/**
 * Projects every `'purchase'`-type equipment item down to a `StoreListing` —
 * mirrors `shipListings`'s exact filter-then-project shape for the other
 * acquisition-gated domain. `'unlock'`-type items never appear in the
 * store's catalog; they become available once their `requiredBaseId` is
 * established, surfaced instead on the loadout screen (`scenes/
 * loadout-scene.ts`) the same way `ShipSelectScene` shows an unlock-type
 * ship's condition.
 */
export function equipmentListings(items: readonly EquipmentItem[]): readonly StoreListing[] {
  return items
    .filter(
      (
        item,
      ): item is EquipmentItem & {
        readonly acquisition: { readonly type: 'purchase'; readonly price: number };
      } => item.acquisition.type === 'purchase',
    )
    .map((item) => ({
      kind: 'equipment',
      id: item.id,
      name: item.name,
      price: item.acquisition.price,
    }));
}

export function canAfford(listing: StoreListing, balance: number): boolean {
  return balance >= listing.price;
}

/**
 * A listing's purchase state, for the store UI's three-way display
 * (already owned / affordable and buyable / too expensive) — mirrors
 * `ShipSelectScene`'s locked/available split, with "owned" as the extra
 * third state a store (unlike a persistent ship roster) needs, since a
 * listing that's already been bought is no longer for sale at all.
 */
export type ListingStatus = 'owned' | 'affordable' | 'too-expensive';

export function listingStatus(
  listing: StoreListing,
  ownedIds: readonly string[],
  balance: number,
): ListingStatus {
  if (ownedIds.includes(listing.id)) {
    return 'owned';
  }
  return canAfford(listing, balance) ? 'affordable' : 'too-expensive';
}
