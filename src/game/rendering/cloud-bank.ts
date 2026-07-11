import { createSeededRandom } from '../random/seeded-random';

/**
 * Pure, seeded geometry for the papercraft cloud treatment (PLAN.md
 * Milestone 14) — the layered scalloped cloud banks and floating cloud
 * puffs that define the reference art's look. This module only computes
 * circle layouts; `rendering/background.ts` bakes them into textures.
 *
 * Phaser-free and unit-tested, same convention as `starfield.ts`/
 * `ridgeline.ts`.
 */

export interface CloudCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface GenerateCloudBankOptions {
  readonly seed: number;
  /** Total width the scallop row must span (the bank fills [0, width]). */
  readonly width: number;
  /** Vertical center line the scallop circles sit on — the band below it
   * is filled solid by the renderer, so only the top halves read as the
   * scalloped edge. */
  readonly baselineY: number;
  readonly minRadius: number;
  readonly maxRadius: number;
  /** 0-1: how far each scallop overlaps its neighbor. Higher = denser,
   * lumpier edge (reference-art clouds sit around 0.35-0.5). */
  readonly overlapFraction: number;
  /** Max vertical jitter of each scallop's center around the baseline, so
   * the edge undulates instead of reading as a perfect arc row. */
  readonly jitterY: number;
}

/**
 * One scalloped cloud-bank edge: a row of overlapping circles walking
 * left-to-right across the full width. Guaranteed to cover [0, width] with
 * no gap (the last circle always reaches past the right edge).
 */
export function generateCloudBank(options: GenerateCloudBankOptions): CloudCircle[] {
  const random = createSeededRandom(options.seed);
  const circles: CloudCircle[] = [];

  let x = 0;
  let previousRadius = 0;
  while (x - previousRadius < options.width) {
    const radius = options.minRadius + random() * (options.maxRadius - options.minRadius);
    if (circles.length > 0) {
      x += (previousRadius + radius) * (1 - options.overlapFraction);
    }
    const y = options.baselineY + (random() * 2 - 1) * options.jitterY;
    circles.push({ x, y, radius });
    previousRadius = radius;
  }

  return circles;
}

export interface GenerateCloudPuffOptions {
  readonly seed: number;
  /** Radius of the puff's central circle; the side/top lobes scale off it. */
  readonly coreRadius: number;
}

/** Relative lobe layout for one floating paper-cloud puff: a large core,
 * two lower side lobes, and one high shoulder lobe — the classic
 * four-lobe cutout silhouette in the reference art. Each entry is
 * {xFraction, yFraction, radiusFraction} of the core radius; small seeded
 * jitter keeps repeated puffs from reading as literal copies. */
const PUFF_LOBES = [
  { xFraction: 0, yFraction: 0, radiusFraction: 1 },
  { xFraction: -0.95, yFraction: 0.3, radiusFraction: 0.62 },
  { xFraction: 0.95, yFraction: 0.34, radiusFraction: 0.56 },
  { xFraction: 0.42, yFraction: -0.42, radiusFraction: 0.52 },
] as const;
const PUFF_LOBE_JITTER_FRACTION = 0.08;

/** One floating cloud puff as a small circle cluster, centered on (0, 0). */
export function generateCloudPuff(options: GenerateCloudPuffOptions): CloudCircle[] {
  const random = createSeededRandom(options.seed);
  return PUFF_LOBES.map((lobe) => ({
    x:
      lobe.xFraction * options.coreRadius +
      (random() * 2 - 1) * PUFF_LOBE_JITTER_FRACTION * options.coreRadius,
    y:
      lobe.yFraction * options.coreRadius +
      (random() * 2 - 1) * PUFF_LOBE_JITTER_FRACTION * options.coreRadius,
    radius: lobe.radiusFraction * options.coreRadius,
  }));
}

export interface PuffPlacement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface GeneratePuffPlacementsOptions {
  readonly seed: number;
  readonly width: number;
  readonly minY: number;
  readonly maxY: number;
  readonly count: number;
  readonly minScale: number;
  readonly maxScale: number;
}

/** Scattered positions/scales for the floating puffs across the world's
 * sky band — deterministic per seed, like every background layout here. */
export function generatePuffPlacements(options: GeneratePuffPlacementsOptions): PuffPlacement[] {
  const random = createSeededRandom(options.seed);
  const placements: PuffPlacement[] = [];
  for (let i = 0; i < options.count; i += 1) {
    placements.push({
      x: random() * options.width,
      y: options.minY + random() * (options.maxY - options.minY),
      scale: options.minScale + random() * (options.maxScale - options.minScale),
    });
  }
  return placements;
}
