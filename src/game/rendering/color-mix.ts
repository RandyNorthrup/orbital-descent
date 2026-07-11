/**
 * Pure 0xRRGGBB color arithmetic for the papercraft art pass (PLAN.md
 * Milestone 14). Every derived shade in the game — cloud rims, moon
 * craters, fin shading, ridge atmosphere fades — comes through these three
 * functions with a named fraction constant, so the whole game shares one
 * lighting logic instead of twelve worlds each hand-picking their own
 * "slightly darker" variants that slowly drift apart in feel.
 *
 * Phaser-free on purpose (like `starfield.ts`/`ridgeline.ts`): plain
 * channel math, unit-testable in Node.
 */

const RED_BYTE_SHIFT = 16;
const GREEN_BYTE_SHIFT = 8;
const BYTE_MASK = 0xff;
const CHANNEL_MAX = 255;

interface RgbChannels {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function splitChannels(color: number): RgbChannels {
  return {
    r: (color >> RED_BYTE_SHIFT) & BYTE_MASK,
    g: (color >> GREEN_BYTE_SHIFT) & BYTE_MASK,
    b: color & BYTE_MASK,
  };
}

function joinChannels(channels: RgbChannels): number {
  const clamp = (value: number): number => Math.min(CHANNEL_MAX, Math.max(0, Math.round(value)));
  return (
    (clamp(channels.r) << RED_BYTE_SHIFT) |
    (clamp(channels.g) << GREEN_BYTE_SHIFT) |
    clamp(channels.b)
  );
}

/** Moves every channel toward white by `amount` (0 = unchanged, 1 = white).
 * The "paper edge catching the light" derivation — cloud rims, moon
 * highlights, ridge-top rims. */
export function lighten(color: number, amount: number): number {
  const { r, g, b } = splitChannels(color);
  return joinChannels({
    r: r + (CHANNEL_MAX - r) * amount,
    g: g + (CHANNEL_MAX - g) * amount,
    b: b + (CHANNEL_MAX - b) * amount,
  });
}

/** Moves every channel toward black by `amount` (0 = unchanged, 1 = black).
 * The "shaded underside of a paper layer" derivation — cloud shade, moon
 * craters, fin shading. */
export function darken(color: number, amount: number): number {
  const { r, g, b } = splitChannels(color);
  return joinChannels({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}

/** Linear blend from `from` (t = 0) to `to` (t = 1) — the atmospheric-
 * perspective derivation: a distant ridge is its own color mixed toward
 * the sky behind it. */
export function mixColors(from: number, to: number, t: number): number {
  const a = splitChannels(from);
  const b = splitChannels(to);
  return joinChannels({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}
