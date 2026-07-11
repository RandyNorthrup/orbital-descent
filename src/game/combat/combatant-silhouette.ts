import type { Vector2 } from '../physics/lander-physics';

/**
 * Per-combatant hull artwork (PLAN.md Milestone 14) — each hostile type
 * gets its own multi-piece papercraft silhouette, replacing the one
 * recolored diamond every combatant shared before. Same conventions as
 * `ships/silhouette.ts`: local px around the combatant's center, +y down,
 * every vertex within the COMBATANT_COLLISION_RADIUS (16) circle physics
 * actually checks, pure data rendered by `GameScene`.
 */

export interface CombatantSilhouette {
  /** Main body polygon — filled with the shared hostile-violet gradient. */
  readonly bodyPoints: readonly Vector2[];
  /** Accent pieces (wings, armor slabs) — filled with a darkened shade of
   * the same hostile violet, behind the body. */
  readonly accentPolygons: readonly (readonly Vector2[])[];
}

/**
 * Keyed by `CombatantDefinition.id`. A definition without an entry here is
 * a real data-integrity bug (a hostile that would render as nothing), so
 * the lookup helper below throws rather than falling back — the same
 * convention as `findBodyById`/`findShipById`.
 */
export const COMBATANT_SILHOUETTES: Record<string, CombatantSilhouette> = {
  // Small fast swarm insect: narrow diamond core, four swept wing blades.
  'verdalis-wasp': {
    bodyPoints: [
      { x: 0, y: -8 },
      { x: 6, y: 0 },
      { x: 0, y: 8 },
      { x: -6, y: 0 },
    ],
    accentPolygons: [
      [
        { x: -4, y: -3 },
        { x: -15, y: -9 },
        { x: -5, y: 2 },
      ],
      [
        { x: 4, y: -3 },
        { x: 15, y: -9 },
        { x: 5, y: 2 },
      ],
      [
        { x: -4, y: 3 },
        { x: -13, y: 10 },
        { x: -3, y: 6 },
      ],
      [
        { x: 4, y: 3 },
        { x: 13, y: 10 },
        { x: 3, y: 6 },
      ],
    ],
  },
  // Heavy armored sentinel: broad hexagonal hull, side armor slabs — the
  // bulk that fictionally justifies its armorRating hard-failing the
  // starter weapon.
  'glacian-warden': {
    bodyPoints: [
      { x: 0, y: -14 },
      { x: 11, y: -7 },
      { x: 11, y: 7 },
      { x: 0, y: 14 },
      { x: -11, y: 7 },
      { x: -11, y: -7 },
    ],
    accentPolygons: [
      [
        { x: -15, y: -6 },
        { x: -11, y: -9 },
        { x: -11, y: 9 },
        { x: -15, y: 6 },
      ],
      [
        { x: 11, y: -9 },
        { x: 15, y: -6 },
        { x: 15, y: 6 },
        { x: 11, y: 9 },
      ],
    ],
  },
};

/** Looks up a combatant's silhouette by definition id — throws on a
 * missing entry (see `COMBATANT_SILHOUETTES`'s own doc comment). */
export function findCombatantSilhouette(id: string): CombatantSilhouette {
  const silhouette = COMBATANT_SILHOUETTES[id];
  if (!silhouette) {
    throw new Error(`findCombatantSilhouette: no silhouette registered for combatant '${id}'`);
  }
  return silhouette;
}
