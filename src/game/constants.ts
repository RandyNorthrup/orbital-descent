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
 * "glowing engine trail"), always present regardless of thrust input.
 * Milestone 13's `THRUST_PARTICLE_*` constants further down add real
 * thrust-*reactive* particle exhaust on top of this same static halo (and
 * reuse this exact color for it), not instead of it. */
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

/* ---------------------------------------------------------------------- */
/* Achievements (PLAN.md §9.5.4, Decision D16, Milestone 12)               */
/* src/game/achievements/**, src/game/persistence/achievement-progress.ts */
/* ---------------------------------------------------------------------- */

/** Global-sum `resupplyCounts` thresholds (across every base) for the
 * `resupply-streak-<tier>` achievement's three tiers (PLAN.md §9.5.4's own
 * "Lifeline" / "Old Reliable" / "Backbone of the Fleet" naming) —
 * `achievements.ts` derives each tier's id directly from its own threshold
 * value (`resupply-streak-${threshold}`) rather than a separately
 * hand-typed string, so the id and the number it checks against can never
 * drift apart. */
export const RESUPPLY_STREAK_TIER_1_THRESHOLD = 5;
export const RESUPPLY_STREAK_TIER_2_THRESHOLD = 10;
export const RESUPPLY_STREAK_TIER_3_THRESHOLD = 25;

/** How long `WorldMapScene`'s achievement toast stays on screen before the
 * next queued one (if any) takes its place -- long enough to comfortably
 * read a short "ACHIEVEMENT UNLOCKED: <text>" line, short enough that a
 * burst of simultaneous unlocks (e.g. establishing the last critical-path
 * base fires its own world-pioneer/full-claim/frontier-claimed all at once,
 * per `achievements.test.ts`'s own worked scenario) drains in a reasonable
 * span rather than queuing for a full minute. */
export const ACHIEVEMENT_TOAST_DISPLAY_MS = 3000;

/** Vertical position for `WorldMapScene`'s achievement toast, as a fraction
 * of GAME_HEIGHT -- verified empirically against a real running build
 * (Playwright screenshot, this milestone's own scratch verification, not
 * checked in): sits clear of the title, every world/base list row, the
 * axis-legend caption, and the fixed `BACK_BUTTON_Y_FRACTION` (0.85) row
 * every world-list/base-list screen shares. */
export const ACHIEVEMENT_TOAST_Y_FRACTION = 0.94;

/** `WorldMapScene` never otherwise calls `setDepth` (every object it
 * creates sits at Phaser's default depth 0), so any strictly-positive value
 * would already render on top -- this is deliberately a large round number
 * so it reads, at a glance, as "always above everything this scene draws,"
 * rather than a value that could be mistaken for participating in the
 * cross-scene z-order system `SKY_LAYER_DEPTH`..`HUD_LAYER_DEPTH` above
 * (that ordering is `GameScene`'s own, a different scene entirely). */
export const ACHIEVEMENT_TOAST_DEPTH = 1000;

/* ---------------------------------------------------------------------- */
/* Audio (PLAN.md Milestone 13) — src/game/audio/sfx-cues.ts,              */
/* src/game/rendering/audio-player.ts                                     */
/* Every synthesized cue's tunable numbers live here, named, matching this */
/* file's own "every tunable number has a name" rule. sfx-cues.ts is the   */
/* Phaser-free module that assembles them into the plain-data `SfxCue`     */
/* shape; audio-player.ts is the Phaser/Web-Audio-touching module that     */
/* actually schedules real oscillator/noise nodes from that data — the     */
/* same physics/rendering split this project uses everywhere else.        */
/* ---------------------------------------------------------------------- */

/** Shared white-noise source buffer length, seconds — long enough to cover
 * the longest noise-waveform cue's full playback (attack + decay + sustain
 * hold + release) with room to spare. Only the crash cue uses this today
 * (`SfxCue.waveform === 'noise'`), but the buffer itself is cue-agnostic
 * (`audio-player.ts` plays it from the start every time), so a future
 * second noise cue with a longer envelope would still be covered without
 * revisiting this value first. */
export const SFX_NOISE_BUFFER_DURATION_SECONDS = 1;

/** Thrust: a continuous/loopable low engine rumble. `audio-player.ts`
 * retriggers this exact attack/decay/sustain/release pass back-to-back
 * every `SFX_THRUST_DURATION_MS`, for as long as thrust is held — see
 * `SfxCue.loop`'s own doc comment (`audio/sfx-cues.ts`) for why the
 * resulting periodic throb is a deliberate "engine chugging" texture, not
 * an artifact to smooth over. Sawtooth for a buzzier, more mechanical
 * timbre than the landing/achievement cues' smoother sine/triangle. */
export const SFX_THRUST_FREQUENCY_START_HZ = 60;
export const SFX_THRUST_FREQUENCY_END_HZ = 85;
export const SFX_THRUST_ATTACK_MS = 20;
export const SFX_THRUST_DECAY_MS = 40;
export const SFX_THRUST_SUSTAIN_LEVEL = 0.85;
export const SFX_THRUST_RELEASE_MS = 40;
export const SFX_THRUST_PEAK_GAIN = 0.22;
export const SFX_THRUST_DURATION_MS = 220;

/** Landing: a resolving, pleasant two-note rise (a root up to a fifth
 * above) — sine for the cleanest, calmest timbre in this cue set. */
export const SFX_LANDING_FREQUENCY_START_HZ = 440;
export const SFX_LANDING_FREQUENCY_END_HZ = 660;
export const SFX_LANDING_ATTACK_MS = 20;
export const SFX_LANDING_DECAY_MS = 60;
export const SFX_LANDING_SUSTAIN_LEVEL = 0.8;
export const SFX_LANDING_RELEASE_MS = 250;
export const SFX_LANDING_PEAK_GAIN = 0.35;
export const SFX_LANDING_DURATION_MS = 500;

/** Crash: a harsh, descending noise burst. `SfxCue.frequency` is read as a
 * lowpass-filter cutoff sweep for this cue rather than an oscillator pitch
 * (see that field's own doc comment) — `'noise'` has no fundamental
 * frequency of its own, but sweeping a filter cutoff down across a burst
 * of noise is the idiomatic Web Audio way to make it read as "descending." */
export const SFX_CRASH_FILTER_START_HZ = 1200;
export const SFX_CRASH_FILTER_END_HZ = 150;
export const SFX_CRASH_ATTACK_MS = 5;
export const SFX_CRASH_DECAY_MS = 120;
export const SFX_CRASH_SUSTAIN_LEVEL = 0.3;
export const SFX_CRASH_RELEASE_MS = 300;
export const SFX_CRASH_PEAK_GAIN = 0.5;
export const SFX_CRASH_DURATION_MS = 600;

/** Weapon fire: a short, descending "pew" — square for the brightest, most
 * synthetic/laser-like timbre in this set. */
export const SFX_WEAPON_FIRE_FREQUENCY_START_HZ = 900;
export const SFX_WEAPON_FIRE_FREQUENCY_END_HZ = 250;
export const SFX_WEAPON_FIRE_ATTACK_MS = 5;
export const SFX_WEAPON_FIRE_DECAY_MS = 40;
export const SFX_WEAPON_FIRE_SUSTAIN_LEVEL = 0.2;
export const SFX_WEAPON_FIRE_RELEASE_MS = 60;
export const SFX_WEAPON_FIRE_PEAK_GAIN = 0.3;
export const SFX_WEAPON_FIRE_DURATION_MS = 140;

/** Achievement unlock: a short, bright two-note chime — triangle sits
 * between landing's plain sine and weapon-fire's square in timbre, and a
 * higher register than landing's 440-660Hz keeps the two "resolving tone"
 * cues from reading as the same event. */
export const SFX_ACHIEVEMENT_FREQUENCY_START_HZ = 660;
export const SFX_ACHIEVEMENT_FREQUENCY_END_HZ = 880;
export const SFX_ACHIEVEMENT_ATTACK_MS = 10;
export const SFX_ACHIEVEMENT_DECAY_MS = 40;
export const SFX_ACHIEVEMENT_SUSTAIN_LEVEL = 0.75;
export const SFX_ACHIEVEMENT_RELEASE_MS = 200;
export const SFX_ACHIEVEMENT_PEAK_GAIN = 0.4;
export const SFX_ACHIEVEMENT_DURATION_MS = 450;

/* ---------------------------------------------------------------------- */
/* Particle effects & screen shake (PLAN.md Milestone 13) —               */
/* src/game/effects/particle-burst.ts, src/game/effects/screen-shake.ts,  */
/* src/game/rendering/radial-glow.ts's bakeRadialGlowTexture,             */
/* scenes/game-scene.ts                                                   */
/* Every particle emitter in this project bakes a small soft-edged dot    */
/* texture (bakeRadialGlowTexture, the same baked-radial-gradient         */
/* convention ENGINE_GLOW_COLOR/_RADIUS above already uses) rather than    */
/* using Phaser's separate runtime-tint mechanism, which nothing else in  */
/* this codebase uses — one baked color per emitter, matching the paper-  */
/* cutout renderer's own "bake the final color into the texture" rule.    */
/* ---------------------------------------------------------------------- */

/** Shared dot-texture radius, px, for every particle emitter this milestone
 * adds (thrust exhaust, every impact/weapon burst) — a fixed visual size,
 * not a per-event "severity" dial; per-event intensity instead comes from
 * each burst's own count/speed/scale below. */
export const PARTICLE_DOT_RADIUS_PX = 5;

/** Fully opaque center for every baked particle-dot texture — the fade-out
 * look itself comes entirely from each emitter's own `alpha: {start, end}`
 * config animating over a live particle's lifetime, not from the texture's
 * own baked alpha (unlike ENGINE_GLOW_MAX_ALPHA, which bakes its fixed,
 * never-animated halo strength directly into that static texture). */
export const PARTICLE_DOT_MAX_ALPHA = 1;

/** Thrust exhaust: a continuous particle flow, active only while thrust is
 * held (`GameScene.updateThrustParticles`), positioned every frame at the
 * lander's rotated engine base — the same local offset
 * (`{x: 0, y: LANDER_RADIUS}`) `ENGINE_GLOW_RADIUS`'s own static halo uses,
 * rotated live via `physics/lander-physics.ts`'s `headingVector`. Tinted by
 * baking `ENGINE_GLOW_COLOR` directly into this emitter's own dot texture
 * (see this section's own banner comment) — the same accent color as the
 * ship's static engine glow, so active thrust reads as an extension of that
 * existing accent, not an unrelated new color. */
export const THRUST_PARTICLE_FREQUENCY_MS = 40;
export const THRUST_PARTICLE_QUANTITY_PER_EMIT = 1;
export const THRUST_PARTICLE_SPEED_MIN_PX_PER_SEC = 70;
export const THRUST_PARTICLE_SPEED_MAX_PX_PER_SEC = 140;
export const THRUST_PARTICLE_LIFESPAN_MS = 260;
export const THRUST_PARTICLE_SCALE_START = 0.9;
export const THRUST_PARTICLE_SCALE_END = 0.15;
export const THRUST_PARTICLE_ALPHA_START = 0.85;
export const THRUST_PARTICLE_ALPHA_END = 0;

/** How wide, in degrees either side of dead-center, the exhaust cone spreads
 * — 0 would be an unrealistic perfectly straight jet. */
export const THRUST_PARTICLE_ANGLE_SPREAD_DEG = 16;

/** Converts the lander's own `rotationRadians` (0 = nose up, clockwise-
 * positive — `physics/lander-physics.ts`'s own convention) into Phaser
 * particle emission degrees (0 = world-right, 90 = world-down — verified
 * directly against `node_modules/phaser/src/gameobjects/particles/
 * Particle.js`'s own `computeVelocity`: `velocityX = cos(rad) * speed`,
 * `velocityY = sin(rad) * speed`). The ship's local "down"/engine-base
 * direction at zero rotation already points along this system's 90°, so
 * the two angles differ by exactly this fixed additive offset — a
 * geometric fact of how the two conventions relate, not a tunable feel
 * dial (mirrors `DEGREES_PER_HALF_TURN` above also naming a fixed
 * conversion constant rather than leaving it a bare literal). */
export const THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG = 90;

/** Impact/weapon bursts (`effects/particle-burst.ts`) are a single instant
 * `ParticleEmitter.explode()` call, so every one shares the same
 * omnidirectional spread and fade curve — only count/speed/lifespan/scale
 * (this milestone's own real per-`ImpactKind` decision data, see that
 * module) vary per event. */
export const PARTICLE_BURST_ANGLE_MIN_DEG = 0;
export const PARTICLE_BURST_ANGLE_MAX_DEG = 360;
export const PARTICLE_BURST_ALPHA_START = 0.9;
export const PARTICLE_BURST_ALPHA_END = 0;

/** A projectile clearing a static obstacle (`GameScene.advanceProjectiles`)
 * — reuses `OBSTACLE_FILL_COLOR_TOP` for its dot texture, this project's
 * existing "one color means one thing everywhere" rust-red for anything
 * obstacle-related. */
export const OBSTACLE_CLEARED_BURST_COUNT = 14;
export const OBSTACLE_CLEARED_BURST_SPEED_MIN = 50;
export const OBSTACLE_CLEARED_BURST_SPEED_MAX = 150;
export const OBSTACLE_CLEARED_BURST_LIFESPAN_MS = 420;
export const OBSTACLE_CLEARED_BURST_SCALE_START = 1;
export const OBSTACLE_CLEARED_BURST_SCALE_END = 0.1;

/** A projectile connecting with a still-living combatant
 * (`GameScene.advanceProjectiles`) — fires on every registered hit
 * regardless of whether the hit's own `effectiveDamage` clears armor,
 * since the shot visibly connecting is the event this burst represents,
 * not whether it damaged the target (that distinction is instead exactly
 * what `combatantDefeated` below reads as, once health actually reaches
 * 0). Reuses `COMBATANT_FILL_COLOR_TOP`, same texture `combatantDefeated`
 * shares — a smaller, shorter-lived version of that same "hostile" color. */
export const COMBATANT_HIT_BURST_COUNT = 8;
export const COMBATANT_HIT_BURST_SPEED_MIN = 40;
export const COMBATANT_HIT_BURST_SPEED_MAX = 110;
export const COMBATANT_HIT_BURST_LIFESPAN_MS = 280;
export const COMBATANT_HIT_BURST_SCALE_START = 0.75;
export const COMBATANT_HIT_BURST_SCALE_END = 0.1;

/** A combatant's health reaching 0 (`GameScene.advanceCombatants`) — bigger,
 * faster, and longer-lived than a mere `combatantHit` above, so a real kill
 * reads as more dramatic than a wound that didn't finish the job. */
export const COMBATANT_DEFEATED_BURST_COUNT = 22;
export const COMBATANT_DEFEATED_BURST_SPEED_MIN = 70;
export const COMBATANT_DEFEATED_BURST_SPEED_MAX = 200;
export const COMBATANT_DEFEATED_BURST_LIFESPAN_MS = 520;
export const COMBATANT_DEFEATED_BURST_SCALE_START = 1.2;
export const COMBATANT_DEFEATED_BURST_SCALE_END = 0.1;

/** The player ship taking damage (`GameScene.advanceCombatants`) — one
 * shared burst for both the contact-hit and ranged-hit cases (PLAN.md
 * Milestone 13 groups them as a single burst point; `SCREEN_SHAKE_SHIP_
 * CONTACT_*`/`SCREEN_SHAKE_SHIP_RANGED_*` below are what actually
 * distinguish the two cases' feel). Reuses `CRASHED_COLOR_TOP`, this
 * project's existing "something bad just happened to you" red. */
export const SHIP_DAMAGE_BURST_COUNT = 12;
export const SHIP_DAMAGE_BURST_SPEED_MIN = 50;
export const SHIP_DAMAGE_BURST_SPEED_MAX = 160;
export const SHIP_DAMAGE_BURST_LIFESPAN_MS = 380;
export const SHIP_DAMAGE_BURST_SCALE_START = 1;
export const SHIP_DAMAGE_BURST_SCALE_END = 0.1;

/** Screen shake (`effects/screen-shake.ts`), passed straight through to
 * `Phaser.Cameras.Scene2D.Camera#shake(durationMs, intensity)` — `intensity`
 * is Phaser's own 0-1 fraction of camera size, so these are deliberately
 * small. A full crash shakes longest/hardest (the flight-ending event);
 * either in-flight combat hit is a shorter, lighter jolt since the player
 * is still flying afterward. A normal safe landing never shakes. */
export const SCREEN_SHAKE_CRASH_DURATION_MS = 400;
export const SCREEN_SHAKE_CRASH_INTENSITY = 0.02;
export const SCREEN_SHAKE_SHIP_CONTACT_DURATION_MS = 150;
export const SCREEN_SHAKE_SHIP_CONTACT_INTENSITY = 0.008;
export const SCREEN_SHAKE_SHIP_RANGED_DURATION_MS = 220;
export const SCREEN_SHAKE_SHIP_RANGED_INTENSITY = 0.014;
