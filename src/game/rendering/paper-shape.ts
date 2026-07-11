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
import type { EtchStyle } from '../planets/celestial-body';
import { ensurePaperGrainTexture, PAPER_GRAIN_TEXTURE_KEY } from './paper-texture';
import { bakeCanvasTexture, hexToCss, hexToRgba } from './canvas-texture-utils';

const FULL_ALPHA = 1;

/**
 * Per-`EtchStyle` stroke recipe: `baseAngleRadians` is the center of each
 * line's angle spread, `angleJitterRadians` is the half-width of a uniform
 * spread around it, and `lengthMultiplier` scales the shared
 * `ETCH_LINE_MAX_LENGTH_FRACTION`-derived max length.
 *
 * `rock` is byte-for-byte identical to this module's pre-`EtchStyle`
 * behavior (full random-angle scribbles, unscaled length): a uniform
 * angle drawn from `[baseAngle - jitter, baseAngle + jitter)` with
 * `baseAngle = 0, jitter = Math.PI` covers `[-π, π)`, the same full circle
 * as the old `Math.random() * (2π)` covering `[0, 2π)` — just phase-shifted.
 * Angle only ever feeds `Math.cos`/`Math.sin`, both periodic and therefore
 * phase-shift-invariant in distribution, so the rendered texture's
 * statistics are indistinguishable from before.
 *
 * `sand`/`water` are mostly-horizontal with a small jitter (dune ripples /
 * calm wave-lines), water flatter and longer. `foliage` keeps rock's full
 * angle spread but much shorter strokes (scattered leaf/cluster marks
 * rather than long scribbles).
 */
const ETCH_STYLE_CONFIGS: Record<
  EtchStyle,
  { baseAngleRadians: number; angleJitterRadians: number; lengthMultiplier: number }
> = {
  rock: { baseAngleRadians: 0, angleJitterRadians: Math.PI, lengthMultiplier: 1 },
  sand: { baseAngleRadians: 0, angleJitterRadians: 0.25, lengthMultiplier: 0.6 },
  water: { baseAngleRadians: 0, angleJitterRadians: 0.08, lengthMultiplier: 1.3 },
  foliage: { baseAngleRadians: 0, angleJitterRadians: Math.PI, lengthMultiplier: 0.25 },
};

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
  /** Stroke recipe for the etched lines above — only meaningful when
   * `etchLineCount` is also set. Defaults to `'rock'` (today's fully-random
   * scribble look) when omitted. */
  readonly etchStyle?: EtchStyle;
  /** Outline stroke width override (defaults to the global OUTLINE_WIDTH).
   * Milestone 14: small multi-piece craft (ship hulls ~14px wide, fins
   * smaller) need a thinner cut edge — at their size the global 3px stroke
   * swallows most of the fill (verified against real screenshots: a
   * white-hulled ship rendered nearly black). */
  readonly outlineWidth?: number;
  /** Drop-shadow offset override (defaults to the global SHADOW_OFFSET) —
   * same small-piece reasoning as `outlineWidth`. */
  readonly shadowOffset?: number;
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
  style: EtchStyle,
): void {
  const config = ETCH_STYLE_CONFIGS[style];
  const maxLength =
    Math.hypot(width, height) * ETCH_LINE_MAX_LENGTH_FRACTION * config.lengthMultiplier;
  ctx.strokeStyle = hexToRgba(OUTLINE_COLOR, ETCH_LINE_MAX_ALPHA);
  ctx.lineWidth = ETCH_LINE_WIDTH_PX;

  for (let i = 0; i < count; i += 1) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const angle = config.baseAngleRadians + (Math.random() * 2 - 1) * config.angleJitterRadians;
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

  const outlineWidth = options.outlineWidth ?? OUTLINE_WIDTH;
  const shadowOffset = options.shadowOffset ?? SHADOW_OFFSET;

  const shadow = scene.add.graphics();
  shadow.fillStyle(OUTLINE_COLOR, FULL_ALPHA);
  shadow.fillPoints(vector2Points, true);
  shadow.setPosition(shadowOffset, shadowOffset);

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
        drawEtchedLines(ctx, width, height, options.etchLineCount, options.etchStyle ?? 'rock');
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
  outline.lineStyle(outlineWidth, OUTLINE_COLOR, FULL_ALPHA);
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
