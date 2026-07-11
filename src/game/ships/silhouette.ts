import type { Vector2 } from '../physics/lander-physics';
import type { ShipArchetype } from './ship';

/**
 * Per-archetype hull artwork (PLAN.md Milestone 14) — the multi-piece
 * papercraft silhouettes that make seven ships read as seven different
 * craft in flight, not one recolored triangle. Decision D18 chose the
 * current art style specifically for distinct ship silhouettes; this is
 * the module that finally delivers them.
 *
 * Coordinates are local px around the ship's center of rotation, +y down
 * (screen space), ship nose pointing up — the same frame the old
 * single-triangle lander polygon used. Every design stays within roughly
 * ±(LANDER_RADIUS + 4)px so the drawn craft honestly matches the fixed
 * LANDER_RADIUS collision circle (visual may not promise a smaller or
 * hugely larger target than physics checks).
 *
 * Pure data, Phaser-free (rendered by `rendering/ship-visual.ts`), so the
 * per-archetype shape table is unit-testable in Node.
 */

/** Not exported — consumers only ever name it as `ShipSilhouette.window`,
 * the same member-only convention as `celestial-body.ts`'s palettes. */
interface ShipWindow {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ShipSilhouette {
  /** Main hull polygon — filled with the ship's own hull gradient. */
  readonly bodyPoints: readonly Vector2[];
  /** Accent pieces (fins, pods) — filled with a darkened hull shade, each
   * its own little paper cutout behind the hull. */
  readonly finPolygons: readonly (readonly Vector2[])[];
  /** Porthole window, the reference rocket's signature accent. */
  readonly window: ShipWindow;
}

/** Silhouettes keyed by archetype, not ship id: an archetype IS a hull
 * family (`ships.ts` maps each ship to exactly one), and a future ship
 * joining an existing archetype should inherit its family's hull rather
 * than silently falling back to some default triangle. */
export const SHIP_SILHOUETTES: Record<ShipArchetype, ShipSilhouette> = {
  // Classic finned rocket — the reference image's own hero shape.
  balanced: {
    bodyPoints: [
      { x: 0, y: -17 },
      { x: 6, y: -6 },
      { x: 7, y: 9 },
      { x: 4, y: 12 },
      { x: -4, y: 12 },
      { x: -7, y: 9 },
      { x: -6, y: -6 },
    ],
    finPolygons: [
      [
        { x: -6, y: 2 },
        { x: -13, y: 14 },
        { x: -6, y: 11 },
      ],
      [
        { x: 6, y: 2 },
        { x: 13, y: 14 },
        { x: 6, y: 11 },
      ],
    ],
    window: { x: 0, y: -2, radius: 3.2 },
  },
  // Slim dart: narrow, long nose, swept fins.
  scout: {
    bodyPoints: [
      { x: 0, y: -17 },
      { x: 4, y: -4 },
      { x: 5, y: 10 },
      { x: 2.5, y: 12 },
      { x: -2.5, y: 12 },
      { x: -5, y: 10 },
      { x: -4, y: -4 },
    ],
    finPolygons: [
      [
        { x: -4, y: 4 },
        { x: -9, y: 15 },
        { x: -4, y: 12 },
      ],
      [
        { x: 4, y: 4 },
        { x: 9, y: 15 },
        { x: 4, y: 12 },
      ],
    ],
    window: { x: 0, y: -5, radius: 2.4 },
  },
  // Rounded capsule: wide, friendly, small stub fins.
  courier: {
    bodyPoints: [
      { x: 0, y: -15 },
      { x: 7, y: -8 },
      { x: 8.5, y: 4 },
      { x: 6, y: 12 },
      { x: -6, y: 12 },
      { x: -8.5, y: 4 },
      { x: -7, y: -8 },
    ],
    finPolygons: [
      [
        { x: -8, y: 6 },
        { x: -12, y: 14 },
        { x: -6, y: 12 },
      ],
      [
        { x: 8, y: 6 },
        { x: 12, y: 14 },
        { x: 6, y: 12 },
      ],
    ],
    window: { x: 0, y: -3, radius: 3.6 },
  },
  // Broad combat wedge with side weapon pods.
  gunship: {
    bodyPoints: [
      { x: 0, y: -13 },
      { x: 9, y: -2 },
      { x: 10, y: 10 },
      { x: 5, y: 12 },
      { x: -5, y: 12 },
      { x: -10, y: 10 },
      { x: -9, y: -2 },
    ],
    finPolygons: [
      [
        { x: -12, y: -1 },
        { x: -9, y: -1 },
        { x: -9, y: 8 },
        { x: -12, y: 8 },
      ],
      [
        { x: 9, y: -1 },
        { x: 12, y: -1 },
        { x: 12, y: 8 },
        { x: 9, y: 8 },
      ],
    ],
    window: { x: 0, y: 0, radius: 2.8 },
  },
  // Boxy freighter: blunt nose, slab sides, wide fins.
  hauler: {
    bodyPoints: [
      { x: 0, y: -12 },
      { x: 8, y: -9 },
      { x: 9, y: 10 },
      { x: 5, y: 13 },
      { x: -5, y: 13 },
      { x: -9, y: 10 },
      { x: -8, y: -9 },
    ],
    finPolygons: [
      [
        { x: -9, y: 3 },
        { x: -14, y: 14 },
        { x: -9, y: 12 },
      ],
      [
        { x: 9, y: 3 },
        { x: 14, y: 14 },
        { x: 9, y: 12 },
      ],
    ],
    window: { x: 0, y: -4, radius: 3 },
  },
  // Needle interceptor: longest nose in the roster, big delta fins.
  interceptor: {
    bodyPoints: [
      { x: 0, y: -18 },
      { x: 3.5, y: -6 },
      { x: 4.5, y: 8 },
      { x: 2.5, y: 11 },
      { x: -2.5, y: 11 },
      { x: -4.5, y: 8 },
      { x: -3.5, y: -6 },
    ],
    finPolygons: [
      [
        { x: -4, y: -2 },
        { x: -12, y: 14 },
        { x: -4, y: 11 },
      ],
      [
        { x: 4, y: -2 },
        { x: 12, y: 14 },
        { x: 4, y: 11 },
      ],
    ],
    window: { x: 0, y: -7, radius: 2.2 },
  },
  // Insulated cryo tank: rounded, heavy-shouldered, small stabilizers.
  specialist: {
    bodyPoints: [
      { x: 0, y: -14 },
      { x: 7.5, y: -8 },
      { x: 9.5, y: 2 },
      { x: 6.5, y: 12 },
      { x: -6.5, y: 12 },
      { x: -9.5, y: 2 },
      { x: -7.5, y: -8 },
    ],
    finPolygons: [
      [
        { x: -8, y: 4 },
        { x: -12, y: 13 },
        { x: -7, y: 11 },
      ],
      [
        { x: 8, y: 4 },
        { x: 12, y: 13 },
        { x: 7, y: 11 },
      ],
    ],
    window: { x: 0, y: -2, radius: 3.4 },
  },
};
