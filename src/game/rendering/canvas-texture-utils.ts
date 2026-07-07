import Phaser from 'phaser';

const HEX_COLOR_RADIX = 16;
const HEX_COLOR_DIGITS = 6;
const RED_BYTE_SHIFT = 16;
const GREEN_BYTE_SHIFT = 8;
const BYTE_MASK = 0xff;

/** Converts a Phaser-style 0xRRGGBB number into a CSS color string, since
 * Canvas2D gradient/fill APIs take CSS colors, not Phaser color numbers. */
export function hexToCss(color: number): string {
  return `#${color.toString(HEX_COLOR_RADIX).padStart(HEX_COLOR_DIGITS, '0')}`;
}

interface RgbComponents {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Splits a Phaser-style 0xRRGGBB number into its 0-255 channel values, for
 * building rgba() strings with a per-pixel alpha (e.g. gradient falloff),
 * which a plain hex CSS color string can't express. Not exported — only
 * hexToRgba (below) needs it. */
function hexToRgbComponents(color: number): RgbComponents {
  return {
    r: (color >> RED_BYTE_SHIFT) & BYTE_MASK,
    g: (color >> GREEN_BYTE_SHIFT) & BYTE_MASK,
    b: color & BYTE_MASK,
  };
}

/** Formats an rgba() CSS color string from a Phaser-style color number and
 * an explicit 0-1 alpha. */
export function hexToRgba(color: number, alpha: number): string {
  const { r, g, b } = hexToRgbComponents(color);
  return `rgba(${r.toString()}, ${g.toString()}, ${b.toString()}, ${alpha.toString()})`;
}

/**
 * Creates (or replaces) a named CanvasTexture, hands its 2D context to
 * `draw`, then refreshes it and returns the texture. Centralizes the
 * exists-check/remove/create/refresh boilerplate every baked-texture
 * shape (paper-cutout fills, radial glows) would otherwise repeat.
 *
 * Textures are replaced rather than reused across calls with the same key
 * because callers rebake with new geometry/colors each time (e.g. a new
 * terrain silhouette per scene restart) — Phaser's TextureManager keys are
 * shared game-wide and would otherwise throw on a duplicate `createCanvas`.
 */
export function bakeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  const canvasTexture = scene.textures.createCanvas(key, Math.max(1, width), Math.max(1, height));
  if (!canvasTexture) {
    return;
  }

  draw(canvasTexture.getContext());
  canvasTexture.refresh();
}
