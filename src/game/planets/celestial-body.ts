/** Ground material family — picks a distinct etched-texture stroke recipe
 * (see `rendering/paper-shape.ts`) so twelve worlds read as twelve
 * different places, not the same gray rock recolored twelve times. */
export type EtchStyle = 'rock' | 'sand' | 'water' | 'foliage';

/** Not exported — nothing outside this file needs to name this shape on its
 * own, only as `CelestialBody.terrainPalette`. */
interface TerrainPalette {
  readonly fillTopColor: number;
  readonly fillBottomColor: number;
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
  readonly skyTopColor: number;
  readonly skyBottomColor: number;
  /** The world's dominant celestial companion — sun or moon by fiction,
   * one glowing cratered disc either way. */
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
