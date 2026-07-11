import Phaser from 'phaser';
import {
  LANDER_ETCH_LINE_COUNT,
  OUTLINE_COLOR,
  SHIP_FLAME_INNER_COLOR,
  SHIP_FLAME_INNER_LENGTH_PX,
  SHIP_FLAME_OUTER_COLOR,
  SHIP_FLAME_OUTER_LENGTH_PX,
  SHIP_FLAME_WIDTH_FRACTION,
} from '../constants';
import type { ShipClass } from '../ships/ship';
import { SHIP_SILHOUETTES } from '../ships/silhouette';
import { createPaperShape, type PaperShape } from './paper-shape';
import { darken } from './color-mix';

/** How much darker a ship's fins/pods render than its hull — one shared
 * fraction so every ship's accent pieces sit in the same lighting world
 * (same single-light-source rule the terrain gradients follow). */
const FIN_DARKEN_FRACTION = 0.28;

/** Nacelles and role attachments sit between the fin shade and the hull:
 * bolted-on hardware, same paper, one step darker than the hull skin. */
const HARDWARE_DARKEN_FRACTION = 0.16;

/** Porthole glass: one universal pale cockpit tint across the roster —
 * like the landing pad's universal green, "this is the window" reads the
 * same on every hull color. The canopy glass shares it (Milestone 16.5). */
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
 * vessel-detail pass Milestone 16.5, D26): darkened fin/pod cutouts and
 * engine nacelles behind a gradient-shaded hull cutout (each piece its
 * own shadowed, outlined paper layer via `createPaperShape`), role
 * attachments riding the hull, topped with a framed cockpit canopy,
 * porthole(s), and toggleable per-nacelle flame plumes. The hull family
 * comes from the ship's archetype (`ships/silhouette.ts`); the colors
 * from the ship's own `hullFillColorTop`/`Bottom`.
 */
export function createShipVisual(scene: Phaser.Scene, options: ShipVisualOptions): ShipVisual {
  const silhouette = SHIP_SILHOUETTES[options.ship.archetype];
  const finTop = darken(options.ship.hullFillColorTop, FIN_DARKEN_FRACTION);
  const finBottom = darken(options.ship.hullFillColorBottom, FIN_DARKEN_FRACTION);

  // Flame plumes render first (bottom-most children) so every hull piece
  // overlaps them — the exhaust comes from UNDER the craft.
  const flames = scene.add.graphics();
  for (const nacelle of silhouette.nacelles) {
    const bottom = nacelle.y + nacelle.height;
    const outerHalf = nacelle.halfWidth * SHIP_FLAME_WIDTH_FRACTION;
    flames.fillStyle(SHIP_FLAME_OUTER_COLOR, FULL_ALPHA);
    flames.fillTriangle(
      nacelle.x - outerHalf,
      bottom,
      nacelle.x + outerHalf,
      bottom,
      nacelle.x,
      bottom + SHIP_FLAME_OUTER_LENGTH_PX,
    );
    flames.fillStyle(SHIP_FLAME_INNER_COLOR, FULL_ALPHA);
    flames.fillTriangle(
      nacelle.x - outerHalf / 2,
      bottom,
      nacelle.x + outerHalf / 2,
      bottom,
      nacelle.x,
      bottom + SHIP_FLAME_INNER_LENGTH_PX,
    );
  }
  flames.setVisible(false);

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
  const nacelles: PaperShape[] = silhouette.nacelles.map((nacelle, index) =>
    createPaperShape(scene, {
      points: [
        { x: nacelle.x - nacelle.halfWidth, y: nacelle.y },
        { x: nacelle.x + nacelle.halfWidth, y: nacelle.y },
        { x: nacelle.x + nacelle.halfWidth, y: nacelle.y + nacelle.height },
        { x: nacelle.x - nacelle.halfWidth, y: nacelle.y + nacelle.height },
      ],
      textureKey: `${options.textureKeyPrefix}-nacelle-${index.toString()}`,
      fillTopColor: darken(options.ship.hullFillColorTop, HARDWARE_DARKEN_FRACTION),
      fillBottomColor: darken(options.ship.hullFillColorBottom, HARDWARE_DARKEN_FRACTION),
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
      fillTopColor: darken(options.ship.hullFillColorTop, HARDWARE_DARKEN_FRACTION),
      fillBottomColor: darken(options.ship.hullFillColorBottom, HARDWARE_DARKEN_FRACTION),
      outlineWidth: PIECE_OUTLINE_WIDTH,
      shadowOffset: PIECE_SHADOW_OFFSET,
    }),
  );

  const glass = scene.add.graphics();
  // Framed cockpit canopy (D26) — glass fill with a heavy frame stroke.
  glass.fillStyle(WINDOW_COLOR, FULL_ALPHA);
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
  glass.lineStyle(WINDOW_OUTLINE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  glass.strokePath();
  // Signature porthole + the smaller porthole row.
  glass.fillStyle(WINDOW_COLOR, FULL_ALPHA);
  glass.fillCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);
  glass.lineStyle(WINDOW_OUTLINE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  glass.strokeCircle(silhouette.window.x, silhouette.window.y, silhouette.window.radius);
  for (const porthole of silhouette.portholes) {
    glass.fillStyle(WINDOW_COLOR, FULL_ALPHA);
    glass.fillCircle(porthole.x, porthole.y, porthole.radius);
    glass.lineStyle(1, OUTLINE_COLOR, FULL_ALPHA);
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
      body.setFillColors(topColor, bottomColor);
      for (const fin of fins) {
        fin.setFillColors(
          darken(topColor, FIN_DARKEN_FRACTION),
          darken(bottomColor, FIN_DARKEN_FRACTION),
        );
      }
      for (const hardware of [...nacelles, ...attachments]) {
        hardware.setFillColors(
          darken(topColor, HARDWARE_DARKEN_FRACTION),
          darken(bottomColor, HARDWARE_DARKEN_FRACTION),
        );
      }
    },
    setFlamesVisible: (visible: boolean): void => {
      flames.setVisible(visible);
    },
  };
}
