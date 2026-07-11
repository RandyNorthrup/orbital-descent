# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Only real,
already-made changes are recorded — planned work lives in `PLAN.md`, not here.

## [Unreleased]

### Fixed

- **Post-M15 completeness pass** (three-dimension audit — placeholders/
  dead code, fallbacks/error-masking, stale claims — plus a full
  screenshot sweep of every screen and visual state):
  - Projectile bolts gained a crisp dark outline
    (`PROJECTILE_OUTLINE_WIDTH`) — the pale-yellow bolt was genuinely
    invisible against Milestone 15's bright day skies (caught by a
    weapon-fire screenshot on daylit Verdalis in which a live projectile
    was present and unfindable by eye).
  - `GameScene.create()` now clears `lastTriggeredWeaponId`/
    `lastTriggeredUtilityId` — the one omission from its stale-key
    cleanup list, the same stale-per-flight-data class as M11's
    `hullText` and M12's toast queue (observation-surface only, no
    gameplay effect).
  - `TransitScene` now throws on a missing `relayManifest` registry key
    (its two sibling registry reads already threw; this one silently
    defaulted to an empty manifest, which would have concluded a relay as
    a quiet failure instead of surfacing the caller bug), and
    `loadout-scene.ts`'s `baseNameOf` now throws on an unknown base id
    instead of rendering the raw slug — both per the project's
    throw-on-unknown convention.
  - Removed `equipment/loadout.ts`'s `resolvedCarriedMass`: zero
    production call sites (every consumer composes
    `resolveEquippedItems` + `totalCarriedMass` directly) and a doc
    comment that falsely claimed `GameScene`/`fit-check.ts` used it.
  - Corrected every stale doc/README claim the audit surfaced: M7-era
    "unused until Milestone 9/9.5" comments on `ShipClass` fields all
    those milestones now read (`equipmentSlots`/`massBudget`/
    `fuelPerDistanceUnit`), `ShipArchetype`'s "no code branches on this"
    (it selects each ship's hull artwork since M14), `LoadoutTag`/
    `WeaponTier`'s obsolete "@public, no importer yet" justifications,
    a "combat stays 0 until M11" badge comment, README's understated
    coverage-gate scope (it lists every Phaser-free module family, not
    just physics/flight), and README's "five achievements" (five
    families → 13 unlockable achievements, including single-base
    worlds).
- **Decision D6 upgraded to permanent** (user decision): this game will
  not do mobile/touch — desktop keyboard is the only input target, and
  PLAN.md §3's open question is closed.

### Added

- **Milestone 16 — Inhabited Worlds: set-dressing, structures, NPCs, item
  art, paper UI (Decision D24, certified)**: the taxonomy became visible
  and every screen became crafted, per the user's named references (Paper
  Mario's crafted-object dioramas, Duck Detective's cardboard standees,
  and temp/'s two inhabited-scene images). Terrain set-dressing
  (`terrain/decorations.ts` seeded generator +
  `rendering/decoration-visual.ts` paper cutouts): lush worlds grow
  puff-canopy trees, bushes, reeds, flowers, and grass by biome; barren
  worlds scatter jagged rock, dead snags, and the ore crystals the
  extraction economy mines; moons collect boulders and surface craters —
  all excluded from the pad and every curated obstacle (pinned by tests).
  Every curated base now stands as a place: a habitat dome, antenna
  tower, and two big-eyed crew standees (`rendering/base-structures.ts`,
  obstacle-dodging placement); Meridian Yard's wasps got their hive, and
  Frostgate got an abandoned raider camp with a crashed raider skiff —
  the game's first enemy-ship art (set dressing by design; a flyable
  raider combatant is named future work). Sky compositions now vary per
  world (seeded moon/sun position + size, cloud-band height, puff count,
  ridge bands). The STORE and LOADOUT show real item art: paper icon
  cards for all 8 equipment items and all 4 permanent upgrades
  (registry-completeness pinned), mini ship hulls on ship listings, and
  each weapon now fires its own bolt color (pulse cannon gold,
  autocannon ember — per-weapon glow textures). The entire UI moved to
  one paper theme: a rounded handcrafted font stack, warm cream ink,
  cardboard buttons, and hard paper drop shadows on every title and
  button across menu/HUD/store/loadout/map/results/settings/toasts.

- **Milestone 15 — Living Worlds: taxonomy, time-of-day, extraction
  (Decision D22, certified)**: every world now declares what it _is_ and
  when you see it. `CelestialBody.kind` classifies the registry into
  3 moons / 4 barren (dead) worlds / 5 lush (living) ones, and
  `skyPalette.daylight` splits it into 4 day / 4 dusk / 4 night scenes —
  Verdalis, Thessaly Shoals, Kharun Wastes, and Pyrrhine Expanse got
  brand-new daylit skies (crater-free sun disc with a wide halo, no
  stars; dusk worlds keep their moon and thin the starfield), and
  Thornreach Expanse went airless to become the third moon (companion
  moon + dense sparkles). Content follows the taxonomy: hostile
  encounters live only on lush worlds (pinned by test — the wasps'
  Verdalis prairie and the warden's boreal Glacian Drift both qualify);
  established bases on barren worlds additionally offer a new
  **EXTRACT MATERIALS** mission (new `extraction` `MissionFlavor`: an
  ordinary zero-cargo single-trip — no outbound stepper, `HAUL ON
TOUCHDOWN: 12 RAW MATERIALS` — whose safe touchdown pays the fixed
  materials haul × riskBonus via `reward.ts`'s new `perTripReward`,
  crediting currency without establishing or resupplying anything);
  moons keep their supply-drop focus. The world map tags every row
  MOON/BARREN/LUSH under its planet disc, and all three in-flight HUD
  readouts sit on dark chips so they stay legible over daylit skies.
  Verified in-browser via real screenshots of all 12 worlds, the
  world-map tags, the full extraction mission-select/loadout flow, and a
  real piloted e2e extraction touchdown at Rustwell Landing.

- **Milestone 14 — Production Art Pass, "Papercraft Diorama" (Decision
  D21, certified)**: the full-game visual overhaul to the reference-art
  standard, on top of D18's unchanged technique stack (gradient paper
  fills, grain, outlines, hard shadows, everything baked at runtime —
  still zero external assets). Every world now has its own hand-authored
  six-color `skyPalette` (all 12 bodies, palette-communicates-hazard:
  corrosive = acid skies, cold = frost blues), rendered as scalloped
  horizon cloud banks + floating paper cloud puffs (atmosphere worlds),
  cratered glowing moons, a companion moon + denser starfield on airless
  worlds, 4-point sparkle stars, and smooth rim-lit opaque parallax
  ridges on a near-dark/far-pale value ladder — every layout seeded
  per-world, every derived shade computed by the new pure
  `rendering/color-mix.ts` through shared named fractions. Every ship
  now flies as its archetype's own multi-piece papercraft craft
  (`ships/silhouette.ts` + `rendering/ship-visual.ts`: darkened fins,
  gradient hull, outlined porthole — 7 distinct hull families), shown
  per-row on SHIP SELECT; each hostile type has its own silhouette
  (`combat/combatant-silhouette.ts`: winged wasp vs. armored warden);
  projectiles gained a bake-once glow halo; the menu is now a title
  diorama over the home world's sky; and the WORLD MAP shows the entire
  12-world registry (two columns, per-world cratered planet discs,
  baseless worlds as dimmed non-interactive "(UNCHARTED)" rows). Tuned
  against real screenshots at every step — four corrections came from
  looking at rendered pixels rather than code (opaque ridges instead of
  translucent wash, an explicit ridge value ladder, per-piece
  outline/shadow overrides so small hulls aren't swallowed by the global
  stroke, a dark chip behind the menu stat line). 8 new/extended
  unit-test files (585 tests total); `world-scrolling.spec.ts` updated
  for the two new cloud depth planes. See `PLAN.md`'s Milestone 14
  section for the full writeup.

- **Milestone 13 — Audio, Juice & Accessibility Pass (certified)**:
  procedurally-synthesized sound cues, matching this
  project's existing "everything generated at runtime, nothing loaded from
  disk" convention — no `.mp3`/`.wav`/`.ogg` assets exist or were added. New
  `src/game/audio/sfx-cues.ts` defines five cues as Phaser-free plain data
  (waveform, frequency/filter-cutoff envelope, ADSR gain envelope,
  duration — every numeric parameter a named constant in `constants.ts`):
  a loopable thrust rumble, a resolving landing chime, a harsh noise-burst
  crash, a "pew" weapon-fire sweep, and a bright achievement-unlock chime.
  New `src/game/rendering/audio-player.ts` schedules real
  OscillatorNode/GainNode/AudioBufferSourceNode instances against
  `scene.sound`'s Web Audio context, degrading silently (no throw, no
  unhandled rejection) whenever Web Audio is unsupported or the context is
  still suspended by the browser's autoplay policy. `BootScene` (previously
  a placeholder) now nudges the AudioContext awake on boot; verified
  directly from Phaser 4.2.0's own source that its `WebAudioSoundManager`
  already resumes a suspended context on the first user gesture, so no
  separate first-interaction listener was needed. Cues are wired at their
  real trigger points: thrust with the thrust key's held state in
  `GameScene.update()`, landing/crash once at outcome resolution,
  weapon-fire once per shot in `triggerActiveWeapon()`, and
  achievement-unlock once per toast in `WorldMapScene`'s
  `showNextAchievementToastIfIdle()`. New `src/game/audio/sfx-cues.test.ts`
  (6 tests) validates every cue's data shape; `src/game/audio/**` added to
  `vitest.config.ts`'s coverage scope in the same change. Verified against
  real Chromium runs of the existing boot/landing/combat/pause/achievements
  Playwright specs (all still pass) in addition to the full `pnpm quality`
  gate.

  Also added this same milestone: thruster/impact/weapon particle effects
  and screen shake. New `src/game/effects/particle-burst.ts` and
  `src/game/effects/screen-shake.ts` are Phaser-free plain-data modules
  (mirroring `sfx-cues.ts`'s own "event kind -> fixed data record" shape,
  each with its own shape-validation unit tests, 6 and 5 respectively) that
  decide which count/speed/lifespan/scale profile a given particle burst
  uses, and which duration/intensity a given camera shake uses; every
  tunable number is a named constant in `constants.ts`, and
  `src/game/effects/**` was added to `vitest.config.ts`'s coverage scope in
  the same change. `GameScene` renders what those pure functions decide,
  never computing a burst/shake's own shape itself: a real thrust-reactive
  particle emitter (`this.add.particles`) now runs at the lander's rotated
  engine base while thrust is held, using `physics/lander-physics.ts`'s
  `headingVector` to track the ship's own rotation frame-by-frame, and
  explode-only burst emitters fire at a projectile clearing an obstacle, a
  projectile hitting a combatant, a combatant being defeated, and the ship
  taking contact or ranged damage (the last two share one "ship damage"
  particle look but trigger their own distinct screen-shake profile). A
  real crash (off-pad, obstacle, or combat destruction — never a normal
  safe landing) also shakes the camera. Every particle emitter bakes its
  own small colored dot texture via `rendering/radial-glow.ts`'s newly
  extracted `bakeRadialGlowTexture` (shared with the existing static
  engine-glow/moon-halo callers) rather than using Phaser's separate
  runtime-tint mechanism, matching this project's "bake the final color
  into the texture" convention; particle/burst colors reuse existing
  palette constants (`OBSTACLE_FILL_COLOR_TOP`, `COMBATANT_FILL_COLOR_TOP`,
  `CRASHED_COLOR_TOP`, `ENGINE_GLOW_COLOR`) rather than inventing new ones.
  Verified directly against Phaser 4.2.0's own installed source
  (`ParticleEmitter.js`/`Particle.js`) for the exact emission-angle
  convention, the `explode(count, x, y)` vs continuous-flow position
  semantics, and that a paused scene's own Scene Systems already stop
  calling a live emitter's `preUpdate` (so no bespoke pause-handling was
  needed beyond an explicit, defensive `stop()` call matching the existing
  thrust-cue pattern); the continuous thrust emitter is explicitly
  `stop()`-ed at outcome resolution, mirroring `thrustSoundHandle`'s own
  "never just reset a per-flight field, stop what it's holding first"
  lesson from Milestones 11/12. Verified against real Chromium runs of the
  existing landing/obstacles/combat/pause-resume/achievements Playwright
  specs (mostly `--workers=1`, since running the full suite in parallel on
  this machine produces unrelated timeout flakiness under CPU contention —
  confirmed by reproducing the same timeouts against the pre-particle-
  effects code) in addition to the full `pnpm quality` gate. One e2e test
  (`combat.spec.ts`'s "triggering the equipped weapon ... defeats a
  hostile" case) failed at this point in the session and was flagged as an
  apparently pre-existing issue — this later turned out to be a false
  diagnosis; the real cause was this same milestone's own particle-texture
  bug found by the adversarial review below.

  This milestone's third and final stage ran the accessibility pass:
  a full colorblind-safe audit across every world/ship/UI screen shipped
  through Milestone 12 found exactly one real color-coded state
  distinction anywhere in the game — the lander's landed (green) vs.
  crashed (red) fill — and it already has a fully redundant text label
  (`"LANDED SAFELY"`/`"CRASHED"`, `result-scene.ts`'s shared
  `outcomeLabel()`), so no color changes were needed anywhere. Documented
  (deliberately not built, and why, matching this project's own scope-
  decision convention) that this game has no DOM Tab-focus system on any
  screen by design (Decision D6) — Lighthouse's own focus/tab-order audits
  are all `scoreDisplayMode: 'manual'` for a canvas-based page and don't
  affect the accessibility score, which instead measures page-shell
  semantics untouched by this milestone. New `e2e/audio.spec.ts` extends
  `game-boot.spec.ts`'s zero-console-error pattern through a real first
  user interaction (boots, presses Enter, holds thrust for real, asserts
  the shared `AudioContext` reaches `'running'` and no console/page errors
  occurred) — run directly against all three Playwright browser projects,
  multiple times each, all passing. New `src/game/audio/
audio-availability.ts` extracts the blocked-autoplay fallback decision
  (`isAudioContextReady`) into its own Phaser-free predicate so this
  milestone's required unit test of that exact branch is possible at all
  (`audio-player.ts` itself imports Phaser directly, which throws outside
  a real browser, so it can't be unit-tested — this predicate can).
  A fresh `pnpm lighthouse` run confirmed Accessibility 1.00 on 3/3 runs,
  matching the Milestone 1 baseline this milestone's own acceptance
  criterion names. See `PLAN.md`'s Milestone 13 section for the full
  writeup.

- **Milestone 13 adversarial-review fix-up**: a scoped 4-dimension
  Workflow review, run after all three build stages above shipped, found
  one real critical bug (3/3 verify votes, zero refutations):
  `buildParticleEmitters()` baked `COMBATANT_PARTICLE_TEXTURE_KEY` twice —
  once per emitter that deliberately shares it (`combatantHit`,
  `combatantDefeated`) — and the second bake destroyed the live Texture
  object the first emitter's `ParticleEmitter` had already cached a
  reference to (confirmed directly against Phaser 4.2.0's own
  `TextureManager`/`Texture`/`Particle` source), crashing
  `GameScene.update()` synchronously the first time any weapon hit
  connected with a still-living combatant. The exact same shared/rebaked-
  texture-key defect class Milestone 11's own `COMBATANT_TEXTURE_KEY_PREFIX`
  fix already exists to prevent, recurring here for two static, built-once
  emitters that were never given the same protection. Fixed by baking
  each distinct texture key exactly once, up front, before any emitter
  referencing it is constructed. This fix also fully resolved the
  `combat.spec.ts` weapon-kill failure the particle and accessibility
  stages had each independently (and, it turns out, incorrectly) flagged
  as an unrelated pre-existing issue — with the fix applied, a complete
  108/108 `pnpm exec playwright test --workers=1` run across the entire
  e2e suite passed cleanly, and the full `pnpm quality:full`/
  `pnpm lighthouse` gates were re-verified independently end-to-end. See
  `PLAN.md`'s Milestone 13 section for the full writeup.

- **Post-certification completeness pass**: a full project-wide art/code
  audit found three instances of stale "not built yet" documentation whose
  own trigger condition had since fired. `SettingsScene` still told every
  player "check back once audio is added" after Milestone 13 shipped real
  audio with no follow-through — fixed by building the real option this
  always implied: a SOUND ON/OFF toggle, persisted via new
  `src/game/persistence/audio-settings.ts` (13 new unit tests) and read
  fresh at every `playSfxCue` call site (which gained a required `muted`
  parameter) so a toggle made while Settings sits paused over a live flight
  takes effect immediately; a new `e2e/audio.spec.ts` test proves the
  toggle flips and survives a real reload. `README.md` (two places) and
  `equipment.ts`'s `WeaponEquipmentItem` doc comment still said "firing a
  weapon has no gameplay effect yet," two milestones after Milestone 11
  shipped real weapon damage — fixed to describe the real, shipped
  behavior. `bases/fit-check.ts`'s `evaluateBaseFit` (unwired since
  Milestone 9, PLAN.md §3's own open question) was re-confirmed still
  unwired but left as-is: unlike the three fixes above, nothing in-game
  falsely claims it exists, so it's accurately-absent technical debt, not
  a stale promise.

  A real screenshot-driven visual audit (every ship captured in flight via
  actual button-click navigation, not a scripted shortcut) found a fourth,
  more significant instance of the same pattern: all 7 ships rendered as
  the exact same triangle, size, and color regardless of selection —
  `ShipClass` had no visual field at all, contradicting Decision D18's own
  stated reason for picking the current art style ("its ships read as the
  clearest, most distinct ally/hostile silhouettes... once M7/M11 add real
  ship variety" — both shipped; the distinction never did). Fixed, at the
  user's direction: `ShipClass` gained `hullFillColorTop`/
  `hullFillColorBottom`; all 7 ships got distinct colors (Falcon keeps its
  exact pre-existing values, removed from `constants.ts` in the same
  change, mirroring Milestone 7's own precedent for ship-intrinsic data);
  `GameScene` reads the selected ship's own colors instead of a global
  constant. One color (Sentinel) needed a second pass after a real
  screenshot showed it too close to Falcon's at actual on-screen size.
  New unit tests, zero regressions across a full re-run (545 unit/
  integration tests, 111/111 e2e across all three browsers, Lighthouse
  unchanged). See `PLAN.md`'s Milestone 13 section for the full writeup.

### Changed

- **Milestone 12 — Achievements & Notifications, certified**: achievement
  definitions (Decision D16) with toast notifications. New
  `src/game/achievements/achievements.ts` implements exactly the five
  triggers PLAN.md §9.5.4 specifies (`first-presence`, `world-pioneer-<worldId>`,
  `full-claim-<worldId>`, `resupply-streak-<tier>` at 5/10/25 — a global
  sum of `resupplyCounts` across every base, a deliberate reading of
  §9.5.4's own alternative — and `frontier-claimed`), building its
  registry dynamically from `bases.ts`'s live roster rather than hand-
  listing worlds/tiers. New `src/game/persistence/achievement-progress.ts`
  follows `high-scores.ts`'s exact validated-storage pattern. `WorldMapScene`
  now loads unlocked-achievement state and evaluates it inside
  `acknowledgeConcludedMission` (the only place `establishBase()`/
  `resupplyBase()` are ever called), queuing a `createUiButton`-styled
  toast per newly-unlocked achievement, drained one at a time via a new
  `showNextAchievementToastIfIdle` at a verified-clear-of-everything
  `ACHIEVEMENT_TOAST_Y_FRACTION` (0.94) and a new `ACHIEVEMENT_TOAST_DEPTH`
  (1000, this scene's first use of `setDepth`). Verified directly against
  Phaser 4.2.0's own `Clock.js` source before relying on it: a scene's
  `SHUTDOWN` event tears down every pending `delayedCall`'s callback, so a
  queued toast timer genuinely cannot fire against an already-torn-down
  scene — no extra guard needed. New `e2e/achievements.spec.ts` flies a
  real, piloted Establish Presence mission (CryoHauler, Anchor Station, its
  full 6-troop manifest carried the whole flight — meaningfully less
  effective thrust than `missions.spec.ts`'s own unloaded-origin-leg
  recipe it started from) to a genuine safe landing, confirms the
  `first-presence` toast text, reloads, and reads the unlock back out of
  real `localStorage`. Deliberately not built: Decision D16's other
  illustrative examples ("first landing", "N hostiles defeated", etc.) —
  out of scope per this milestone's own binding §9.5.4 spec. See
  `PLAN.md`'s Milestone 12 section for the full writeup.

- **Milestone 12's e2e flight, made reliable across all three browser
  engines**: getting `e2e/achievements.spec.ts`'s piloted flight to pass
  chromium/firefox/webkit alike surfaced two real bugs in the shared
  bang-coast-brake autopilot recipe itself, not just a tuning problem —
  found via direct telemetry from genuine Playwright-launched browser
  contexts (a standalone debug harness used for initial tuning turned out
  not to be a faithful proxy for chromium specifically). The horizontal
  phase's `closingIn` check never re-engaged braking once the ship
  overshot past the pad; its tilt-hold logic could overshoot the intended
  angle substantially with no way to correct back (confirmed settling as
  high as ~70° against a 40° target). Both fixed in this file's own copy
  of the recipe. Switched the flight's ship from Courier to CryoHauler for
  its larger fuel budget (fuel, not raw thrust ratio, turned out to be the
  real constraint once a full cargo manifest is carried the entire
  flight). See `PLAN.md`'s Milestone 12 section for the full writeup,
  including two further related fixes found while converging on this.

- **Milestone 12 adversarial-review fix-up**: a scoped 4-dimension
  Workflow review, run after M12's initial certification, found the same
  real, high-severity bug independently from two dimensions (6/6 verify
  votes, zero refutations): `WorldMapScene`'s `activeToast`/
  `pendingAchievementToasts` fields were never reset in `create()`, so
  navigating away (e.g. `BACK` to Menu, or into another mission) while a
  toast was still showing left `activeToast` as a permanently dangling
  reference — Phaser's own scene-shutdown destroys the toast `Text`
  object and kills the pending `delayedCall` that would have reset the
  field, but nothing ever re-nulled it on the next visit, since
  `WorldMapScene` is one long-lived instance reused for the page's whole
  session. The result: every achievement toast for the rest of the
  session after that point was silently swallowed (the achievement itself
  was never lost, already persisted to `localStorage` — only its
  celebratory toast). The exact same "per-scene field never reset in
  `create()`" mistake as Milestone 11's own `hullText` bug, recurring
  here. Fixed by resetting both fields at the top of `create()`. Proven
  with a new second test in `e2e/achievements.spec.ts` that reproduces
  the interrupt-mid-toast sequence and reads the scene's own toast-queue
  state back out directly — verified to genuinely catch the bug by
  reverting the fix locally and confirming the test failed with the exact
  dangling-destroyed-`Text` state before restoring it. See `PLAN.md`'s
  Milestone 12 section for the full writeup.

- **Milestone 11 — Weapons & Combat, certified**: a real weapon system
  (Decision D12). New `src/game/combat/` — `damage.ts` (shared
  `effectiveDamage`/shield-then-hull `absorbHit` resolution), `projectile.ts`
  (straight-line projectile physics, no gravity/drag), `combatant.ts`
  (three movement patterns — static/homing/diveStrafe — plus two authored
  hostiles, Verdalis Wasp and Glacian Warden), and `encounter.ts`
  (deterministic swarm spawning, plus `simulateEncounter`'s closed-form
  pre-flight estimate). `equipment.ts`'s weapons gained a `cooldownMs` fire
  rate; a new "Barrier Shield" utility item (absorbs 1 hit) gives
  `BaseRequirements.combat.minShieldTier` a real item to satisfy for the
  first time. `difficulty.ts`'s `computeCombatAxis` replaces the
  hardcoded-zero combat axis with a real worst-case-threat/armor-ceiling
  formula. Meridian Yard got this project's first encounter (a weak,
  unarmored swarm, introduced alone); Frostgate (already this game's
  hardest base) got a tougher single hostile whose armor hard-fails the
  tier-1 weapon, plus its own M10 spire became this project's first
  weapon-clearable obstacle — Frostgate now classifies as `dominant:
'combat'` for the first time (a real nonzero combat axis was previously
  unreachable). `GameScene`'s existing M9
  cycle/trigger input now does something real: Space fires a cooldown-
  gated projectile; every frame, live projectiles/combatants
  advance and resolve hits (obstacle-clearing, combatant damage, contact/
  ranged attacks against the player) through the same shield-then-hull
  resolution; a depleted hull is a new forced-crash cause
  (`destroyedInCombat`, mirroring `crashedOnObstacle`). Built directly by
  the main session, then independently adversarially reviewed via a scoped
  Workflow before certifying. Direct testing (before the review) caught
  and fixed two real issues: a shared WebGL texture key rebaked once per
  simultaneously-spawned combatant corrupted Phaser's renderer entirely
  (froze the game the instant a swarm spawned) — fixed by giving every
  spawned combatant its own texture key, mirroring the obstacle renderer's
  own per-index-key precedent; and a triggered encounter's combatants
  originally spawned across this game's full 3-screen-wide world, most too
  far from the player to ever plausibly close the distance — fixed to
  spawn within a fixed radius of the player's own position at trigger time
  instead. See `PLAN.md`'s Milestone 11 section for the full writeup.
  Deliberately not built: a dedicated e2e test proving weapon fire clears
  an obstacle specifically (the acceptance criterion is an OR, already
  proven via a real hostile-damage e2e test and a real end-to-end
  `simulateEncounter` proof against the actual curated Frostgate data) and
  per-combatant health bars/other combat HUD beyond a hull percentage
  readout.

- **Milestone 11 adversarial-review fix-up pass**: a scoped 4-dimension
  Workflow review, run after M11's initial certification, confirmed five
  real defects (all fixed same-session) and two doc-only overclaims.
  `vitest.config.ts` was missing `src/game/combat/**` from its coverage
  `include` list, hiding `collision.ts`'s zero test coverage from the
  90/85/90/90 gate (fixed, plus a `combatant.ts` `diveStrafe`
  zero-distance branch the same audit exposed as untested). `game-
scene.ts`'s `this.hullText` was the only M11 per-flight field never
  reset in `create()`, leaving a stale reference to a Phaser-destroyed
  `Text` object still receiving `.setText()` calls after a subsequent
  non-combat flight (fixed). The closed-form ranged-attack estimate
  (`combat/encounter.ts`, `bases/difficulty.ts`) undercounted hits by one
  relative to the real "ready to fire at spawn" rule, which cascaded into
  reclassifying Frostgate from `capstone-balanced` to `dominant: 'combat'`
  once corrected (fixed, with matching test updates). A **critical,
  pre-existing bug predating this milestone**: `menu-scene.ts`'s
  `startFlight()` and `result-scene.ts`'s `restart()` both called
  `this.scene.start(SCENE_KEY_GAME)` with no data argument — since Phaser
  only overwrites a scene's retained data when a truthy value is passed,
  this silently kept re-flying whatever curated base/mission was last
  launched for real instead of a genuine free flight, with no visible
  symptom short of a page reload. Fixed by passing an explicit `{}` at
  both call sites; proven with a new `e2e/scene-data-isolation.spec.ts`
  regression test. Two doc-comment overclaims corrected with no behavior
  change: `Obstacle.cleared`'s write side is never used in production
  (clearing is tracked via `game-scene.ts`'s own `Set`, to avoid mutating
  shared `bases.ts` data) and `BaseRequirements.combat.minWeaponTier`/
  `minShieldTier` are never read by `fit-check.ts` at all — the real
  combat gate is emergent from `simulateEncounter`'s armor math. Full gate
  list re-confirmed green after all fixes (478 unit tests, 99/99 e2e
  across chromium/firefox/webkit). See `PLAN.md`'s Milestone 11 section
  for the full writeup.

- **Milestone 10 — Obstacles & Hazardous Conditions, certified**: static
  flight hazards in terrain generation. `terrain-generator.ts` gained the
  merged `Obstacle`/`ObstacleKind` type (`kind: 'spire' | 'debris'`,
  `xStart`/`xEnd`/`yTop`/`yBottom`, optional `armorRating`/`cleared` for
  Milestone 11's future clearing mechanic) and three new optional
  `GenerateTerrainOptions` fields (`padStartIndexOverride`,
  `terrainOverrides`, `obstacles`) — every field is additive and inert when
  absent, so every base authored before this milestone (and free flight's
  own default options) generates byte-for-byte unchanged. New
  `terrain/obstacles.ts` (`isCollidingWithObstacle`, a pure circle-vs-
  rectangle test, Phaser-free like `landing.ts`). `bases/difficulty.ts`'s
  `computeSpatialAxis` gained a third additive term scoring obstacle
  density, on top of the pre-existing pad-tightness/roughness terms
  (unchanged). Scarp Outpost and Frostgate (this game's tightest-pad and
  hardest bases) each gained a real curated obstacle layout — one spire,
  and one spire plus one floating debris chunk — placed with a confirmed-
  clear margin from each base's own real generated pad position.
  `GameScene` checks obstacle collision every frame before the existing
  ground-contact check; a hit is an unconditional crash, distinguished
  from an ordinary off-pad crash via a new `crashedOnObstacle` data-manager
  key; obstacles render as a triangle (spire) or rectangle (debris) via the
  existing paper-shape renderer. Built directly by the main session (no
  delegated Workflow build), then independently adversarially reviewed via
  a scoped 3-dimension Workflow before certifying. The review found and
  fixed two real defects: `padStartIndexOverride`/`terrainOverrides` had
  zero real callers (Scarp Outpost/Frostgate's obstacle placement
  bypassed them, hand-fitting around a random pad draw instead) — fixed
  by giving both curated bases an explicit `padStartIndexOverride`
  (confirmed byte-for-byte identical output to the prior random draw);
  and the new `crashedOnObstacle` data-manager key was never reset in
  `create()`, unlike `outcome`/`score`, leaking a stale value across an
  in-session restart — fixed by clearing it alongside `score`. Also found
  and fixed, while reproducing that restart scenario: a real bug in
  already-certified Milestone 9.5 code — a crash on any Resupply-flavored
  **single-trip** mission incorrectly resolved as `'success'` (same root
  cause as the relay bug Milestone 9.5's own certification already fixed,
  just never re-checked for single-trip). See `PLAN.md`'s Milestone 9.5
  and Milestone 10 sections for the full writeup and regression tests.
  Full gate list green after every fix: 418 unit/integration tests, 90
  e2e tests (including two new tests covering a real piloted collision
  and a control crash), Lighthouse clean. Deliberately not built: a
  procedural/randomized obstacle generator (no procedural/endless game
  mode exists yet to consume one — see `PLAN.md`'s Milestone 10 section
  for the full reasoning) and any new _mechanical_ per-world condition
  (wind/visibility — reclassified as Milestone 5's already-certified
  territory by this milestone's own Classification rule, not actually in
  this milestone's binding scope).

- **Milestone 9.5 — Mission & Cargo Delivery System, certified**: turns a base visit into a real
  mission with cargo, not a bare "land safely" clear. Pure layer
  (`src/game/missions/`): `cargo.ts` (troops — discrete squads, 10 MU/25
  credits each — and supplies — continuous crates, 2 MU/5 credits each —
  sharing Milestone 9's own mass budget via `equipmentMass + cargoMass`,
  plus a second, narrower `cargoBayCapacity` ceiling on the cargo portion
  alone); `mission.ts`/`mission-trip.ts` (the three structures — single-trip,
  timed multi-trip-same-base, relay — as one shared `MissionDefinition`/
  `MissionState` shape, `recordDelivery` crediting cargo only on a
  confirmed safe touchdown before the mission timer expires, never on a
  timer-expiry or crash); `reward.ts` (`missionReward` — a flat completion
  bonus plus cargo value scaled by a mass-utilization risk bonus and a
  2.5x one-time Establish Presence multiplier, replacing `Base.
firstClearCredits` as the actual paid reward); `relay.ts` (same-world vs.
  cross-world transit distance/fuel cost, and a three-gate
  `relayFeasibility` check — cargo bay, mass budget, fuel range — each
  independently reasoned about, matching PLAN.md §9.5.7 Example F's own
  worked "infeasible for the entire roster" case, pinned by a regression
  test); `mission-offers.ts` (derives Establish Presence/Resupply mission
  offers from a base's live status, plus a hand-authored `RELAY_ROUTES`
  registry). `Base` gained `garrisonRequirement` (per-base troop minimums:
  6/10/15/30/30 across the 5-base roster, matching PLAN.md §9.5.7's worked
  examples exactly); `base-progress.ts` gained `resupplyBase` (increments
  `resupplyCounts`, never touches `status` — Resupply is repeatable and
  never gates progression, only Establish Presence does).
  Scene layer: `WorldMapScene` gained a third mission-select/active-
  mission/concluded-mission view — selecting a reachable base no longer
  launches a flight directly (an intentional Milestone 9.5 behavior
  change), it opens that base's own mission options (Establish Presence,
  Resupply single- and multi-trip, any feasible relay route, each
  infeasible relay shown greyed-out with every failed gate reason stated);
  an in-progress or just-concluded mission left on `this.registry` takes
  over this screen's very first render, funneling the player through
  resolving it before they can navigate elsewhere. A new `TransitScene`
  renders a relay's abstracted transfer (distance, fuel cost, before/after
  fuel) with either a CONTINUE action or, if the transit would leave
  negative fuel, the distinct "stranded" failure conclusion (separate from
  a crash, per PLAN.md §9.5.2). `LoadoutScene` extended with an optional
  cargo-manifest picker (troop/supply steppers bounded by `evaluateCargoFit`,
  folded into the same shared mass-usage line equipment already uses) and
  a LAUNCH action gated on the mission's own cargo requirement — absent
  mission data this screen still reproduces certified Milestone 9 behavior
  exactly. `GameScene` gained an optional `MissionContext` (this trip's
  manifest, and — relay destination legs only — the fuel a completed
  transit leaves); on landing/crash with a mission active it resolves the
  trip via `resolveTripOutcome` and always exits to the world map, never
  `ResultScene` and never waiting on `R` — absent mission data every flight
  path is byte-for-byte unchanged from before this milestone.
  `e2e/missions.spec.ts` (new, 3 tests): a multi-trip mission surviving a
  `loseTripOnly` crash (mission stays active while the flight's own
  `outcome`/`missionStatus` data-manager keys stay correctly separated) and
  continuing from a second launch; the mission-select screen rendering
  every failed feasibility-gate reason for the roster-wide-infeasible
  Rustwell Landing → Frostgate relay; a full piloted relay (real origin
  landing, a real transit, a real destination landing) concluding the
  mission successfully and establishing the destination base. `e2e/
world-map.spec.ts` extended: its existing base-selection tests now route
  through the new mission-select → loadout → launch flow instead of
  launching directly, and gained a new single-base-world assertion routed
  the same way.
- **Independent certification found and fixed three real defects the
  scoped Workflow's own checks had missed**, plus overrode a false
  NOT-CERTIFIED verdict from that Workflow's own automated verify stage
  (it compared the full uncommitted diff against the last commit rather
  than against the Workflow's own start state, so it mistook the main
  session's own pre-existing, correctly-locked pure-logic/`GameScene`
  changes for out-of-scope edits — confirmed false via file-mtime
  comparison against the Workflow's own Build-phase start time). Fixed:
  (1) `mission.ts`'s `isTargetMet` let a Resupply-flavored relay's origin
  leg trivially conclude the whole mission as `'success'` before the
  destination leg ever flew (`minManifest: {}` for that flavor made
  `meetsMinManifest` vacuously true on zero cargo) — now guarded with
  `cargoMass(state.delivered) > 0` for `structure === 'relay'`; (2) that
  fix exposed a real softlock — `LoadoutScene` let a Resupply relay LAUNCH
  with zero cargo, which after fix (1) could then never conclude on either
  leg — now blocked by extending the existing multi-trip nonzero-cargo
  LAUNCH guard to `structure === 'relay'` too; (3) the shared mass-budget/
  cargo-bay constraint was never actually re-checked at LAUNCH (only at
  each cargo-stepper click), so equipping gear after choosing cargo could
  silently exceed `massBudget` — `meetsLaunchRequirement` now re-checks
  `evaluateCargoFit` at LAUNCH time. Also extracted `TransitScene`'s
  STRANDED arithmetic into a new pure, unit-tested
  `remainingFuelAfterTransit` (`missions/relay.ts`) — it previously had
  zero test coverage anywhere despite an earlier claim otherwise — and
  removed `Base.firstClearCredits` entirely (dead data since `missionReward`
  replaced it; confirmed zero readers). Full gate list re-run clean after
  every fix: `pnpm quality` (395/395 tests, coverage 99.12%/95.41%/100%/
  99.08%), `pnpm security:audit`, `pnpm test:e2e` (84/84 across chromium/
  firefox/webkit, zero retries), `pnpm lighthouse`. See `PLAN.md`'s
  Milestone 9.5 section for the full writeup, including which of the
  4 originally-flagged gaps were resolved vs. explicitly re-deferred
  (`fit-check.ts`'s `evaluateBaseFit` remains unwired, re-deferred to
  M10/M11; the one full-relay e2e test's documented synthetic fallback and
  the narrower-than-ideal e2e outcome-matrix coverage both remain, accepted
  as non-blocking).

- **Milestone 9 — Ship Upgrades & Equipment Loadout (Decision D14),
  certified**: permanent stat upgrades (`src/game/ships/upgrades.ts` — 4 items:
  Stronger Engines, Lighter Hull Alloy, Extended Fuel Cells, Efficient
  Injectors — `applyPermanentUpgrades` folds each owned one's signed
  amount onto a `ShipClass` stat, bought once via the store, always
  active, no slot cost) and a slotted equipment loadout
  (`src/game/equipment/` — 7 items: 2 weapons, 5 utility items covering
  every hazard-countermeasure/boost example named in earlier planning,
  each carrying a mass cost that feeds the named
  `effectiveThrustAccel = baseThrustAccel × dryMass / (dryMass +
carriedMass)` formula M9.5 is scoped to reuse verbatim for cargo).
  `src/game/equipment/loadout.ts`'s `resolveEquippedItems` reconciles a
  persisted equip order against whichever ship is currently selected's
  live slot count/mass budget, so switching to a smaller ship after
  loading up a bigger one degrades gracefully (carry as much as still
  fits) instead of erroring. `src/game/bases/fit-check.ts`'s
  `evaluateBaseFit` facade (mechanical/spatial/combat fit bands plus
  hazard-countermeasure warnings) is built and unit-tested but not yet
  called from any scene — noted as an open item in `PLAN.md` §3, real
  home is likely Milestone 9.5's mission flow. New `LoadoutScene` (pre-
  mission loadout screen, reachable from a new MenuScene "LOADOUT"
  button) shows the effective ship's live slots/mass usage line, a
  one-line owned-upgrades summary, and a two-column (WEAPONS | UTILITY)
  equipment list following `ShipSelectScene`'s established conventions —
  locked/owned-equipped/owned-unequipped-fits/owned-unequipped-doesn't-fit,
  the last rendered as inert muted text (never a button offering an
  action that would silently no-op). `StoreScene` extended to also sell
  upgrades and purchase-type equipment (`economy/store.ts`'s
  `StoreListingKind` gained `'upgrade'`/`'equipment'`), and its rendering
  was restructured this session from a flat single-column list into one
  column per listing kind (SHIPS | UPGRADES | EQUIPMENT) after M9's own
  9-listing catalog was found to overflow the 640px canvas by ~325px in
  the old layout (see "Fixed" below). `GameScene` now folds owned
  upgrades onto the ship, resolves carried equipment against its live
  slot/mass budget, negates corrosive/cold hazards when the matching
  resistance item is equipped, and adds equipped Fuel Tank capacity
  bonuses; Q/E cycle the active weapon/utility item, Space/F trigger them
  (firing a weapon has no gameplay effect yet — hands off to Milestone
  11; triggering a utility item applies `repairKit`/`thrustBurst`
  directly). `e2e/loadout.spec.ts` (new, 3 tests): a fresh save's
  all-locked state plus BACK/ESC navigation, a seeded-ownership test
  equipping/unequipping several items across two real page reloads,
  asserting the live usage line, per-item stat tags, the "SLOTS FULL"
  inert-row case, and the owned-upgrades summary all survive intact —
  this milestone's own required upgrades/loadout reload test — and an
  in-flight test that seeds an equipped loadout directly, drives
  `GameScene` itself (three real `E` presses cycling the active utility
  item through both ids and back), and confirms a real `F` trigger of
  the active Repair Kit both fires `lastTriggeredUtilityId` and
  measurably restores fuel read off the HUD, all while `outcome` stays
  `'flying'`. Follow-up
  session extended `e2e/store.spec.ts` (3 new tests, M8's own ship-
  purchase tests unchanged): a permanent-upgrade purchase and a
  purchase-type equipment purchase each deduct their price, render
  `(OWNED)`, and survive a real reload (checked directly against
  `upgrade-progress.ts`'s/`equipment-progress.ts`'s own storage keys);
  a third test confirms an unlock-type equipment item never appears in
  the Store's catalog, at any balance — `equipmentListings()`'s
  purchase-type-only filter. `pnpm quality` (format/lint/typecheck/
  test:coverage/build/deadcode/secrets), `pnpm security:audit`, `pnpm
test:e2e` (75 tests × 3 browsers), and `pnpm lighthouse` all green —
  see `PLAN.md` for exact numbers.
- **Fixed** (found during this session's own pre-certification review):
  `StoreScene`'s BACK button rendered at y≈964 on a fresh save once
  Milestone 9 grew its catalog to 9 listings — 325px past the 640px
  canvas, breaking real clicks (`e2e/store.spec.ts` reproducibly timed
  out clicking BACK). Fixed by splitting the catalog into one column per
  `StoreListingKind`, the same per-kind-column technique `LoadoutScene`'s
  own WEAPONS | UTILITY split already uses, re-verified against real
  screenshots at both worst-case row heights (all-locked and
  all-affordable). Also updated `e2e/high-scores.spec.ts`'s
  now-stale exact-match assertion against MenuScene's old standalone
  `"BEST: <score>"` line, changed by this same milestone's BEST/BALANCE
  merge, to the new `"BEST: <score> · BALANCE: <n> CREDITS"` format.
- **Milestone 8 — Economy & Store (Decision D15), certified**: a
  fictional currency ("Credits") earned per
  completed mission, spent in a new store screen. Pure layer:
  `src/game/economy/currency.ts` (`scoreToCurrency`, pinned 1:1 to M4's
  landing score per §9.5.5's reward formula), `src/game/economy/store.ts`
  (`shipListings`/`canAfford`/`listingStatus` — a generic, domain-agnostic
  listing mechanism M9 will register equipment into without this
  mechanism needing to change), `src/game/persistence/
currency-progress.ts` (validated-`localStorage` `CurrencyState`,
  mirroring `ship-progress.ts`'s exact pattern), and a new
  `purchaseShip` transition on `ship-progress.ts` (idempotent, doesn't
  touch `selectedShipId` — buying a ship doesn't equip it). Scene layer:
  a new `StoreScene` following `ShipSelectScene`'s established
  conventions exactly (`track()`/`renderView()` teardown-rebuild,
  `ArmedKeyGuard` ESC handling, `createUiButton`, accumulating-y-position
  rows) — an always-visible `BALANCE: <n> CREDITS` line (0 is a normal
  state here, unlike MenuScene's conditionally-hidden BEST), then one row
  per listing (owned/affordable/too-expensive, an affordable listing's
  button label staying a bare, un-suffixed `<NAME>` for e2e-click-target
  stability with the price shown on a separate muted reason line below,
  matching `ship-select-scene.ts`'s own `lockedReasonText` wording).
  Purchasing spends currency, records ownership, persists both, and
  re-renders in place with no scene transition and no auto-equip — the
  player still visits `ShipSelectScene` to equip a purchased ship, same
  as ships already work. `MenuScene` gained an additive "STORE" button
  (5th entry in its existing data-driven button array) and an
  always-visible `BALANCE: <n> CREDITS` line (nudged
  `BEST_SCORE_Y_FRACTION`/`START_BUTTON_Y_FRACTION` slightly to make
  room, verified against real screenshots, not just hand arithmetic).
  `GameScene`'s safe-landing branch now credits currency right after
  computing the M4 score, reusing the same `storage` handle already
  fetched for the high-score write. One minimal pure-layer fix along the
  way: added the `@public` JSDoc annotation `ships/ship.ts`'s
  `ShipArchetype` already uses for an identically-shaped situation
  (an exported type satisfied only structurally, no by-name importer
  yet) to `store.ts`'s `StoreListingKind`, which was otherwise failing
  `pnpm deadcode` — a one-line documentation fix, not a behavior change.
  `e2e/store.spec.ts` (new, 3 tests): purchase gating (a locked Vanguard
  is real-click-inert, buying it once affordable deducts its price and
  marks it owned, surviving a real `page.reload()`), currency crediting
  on a real free-flight landing (asserting the right outcome for either a
  landing or a crash), and MenuScene's BALANCE line reflecting a seeded
  balance.
- **Independent review before certifying** caught and fixed two real
  defects: `StoreScene`'s "affordable" row's price line visually
  overlapped its own button (a reused offset constant had only ever been
  validated under plain backgroundless text, never under a real
  `createUiButton`'s background box — fixed with a dedicated, derived
  `BUTTON_REASON_LINE_OFFSET_PX`, re-verified against a real screenshot);
  and `e2e/store.spec.ts`'s currency-crediting test copied
  `landing.spec.ts`'s timeout ceiling verbatim without accounting for its
  own file's added sibling-test contention (reproduced a real 45-53s
  completion time against the old 60000ms ceiling; widened to
  35000ms/90000ms, matching `high-scores.spec.ts`'s own precedent for the
  identical problem). Full details in `PLAN.md`'s Milestone 8 section.
- **Verified this session, certified**: `pnpm quality:full` (format:check/
  lint/typecheck/test:coverage/build/deadcode/security:secrets/
  security:audit/test:e2e) all clean (214 unit/integration tests, coverage
  98.29%/93.1%/100%/98.22%, thresholds 90/85/90/90 all met; 57 e2e tests
  passing 57/57 in a clean full run, plus `e2e/store.spec.ts` alone
  re-run clean 4 further times in isolation across the two fixes above).

- **Milestone 7 — Ship Roster (Decision D13), certified**: a new
  `ShipClass` data model (`src/game/ships/ship.ts`) and a 7-ship registry
  (`ships.ts`) — 5 starters (Falcon, Scout, Courier, Sentinel, Hauler), 1
  purchase-gated (Vanguard, unreachable until Milestone 8's store exists),
  1 unlock-gated (Cryohauler, tied to establishing Frostgate). Falcon
  reproduces this project's pre-Milestone-7 certified flight constants
  exactly, so every existing e2e test keeps passing unmodified; Scout/
  Courier/Hauler reproduce PLAN.md §9.5.7's own worked-example table
  verbatim, pinned by a regression test. A new `ShipSelectScene`
  ("hangar") lets the player browse and equip any available ship, showing
  a stat tag per row and, for locked ones, a stated reason (price or
  unlock condition) — reachable via a new, additive "SHIP SELECT" menu
  button. Ship selection is a persistent loadout choice rather than a
  per-launch parameter: `GameScene` now resolves the flying ship directly
  from a new validated-`localStorage`-backed `persistence/
ship-progress.ts` (mirroring Milestone 6's `base-progress.ts` pattern,
  composing its own `purchasedShipIds` with Milestone 6's live
  `BaseProgressMap` for unlock checks) rather than via scene data, so
  every flight path (free flight, a curated base, a restart) automatically
  flies whatever's currently equipped. `THRUST_ACCEL`/`ROTATION_SPEED_DEG`/
  `MAX_FUEL`/`FUEL_BURN_RATE` — global constants since Milestone 1 — are
  removed from `constants.ts` entirely, now owned solely by Falcon's
  registry entry.
- **Verified this release**: format/lint/typecheck all clean; unit +
  integration 187 tests (up from Milestone 6's 157); coverage
  98.08%/92.06%/100%/98% (thresholds 90/85/90/90, all met — `ships/**`
  and the new `persistence/ship-progress.ts` both 100%-covered);
  `pnpm build`/`deadcode`/`security:audit`/`security:secrets` all clean;
  `pnpm test:e2e` 48/48 across Chromium/Firefox/WebKit, stable across 3
  consecutive full runs in isolation (two earlier full-suite runs each
  showed a handful of unrelated real-time-physics-timing tests time out
  under this sandbox's own CPU contention from a concurrently-running
  review workflow — re-run cleanly with no concurrent load). An
  adversarial review (correctness, standards/DRY, test-coverage,
  UX/gameplay-balance — every finding independently re-verified) found
  the ship data/persistence/scene layer correct against both PLAN.md
  §9.5.7's table and this project's conventions, but caught and fixed
  real gaps: a missing regression test pinning Scout/Courier/Hauler
  against §9.5.7; a starter ship named "Warden" colliding with a hostile
  NPC PLAN.md §6b.5 already named the same thing (renamed to Sentinel
  before combat ever ships); a real UX gap where the ship-select screen
  showed zero stat information (fixed with a per-row stat tag, laid out
  as a second column rather than a second line so the list still fits
  within the canvas); a stale doc-comment overclaim about every world
  being flyable regardless of ship, which didn't account for the cold
  hazard's thrust-efficiency penalty (corrected, and confirmed currently
  latent since the one body where the margin is razor-thin has no base
  registered yet); and duplicated e2e helper functions between
  `world-map.spec.ts` and the new `ship-select.spec.ts` (extracted into
  a shared `e2e/test-helpers.ts`). As with Milestone 6, this review's own
  verify-phase agents edited several files concurrently without seeing
  each other's changes — a full manual re-audit (fresh reads of every
  touched file, a real screenshot confirming the new stat-tag layout
  doesn't visually collide, `pnpm quality` re-run from scratch, 3
  additional clean e2e runs) followed before trusting any of it.

- **Milestone 6 — Planetary Browser / World Map (Decision D17),
  certified**: a new two-level `WorldMapScene` (world-select, then
  base-select within a world) reads a data-driven `Base` schema
  (`src/game/bases/base.ts`) and a hand-authored 5-base registry
  (`bases.ts`) reusing Milestone 9.5's own worked-example roster verbatim
  (Anchor Station + Scarp Outpost on Kessel's Reach, Meridian Yard on
  Verdalis, Rustwell Landing on Pyrrhine Expanse, Frostgate on Glacian
  Drift) so that future milestone's arithmetic can't silently drift. Each
  base's difficulty (mechanical/spatial/combat axes, dominant archetype,
  budget) is genuinely computed from its own authored requirements/terrain
  (`difficulty.ts`, combat pinned at 0 until Milestone 11 populates real
  encounter data) — never hardcoded. A three-state unlock machine
  (`locked → discovered-unclaimed → established`) persists via a new
  `src/game/persistence/base-progress.ts`, reusing Milestone 4's validated-
  `localStorage` pattern (its `KeyValueStorage`/`getSafeLocalStorage`
  safety check extracted into a shared `persistence/safe-local-storage.ts`
  that `high-scores.ts` now also imports, avoiding a second copy).
  Selecting a reachable base launches `GameScene` with that base's own
  fixed-seed `terrainOptions` — the first real production caller of the
  `GameSceneData.base` plumbing Milestone 5 built but nothing ever
  exercised until now. `MenuScene` gained a new, additive "WORLD MAP"
  button; START itself is deliberately unchanged (still a generic free
  flight), a conservative choice avoiding a larger restructure of the
  already-certified M1-M5 menu flow for a distinction with no visible
  payoff until Milestone 9.5 wires a real mission loop to it.
- **Verified this release**: format/lint/typecheck all clean; unit +
  integration 157 tests (up from Milestone 5's 111); coverage
  97.78%/90.56%/100%/97.7% (thresholds 90/85/90/90, all met — the few
  uncovered lines are `difficulty.ts` branches documented as structurally
  unreachable until Milestone 11 gives the combat axis a real nonzero
  value); `pnpm build`/`deadcode`/`security:audit`/`security:secrets` all
  clean; `pnpm test:e2e` 42/42 across Chromium/Firefox/WebKit, stable
  across 3 consecutive full runs. An adversarial review (correctness,
  standards/DRY, test-coverage, UX/navigation — every finding
  independently re-verified) found the schema/formula/persistence layer
  correct with no defects, but caught and fixed real gaps: a missing unit
  test for a load-bearing null-entry validation guard in
  `base-progress.ts` (confirmed genuinely load-bearing by temporarily
  removing it and observing a real crash); a missing e2e assertion that a
  locked world/base entry's own on-screen click position is truly inert
  (the milestone's own acceptance criteria specifically says "confirming
  it can't be entered," which a text-presence check alone doesn't prove);
  and — from the UX pass — that Decision D17's own text ("worlds with more
  than one landing base show base-select") wasn't actually conditional in
  the shipped code, fixed by making a single-base world (3 of today's 4)
  launch its base directly instead of always drilling into a base-select
  screen that would show exactly one entry, plus adding a plain-language
  legend for the previously-unexplained "MECH"/"NAV" difficulty-badge
  abbreviations. The review process itself surfaced a lesson worth
  recording: its own verify-phase agents edited the same two files
  concurrently without seeing each other's changes, which needed a
  full manual re-audit (fresh gate run, 3 e2e runs, and one more e2e test
  for a concurrently-added behavior — the single-base auto-launch — that
  had landed with no test coverage of its own) before any of it could be
  trusted as final.

- **Milestone 5 — Fictional Celestial Bodies (Decision D11/D20),
  certified**: generalized the single hardcoded world into a data-driven
  registry of 12 fictional worlds (`src/game/planets/bodies.ts`,
  `BODIES`), each with its own gravity, atmospheric drag, an optional
  hazard (corrosive passive fuel drain or cold reduced thrust
  efficiency), and a distinct terrain material (rock/sand/water/foliage,
  not just a recolor — new `etchStyle` support in
  `rendering/paper-shape.ts`, `'rock'` proven bit-for-bit identical to
  the pre-Milestone-5 look so Kessel's Reach, the default world, is
  unchanged). New pure `atmosphericDrag` physics function; `FlightState`
  now takes a required `dragCoefficient`/`hazard` and composes them into
  its per-tick acceleration/fuel math, keeping ship-intrinsic stats
  (thrust/rotation/fuel-burn, owned by Milestone 7's `ShipClass` once it
  lands) separate from body/environment stats. `GameScene` takes the
  selected body via scene data, defaulting to `BODIES[0]` until
  Milestone 6 adds real selection. Verdalis/Pyrrhine Expanse/Glacian
  Drift match Milestone 9.5's own worked-example roster exactly
  (distance/hazard pinned by a dedicated regression test).
- **Verified this release**: format/lint/typecheck all clean; unit +
  integration 111 tests (up from Milestone 4's 93); coverage
  99.21%/92.3%/100%/99.17% (thresholds 90/85/90/90, all met); `pnpm
build`/`deadcode`/`security:audit`/`security:secrets` all clean;
  `pnpm test:e2e` 33/33 across Chromium/Firefox/WebKit (no scene-glue
  regression from the physics/rendering generalization); a manual
  5-screenshot visual check confirmed all four terrain materials render
  as distinct "places," not a recolored rock silhouette twelve times,
  and Kessel's Reach is pixel-for-pixel unchanged from before this
  milestone. An adversarial review (correctness, gameplay-balance,
  standards/DRY, test-coverage — every finding independently
  re-verified with hand-redone arithmetic, not just re-run gates) found
  zero correctness or standards defects, but its gameplay-balance pass
  caught one genuine tuning problem: Corvexa Shallows' corrosive
  `fuelDrainRate` (originally 5) fully drained `MAX_FUEL` from passive
  drain **alone, with zero thrust used**, in exactly 20s — precisely
  this game's own `SCORE_TIME_PAR_MS` reference duration, leaving zero
  fuel margin for the mandatory braking burn regardless of skill; fixed
  by reducing it to 4. One gap was identified and correctly left open
  rather than patched over: no test at any tier yet drives `GameScene`
  through a non-default body, since every real caller today omits scene
  data entirely — explicitly deferred to Milestone 6, which needs to
  build that selection UI (and the observability hook to test it) anyway.

- **Milestone 4 — Scoring & High Scores (Decision D8), certified**: a safe
  landing now scores via new `src/game/scoring/score.ts`
  (`calculateScore`, pure): a flat base bonus for any confirmed safe
  landing plus three linearly-scaled 0..1 fractions — fuel remaining,
  time under a tuned "par" duration, and landing precision relative to
  pad center — summed and rounded; never called on a crash. New
  `src/game/persistence/high-scores.ts` persists the top
  `HIGH_SCORE_LIST_MAX_ENTRIES` scores to schema-validated `localStorage`
  (`loadHighScores` rejects the whole read on any parse failure or shape
  mismatch rather than sanitizing a valid subset; `recordHighScore`
  best-effort writes, swallowing a Safari-private-browsing-style quota
  throw and still returning the correct in-memory result;
  `getSafeLocalStorage` returns `null` instead of throwing when merely
  _reading_ `window.localStorage` itself throws, e.g. a sandboxed iframe)
  — both modules are pure/DI'd, unit-tested in plain Node against an
  injected fake, no `jsdom`. `GameScene` tracks real flight duration,
  computes the score on a safe landing only, and carries it to
  `ResultScene` (new SCORE/BEST text, shown only on a landing) and
  `MenuScene` (new BEST text, hidden until a real score exists — no
  misleading "BEST: 0" for a first-time player).
- **Verified this release**: format/lint/typecheck all clean; unit +
  integration 93 tests (up from Milestone 3's 68); coverage 99.16%/91.66%/
  100%/99.12% (thresholds 90/85/90/90, all met); `pnpm build`/`deadcode`/
  `security:audit`/`security:secrets` all clean; `pnpm test:e2e` 33/33
  across Chromium/Firefox/WebKit, confirmed stable across 3 consecutive
  full runs after a real fix, not just a retry: `e2e/high-scores.spec.ts`'s
  two tests each budgeted their overall `test.setTimeout` below the actual
  worst-case sum of their own constituent waits (one summed to 60000ms
  against a 30000ms ceiling, the other to 65800ms against 50000ms) — this
  under-budgeting reproduced as a real timeout on the third of three
  verification runs, not a hypothetical risk, and was fixed by widening
  both to 90000ms (matching `game-flow.spec.ts`'s own established ceiling
  for this suite's heaviest tests), not by adding retries or loosening an
  assertion. An adversarial review (dimension-specific finder agents, each
  finding independently re-verified before acceptance) found no
  magic-number, duplication, or architecture-boundary violations in the
  new modules, and did catch two other real defects: a `getSafeLocalStorage`
  unit test that referenced the DOM `window` global directly in this
  project's plain-Node Vitest environment (fixed via `vi.stubGlobal`, not
  `jsdom`, per the Architecture Notes testing philosophy), and an
  unguarded `window.localStorage` read in `GameScene`/`MenuScene` — a
  sandboxed iframe or storage-blocking privacy setting can throw on
  merely _accessing_ that property, before `high-scores.ts`'s own internal
  try/catches around `JSON.parse`/`setItem` would ever run — fixed via
  the new `getSafeLocalStorage` wrapper (returns `null` instead of
  throwing; both call sites degrade to "can't persist" rather than
  crashing). The review also added a crash-vs-leaderboard e2e test and a
  mixed-valid/invalid-array unit test, closing two real, previously-unfilled
  coverage gaps it identified.

- **Milestone 3 — Start Screen & Game Flow, certified**: replaced the
  old boot-straight-into-`GameScene` / "press R to try again" flow with
  a real game loop shell. New `MenuScene` (title, START/SETTINGS
  buttons, Enter as a shortcut for START) is now the boot target. New
  `SettingsScene` is a reusable stub overlay (no real options yet — see
  Milestone 13 for audio) launched via Phaser's `run()` + `pause()`
  pattern from both the menu and, mid-flight, from a new Escape-to-pause
  binding in `GameScene`; closing it resumes exactly whichever scene
  opened it via a `returnTo` key carried in scene data. New `ResultScene`
  replaces the old freeze-and-wait-for-R text with a proper color-coded
  landed/crashed screen (RESTART/MAIN MENU buttons plus matching R/Escape
  shortcuts), reusing new `outcomeLabel`/`outcomeColor` helpers as the
  single source of truth for the outcome-to-text/color mapping. New
  shared `scene-utils.ts` (`requireKeyboard`, `ArmedKeyGuard`) and
  `rendering/ui-button.ts` (`createUiButton`) remove what would otherwise
  have been duplicated across four scenes.
  **`ArmedKeyGuard` added**, found necessary by this milestone's own
  adversarial review, not planned at the start: holding a shortcut key
  (e.g. Escape) past the OS's ordinary keyboard auto-repeat delay
  re-fires native `keydown` events for as long as it's held, and a
  freshly-started or freshly-reset `Key` object (Phaser resets all keys
  on scene pause — confirmed directly in `KeyboardPlugin.js`) would treat
  the very next repeat as a brand-new `JustDown()`, instantly
  re-triggering the opposite action — the pause overlay flickering open
  and closed instead of staying open. `ArmedKeyGuard` requires a key to
  be observed not-down at least once before its first `JustDown()` can
  register, and is now applied to every scene-transition shortcut.
  New: `e2e/test-helpers.ts` (`tapKey`, `waitForActiveScene`,
  `clickButton`/`findButtonPosition`), `e2e/game-flow.spec.ts` (two full
  menu→fly→result→restart-or-menu cycles, keyboard-driven),
  `e2e/pause-resume.spec.ts` (`FlightState` snapshot proves pause freezes
  and resume continues physics exactly), `e2e/button-clicks.spec.ts`
  (the same button set driven by real mouse clicks instead of keyboard
  shortcuts). `e2e/game-boot.spec.ts`/`landing.spec.ts`/
  `world-scrolling.spec.ts` updated for the new Menu-first boot target.
- **Verified this release**: format/lint/typecheck all clean;
  unit+integration 68 tests (unchanged — no new pure logic this
  milestone, matching Milestone 2.5's own note); coverage 98.9%/87.87%/
  100%/98.82% (thresholds 90/85/90/90, all met, unchanged from Milestone
  2.5 since coverage only applies to the Phaser-free physics/flight
  layers); `pnpm build`/`deadcode`/`security:audit`/`security:secrets`
  all clean; `pnpm test:e2e` 27/27 across Chromium/Firefox/WebKit,
  confirmed stable across 3 consecutive full runs. An adversarial code
  review (dimension-specific finder agents, each finding independently
  re-verified by an agent defaulting to refuting it unless confirmed)
  caught the `ArmedKeyGuard` gap above plus DRY duplication (the
  `UI_BUTTON_ROW_HEIGHT_PX` spacing formula, `requireKeyboard`,
  `outcomeLabel`/`outcomeColor`) and two test-coverage gaps (a real
  mouse-click path for every button, the pause/resume physics-freeze
  check) — all closed above. Writing the new mouse-click e2e test itself
  then surfaced a second, independent bug: Playwright's default device-
  preset viewports (1280x720) are larger than the game's 960x640 canvas,
  which `style.css` centers via flexbox, so raw page-coordinate clicks
  missed every button in all 3 browsers 100% of the time; fixed by
  clicking relative to the `#app canvas` element's own bounding box
  instead, before this test was ever committed.

- **Milestone 2.5 — World Scrolling & Parallax Depth (Decision D19),
  certified**: replaced the single-screen world model (world width ==
  viewport width) with a real scrolling world — a Phaser camera follows
  the lander over a world 3x the viewport width, every Decision D18
  background layer now scrolls at its own parallax speed
  (`SKY_SCROLL_FACTOR`/`FAR_RIDGE_SCROLL_FACTOR`/`MID_RIDGE_SCROLL_FACTOR`),
  and a new midground ridge layer fills the depth gap between the far
  ridge and the gameplay terrain (the "not enough depth" note from D18's
  review). HUD text gained `.setScrollFactor(0)` so it stays screen-fixed
  now that the camera moves.
  **Horizontal wraparound removed**, found during this milestone's own
  review, not planned at the start: pairing the existing `wrapHorizontal`
  wrap with a zero-lerp follow camera meant every wrap instantly
  teleported the camera too, cutting the whole visible world to an
  unrelated section with no panning in between. `wrapHorizontal` was
  deleted from `lander-physics.ts` (with its unit tests), and
  `FlightState`'s `worldWidth` option was removed entirely (nothing calls
  `wrapHorizontal` anymore) — horizontal position is now unbounded,
  symmetric with vertical (already unbounded since Milestone 2).
  New: `constants.test.ts` (pins the new derived multiplier-scaled
  constants against hand-computed values), `e2e/world-scrolling.spec.ts`
  (4 tests: camera bounds/centering + terrain width, per-layer parallax
  factors, HUD fixedness, continuous camera-tracking via a position-
  derived invariant rather than a timing-dependent threshold — the
  threshold version was tried first and proved flaky under parallel
  test-worker contention).
- **Verified this release**: format/lint/typecheck all clean;
  unit+integration 68 tests (63 after removing 4 wraparound-specific
  tests, +5 new `constants.test.ts` tests); coverage 98.9%/87.87%/100%/
  98.82% (thresholds 90/85/90/90, all met); `pnpm deadcode`/
  `security:audit`/`security:secrets` clean; `pnpm build` succeeds;
  `pnpm test:e2e` 18/18 across Chromium/Firefox/WebKit, confirmed stable
  across 3 consecutive full runs; real Playwright verification of the
  wraparound fix specifically (sustained one-directional flight to
  ~4000px past spawn: camera pans smoothly and pins at its bound, lander
  keeps climbing with no teleport, matching the fix's intent exactly).
  An adversarial code review (3 independent dimensions, every finding
  re-verified before acceptance) caught the camera-teleport bug above
  plus two documentation-discipline gaps (this entry and Milestone 2.5's
  certification are the fix) and three test-coverage gaps (per-layer
  parallax factors, continuous camera-tracking, and the derived-constants
  pin, all closed above).

- Art direction (Decision D18): reworked the Milestone 1/2 paper-cutout
  rendering from flat-tinted fills to gradient-shaded fills, and added a
  new layered background (sky gradient, glowing moon, seeded crisp
  starfield, blurred/desaturated far parallax ridge) behind the gameplay
  terrain. Chosen after two rejected art-direction rounds against
  user-supplied reference art, via three independently-prototyped
  candidate techniques ("Deep Parallax Bands," "Warm Jewel Diorama,"
  "Ship-Forward / Atmospheric Depth" — the last one picked, for the
  clearest ally/hostile ship silhouette read once real ship variety
  exists). New files: `src/game/rendering/background.ts`,
  `radial-glow.ts`, `canvas-texture-utils.ts`, `starfield.ts` (pure,
  unit-tested), `ridgeline.ts` (pure, unit-tested); reworked
  `paper-shape.ts` (per-shape baked gradient + optional etched-line
  texture, replacing `TileSprite` + tint + geometry mask).
  `src/game/random/seeded-random.ts` and `bounded-random-walk.ts`
  extracted from `terrain-generator.ts` so the new seeded generators
  share one PRNG/random-walk implementation instead of duplicating it.
  All Milestone 1/2 gameplay behavior (collision, landed/crashed
  determination, restart) is unchanged — only the rendering of the
  already-certified shapes changed.
- **Verified this release**: format/lint/typecheck all clean; unit +
  integration suite green (67 tests, up from 49 — 18 new tests for the
  extracted/added pure modules); coverage 98.92% stmts / 87.87% branches /
  100% funcs / 98.85% lines (thresholds 90/85/90/90, all met); `pnpm
deadcode` clean; `pnpm security:audit`/`security:secrets` clean; `pnpm
build` succeeds; `pnpm test:e2e` 6/6 passing across Chromium/Firefox/
  WebKit (including the zero-console-errors assertion, exercising the new
  Canvas2D gradient/pattern/blur code in all three engines); real
  Playwright screenshots of the actual running build (not mockups)
  reviewed and approved. **Not yet verified**: Lighthouse was not
  re-run this pass (no DOM/asset changes expected to affect it, but this
  is an assumption, not a measurement — re-run before the next milestone
  that touches boot/HTML).
- **Adversarial code review** (3 independent dimensions — standards
  compliance, Phaser API correctness, test coverage — each finding
  independently re-verified before acceptance) caught one real functional
  bug before it shipped: the sky's background gradient used
  `Graphics#fillGradientStyle`, which Phaser 4.2.0 implements as WebGL-only
  — its Canvas-renderer fallback path silently no-ops the command
  (confirmed against `GraphicsCanvasRenderer.js`), which would have
  rendered as an undefined flat fill on any device/browser that falls back
  to Canvas2D. Fixed by baking the sky gradient the same way every other
  gradient in this change is built (a `CanvasTexture` via
  `bakeCanvasTexture`), which is renderer-independent. Also fixed: two
  stale comments (one describing a removed `TileSprite` mechanism, one
  citing wrong post-insertion container indices), consolidated five scene
  z-order depth constants that lived as disjoint locals in two files into
  one shared, named ordering in `constants.ts`, and added two tests that
  were missing real regression coverage (a golden-vector pin on the
  Mulberry32 PRNG's exact output, and a check that the bounded random walk
  actually moves in both directions, not just up to a clamp).

### Planning (PLAN.md only — no code changes)

- Decision D18 (art direction, above) and Decision D19 (world
  scrolling — planned, not yet implemented: a camera-follow model with
  parallax `scrollFactor` on the new background layers, replacing the
  current single-screen `wrapHorizontal`-at-viewport-edge model) recorded
  in `PLAN.md`, with a Milestone 2 amendment documenting both. Milestone
  5's scope gained an explicit requirement: per-world terrain surface
  _material_ (rock/sand/water/foliage), not just a palette swap — flagged
  so the generic etched-line texture added by D18 doesn't calcify into
  the only terrain look before real per-world variation is designed.
- Decision D20: raised Milestone 5's starter-world minimum from 4 to
  **12** unique fictional worlds/moons, each with 1-3 landing bases, and
  made explicit that progression is gated by _both_ mission completions
  (M9.5's `unlocks` graph) _and_ ship/equipment upgrade tier (§6b.2's
  `evaluateBaseFit`) — not either alone. Flagged that 12 worlds implies an
  actual narrative throughline still to be authored during M5/M6, not
  invented speculatively in this planning pass.

- Two large design specifications produced by an adversarially-verified
  multi-agent workflow process (four independent angles → synthesis →
  a skeptical review pass against the real code and PLAN.md → a revision
  pass fixing every issue the review found → a final read-through
  reconciling both against each other and against two clarifying
  instructions) and merged into `PLAN.md`:
  - **`## 6b. Base Design & Puzzle System`** — a `Base` data model shared
    by Milestones 6/9/10/11, a puzzle-archetype taxonomy across
    mechanical/spatial/combat axes, a soft-lock-avoidance guarantee with a
    worked numeric proof, and six fully-costed example bases. Amends M6
    (schema/registry), M9 (the `fit-check.ts` evaluator), M10 (obstacle
    geometry), and M11 (encounter/combatant types) rather than becoming a
    new milestone — the schema needs to exist somewhere all four
    milestones can share, and M6 already owns "what a base is."
  - **`### Milestone 9.5 — Mission & Cargo Delivery System`** — missions
    become real objects (troops/supplies cargo sharing M9's mass budget
    with equipment, three mission structures, two narrative flavors tied
    to base-establishment progression). Corrected after its first draft,
    per an explicit clarification that every trip/leg always returns to
    the world-map/mission screen rather than relaunching in place —
    this simplified the originally-flagged `GameScene` restructuring cost
    substantially (see PLAN.md §9.5.3 and §9.5.8 item 9 for the full
    before/after).
  - Both specs' adversarial review passes found and fixed real issues
    before insertion — arithmetic errors in worked examples, an incorrect
    dependency-graph claim, a self-contradicting worked example, and an
    unreconciled data-model claim — documented in PLAN.md §6b.8 and
    §9.5.8 rather than silently corrected.
  - Small amendments threaded through the not-yet-built M5/M7 sections
    (an explicit `distance`-field reconciliation, an explicit
    `engineForce`/thrust-to-weight model, new `ShipClass` fields) so
    later milestones don't need a second retrofit pass.
  - Decisions D11-D17 (already recorded) now have concrete mechanical
    specifications behind them instead of one-line summaries.

### Changed

- Project renamed "Lunar Lander" → "Orbital Descent" (Decision D10) —
  scope grew to multiple fictional worlds, ships, and combat, which
  "Lunar Lander" no longer described. Renamed everywhere in one pass:
  GitHub repo, `package.json`, `index.html`, all docs, and the
  `window.__ORBITAL_DESCENT_GAME__` e2e test hook. Verified nothing broke:
  full quality gate re-run (format/lint/typecheck/tests/build/e2e/
  deadcode/secrets) all green after the rename.

### Added

- Milestone 2 — Terrain & Landing: `src/game/terrain/terrain-generator.ts`
  (seeded, deterministic heightmap with a flat landing pad) and
  `src/game/terrain/landing.ts` (safe-landing speed/angle check). Real
  ground collision replaces Milestone 1's temporary fixed floor.
- Paper-cutout rendering system (`src/game/rendering/paper-texture.ts`,
  `paper-shape.ts`): a procedurally generated grain texture, masked to
  each shape's silhouette and tinted per-element, plus a crisp outline and
  a hard offset drop-shadow — used for the lander, terrain, and landing
  pad. No external image assets.
- `e2e/landing.spec.ts`: lets gravity alone carry the ship into the
  randomly generated terrain and asserts a real `landed`/`crashed` outcome,
  across all three browsers.

### Changed

- `src/game/physics/lander-physics.ts`: removed `applyWorldBounds`/
  `WorldBounds` (the Milestone 1 temporary floor) in favor of
  `wrapHorizontal` (horizontal wrap only) and `normalizeAngle` (for the
  landing-safety angle check). `FlightState` no longer takes a `bounds`
  option, just `worldWidth` — ground contact is `GameScene`'s job now, not
  `FlightState`'s. See `PLAN.md` §4.
- `GameScene`: generates and renders real terrain each session, detects
  ground contact, and shows a landed/crashed outcome with a restart key,
  instead of resting on a flat placeholder floor forever.

### Removed

- GitHub Actions CI (`.github/workflows/ci.yml`) — removed by explicit
  instruction: GitHub is code storage only for this project, not a CI/CD
  platform (Decision D9 in `PLAN.md`). It existed for two pushes and did
  real, useful work in that time (caught and confirmed the fix for the
  Lighthouse Performance bug below) before being removed. Quality gates
  (`pnpm quality`, the renamed `pnpm quality:full`, `pnpm lighthouse`) are
  now run locally before each push instead of automatically.
- `package.json` script `quality:ci` renamed to `quality:full` — the old
  name implied a CI system that no longer exists.

## [0.1.0] — 2026-07-06

### Added

- Project scaffold: Vite `8.1.3` + TypeScript `6.0.3` (strict), pnpm
  `11.10.0`, engines pinned to `^20.19.0 || ^22.13.0 || >=24.0.0`.
- Phaser `4.2.0` game with a custom, framework-free physics core
  (`src/game/physics/lander-physics.ts`, `src/game/flight/flight-state.ts`):
  gravity, thrust, fuel burn, rotation, horizontal world-wrap, temporary
  floor. See `PLAN.md` §4 for why this isn't built on Phaser Arcade Physics.
- `BootScene` and `GameScene`: real keyboard-controlled flight (W/↑ thrust,
  A/D/←/→ rotate), fuel HUD readout, title/instructions text.
- Quality gates: ESLint (flat config, type-checked strict + stylistic rule
  sets, `no-magic-numbers` enforced project-wide), Prettier, strict
  TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals`/`noUnusedParameters`, etc.), Vitest (unit + integration
  projects, coverage thresholds), Playwright (Chromium/Firefox/WebKit e2e),
  knip (dead code/unused exports/unused deps), secretlint, `pnpm audit`,
  Lighthouse CI (Performance/Accessibility/Best-Practices, SEO intentionally
  not gated).
- GitHub Actions CI (`.github/workflows/ci.yml`): quality gates job, e2e job,
  Lighthouse job. No deploy job — by decision (D5), there is no live
  hosting; the published GitHub repository is the deliverable.
- `PLAN.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md`.

### Verified this release (not just configured — actually run)

- 19 unit tests + 7 integration tests passing, 100% statement/branch/
  function/line coverage on the pure-logic scope.
- Production build succeeds (`vite build`); flagged one bundle-size warning
  (Phaser itself, ~360 KB gzip) tracked in `PLAN.md` §3.
- E2E smoke test passing in real Chromium, Firefox, and WebKit: the game
  boots, the canvas renders at the configured 960×640 size, `GameScene`
  becomes active, zero console/page errors.
- Lighthouse Performance (1.00), Accessibility (1.00), and Best Practices
  (0.96) all verified above the required 0.90 threshold, including a real
  run in GitHub Actions CI (not just locally).
- `pnpm audit --prod`: no known vulnerabilities.
- `secretlint`: no secrets detected.

### Fixed

- Lighthouse Performance was returning `NaN` (every metric erroring
  `NO_LCP`), reproduced identically on GitHub Actions' `ubuntu-latest`
  runner — not a local sandbox limitation as first suspected. Root cause:
  the entire page was a `<canvas>`, and canvas painting is invisible to
  Largest Contentful Paint detection. Fixed by giving `index.html` a real
  static loading text node (removed by `BootScene` once Phaser boots) and
  fixing the resulting Cumulative Layout Shift by sizing `#app` to the
  game's exact dimensions from first paint. Also switched
  `lighthouserc.json` to the `desktop` preset — this game is desktop-only
  (Decision D6), and Lighthouse's default mobile emulation was testing a
  960px layout in a ~412px viewport. Full investigation in `PLAN.md` §5.

### Decided

- Vitest pinned to `4.1.9` rather than the newly-published `4.1.10`
  (~10.6 hours old at install time) — stepped back for supply-chain
  freshness rather than relying on pnpm's automatic
  `minimumReleaseAgeExclude` bypass. Full reasoning in `PLAN.md` §5.
- Phaser `4.2.0` chosen over `3.x` (frozen/legacy since 2025-05-23) after
  verifying the 4.x line is the actively maintained one and confirming the
  core Scene/GameObject API is unchanged from v3. Full reasoning in
  `PLAN.md` §2 (Decision D1).
- No live hosting/deployment (Decision D5) — the game is published as source
  on GitHub only, not deployed anywhere. Milestone 6 retargeted from
  "Deployment" to "Publish to GitHub" accordingly.
