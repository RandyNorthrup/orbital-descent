# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Only real,
already-made changes are recorded — planned work lives in `PLAN.md`, not here.

## [Unreleased]

### Changed

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
