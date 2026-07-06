import { describe, expect, it } from 'vitest';
import {
  generateTerrain,
  getTerrainHeightAt,
  type GenerateTerrainOptions,
} from './terrain-generator';

const BASE_OPTIONS: GenerateTerrainOptions = {
  seed: 12345,
  width: 960,
  height: 640,
  segments: 40,
  minHeightFraction: 0.55,
  maxHeightFraction: 0.9,
  maxStepFraction: 0.05,
  padSegmentCount: 3,
};

describe('generateTerrain', () => {
  it('is deterministic given the same seed', () => {
    const a = generateTerrain(BASE_OPTIONS);
    const b = generateTerrain(BASE_OPTIONS);
    expect(a).toEqual(b);
  });

  it('produces different terrain for a different seed', () => {
    const a = generateTerrain(BASE_OPTIONS);
    const b = generateTerrain({ ...BASE_OPTIONS, seed: 99999 });
    expect(a).not.toEqual(b);
  });

  it('generates segments + 1 points spanning exactly the requested width', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    expect(terrain.points).toHaveLength(BASE_OPTIONS.segments + 1);
    expect(terrain.points[0]?.x).toBe(0);
    expect(terrain.points[terrain.points.length - 1]?.x).toBe(BASE_OPTIONS.width);
  });

  it('keeps every point within the configured height band', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const minHeight = BASE_OPTIONS.height * BASE_OPTIONS.minHeightFraction;
    const maxHeight = BASE_OPTIONS.height * BASE_OPTIONS.maxHeightFraction;
    for (const point of terrain.points) {
      expect(point.y).toBeGreaterThanOrEqual(minHeight - Number.EPSILON);
      expect(point.y).toBeLessThanOrEqual(maxHeight + Number.EPSILON);
    }
  });

  it('never changes height between adjacent points by more than the max step', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const maxStep = BASE_OPTIONS.height * BASE_OPTIONS.maxStepFraction;
    for (let i = 1; i < terrain.points.length; i += 1) {
      const previous = terrain.points[i - 1];
      const current = terrain.points[i];
      if (!previous || !current) {
        continue;
      }
      // The landing pad flattens several adjacent points to an equal height,
      // which is a zero-delta special case, not a violation of the max-step
      // random walk that generates everything else.
      expect(Math.abs(current.y - previous.y)).toBeLessThanOrEqual(maxStep + Number.EPSILON);
    }
  });

  it('flattens exactly padSegmentCount consecutive points to the same height', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const { landingPad, points } = terrain;
    const padPoints = points.filter((p) => p.x >= landingPad.xStart && p.x <= landingPad.xEnd);
    expect(padPoints).toHaveLength(BASE_OPTIONS.padSegmentCount);
    for (const point of padPoints) {
      expect(point.y).toBe(landingPad.y);
    }
  });

  it('keeps the landing pad away from both edges of the terrain', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    expect(terrain.landingPad.xStart).toBeGreaterThan(0);
    expect(terrain.landingPad.xEnd).toBeLessThan(BASE_OPTIONS.width);
  });
});

describe('getTerrainHeightAt', () => {
  const points = [
    { x: 0, y: 100 },
    { x: 10, y: 200 },
    { x: 20, y: 100 },
  ];

  it('returns the exact height at a known point', () => {
    expect(getTerrainHeightAt(points, 0)).toBe(100);
    expect(getTerrainHeightAt(points, 10)).toBe(200);
    expect(getTerrainHeightAt(points, 20)).toBe(100);
  });

  it('linearly interpolates between two points', () => {
    expect(getTerrainHeightAt(points, 5)).toBeCloseTo(150);
    expect(getTerrainHeightAt(points, 15)).toBeCloseTo(150);
  });

  it('clamps to the first point height before the terrain starts', () => {
    expect(getTerrainHeightAt(points, -50)).toBe(100);
  });

  it('clamps to the last point height past the terrain end', () => {
    expect(getTerrainHeightAt(points, 999)).toBe(100);
  });
});
