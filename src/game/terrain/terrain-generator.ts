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

export interface Terrain {
  readonly points: readonly TerrainPoint[];
  readonly landingPad: LandingPad;
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

  const lastValidPadStart = options.segments - options.padSegmentCount - MIN_PAD_MARGIN_SEGMENTS;
  const padStartIndex =
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
