/**
 * A ship's archetype flavor (PLAN.md §7/Milestone 7) — purely descriptive
 * today; no code branches on this value. Flight feel comes entirely from
 * the numeric stats below. Forward-compatible with a future tag-based hint
 * system (mirrors `bases/base.ts`'s `LoadoutTag`) without needing one yet.
 *
 * @public every ship in `ships/ships.ts`'s registry authors an `archetype`
 * value satisfying this type structurally (a plain string literal); this
 * named alias isn't imported by name anywhere yet since no code branches on
 * it. Not dead code — matches `bases/base.ts`'s `HandlingBand`/`WeaponTier`
 * precedent for a field's type alias with no by-name importer yet.
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
   * × dryMass`, held fixed once a ship is registered — bolting on
   * Milestone 9 equipment/cargo mass lowers realized acceleration without
   * changing the engine itself. Every flight before Milestone 9 ships
   * carries zero equipment/cargo mass, so realized thrust acceleration
   * equals `baseThrustAccel` exactly (`engineForce / dryMass` cancels to
   * `baseThrustAccel` whenever carried mass is zero) — this milestone
   * doesn't need to compute `engineForce` anywhere itself, only preserve
   * the invariant for Milestone 9 to build on. */
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
  /** Equipment slot count (Milestone 9) — unused until that milestone reads
   * it, exists now so a ship's slot budget doesn't need retrofitting in. */
  readonly equipmentSlots: number;
  /** Total mass-units this class can carry across equipment and cargo
   * combined (Milestones 9/9.5) — cheaper to bake into this not-yet-built
   * interface now than retrofit after this milestone certifies (PLAN.md
   * §7). Every flight before Milestone 9 carries zero mass, so this field
   * exists but drives nothing yet. */
  readonly massBudget: number;
  /** Secondary, cargo-only ceiling (Milestone 9.5); independent of
   * remaining `massBudget` headroom — `0` would be valid for a pure-combat
   * class with no cargo bay at all (none of this roster's ships need that
   * yet). */
  readonly cargoBayCapacity: number;
  /** Fuel units per Transit Unit of same/cross-world relay distance
   * (Milestone 9.5's `transitFuelCost`); unused until that milestone. */
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
