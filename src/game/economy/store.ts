import type { ShipClass } from '../ships/ship';

/**
 * A listing's domain — routes `StoreScene`'s purchase-completion logic to
 * the right domain-specific "mark this owned" persistence call
 * (`persistence/ship-progress.ts`'s `purchaseShip` for `'ship'` today).
 * Single-member today since Milestone 7's ship roster is this project's
 * only `acquisition: { type: 'purchase' }` catalog; Milestone 9 extends
 * this with `'equipment'` when its own purchasable items exist, without
 * `StoreScene`'s generic listing/afford/purchase mechanism needing to
 * change (Milestone 8's own PLAN.md scope text calls for exactly this).
 *
 * @public every `StoreListing` authors a `kind` value satisfying this type
 * structurally (a plain string literal); this named alias isn't imported by
 * name anywhere yet since `StoreScene` doesn't yet need to branch on it with
 * only one member. Not dead code — matches `ships/ship.ts`'s `ShipArchetype`
 * precedent for a field's type alias with no by-name importer yet.
 */
export type StoreListingKind = 'ship';

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
