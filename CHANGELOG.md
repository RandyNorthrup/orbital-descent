# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Only real,
already-made changes are recorded — planned work lives in `PLAN.md`, not here.

## [Unreleased]

### Changed

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
