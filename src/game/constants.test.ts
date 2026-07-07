import { describe, expect, it } from 'vitest';
import {
  FAR_RIDGE_SEGMENTS,
  MID_RIDGE_SEGMENTS,
  STAR_COUNT,
  TERRAIN_SEGMENTS,
  WORLD_WIDTH,
  GAME_WIDTH,
} from './constants';

/**
 * A handful of constants are now derived (a *_PER_SCREEN base times
 * WORLD_WIDTH_MULTIPLIER — Milestone 2.5), not flat literals. A typo
 * transposing the operator (e.g. `+` instead of `*`) would silently change
 * world/terrain/star density with nothing else in the suite noticing —
 * these pin the actual resulting values against hand-computed expectations.
 */
describe('derived constants', () => {
  it('WORLD_WIDTH is GAME_WIDTH scaled by the world-width multiplier', () => {
    expect(WORLD_WIDTH).toBe(GAME_WIDTH * 3);
  });

  it('TERRAIN_SEGMENTS scales with the world-width multiplier', () => {
    expect(TERRAIN_SEGMENTS).toBe(40 * 3);
  });

  it('STAR_COUNT scales with the world-width multiplier', () => {
    expect(STAR_COUNT).toBe(90 * 3);
  });

  it('FAR_RIDGE_SEGMENTS scales with the world-width multiplier', () => {
    expect(FAR_RIDGE_SEGMENTS).toBe(12 * 3);
  });

  it('MID_RIDGE_SEGMENTS scales with the world-width multiplier', () => {
    expect(MID_RIDGE_SEGMENTS).toBe(16 * 3);
  });
});
