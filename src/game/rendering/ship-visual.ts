import Phaser from 'phaser';
import {
  LANDER_ETCH_LINE_COUNT,
  OUTLINE_COLOR,
  SHIP_FLAME_INNER_COLOR,
  SHIP_FLAME_INNER_LENGTH_PX,
  SHIP_FLAME_MID_COLOR,
  SHIP_FLAME_MID_LENGTH_PX,
  SHIP_FLAME_OUTER_COLOR,
  SHIP_FLAME_OUTER_LENGTH_PX,
  SHIP_FLAME_WIDTH_FRACTION,
  SHIP_GLASS_COLOR,
} from '../constants';
import type { ShipClass } from '../ships/ship';
import { SHIP_SILHOUETTES } from '../ships/silhouette';
import { createPaperShape, type PaperShape } from './paper-shape';
import { darken } from './color-mix';

/** Each accent/detail piece still renders as a tiny gradient (its color
 * to this fraction darker) so it keeps the paper-under-one-light look of
 * every other cutout, but the HUE is the ship's own authored contrast
 * color (Milestone 16.6, D27) — no more darkened-hull monochrome. */
const PIECE_GRADIENT_DARKEN_FRACTION = 0.18;

/** Flame layer widths relative to the outer tongue — the reference flames
 * nest each hotter layer visibly inside the last. */
const FLAME_MID_WIDTH_FRACTION = 0.72;
const FLAME_CORE_WIDTH_FRACTION = 0.45;

const FULL_ALPHA = 1;

/** Small-piece cut-edge treatment (see PaperShapeOptions.outlineWidth's
 * own doc comment): at hull scale the global outline/shadow proportions
 * swallow the fills, so every ship piece uses these instead. */
const PIECE_OUTLINE_WIDTH = 2;
const PIECE_SHADOW_OFFSET = 3;
const CANOPY_FRAME_WIDTH = 2.5;
const CANOPY_EDGE_WIDTH = 1;
const PORTHOLE_RIM_WIDTH = 2;
const SMALL_PORTHOLE_RIM_WIDTH = 1.5;

export interface ShipVisual {
  /** The whole craft (fins + hull + porthole) as one unit — position/rotate
   * this. Same contract as `PaperShape.container`. */
  readonly container: Phaser.GameObjects.Container;
  /** Recolors hull and fins together (fins keep their darkened offset) —
   * the landed/crashed outcome recolor `GameScene` already applies. */
  readonly setFillColors: (topColor: number, bottomColor: number) => void;
  /** Shows/hides the per-nacelle engine flame plumes (Milestone 16.5,
   * D26): `GameScene` ties them to live thrust input; hangar and store
   * previews leave them on so the craft reads the way the spaceship-pack
   * references do. Built hidden. */
  readonly setFlamesVisible: (visible: boolean) => void;
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
 * Builds one ship as a papercraft mini-diorama (PLAN.md Milestone 14;
 * vessel detail Milestone 16.5; reference color construction Milestone
 * 16.6, D27): accent-colored fin and nacelle cutouts behind a
 * gradient-shaded hull, detail-colored role attachments riding it, a
 * turquoise canopy in the ship's trim-color frame, trim-rimmed
 * portholes, and three-layer red/orange/yellow flame plumes — the
 * spaceship pack's own construction grammar.
 */
export function createShipVisual(scene: Phaser.Scene, options: ShipVisualOptions): ShipVisual {
  const silhouette = SHIP_SILHOUETTES[options.ship.archetype];
  const { accentColor, trimColor, detailColor } = options.ship;

  // Flame plumes render first (bottom-most children) so every hull piece
  // overlaps them — the exhaust comes from UNDER the craft. Three layered
  // tongues per nacelle: red outer, orange mid, yellow core.
  const flames = scene.add.graphics();
  for (const nacelle of silhouette.nacelles) {
    const bottom = nacelle.y + nacelle.height;
    const outerHalf = nacelle.halfWidth * SHIP_FLAME_WIDTH_FRACTION;
    const layers = [
      { color: SHIP_FLAME_OUTER_COLOR, half: outerHalf, length: SHIP_FLAME_OUTER_LENGTH_PX },
      {
        color: SHIP_FLAME_MID_COLOR,
        half: outerHalf * FLAME_MID_WIDTH_FRACTION,
        length: SHIP_FLAME_MID_LENGTH_PX,
      },
      {
        color: SHIP_FLAME_INNER_COLOR,
        half: outerHalf * FLAME_CORE_WIDTH_FRACTION,
        length: SHIP_FLAME_INNER_LENGTH_PX,
      },
    ];
    for (const layer of layers) {
      flames.fillStyle(layer.color, FULL_ALPHA);
      flames.fillTriangle(
        nacelle.x - layer.half,
        bottom,
        nacelle.x + layer.half,
        bottom,
        nacelle.x,
        bottom + layer.length,
      );
    }
  }
  flames.setVisible(false);

  const fins: PaperShape[] = silhouette.finPolygons.map((points, index) =>
    createPaperShape(scene, {
      points,
      textureKey: `${options.textureKeyPrefix}-fin-${index.toString()}`,
      fillTopColor: accentColor,
      fillBottomColor: darken(accentColor, PIECE_GRADIENT_DARKEN_FRACTION),
      outlineWidth: PIECE_OUTLINE_WIDTH,
      shadowOffset: PIECE_SHADOW_OFFSET,
    }),
  );
  const nacelles: PaperShape[] = silhouette.nacelles.map((nacelle, index) =>
    createPaperShape(scene, {
      points: [
        { x: nacelle.x - nacelle.halfWidth, y: nacelle.y },
        { x: nacelle.x + nacelle.halfWidth, y: nacelle.y },
        { x: nacelle.x + nacelle.halfWidth, y: nacelle.y + nacelle.height },
        { x: nacelle.x - nacelle.halfWidth, y: nacelle.y + nacelle.height },
      ],
      textureKey: `${options.textureKeyPrefix}-nacelle-${index.toString()}`,
      fillTopColor: accentColor,
      fillBottomColor: darken(accentColor, PIECE_GRADIENT_DARKEN_FRACTION),
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
  const attachments: PaperShape[] = silhouette.attachments.map((points, index) =>
    createPaperShape(scene, {
      points,
      textureKey: `${options.textureKeyPrefix}-attachment-${index.toString()}`,
      fillTopColor: detailColor,
      fillBottomColor: darken(detailColor, PIECE_GRADIENT_DARKEN_FRACTION),
      outlineWidth: PIECE_OUTLINE_WIDTH,
      shadowOffset: PIECE_SHADOW_OFFSET,
    }),
  );

  const glass = scene.add.graphics();
  // Framed cockpit canopy — turquoise glass (the pack's universal
  // glazing) in the ship's own trim-color frame with a fine dark edge.
  glass.fillStyle(SHIP_GLASS_COLOR, FULL_ALPHA);
  glass.beginPath();
  for (const [index, point] of silhouette.canopy.entries()) {
    if (index === 0) {
      glass.moveTo(point.x, point.y);
    } else {
      glass.lineTo(point.x, point.y);
    }
  }
  glass.closePath();
  glass.fillPath();
  glass.lineStyle(CANOPY_FRAME_WIDTH, trimColor, FULL_ALPHA);
  glass.strokePath();
  glass.lineStyle(CANOPY_EDGE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  glass.strokePath();
  // Signature porthole + the smaller porthole row, all trim-rimmed.
  glass.fillStyle(SHIP_GLASS_COLOR, FULL_ALPHA);
  glass.fillCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);
  glass.lineStyle(PORTHOLE_RIM_WIDTH, trimColor, FULL_ALPHA);
  glass.strokeCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);
  glass.lineStyle(CANOPY_EDGE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  glass.strokeCircle(
    silhouette.window.x,
    silhouette.window.y,
    silhouette.window.radius + PORTHOLE_RIM_WIDTH / 2,
  );
  for (const porthole of silhouette.portholes) {
    glass.fillStyle(SHIP_GLASS_COLOR, FULL_ALPHA);
    glass.fillCircle(porthole.x, porthole.y, porthole.radius);
    glass.lineStyle(SMALL_PORTHOLE_RIM_WIDTH, trimColor, FULL_ALPHA);
    glass.strokeCircle(porthole.x, porthole.y, porthole.radius);
  }

  const container = scene.add.container(0, 0, [
    flames,
    ...fins.map((fin) => fin.container),
    ...nacelles.map((nacelle) => nacelle.container),
    body.container,
    ...attachments.map((attachment) => attachment.container),
    glass,
  ]);

  return {
    container,
    setFillColors: (topColor: number, bottomColor: number): void => {
      // Outcome recolors (landed green / crashed red) tint the whole
      // craft so the verdict reads at a glance — hull, accents, details.
      body.setFillColors(topColor, bottomColor);
      for (const piece of [...fins, ...nacelles, ...attachments]) {
        piece.setFillColors(topColor, darken(bottomColor, PIECE_GRADIENT_DARKEN_FRACTION));
      }
    },
    setFlamesVisible: (visible: boolean): void => {
      flames.setVisible(visible);
    },
  };
}
