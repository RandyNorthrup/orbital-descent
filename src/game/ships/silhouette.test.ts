import { describe, expect, it } from 'vitest';
import { SHIP_SILHOUETTES } from './silhouette';
import { SHIPS } from './ships';
import type { ShipArchetype } from './ship';

/** Matches LANDER_RADIUS (14) + the small allowed art overhang documented
 * in silhouette.ts's own header — the drawn craft may not promise a
 * wildly different target than the fixed collision circle physics checks. */
const MAX_ART_EXTENT_PX = 18;
const MIN_POLYGON_VERTICES = 3;

const ARCHETYPES = Object.keys(SHIP_SILHOUETTES) as ShipArchetype[];

describe('SHIP_SILHOUETTES', () => {
  it('covers every archetype the ship roster actually uses', () => {
    for (const ship of SHIPS) {
      expect(SHIP_SILHOUETTES[ship.archetype]).toBeDefined();
    }
  });

  it('gives every archetype a distinct body outline (no two hull families sharing a shape)', () => {
    const signatures = new Set(
      ARCHETYPES.map((archetype) => JSON.stringify(SHIP_SILHOUETTES[archetype].bodyPoints)),
    );
    expect(signatures.size).toBe(ARCHETYPES.length);
  });

  it('keeps every vertex of every piece within the allowed art extent of the collision circle', () => {
    for (const archetype of ARCHETYPES) {
      const silhouette = SHIP_SILHOUETTES[archetype];
      const allPoints = [...silhouette.bodyPoints, ...silhouette.finPolygons.flat()];
      for (const point of allPoints) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
      }
    }
  });

  it('gives every piece a real polygon (3+ vertices) and every window a positive radius inside the hull extent', () => {
    for (const archetype of ARCHETYPES) {
      const silhouette = SHIP_SILHOUETTES[archetype];
      expect(silhouette.bodyPoints.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      for (const fin of silhouette.finPolygons) {
        expect(fin.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      }
      expect(silhouette.window.radius).toBeGreaterThan(0);
      expect(Math.abs(silhouette.window.x)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
      expect(Math.abs(silhouette.window.y)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
    }
  });

  it('keeps every hull nose pointing up (topmost vertex on the body, not a fin)', () => {
    for (const archetype of ARCHETYPES) {
      const silhouette = SHIP_SILHOUETTES[archetype];
      const bodyTop = Math.min(...silhouette.bodyPoints.map((point) => point.y));
      const finTop = Math.min(...silhouette.finPolygons.flat().map((point) => point.y));
      expect(bodyTop).toBeLessThan(finTop);
    }
  });

  // Milestone 16.5 (D26) — the vessel-detail pass.

  it('gives every archetype a real canopy, at least one nacelle, and at least one role attachment', () => {
    for (const archetype of ARCHETYPES) {
      const silhouette = SHIP_SILHOUETTES[archetype];
      expect(silhouette.canopy.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      expect(silhouette.nacelles.length).toBeGreaterThanOrEqual(1);
      expect(silhouette.attachments.length).toBeGreaterThanOrEqual(1);
      for (const attachment of silhouette.attachments) {
        expect(attachment.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      }
    }
  });

  it('keeps every detail piece (canopy, attachments, nacelle boxes, portholes) inside the allowed art extent', () => {
    for (const archetype of ARCHETYPES) {
      const silhouette = SHIP_SILHOUETTES[archetype];
      for (const point of [...silhouette.canopy, ...silhouette.attachments.flat()]) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
      }
      for (const nacelle of silhouette.nacelles) {
        expect(Math.abs(nacelle.x) + nacelle.halfWidth).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(nacelle.y + nacelle.height).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(nacelle.halfWidth).toBeGreaterThan(0);
        expect(nacelle.height).toBeGreaterThan(0);
      }
      for (const porthole of silhouette.portholes) {
        expect(porthole.radius).toBeGreaterThan(0);
        expect(Math.abs(porthole.x)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(Math.abs(porthole.y)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
      }
    }
  });
});
