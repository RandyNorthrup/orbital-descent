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

/** Terrain fill gradient is a per-world stat since Milestone 5
 * (`CelestialBody.terrainPalette`, `planets/bodies.ts`) — Kessel's Reach's
 * entry there carries forward the original muted slate-violet from the
 * approved art review byte-for-byte. The landing pad stays one universal
 * green across every world, deliberately: a consistent "safe zone" visual
 * cue regardless of which body the player is on. */
export const LANDING_PAD_FILL_COLOR_TOP = 0x7fe89a;
export const LANDING_PAD_FILL_COLOR_BOTTOM = 0x3aa859;

/** Milestone 10's static obstacle fill gradient — one universal rust-red
 * across every world, deliberately: a consistent "this will crash you"
 * visual cue, the same "one color means one thing everywhere" principle
 * `LANDING_PAD_FILL_COLOR_TOP`/`_BOTTOM` above already uses for "safe." */
export const OBSTACLE_FILL_COLOR_TOP = 0xd97b5a;
export const OBSTACLE_FILL_COLOR_BOTTOM = 0x8f3b28;

/** Milestone 11's living hostiles — a hostile violet, deliberately distinct
 * from every other palette color already in use (lander's cool blue-teal,
 * landed green, crashed/obstacle red-orange) so "this is alive and
 * attacking" reads as its own visual category. */
export const COMBATANT_FILL_COLOR_TOP = 0xc57ad9;
export const COMBATANT_FILL_COLOR_BOTTOM = 0x6b3f8f;

/** A fired projectile's small, bright "energy bolt" look — a plain filled
 * circle (`Phaser.GameObjects.Arc`), not a full paper-shape (shadow +
 * gradient fill + outline): at this size, and at whatever rate a fast
 * weapon fires, the full paper-cutout treatment would read as visual noise
 * rather than texture, and cost far more to bake/rebake per shot. */
export const PROJECTILE_COLOR = 0xf5e050;
export const PROJECTILE_RADIUS = 4;

/** Shared near-black outline/shadow color for every cutout shape. */
export const OUTLINE_COLOR = 0x1a1410;
export const OUTLINE_WIDTH = 3;

/** Offset, in px, of the hard drop-shadow copy behind each shape. */
export const SHADOW_OFFSET = 6;

/** Fine etched surface-texture strokes (rock striations / hull panel lines /
 * dune ripples / wave-lines / foliage clusters, depending on the shape's own
 * `etchStyle` — see `rendering/paper-shape.ts`'s `ETCH_STYLE_CONFIGS`, added
 * Milestone 5). This constant is only the shared *density* (how many
 * strokes); the *look* varies per world via each `CelestialBody`'s
 * `terrainPalette.etchStyle`. */
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

/* ---------------------------------------------------------------------- */
/* UI: menu / result / settings (Milestone 3)                             */
/* src/game/rendering/ui-button.ts, scenes/menu-scene.ts,                  */
/* scenes/result-scene.ts, scenes/settings-scene.ts                       */
/* ---------------------------------------------------------------------- */

export const UI_TEXT_COLOR = 0xe0e0e0;
export const UI_MUTED_TEXT_COLOR = 0x8899aa;
export const UI_TITLE_FONT_SIZE_PX = 40;
export const UI_BODY_FONT_SIZE_PX = 16;

/** Shared button look across every menu/result/settings scene. Hover colors
 * lean on the same cool cyan used for the lander's engine glow (D18), so
 * interactive UI reads as part of the same palette, not a bolted-on system. */
export const UI_BUTTON_FONT_SIZE_PX = 22;
export const UI_BUTTON_TEXT_COLOR = 0xe0e0e0;
export const UI_BUTTON_HOVER_TEXT_COLOR = 0x8fd8ff;
export const UI_BUTTON_BG_COLOR = 0x2a2a45;
export const UI_BUTTON_BG_HOVER_COLOR = 0x3a3a5a;
export const UI_BUTTON_PADDING_X = 18;
export const UI_BUTTON_PADDING_Y = 10;
/** Not exported — only consumed below to compute UI_BUTTON_ROW_HEIGHT_PX;
 * nothing else needs the raw spacing value on its own. */
const UI_BUTTON_SPACING_PX = 20;
/** Center-to-center gap between vertically stacked buttons: one button's
 * full height (font size + top/bottom padding) plus the spacing above —
 * computed once here so menu-scene.ts and result-scene.ts (both stack two
 * buttons) can't silently drift apart by each recomputing it locally. */
export const UI_BUTTON_ROW_HEIGHT_PX =
  UI_BUTTON_FONT_SIZE_PX + UI_BUTTON_PADDING_Y * 2 + UI_BUTTON_SPACING_PX;

/** Brief pause on the crashed/landed frame before cutting to the result
 * screen — long enough to read as "the flight actually ended here," not
 * long enough to feel like a stall. */
export const RESULT_TRANSITION_DELAY_MS = 1200;

/** Settings is a translucent modal over whichever scene launched it (menu
 * or a paused flight), not a full scene swap — the paused scene stays
 * visible underneath as a visual reminder of what "resume" returns to. */
export const SETTINGS_OVERLAY_COLOR = 0x000000;
export const SETTINGS_OVERLAY_ALPHA = 0.6;

/* ---------------------------------------------------------------------- */
/* Scoring (Decision D8, Milestone 4) — src/game/scoring/score.ts         */
/* Passed into calculateScore as its ScoreWeights parameter (not imported  */
/* directly by score.ts itself — see that file for why: same options-     */
/* parameter pattern terrain-generator.ts uses for its own tunable dials). */
/* ---------------------------------------------------------------------- */

/** Flat reward for any confirmed safe landing, regardless of the other
 * three factors below — landing at all is worth something on its own. */
export const SCORE_BASE_LANDING_BONUS = 100;

/** Max additional points for touching down with a full tank, scaling
 * linearly to 0 at empty. The single largest factor — fuel conservation is
 * this game's core skill test. */
export const SCORE_MAX_FUEL_BONUS = 500;

/** Max additional points for touching down dead-center on the pad, scaling
 * linearly to 0 at the pad's edge (a safe landing is already guaranteed to
 * be somewhere on the pad, so this is never negative in practice). */
export const SCORE_MAX_PRECISION_BONUS = 300;

/** Max additional points for landing at or before SCORE_TIME_PAR_MS after
 * spawn, scaling linearly to 0 by the cap and never negative beyond it — a
 * slow, careful landing still scores the fuel/precision bonuses in full. */
export const SCORE_MAX_TIME_BONUS = 100;

/** "Par" flight duration, in ms, for the full time bonus — tuned for feel
 * at this game's gravity/thrust scale (a direct, confident descent from
 * LANDER_START_Y comfortably beats this; a cautious hover-and-correct
 * approach may not, which is the intended fuel-vs-time skill tradeoff). */
export const SCORE_TIME_PAR_MS = 20000;

/* ---------------------------------------------------------------------- */
/* High-score persistence (Decision D8, Milestone 4)                      */
/* src/game/persistence/high-scores.ts                                    */
/* ---------------------------------------------------------------------- */

/** How many past scores the persisted leaderboard keeps, highest first —
 * enough to feel like a real leaderboard without the list growing forever
 * in localStorage. */
export const HIGH_SCORE_LIST_MAX_ENTRIES = 10;

/* ---------------------------------------------------------------------- */
/* Missions & cargo (PLAN.md §9.5, Milestone 9.5)                         */
/* src/game/missions/**                                                   */
/* ---------------------------------------------------------------------- */

/** Mass units (MU) per unit of cargo — same non-SI, pixel-space spirit as
 * `THRUST_ACCEL`-family constants elsewhere. Troops are a discrete,
 * whole-unit-only "squad" (personnel + minimal gear); supplies are a
 * continuously loadable crate. */
export const CARGO_TROOP_UNIT_MASS = 10;
export const CARGO_SUPPLY_UNIT_MASS = 2;

/** Credits earned per unit delivered, before `riskBonus` scales it up —
 * troops (a permanent garrison) are worth more per unit than consumable
 * supplies. */
export const CARGO_TROOP_UNIT_VALUE = 25;
export const CARGO_SUPPLY_UNIT_VALUE = 5;

/** Scales `perTripCargoReward` by how much of the ship's shared mass budget
 * a trip's total carried mass (equipment + cargo) actually used — 0
 * utilization pays the base value, 100% utilization pays 1.5x. Rewards
 * committing more of a ship's capacity to the mission over playing it safe
 * with a light load. */
export const CARGO_RISK_BONUS_COEFFICIENT = 0.5;

/** Flat credits paid once per completed mission (success or partial), on
 * top of cargo/score rewards — the direct Milestone 9.5 analogue of
 * `SCORE_BASE_LANDING_BONUS` for a mission as a whole rather than one
 * landing. */
export const MISSION_BASE_COMPLETION_REWARD = 100;

/** Establishing a new base pays its cargo reward at this multiple, since
 * it's the only mission that base will ever pay this bonus (it cannot be
 * repeated once established) — Resupply missions use a 1.0 multiplier
 * (no bonus). */
export const ESTABLISH_PRESENCE_BONUS_MULTIPLIER = 2.5;

/** Flat fuel-unit overhead for a relay's launch-to-transfer-orbit burn,
 * charged once per relay mission regardless of transit distance. */
export const TRANSIT_LAUNCH_OVERHEAD = 8;

/** Cumulative supply-unit target and mission-wide time budget for this
 * project's one shipped multi-trip-same-base mission template (PLAN.md
 * §9.5.7 Example C) — reused at every established base that offers a
 * multi-trip Resupply mission, rather than a per-base authored number. */
export const MULTI_TRIP_RESUPPLY_TARGET_SUPPLIES = 60;
export const MULTI_TRIP_RESUPPLY_TIME_LIMIT_MS = 300000;

/* ---------------------------------------------------------------------- */
/* Combat (PLAN.md Milestone 11) — src/game/combat/**, scenes/game-scene.ts */
/* ---------------------------------------------------------------------- */

/** Every ship's hull-point pool for combat purposes — a flat,
 * ship-independent constant, not a `ShipClass` field: PLAN.md's own worked
 * combat examples (§6b.5) apply the same baseline hull regardless of which
 * ship class is flown (a Falcon and a Hauler facing the same hostile both
 * work from "hull 30"), matching this project's "arcade game, not a
 * physics sandbox" stance (§4) rather than adding a per-ship armor stat
 * this roster doesn't otherwise need. */
export const SHIP_BASE_HULL_POINTS = 30;

/** A fired projectile's muzzle speed, px/s — shared across every weapon
 * (only `damage`/`cooldownMs` vary per weapon, `equipment/equipment.ts`'s
 * `WeaponEquipmentItem`); one fewer authored dial than modeling per-weapon
 * speed, and this project's acceptance criteria only asks that a weapon's
 * damage/fire-rate measurably change outcomes, not its projectile speed. */
export const WEAPON_PROJECTILE_SPEED = 500;

/** How far a projectile travels, px, before despawning unspent — bounds an
 * indefinitely-missed shot to a lifetime proportionate to this game's
 * combat encounter ranges (`bases/combat` registry's own `attack.range`
 * values are all well under this). */
export const WEAPON_PROJECTILE_RANGE = 400;

/** Shared collision/contact radius, px, for every combatant — this
 * milestone's roster is small and deliberately simple (PLAN.md's own
 * "simple behavior, not necessarily complex AI" scope note), so one shared
 * size (comparable to `LANDER_RADIUS`) stands in for a per-combatant
 * hitbox rather than adding an authored dial no design currently needs. */
export const COMBATANT_COLLISION_RADIUS = 16;

/** Half-width, px, of the box a triggered encounter's combatants spawn
 * within, centered on the player's own x position at trigger time
 * (`combat/encounter.ts`'s `spawnEncounterCombatants`) — keeps a "swarm"
 * feeling like a close, real ambush rather than scattered across this
 * game's full multi-screen-wide world (Decision D19). */
export const ENCOUNTER_SPAWN_HALF_WIDTH_PX = 150;

/** Reference duration (seconds) `missions/relay.ts`'s pre-launch
 * feasibility gate assumes for each of a relay's two flown descent legs —
 * deliberately much shorter than `SCORE_TIME_PAR_MS`'s whole-flight
 * duration. `bases/fit-check.ts`'s `estimateFuelNeeded` (continuous thrust
 * for the *entire* reference flight) is calibrated as an always-fires soft
 * advisory warning, not a hard gate — reusing it for relay's hard
 * pass/fail gate would make every relay in the game permanently infeasible
 * regardless of ship or route, since no ship's `fuelCapacity` covers a
 * full reference-flight burn even once, let alone twice plus a transit.
 * This shorter constant instead approximates just the final braking
 * correction of a descent — the portion that actually costs sustained
 * thrust, with the rest of a real descent being mostly gravity-assisted
 * coasting — calibrated so PLAN.md §9.5.7's Examples D/E (a short
 * same-world hop and a longer but hazard-light cross-world hop) come out
 * feasible for a well-suited ship, while Example F (the longest, coldest,
 * highest-garrison route) stays infeasible for every ship in this
 * project's roster, matching that example's own worked conclusion. */
export const RELAY_DESCENT_BRAKING_SECONDS = 3;
