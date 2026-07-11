/**
 * A ship's archetype — a hull FAMILY, not just flavor text since Milestone
 * 14: `ships/silhouette.ts` keys `SHIP_SILHOUETTES` on this value, and
 * `rendering/ship-visual.ts` selects each craft's multi-piece papercraft
 * artwork through it, so an archetype now visibly IS the ship's shape in
 * flight. Flight feel still comes entirely from the numeric stats below —
 * the archetype drives art, never physics.
 */
export type ShipArchetype =
  'balanced' | 'scout' | 'courier' | 'hauler' | 'gunship' | 'interceptor' | 'specialist';

/**
 * How a ship becomes available to fly (Decision D13). `'starter'` ships are
 * owned from a fresh save. `'purchase'` ships need Milestone 8's currency
 * and store transaction — that milestone doesn't exist yet, so this
 * milestone can only ever show the price, never mark one owned (read-only
 * "is it available" logic is this milestone's whole job here; wiring a real
 * purchase button is M8's acceptance criteria, not this one's). `'unlock'`
 * ships become available once a specific Milestone 6 base reaches
 * `'established'`, checked read-only against a live `BaseProgressMap`
 * (`persistence/base-progress.ts`) — `requiredBaseId` is a `Base.id`, not a
 * function, so this stays plain, serializable authored data like every
 * other registry in this project.
 */
export type ShipAcquisition =
  | { readonly type: 'starter' }
  | { readonly type: 'purchase'; readonly price: number }
  | { readonly type: 'unlock'; readonly requiredBaseId: string; readonly description: string };

export interface ShipClass {
  readonly id: string;
  readonly name: string;
  readonly archetype: ShipArchetype;

  /** Mass units (MU). Thrust model (PLAN.md §7, resolving §6b.6 item 2's
   * "mass or thrust multiplier" ambiguity): `engineForce = baseThrustAccel
   * × dryMass`, held fixed once a ship is registered — equipment/cargo
   * mass lowers realized acceleration without changing the engine itself,
   * via `equipment/equipment.ts`'s `effectiveThrustAccel(ship,
   * carriedMass) = baseThrustAccel × dryMass / (dryMass + carriedMass)`
   * (which cancels back to `baseThrustAccel` exactly at zero carried
   * mass). */
  readonly dryMass: number;
  /** px/s², realized at zero carried mass — see `dryMass`'s doc comment. */
  readonly baseThrustAccel: number;
  readonly fuelCapacity: number;
  /** Fuel units burned per second of held thrust, before hazard effects —
   * `FlightState` composes a corrosive/cold hazard's own drain/efficiency
   * multiplier on top of this, it isn't baked in here. */
  readonly burnRate: number;
  /** Rotation rate, degrees/s. Matches `BaseRequirements.handling`'s own
   * deg/s convention (`bases/base.ts`) so a base's handling requirement
   * compares directly against this value with no unit conversion. */
  readonly handling: number;
  /** Equipment slot count — the loadout screen's live slot budget
   * (`equipment/loadout.ts`'s `resolveEquippedItems` trims the persisted
   * loadout to this many items; `loadout-scene.ts` renders it). */
  readonly equipmentSlots: number;
  /** Total mass-units this class can carry across equipment and cargo
   * combined — the one shared budget every carried thing draws from
   * (PLAN.md §9.5.1): loadout/cargo fit checks (`equipment/loadout.ts`,
   * `missions/cargo.ts`'s `evaluateCargoFit`, `missions/relay.ts`'s
   * feasibility) gate against it, and `missions/reward.ts`'s
   * `massUtilization` scales the per-trip risk bonus by how much of it a
   * flight actually committed. */
  readonly massBudget: number;
  /** Secondary, cargo-only ceiling (Milestone 9.5); independent of
   * remaining `massBudget` headroom — `0` would be valid for a pure-combat
   * class with no cargo bay at all (none of this roster's ships need that
   * yet). */
  readonly cargoBayCapacity: number;
  /** Fuel units per Transit Unit of same/cross-world relay distance —
   * `missions/relay.ts`'s `transitFuelCost` multiplies it against a
   * route's distance, and `TransitScene` charges the result between relay
   * legs. */
  readonly fuelPerDistanceUnit: number;

  /** Hull gradient fill (top lighter, bottom darker — matches every other
   * `createPaperShape` caller's own light-source convention, `planets/
   * bodies.ts`'s `terrainPalette` being the closest precedent for a
   * per-registry-entry color pair). `GameScene` reads this instead of a
   * single global `LANDER_FILL_COLOR_*` constant so each ship actually
   * reads as a distinct silhouette in flight, not just in its stat sheet —
   * Decision D18's own stated rationale for the current art style names
   * this property explicitly. */
  readonly hullFillColorTop: number;
  readonly hullFillColorBottom: number;

  readonly acquisition: ShipAcquisition;
}
