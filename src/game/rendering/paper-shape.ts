import Phaser from 'phaser';
import {
  ETCH_LINE_MAX_ALPHA,
  ETCH_LINE_MAX_LENGTH_FRACTION,
  ETCH_LINE_WIDTH_PX,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  SHADOW_OFFSET,
} from '../constants';
import type { Vector2 } from '../physics/lander-physics';
import { ensurePaperGrainTexture, PAPER_GRAIN_TEXTURE_KEY } from './paper-texture';
import { bakeCanvasTexture, hexToCss, hexToRgba } from './canvas-texture-utils';

const FULL_ALPHA = 1;
const FULL_TURN_RADIANS = Math.PI * 2;

export interface PaperShapeOptions {
  /** Polygon vertices in the shape's own local space (e.g. centered on the
   * origin for a shape you intend to rotate about its center). */
  readonly points: readonly Vector2[];
  /** Stable key for this shape's baked fill texture. Rebaked (not appended)
   * on every call with the same key — Phaser's TextureManager is shared
   * game-wide, and each scene restart / outcome recolor needs a fresh bake
   * of possibly-different geometry or colors, not an accumulating set of
   * same-key textures. */
  readonly textureKey: string;
  readonly fillTopColor: number;
  readonly fillBottomColor: number;
  /** Count of fine etched surface-texture strokes drawn within the shape
   * (rock striations, hull panel lines). Omit or 0 for a smooth silhouette —
   * appropriate for e.g. a landing pad. */
  readonly etchLineCount?: number;
}

export interface PaperShape {
  /** The whole composite (shadow + gradient-textured fill + outline) as one
   * unit — position/rotate this. */
  readonly container: Phaser.GameObjects.Container;
  /** Rebakes the fill with new gradient colors (e.g. a landed/crashed color
   * change) — the shadow and outline stay the same on every shape. */
  readonly setFillColors: (topColor: number, bottomColor: number) => void;
}

interface ShapeBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

function computeBounds(points: readonly Vector2[]): ShapeBounds {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

function drawEtchedLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
): void {
  const maxLength = Math.hypot(width, height) * ETCH_LINE_MAX_LENGTH_FRACTION;
  ctx.strokeStyle = hexToRgba(OUTLINE_COLOR, ETCH_LINE_MAX_ALPHA);
  ctx.lineWidth = ETCH_LINE_WIDTH_PX;

  for (let i = 0; i < count; i += 1) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const angle = Math.random() * FULL_TURN_RADIANS;
    const length = Math.random() * maxLength;

    ctx.globalAlpha = Math.random() * ETCH_LINE_MAX_ALPHA;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
  }

  ctx.globalAlpha = FULL_ALPHA;
}

/**
 * Builds one "piece of paper": a hard-offset shadow silhouette, a
 * gradient-shaded, paper-grain-textured fill clipped to the polygon (with
 * optional fine etched surface texture), and a crisp outline stroke on
 * top — the four layers the paper-cutout art style (PLAN.md §4) uses for
 * every physical shape.
 */
export function createPaperShape(scene: Phaser.Scene, options: PaperShapeOptions): PaperShape {
  ensurePaperGrainTexture(scene);

  const vector2Points = options.points.map((p) => new Phaser.Math.Vector2(p.x, p.y));
  const bounds = computeBounds(options.points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const localPoints = options.points.map((p) => ({ x: p.x - bounds.minX, y: p.y - bounds.minY }));

  const shadow = scene.add.graphics();
  shadow.fillStyle(OUTLINE_COLOR, FULL_ALPHA);
  shadow.fillPoints(vector2Points, true);
  shadow.setPosition(SHADOW_OFFSET, SHADOW_OFFSET);

  const bakeFill = (topColor: number, bottomColor: number): void => {
    bakeCanvasTexture(scene, options.textureKey, width, height, (ctx) => {
      ctx.beginPath();
      localPoints.forEach((p, index) => {
        if (index === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.closePath();
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, hexToCss(topColor));
      gradient.addColorStop(1, hexToCss(bottomColor));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const grainSource = scene.textures.get(PAPER_GRAIN_TEXTURE_KEY).getSourceImage();
      if (grainSource instanceof HTMLCanvasElement) {
        const grainPattern = ctx.createPattern(grainSource, 'repeat');
        if (grainPattern) {
          // The grain texture is opaque white with sparse dark speckles
          // (see paper-texture.ts) — 'multiply' lets the white pass the
          // gradient underneath through untouched while the dark speckles
          // still darken it, instead of painting over the gradient with a
          // flat white rectangle.
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = grainPattern;
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      if (options.etchLineCount) {
        drawEtchedLines(ctx, width, height, options.etchLineCount);
      }
    });
  };

  bakeFill(options.fillTopColor, options.fillBottomColor);
  const fillImage = scene.add.image(
    bounds.minX + width / 2,
    bounds.minY + height / 2,
    options.textureKey,
  );

  const outline = scene.add.graphics();
  outline.lineStyle(OUTLINE_WIDTH, OUTLINE_COLOR, FULL_ALPHA);
  outline.strokePoints(vector2Points, true);

  const container = scene.add.container(0, 0, [shadow, fillImage, outline]);

  return {
    container,
    setFillColors: (topColor: number, bottomColor: number): void => {
      bakeFill(topColor, bottomColor);
      fillImage.setTexture(options.textureKey);
    },
  };
}
