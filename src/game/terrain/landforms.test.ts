import { describe, expect, it } from 'vitest';

import { createSeededRandom } from '../random/seeded-random';
import { applyLandform } from './landforms';
import type { LandformBounds, LandformKind } from './landforms';

const ALL_KINDS: readonly LandformKind[] = [
  'crater-field',
  'dune-sea',
  'mesa',
  'ice-spikes',
  'wave-swell',
  'hummocks',
  'rift-canyon',
  'basin',
  'terraces',
  'cracked-flats',
  'volcano',
  'needle-spires',
];

const BOUNDS: LandformBounds = { peakY: 330, floorY: 540 };
const POINT_COUNT = 121;
const WALK_SEED = 41;
const LANDFORM_SEED = 4242;

/** A plausible walk heightmap inside the bounds, deterministic. */
function makeWalkHeights(seed: number): number[] {
  const random = createSeededRandom(seed);
  const heights: number[] = [];
  for (let i = 0; i < POINT_COUNT; i += 1) {
    heights.push(BOUNDS.peakY + random() * (BOUNDS.floorY - BOUNDS.peakY));
  }
  return heights;
}

describe('applyLandform', () => {
  it('is deterministic: same walk, kind, and seed produce identical heights', () => {
    for (const kind of ALL_KINDS) {
      const walk = makeWalkHeights(WALK_SEED);
      const first = applyLandform(walk, kind, createSeededRandom(LANDFORM_SEED), BOUNDS);
      const second = applyLandform(walk, kind, createSeededRandom(LANDFORM_SEED), BOUNDS);
      expect(second, kind).toEqual(first);
    }
  });

  it('does not mutate the input walk heights', () => {
    const walk = makeWalkHeights(WALK_SEED);
    const copy = [...walk];
    applyLandform(walk, 'volcano', createSeededRandom(LANDFORM_SEED), BOUNDS);
    expect(walk).toEqual(copy);
  });

  it('keeps every shaped height inside the peak/floor bounds for every kind and several seeds', () => {
    for (const kind of ALL_KINDS) {
      for (const seed of [1, 77, 4242]) {
        const shaped = applyLandform(
          makeWalkHeights(WALK_SEED),
          kind,
          createSeededRandom(seed),
          BOUNDS,
        );
        expect(shaped).toHaveLength(POINT_COUNT);
        for (const y of shaped) {
          expect(y, `${kind} seed ${String(seed)}`).toBeGreaterThanOrEqual(BOUNDS.peakY);
          expect(y, `${kind} seed ${String(seed)}`).toBeLessThanOrEqual(BOUNDS.floorY);
        }
      }
    }
  });

  it('produces a distinct profile for every kind given identical inputs — the kind genuinely drives the shape', () => {
    const walk = makeWalkHeights(WALK_SEED);
    const profiles = ALL_KINDS.map((kind) =>
      applyLandform(walk, kind, createSeededRandom(LANDFORM_SEED), BOUNDS).join(','),
    );
    expect(new Set(profiles).size).toBe(ALL_KINDS.length);
  });

  it('differs across landform seeds for seed-driven kinds', () => {
    const walk = makeWalkHeights(WALK_SEED);
    for (const kind of ['crater-field', 'volcano', 'needle-spires'] as const) {
      const a = applyLandform(walk, kind, createSeededRandom(1), BOUNDS);
      const b = applyLandform(walk, kind, createSeededRandom(2), BOUNDS);
      expect(a.join(','), kind).not.toBe(b.join(','));
    }
  });
});
