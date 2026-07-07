import { createSeededRandom } from '../random/seeded-random';

export interface Star {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly alpha: number;
}

export interface GenerateStarfieldOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly maxRadius: number;
  readonly maxAlpha: number;
}

/**
 * Deterministic star positions/sizes/brightness for the background sky —
 * seeded so the layout is stable across scene restarts, unlike the gameplay
 * terrain, which deliberately reseeds every attempt (see terrain-generator.ts).
 */
export function generateStarfield(options: GenerateStarfieldOptions): Star[] {
  const random = createSeededRandom(options.seed);
  const stars: Star[] = [];
  for (let i = 0; i < options.count; i += 1) {
    stars.push({
      x: random() * options.width,
      y: random() * options.height,
      radius: random() * options.maxRadius,
      alpha: random() * options.maxAlpha,
    });
  }
  return stars;
}
