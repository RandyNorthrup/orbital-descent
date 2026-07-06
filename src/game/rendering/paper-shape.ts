import Phaser from 'phaser';
import { OUTLINE_COLOR, OUTLINE_WIDTH, SHADOW_OFFSET } from '../constants';
import type { Vector2 } from '../physics/lander-physics';
import { ensurePaperGrainTexture, PAPER_GRAIN_TEXTURE_KEY } from './paper-texture';

const FULL_ALPHA = 1;
/** Arbitrary opaque color for the mask-source fill — a mask only cares
 * about alpha coverage, not this color's value. */
const MASK_FILL_COLOR = 0xffffff;

export interface PaperShapeOptions {
  /** Polygon vertices in the shape's own local space (e.g. centered on the
   * origin for a shape you intend to rotate about its center). */
  readonly points: readonly Vector2[];
  readonly fillColor: number;
}

export interface PaperShape {
  /** The whole composite (shadow + textured fill + outline) as one unit —
   * position/rotate this. */
  readonly container: Phaser.GameObjects.Container;
  /** Re-tints the textured fill only (e.g. landed/crashed color change) —
   * the shadow and outline stay the same on every shape. */
  readonly setFillColor: (color: number) => void;
}

/**
 * Builds one "piece of paper": a hard-offset shadow silhouette, a
 * paper-grain-textured fill (masked to the polygon, tinted to fillColor),
 * and a crisp outline stroke on top — the three layers the paper-cutout art
 * style (PLAN.md §4) uses for every physical shape.
 */
export function createPaperShape(scene: Phaser.Scene, options: PaperShapeOptions): PaperShape {
  ensurePaperGrainTexture(scene);

  const vector2Points = options.points.map((p) => new Phaser.Math.Vector2(p.x, p.y));

  const minX = Math.min(...options.points.map((p) => p.x));
  const maxX = Math.max(...options.points.map((p) => p.x));
  const minY = Math.min(...options.points.map((p) => p.y));
  const maxY = Math.max(...options.points.map((p) => p.y));

  const shadow = scene.add.graphics();
  shadow.fillStyle(OUTLINE_COLOR, FULL_ALPHA);
  shadow.fillPoints(vector2Points, true);
  shadow.setPosition(SHADOW_OFFSET, SHADOW_OFFSET);

  const maskSource = scene.make.graphics({}, false);
  maskSource.fillStyle(MASK_FILL_COLOR, FULL_ALPHA);
  maskSource.fillPoints(vector2Points, true);

  const textureFill = scene.add.tileSprite(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    maxX - minX,
    maxY - minY,
    PAPER_GRAIN_TEXTURE_KEY,
  );
  textureFill.setTint(options.fillColor);
  textureFill.setMask(maskSource.createGeometryMask());

  const outline = scene.add.graphics();
  outline.lineStyle(OUTLINE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  outline.strokePoints(vector2Points, true);

  const container = scene.add.container(0, 0, [shadow, textureFill, outline]);

  return {
    container,
    setFillColor: (color: number): void => {
      textureFill.setTint(color);
    },
  };
}
