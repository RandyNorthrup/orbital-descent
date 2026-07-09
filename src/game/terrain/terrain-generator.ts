import { boundedRandomWalk } from '../random/bounded-random-walk';
import { createSeededRandom } from '../random/seeded-random';

/** A point on the terrain profile, in world px. y grows downward (Phaser convention). */
export interface TerrainPoint {
  readonly x: number;
  readonly y: number;
}

export interface LandingPad {
  readonly xStart: number;
  readonly xEnd: number;
  readonly y: number;
}

/** A static, non-terrain flight hazard placed alongside the heightmap
 * (Milestone 10, PLAN.md §6b.2/§10) — a rock spire (ground-attached) or a
 * chunk of floating debris. Collision testing lives in `obstacles.ts`,
 * kept dependency-free like `landing.ts`; this type lives here since it's
 * part of `GenerateTerrainOptions`/`Terrain`'s own shape.
 *
 * @public every `Obstacle.kind` is authored as a plain string literal
 * (`bases.ts`, `game-scene.ts`'s own `obstacle.kind === 'spire'` check),
 * satisfying this type structurally without importing it by name —
 * not dead code, matches `bases/base.ts`'s `HandlingBand`/`WeaponTier`
 * precedent for a field's type alias with no by-name importer yet. */
export type ObstacleKind = 'spire' | 'debris';

export interface Obstacle {
  readonly kind: ObstacleKind;
  readonly xStart: number;
  readonly xEnd: number;
  readonly yTop: number; // smaller y = higher (Phaser y-down)
  readonly yBottom: number;
  /** Absent = a pure flight hazard (crash on contact, unconditionally).
   * Present once Milestone 11 ships = combat-clearable: `armorRating` is
   * the effective-damage floor, `cleared` flips once its own health (not
   * modeled here) reaches zero. Milestone 10 itself never sets either
   * field — every obstacle it authors or generates is, by construction,
   * uncleared (PLAN.md §10's own acceptance criteria). */
  readonly armorRating?: number;
  readonly cleared?: boolean;
}

export interface Terrain {
  readonly points: readonly TerrainPoint[];
  readonly landingPad: LandingPad;
  /** Always an array, never undefined — empty for every base authored
   * before Milestone 10, and for any base that simply doesn't opt into
   * `GenerateTerrainOptions.obstacles`. Echoes `options.obstacles`
   * verbatim; `generateTerrain` never invents obstacles a caller didn't
   * ask for (see that option's own doc comment for why). */
  readonly obstacles: readonly Obstacle[];
}

export interface GenerateTerrainOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly segments: number;
  readonly minHeightFraction: number;
  readonly maxHeightFraction: number;
  readonly maxStepFraction: number;
  readonly padSegmentCount: number;
  /** Milestone 10: pins the pad to an exact segment index instead of
   * letting the seeded PRNG choose one — lets a curated base place
   * obstacles at predictable coordinates relative to a known pad position
   * without also having to solve for wherever the pad would otherwise
   * randomly land. Optional; absent reproduces the pre-Milestone-10
   * random pad-index selection exactly, so every base authored before
   * this milestone (none of which set this field) is unaffected. */
  readonly padStartIndexOverride?: number;
  /** Milestone 10: authored height overrides ("cliffs/plateaus") applied
   * at specific segment indices, before pad flattening — so an override
   * landing inside the chosen pad's own segment range is harmlessly
   * superseded by the pad-flattening step that runs after, never fighting
   * it. Optional; absent (every pre-Milestone-10 base) leaves height
   * generation completely unchanged. */
  readonly terrainOverrides?: readonly { readonly index: number; readonly y: number }[];
  /** Milestone 10: a fixed, curated obstacle layout. Optional and
   * deliberately inert when absent — `generateTerrain` never procedurally
   * invents obstacles on a caller's behalf, only ever echoes exactly what
   * a caller explicitly authored, so every pre-Milestone-10
   * `GenerateTerrainOptions` (including free flight's own default options)
   * keeps generating zero obstacles, unchanged. A future procedural/
   * endless mode wanting randomized placement computes its own `Obstacle[]`
   * (deterministically, from its own seed) and passes it here like any
   * other curated content — there is no separate "procedural" code path
   * inside this function to keep in sync with the curated one. */
  readonly obstacles?: readonly Obstacle[];
}

const MIN_PAD_MARGIN_SEGMENTS = 1;

/**
 * Generates a heightmap as a bounded random walk (each point's height stays
 * within maxStepFraction of the previous one), so the profile reads as
 * connected ground rather than disconnected spikes, then flattens a random
 * contiguous run of segments into the landing pad.
 */
export function generateTerrain(options: GenerateTerrainOptions): Terrain {
  const random = createSeededRandom(options.seed);
  const minHeight = options.height * options.minHeightFraction;
  const maxHeight = options.height * options.maxHeightFraction;
  const maxStep = options.height * options.maxStepFraction;
  const segmentWidth = options.width / options.segments;

  const heights = boundedRandomWalk(random, options.segments, minHeight, maxHeight, maxStep);

  // Milestone 10: authored cliffs/plateaus, applied before pad flattening
  // so the pad-flattening step below is always the last word for any
  // segment index that happens to fall inside the chosen pad.
  for (const override of options.terrainOverrides ?? []) {
    heights[override.index] = override.y;
  }

  // Milestone 10: an explicit `padStartIndexOverride` bypasses the random
  // draw entirely (not merely overriding its result) — it means "this
  // pad's position is authored, not derived from the seed," so nothing
  // should consume a random() call on its behalf.
  const lastValidPadStart = options.segments - options.padSegmentCount - MIN_PAD_MARGIN_SEGMENTS;
  const padStartIndex =
    options.padStartIndexOverride ??
    MIN_PAD_MARGIN_SEGMENTS +
      Math.floor(random() * Math.max(1, lastValidPadStart - MIN_PAD_MARGIN_SEGMENTS + 1));
  const padHeight = heights[padStartIndex] ?? minHeight;
  for (let i = 0; i < options.padSegmentCount; i += 1) {
    heights[padStartIndex + i] = padHeight;
  }

  const points: TerrainPoint[] = heights.map((y, index) => ({ x: index * segmentWidth, y }));

  return {
    points,
    landingPad: {
      xStart: padStartIndex * segmentWidth,
      xEnd: (padStartIndex + options.padSegmentCount - 1) * segmentWidth,
      y: padHeight,
    },
    obstacles: options.obstacles ?? [],
  };
}

/** Linearly interpolates terrain height at an arbitrary x, clamping to the
 * first/last point's height for x outside the terrain's own range. */
export function getTerrainHeightAt(points: readonly TerrainPoint[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || x <= first.x) {
    return first?.y ?? 0;
  }
  if (x >= last.x) {
    return last.y;
  }

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    if (!previous || !current || x > current.x) {
      continue;
    }
    const span = current.x - previous.x;
    const t = span === 0 ? 0 : (x - previous.x) / span;
    return previous.y + (current.y - previous.y) * t;
  }

  return last.y;
}
