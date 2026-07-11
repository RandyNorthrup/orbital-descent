import type { LandformKind } from '../terrain/landforms';

/** Ground material family — picks a distinct etched-texture stroke recipe
 * (see `rendering/paper-shape.ts`) so twelve worlds read as twelve
 * different places, not the same gray rock recolored twelve times. */
export type EtchStyle = 'rock' | 'sand' | 'water' | 'foliage';

/**
 * The world-taxonomy axis missions and content design key off (PLAN.md
 * Milestone 15, Decision D22): `moon`s are airless satellites focused on
 * supply-drop logistics, `barren` worlds are dead planets focused on
 * supply drops and raw-material extraction, and `lush` worlds are the
 * habitable ones — the only places hostile encounters may live (hostiles
 * need a biosphere to live in; `bases.test.ts` pins that every base with
 * encounters sits on a lush world). `moon` ⇔ `atmosphereDensity === 0` is
 * likewise pinned by `bodies.test.ts` — an airless "planet" or an
 * atmosphere-bearing "moon" would be a data bug, not flavor.
 */
export type WorldKind = 'moon' | 'barren' | 'lush';

/** Not exported — nothing outside this file needs to name this shape on its
 * own, only as `CelestialBody.terrainPalette`. */
interface TerrainPalette {
  readonly fillTopColor: number;
  readonly fillBottomColor: number;
  /**
   * Milestone 16.6 (D27): the two deeper strata bands the ground stack
   * renders below the surface layer — authored contrasting hues per the
   * paper_mario_worlds references (the Mars scene's red-family stack, the
   * ice scene's white-over-blue), not derivations of the fill colors.
   * `bodies.test.ts` pins both authored and distinct from the surface.
   */
  readonly strataColors: { readonly upper: number; readonly lower: number };
  readonly etchStyle: EtchStyle;
}

/**
 * A world's full sky/background identity (PLAN.md Milestone 14, the
 * papercraft-diorama art pass) — six hand-authored anchor colors per world.
 * Every derived shade (cloud rims/undersides, moon craters/glow, the
 * atmospheric far-ridge fade) comes from these via `rendering/color-mix.ts`
 * with shared, named fractions, so twelve worlds stay twelve *palettes*
 * sharing one lighting logic — not twelve independently-invented looks.
 *
 * Not exported — consumers only ever name it as `CelestialBody.skyPalette`,
 * same convention as `TerrainPalette` above.
 */
interface SkyPalette {
  /**
   * Time of day this world's diorama is authored at (Milestone 15 — twelve
   * worlds must not read as twelve night scenes). `day` renders a bright
   * sky with a crater-free sun disc and no stars; `dusk` renders the
   * cratered moon with a thinned starfield; `night` is Milestone 14's
   * original full treatment. Airless worlds (`kind: 'moon'`) are always
   * authored `night` — with no atmosphere to scatter daylight their sky is
   * black regardless of sun position (pinned by `bodies.test.ts`).
   */
  readonly daylight: 'day' | 'dusk' | 'night';
  readonly skyTopColor: number;
  readonly skyBottomColor: number;
  /** The world's dominant celestial companion — a crater-free glowing sun
   * disc at `daylight: 'day'`, a glowing cratered moon otherwise. */
  readonly moonColor: number;
  /** Base cloud paper color — present exactly when the world has a real
   * atmosphere (`atmosphereDensity > 0`), absent for airless worlds, which
   * get a companion moon and a denser starfield instead (see
   * `rendering/background.ts`). Present-iff-atmosphere is pinned by
   * `bodies.test.ts`, so a palette can't silently promise clouds a world's
   * own physics says it can't have. */
  readonly cloudColor?: number;
  /** Base color of the parallax ridge silhouettes; the far ridge renders
   * this mixed toward `skyBottomColor` (atmospheric perspective). */
  readonly ridgeColor: number;
  /** Unused at `daylight: 'day'` (no stars render against a lit sky) but
   * still authored for every world — a palette stays a complete six-color
   * identity whether or not today's renderer consumes every entry. */
  readonly starColor: number;
}

/** Not exported — a consumer narrows `Hazard` by `type`, it never needs to
 * name this member on its own. */
interface CorrosiveHazard {
  readonly type: 'corrosive';
  /** Passive fuel drain, in fuel units/sec, applied every tick regardless
   * of thrust input — see `flight/flight-state.ts`. */
  readonly fuelDrainRate: number;
}

/** Not exported — see `CorrosiveHazard`'s own comment for why. */
interface ColdHazard {
  readonly type: 'cold';
  /** Multiplier in (0, 1] applied to the ship's base thrust acceleration
   * while this hazard is active — see `flight/flight-state.ts`. */
  readonly thrustEfficiency: number;
}

/** Exactly one hazard type per body (Decision D11) — `null` for a hazard-free
 * world. Discriminated on `type` so a consumer can narrow without a cast. */
export type Hazard = CorrosiveHazard | ColdHazard | null;

export interface CelestialBody {
  readonly id: string;
  readonly name: string;
  /** See `WorldKind` — drives mission focus (extraction on barren worlds,
   * supply drops on moons) and where hostile encounters may live (lush
   * only). */
  readonly kind: WorldKind;
  readonly gravityAccel: number;
  /**
   * 0 for airless worlds. Passed as-is into `atmosphericDrag`'s
   * `dragCoefficient` parameter at its one real call site
   * (`FlightState`) — same quantity, named for what it models here (a
   * world property) vs. how it's used there (a drag-physics coefficient).
   * No conversion between the two names.
   */
  readonly atmosphereDensity: number;
  readonly hazard: Hazard;
  /**
   * The world's signature terrain silhouette (Milestone 16.5, D26) — the
   * shaping archetype `generateTerrain` applies over its random walk when
   * a flight happens here. A property of the WORLD (like `kind` and the
   * palettes), not of any one base: every landing site on a mesa world is
   * mesa country. `bodies.test.ts` pins that all twelve worlds' landforms
   * are pairwise distinct.
   */
  readonly landform: LandformKind;
  readonly terrainPalette: TerrainPalette;
  readonly skyPalette: SkyPalette;
  /**
   * Fictional "Transit Units" (TU) — a loose narrative/visual distance
   * for Milestone 6's world map today, and, from Milestone 9.5, the
   * literal fictional distance fed into relay-mission transit-fuel
   * costing. Explicitly NOT used for unlock ordering — Milestone 6's
   * `unlocks: string[]` graph handles that independently of this field
   * (see this milestone's own amendment note in PLAN.md for why).
   */
  readonly distance: number;
}
