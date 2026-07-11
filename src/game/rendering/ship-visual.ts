import Phaser from 'phaser';
import { LANDER_ETCH_LINE_COUNT, OUTLINE_COLOR } from '../constants';
import type { ShipClass } from '../ships/ship';
import { SHIP_SILHOUETTES } from '../ships/silhouette';
import { createPaperShape, type PaperShape } from './paper-shape';
import { darken } from './color-mix';

/** How much darker a ship's fins/pods render than its hull — one shared
 * fraction so every ship's accent pieces sit in the same lighting world
 * (same single-light-source rule the terrain gradients follow). */
const FIN_DARKEN_FRACTION = 0.28;

/** Porthole glass: one universal pale cockpit tint across the roster —
 * like the landing pad's universal green, "this is the window" reads the
 * same on every hull color. */
const WINDOW_COLOR = 0xdff2fc;
const FULL_ALPHA = 1;

/** Small-piece cut-edge treatment (see PaperShapeOptions.outlineWidth's
 * own doc comment): at hull scale the global outline/shadow proportions
 * swallow the fills, so every ship piece uses these instead. */
const PIECE_OUTLINE_WIDTH = 2;
const PIECE_SHADOW_OFFSET = 3;
const WINDOW_OUTLINE_WIDTH = 2;

export interface ShipVisual {
  /** The whole craft (fins + hull + porthole) as one unit — position/rotate
   * this. Same contract as `PaperShape.container`. */
  readonly container: Phaser.GameObjects.Container;
  /** Recolors hull and fins together (fins keep their darkened offset) —
   * the landed/crashed outcome recolor `GameScene` already applies. */
  readonly setFillColors: (topColor: number, bottomColor: number) => void;
}

export interface ShipVisualOptions {
  readonly ship: ShipClass;
  /** Unique per live instance (Milestone 11's shared-texture-key lesson —
   * every piece's baked fill key derives from this prefix, so two ship
   * visuals alive at once, e.g. the ship-select roster, can never destroy
   * each other's textures). */
  readonly textureKeyPrefix: string;
}

/**
 * Builds one ship as a papercraft mini-diorama (PLAN.md Milestone 14):
 * darkened fin/pod cutouts behind a gradient-shaded hull cutout (each
 * piece its own shadowed, outlined paper layer via `createPaperShape`),
 * topped with an outlined porthole. The hull family comes from the ship's
 * archetype (`ships/silhouette.ts`); the colors from the ship's own
 * `hullFillColorTop`/`Bottom`.
 */
export function createShipVisual(scene: Phaser.Scene, options: ShipVisualOptions): ShipVisual {
  const silhouette = SHIP_SILHOUETTES[options.ship.archetype];
  const finTop = darken(options.ship.hullFillColorTop, FIN_DARKEN_FRACTION);
  const finBottom = darken(options.ship.hullFillColorBottom, FIN_DARKEN_FRACTION);

  const fins: PaperShape[] = silhouette.finPolygons.map((points, index) =>
    createPaperShape(scene, {
      points,
      textureKey: `${options.textureKeyPrefix}-fin-${index.toString()}`,
      fillTopColor: finTop,
      fillBottomColor: finBottom,
      outlineWidth: PIECE_OUTLINE_WIDTH,
      shadowOffset: PIECE_SHADOW_OFFSET,
    }),
  );
  const body = createPaperShape(scene, {
    points: silhouette.bodyPoints,
    textureKey: `${options.textureKeyPrefix}-body`,
    fillTopColor: options.ship.hullFillColorTop,
    fillBottomColor: options.ship.hullFillColorBottom,
    // The fin cutouts are far too small for etching to read as anything
    // but noise — only the hull body gets panel lines.
    etchLineCount: LANDER_ETCH_LINE_COUNT,
    outlineWidth: PIECE_OUTLINE_WIDTH,
    shadowOffset: PIECE_SHADOW_OFFSET,
  });

  const window = scene.add.graphics();
  window.fillStyle(WINDOW_COLOR, FULL_ALPHA);
  window.fillCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);
  window.lineStyle(WINDOW_OUTLINE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  window.strokeCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);

  const container = scene.add.container(0, 0, [
    ...fins.map((fin) => fin.container),
    body.container,
    window,
  ]);

  return {
    container,
    setFillColors: (topColor: number, bottomColor: number): void => {
      body.setFillColors(topColor, bottomColor);
      for (const fin of fins) {
        fin.setFillColors(
          darken(topColor, FIN_DARKEN_FRACTION),
          darken(bottomColor, FIN_DARKEN_FRACTION),
        );
      }
    },
  };
}
