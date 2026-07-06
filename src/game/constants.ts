/**
 * Every tunable number in the simulation lives here, named, so gameplay
 * balance changes touch one file and no literal is left unexplained.
 */

/** Canvas size in CSS pixels. 3:2 aspect ratio, fits common laptop viewports. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

/** Deep-space navy; kept out of scene code so palette changes stay in one place. */
export const BACKGROUND_COLOR = 0x000814;

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

/** Lander spawn point: horizontally centered, near the top of the viewport. */
export const LANDER_START_X = GAME_WIDTH / 2;
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

/** Number of terrain segments spanning GAME_WIDTH — more segments = finer
 * detail, fewer = blockier. 40 gives a visibly jagged but readable profile
 * at 960px wide (24px average segment width). */
export const TERRAIN_SEGMENTS = 40;

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

/** Lander body fill color — light silver, reads clearly against BACKGROUND_COLOR. */
export const LANDER_FILL_COLOR = 0xe0e0e0;

export const TERRAIN_FILL_COLOR = 0x8a7a66;
export const LANDING_PAD_FILL_COLOR = 0x5fd45f;
export const LANDED_COLOR = 0x5fd45f;
export const CRASHED_COLOR = 0xd45f5f;

/** Shared near-black outline/shadow color for every cutout shape. */
export const OUTLINE_COLOR = 0x1a1410;
export const OUTLINE_WIDTH = 3;

/** Offset, in px, of the hard drop-shadow copy behind each shape. */
export const SHADOW_OFFSET = 6;

/** Side length, in px, of the procedurally generated paper-grain texture
 * tile (small and repeated via TileSprite, not one giant texture). */
export const PAPER_GRAIN_TEXTURE_SIZE = 64;

/** Number of random speckles drawn onto the grain texture — enough to read
 * as paper fiber at this tile size without looking like solid noise. */
export const PAPER_GRAIN_SPECKLE_COUNT = 220;
export const PAPER_GRAIN_SPECKLE_MAX_ALPHA = 0.18;
export const PAPER_GRAIN_SPECKLE_MAX_RADIUS = 1.5;
