import { boundedRandomWalk } from '../random/bounded-random-walk';
import { createSeededRandom } from '../random/seeded-random';

export interface RidgePoint {
  readonly x: number;
  readonly y: number;
}

export interface GenerateRidgelineOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly segments: number;
  readonly minHeightFraction: number;
  readonly maxHeightFraction: number;
  readonly maxStepFraction: number;
}

/**
 * A bounded-random-walk skyline silhouette for the background's distant
 * parallax layer — same generation shape as terrain-generator.ts's gameplay
 * heightmap, minus the landing-pad flattening step, which has no meaning
 * for a purely decorative background band.
 */
export function generateRidgeline(options: GenerateRidgelineOptions): RidgePoint[] {
  const random = createSeededRandom(options.seed);
  const minHeight = options.height * options.minHeightFraction;
  const maxHeight = options.height * options.maxHeightFraction;
  const maxStep = options.height * options.maxStepFraction;
  const segmentWidth = options.width / options.segments;

  const heights = boundedRandomWalk(random, options.segments, minHeight, maxHeight, maxStep);

  return heights.map((y, index) => ({ x: index * segmentWidth, y }));
}
