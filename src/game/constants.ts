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
 * and to keep it clear of the world-bounds floor. */
export const LANDER_RADIUS = 14;

/** World-bounds floor margin in px until real terrain/landing arrives
 * (see PLAN.md Milestone 2) — keeps the M1 demo flyable instead of letting
 * the lander fall through the bottom of the canvas forever. */
export const WORLD_FLOOR_MARGIN = 24;

/** Degrees in a half turn — used only for the degrees<->radians conversion
 * in lander-physics.ts, named so it isn't a bare "180" in that formula. */
export const DEGREES_PER_HALF_TURN = 180;

/** Lander body fill color — light silver, reads clearly against BACKGROUND_COLOR. */
export const LANDER_FILL_COLOR = 0xe0e0e0;

/** Uniform spacing, in px, between HUD text elements and the viewport edge. */
export const HUD_MARGIN = 16;
