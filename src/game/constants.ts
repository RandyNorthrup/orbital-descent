/**
 * Every tunable number in the simulation lives here, named, so gameplay
 * balance changes touch one file and no literal is left unexplained.
 */

/** Canvas size in CSS pixels. 3:2 aspect ratio, fits common laptop viewports. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

/** How many viewport-widths wide the flyable world is (Decision D19/
 * Milestone 2.5) — the camera follows the lander across this, rather than
 * the world being exactly one static screen. A single global ratio for
 * now; per-base world width is a possible future refinement once M6's
 * real base layouts exist, not something this milestone needs to solve. */
const WORLD_WIDTH_MULTIPLIER = 3;
export const WORLD_WIDTH = GAME_WIDTH * WORLD_WIDTH_MULTIPLIER;

/** Deep-space navy; kept out of scene code so palette changes stay in one
 * place. Matches SKY_TOP_COLOR below — Phaser's own clear color, briefly
 * visible before BootScene/GameScene paint the real sky, so it shouldn't
 * flash a different hue. */
export const BACKGROUND_COLOR = 0x141428;

/** Downward acceleration applied every tick, in px/s². Not calibrated to real
 * lunar gravity (1.62 m/s²) — pixel-space units are arbitrary and tuned for
 * feel at GAME_WIDTH/GAME_HEIGHT scale. */
export const GRAVITY_ACCEL = 18;

/** Main engine acceleration in px/s² while thrust is held. Must exceed
 * GRAVITY_ACCEL for ascent to be possible at all. */
export const THRUST_ACCEL = 46;

/** Rotation rate in degrees/s while a rotate key is held. */
export const ROTATION_SPEED_DEG = 150;

/** Fuel is a unitless 0..MAX_FUEL gauge, not litres/kg — matches the
 * simplicity of the rest of the simulation's pixel-space units. */
export const MAX_FUEL = 100;
export const FUEL_BURN_RATE = 18;

/** Lander spawn point: horizontally centered in the *world* (not just the
 * initial viewport, now that they differ — Milestone 2.5), near the top. */
export const LANDER_START_X = WORLD_WIDTH / 2;
export const LANDER_START_Y = 80;

/** Half-height of the triangular lander body, in px, used to build its shape
 * and to size its collision check against terrain height. */
export const LANDER_RADIUS = 14;

/** Degrees in a half turn — used only for the degrees<->radians conversion
 * in lander-physics.ts, named so it isn't a bare "180" in that formula. */
export const DEGREES_PER_HALF_TURN = 180;

/** Uniform spacing, in px, between HUD text elements and the viewport edge. */
export const HUD_MARGIN = 16;

/* ---------------------------------------------------------------------- */
/* Terrain generation (src/game/terrain/terrain-generator.ts)             */
/* ---------------------------------------------------------------------- */

/** Terrain segments per screen-width of world — more segments = finer
 * detail, fewer = blockier. 40 gives a visibly jagged but readable profile
 * at 960px wide (24px average segment width). Multiplied by
 * WORLD_WIDTH_MULTIPLIER below (Milestone 2.5) so segment width — not just
 * total count — stays constant across the wider world, instead of the
 * same 40 segments stretching three times as blocky. */
const TERRAIN_SEGMENTS_PER_SCREEN = 40;
export const TERRAIN_SEGMENTS = TERRAIN_SEGMENTS_PER_SCREEN * WORLD_WIDTH_MULTIPLIER;

/** Terrain height band, as a fraction of GAME_HEIGHT measured from the top —
 * keeps the ground in the lower third-to-half of the screen, leaving room
 * to fly, and never right at the bottom edge. */
export const TERRAIN_MIN_HEIGHT_FRACTION = 0.55;
export const TERRAIN_MAX_HEIGHT_FRACTION = 0.9;

/** Max height change between adjacent terrain points, as a fraction of
 * GAME_HEIGHT. Generation is a bounded random walk (each point stays within
 * this step of the last) rather than fully independent random heights, so
 * the terrain reads as connected ground, not disconnected spikes. */
export const TERRAIN_MAX_STEP_FRACTION = 0.05;

/** How many consecutive terrain segments are flattened into the landing pad. */
export const LANDING_PAD_SEGMENT_COUNT = 3;

/* ---------------------------------------------------------------------- */
/* Landing safety thresholds (src/game/terrain/landing.ts)                */
/* ---------------------------------------------------------------------- */

/** Touchdown is only safe at or below this speed, in px/s (vector magnitude). */
export const LANDING_MAX_SAFE_SPEED = 60;

/** Touchdown is only safe within this many degrees of upright. */
export const LANDING_MAX_SAFE_ANGLE_DEG = 15;

/* ---------------------------------------------------------------------- */
/* Paper-cutout palette and rendering (src/game/rendering/*)              */
/* See PLAN.md §4 "Paper-cutout art style" for the rules this implements. */
/* ---------------------------------------------------------------------- */

/** Lander body fill — a top-to-bottom gradient (not a flat color) per the
 * approved "Ship-Forward / Atmospheric Depth" art direction (PLAN.md §4):
 * every physical shape is gradient-shaded paper, lightest at the top,
 * consistent with the sky's single implied light source. Cool blue-silver-
 * teal, reading as the ally craft against the terrain's muted palette. */
export const LANDER_FILL_COLOR_TOP = 0xf0f6fa;
export const LANDER_FILL_COLOR_BOTTOM = 0x7fa8b8;
export const LANDED_COLOR_TOP = 0x8ff0a8;
export const LANDED_COLOR_BOTTOM = 0x3fb868;
export const CRASHED_COLOR_TOP = 0xf08f8f;
export const CRASHED_COLOR_BOTTOM = 0xb83f3f;

/** Foreground terrain fill gradient. Muted slate-violet ("Ashgeld Reach"
 * flavor from the approved art review) — deliberately restrained next to
 * the lander/pad so the ship keeps the strongest color contrast in frame. */
export const TERRAIN_FILL_COLOR_TOP = 0x8f8aa8;
export const TERRAIN_FILL_COLOR_BOTTOM = 0x4a4560;
export const LANDING_PAD_FILL_COLOR_TOP = 0x7fe89a;
export const LANDING_PAD_FILL_COLOR_BOTTOM = 0x3aa859;

/** Shared near-black outline/shadow color for every cutout shape. */
export const OUTLINE_COLOR = 0x1a1410;
export const OUTLINE_WIDTH = 3;

/** Offset, in px, of the hard drop-shadow copy behind each shape. */
export const SHADOW_OFFSET = 6;

/** Fine etched surface-texture strokes (rock striations / hull panel lines)
 * baked into a shape's gradient fill — generic line-scribble texture for
 * now. PLAN.md §4/M5 flags this as the hook where distinct per-world
 * terrain materials (foliage, water, sand, ice) will plug in later; it
 * intentionally isn't a single hard-coded "look". */
export const TERRAIN_ETCH_LINE_COUNT = 14;
export const LANDER_ETCH_LINE_COUNT = 4;
export const ETCH_LINE_MAX_ALPHA = 0.3;
export const ETCH_LINE_MAX_LENGTH_FRACTION = 0.16;
export const ETCH_LINE_WIDTH_PX = 1;

/** Small glowing radial-gradient accent at the lander's engine base — a
 * static part of the ship's own artwork (like the approved concept's
 * "glowing engine trail"), not a thrust-reactive particle effect; dynamic
 * thrust "juice" is Milestone 13's scope, not this art-direction pass. */
export const ENGINE_GLOW_COLOR = 0x8fd8ff;
export const ENGINE_GLOW_RADIUS = 20;
export const ENGINE_GLOW_MAX_ALPHA = 0.75;

/* ---------------------------------------------------------------------- */
/* Background: sky, moon, stars, far parallax ridge (rendering/background) */
/* See PLAN.md §4 "Ship-Forward / Atmospheric Depth" for the approved      */
/* art direction this implements.                                         */
/* ---------------------------------------------------------------------- */

export const SKY_TOP_COLOR = 0x141428;
export const SKY_BOTTOM_COLOR = 0x3a3a5a;

export const MOON_COLOR = 0xf3dfa0;
/** Slightly darker edge tone for the moon disc's own gradient shading. */
export const MOON_SHADE_COLOR = 0xd8b878;
export const MOON_GLOW_COLOR = 0xf3dfa0;
export const MOON_GLOW_MAX_ALPHA = 0.55;
export const MOON_RADIUS = 46;
export const MOON_GLOW_RADIUS = 150;
export const MOON_CENTER_X_FRACTION = 0.72;
export const MOON_CENTER_Y_FRACTION = 0.18;

/** Crisp small dots, not soft/blurred bokeh — the star treatment explicitly
 * preferred over softer alternatives when the art direction was approved.
 * Count scales with WORLD_WIDTH_MULTIPLIER (Milestone 2.5) so density, not
 * just total count, stays constant across the wider world. */
export const STAR_COLOR = 0xffffff;
const STAR_COUNT_PER_SCREEN = 90;
export const STAR_COUNT = STAR_COUNT_PER_SCREEN * WORLD_WIDTH_MULTIPLIER;
export const STAR_MAX_RADIUS = 1.4;
export const STAR_MAX_ALPHA = 0.9;
/** Fixed (not per-restart) seed — the starfield reads as a stable distant
 * sky, unlike the gameplay terrain, which reseeds every attempt. */
export const STARFIELD_SEED = 20260706;

/** Distant parallax ridge: lower-contrast, desaturated, and blurred vs. the
 * crisp gameplay terrain in front of it — the atmospheric-perspective depth
 * cue the approved direction is named for. Deliberately lighter than the
 * sky gradient at the ridge's own height band (not just "a dark color at
 * partial alpha") — a low-contrast ridge nearly disappears into the sky
 * instead of reading as a silhouette. */
export const FAR_RIDGE_COLOR = 0x5c5678;
export const FAR_RIDGE_ALPHA = 0.75;
export const FAR_RIDGE_MIN_HEIGHT_FRACTION = 0.28;
export const FAR_RIDGE_MAX_HEIGHT_FRACTION = 0.4;
export const FAR_RIDGE_MAX_STEP_FRACTION = 0.03;
const FAR_RIDGE_SEGMENTS_PER_SCREEN = 12;
export const FAR_RIDGE_SEGMENTS = FAR_RIDGE_SEGMENTS_PER_SCREEN * WORLD_WIDTH_MULTIPLIER;
/** Fixed seed, distinct from the gameplay terrain's and the starfield's —
 * a stable distant ridge, not reshuffled each restart. */
export const FAR_RIDGE_SEED = 71;
export const FAR_RIDGE_BLUR_PX = 5;

/** Midground parallax ridge (Milestone 2.5 — the layer added between the
 * far ridge and the gameplay terrain, closing the depth gap the D18
 * review flagged): closer, less blurred, more saturated than the far
 * ridge, but still visually behind the crisp foreground terrain. */
export const MID_RIDGE_COLOR = 0x484264;
export const MID_RIDGE_ALPHA = 0.85;
export const MID_RIDGE_MIN_HEIGHT_FRACTION = 0.38;
export const MID_RIDGE_MAX_HEIGHT_FRACTION = 0.48;
export const MID_RIDGE_MAX_STEP_FRACTION = 0.04;
const MID_RIDGE_SEGMENTS_PER_SCREEN = 16;
export const MID_RIDGE_SEGMENTS = MID_RIDGE_SEGMENTS_PER_SCREEN * WORLD_WIDTH_MULTIPLIER;
/** Fixed seed, distinct from the far ridge's — an independent silhouette,
 * not a scaled copy of the same profile. */
export const MID_RIDGE_SEED = 137;
export const MID_RIDGE_BLUR_PX = 2;

/** Parallax scroll factors, one per depth plane, each strictly less than 1
 * and strictly greater than the plane behind it — real motion-parallax
 * (Milestone 2.5), not just the static layered/blurred depth D18 shipped.
 * Gameplay terrain/pad/lander deliberately have no named factor here: they
 * stay at Phaser's implicit default (`scrollFactor` 1, moves 1:1 with the
 * world), which needs no constant for "unmodified". */
export const SKY_SCROLL_FACTOR = 0.05;
export const FAR_RIDGE_SCROLL_FACTOR = 0.2;
export const MID_RIDGE_SCROLL_FACTOR = 0.5;

/** Side length, in px, of the procedurally generated paper-grain texture
 * tile (small and repeated as a Canvas2D pattern — `ctx.createPattern`,
 * composited with `globalCompositeOperation: 'multiply'` in paper-shape.ts
 * — not one giant texture). */
export const PAPER_GRAIN_TEXTURE_SIZE = 64;

/** Number of random speckles drawn onto the grain texture — enough to read
 * as paper fiber at this tile size without looking like solid noise. */
export const PAPER_GRAIN_SPECKLE_COUNT = 220;
export const PAPER_GRAIN_SPECKLE_MAX_ALPHA = 0.18;
export const PAPER_GRAIN_SPECKLE_MAX_RADIUS = 1.5;

/* ---------------------------------------------------------------------- */
/* Scene z-order (rendering/background.ts + scenes/game-scene.ts)         */
/* One shared ordering, back-to-front, so a future layer added in either  */
/* file can't silently collide with or invert an existing one — depth is  */
/* a cross-file contract, not a value scoped to a single file.            */
/* ---------------------------------------------------------------------- */
export const SKY_LAYER_DEPTH = -3;
export const FAR_RIDGE_LAYER_DEPTH = -2;
export const MID_RIDGE_LAYER_DEPTH = -1;
export const TERRAIN_SHADOW_LAYER_DEPTH = 0;
export const LANDER_LAYER_DEPTH = 1;
export const HUD_LAYER_DEPTH = 2;
