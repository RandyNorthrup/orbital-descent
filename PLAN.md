# Orbital Descent — Project Execution Plan

This document is the single source of truth for scope, decisions, and milestone
certification. It is updated every time a decision is made or a milestone is
certified — stale entries are corrected or removed, not left to rot.

## 1. Project Assumptions

- **Application type**: standalone, client-only, static single-page web game.
  No backend, no accounts, no server-persisted state.
- **Art direction**: paper-cutout/collage animation style (flat silhouette
  shapes, crisp bold outlines, layered hard-edged drop shadows for depth —
  think Monty Python/South-Park-style cutout animation, not smooth
  gradients or glows). Built from Phaser vector shapes (`Triangle`,
  `Graphics` polygons) and solid fills, not sprite-sheet artwork or
  photographic textures. Decided explicitly (not a placeholder) —
  see Architecture Notes for how each element applies it.
- **Platform**: desktop, keyboard-only input for v1 (Decision D6). Mobile/touch
  is explicitly out of scope until a future milestone decision.
- **No env vars required**: fully static build, nothing secret. See
  `.env.example`.

## 2. Resolved Decisions

Captured in the order they were made, with the reasoning, since later
milestones depend on understanding _why_, not just _what_.

| #   | Decision               | Chosen                                                                                                                                                                                                                                                                                                  | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Rendering engine       | **Phaser 4.2.0** (not 3.x)                                                                                                                                                                                                                                                                              | Phaser 3 is frozen at 3.90.0 since 2025-05-23 — legacy. Phaser 4.0.0 went stable 2026-04-10 (after this assistant's Jan-2026 training cutoff, verified live against the npm registry, not assumed). Core `Scene`/`GameObject`/config API is unchanged from v3 (verified directly against `node_modules/phaser/types/phaser.d.ts`); the v4 rewrite is renderer-internal (new WebGL node renderer, unified filter/FX system, GPU-batched sprite/tilemap layers).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D2  | Language               | **TypeScript 6.0.3**                                                                                                                                                                                                                                                                                    | Required for the strict typecheck gate. Pinned `6.0.3` (not `^6.0.3`) because `typescript-eslint@8.62.1` requires `typescript >=4.8.4 <6.1.0` — a caret range risked a silent break the moment TS 6.1 ships.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D3  | Build tooling          | **Vite 8.1.3 + vanilla TS** (no React)                                                                                                                                                                                                                                                                  | No app-wide UI state beyond the game itself; Phaser scenes own the canvas and game loop directly. Smallest dependency surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D4  | Package manager        | **pnpm 11.10.0**                                                                                                                                                                                                                                                                                        | Strict dependency resolution (no phantom deps), fast, disk-efficient. Installed globally via `npm install -g pnpm@11.10.0` since Node 26 no longer bundles Corepack — documented as a required one-time global install in README Prerequisites.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D5  | Hosting/deploy target  | **None — source published to GitHub only**                                                                                                                                                                                                                                                              | `github.com/RandyNorthrup/orbital-descent` (public). No live deployment (no Pages/Vercel/Netlify) — the repository itself is the deliverable. No CI/CD either (Decision D9) — GitHub stores the code only; quality gates are run locally before each push.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D6  | Platform/input         | **Desktop keyboard only (v1)**                                                                                                                                                                                                                                                                          | Arrow keys / WASD, classic lunar-lander controls. Touch controls are a possible future milestone, not committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D7  | Testing depth          | **Unit + integration + e2e**                                                                                                                                                                                                                                                                            | Vitest for pure-function and multi-module-orchestration logic; Playwright for real-browser verification. See Architecture Notes for why this split exists and what each tier actually covers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D8  | Score persistence      | **`localStorage`, schema-validated**                                                                                                                                                                                                                                                                    | No backend. Implemented in Milestone 4 (`src/game/persistence/high-scores.ts`) — see that milestone's entry below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D9  | CI/CD                  | **None — GitHub is code storage only**                                                                                                                                                                                                                                                                  | `.github/workflows/ci.yml` existed briefly (two real pushes, both verified green — see §5's Lighthouse investigation, which happened precisely because that CI run existed) and was removed by explicit instruction between Milestones 1 and 2. Quality gates (`pnpm quality`, `pnpm quality:full`, `pnpm lighthouse`) are run locally, by whoever makes a change, before pushing — not automated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D10 | Project name           | **Orbital Descent** (was "Lunar Lander")                                                                                                                                                                                                                                                                | Renamed once the scope grew to multiple fictional worlds, ships, and combat — "Lunar Lander" implied a single-Moon physics-sim scope that no longer fit. Renamed everywhere in the same pass: GitHub repo (`gh repo rename`), `package.json`, `index.html`, all docs, and the `window.__ORBITAL_DESCENT_GAME__` e2e test hook. The local working directory (`lunar_lander/`) was deliberately left as-is — renaming it mid-session would have broken every subsequent absolute-path tool call; rename it yourself with `mv` if you want the folder name to match.                                                                                                                                                                                                                                                                                                                                                                                                        |
| D11 | Celestial bodies       | **Fictional worlds, not real planets**                                                                                                                                                                                                                                                                  | Explicit instruction: worlds are invented, not "Mars"/"Venus"/etc. Frees up gravity/atmosphere/hazard combinations from real planetary data and avoids any implied claim of scientific accuracy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D12 | Combat scope           | **Landing + active combat**, weapons help with obstacles and local hostiles                                                                                                                                                                                                                             | Not open-ended combat — weapons exist to clear a landing path and defend against hostiles/enemy ships encountered while descending, not a standalone shooter. Scopes Milestones 10-11.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D13 | Ship roster            | **5 starter ships + unlockable ships**                                                                                                                                                                                                                                                                  | Ships differ in mass/thrust/fuel-capacity/handling, unlocked through progression (exact trigger tied to M6/M12 when built). Scopes Milestone 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D14 | Ship upgrades          | **Shields, weapons, longer boost/fuel, stronger engines, lighter materials — equipped weapons/utility items are slotted, cycled, and triggered, and every equipped item adds mass**                                                                                                                     | Concrete upgrade categories for Milestone 9, purchasable via Milestone 8's store. Equipment mass feeds thrust-to-weight (same relationship as ship class/world gravity) — deliberate: heavier loadouts trade thrust-to-weight for capability, so equipment choice must fit the target base.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D15 | Economy                | **Fictional currency, earned per completed mission, spent in a store**                                                                                                                                                                                                                                  | Placeholder name "Credits" until a better one is chosen — trivially renamed later, low-stakes. Scopes Milestone 8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D16 | Achievements           | **Achievement system + toast notifications**                                                                                                                                                                                                                                                            | Scopes Milestone 12.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D17 | World progression      | **Planetary browser/map: worlds are `discovered`/`locked`; bases within a world use the finer three-state machine `locked → discovered-unclaimed → established` (amended per Milestone 9.5's design)**                                                                                                  | Scopes Milestone 6; depends on Milestone 5's per-world config and Milestone 3's menu system both existing first (matches the roadmap's own "M5, M3" dependency list for M6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D18 | Art direction          | **"Ship-Forward / Atmospheric Depth"**: gradient-shaded (not flat) paper fills, a layered background (glowing moon/sun, crisp seeded starfield, blurred/desaturated far parallax ridge), a static engine-glow accent on the ship — retains the existing crisp outline + hard shadow + paper-grain rules | Superseded the original flat-fill "paper-cutout" rules (§4) after two rejected A/B rounds against user-supplied reference art (layered papercraft dioramas). Chosen over two other independently-prototyped candidates ("Deep Parallax Bands," "Warm Jewel Diorama") specifically because its ships read as the clearest, most distinct ally/hostile silhouettes — the property that matters most once M7/M11 add real ship variety. Starfield treatment pulled from the other two candidates per explicit feedback (crisp small dots, not soft/blurred). Retrofitted into the certified Milestone 1/2 lander+terrain rendering; all quality gates re-verified green. Every future planet/moon/ship/enemy art asset still gets its own approval pass before being treated as final — this is a technique pick, not a one-time blanket sign-off.                                                                                                                          |
| D19 | World scrolling        | **Worlds/bases support side-scrolling**: a world wider than the 960×640 viewport, camera-follow, real parallax — implemented, Milestone 2.5                                                                                                                                                             | Flagged during the D18 art-direction work: the old model had `wrapHorizontal` wrap at the _screen_ edge because world width == viewport width (Milestone 2). Real base layouts (§6b) squeezed onto one static screen limits puzzle/difficulty design space. Scoped as its own milestone (M2.5, not bundled into the D18 rendering change) since it touched certified M1/M2 physics-adjacent wiring. Resolved differently than originally planned: reviewing the interaction between wraparound and a zero-lerp follow camera found that wrapping the lander's position also instantly teleported the camera, cutting the whole visible world to an unrelated section with no panning — `wrapHorizontal` was removed entirely rather than merely retargeted to the world edge (see Milestone 2.5's amendment for the full reasoning). Horizontal position is now unbounded, symmetric with vertical.                                                                      |
| D20 | Content scale & gating | **Minimum 12 unique fictional worlds/moons, each with 1-3 landing bases (puzzles); progression is gated by _both_ mission completions (M9.5's `unlocks` graph, D17) _and_ ship/equipment upgrade tier (per-base `requirements`, §6b.2's `evaluateBaseFit`), not either alone**                          | Explicit content-scale instruction. Raises M5's starter-registry minimum from 4 to 12 worlds (see M5 below). The dual-gate model isn't new machinery — M9.5's `unlocks: string[]` graph (mission-gated) and §6b.2's `BaseRequirements` (`minTWR`/`handling`/`combat.*`, upgrade-gated) already exist independently; D20 makes explicit that a real base can, and at least some must, require _both_ at once (a story-gated base that's also mechanically out of reach without upgrades), so neither gate alone trivializes progression. **Storyline**: 12 worlds implies an actual narrative throughline ("why the player is going to each one"), not just a mechanical unlock graph — flagged as content to author during M5/M6 implementation, not fabricated speculatively in this planning pass; the existing named worked examples (Kessel's Reach, Verdalis, Pyrrhine Expanse, Glacian Drift, §9.5.7) remain valid as a subset, not a replacement for the full 12. |

## 3. Open Questions

- **Mobile/touch controls**: deferred (D6). Revisit if the game is played on
  touch devices in practice. Note this also means Lighthouse is deliberately
  run with the `desktop` preset (§5) — testing this app under Lighthouse's
  default mobile emulation would be testing a platform it doesn't target.
- **Flying far past the world's horizontal edge ends the flight off-camera**
  (Milestone 2.5): horizontal position is unbounded and the camera pins at
  its bounds-clamped scroll extreme once the lander passes the world edge,
  so a lander that keeps flying past that point (there's nothing stopping
  it) can eventually contact `getTerrainHeightAt`'s clamped-to-last-point
  terrain height entirely outside the visible camera view — landed/crashed
  with no on-screen feedback until the result text (fixed to the camera,
  not the world) appears. Rare in normal play (requires sustained one-
  directional thrust well past the last generated terrain point) and not
  a crash/error, just a poor look. Revisit once a real reason exists to
  design world-edge behavior on purpose (a hard wall, a mission boundary,
  M6's base-to-base travel model) rather than speculatively now.

## 4. Architecture Notes

### Custom physics core, not Phaser Arcade Physics

`src/game/physics/lander-physics.ts` and `src/game/flight/flight-state.ts`
implement gravity, thrust, fuel burn, and rotation as plain, framework-free
TypeScript — no Phaser `Arcade.Body` involved (horizontal wraparound was
part of this list from Milestone 2 through Milestone 2.5, then removed;
see Milestone 2.5's amendment for why). Phaser is
used purely for rendering (`Scene`, `GameObjects.Triangle`), input
(`KeyboardPlugin`), and scene lifecycle.

**Why**: Arcade Physics bodies are tightly coupled to a live `Phaser.Game`
instance, which needs a real (or `jsdom`-simulated) DOM/canvas to boot at all.
Testing that in Vitest would require `jsdom` or `happy-dom` plus a canvas
polyfill (e.g. the `canvas` npm package, which needs native compilation) —
fragile, slow, and an unjustified dependency for what the game actually
needs. A hand-rolled physics core is a handful of pure functions, trivially
unit-tested in plain Node, and precisely as accurate as the game requires
(this is an arcade game, not a physics sandbox).

### `FlightState`/`CelestialBody` — final shape (Milestone 5)

`FlightState` splits its inputs into two categories, per `FlightStateOptions`:

- **Ship-intrinsic** (`thrustAccel`, `rotationSpeedRadPerSec`,
  `fuelBurnRate`): global constants in `constants.ts` today, owned by
  Milestone 7's `ShipClass` once that milestone lands.
- **Body/environment** (`gravityAccel`, `dragCoefficient`, `hazard`):
  sourced from the selected `CelestialBody` (`src/game/planets/
celestial-body.ts`), not a constant. `dragCoefficient` is that body's
  `atmosphereDensity` passed through unchanged (same quantity, named for
  what it models on `CelestialBody` vs. how `atmosphericDrag` uses it).
  `hazard` is required, not optional — every call site must be explicit
  about environment status rather than relying on an implicit default.

`FlightState` derives two more fields once, at construction, from
`hazard` — not re-branched every `tick()`: `thrustEfficiency` (1 unless
a `cold` hazard is active) and `passiveFuelDrainRate` (0 unless a
`corrosive` hazard is active). Each `tick()` multiplies thrust by
`thrustEfficiency`, adds `atmosphericDrag(velocity, dragCoefficient)`
into the acceleration sum alongside gravity/thrust, and composes
`passiveFuelDrainRate` into the same `consumeFuel` call as the normal
thrust burn (one clamped subtraction, not two).

`CelestialBody` (`id`, `name`, `gravityAccel`, `atmosphereDensity`,
`hazard`, `terrainPalette`, `distance`) and its `Hazard` union
(`{type:'corrosive'; fuelDrainRate}` \| `{type:'cold';
thrustEfficiency}` \| `null`) live in `src/game/planets/
celestial-body.ts` — a Phaser-free pure-data module, architecturally
parallel to `physics/`/`flight/`/`terrain/`/`scoring/`/`persistence/`.
`src/game/planets/bodies.ts` exports `BODIES`, typed as a non-empty
tuple (`readonly [CelestialBody, ...CelestialBody[]]`) specifically so
`GameScene`'s `BODIES[0]` default-body fallback is statically known
non-`undefined` under this project's `noUncheckedIndexedAccess`.

### Paper-cutout art style — concrete rules

**Superseded by Decision D18** ("Ship-Forward / Atmospheric Depth", below) —
the flat-fill, no-gradient version of this style shipped in Milestones 1-2
and was explicitly rejected once real reference art entered the picture.
The rules below are what's actually live in `src/game/rendering/` today;
the struck-through bullets record what changed and why, so a future reader
doesn't wonder why `paper-shape.ts` looks nothing like this section once
described.

Every visual element follows the same construction, so the game reads as
one consistent style rather than a grab-bag of shapes:

- **Silhouette fills are gradient-shaded (top lighter, bottom darker) and
  carry a visible paper-grain texture — not flat vector color.** ~~No
  gradients, no blur/glow~~ superseded: every shape gets a two-color
  linear gradient (`fillTopColor`/`fillBottomColor`), consistent with a
  single implied light source shared with the background's moon/sun. Grain
  is unchanged in spirit (`src/game/rendering/paper-texture.ts`'s
  speckled-noise `CanvasTexture`, still no external image assets) but is
  now composited with `globalCompositeOperation: 'multiply'` over the
  gradient (the grain texture's opaque-white base would otherwise paint
  over the gradient with a flat rectangle) rather than applied via
  `TileSprite` + tint. Each shape's fill is baked once into its own
  `CanvasTexture` (`src/game/rendering/canvas-texture-utils.ts`'s
  `bakeCanvasTexture`, keyed and rebaked — not accumulated — so scene
  restarts and outcome recolors don't leak textures), clipped to the
  polygon path directly, replacing the old `TileSprite` +
  `createGeometryMask()` indirection. See `src/game/rendering/paper-shape.ts`.
- **Fine etched surface-texture strokes** (rock striations / hull panel
  lines / dune ripples / wave-lines / foliage clusters) are optionally
  baked into the same fill (`etchLineCount` for density, `etchStyle` for
  which material recipe — added Milestone 5, `paper-shape.ts`'s
  `ETCH_STYLE_CONFIGS`). Distinct per-world terrain materials
  (rock/sand/water/foliage) are keyed off each `CelestialBody`'s own
  `terrainPalette.etchStyle`, not one hard-coded scribble reused
  everywhere with only a palette swap. `etchStyle` defaults to `'rock'`
  (the original look, bit-for-bit) when omitted, so the lander's own
  hull-panel etch is unaffected.
- **A layered background sits behind the gameplay terrain**: sky gradient,
  a glowing moon/sun (baked radial gradient, `src/game/rendering/radial-glow.ts`),
  a seeded crisp starfield (`src/game/rendering/starfield.ts`, pure/unit-
  tested — stable across restarts, unlike gameplay terrain's per-attempt
  reseed), and a blurred, lower-contrast, desaturated far parallax ridge
  (`src/game/rendering/ridgeline.ts`, pure/unit-tested; blur via
  Canvas2D's `ctx.filter`, since Phaser 4.2.0 has no per-GameObject FX
  pipeline — confirmed against `node_modules/phaser/types/phaser.d.ts`,
  only camera-level `Filters.Blur` exists) — the atmospheric-perspective
  depth cue the approved direction is named for. Built by
  `src/game/rendering/background.ts`, called once from `GameScene.create()`.
- **A static engine-glow accent** at the lander's engine base (a baked
  radial-gradient image, part of the ship's own artwork) — deliberately
  not a thrust-reactive particle effect; dynamic thrust "juice" stays
  Milestone 13's scope.
- **Crisp bold outline** on every shape that represents a physical object
  (lander, terrain) — a stroke around the fill, like a cut paper edge.
  Unchanged.
- **Layered hard-edged drop shadows for depth on gameplay shapes**, not
  soft/blurred ones — an offset solid-color silhouette behind an element
  reads as "this piece of paper sits above that one." Unchanged for the
  terrain/pad/lander; the background's far ridge is the one deliberate
  exception (blurred, for atmospheric depth, not gameplay-shape depth).
- **Named palette in `constants.ts`**, not one-off hex literals per shape —
  keeps every layer's fill/stroke/shadow color intentional and reusable.
  Unchanged as a rule; the palette itself grew substantially (gradient
  pairs instead of single colors, plus the whole background palette).

### Three-tier test strategy

| Tier            | What it covers                                                                                                                  | Environment                 | Files                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------ |
| **Unit**        | Single pure-function correctness (vector math, fuel decay, world-bounds clamping)                                               | Plain Node                  | `src/**/*.test.ts`             |
| **Integration** | Multi-module orchestration — `FlightState` composing physics + fuel + rotation across many simulated frames                     | Plain Node                  | `src/**/*.integration.test.ts` |
| **E2E**         | The actual game, in a real browser: boots, canvas renders at the configured size, reaches `GameScene`, zero console/page errors | Chromium + Firefox + WebKit | `e2e/**/*.spec.ts`             |

There is no fourth "does Phaser render correctly" tier in Vitest — that would
duplicate what Playwright already verifies against a real browser, for the
cost of a fragile `jsdom`+`canvas` setup. Scene files
(`src/game/scenes/**`, `src/main.ts`) are therefore excluded from the Vitest
coverage gate (see `vitest.config.ts`) and rely on the e2e gate instead.

### Scene keys centralized

`src/game/scenes/scene-keys.ts` exports `SCENE_KEY_BOOT`/`SCENE_KEY_GAME` so
`BootScene`'s `this.scene.start(...)` call and `GameScene`'s own key can't
drift apart via a typo'd string literal in two different files.

### `window.__ORBITAL_DESCENT_GAME__`

`src/main.ts` assigns the booted `Phaser.Game` instance to
`window.__ORBITAL_DESCENT_GAME__` (declared in root `global.d.ts`, shared by
both the `tsconfig.app.json` and `tsconfig.node.json` TS programs so e2e
specs can reference it too). This is a genuine e2e test hook, not a debug
leftover: canvas pixel content isn't otherwise inspectable from outside
Phaser, and it holds no secrets, so shipping it is harmless. `GameScene`
also exposes its `outcome` ('flying'/'landed'/'crashed') via Phaser's own
per-scene `data` manager (`this.data.set('outcome', ...)`), the same
pattern for state that isn't otherwise DOM-observable — see
`e2e/landing.spec.ts`.

## 5. Research / Verification Notes

Every version below was checked against the live npm registry and, where it
mattered, against the installed package's actual `.d.ts` files or release
notes — not assumed from training data (this assistant's knowledge cutoff is
January 2026; the current date is well past that).

- **Phaser**: 3.x frozen at `3.90.0` (last publish 2025-05-23). 4.0.0 stable
  published 2026-04-10, now at `4.2.0` (2026-06-19). Confirmed via
  `npm view phaser time --json` and the v4.0.0 GitHub release notes.
- **Vitest**: pinned to `4.1.9`, not the newer `4.1.10`. `4.1.10` was
  published only ~10.6 hours before this install — pnpm 11's default
  `minimumReleaseAge` supply-chain gate (24h) flagged it and silently
  auto-added a bypass (`minimumReleaseAgeExclude`) to `pnpm-workspace.yaml`
  because the version was pinned exactly. Rather than rely on that bypass,
  stepped back to `4.1.9` (~3 weeks aged at install time) and deleted the
  generated exclude file. `@vitest/coverage-v8` must match the `vitest`
  version exactly (its own `peerDependencies` pins it), so it moved to
  `4.1.9` too.
- **`typescript-eslint`**: peer range `typescript >=4.8.4 <6.1.0` — this is
  why `typescript` is pinned to the exact `6.0.3`, not `^6.0.3`.
- **`esModuleInterop`**: Phaser's types declare `export = Phaser` (CJS-style).
  `import Phaser from 'phaser'` (used throughout) requires
  `esModuleInterop: true`, added to both `tsconfig.app.json` and
  `tsconfig.node.json`. Without it, every file importing Phaser fails to
  typecheck.
- **`@types/node`**: pinned to `26.1.0` — npm's `@types/node` `dist-tags`
  map a `ts6.0` tag to exactly this version, matching the pinned
  `typescript@6.0.3`.
- **ESLint `no-magic-numbers`**: verified directly against
  `node_modules/eslint/lib/rules/no-magic-numbers.js` rather than assumed —
  numeric literals that directly initialize a `const` declaration are exempt
  regardless of the `enforceConst` option; only literals used _inside_
  expressions need a named constant. This is why `constants.ts` can write
  `export const GRAVITY_ACCEL = 18;` directly but a derived expression like
  the degrees→radians conversion needed `DEGREES_PER_HALF_TURN` named
  explicitly.
- **`@typescript-eslint/dot-notation` vs `noPropertyAccessFromIndexSignature`**:
  these two conflict on `process.env.CI` (dot notation is idiomatic per
  ESLint's default, but the TS compiler option _requires_ bracket notation
  for index-signature-only properties). Resolved by setting
  `allowIndexSignaturePropertyAccess: true` on the ESLint rule rather than
  disabling either protection.
- **Lighthouse categories**: SEO gate intentionally omitted from
  `lighthouserc.json` assertions per this project's explicit instructions
  (Performance/Accessibility/Best-Practices only).
- **Lighthouse Performance was genuinely broken, not a sandbox artifact —
  root-caused and fixed, not just documented around.** First attempt (in
  this local sandbox) produced `performance: null` with every metric
  erroring `NO_FCP`/`NO_LCP`. Initially misdiagnosed as a GPU-constrained
  local sandbox limitation. That diagnosis was **wrong**: the identical
  failure reproduced identically on a completely independent machine
  (GitHub Actions' `ubuntu-latest` runner, back when this project briefly
  had a CI workflow — see Decision D9), which ruled out "local environment
  quirk" entirely. Inspecting the actual report JSON's `auditRefs` showed
  every Performance audit erroring `NO_LCP` — the real cause: `index.html`'s
  entire visible content was a `<canvas>`, and **canvas/WebGL painting is
  invisible to Largest Contentful Paint detection** (LCP only recognizes
  text nodes, `<img>`, video posters, or CSS `background-image` — never
  canvas). With zero other paintable DOM content, Chrome had no LCP
  candidate at all, and TBT/Interactive cascade-failed from that. **Fix**:
  `index.html` now ships a real static `<p id="loading-label">` text node
  inside `#app`, giving Lighthouse (and real users) a paint target before
  Phaser boots; `BootScene.create()` removes it once Phaser's canvas takes
  over (see `src/game/scenes/boot-scene.ts`). That alone raised the score
  from `NaN` to a real `0.7` — and surfaced a second, equally real issue:
  Cumulative Layout Shift of `0.425` (poor), because `#app` had no explicit
  size, so it grew from a small text box to the full 960×640 canvas box
  between frames. Giving `#app` a fixed `960px`×`640px` box from first paint
  (`src/style.css`) didn't fix it — CLS got slightly _worse_ (`0.539`) — and
  the `layout-shifts` audit's `boundingRect` (`left: -274`) revealed why:
  Lighthouse defaults to **mobile emulation** (~412px viewport), so a
  960px-wide desktop layout overflowed the emulated mobile viewport
  entirely, on a throttled mobile CPU/network profile. This game is
  desktop-only by Decision D6 — mobile emulation was testing a platform it
  was never built for. Setting `"preset": "desktop"` in `lighthouserc.json`
  (matching D6) fixed it for real: Performance `1.00`, Accessibility `1.00`,
  Best Practices `0.96`, all three runs, no assertion failures. Lesson
  encoded here so it isn't relearned: **when a measurement tool's default
  profile doesn't match the product's actual target platform, fix the
  tool's config to match the product — don't chase phantom performance
  problems the product doesn't actually have.**
- **`@secretlint/secretlint-rule-preset-recommend`**: referenced only by
  _id_ string inside `.secretlintrc.json`, not a JS import — `knip` can't see
  that usage statically, so it's listed in `knip.json`'s
  `ignoreDependencies` with this note as the paper trail for why it isn't
  dead weight.

## 6. Milestones

### Milestone 1 — Project Foundation + Flight Core

**Status: CERTIFIED** — no open caveats.

**Goal**: Establish the full production-grade toolchain and ship a real,
flyable (if terrain-less) lander: gravity, thrust, fuel, rotation, keyboard
input, rendered in a real booted Phaser game.

**Scope**: Repo scaffold, all quality-gate tooling, `constants.ts`,
`lander-physics.ts`, `flight-state.ts`, `BootScene`, `GameScene`, `main.ts`,
`index.html`.

**Files/areas affected**: entire repo (initial commit).

**Acceptance criteria**:

- Game boots in a real browser, canvas renders at 960×640, `GameScene`
  becomes active, zero console/page errors (verified — not assumed).
- Holding thrust produces net ascent; releasing it lets gravity win; fuel
  depletes while thrusting and gates thrust at zero; rotation changes the
  thrust direction; the lander wraps horizontally and rests on a temporary
  floor instead of falling through the world.

**Required tests**: 19 unit tests (`lander-physics.test.ts`), 7 integration
tests (`flight-state.integration.test.ts`), 1 e2e smoke test × 3 browsers.
All passing (see Certification Gates below).

**Certification gates** (all run for real, not assumed — commands and actual
output in this session):

| Gate                                     | Command                 | Result                                                                                                                                                                             |
| ---------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                                   | `pnpm format:check`     | ✅ pass                                                                                                                                                                            |
| Lint                                     | `pnpm lint`             | ✅ pass (0 problems)                                                                                                                                                               |
| Typecheck                                | `pnpm typecheck`        | ✅ pass                                                                                                                                                                            |
| Unit + integration + coverage            | `pnpm test:coverage`    | ✅ 26/26 tests, 100% stmts/branches/funcs/lines on the pure-logic scope (thresholds: 90/85/90/90)                                                                                  |
| Production build                         | `pnpm build`            | ✅ succeeds. Output: 359.50 KB gzip JS (Phaser itself) — flagged by Vite as a >500 KB chunk; tracked as a performance-budget risk, see §3 Open Questions                           |
| Dead code / unused exports / unused deps | `pnpm deadcode`         | ✅ pass (0 issues after fixing `knip.json`)                                                                                                                                        |
| Secret scan                              | `pnpm security:secrets` | ✅ pass                                                                                                                                                                            |
| Dependency audit                         | `pnpm security:audit`   | ✅ "No known vulnerabilities found"                                                                                                                                                |
| E2E (Chromium, Firefox, WebKit)          | `pnpm test:e2e`         | ✅ 3/3 passed, real browsers, real canvas, real boot                                                                                                                               |
| Lighthouse — Accessibility               | `pnpm lighthouse`       | ✅ **1.00** (≥0.90 required)                                                                                                                                                       |
| Lighthouse — Best Practices              | `pnpm lighthouse`       | ✅ **0.96** (≥0.90 required)                                                                                                                                                       |
| Lighthouse — Performance                 | `pnpm lighthouse`       | ✅ **1.00** (≥0.90 required) — see §5 for the real root cause (`NO_LCP` from canvas-only content, then a mobile-vs-desktop preset mismatch) and the fix, not just a passing number |

**Documentation updates**: this file, `README.md`, `CHANGELOG.md`,
`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` — all written
this milestone.

**Security checks**: no secrets in repo (scanned), no known dependency
vulnerabilities (audited), no backend/auth attack surface (none exists yet).

**Performance checks**: build succeeds; bundle-size warning noted and
tracked (Phaser itself, ~360 KB gzip — not a blocker at the current
Lighthouse score, but worth revisiting if the budget tightens); Lighthouse
Performance verified at 1.00 under the desktop preset (above, §5).

---

### Milestone 2 — Terrain & Landing

**Status: CERTIFIED** (2026-07-06).

**Goal**: Replace the Milestone 1 temporary floor with real procedurally
generated terrain, a landing pad, collision detection, and safe-landing vs.
crash determination.

**Scope delivered**:

- `src/game/terrain/terrain-generator.ts` — pure, seeded (Mulberry32 PRNG)
  bounded-random-walk heightmap generator with one flattened landing-pad
  segment; `getTerrainHeightAt` linear-interpolates height at any x.
- `src/game/terrain/landing.ts` — pure `isOnLandingPad` and `isSafeLanding`
  (speed + upright-angle thresholds, using the new `normalizeAngle` in
  `lander-physics.ts`).
- `src/game/physics/lander-physics.ts` — `applyWorldBounds`/`WorldBounds`
  (the M1 temporary floor) removed entirely, replaced by `wrapHorizontal`
  (horizontal-only) — ground contact is now a terrain-collision concern,
  not a flight-physics one (see §4 Architecture Notes). `FlightState` now
  free-falls vertically without limit; `GameScene` detects contact itself.
- `src/game/rendering/paper-texture.ts` + `paper-shape.ts` — the paper-cutout
  rendering implementation (procedural grain texture, masked textured fill,
  outline, hard offset shadow) per PLAN.md §4 — used for the lander,
  terrain, and landing pad, all as one reusable `createPaperShape` helper.
- `GameScene` rewired: generates terrain each session, renders it and the
  pad via `createPaperShape`, detects ground contact each frame against
  `getTerrainHeightAt`, resolves landed/crashed via `isOnLandingPad` +
  `isSafeLanding`, changes the lander's fill color and shows an outcome
  message, freezes further simulation, and restarts on R.

**Acceptance criteria**: met — lander collides with real terrain (not an
invisible floor); landing softly and level on the pad is distinguishable
from crashing (different fill color + outcome text); both states are
visibly different in-game.

**Tests**: 4 new unit tests for `wrapHorizontal`/`normalizeAngle` (replacing
the removed `applyWorldBounds` tests), 8 for `terrain-generator.ts`
(determinism given a seed, height band, max-step bound, pad flatness/
placement), 6 for `landing.ts` (pad boundaries, speed-as-vector-magnitude,
angle wraparound). One integration test replaced ("comes to rest on the
temporary floor" → "falls straight through where a fixed floor used to be
— ground contact is not [FlightState's] job", confirming the architecture
change is real, not just documented). Two Playwright e2e specs: the
existing boot smoke test, plus a new `e2e/landing.spec.ts` that lets
gravity alone carry the ship into real terrain with zero input and asserts
a genuine `landed`/`crashed` outcome — exercising the actual collision
system in three real browsers, not just checking the game boots.

**Certification gates** (all re-run for real after this milestone's changes):

| Gate                                                  | Result                                                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| format/lint/typecheck                                 | ✅ pass                                                                                                                                                         |
| unit + integration + coverage                         | ✅ 49 tests, 98.7% stmts / 87.87% branches / 100% funcs / 98.63% lines on the pure-logic scope (now includes `src/game/terrain/**`; thresholds 90/85/90/90 met) |
| production build                                      | ✅ (360.93 KB gzip JS — texture-generation code added ~1.4 KB gzip, no meaningful bundle-size change)                                                           |
| dead code / secrets / audit                           | ✅ clean                                                                                                                                                        |
| e2e — Chromium/Firefox/WebKit                         | ✅ 6/6 (boot smoke test + new landing-outcome test, both browsers × both specs)                                                                                 |
| Lighthouse — Performance/Accessibility/Best-Practices | ✅ all still pass under the desktop preset (§5) — the new canvas-texture generation and masked-sprite rendering didn't regress any of the three                 |

**Documentation updates**: this file, `CHANGELOG.md`.

**Security checks**: no change to attack surface (still no backend/auth).

**Performance checks**: build succeeds; bundle size essentially unchanged;
Lighthouse re-verified green.

**Amendment (Decision D18, art direction)**: `paper-shape.ts`'s fill
mechanism was reworked from flat-tinted `TileSprite` to a per-shape
gradient baked via `bakeCanvasTexture` (see §4), and a new background
layer (`src/game/rendering/background.ts` — sky, moon, starfield, far
ridge) was added behind the terrain. All of Milestone 2's own certified
behavior (collision, landed/crashed determination, restart) is unchanged;
only the _rendering_ of the already-certified shapes changed. Full gate
re-run after the change: format/lint/typecheck/test/coverage (65 tests,
98.92% stmts / 87.87% branches / 100% funcs / 98.85% lines) /deadcode/
security/build/e2e (6/6, three browsers) all green.

**Amendment (Decision D19, world scrolling)**: flagged during the D18 work
that the current model has no camera/world-scrolling concept at all —
`FlightState`'s `worldWidth` and the viewport's `GAME_WIDTH` are the same
number, so `wrapHorizontal` wraps at the _screen_ edge. Squeezing every
future base layout (§6b) onto one static 960×640 screen limits puzzle/
difficulty design space. Scoped as its own milestone rather than bundled
into the D18 rendering change, since it touches certified physics-adjacent
wiring — see Milestone 2.5 below.

**Amendment (Milestone 2.5 certification)**: `wrapHorizontal` — introduced
in this milestone's own certified scope above, replacing `applyWorldBounds`
— was **removed entirely** in Milestone 2.5, not merely retargeted to wrap
at the world edge as originally planned. Pairing wraparound with a real
follow camera surfaced a genuine bug: the instant a wrap fired, the camera
(correctly tracking the lander's now-teleported position) cut the whole
visible world to an unrelated section with no panning in between. Horizontal
position is now unbounded, matching vertical (already unbounded since this
milestone). `FlightState`'s `worldWidth` constructor option was removed
along with it, since nothing calls `wrapHorizontal` anymore. This is a
correction to this milestone's own historical record, not a new decision —
recorded here rather than silently editing the certified scope above, per
this file's own policy (line 3-5) that stale entries are corrected, not
left to rot.

---

### Milestone 2.5 — World Scrolling & Parallax Depth

**Status: CERTIFIED** (2026-07-06).

**Goal**: Replace the single-screen world model (world width == viewport
width) with a real scrolling world: a camera that follows the lander over
a world several screens wide, with every D18 background layer moving at
its own parallax speed — motion depth, not just the static layered/blurred
depth D18 shipped. Also directly answers the "not enough depth" review
note on D18's real screenshots: a new midground ridge layer fills the gap
between the far ridge and the gameplay terrain.

**Why this order, before M3 (Start Screen & Game Flow)**: M3 builds the
pause/result-screen flow around `GameScene`; doing that against a camera
that doesn't yet move (and would need retrofitting once M2.5 lands) risks
the same kind of retrofit D18 already had to do once for the art style.

**Scope delivered**:

- `src/game/constants.ts` — `WORLD_WIDTH_MULTIPLIER` (module-private, a
  single global ratio for now; §6b/M6 may later want a per-base world
  width once real base layouts exist, but that's a future refinement, not
  blocked by this milestone's global default) and `WORLD_WIDTH = GAME_WIDTH
  - WORLD_WIDTH_MULTIPLIER`. `TERRAIN_SEGMENTS`/`STAR_COUNT`/
`FAR_RIDGE_SEGMENTS`each rewritten as a`_\_PER_SCREEN`base constant
times the multiplier (a bare literal inside a multiplication trips this
project's`no-magic-numbers`ESLint rule differently than a lone literal
assignment does — every base needed its own name), pinned by a new`constants.test.ts`against silent operator typos (e.g.`+`instead of`_`). New `MID_RIDGE__`constants (same shape as`FAR_RIDGE__`) and
`SKY_SCROLL_FACTOR`/`FAR_RIDGE_SCROLL_FACTOR`/`MID_RIDGE_SCROLL_FACTOR`,
each strictly less than 1 and strictly greater than the plane behind it.
`LANDER_START_X`moved from`GAME_WIDTH / 2`to`WORLD_WIDTH / 2` — the
    lander spawns at the world's center, not the initial viewport's.
- `src/game/scenes/game-scene.ts` — `generateTerrain` called with
  `WORLD_WIDTH` instead of `GAME_WIDTH`; `this.cameras.main.setBounds(0, 0,
WORLD_WIDTH, GAME_HEIGHT)` and `.startFollow(this.lander.container,
true)` (roundPixels, to avoid sub-pixel texture shimmer — no deadzone/
  lerp smoothing, since a lander game needs the camera locked precisely
  to the ship for landing judgment, not a cinematic lag). Every HUD text
  element gets `.setScrollFactor(0)` — previously irrelevant since the
  camera never moved, now required so HUD stays screen-fixed instead of
  scrolling off with the world.
- `src/game/rendering/background.ts` — every layer's texture widened to
  `WORLD_WIDTH` (positioned from world x=0) instead of `GAME_WIDTH`, so
  parallax scrolling never runs off the end of a too-narrow background;
  the moon and starfield are the deliberate exception — the moon (a single
  discrete feature) stays positioned relative to `GAME_WIDTH` so it sits
  in view from the start and drifts only slightly via its own low scroll
  factor, while the starfield's generation width did move to `WORLD_WIDTH`
  since stars are scattered across the whole world, not a single feature.
  Each layer gets its own `setScrollFactor()`: sky/moon/stars slowest
  (nearly static — the most distant plane), far ridge faster, new mid
  ridge faster still, gameplay terrain/lander/pad unchanged at the
  implicit default (`scrollFactor` 1 — no named constant needed for a
  value that's just "the default, unmodified"). A shared `buildRidgeLayer`
  helper replaced two near-duplicate bake-and-place blocks once the mid
  ridge layer existed alongside the far ridge.
- **New midground ridge layer**: a second parallax silhouette between the
  existing far ridge and the gameplay terrain — less blurred, higher
  contrast/saturation than the far ridge, closer to the terrain's own
  palette, generated the same way as the far ridge (`generateRidgeline`
  with its own seed/height-band constants).
- **Horizontal wraparound removed** (found by adversarial review, not
  planned at milestone start): the original plan was to keep
  `wrapHorizontal` and just retarget it to wrap at the true `WORLD_WIDTH`
  edge instead of the old screen edge. Reviewing the actual interaction
  with the new zero-lerp follow camera surfaced a real bug — the instant
  a wrap fired, the lander's position (and therefore the camera, which
  tracks it exactly) would jump the full bounds-clamped distance in a
  single frame, cutting the entire visible world to a totally different,
  unrelated section with no panning in between. Camera-smoothing the cut
  would be dishonest (the ship genuinely isn't between those two points,
  there's nothing real to interpolate through) — the actual fix is that
  wrapping itself stopped making sense once the world is wider than one
  screen. Resolved: `wrapHorizontal` deleted from `lander-physics.ts`
  (and its dedicated unit tests), `FlightState`'s `worldWidth` option
  removed entirely (it had no remaining purpose once nothing calls
  `wrapHorizontal`), `game-scene.ts`'s `FlightState` construction updated
  to match. Horizontal position is now unbounded, symmetric with vertical
  (already unbounded since Milestone 2) — the camera stays pinned at its
  bounds-clamped scroll extreme while the ship can keep flying past the
  edge, landing on `getTerrainHeightAt`'s existing clamp-to-last-point
  behavior rather than a hard wall. See §3 Open Questions for the one
  known rough edge this leaves (a ship that flies far enough past the
  edge can end its flight off-camera).

**Acceptance criteria**: met — the lander can travel arbitrarily far
past the old single-screen width with no wraparound (verified: e2e and
integration tests confirm position keeps climbing past `GAME_WIDTH`, and
manual flight to ~4000px past spawn showed smooth camera pinning at the
bounds, not a teleport); the camera is bounded to and centered on the
lander from the first frame (e2e-verified deterministically, not via
timing-dependent simulated flight — see Required tests) and continues to
track it exactly during flight (e2e-verified via a position-derived
invariant check, not a lerp-tolerant threshold); every background layer
scrolls at its own named factor, strictly ordered by depth (e2e-verified
against the actual constants, not just "some factor less than 1"); HUD
text stays fixed on screen regardless of camera position (e2e-verified).

**Required tests**: `constants.test.ts` (new) pins the derived
`WORLD_WIDTH`/`TERRAIN_SEGMENTS`/`STAR_COUNT`/`FAR_RIDGE_SEGMENTS`/
`MID_RIDGE_SEGMENTS` values against hand-computed expectations.
`e2e/world-scrolling.spec.ts` (new, 4 tests): camera bounds/centering +
terrain spans the true world width (deterministic, boot-time only); every
background layer's `scrollFactorX` matches its named constant, strictly
ordered by depth; HUD `scrollFactorX/Y` are exactly 0; camera continuously
tracks the lander during real flight via a position-derived invariant
sampled after a fixed wait, not a "wait until scrollX changes by N"
threshold — the threshold-based version was tried first and proved flaky
under parallel test-worker contention (Chromium and Firefox each failed a
run of it at different times, even at a 30s timeout, pointing to
environmental delta-time variance under load rather than a logic bug).
`flight-state.integration.test.ts`'s wraparound test replaced with one
confirming sustained unbounded horizontal drift instead.

**Required quality gates**: full gate list — green (68 unit/integration
tests, up from 63 after removing 4 wraparound-specific tests and adding
`constants.test.ts`'s 5; e2e 18/18 across Chromium/Firefox/WebKit,
confirmed stable across 3 consecutive full runs).

**Required documentation updates**: this file, `CHANGELOG.md`.

**Certification checklist**: certified. Depended on Milestone 2.

---

### Infrastructure — Publish to GitHub

**Status: CERTIFIED** (2026-07-06).

**Goal**: Resolved per Decision D5 — no live hosting/deployment. The
deliverable is the source repository itself, published publicly on GitHub.
(Not part of the numbered gameplay roadmap below — a one-time setup step,
done between Milestones 1 and 2.)

**Scope**: `git init`, initial commit, `gh repo create`, push to
`github.com/RandyNorthrup/orbital-descent` (public), later `gh repo rename`
for Decision D10. No deploy step — there's nothing to deploy to. No CI
either, per Decision D9: GitHub is code storage only.

**Acceptance criteria**: repository is public and reachable at
`github.com/RandyNorthrup/orbital-descent`.

**Certification checklist**: repo created, pushed, and later renamed. A
GitHub Actions workflow existed briefly between the first and second
pushes and confirmed green for real (`gh run watch`, run `28814773214`) —
Quality gates, End-to-end tests, and Lighthouse all passed, not just
assumed from the local run. That workflow caught a real Lighthouse
Performance bug on its first run (`28812884097`, see §5) that a
local-only check on this one machine couldn't have ruled out as
environment-specific — genuinely useful before it was removed per D9. It
has since been deleted; quality gates are now run locally before each
push instead.

---

## 6a. Gameplay Roadmap (Milestones 3+)

Scope grew substantially in this session (Decisions D11-D17): from a
single-world lander into a landing-and-combat game across multiple
fictional worlds, with a ship roster, upgrades, an economy, obstacles,
hostiles, and achievements. This table sequences that full scope by
dependency. **Nothing below is implemented yet** — each milestone stays
"not started" until its own section says CERTIFIED. This ordering is a
recommendation, not a mandate — re-sequence it (and tell me) once M3 ships
and the game is actually playable end-to-end, if priorities differ.

| #    | Milestone                         | Depends on       | One-line goal                                                                                                                                                                                                                                                                          |
| ---- | --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2.5 | World Scrolling & Parallax Depth  | M2               | Camera-follow over a world wider than the viewport (Decision D19); real motion-parallax scroll factors on every D18 background layer, plus a new midground ridge layer for a fuller depth stack.                                                                                       |
| M3   | Start Screen & Game Flow          | M2.5             | Menu, start button, settings stub, pause, landed/crashed result screen, restart — replaces M2's placeholder restart-on-R.                                                                                                                                                              |
| M4   | Scoring & High Scores             | M3               | Score formula + `localStorage` high scores (Decision D8).                                                                                                                                                                                                                              |
| M5   | Fictional Celestial Bodies        | M2.5             | Generalize gravity/terrain into a per-world config; first multi-world variation (Decision D11: gravity, atmosphere drag, one hazard type per world).                                                                                                                                   |
| M6   | Planetary Browser (World Map)     | M5, M3           | Discovered vs. locked worlds, per-world multiple landing bases, progression unlocks farther worlds/bases (Decision D17).                                                                                                                                                               |
| M7   | Ship Roster                       | M3               | 5 starter ships + unlockable ships (Decision D13), each with distinct mass/thrust/fuel-capacity/handling.                                                                                                                                                                              |
| M8   | Economy & Store                   | M4, M7           | Fictional currency earned per completed mission; store UI to spend it (Decision D15).                                                                                                                                                                                                  |
| M9   | Ship Upgrades & Equipment Loadout | M8               | Permanent stat upgrades + slotted/cycled/triggered weapons and utility items, each adding mass (Decision D14).                                                                                                                                                                         |
| M9.5 | Mission & Cargo Delivery System   | M6, M8, M9       | Missions become real objects (not "land safely" alone): cargo (troops/supplies) sharing M9's mass budget, three mission structures (single-trip, timed multi-trip, relay), two narrative flavors (establish presence / resupply) tied to M6's base progression and M12's achievements. |
| M10  | Obstacles & Hazardous Conditions  | M5               | Static obstacles and per-world environmental conditions beyond atmosphere.                                                                                                                                                                                                             |
| M11  | Weapons & Combat                  | M9, M10          | Firing weapons to clear obstacles and fight local hostile inhabitants/enemy ships (Decision D12 — landing + active combat, not open-ended).                                                                                                                                            |
| M12  | Achievements & Notifications      | M4, M9.5         | Achievement definitions + toast notifications (Decision D16), implementing the five triggers M9.5 already specifies.                                                                                                                                                                   |
| M13  | Audio, Juice & Accessibility Pass | all of the above | Sound, particles, screen shake, full accessibility pass — deliberately last, since it polishes systems that need to exist first.                                                                                                                                                       |

**Core gameplay loop, once M9-M11 land**: the pilot juggles three
concurrent systems every mission — flight control (thrust/rotation/fuel,
M1-M2), the weapon system (cycle + trigger, M9/M11), and the buff/utility
system (cycle + trigger non-combat items, M9) — and every equipped
weapon/buff adds mass that degrades thrust-to-weight (M9; a distinct
handling axis, affected by specific handling-bonus items rather than mass
directly — see §6b.1/§6b.2). Beating a given base
means choosing a loadout that fits _that_ base's obstacles, hostiles, and
environmental conditions (M10), then executing flight + combat together,
not managing them as separate phases. This is the design goal that
threads M9 through M11 together — restated here because it's the point
of the whole equipment system, not just a mechanical detail.

---

## 6b. Base Design & Puzzle System

This section is the single specification for "base as puzzle" referenced informally
in the M3+ roadmap's Core Gameplay Loop note. It defines one data model — the
`Base` record — that Milestones 6, 9, 10, and 11 all read from and extend,
instead of each milestone inventing its own parallel notion of "what a landing
site demands of the player." It does not introduce a new milestone (see §6b.3
for the justification); it amends the scope of M6, and is extended in turn by
M9/M10/M11 as those milestones' own systems come online.

All illustrative numbers in this section use the game's **real, already-
certified units** — px and px/s² matching `src/game/constants.ts`'s
`GRAVITY_ACCEL = 18`, `THRUST_ACCEL = 46`, `ROTATION_SPEED_DEG = 150`,
`MAX_FUEL = 100`, `FUEL_BURN_RATE = 18`, `LANDER_RADIUS = 14` (28px diameter),
`TERRAIN_SEGMENTS = 40` (24px/segment at `GAME_WIDTH = 960`),
`LANDING_PAD_SEGMENT_COUNT = 3`, `LANDING_MAX_SAFE_SPEED = 60`,
`LANDING_MAX_SAFE_ANGLE_DEG = 15` — not an abstract "units/s²" scale
disconnected from what M1/M2 actually shipped. See §6b.6, item 1, for why this
matters and what it corrects.

---

### 6b.1 Puzzle archetype taxonomy + pacing model

Every base places the player in front of a small set of _binding constraints_.
The taxonomy below groups these by which of the three axes (mechanical,
spatial, combat) is the bottleneck, plus a fourth "composite" family that only
emerges once a base combines axes — which is precisely how pacing works: early
bases are single-axis, later bases recombine axes the player has already
individually learned.

#### Mechanical axis (gravity / drag / hazard — fed by M5, extended by M10's non-atmosphere conditions)

| Archetype                                                                                                 | Binding stat interaction                                                                                                  | Countermeasure                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fuel-margin puzzle**                                                                                    | High `gravityAccel` × descent distance vs. low fuel capacity / high burn rate                                             | Fuel-efficient ship class, `Fuel Tank` item, `Extended Fuel Cells` permanent upgrade                                                                    |
| **Thrust-to-weight squeeze**                                                                              | High `gravityAccel` vs. heavy ship + loadout mass                                                                         | Lighter ship class, `Lighter Hull Alloy` upgrade, a leaner loadout                                                                                      |
| **Corrosive drain puzzle**                                                                                | `hazard.type === 'corrosive'`: continuous `fuelDrainRate` accrues over wall-clock mission time regardless of thrust state | `Corrosion Coating` item (negates drain) **or** a fast, skillful completion (drain is time-based, not thrust-based — a genuine gear/skill substitution) |
| **Cold penalty puzzle**                                                                                   | `hazard.type === 'cold'`: multiplicative `thrustEfficiency < 1` on all thrust, compounding with the TWR-squeeze archetype | `Thermal Lining` item (restores 1.0×) and/or `Stronger Engines` upgrade to absorb the multiplier                                                        |
| **Environmental-condition puzzle** (M10's "beyond atmosphere" conditions — wind push, reduced visibility) | Perturbs the flight-model math itself (an added lateral force term, a reduced effective reaction time)                    | Handling/thrust headroom, same countermeasures as the squeeze archetype                                                                                 |

Classification rule (resolves a real ambiguity across the source proposals,
see §6b.6 item 4): a per-world condition is **mechanical** if it changes a
term in the flight-model equations (gravity, drag, thrust efficiency, fuel
drain, wind force), and **spatial** if it changes the geometry the ship must
navigate (pad width, obstacle placement, terrain shape). M10's own scope text
groups "wind gusts" under the same bullet as "static obstacles," but they are
mechanically two different axes and must be tagged as such on every `Base`
record — wind is mechanical, spires are spatial.

#### Spatial axis (terrain/obstacle geometry — fed by M2, extended by M10)

| Archetype                                                 | Binding geometry                                                                                                | Note                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Precision-margin** (narrow pad / plateau-cliff)         | `padWidthPx` vs. lander diameter (28px); a plateau pad has no forgiving slope on overshoot, unlike a valley pad | Pure geometry — no ship stat changes the pad-width-to-diameter ratio        |
| **Approach-vector gate** (flanking spires / ceiling gate) | The narrowest obstacle-free horizontal or vertical gap on the route to the pad, independent of pad width itself | Forces an early commitment to a lateral position, not a late correction     |
| **Blind-corridor / route-choice**                         | Asymmetric obstacle layout offering exactly one clean lane                                                      | Tests recognition of the _correct_ side, not raw precision                  |
| **Sequential gates / slalom**                             | Multiple gates/obstacles at different x/altitude offsets along one corridor                                     | Tests sustained control across a whole descent, not one save-or-fail moment |
| **Decoy field**                                           | More than one terrain run is flattened pad-like; only one is `landingPad`                                       | Pure recognition puzzle, independent of piloting skill                      |

Obstacles (M10) sit on top of the existing single-valued heightmap as an
**independent geometric layer** — an axis-aligned box with its own x/y range —
because a heightmap spike can only raise the local floor, it cannot represent
"fly past below/beside." See §6b.2 for the merged `Obstacle` type.

#### Combat axis (hostiles/enemy ships — fed by M11)

| Archetype                        | Binding stat                                                                                                                                     | Losing trait                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Swarm (throughput)**           | Kills-per-second vs. total incoming hostile count within the clear window                                                                        | High damage/slot but low fire rate — overkill per kill, not enough shots land in time             |
| **Bruiser (penetration)**        | `damagePerHit − armorRating`; a weapon whose damage doesn't clear the armor floor deals **zero** effective damage, a hard fail, not a slow grind | Fast, weak weapons are mechanically incapable, not merely inefficient                             |
| **Ace (survivability)**          | Ship's effective HP (hull + shield) vs. the hostile's alpha-strike damage; weapon choice is nearly irrelevant                                    | Zero shield + thin hull = certain death in one hit regardless of weapon                           |
| **Mandatory-clear obstacle**     | Minimum damage/splash to clear at all, not DPS or timing                                                                                         | Overkill weapons waste mass for zero extra benefit — obstacles don't fight back                   |
| **Zero-combat trap**             | No hostiles, no mandatory-clear obstacle                                                                                                         | _Any_ equipped weapon/shield is pure dead mass — strictly worse thrust-to-weight for zero benefit |
| **Positional / kinematic-match** | Projectile speed/range vs. a fast erratic mover's exposure window                                                                                | A high-damage, slow-projectile weapon simply can't lead the target                                |

#### Composite archetypes (only emerge once two+ axes combine)

- **Slot-budget / opportunity-cost** — a base demands more simultaneous
  countermeasures than the ship's equipment-slot count (M7) can carry at once;
  raw stat quality is inversely correlated with slot count across the roster,
  so _every_ ship class can attempt the base, but at a different opportunity
  cost.
- **Compound/stacked hazard** — two-plus single-axis archetypes overlap on one
  base; no single fix clears every constraint, forcing a genuine
  multi-attribute loadout (a permanent upgrade **and** an item **and** a ship
  choice, together).
- **Over-equipping / restraint** — a base needs _less_ than the player
  habitually brings; the correct move is subtractive (un-equip), not
  additive.
- **Capstone-balanced** — a deliberate, explicitly-flagged all-three-axes
  spike, reserved for world capstones (see §6b.4's anti-spike rule and its one
  named exception).

#### Pacing model (how archetypes sequence across the unlock order)

1. **One new axis at a time on the critical path.** A base introduces at most
   one archetype the player hasn't seen before; recombination happens only
   after each ingredient has been individually cleared elsewhere.
2. **Severity per axis rises by at most one step between consecutive
   critical-path bases**, matched against a reward/price schedule that grows
   at least as fast (§6b.4).
3. **The one deliberate exception is the world capstone** — an explicitly
   `capstone-balanced`-tagged base allowed to spike all three axes at once,
   flagged distinctly in the UI (see §6b.4) precisely because it is the
   exception, not a routine step.

---

### 6b.2 Data model: the `Base` record

New module: `src/game/bases/base.ts` (owned by M6, fields populated
incrementally as M9/M10/M11 land — same "declare the shape now, populate later"
pattern M5 already uses for ship-intrinsic stats owned by M7). This ownership
covers `base.ts`/`bases.ts`/`difficulty.ts` only — `fit-check.ts`, introduced
later in this subsection, is owned by **M9**, not M6; see §6b.3 point 4 for
why.

```ts
// src/game/bases/base.ts

import type { CelestialBody } from '../planets/celestial-body'; // M5
import type { GenerateTerrainOptions, Terrain } from '../terrain/terrain-generator'; // M2, extended M10

/**
 * Defined here, not imported from M11's combat module — Base needs this
 * type from M6's first line of code (the `encounters` field below), and a
 * type-only import of a file that doesn't exist until M11 (roadmap
 * position 10, four milestones after M6) is a real compile failure, not a
 * "populate later" deferral (that pattern only works for *values*, e.g.
 * `encounters: []`, not for the *type* of the field). M11's own
 * `src/game/combat/encounter.ts`/`combatant.ts` import these types from
 * here (a backward reference, since M11 is built after M6) and are where
 * real `CombatantDefinition`/`EncounterSpec` *instances* get authored and
 * where movement/attack/damage resolution actually runs — this file only
 * owns the shape.
 */
export interface CombatantDefinition {
  readonly id: string;
  readonly health: number;
  readonly armorRating: number; // effectiveDamage = max(0, hit.damage - armorRating)
  readonly contactDamage: number;
  readonly attack: { damagePerHit: number; cooldownMs: number; range: number } | null;
  readonly movement:
    | { kind: 'static' }
    | { kind: 'homing'; speed: number; turnRateDegPerSec: number }
    | { kind: 'diveStrafe'; speed: number; diveAltitude: number };
}

export interface EncounterSpec {
  readonly id: string;
  readonly combatants: readonly { definition: CombatantDefinition; count: number }[];
  readonly clearWindowMs: number;
  readonly triggerAltitude: number;
  readonly seed: number;
}

export type LoadoutTag =
  | 'fuel-efficient'
  | 'high-thrust'
  | 'lightweight'
  | 'corrosion-resistant'
  | 'cold-hardened'
  | 'high-handling'
  | 'combat-capable';

export interface TWRBand {
  readonly hardFloor: number; // e.g. 1.05 — below this, UI flags "not completable"
  readonly comfortable: number; // e.g. 1.30 — at/above this, no warning shown
  // between the two = "risky": flyable by a skilled pilot, a soft warning, never a hard block
}

export interface HandlingBand {
  readonly hardFloor: number; // deg/s — below this, threading the gate/pad is not completable
  readonly comfortable: number; // deg/s — at/above this, no warning shown
}

export interface BaseRequirements {
  readonly minTWR: TWRBand;
  /** null = this base places no spatial precision demand beyond the default pad width. */
  readonly handling: HandlingBand | null;
  /** Soft hints — surfaced in the loadout-select UI, never a hard gate on their own
   * (the underlying fuel-margin/TWR/handling/combat checks are the hard gates). */
  readonly hazardCounterTags: readonly LoadoutTag[];
  readonly recommendedTags: readonly LoadoutTag[];
  readonly combat: {
    /** UI hint precomputed from this base's own encounter data: the tier below
     * which every equipped weapon deals zero effective damage against the
     * base's toughest combatant (the armor-floor math, same as the "Bruiser"
     * archetype). Lets the loadout-select UI pre-filter obviously-doomed
     * choices, but `evaluateBaseFit`'s simulated combat branch — not this
     * number — is what actually gates pass/fail at play-time. 0 = no weapon
     * required at all (obstacle-avoidable or zero-combat base). Enforced as
     * a hard gate. */
    readonly minWeaponTier: 0 | 1 | 2 | 3;
    /** Soft, UI-only recommendation — surfaced as a warning in the loadout
     * screen, never enforced as a gate (unlike `minWeaponTier` above). */
    readonly minShieldTier: 0 | 1 | 2;
  };
}

export interface BaseDifficultyProfile {
  /** Each axis independently 0-10. `spatial`/`combat` default to 0 until
   * M10/M11 populate real obstacle/encounter data for a given base — the
   * world-map UI hides a zero-value axis badge rather than fake one. */
  readonly axes: { readonly mechanical: number; readonly spatial: number; readonly combat: number };
  readonly dominant: 'tutorial' | 'mechanical' | 'spatial' | 'combat' | 'capstone-balanced';
  /** dominant === 'mechanical' | 'spatial' | 'combat': 1.0×dominantAxisScore + 0.4×(sum of the
   *  other two). dominant === 'tutorial': a UI display label only, not a fourth axis — every
   *  tutorial base's one nonzero axis is mechanical by construction (a base with no obstacles
   *  or encounters can't be spatial- or combat-dominant), so the formula is applied identically
   *  to dominant === 'mechanical'; the distinct label exists purely so the world-map UI can
   *  suppress the difficulty badge on introductory bases instead of rendering a misleadingly
   *  precise "1". dominant === 'capstone-balanced': 0.7×(sum of all three) — see §6b.4. */
  readonly budget: number;
}

export interface Base {
  readonly id: string;
  readonly name: string;
  readonly worldId: string; // CelestialBody.id (M5)
  readonly order: number; // position within the world's base-select list (M6, Decision D17)

  /** M2's existing generator options, extended by M10 with optional
   * padStartIndexOverride / terrainOverrides / obstacles fields — every
   * field added by M10 is optional so a Base authored at M6 time (before
   * M10 exists) keeps compiling and behaving identically. */
  readonly terrainOptions: GenerateTerrainOptions;

  /** Always an array, never undefined — empty until M11 ships, and empty
   * is itself meaningful (the zero-combat-trap archetype, §6b.1). */
  readonly encounters: readonly EncounterSpec[];

  readonly requirements: BaseRequirements;
  readonly difficulty: BaseDifficultyProfile;

  /** First-clear reward (M8). Replay reward is a separate, always-nonzero
   * derived value — see §6b.4's replayability guard. */
  readonly firstClearCredits: number;

  /** Added by Milestone 9.5's design pass (§9.5.4), on this same record —
   * not a separate `BaseConfig` type — so there is exactly one authoring
   * surface, per this section's own stated principle. Status is a
   * three-state machine, not binary discovered/locked: */
  readonly status: 'locked' | 'discovered-unclaimed' | 'established';
  /** True for bases on the critical path to farther worlds/bases — used
   * by §6b.4's anti-spike soft-lock guard, which only applies its budget
   * ceiling to critical-path bases. */
  readonly isCriticalPath: boolean;
  /** Base ids that flip `locked → discovered-unclaimed` once *this* base
   * reaches `established` (Milestone 9.5 §9.5.4). */
  readonly unlocks: readonly string[];
  /** Same-world distance (in Transit Units, TU) from that world's
   * reference point — used by Milestone 9.5's relay-distance formula
   * (§9.5.6) for same-world legs only; cross-world legs use
   * `CelestialBody.distance` instead. */
  readonly localOffset: number;
}
```

**Merged `Obstacle` type** (resolves a real duplication between the spatial
and combat proposals — see §6b.6 item 3). Lives in `terrain-generator.ts`
(M10 extension), collision in a new `src/game/terrain/obstacles.ts` mirroring
`landing.ts`'s pure, dependency-free style:

```ts
export type ObstacleKind = 'spire' | 'debris';

export interface Obstacle {
  readonly kind: ObstacleKind;
  readonly xStart: number;
  readonly xEnd: number;
  readonly yTop: number; // smaller y = higher (Phaser y-down)
  readonly yBottom: number;
  /** Absent = a pure flight hazard (crash on contact, unconditionally).
   * Present once M11 ships = combat-clearable: effective damage against it
   * is max(0, hit.damage - armorRating); cleared once its own health (not
   * modeled here — see EncounterSpec) reaches zero. One shape serves both
   * "M10 ships obstacles as pure hazards first" and "M11 makes some of them
   * clearable," per M10's own acceptance-criteria note that this sequencing
   * is expected. */
  readonly armorRating?: number;
  readonly cleared?: boolean;
}

export function isCollidingWithObstacle(
  position: { x: number; y: number },
  radius: number,
  obstacle: Obstacle,
): boolean {
  const closestX = Math.min(Math.max(position.x, obstacle.xStart), obstacle.xEnd);
  const closestY = Math.min(Math.max(position.y, obstacle.yTop), obstacle.yBottom);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  return dx * dx + dy * dy <= radius * radius && !(obstacle.cleared ?? false);
}
```

`GenerateTerrainOptions` gains (M10, all optional, preserving every existing
M2 test's `BASE_OPTIONS` unchanged):

```ts
readonly padStartIndexOverride?: number;                              // curated bases pin the pad
readonly terrainOverrides?: readonly { index: number; y: number }[];  // authored cliffs/plateaus
readonly obstacles?: readonly Obstacle[];                             // fixed, curated obstacle set
```

Randomized obstacle placement (for endless/procedural bases, out of scope for
curated story bases) continues drawing from the _same_ seeded PRNG stream that
already produces heights and pad index, strictly after pad placement — this
is the only way to keep the existing "deterministic given a seed" guarantee
extending cleanly to obstacles.

**Encounter spec** — `CombatantDefinition` and `EncounterSpec` are defined
above in `src/game/bases/base.ts` (M6), not here, precisely to avoid M6
importing a type from a file M11 hasn't built yet (see the comment on
those interfaces for the full reasoning). `src/game/combat/encounter.ts`
and `src/game/combat/combatant.ts` (M11) import both types from
`../bases/base` and are where real instances get authored and where
movement/attack/damage resolution actually runs against them.

**The three per-axis evaluators, composed behind one facade** — owned by
**M9**, not M6 (its signature needs `ShipClass` from M7 and M9's own
`PermanentUpgrade`/`EquipmentItem` types, none of which exist at M6's point in
the build sequence; see §6b.3 point 4). This is the load-bearing design
decision resolving §6b.6 item 5 (three uncoordinated "is this good enough"
checks would drift):

```ts
// src/game/bases/fit-check.ts — pure, no Phaser, unit-testable like everything else in this repo

export interface BaseFitResult {
  readonly twr: number;
  readonly twrBand: 'impossible' | 'risky' | 'comfortable';
  readonly fuelMarginRatio: number;
  readonly handlingBand: 'impossible' | 'risky' | 'comfortable' | 'not-applicable';
  readonly combatOutcome: { cleared: boolean; hullRemaining: number } | 'not-applicable';
  readonly warnings: readonly string[];
}

export function evaluateBaseFit(
  ship: ShipClass, // M7
  upgrades: readonly PermanentUpgrade[], // M9
  loadout: readonly EquipmentItem[], // M9
  body: CelestialBody, // M5
  base: Base, // this section
): BaseFitResult {
  // 1. mechanical: effectiveMass, engineForce/effectiveMass -> TWR; fuel-needed vs.
  //    fuel-available including any corrosive drain over the base's par time. A real
  //    implementation runs this through the same per-tick integrator FlightState /
  //    atmosphericDrag(velocity, dragCoefficient) (M5) already use for actual flight,
  //    rather than the closed-form px/s-equivalent estimate used for illustration in
  //    §6b.5 — see the note after Base 5's worked check for why the two diverge.
  // 2. spatial: ship's effective handling (base + item bonuses) vs. base.requirements.handling.
  // 3. combat: base.encounters.length === 0 ? 'not-applicable' : simulateEncounter(...) (M11).
  // BaseRequirements' authored thresholds (minTWR, handling, combat.minWeaponTier/
  // minShieldTier) are this function's *inputs*, not a competing verdict — evaluateBaseFit
  // is the only place that computes pass/fail from them, at both play-time and design-time.
}
```

This is consumed by M9's already-scoped pre-mission loadout screen (live
warnings before launch) and reused headlessly by a per-base test-fixture
suite (`src/game/bases/*.solvability.test.ts`) that asserts the intended
pass/fail matrix for each curated base — the concrete mechanism for §6b.4's
soft-lock guarantee below.

---

### 6b.3 Where this hooks into the milestone structure

**Recommendation: this is an amendment to Milestone 6, not a new milestone.**
No M3.5/M6.5 is introduced.

**Justification:**

1. **M6's own charter is exactly this.** Decision D17 already scopes M6 as
   "per-world multiple landing bases, progression unlocks farther
   worlds/bases." A `Base` record — which world it's in, its order, its
   requirements, its difficulty — _is_ the concrete shape of "a base," not a
   separate concern from the world map that displays it.
2. **Splitting it across a new milestone would recreate exactly the
   "two sources of truth" problem** the combat proposal explicitly warned
   against for `simulateEncounter`: a separate "Base Puzzle System" milestone
   would either (a) duplicate fields M6 already needs (order, worldId,
   unlock-gating) or (b) become a second authority on base data that M6's own
   world-map UI has to stay in sync with. One milestone owning one schema
   avoids this by construction.
3. **The forward-reference problem is already a solved pattern in this
   plan.** M5's own Scope text says ship-intrinsic stats are "owned by M7's
   `ShipClass` once that milestone lands" while M5 ships first — the same
   forward-declare-now/populate-later pattern applies here: M6 ships the
   `Base` interface with `encounters: []` always valid and
   `difficulty.axes.combat` defaulting to 0, and M10/M11 populate real values
   into the _same_ fields later. No redesign needed when M10/M11 land.
4. **Dependency order stays intact — including for the evaluator.** M6
   depends only on M5 and M3 today; the `Base` schema itself (§6b.2:
   `base.ts`/`bases.ts`/`difficulty.ts`) has no dependency on M7/M9/M10/M11
   and ships cleanly at M6's point in the sequence. The one piece of §6b.2
   that _does_ have a hard dependency the other way — `evaluateBaseFit`
   (`fit-check.ts`), whose signature takes `ShipClass` (M7) and
   `PermanentUpgrade[]`/`EquipmentItem[]` (M9) — is therefore **not** M6's to
   own; it is placed with **M9** instead (see the amendment below), which is
   the first point in the build order where all three of its required types
   actually exist, since M8 (and therefore M9) already depends on M7 per the
   roadmap table. `obstacles.ts`/`combatant.ts`/`encounter.ts` are explicitly
   M10/M11 for the identical reason (§6b.7 tags every new file by owning
   milestone so this isn't left ambiguous). Keeping the _schema_ in M6, the
   _evaluator_ in M9, and _population_ of `encounters`/`spatial` data in
   M10/M11 preserves the existing dependency graph exactly as documented —
   no milestone reads a type that doesn't exist yet at its point in the
   sequence.

**Concrete amendments required** (to be merged into the existing sections
when this is inserted):

- **M6 Scope** gains: "`src/game/bases/base.ts`/`bases.ts` — the `Base`
  record (§6b.2) and a starter registry of curated bases per world (the
  schema and registry only — `evaluateBaseFit` is M9's, see below); a
  `BaseDifficultyProfile` computed from each base's mechanical (and, once
  available, spatial) parameters; base-select UI shows per-base
  difficulty-axis badges (mechanical/spatial/combat pip counts + a
  dominant-axis emphasis + a distinct capstone marker), reading `spatial`
  from M2's existing pad-width/terrain-roughness parameters (no M10
  dependency needed for a non-zero spatial score) and leaving `combat` at 0
  until M11 lands."
- **M6 Acceptance criteria** gains: "a base's difficulty badges are computed
  from its real authored parameters, never hardcoded independent of the
  actual `Base` record; completed bases remain re-enterable, with a reduced
  but always-nonzero replay reward (extends the existing M8-adjacent
  currency criterion)."
- **M9 Scope** gains: "authors `src/game/bases/fit-check.ts` — the
  `evaluateBaseFit` facade (§6b.2), placed here rather than M6 because its
  signature needs `ShipClass` (M7) and M9's own `PermanentUpgrade`/
  `EquipmentItem` types, none of which exist at M6's point in the build
  sequence; the pre-mission loadout screen calls it against the target
  `Base`'s `requirements`/`difficulty` for live warnings before launch, not a
  separately-authored per-base rule."
- **M10 Scope** gains: "extends `GenerateTerrainOptions`/`Obstacle`
  (§6b.2) — all new fields optional, existing M2 tests keep passing
  unmodified; populates `Base.difficulty.axes.spatial` for bases with real
  obstacle layouts."
- **M11 Scope** gains: "populates `Base.encounters` and
  `Base.difficulty.axes.combat`; `evaluateBaseFit`'s combat branch becomes
  live instead of `'not-applicable'`."

---

### 6b.4 Soft-lock avoidance guarantee

**Note on the reward arithmetic below**: this section (written before
Milestone 9.5 existed) uses `Base.firstClearCredits` throughout — the
pre-mission-system reward constant. Milestone 9.5 §9.5.5 introduces
`missionReward`, which _replaces_ `firstClearCredits` once that milestone
lands (see §9.5.5's own note on the relationship). The proof below is
correct as pre-M9.5 arithmetic and demonstrates the soft-lock guarantee
holds at that stage; it is not re-derived against `missionReward`'s larger
cargo-inclusive figures, and a reader should expect §9.5.7's worked
examples to show noticeably larger reward numbers for the same bases.

**The rule:** a base's `requirements` must always be clearable by _some_
combination of ships/equipment already unlocked (starter, purchased, or
achievement-unlocked) at the point that base itself becomes reachable in the
progression sequence.

**Four guards, all baked into the data model or the authoring discipline
above, not left as a hope:**

1. **Anti-spike budget rule.** On the critical path (bases gating access to
   the next world), `nextBase.difficulty.budget − previousBase.budget` must
   be affordable via the cheapest relevant store item(s) reachable with the
   cumulative minimum-path currency at that point. The one named exception is
   a `capstone-balanced` base, explicitly flagged in the UI (§6b.1), which may
   require two or three unowned purchases at once.
2. **Capability floor is always the cheapest tier.** `requirements.combat.
minWeaponTier` is almost always `1` (starter tier); higher tiers make a
   base _easier_, never define the literal minimum. Same for
   `minTWR.hardFloor`/`handling.hardFloor` — these are checked against the
   _cheapest_ item in each relevant category, not the best one.
3. **Ship choice is a zero-cost lever from minute one.** Decision D13 already
   puts all 5 starter ships in the player's hands unconditionally — a
   currency-starved player can bias toward a spatial-dominant base (nimble
   class) or combat-dominant base (high-slot-count class) before ever
   touching the store.
4. **Replayability.** A base's unlock state gates first entry only;
   completed bases stay re-enterable for a reduced but always-nonzero reward
   — the actual escape valve if a player is under-geared for base _N_: farm
   bases `1..N-1`, return.

**Worked proof, using §6b.5's six concrete bases** (minimum-path, one clear
each, no grinding, prices per the item table in §6b.5). Unlike a per-row
"cumulative credits minus this row's own purchase" computation, the wallet
below **carries forward every purchase made on earlier rows**, since bought
items are owned permanently and money spent earlier is not available later:

| After clearing                            | Reward | Cumulative earned | Purchase(s) made before this base                                                              | Running wallet |
| ----------------------------------------- | ------ | ----------------- | ---------------------------------------------------------------------------------------------- | -------------- |
| 1-1 Aerthos Flats                         | 60     | 60                | — (zero-equipment base)                                                                        | 60             |
| 1-2 Aerthos Ridge                         | 90     | 150               | — (Sparrow path: bare handling 220 ≥ hardFloor 130, the zero-cost ship-choice lever in action) | 150            |
| 2-1 Corvane Spires                        | 140    | 290               | — (obstacle avoidable by flight path, no weapon required)                                      | 290            |
| 2-2 Corvane Reach                         | 160    | 450               | Scrap Cannon, 80cr (cheapest weapon tier)                                                      | 370            |
| 3-1 Pyrrhal Shallows                      | 200    | 650               | + Corrosion Coating, 90cr (mandatory — bare Falcon fails the fuel-margin check, §6b.5)         | 480            |
| 3-2 Cryonax Descent (capstone) — entering | —      | 650               | + Path A: Thermal Lining (90) + Lance Cannon (180) + RCS Pack (60) = 330                       | **150**        |

(Path B — Hauler, all 4 slots, Thermal Lining + RCS Pack + Lance Cannon +
Barrier Shield = 440 — leaves **40** remaining instead of 150; both are
valid, and neither ever goes negative.)

The capstone (Cryonax Descent) is the one base allowed to require a
three-item combined purchase per guard #1's named exception — and even so,
the running wallet never goes negative under either valid loadout,
satisfying the soft-lock guarantee at the hardest point in this worked
slice. §6b.5 shows the full numeric derivation, including the second valid
loadout (Hauler, using all 4 of its slots), which clears the same base by a
different route at a tighter margin (40cr remaining instead of 150) —
proving the base has more than one solution, not a single answer key.

**Recommended regression test** (once M6/M8/M9 data exists,
`src/game/bases/critical-path-affordability.test.ts`): walk the critical path
in unlock order, sum minimum-path rewards, subtract each base's cheapest
viable loadout cost in sequence — carrying forward all prior spend, as the
table above does — and assert the running balance never goes negative. Turns
this section's soft-lock claim into something the existing quality gates
actually verify, not just prose.

---

### 6b.5 Six concrete example bases

Three illustrative ship classes (M7), calibrated so **Falcon reproduces
today's certified M1/M2 constants exactly** (`baseThrustAccel = 46`,
`fuelCapacity = 100`, `burnRate = 18`, `handling = 150` — literally
`THRUST_ACCEL`/`MAX_FUEL`/`FUEL_BURN_RATE`/`ROTATION_SPEED_DEG`), so the new
ship-class system is a strict generalization of what's already shipped, not a
break from it:

| Ship                                              | dryMass (MU) | baseThrustAccel (px/s²) | engineForce | fuelCapacity | burnRate | handling (deg/s) | equipmentSlots |
| ------------------------------------------------- | ------------ | ----------------------- | ----------- | ------------ | -------- | ---------------- | -------------- |
| **Sparrow** (scout)                               | 70           | 62                      | 4340        | 70           | 14       | 220              | 2              |
| **Falcon** (balanced — matches today's constants) | 100          | 46                      | 4600        | 100          | 18       | 150              | 3              |
| **Hauler** (heavy)                                | 160          | 34                      | 5440        | 160          | 24       | 95               | 4              |

**This roster is illustrative for this section's puzzle-difficulty math
only — it is not the same roster as §9.5.7's**, which uses different
numbers (§9.5.7's Hauler: `dryMass` 650 vs. 160 here) because it's
illustrating a different thing (cargo/mass-budget/relay-fuel math, which
needs `massBudget`/`cargoBayCapacity`/`fuelPerDistanceUnit` fields this
table doesn't carry). Both are placeholder numbers for their own section's
worked examples, not a canonical `ships.ts` — M7's actual implementation
picks the real final roster, informed by but not bound to either table.
(An earlier draft of this section claimed the two were "not a competing
numeric universe" — that was true only in the narrow sense that both are
calibrated against the same real `THRUST_ACCEL`/`MAX_FUEL`/etc. constants
Falcon reproduces above; it did not mean the two tables agree with each
other, and they don't.)

`engineForce = baseThrustAccel × dryMass`, held fixed thereafter — bolting on
equipment mass lowers realized acceleration without touching the engine
itself (see §6b.6 item 2 for why this specific model is required, not
optional).

Equipment items and prices (M8/M9): Fuel Tank Mk1 (+18mu, +40fu, 70cr),
Corrosion Coating (+22mu, negates corrosive drain, 90cr), Thermal Lining
(+14mu, negates cold penalty, 90cr), RCS Thruster Pack (+12mu, +40deg/s,
60cr), Vernier Fins (+10mu, +35deg/s, 50cr), Scrap Cannon — tier 1 —
(+8mu, 4dmg/hit, 300ms cooldown, 80cr), Lance Cannon — tier 2 — (+16mu,
14dmg/hit, 900ms cooldown, 180cr), Barrier Shield — tier 1 — (+10mu,
absorbs 1 hit, 110cr).

Four worlds (M5, matching that milestone's own required span: airless
low-gravity, thin-atmosphere temperate, thick-atmosphere corrosive, extreme
cold):

| World       | gravityAccel | atmosphereDensity | hazard                          |
| ----------- | ------------ | ----------------- | ------------------------------- |
| **Aerthos** | 12           | 0                 | null                            |
| **Corvane** | 18           | 0.12              | null                            |
| **Pyrrhal** | 22           | 0.35              | corrosive, `fuelDrainRate: 1.4` |
| **Cryonax** | 20           | 0.15              | cold, `thrustEfficiency: 0.72`  |

#### Base 1 — "Aerthos Flats" (World: Aerthos) — _tutorial_

`terrainOptions`: `minHeightFraction: 0.70, maxHeightFraction: 0.75,
maxStepFraction: 0.02, padSegmentCount: 6` (pad ≈120px, >4× lander diameter),
no obstacles. `encounters: []`.

`requirements`: `minTWR { hardFloor: 1.05, comfortable: 1.30 }`,
`handling: null`, `combat: { minWeaponTier: 0, minShieldTier: 0 }`.

Falcon bare: TWR = 46/12 = **3.83** (comfortable). Zero purchases needed.
`difficulty`: `{ mechanical: 1, spatial: 0, combat: 0 }`, dominant
`'tutorial'`, budget **1** (per §6b.2's `BaseDifficultyProfile` note,
computed identically to `dominant === 'mechanical'`: `1.0×1 + 0.4×(0+0) = 1`).
`firstClearCredits: 60`. This is the exactly-one world+base unlocked from a
fresh save (M6's own acceptance criterion).

#### Base 2 — "Aerthos Ridge" (World: Aerthos) — spatial, mild (slot-budget composite)

`terrainOptions`: `minHeightFraction: 0.60, maxHeightFraction: 0.85,
maxStepFraction: 0.05, padSegmentCount: 3` (48px pad), no discrete obstacles —
difficulty comes from M2's existing rougher random walk alone, no M10
dependency.

`requirements`: `handling { hardFloor: 130, comfortable: 200 }`, unchanged TWR
bands, no combat.

Sparrow bare handling 220 ≥ comfortable — **passes free**. Falcon bare 150 —
between hardFloor and comfortable, "risky" but flyable, or +1 item (RCS,
60cr) reaches 190 (comfortable). Hauler bare 95 — **below hardFloor**;
equipping RCS Thruster Pack alone (+40 → 135) already clears the hardFloor
(130) on a single slot, landing it in the "risky" band — a real but marginal
clear. Only equipping Vernier Fins as well (+35 → 170) pushes it fully into
"comfortable," a matter of buying back safety margin, not a hard requirement.
This is the concrete slot-budget/opportunity-cost archetype at low stakes:
the same base is a free pass for one ship class, a one-slot risky clear for
another, and a comfortable-but-two-slot clear for the heaviest — the
_choice_ of how much margin to buy back with slots, not a fixed gate, is the
puzzle. `difficulty`: `{ mechanical: 1, spatial: 3, combat: 0 }`, dominant
`'spatial'`, budget `1.0×3 + 0.4×1 = 3.4`. `firstClearCredits: 90`.

#### Base 3 — "Corvane Spires" (World: Corvane) — approach-vector gate

`terrainOptions`: `padSegmentCount: 3, padStartIndexOverride: 19` (pad
xStart=456, xEnd=504), `obstacles: [{kind:'spire', xStart:360, xEnd:408,
yTop: 420, yBottom: 640}, {kind:'spire', xStart:552, xEnd:600, yTop: 420,
yBottom: 640}]` — gate width 552−408 = **144px** ≈5.1× lander diameter, a
real but human-flyable chute. `encounters: []`.

`requirements`: `handling: null` (route-commitment, not turn-rate-under-
pressure), `combat: { minWeaponTier: 0 }` (avoidable by flight path — the
obstacle never blocks the pad's own airspace).

Any of the three ships clears this with zero purchases — pure piloting.
`difficulty`: `{ mechanical: 2, spatial: 5, combat: 0 }`, dominant
`'spatial'`, budget `5 + 0.4×2 = 5.8`. `firstClearCredits: 140`.

#### Base 4 — "Corvane Reach" (World: Corvane) — swarm, first combat appearance

Same world params as Base 3. `encounters`: one wave of 4 "Skitterling"
combatants (`health: 1, armorRating: 0, contactDamage: 6`, homing,
`speed: 40`), `clearWindowMs: 5000`. Ship baseline hull: 30.

`requirements`: `combat: { minWeaponTier: 0 (soft-recommended: 1),
minShieldTier: 0 }` — bare-handed survival is possible (4×6=24 contact damage
< 30 hull) but foregoes the full-clear bonus; Scrap Cannon (80cr, ~3.3
shots/s) kills all 4 with large margin inside the 5s window.

`difficulty`: `{ mechanical: 2, spatial: 2, combat: 4 }`, dominant
`'combat'`, budget `4 + 0.4×4 = 5.6`. `firstClearCredits: 160`.

#### Base 5 — "Pyrrhal Shallows" (World: Pyrrhal) — corrosive drain, isolated

`terrainOptions`: standard 3-segment pad, no obstacles. `encounters: []`
(the new hazard is introduced alone, per the pacing rule in §6b.1).
`requiredDeltaV`-equivalent burn budget (authored, playtested constant, not a
derived physics formula — consistent with this project's "arcade game, not a
physics sandbox" stance, §4): 180 px/s-equivalent; par mission time 45s.

`requirements`: `minTWR` unchanged, `hazardCounterTags: ['corrosion-
resistant']`, `recommendedTags: ['fuel-efficient']`.

**Worked check (Falcon, bare hull):** effectiveThrustAccel = 46,
fuelForBurn = `18 × (180/46)` = 70.4fu, drain = `1.4 × 45` = 63fu, total
**133.4fu > 100fu capacity — fails**, exactly the "corrosive alone locks out
an unmitigated ship" archetype. **With Corrosion Coating** (+22mu → mass 122):
effectiveThrustAccel = `4600/122` = 37.7, TWR = `37.7/22` = **1.71**
(comfortable), fuelForBurn = `18 × (180/37.7)` = 85.9fu, drain = 0 (negated),
total **85.9fu < 100fu — passes**, 14fu margin. `difficulty`:
`{ mechanical: 6, spatial: 2, combat: 0 }`, dominant `'mechanical'`, budget
`6 + 0.4×2 = 6.8`. `firstClearCredits: 200`.

_Note on drag:_ this worked check (and every other mechanical-axis
calculation in this section) uses a closed-form px/s-equivalent burn-budget
approximation, consistent with this section's illustrative-numbers framing.
It does not integrate M5's actual per-tick `atmosphericDrag(velocity,
dragCoefficient)` term — a velocity-dependent force only resolvable by
simulation, not by a closed-form estimate. Pyrrhal's nonzero
`atmosphereDensity` (0.35) does add real per-tick drag in the actual game,
which a real `evaluateBaseFit` mechanical branch must account for by running
the same integrator `FlightState` already uses (or an equivalent numeric
simulation), not by reimplementing a closed-form formula. The qualitative
conclusion above (corrosive drain alone locks out an unmitigated Falcon) is
expected to hold regardless, since drag only tightens the margin further —
but the exact fuel numbers in this subsection are illustrative, not
authoritative, and should not be copied into `fit-check.ts` as-is.

#### Base 6 — "Cryonax Descent" (World: Cryonax) — capstone-balanced

`terrainOptions`: `padSegmentCount: 3`, `obstacles`: flanking spires with gate
width **120px** (≈4.3× diameter, tighter than Base 3). `encounters`: one
"Warden" enemy ship (`health: 30, armorRating: 5`, homing, attack
`damagePerHit: 16, cooldownMs: 2200`). Ship baseline hull: 30.

`requirements`: `minTWR { hardFloor: 1.05, comfortable: 1.30 }`, `handling {
hardFloor: 130, comfortable: 200 }`, `hazardCounterTags: ['cold-hardened']`,
`combat: { minWeaponTier: 2, minShieldTier: 1 (recommended) }` — the armor
floor of 5 makes the tier-1 Scrap Cannon (4dmg) deal **zero** effective
damage, a hard fail forcing the Lance Cannon.

**Worked check A — Falcon (3 slots), skill-substitutes-for-shield path:**
equip Thermal Lining (+14) + RCS Pack (+12, +40deg/s) + Lance Cannon (+16) =
mass 142. effectiveThrustAccel = `4600/142` = 32.4, TWR = `32.4/20` = **1.62**
(comfortable). handling = `150+40` = 190 (risky-to-comfortable, clears
hardFloor 130 with room). No shield — the Warden's 16dmg hits are survivable
once (hull 30) but not twice within its 2200ms cooldown if the pilot doesn't
reposition; clearing requires actively dodging the second hit, a genuine
skill demand. Cost: 90+60+180 = 330cr.

**Worked check B — Hauler (4 slots), gear-substitutes-for-skill path:** equip
Thermal Lining (+14) + RCS Pack (+12, +40deg/s) + Lance Cannon (+16) + Barrier
Shield (+10) = mass 212, all 4 slots used. effectiveThrustAccel =
`5440/212` = 25.7, TWR = `25.7/20` = **1.28** (risky, just under
comfortable). handling = `95+40` = 135 (risky, just clears hardFloor 130).
Shield absorbs the Warden's first hit outright — no dodging required, but
every other margin is thin. Cost: 90+60+180+110 = 440cr.

Both are valid, cost-different, skill-different solutions — the concrete
"more than one correct answer" property the taxonomy calls for. `difficulty`:
`{ mechanical: 5, spatial: 6, combat: 6 }`, dominant `'capstone-balanced'`,
budget `0.7×(5+6+6) = 11.9` — clearly the largest budget in this slice, and
explicitly flagged with a distinct marker in the world-map UI (§6b.1).
`firstClearCredits: 260`.

Cross-reference §6b.4's affordability table: cumulative credits entering this
base (minimum path) = 650; mandatory prior spend (Scrap Cannon + Corrosion
Coating, since the Sparrow-bare-handling and avoidable-spire bases needed no
purchase) = 170; remaining = 480 — sufficient for either Path A (330,
remaining 150) or Path B (440, remaining 40). Neither goes negative.

---

### 6b.6 Contradictions found across the four proposals, and how resolved

1. **Unit-system mismatch.** The mechanical/stats proposal invented an
   abstract `units/s²` scale ("matches the existing `GRAVITY_ACCEL = 18`-style
   constant convention," per its own text) that in fact does _not_ match —
   `GRAVITY_ACCEL` is a concrete `18 px/s²`, not an abstract unit. **Resolved**:
   this section uses the real px-based constants throughout (§6b.5), and
   deliberately calibrates the "Falcon" ship class to reproduce
   `THRUST_ACCEL`/`MAX_FUEL`/`FUEL_BURN_RATE`/`ROTATION_SPEED_DEG` exactly,
   so the new ship-class system is demonstrably a generalization of the
   certified M1/M2 code, not a competing numeric universe.
2. **`ShipClass` thrust representation is ambiguous in M7's current prose**
   ("mass or thrust multiplier") — insufficient to make M9's acceptance
   criterion ("equipping items... measurably degrades thrust-to-weight")
   mathematically real rather than merely asserted. The mechanical proposal's
   `engineForce = baseThrustAccel × dryMass`, held constant as loadout mass
   is added, is the specific model required. **Resolved**: adopted explicitly
   in §6b.2/§6b.5 and flagged here as a refinement M7's implementer should
   apply, not an open question.
3. **Obstacle type duplication.** The spatial proposal's `Obstacle
{kind, xStart, xEnd, yTop, yBottom}` (pure geometry) and the combat
   proposal's `ObstacleSpec {id, position, armorRating, blocksOnlyPath}`
   (combat-clearability) are two independent partial models of the same
   thing. **Resolved**: merged into one `Obstacle` type (§6b.2) with
   `armorRating`/`cleared` as fields added _by M11_, matching what M10's own
   PLAN.md acceptance criteria already implies ("a cleared obstacle no longer
   blocks flight" — M11's job, on M10's data).
4. **Classification ambiguity**: is "wind/visibility" (M10's own scope text)
   mechanical or spatial? The spatial proposal implicitly treats all of M10
   as one axis; the progression proposal explicitly separates them by
   player-effect. **Resolved**: adopted the progression proposal's
   effect-based rule explicitly, stated in §6b.1, so M10's implementer tags
   bases correctly rather than lumping wind in with spire placement.
5. **Evaluator fragmentation.** Three independent "is this loadout good
   enough" functions (mechanical `evaluateLoadout`, spatial gate-width scan,
   combat `simulateEncounter`) risked becoming three uncoordinated,
   driftable answer-keys — precisely what the combat proposal's own
   "no separate puzzle-authoring language" principle warns against, but the
   proposal only applied that principle to its own axis. **Resolved**: kept
   as three small, independently-testable pure functions, composed behind one
   `evaluateBaseFit` facade (§6b.2) — the same principle, generalized to all
   three axes. `BaseRequirements` still hand-authors per-base thresholds
   (`minTWR`, `handling`, `combat.minWeaponTier`/`minShieldTier`) — a
   puzzle's difficulty has to be authored _somewhere_, and this is that
   somewhere — but those thresholds are simulation _inputs_ consumed
   uniformly by `evaluateBaseFit`, not a parallel, independently-computed
   pass/fail verdict that could silently drift from what the simulation
   actually says. What's eliminated is a redundant fourth, hand-authored
   _verdict_ field (e.g. a flat `completable: boolean` or a `requiredWeaponId`
   maintained by hand alongside the sim) — not the authored thresholds
   themselves. Within `requirements.combat`, `minWeaponTier` and
   `minShieldTier` are not symmetric: `minWeaponTier` is precomputed from the
   same armor-floor math `evaluateBaseFit`'s combat branch runs (the tier
   below which effective damage is provably zero against this base's
   toughest combatant) and is enforced as a hard gate at play-time, while
   `minShieldTier` is a soft, UI-only recommendation never enforced as a
   gate — both are annotated as such directly on the interface (§6b.2)
   precisely so this isn't left ambiguous the way the source proposals left
   it.
6. **Four independently-invented per-base config shapes** (`LandingBase`,
   `Terrain`, `BaseCombatSpec`, `BaseDifficultyProfile`) each carried their
   own overlapping `requirements`/`recommended` block. **Resolved**: a single
   `Base` record (§6b.2) is the one authoring surface;
   `BaseDifficultyProfile` is a field on it, not a parallel table that could
   silently drift out of sync with the actual mission content.
7. **Non-reconciled illustrative economies.** The mechanical and progression
   proposals each invented their own reward/price numbers, independently,
   with no shared arithmetic. **Resolved**: §6b.5/§6b.4 define one canonical
   illustrative reward/price schedule that supersedes both source proposals'
   numbers for implementation purposes; a future implementer should treat
   _these_ as the placeholder figures to refine at M8 time, not the ones in
   the four input proposals.

---

### 6b.7 Summary of required documentation/test updates

- **New files** (populated incrementally per §6b.3's amendments):
  `src/game/bases/base.ts`, `src/game/bases/bases.ts`,
  `src/game/bases/difficulty.ts` (M6), `src/game/bases/fit-check.ts` (M9),
  `src/game/terrain/obstacles.ts` (M10), `src/game/combat/combatant.ts`,
  `src/game/combat/encounter.ts` (M11).
- **Required tests** (added to the relevant milestone's own "Required tests"
  list, not a new tier): unit tests for `Base`/registry validity (every base
  has a valid, distinct `id`/`worldId`, difficulty axes in range 0–10);
  unit tests for `evaluateBaseFit`'s three branches independently; a per-base
  `*.solvability.test.ts` fixture for each curated base in §6b.5, asserting
  the specific pass/fail matrix worked out above (e.g. Cryonax Descent:
  Falcon+ThermalLining+RCS+Lance passes, Falcon bare fails, Sparrow+ScrapCannon
  fails on armor floor); the critical-path-affordability regression test
  from §6b.4.
- **Documentation updates**: this file (§6b inserted, M6/M9/M10/M11 sections
  amended per §6b.3), `CHANGELOG.md` noting the schema's introduction at
  whichever milestone actually lands it.

---

### 6b.8 Revision history (adversarial verification pass)

This section (§6b) was generated by a multi-agent design workflow: four
independent proposals (mechanical, spatial, combat, progression angles),
synthesized into one spec, then adversarially reviewed against the real
codebase and PLAN.md before insertion. The review found and required
fixing five real issues; this subsection is the record of what changed
between the first synthesis and the version above, kept for the same
reason `PLAN.md` §5 keeps its own "verify, don't guess" incident log —
so a future reader can see exactly what a skeptical pass caught.

- **§6b.4 affordability table**: replaced the per-row "cumulative − this row's own purchase" arithmetic (which silently dropped earlier purchases) with a running wallet that carries forward all prior spend. New consistent numbers: prior spend before the capstone = 170cr (Scrap Cannon 80 + Corrosion Coating 90), wallet entering the capstone = 480cr, Path A (330cr) leaves 150 remaining, Path B (440cr) leaves 40 remaining — now identical to the numbers already stated in §6b.5's cross-reference paragraph (previously 230 vs. 150 vs. 40 disagreed across three spots).
- **§6b.3 point 4 and its amendment bullets**: `fit-check.ts`/`evaluateBaseFit` reassigned from an implied-M6 file to explicitly **M9**-owned (the first point in the build order where `ShipClass` (M7) and `PermanentUpgrade`/`EquipmentItem` (M9) all exist), with the M6 and M9 Scope amendment bullets and §6b.7's file list updated to match.
- **Base 2 "Aerthos Ridge" worked example**: corrected to reflect that Hauler + RCS Thruster Pack alone (135 deg/s) already clears the stated `hardFloor` of 130 (risky band, one slot), rather than claiming both RCS and Vernier are required; reframed the slot-budget point as a margin/opportunity-cost choice rather than a hard two-item requirement.
- **§6b.6 item 5 and `BaseRequirements.combat`**: reconciled the "no fourth hand-authored field" claim with the fact that `minTWR`/`handling`/`combat.*` are themselves hand-authored, by distinguishing authored _thresholds_ (necessary inputs) from a hand-authored _verdict_ (eliminated); added interface-level doc comments distinguishing `minWeaponTier` (hard gate) from `minShieldTier` (soft, UI-only).
- **`BaseDifficultyProfile.dominant`**: added an explicit note that `'tutorial'` uses the same budget arithmetic as `'mechanical'` (its only nonzero axis by construction), closing the previously-undefined case exercised by Base 1.
- **Base 5 "Pyrrhal Shallows"**: added an explicit note acknowledging the worked fuel/TWR arithmetic is a closed-form approximation that does not incorporate M5's real per-tick `atmosphericDrag`, and that a real `evaluateBaseFit` implementation must run the same integrator instead of reusing these illustrative numbers as-is.

---

### Milestone 3 — Start Screen & Game Flow

**Status: CERTIFIED** (2026-07-06).

**Goal**: Real game loop shell — main menu, start button, settings stub,
in-game HUD (fuel readout already exists from M1/M2 and carries forward),
pause, and a proper landed/crashed result screen with restart — replacing
M2's placeholder "press R to try again" text-only flow.

**Scope delivered**:

- `src/game/scenes/menu-scene.ts` (new) — title + START/SETTINGS buttons;
  Enter starts a flight, matching the START button.
- `src/game/scenes/settings-scene.ts` (new) — a stub overlay (translucent
  backdrop, "no options yet" text, a BACK button) reused as a modal both
  from the menu and as the pause screen — launched via Phaser's `run()`
  (not `launch()`/`start()`, per Phaser's own documented pattern for
  reusable modal scenes) with a `returnTo` scene key, closed via
  `stop()` + `resume(returnTo)`.
- `src/game/scenes/result-scene.ts` (new) — the one unified result screen
  for both outcomes; a color-coded heading (green/red, D18 palette) plus
  RESTART/MAIN MENU buttons and matching R/Escape shortcuts. Exports
  `outcomeLabel`/`outcomeColor` as the single source of truth for the
  outcome→text/color mapping, shared with `GameScene`'s brief freeze-frame.
- `src/game/scenes/scene-utils.ts` (new) — `requireKeyboard(scene)` (the
  keyboard-plugin-missing guard, shared instead of copy-pasted across four
  scenes) and `ArmedKeyGuard` (below).
- `src/game/rendering/ui-button.ts` (new) — `createUiButton`, one shared
  button look/hover/click behavior for every menu/result/settings scene.
- `src/game/scenes/game-scene.ts` — removed the old `keyR`/"press R"
  restart logic entirely; Escape now pauses (`this.scene.run('Settings',
{returnTo:'Game'})` then `this.scene.pause()` — pausing the scene is
  what freezes the physics simulation, since Phaser stops calling a
  paused scene's `update()` at all, no manual flag needed) while flying;
  on landed/crashed, after the existing `this.data.set('outcome', ...)`
  contract (preserved exactly — existing e2e tests depend on it), a
  `RESULT_TRANSITION_DELAY_MS` (1.2s) delayed call transitions to
  `ResultScene` instead of freezing forever waiting for a keypress. The
  big in-flight title/subtitle HUD text was removed (the title now lives
  on `MenuScene` only); in-flight HUD is just the fuel readout plus a
  small "ESC: pause" hint, both `scrollFactor(0)`.
- `src/game/scenes/boot-scene.ts` / `src/main.ts` — boot now starts
  `MenuScene` (not `GameScene` directly); scene list is `[BootScene,
MenuScene, GameScene, ResultScene, SettingsScene]`.
- `src/game/constants.ts` — `UI_TEXT_COLOR`/`UI_MUTED_TEXT_COLOR`/
  `UI_TITLE_FONT_SIZE_PX`/`UI_BODY_FONT_SIZE_PX`/`UI_BUTTON_*`/
  `UI_BUTTON_ROW_HEIGHT_PX` (the stacked-button spacing formula, computed
  once so `MenuScene`/`ResultScene` can't silently drift apart)/
  `RESULT_TRANSITION_DELAY_MS`/`SETTINGS_OVERLAY_COLOR`/
  `SETTINGS_OVERLAY_ALPHA`.
- **`ArmedKeyGuard`** (`scene-utils.ts`) — found necessary by adversarial
  review, not planned at milestone start: holding Escape (or any
  shortcut key) past the OS's keyboard auto-repeat delay (commonly
  250-660ms, an entirely ordinary press-and-hold duration) re-fires
  native `keydown` events for as long as the key is held. A freshly
  `run()`-started `SettingsScene` (fresh Key object, `isDown` defaulting
  false) or a `GameScene` whose keys were just reset by Phaser's own
  pause-triggered `resetKeys()` (confirmed directly in
  `node_modules/phaser/src/input/keyboard/KeyboardPlugin.js`) would see
  the very next repeat event as a fresh `JustDown()`, instantly
  re-triggering the opposite action — the pause overlay flickering
  open-and-closed instead of staying open until the player deliberately
  presses again. `ArmedKeyGuard` requires a key to be observed _not_ down
  at least once before its first `JustDown()` can register, eliminating
  the false retrigger regardless of how long the key is held. Applied to
  every scene-transition shortcut (`GameScene`'s Escape, `SettingsScene`'s
  Escape, `ResultScene`'s R and Escape, `MenuScene`'s Enter).

**Acceptance criteria**: met — a full play session is reachable end-to-end:
menu → start → fly → land or crash → result screen → restart-or-menu,
with no dead ends (e2e-verified two full cycles, both via keyboard
shortcuts and via real mouse clicks on every button). Pausing mid-flight
freezes the simulation (e2e-verified: a `FlightState` snapshot taken
while paused, after a real wait, is byte-identical to the snapshot taken
the instant pause began) and shows the settings stub; resuming continues
exactly where play left off (e2e-verified: the snapshot after resuming
differs from the paused one).

**Required tests**: `e2e/game-flow.spec.ts` (menu → start → fly → result
→ restart → fly → result → main menu, keyboard-driven, two full cycles);
`e2e/button-clicks.spec.ts` (the same button set — START, SETTINGS, BACK
from both the menu and the pause contexts, RESTART, MAIN MENU — driven by
real mouse clicks instead, since a regression could break click handling
specifically while every keyboard shortcut kept working); `e2e/pause-
resume.spec.ts` (the frozen/resumed `FlightState.snapshot` check above).
`e2e/test-helpers.ts` centralizes `tapKey` (explicit `keyboard.down` + a
real wait + `keyboard.up`, not Playwright's `keyboard.press()` — Phaser's
`Key#onUp` clears its internal `_justDown` flag, so a down+up pair
landing within the same animation-frame gap, which `press()` can
produce, loses the rising edge entirely; confirmed directly via dozens of
repeated isolated trials, ~90% failure with `press()` vs. single-digit
failures with this fix), `waitForActiveScene`, and `clickButton`/
`findButtonPosition` (the latter click relative to the `#app canvas`
element specifically, not raw page coordinates — the canvas is centered
inside a larger viewport under every Playwright device preset this
project uses, so page-coordinate clicks landed nowhere near the actual
buttons; found and fixed the same session it was introduced, before ever
reaching a committed state). No new pure logic beyond the label/color
mapping already covered by `outcomeLabel`/`outcomeColor`'s own usage —
this milestone is Phaser scene/input wiring, matching the "none expected"
note carried over from Milestone 2.5's own equivalent scope.

**Required quality gates**: full gate list — green (68 unit/integration
tests, unchanged from Milestone 2.5 — no new pure logic; e2e 27/27 across
Chromium/Firefox/WebKit, confirmed stable across 3 consecutive full runs
after both the `ArmedKeyGuard` fix and the canvas-relative click fix).

**Required documentation updates**: this file, `CHANGELOG.md`, `README.md`.

**Certification checklist**: certified. Depends on Milestone 2.5.

---

### Milestone 4 — Scoring & High Scores (certified)

**Goal**: Implement Decision D8 — a scoring formula (fuel remaining, time
taken, landing precision) and `localStorage`-backed high scores, schema
validated on read so a corrupted or old-shape entry can't crash the game.

**Scope**:

- `src/game/scoring/score.ts` (new) — `calculateScore`, a pure function
  over `ScoreInputs`/`ScoreWeights`: a flat `baseLandingBonus` for any
  confirmed safe landing, plus three 0..1 fractions (fuel remaining,
  time-under-par, landing precision relative to pad center) each scaled by
  its own max-bonus weight and summed, then rounded. Only ever called for a
  confirmed safe landing (`isSafeLanding()` already true) — no crash
  branch, by design. All tunables (`SCORE_BASE_LANDING_BONUS`,
  `SCORE_MAX_FUEL_BONUS`, `SCORE_MAX_PRECISION_BONUS`,
  `SCORE_MAX_TIME_BONUS`, `SCORE_TIME_PAR_MS`) live in `constants.ts` and
  are passed in as `ScoreWeights` — `score.ts` itself imports neither
  `constants.ts` nor Phaser, matching `terrain-generator.ts`'s own
  options-parameter pattern.
- `src/game/persistence/high-scores.ts` (new) — `KeyValueStorage` (a
  narrow, injectable 2-method interface a real `window.localStorage`
  satisfies with zero adaptation), `loadHighScores` (parses and validates
  the stored list, rejecting the whole read on any parse failure or shape
  mismatch rather than sanitizing down to a valid subset), `recordHighScore`
  (appends, sorts descending, truncates to `HIGH_SCORE_LIST_MAX_ENTRIES`,
  best-effort persists — a failed `setItem`, e.g. Safari private
  browsing's zero quota, is swallowed and the in-memory result still
  returned), and `getSafeLocalStorage` (a `window.localStorage`-reading
  wrapper that returns `null` instead of throwing, since merely _reading_
  that property can throw a `SecurityError` in a sandboxed iframe or
  storage-blocking privacy setting — callers use this instead of the bare
  global). Unit-tested entirely against an injected `FakeStorage`/
  `ThrowingStorage` in plain Node — no `jsdom`, consistent with the
  Architecture Notes testing philosophy. This persistence pattern
  (validated `localStorage`, injectable storage interface for testing) is
  reused as-is by M6's unlock state, M8's currency balance, and M12's
  achievement state — one philosophy, four consumers.
- `src/game/scenes/game-scene.ts` — tracks `elapsedMs` (accumulated only
  while `update()` actually runs, so pausing doesn't count against it),
  and on a safe landing computes the score, calls `recordHighScore` via
  `getSafeLocalStorage`, and carries `{ outcome, score, bestScore }` to
  `ResultScene`; a crash carries just `{ outcome }` — `calculateScore`/
  `recordHighScore` are never reached on that path (e2e-verified).
  `this.data.remove('score')` on `create()` clears a stale score from a
  prior landing before a restart, since `GameScene` is one long-lived
  Phaser instance reused across restarts.
- `src/game/scenes/result-scene.ts` — new SCORE/BEST text block (only
  rendered when both are present, i.e. never on a crash).
- `src/game/scenes/menu-scene.ts` — new BEST text block, shown only once
  a real score exists (an empty leaderboard shows no line at all, not
  "BEST: 0").
- `vitest.config.ts` — coverage `include` widened to cover
  `src/game/scoring/**` and `src/game/persistence/**`.

**Acceptance criteria**: met — landing produces a score; scores persist
across a real page reload (e2e-verified: a seeded `localStorage` entry
survives a reload and is read back by `MenuScene`'s own `loadHighScores`
call); a manually corrupted `localStorage` entry (invalid JSON) is
rejected gracefully — menu shows no BEST line, zero console/page errors —
not thrown; a crash never scores and never writes to the leaderboard
(e2e-verified directly against `localStorage`).

**Required tests**: `src/game/scoring/score.test.ts` (formula unit tests);
`src/game/persistence/high-scores.test.ts` (schema validator against
valid/corrupted/wrong-shape/empty storage, `recordHighScore` sort/
truncate/best-effort-write behavior, `getSafeLocalStorage`'s success/
throw/no-`window` cases via `vi.stubGlobal` — no `jsdom`);
`e2e/high-scores.spec.ts` (a persisted score survives a real reload and a
corrupted entry is rejected gracefully; a crash produces neither a score
nor a leaderboard write).

**Required quality gates**: full gate list — green (93 unit/integration
tests, up from Milestone 3's 68; e2e 33/33 across Chromium/Firefox/WebKit).
`e2e/high-scores.spec.ts`'s two tests each initially budgeted their overall
`test.setTimeout` below the real worst-case sum of their own constituent
waits (60000ms of waits against a 30000ms ceiling; 65800ms against 50000ms)
— this reproduced as a genuine timeout on the third of three verification
runs, not a hypothetical, and was fixed by widening both to 90000ms
(matching `game-flow.spec.ts`'s established ceiling for this suite's
heaviest tests) rather than adding retries. Confirmed stable across 3
further consecutive full runs after that fix.

**Required documentation updates**: this file, `CHANGELOG.md`, README —
done.

**Certification checklist**: certified. Depends on Milestone 3.

---

### Milestone 5 — Fictional Celestial Bodies (certified)

**Status: CERTIFIED** (2026-07-07).

**Goal**: Generalize the single hardcoded world into a data-driven
`CelestialBody` config, and add real per-world variation per Decision
D11: gravity, atmospheric drag, and one hazard type per body (corrosive
atmosphere = passive fuel drain; extreme cold = reduced thrust
efficiency). Bodies are entirely fictional (Decision D11) — not real
planets.

**Scope delivered**:

- `src/game/planets/celestial-body.ts` (new) — the `CelestialBody`
  interface (`id`, `name`, `gravityAccel`, `atmosphereDensity`,
  `hazard`, `terrainPalette`, `distance`) plus `EtchStyle`
  (`'rock' | 'sand' | 'water' | 'foliage'`) and the `Hazard` discriminated
  union (`{type:'corrosive'; fuelDrainRate}` \| `{type:'cold';
thrustEfficiency}` \| `null`). `TerrainPalette`/`CorrosiveHazard`/
  `ColdHazard` are deliberately not exported — nothing outside this file
  needs to name them on their own, only as members of `CelestialBody`/
  `Hazard` (knip caught this; made module-private rather than exported
  dead weight). Zero imports — pure data types, matching `physics/`/
  `flight/`/`terrain/`'s existing Phaser-free discipline.
- `src/game/planets/bodies.ts` (new) — `BODIES`, a starter registry of
  exactly 12 fictional worlds/moons (Decision D20's "at least 12"),
  typed `readonly [CelestialBody, ...CelestialBody[]]` (a non-empty
  tuple, not just `readonly CelestialBody[]`) specifically so
  `BODIES[0]` is statically a real `CelestialBody` under this project's
  `noUncheckedIndexedAccess`, without a disallowed non-null assertion or
  a dead "can't happen" runtime guard. `gravityAccel` spans 9-26 px/s²
  (always well under the ship's fixed 46 px/s² `THRUST_ACCEL`, so every
  world stays flyable — confirmed by the adversarial review's own
  per-body margin arithmetic, see below); `atmosphereDensity` spans
  0 (airless) to 0.06; hazards split 6 null / 3 corrosive / 3 cold;
  `etchStyle` covers all four materials at least twice each. Kessel's
  Reach (`distance: 0`, no hazard) carries forward the original
  Milestone 1/2 `GRAVITY_ACCEL` (18) and terrain colors byte-for-byte —
  the default/home world is a continuation of the certified M1-M4
  experience, not a competing numeric universe. Verdalis
  (`distance: 42`, no hazard), Pyrrhine Expanse (`distance: 95`,
  corrosive), and Glacian Drift (`distance: 210`, cold) match Milestone
  9.5's own worked-example roster (§9.5.7) exactly — `bodies.test.ts`
  pins these four bodies' `id`/`distance`/`hazard.type` explicitly so a
  future casual edit can't silently break that milestone's arithmetic.
- **Per-material terrain rendering, not just palette** (flagged during
  Decision D18's art-direction work): `src/game/rendering/paper-shape.ts`
  gained `PaperShapeOptions.etchStyle?: EtchStyle` (defaults to `'rock'`,
  today's original look, when omitted) and an internal
  `ETCH_STYLE_CONFIGS` lookup (per-style base angle / angle jitter /
  length multiplier) that `drawEtchedLines` now uses instead of one
  hard-coded fully-random scribble. `rock` is proven bit-for-bit
  statistically identical to the pre-Milestone-5 look (a uniform angle
  spread over a full circle is phase-shift-invariant once fed through
  `Math.cos`/`Math.sin`) — verified both by written proof and by the
  lander's own etch call (which never sets `etchStyle`) rendering
  unchanged. `GameScene`'s ground now sources `fillTopColor`/
  `fillBottomColor`/`etchStyle` from the selected body's
  `terrainPalette`; the landing pad deliberately keeps one universal
  green regardless of world — a consistent "safe zone" visual cue.
- `src/game/physics/lander-physics.ts` — new pure
  `atmosphericDrag(velocity, dragCoefficient): Vector2` (opposes
  velocity, scaled by the coefficient — the simplest physically
  reasonable linear drag model, consistent with this project's "arcade
  game, not a physics sandbox" philosophy from §4).
- `FlightState` generalized: `FlightStateOptions` gained `dragCoefficient`
  and `hazard` (both required, not optional/defaulted, so every call
  site is explicit about environment status). `thrustEfficiency`
  (default 1) and `passiveFuelDrainRate` (default 0) are derived once
  from `hazard` at construction, not re-branched every tick; `tick()`
  adds `atmosphericDrag` into its per-frame acceleration sum alongside
  gravity/thrust, multiplies thrust by `thrustEfficiency`, and composes
  the corrosive passive drain into the same `consumeFuel` call as the
  normal thrust burn. Ship-intrinsic stats (`THRUST_ACCEL`,
  `ROTATION_SPEED_DEG`, `FUEL_BURN_RATE`, `MAX_FUEL` — owned by M7's
  `ShipClass` once that milestone lands) stay in `constants.ts`,
  unchanged; only gravity/drag/hazard moved to per-body data.
- `GameScene` takes the selected body via new `GameSceneData.body?`
  (optional; defaults to `BODIES[0]` in `init()` until M6 adds real
  selection). Every current caller (`MenuScene`'s START, `ResultScene`'s
  RESTART) starts with no data at all, so the default path is what's
  live today — e2e-verified via the full existing suite.

**Acceptance criteria**: met. The same ship flies measurably differently
on bodies with different gravity/drag (integration-tested via a direct
position/velocity comparison after equal elapsed time — a closer proxy
for "flies differently" than a literal descent-time/fuel-at-landing
diff, since `FlightState` explicitly doesn't own ground contact, see §4);
a corrosive-world flight loses fuel with no thrust input, contrasted
directly against a hazard-free control that loses none; a cold-world
flight's sustained thrust produces measurably weaker ascent than an
identical warm-world flight.

**Required tests**: `lander-physics.test.ts` — 7 new `atmosphericDrag`
tests (opposes velocity on both axes, scales with coefficient, scales
with speed, zero at zero coefficient, zero at zero velocity, one
hand-computed diagonal case). `bodies.test.ts` — registry length ≥ 12,
no duplicate ids, every field physically sane, every hazard type
internally consistent, at least one body per hazard category and per
etch style, and the four-body pin test against §9.5.7. `flight-state.
integration.test.ts` — 5 new tests: atmospheric drag measurably slows a
moving lander; a corrosive flight loses fuel with no thrust input
(contrasted against a hazard-free control); a cold flight's sustained
thrust produces measurably weaker ascent than a warm flight; the same
ship flies measurably differently on two bodies with different
gravity/drag.

**Required quality gates**: full gate list — green (111 unit/integration
tests, up from Milestone 4's 93; coverage 99.21%/92.3%/100%/99.17%,
thresholds 90/85/90/90 all met; `pnpm build`/`deadcode`/`security:audit`/
`security:secrets` all clean; `pnpm test:e2e` 33/33 across
Chromium/Firefox/WebKit). A dimension-specific adversarial review
(correctness, gameplay-balance, standards/DRY, test-coverage — every
finding independently re-verified, including hand-redone arithmetic)
found zero correctness/standards defects, but the gameplay-balance pass
caught one genuine tuning problem the design didn't originally account
for: Corvexa Shallows' corrosive `fuelDrainRate` (originally 5) fully
drained `MAX_FUEL` (100) from **passive drain alone, with zero thrust
used**, in exactly 20s — precisely `SCORE_TIME_PAR_MS`, this game's own
"a direct, confident descent comfortably beats this" reference duration —
leaving zero fuel margin for the braking burn every real landing needs,
regardless of skill. Fixed by reducing it to 4 (tied with Pyrrhine
Expanse rather than uniquely worst), leaving real margin at par time
while staying meaningfully harsher than Umbral Fen's introductory rate.
One accepted, explicitly-scoped-out gap: no test at any tier drives
`GameScene` through a non-default `CelestialBody` yet — every real
caller passes no data, so only the `BODIES[0]` path is live, and PLAN.md's
own scope text says selection is deliberately deferred ("until M6 adds
real selection"). Building that coverage now would need an observability
hook with no current production caller to justify it — exactly the
placeholder infrastructure this project's standards prohibit; correctly
left for M6, which needs that hook anyway.

**Required documentation updates**: this file, `CHANGELOG.md` — done.
See the "`FlightState`/`CelestialBody`" note added to §4 Architecture
Notes below for the final interface shape.

**Certification checklist**: certified. Depends on Milestone 2.5.

---

### Milestone 6 — Planetary Browser (World Map) (not started)

**Goal**: A world-select screen (extends M3's menu system) per Decision
D17: discovered worlds are selectable, locked worlds are visible but
unavailable; worlds with more than one landing base show base-select
within that world; establishing/resupplying bases (Milestone 9.5) unlocks
farther worlds and/or more bases. Across the full **12-world minimum
registry (Decision D20)**, each world's 1-3 bases are reached through
**two independent gates**, not one: the mission-completion `unlocks`
graph this milestone owns (below), and the upgrade-tier `requirements`
check M9's `evaluateBaseFit` owns (§6b.2) — a base can be both
story-locked (not yet discovered) and mechanically out of reach (ship/
loadout too weak) at once, and at least some of the 12 worlds' bases
must actually combine both, not just one or the other, per D20.

**Scope**:

- `src/game/bases/base.ts`, `bases.ts`, `difficulty.ts` — the `Base`
  record (§6b.2: `terrainOptions`, `encounters` — empty array until M11,
  `requirements`, `difficulty`, `firstClearCredits`) and a starter registry
  of curated bases per world. **Schema and registry only** —
  `evaluateBaseFit` (`fit-check.ts`) is **not** built here; it's M9's (see
  §6b.3 point 4 and the M9 amendment below), since its signature needs
  `ShipClass` (M7) and `PermanentUpgrade`/`EquipmentItem` (M9) types that
  don't exist yet at M6's point in the sequence.
- **Base status is a three-state machine, not binary**: `locked →
discovered-unclaimed → established` (amended from a simpler discovered/
  locked flag per Milestone 9.5's design — establishing a base, not merely
  discovering it, is what has narrative/mechanical weight, see §9.5.4).
  `status`, `isCriticalPath`, `unlocks`, and `localOffset` are fields on
  the same `Base` record §6b.2 defines (not a separate `BaseConfig` type —
  see §6b.2's own copy of these fields for the authoritative shapes).
  Persisted via M4's validated-`localStorage` pattern, alongside
  `establishedAt`/`resupplyCounts` (§9.5.4, feeds M12).
- A `BaseDifficultyProfile` (§6b.2) computed from each base's mechanical
  (and, once available, spatial) parameters.
- A `WorldMapScene` rendering M5's body registry with locked/discovered/
  established visual states; base-select UI for multi-base worlds shows
  per-base difficulty-axis badges (mechanical/spatial/combat pip counts, a
  dominant-axis emphasis, a distinct capstone marker — §6b.1) and, once
  M9.5 lands, the mission-brief fields a player needs before committing:
  distance to target (TU) and atmosphere/hazard summary (read from the
  target `CelestialBody`, M5), target hostility level (from
  `difficulty.axes.combat`/`requirements.combat` on `Base`, §6b.2 —
  reads as 0/no-requirement until M11 populates real encounter data, the
  same "empty until M11" state `Base.encounters` is already in), and
  cargo/load weight required — this last one is **not** on `Base` or
  `CelestialBody` at all, but on the specific `MissionDefinition`
  (`minManifest`, §9.5.1) offered at that base, since the same base's
  requirement differs between its Establish-Presence and Resupply
  missions. The briefing composes these from three different records, not
  one — flagged explicitly so an implementer doesn't look for a single
  "briefing" field that doesn't exist.

**Acceptance criteria** (deliberately scoped to what M6 alone can certify —
see the dependency note below): starting state has exactly one world, with
its first base `discovered-unclaimed`; the `locked → discovered-unclaimed
→ established` transition and `unlocks` propagation work correctly when
driven directly (a test harness calling the state-transition function, not
a played mission — M9.5 is what wires an actual mission outcome to trigger
it, see §9.5.4); a base's difficulty badges are computed from its real
authored parameters, never hardcoded independent of the actual `Base`
record; locked worlds/bases are visible but not selectable; unlock state
survives a real page reload. The full player-facing loop this enables —
completing the opening Establish Presence mission to actually flip the
state, established bases staying re-enterable for a Resupply reward — is
M9.5's acceptance criteria to certify, not M6's; M6 only has to prove the
state machine and persistence are correct in isolation.

**Dependency note**: M6's own certification above depends only on M5 and
M3 (below), same as the roadmap table. M9.5 (roadmap position 8) is what
_drives_ this state machine end-to-end via real missions, and is
correctly listed as depending on M6 — not the other way around. Earlier
drafts of this section folded M9.5's not-yet-buildable mission mechanics
into M6's own acceptance criteria, which would have made M6 impossible to
certify on its own; the wording above is the fix.

**Required tests**: unit tests for the unlock-state data model (initial
state, the three-state transition graph, `unlocks` propagation,
persistence schema validation) and for `Base`/registry validity (every
base has a valid, distinct `id`/`worldId`, difficulty axes in range
0-10); e2e test reaching a locked world/base, confirming it can't be
entered, then unlocking one and confirming it can.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M5 and M3.

---

### Milestone 7 — Ship Roster (not started)

**Goal**: 5 starter ships available from the start (Decision D13), each
belonging to a distinct **ship class** (an archetype) with
correspondingly different mass/thrust/fuel-capacity/handling **and
equipment slot capacity** — e.g. a small/light class carries fewer
equipment slots but handles better and burns less fuel per distance; a
large/heavy class carries more equipment slots (more weapons/utility
items at once) but has less range (lower fuel efficiency or capacity
relative to its mass). Slot _count_ is therefore a ship-class stat
(Milestone 7), while each individual item's mass-vs-benefit tradeoff
(Milestone 9) is separate — a heavy ship with many slots can still
over-equip itself into poor thrust-to-weight if the player fills every
slot regardless of the target base's demands. Additional ships beyond the 5
starters are acquired two ways, per-ship: **some are purchased** with
M8's currency once that milestone exists, **some are unlocked** through
progression (an achievement, M6 world/base completion, etc.) —
acquisition method is a property of the ship, not a single global rule.
This same purchase-or-unlock model applies to equipment items in M9 too
(noted there as well, so the two milestones don't drift into
inconsistent acquisition rules).

**Scope**: `src/game/ships/ship.ts` (a `ShipClass` config: id, name,
class/archetype, `dryMass`, `baseThrustAccel`, `fuelCapacity`, `burnRate`
(fuel consumed per second at full thrust — needed by §6b.1's
fuel-efficient-ship archetype and every worked fuel-margin example in
§6b.5/§9.5.7), `handling` (rotation rate in deg/s — named to match every
consumer of this stat, §6b.2/§6b.5/§9.5, rather than "rotation speed"),
**equipment slot count** (consumed by M9), and an `acquisition` field — `{ type: 'starter' }` \| `{ type: 'purchase'; price: number }` \|
`{ type: 'unlock'; condition: ... }`). **Thrust model, made explicit**
(resolves an ambiguity §6b.6 item 2 flagged in the original "mass or
thrust multiplier" phrasing): `engineForce = baseThrustAccel × dryMass`,
held fixed — bolting on equipment/cargo mass lowers realized acceleration
without touching the engine itself; see the M9 amendment below for the
full `effectiveThrustAccel` formula this feeds. Two more fields, added by
Milestone 9.5 (cheaper to bake into this not-yet-built interface now than
retrofit after M7 certifies): `massBudget: number` (total mass-units this
class can carry across equipment _and_ cargo combined — conceptually
paired with M9's mass-budget mechanism, not a separate ceiling) and
`cargoBayCapacity: number` (a secondary, cargo-only ceiling; `0` is valid,
for combat-archetype classes with no cargo bay regardless of leftover
`massBudget`), plus `fuelPerDistanceUnit: number` (consumed only by
M9.5's relay transit-fuel formula). `src/game/ships/ships.ts` (registry: 5
`starter` ships + at least 2 more split across `purchase` and `unlock`), a
ship-select screen (extends M3/M6's menu system, showing locked ships
with _why_ they're locked — price or unlock condition), `FlightState`/
`GameScene` taking the selected ship's stats instead of the current
hardcoded `THRUST_ACCEL`/`MAX_FUEL`/etc. The actual purchase transaction
is M8's job (a generic mechanism that sells anything with a price tag,
ships here and equipment in M9) — this milestone only needs the ship data
model and read-only "is it available" logic; wiring a real purchase
button is acceptance criteria for M8, not this milestone.

**Acceptance criteria**: selecting different ships/classes produces
measurably different flight feel (integration-tested, same pattern as
M5's body-variation test); locked ships are visible with their
acquisition method shown, but not selectable until purchased or unlocked.

**Required tests**: unit tests for the ship registry (valid/distinct
configs, every `acquisition` variant represented); integration test
comparing two ship classes' handling under identical input; a
selection-screen test (unit or e2e) asserting a locked ship's entry is
rendered but its select action is a no-op/disabled until its
`acquisition` condition is met.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M3.

---

### Milestone 8 — Economy & Store (not started)

**Goal**: A fictional currency (Decision D15 — placeholder name
"Credits", trivially renamed later) earned per completed mission based on
M4's scoring formula, and a store UI to spend it.

**Scope**: `src/game/economy/currency.ts` (pure score-to-currency
conversion, persisted balance via M4's pattern), a `StoreScene` — a
generic mechanism that sells anything with a price tag, gated by currency
balance. At M8's own build time the only sellable catalog is M7's ships
(purchasable ships from M7's `acquisition: { type: 'purchase' }` roster);
M9 later registers its own equipment items into this same mechanism
without M8 needing to change.

**Acceptance criteria**: completing a mission credits currency
proportional to its score; the store correctly gates purchases on
sufficient balance; a purchase persists and survives a reload.

**Required tests**: unit tests for the score-to-currency formula and
balance persistence (including corrupted-data handling); e2e test
completing a mission, checking the balance increased, then buying
something in the store.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M4 and M7.

---

### Milestone 9 — Ship Upgrades & Equipment Loadout (not started)

**Goal**: Two distinct upgrade categories, both purchasable via M8's
store (Decision D14):

1. **Permanent stat upgrades** — stronger engines (higher thrust), lighter
   materials (better thrust-to-weight), longer boost (increased fuel
   capacity/burn efficiency). Bought once, always active, no slot cost.
2. **Equipment loadout** — weapons and non-combat "boost" utility items
   (e.g. an emergency thrust burst, a temporary shield charge, a repair
   kit — exact roster finalized at implementation time), each equipped
   into a limited number of slots (the slot _count_ comes from the
   selected ship's class, M7) before a mission, and each **carrying a
   mass value that adds to the ship's total mass**. Like ships (M7), each
   equipment item is acquired either by purchase (M8) or by unlock
   (progression) — same dual model, same reasoning: not everything
   should be a flat currency purchase. Heavier loadouts mean
   worse thrust-to-weight (the same mass-vs-acceleration relationship M7's
   `dryMass`/`baseThrustAccel` and world gravity already combine to
   produce — see the M9 amendment below for the exact formula) — so
   clearing a hostile-heavy base by loading up on weapons costs you
   thrust-to-weight, and the player must weigh equipment choice against
   the specific base's demands.
   This is the concrete mechanic behind the explicit design goal: "account
   for your equipment carefully to complete the desired base successfully."
   **Every item's definition is a pros-and-cons bundle, not a single
   dial**: mass is always a con, paired with a specific pro — e.g. a
   bigger fuel tank trades mass for more fuel capacity (range vs.
   handling), a shield trades mass for absorbed hits (survivability vs.
   handling), a heavier weapon trades mass for more damage (offense vs.
   handling). Each equipment definition should carry at least one
   explicit benefit stat alongside its mass cost, so loadout choice is a
   genuine multi-attribute tradeoff per base, not just "equip everything
   until the mass budget runs out."

**Scope**:

- `src/game/ships/upgrades.ts` — permanent upgrade definitions (stat +
  amount), applied to a ship's base `ShipClass` stats.
- `src/game/equipment/` — equipment item definitions (id, name, mass,
  slot type `'weapon' | 'utility'`, and either weapon stats consumed by
  M11's combat resolution, or a utility effect — e.g. a temporary stat
  modifier for boost items); a per-ship loadout (which purchased items
  are currently equipped, within a slot-count and/or mass budget).
  **Thrust-to-weight formula, made explicit** (so Milestone 9.5 reuses it
  exactly instead of reinventing it):
  `effectiveThrustAccel = shipClass.baseThrustAccel × shipClass.dryMass / (shipClass.dryMass + totalCarriedMass)`,
  where `totalCarriedMass` is the sum of every equipped item's mass (M9.5
  extends this same variable to also include cargo mass — same formula,
  same variable, no parallel formula). The hard constraint this implies —
  `Σ equippedItemMass ≤ shipClass.massBudget` — is likewise formalized
  here as the named limit M9's acceptance criteria already assume but
  don't spell out.
- Authors `src/game/bases/fit-check.ts` — the `evaluateBaseFit` facade
  (§6b.2: takes `ShipClass` (M7), `PermanentUpgrade[]`/`EquipmentItem[]`
  (this milestone), `CelestialBody` (M5), and `Base` (M6), returns a
  `BaseFitResult` covering the mechanical/spatial/combat branches). Placed
  here, not M6, because this is the first point in the build sequence
  where all of its required types exist (§6b.3 point 4). Consumed by the
  pre-mission loadout screen below for live pre-launch warnings, and
  reused headlessly by per-base `*.solvability.test.ts` fixtures (§6b.7).
- **Cycling and triggering, as input/UI (not combat resolution — that's
  M11)**: a cycle input switches the _active_ weapon among equipped
  weapons; a separate cycle input switches the _active_ utility item; a
  trigger input activates the currently-selected item of each kind (fire
  for weapons, activate for utility). `GameScene` reads "what's currently
  selected and was it just triggered," and hands off to M11 (weapons) or
  applies the utility effect directly (non-combat).
- A pre-mission loadout screen (extends M6/M7's menu flow) to choose
  equipped items within the current ship's slot/mass budget.

**Acceptance criteria**: an upgraded ship measurably outperforms its base
stats (integration-tested); equipping items increases total mass and
measurably degrades thrust-to-weight (integration-tested, same pattern as
M5/M7's variation tests); every equipment item's benefit stat is verified
to actually apply (e.g. a larger fuel tank's capacity bonus really is
available in-flight, not just subtracted mass with no offsetting effect);
cycling changes the active weapon/utility item; triggering activates
exactly the currently-selected item; loadout and upgrades persist across
a reload and across mission attempts.

**Required tests**: unit tests for each permanent upgrade's stat
modification, each equipment item's paired benefit-stat + mass-cost
application, and cycle/trigger-selection logic (all pure); integration
test comparing upgraded-vs-base and light-loadout-vs-heavy-loadout ship
performance across at least two different equipment tradeoffs (e.g.
fuel-tank-vs-handling and shield-vs-handling); an e2e reload test
(same pattern as M4/M8's persistence tests) asserting upgrades and the
current loadout survive a real page reload.

**Required quality gates**: full gate list, must stay green.

**Scope-creep flag**: this milestone bundles six independently-testable
subsystems (permanent stat upgrades, the equipment/mass system,
`effectiveThrustAccel`, the `fit-check.ts` facade, cycle/trigger input,
and the loadout screen). If implementation reveals any one of them is
substantial enough to destabilize the others' review, split it into its
own sub-milestone (M9a/M9b/...) rather than certifying all six at once —
noted here so the split is a deliberate option, not a scope discovery
made partway through a stalled PR.

**Certification checklist**: not started. Depends on M8.

---

### Milestone 9.5 — Mission & Cargo Delivery System (not started)

**Goal**: Turn "land safely" into a real mission with a purpose. A mission carries cargo (troops or supplies) whose mass draws from the _same_ mass budget as M9's equipped weapons/utility items — cargo, weapons, and utility items are one three-way tradeoff, not cargo bolted on as a separate resource. Missions come in three structures (single-trip, timed multi-trip to one base, and relay between two bases/worlds) and two narrative flavors (establishing a new presence vs. resupplying/reinforcing an existing one) that tie directly into M6's world/base unlock progression and M12's achievements.

#### 9.5.1 Cargo model and the shared mass budget

Two cargo types, deliberately built to behave differently:

- **Troops** — discrete, whole-unit-only ("squad" = personnel + minimal gear; you can't deliver 0.6 of a squad). `unitMass = 10` MU (mass units — same non-SI, pixel-space spirit as `GRAVITY_ACCEL`/`THRUST_ACCEL`). `baseUnitValue = 25` credits/squad. Troops represent a permanent capability at the destination (garrison strength) — this is the cargo type Establish Presence missions require.
- **Supplies** — continuously loadable, up to whatever mass remains (a slider/stepper, not discrete inventory — mirrors how fuel is already a continuous 0..100 gauge elsewhere in the codebase). `unitMass = 2` MU/crate. `baseUnitValue = 5` credits/unit. Supplies represent consumables that sustain an existing base — the cargo type Resupply missions require.

**One shared mass pool, not two.** Extending M9's amended formula:

`totalCarriedMass = equipmentMass + cargoMass`, where `cargoMass = troopSquads × 10 + supplyUnits × 2`, and the single constraint is `totalCarriedMass ≤ shipClass.massBudget`. Every troop squad or supply crate loaded is mass that cannot go to a shield or weapon, and vice versa — this is the mechanical core of "cargo vs. weapons vs. shields all draw from one pool," with every unit of that shared mass costing thrust-to-weight (§9's `effectiveThrustAccel`) regardless of which of the three it was spent on.

**`cargoBayCapacity` is a second, narrower ceiling — deliberately not a duplicate of `massBudget`.** It caps only the cargo _portion_ (`cargoMass ≤ shipClass.cargoBayCapacity`), independent of how much of `massBudget` is otherwise free. This is what lets a heavily-armed combat-archetype ship class have `cargoBayCapacity = 0` — physically no hold — even if its `massBudget` has headroom after equipping weapons; and what lets a hauler-class ship have a huge `cargoBayCapacity` relative to its `massBudget`, making it the natural choice for cargo-heavy missions. Both constraints are checked together; failing either blocks launch.

**Pre-mission screen**: extends M9's loadout screen (doesn't replace it) — one shared mass-budget bar, with equipment slots and cargo quantity steppers both filling the _same_ bar, plus a separate, visually distinct cargo-bay-capacity indicator for the cargo portion specifically. A mission's minimum cargo requirement (`minManifest`, e.g. "≥8 troop squads") is shown inline, alongside the mission-brief fields M6's world-map screen already surfaces (load weight, distance to target, target identity, target hostility level, atmosphere/hazard summary); the Launch button is disabled until `minManifest` is met — same UX pattern as M9's slot-count gating.

Fuel is **excluded** from this shared pool — fuel capacity stays a permanent-upgrade stat (M9 category 1, no slot/mass cost), not something competing for mass-budget space. Including fuel mass would mean thrust-to-weight changes continuously mid-flight as fuel burns, more simulation fidelity than this project has committed to anywhere (§4, "arcade game, not a physics sandbox"). `massBudget` stays a fixed, pre-mission quantity, consistent with M9's own acceptance criteria being a static, integration-testable comparison, not a live per-frame recalculation.

**Interaction with §6b's base-puzzle difficulty/requirements design**: `minManifest` is one more requirement dimension of exactly the same general shape §6b's `evaluateBaseFit` already checks (cargo capacity, fuel range, and whatever difficulty-tag requirements §6b defines, all evaluated together, each individually named in the UI when it fails) — not an incompatible parallel mechanism. `fit-check.ts` (M9, §6b.2/§6b.3) is the one composed feasibility check both systems share.

#### 9.5.2 Mission structure taxonomy

Three structures, one shared `MissionDefinition`/`MissionOutcome` event shape so flavor, progression, and achievement logic (§9.5.4) don't need to know or care which structure produced a given landing. **Between every trip/leg, control always returns to the world-map/mission screen** (§9.5.3) — there is no in-place "relaunch" within a single `GameScene` instance, for any of the three structures below:

| Structure                | Description                                                                                                                                                                                                                                                                                                                               | Success                                                                                                                                   | Partial success                                                                                                                                                       | Failure                                                                                                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single-trip**          | Exactly today's certified M2 behavior: one launch, one landing, immediately terminal. Default when no `MissionDefinition` is supplied (existing e2e/unit tests keep passing unmodified).                                                                                                                                                  | Safe landing at the correct pad, with `minManifest` (if any) met.                                                                         | **None** — single-trip is strictly binary.                                                                                                                            | Crash, or landing at the wrong pad/site.                                                                                                                                                                                                                                                      |
| **Multi-trip-same-base** | A cumulative cargo target delivered to one fixed base (same terrain every trip, seeded from the base id) across any number of round trips — each trip its own `GameScene` session, chosen again from the world-map screen — gated by a mission-wide countdown timer that runs continuously regardless of how many trips happen inside it. | Cumulative `delivered ≥ target` before the timer expires.                                                                                 | `0 < delivered < target` when the timer expires (or, under `crashPolicy: 'endMission'`, when a crash ends the mission early with partial progress banked).            | `delivered === 0` when the timer expires.                                                                                                                                                                                                                                                     |
| **Relay**                | Pickup at one base (possibly a different world), transit (abstracted, non-interactive), delivery at a second base. Cargo is loaded once at the origin and is one indivisible payload — not cumulative.                                                                                                                                    | Safe landing at origin (cargo loads) **and** safe landing at destination (cargo delivered), with sufficient fuel to complete the transit. | **None in v1** — relay is binary, deliberately (see §9.5.8, item 7). Multi-hop relay with per-hop partial credit is flagged as a future v2 extension, not built here. | Crash at either leg (cargo lost, mission ends immediately), **or** a distinct "stranded" failure: fuel remaining after the origin leg is less than the computed transit cost (checked before cruise begins; cargo lost, mission fails — different failure mode from a crash, same end state). |

Cargo per trip/leg is credited **only on confirmed safe touchdown, never in-flight** — if a multi-trip mission's timer expires mid-descent, that trip's cargo (never touched down) is simply never credited. This is a single, simple invariant across all three structures: `recordDelivery()` is called from exactly one place, the safe-landing branch, never from a timer-expiry or crash branch.

Cargo quantity per trip is **player-chosen at each launch's loadout screen** (not a mission-defined constant) — bounded by the ship's `cargoBayCapacity`/`massBudget` and by the mission's remaining need. This generalizes cleanly: a player can overshoot (deliver more than strictly required, banking extra `cargoReward`) or take a smaller, safer load on a later trip if an earlier one crashed. A crash under `crashPolicy: 'loseTripOnly'` returns the player to the world-map screen with that trip's cargo lost and the mission clock still running, exactly like a successful trip does — the only difference is what got credited, not how the player gets back to choosing their next action (§9.5.3).

#### 9.5.3 Changes required to the certified Milestone 2 `GameScene`

**Amended after this design was first drafted**: the person building this game clarified the actual intended flow — _"after a successful landing the loading and takeoff will always be automated to the planet choice screen where you choose the destination with the loadout."_ This is a simpler, more consistent model than an in-place "hold thrust to relaunch" mechanic within one `GameScene` instance, and is adopted in full below. It also **substantially reduces** the restructuring cost an earlier draft of this section flagged as significant — most of what follows is closer to additive than that draft, not because the estimate was wrong, but because the corrected UX genuinely needs less.

**The corrected model**: every trip/leg is its own complete `GameScene` session, exactly like today's certified single-trip flow — launch, fly, land-or-crash, **always exit the scene** (never an in-place relaunch). What happens next (another trip to the same base, a relay's second leg, a completely different mission, or just returning to the world map) is decided entirely by the menu/world-map flow, not by `GameScene` itself. Cargo loading and "takeoff" are administrative — resolved automatically between scenes, never a manual in-scene action.

**What changes, concretely** (read against `src/game/scenes/game-scene.ts` lines 61-195):

1. **`GameScene` optionally receives mission context via scene launch data**: `{ mission?: MissionContext }`, where `MissionContext` names the mission id, which base, and how much cargo this specific trip is carrying. **Absent `mission` reproduces certified M2 behavior byte-for-byte** — the existing e2e smoke/landing specs need zero modification.
2. **`create()` needs no new per-trip/per-leg branching.** Since every trip is a fresh scene instance, the existing single-pass `create()` already does exactly the right thing each time — generate terrain, build the visual, construct a `FlightState`, position the lander at its normal spawn point. No trip-setup/relaunch split, no ground-clearance fix, no "is this trip 1 or trip 2+" branching — those were only needed for the in-place-relaunch model this correction replaces. One real addition: terrain generation is seeded from the `base.id` (not the wall-clock seed M2 currently uses) whenever `mission` is present, so revisiting the same base within one mission (another trip, or a later Resupply mission) presents the _same_ terrain layout — fair and consistent, rather than a fresh random layout every attempt.
3. **`update()`'s existing two-branch structure barely changes.** The `outcome !== 'flying'` branch still freezes the scene on landing/crash exactly as it does today — the only change is _what happens after the brief result display_. With no `mission` in scene data: unchanged, `R` triggers `scene.restart()`, identical to certified M2 behavior. With `mission` present: after the outcome displays (safe landing or crash), the scene automatically transitions to the world-map/mission screen (`this.scene.start('WorldMap', { mission: updatedMissionState })`) instead of waiting on `R` — crediting cargo to `this.registry`'s `MissionState` first if the landing was safe and at the correct base/pad (§9.5.2's touchdown-only invariant). **This also eliminates the R-key-overload UX concern an earlier draft of this section flagged**: `R` never means two different things depending on mission state, because the mission-context path never uses `R` for progression at all.
4. **The mission-wide timer / mid-flight-expiry edge case** still needs a deliberate resolution: if the mission-wide timer reaches zero while the ship is still airborne mid-descent, the in-progress trip is not artificially frozen or interrupted — physics and input continue exactly as before, and the trip resolves naturally to `'landed'`/`'crashed'` one or more frames later. A `missionTimerExpired` flag (set the instant the timer hits zero) suppresses cargo crediting for that trip regardless of which way it naturally resolves; the scene then transitions to the world map exactly as in point 3, carrying the finalized `missionStatus` (`'partial'`/`'failure'`, from the cumulative `delivered`-vs-`target` comparison).
5. **Relay legs need no special-case scene bridging beyond what every other mission-context trip already does.** Under this corrected model, _every_ trip/leg (multi-trip or relay) already exits to the world-map/mission screen between attempts, so a relay's second leg is just another instance of that same pattern. A `TransitScene` (or an equivalent transit step folded into the world-map screen) is still needed to render the animated origin→destination transfer and deduct transit fuel (§9.5.6) — but it's reached via the exact same "scene exits to the mission/world-map flow" path every other trip uses, not a relay-only special case.
6. **`MissionState` persistence** lives on `this.registry` (Phaser's game-global `DataManager`, which survives a `scene.start()` to a different scene key), since mission state must survive genuine scene changes between trips/legs, which `this.data` does not. The existing per-scene `this.data.set('outcome', ...)` contract (and its e2e test) is preserved exactly as today — scoped correctly to one `GameScene` instance's lifetime, since `outcome` never needs to survive past its own trip's scene instance under this model.
7. **Fuel resets to full at the start of every trip** (recommendation, not forced by any technical constraint) — "you refuel at base/menu between trips."
8. **HUD additions are purely additive**: new text objects for delivered/target cargo and a countdown timer, added beside the existing `fuelText`/`outcomeText`, no deletion of existing HUD code.

**Summary — additive vs. restructuring, corrected**:

| Change                                                                   | Additive                                                                       | Restructures certified code                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `MissionState`/`MissionContext`/cargo/relay-math modules (all new files) | ✅ pure, zero Phaser dependency, unit-testable exactly like `flight-state.ts`  |                                                                                                               |
| `terrain-generator.ts`, `landing.ts`, `lander-physics.ts`, `FlightState` | ✅ zero changes — a trip/leg is just another call to the same pure functions   |                                                                                                               |
| `GameScene.create()`                                                     | ✅ unchanged control flow; only a seed-source change when `mission` is present |                                                                                                               |
| `GameScene.update()`                                                     |                                                                                | ✅ the post-outcome branch gains a scene-transition path when `mission` is present, instead of waiting on `R` |
| `outcome` field / data-manager contract                                  | ✅ unchanged meaning and scope                                                 |                                                                                                               |
| New `TransitScene` (or transit step in the world-map flow)               | ✅ new scene, reuses `WorldMapScene` rendering                                 | touches scene-transition wiring in `main.ts`/scene registry                                                   |
| Cross-scene `MissionState` persistence                                   |                                                                                | ✅ new for this codebase — uses `this.registry`                                                               |
| HUD                                                                      | ✅ new text objects only                                                       |                                                                                                               |

This is a meaningfully smaller restructuring footprint than an earlier draft of this section estimated — most of that cost was specifically the in-place relaunch mechanic (a `startTrip()` split, a ground-clearance fix, the trip/mission-status split needing to survive within one scene instance), which the corrected always-exit-to-menu flow doesn't need at all.

#### 9.5.4 Mission flavors and tie-in to Milestone 6 / Milestone 12

Two flavors, orthogonal to the structure taxonomy above (a relay can carry either flavor; multi-trip is typically but not exclusively Resupply):

- **Establish Presence** — founding a new site. Offered only at bases in `discovered-unclaimed` status. Requires troop cargo (a garrison). Success is binary safe-landing-with-manifest-met (no partial concept — see §9.5.2). Reward: standard formula (§9.5.5) multiplied once by `ESTABLISH_PRESENCE_BONUS_MULTIPLIER = 2.5`, since it's the only mission that base will ever pay this bonus (it cannot be repeated once established). On success: `baseStatus[baseId]` flips `discovered-unclaimed → established`, every id in that base's `unlocks` list flips `locked → discovered-unclaimed` (revealing that base's world on the map too, if it's the first discovered base there), `establishedAt[baseId]` is recorded, and an achievement-eligible `MissionOutcome` event fires.
- **Resupply/Reinforcement** — sustaining a site that's already established. Offered only at `established` bases. Requires supply cargo (or troop cargo for a reinforcement variant, mechanically identical). Repeatable indefinitely. Reward: standard formula, no flavor multiplier. No `baseStatus` mutation — increments `resupplyCounts[baseId]` only, which feeds M12 achievements but never gates world-map progression. This is the deliberate design point: the critical path to farther worlds is one one-time action per critical-path base (never a grind wall), while resupply still has real purpose (currency, ship/equipment unlock conditions keyed to mission counts, achievements).

**Starting-state resolution** (amends M6's acceptance criterion): the game's opening mission _is_ an Establish Presence mission — the player founds their own home base. This teaches the mechanic immediately, hands the player the "first ever" achievement as their first toast, and after that mission the home base is `established` and all further home-base missions are Resupply.

**Achievement triggers this milestone emits, for M12 to consume later** —
**M9.5 does not depend on M12** (M12 is roadmap position 11, three after
M9.5 at position 8; M9.5's own Certification checklist correctly lists
only M6/M8/M9). What M9.5 actually does is emit a `MissionOutcome` event
with enough shape for M12 to eventually wire the five triggers below —
firing the toast, checking "already unlocked," and persisting the
unlocked-achievement set are entirely M12's job and M12's own acceptance
criteria to certify, not this milestone's. This table exists so M12's
implementer has the exact trigger list up front, the same
forward-declare-the-shape-now pattern already used for `Base.encounters`
(M6 declares the field, M11 populates it):

| id                        | Display text                                                        | Trigger                                                              |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `first-presence`          | "Boots on the Ground"                                               | First-ever completed Establish Presence mission, any base            |
| `world-pioneer-<worldId>` | "Pioneer of \<World\>"                                              | First base established on a world with zero prior established bases  |
| `full-claim-<worldId>`    | "World Secured: \<Name\>"                                           | Every base on that (multi-base) world reaches `established`          |
| `resupply-streak-<tier>`  | "Lifeline" (5) / "Old Reliable" (10) / "Backbone of the Fleet" (25) | `resupplyCounts[baseId]` (or a global sum) crosses the threshold     |
| `frontier-claimed`        | "Frontier Claimed"                                                  | Establish Presence completed at every critical-path base in the game |

Data this milestone does persist (via M4's existing validated-`localStorage`
pattern, regardless of whether M12 has landed yet — M9.5 needs these
counters for its own Resupply/critical-path logic independent of
achievements): `resupplyCounts: Record<string, number>` and
`establishedAt: Record<string, number>`. M12, once built, reads these same
two records rather than inventing its own copies.

#### 9.5.5 Reward formula (extends M4/M8, doesn't replace either)

```
massUtilization   = totalCarriedMass / shipClass.massBudget                    // 0..1
riskBonus         = 1 + CARGO_RISK_BONUS_COEFFICIENT × massUtilization         // coefficient 0.5 → range 1.0–1.5

perTripCargoReward = Σ over cargo types: unitsDeliveredThisTrip × baseUnitValue(type) × riskBonus
missionCargoReward = Σ over every trip/leg that ended in a credited safe landing  // naturally prorates a partial multi-trip mission — no separate proration formula needed

flavorMultiplier  = (flavor === 'establish-presence') ? ESTABLISH_PRESENCE_BONUS_MULTIPLIER : 1.0   // 2.5 : 1.0

missionReward     = MISSION_BASE_COMPLETION_REWARD                             // 100 credits, paid once, only on success or partial
                   + missionCargoReward × flavorMultiplier
                   + m4ScoreBonus(fuelRemaining, time, precision)               // existing M4 formula, summed per successful trip/leg, unchanged
```

`missionCargoReward` for a crashed trip/leg is `0` — cargo is destroyed, not partially credited — this holds uniformly across all three structures (single-trip's one landing, each of multi-trip's trips independently, relay's one indivisible payload).

**Relationship to `Base.firstClearCredits` (§6b.2)**: `missionReward`
**replaces** `firstClearCredits` once this milestone lands — a base clear
becomes a mission (this milestone's whole point), and a mission's reward
is `missionReward`, not the flat per-base constant. `firstClearCredits` is
the pre-M9.5-only value: it's what a base pays if a session ever needs to
score a bare "land safely, no mission" clear before this milestone exists
(exactly M2/M6's certified/certifiable scope, which has no cargo, no
flavor, nothing for `missionReward`'s formula to compute over). §6b.4's
soft-lock affordability proof, built before this milestone existed, uses
`firstClearCredits` numbers throughout — that proof is correct as
pre-M9.5 arithmetic and is not re-derived here, but a reader should not
expect its reward figures to match this section's worked examples
(§9.5.7), which use `missionReward` exclusively and are consistently
10-20x larger for the same bases, reflecting cargo value the earlier
proof's flat constants never accounted for.

#### 9.5.6 Relay-specific mechanics

`transitDistanceTU(origin, dest)` reuses M5's `CelestialBody.distance` (TU) for cross-world legs and M6's new `localOffset` (TU) for same-world legs — one formula, two magnitudes, no special-casing (same-world offsets are small, ~1–5 TU; world distances are 0–210+ TU):

```
distanceTU = sameWorld ? |originBase.localOffset − destBase.localOffset|
                       : |destWorld.distance − originWorld.distance|

transitFuelCost = TRANSIT_LAUNCH_OVERHEAD                                      // 8 fuel units, launch-to-transfer-orbit burn
                + distanceTU × shipClass.fuelPerDistanceUnit
                  × (shipClass.dryMass + totalCarriedMass) / shipClass.dryMass  // heavier cargo/equipment load = costlier transit
```

Deducted from the same fuel pool used for descent thrusting — deliberate: a ship must arrive at the origin with enough reserve for (transit + a second flown descent), not just enough to get there. Hazard effects (M5's corrosive drain / cold thrust-efficiency) apply only during a _flown descent leg_ at that body, never during the abstracted transit.

A relay mission is only selectable when **both** origin and destination bases are currently `discovered-unclaimed` or better (Establish Presence relays need the destination `discovered-unclaimed`; Resupply relays need it `established`) — composes for free with M6, no new unlock mechanism.

**Pre-launch feasibility gate** (composed pure function, same "greyed out with a stated reason" UX pattern as M7's locked ships):

```
relayFeasibility(mission, shipClass):
  if cargoMass(mission.manifest) > shipClass.cargoBayCapacity → infeasible: "cargo exceeds hold capacity"
  if cargoMass(mission.manifest) + equipmentMass > shipClass.massBudget → infeasible: "cargo + equipment exceeds mass budget"
  if estimateDescent(origin) + transitFuelCost + estimateDescent(dest, loaded=true) > shipClass.fuelCapacity → infeasible: "insufficient fuel range"
  else → feasible
```

A relay may fail on cargo capacity alone, fuel range alone, both, or neither — these are independent gates (§9.5.7, Example F demonstrates a mission the entire roster currently fails).

**Acceptance criteria**:

- Cargo (troops/supplies) mass is checked against the _same_ `massBudget` constraint as M9's equipment, and against the additional `cargoBayCapacity` ceiling — integration-tested: two loadouts with identical total mass (one all-cargo, one cargo+weapon) produce identical `effectiveThrustAccel` but different `missionReward`.
- Single-trip missions with no `MissionDefinition` supplied reproduce certified M2 behavior exactly — the existing e2e smoke/landing specs pass unmodified.
- A multi-trip-same-base mission: cargo credits only on confirmed safe landing; a crash under `loseTripOnly` doesn't end the mission and doesn't credit that trip's cargo, and returns the player to the world-map screen with the mission clock still running; the mission-wide timer expiring mid-flight lets the in-progress trip resolve naturally (§9.5.3, point 4) and discards that trip's cargo regardless of the natural outcome, then resolves `success`/`partial`/`failure` correctly from cumulative `delivered` vs. `target`.
- A relay mission: cargo loads only after a safe origin landing; total mass increases for the outbound leg (measurably worse `effectiveThrustAccel`, integration-tested); a crash on either leg or an under-fuel transit fails the mission and loses the cargo; a successful destination landing credits reward and, for Establish Presence, flips base status and unlock state correctly.
- Establishing a base flips its status, opens every base in its `unlocks` list, and is a one-time-only bonus (a second attempt at an already-established base's site is simply not offered — Resupply is offered instead).
- At least one relay mission in the shipped registry is genuinely infeasible for every ship class in the current roster, and the mission-select UI states why (cargo gate, fuel gate, or both) rather than silently hiding it.
- Every state change the achievement table depends on (`resupplyCounts`, `establishedAt`, a base reaching `established`) is correctly tracked and persisted by this milestone — but _firing the achievement itself_ is M12's acceptance criteria to certify, not this milestone's; M9.5 only has to prove the underlying counters are right.
- Every trip/leg, regardless of outcome, returns the player to the world-map/mission screen — never an in-place relaunch prompt (§9.5.3).

**Required tests**:

- Unit: cargo-mass/mass-budget/cargo-bay-capacity checks (pure); `MissionState`'s `recordDelivery`/`isTargetMet`/`resolveFinalStatus`/`isTimeExpired` (pure, Node-only, same philosophy as `flight-state.ts`); reward formula (`riskBonus`, `flavorMultiplier`, per-trip vs. cumulative summation); relay distance/fuel/feasibility functions (same-world vs. cross-world distance, fuel scaling with distance and mass, all four cargo/fuel-gate quadrants); base-status state-machine transitions (`locked→discovered-unclaimed→established`, `unlocks` propagation).
- Integration: same ship, cargo-loaded vs. unloaded, measurably different descent time/fuel burn under identical input (same methodology as M5's body-variation and M7's ship-variation tests); a full multi-trip sequence (success, partial, and failure end states) driven through `MissionState` without Phaser, including a timer-expiry-mid-flight case verifying the trip resolves naturally and is uncredited either way; a full relay sequence (both legs, cargo mass change between legs, transit fuel deduction) covering **both** the success path **and** the two failure paths: a crash on either leg (cargo lost, mission ends immediately) and an under-fuel "stranded" failure (fuel remaining after the origin leg is less than the computed transit cost, checked before cruise begins — a distinct failure mode from a crash per §9.5.2, not merged into the same test case).
- E2E: a full single-trip flow reproduces existing M2 behavior; a multi-trip mission's first trip ends at the world-map screen (not an in-place relaunch prompt), and launching a second trip to the same base from there continues the same mission; the `outcome`/`missionStatus` data-manager keys both observable and correctly separated; the mission-select screen actually renders the "infeasible, here's why" message (cargo gate, fuel gate, or both) for the roster's known-infeasible relay mission (§9.5.7 Example F) — a UI-rendering assertion, not just the underlying `relayFeasibility` unit test.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on **Milestone 6**, **Milestone 8**, and **Milestone 9**.

#### 9.5.7 Worked examples

Ship classes (extends M7):

| Class   | dryMass (MU) | baseThrustAccel (px/s²) | massBudget (MU) | cargoBayCapacity (MU) | equipmentSlots | fuelCapacity | fuelPerDistanceUnit |
| ------- | ------------ | ----------------------- | --------------- | --------------------- | -------------- | ------------ | ------------------- |
| Scout   | 250          | 54                      | 90              | 60                    | 2              | 140          | 1.4                 |
| Courier | 400          | 46                      | 200             | 160                   | 3              | 180          | 1.0                 |
| Hauler  | 650          | 40                      | 380             | 340                   | 4              | 260          | 0.75                |

Equipment (M9): Light Cannon (weapon, 40 MU, 12 dmg/hit), Deflector Shield (utility, 60 MU, absorbs 1 hit), Aux Fuel Tank (utility, 30 MU, +25 fuel capacity).

Worlds (extends M5, distances in TU): Kessel's Reach (home, airless, distance 0, no hazard) → Verdalis (thin atmosphere, distance 42, no hazard) → Pyrrhine Expanse (thick atmosphere, distance 95, corrosive) → Glacian Drift (extreme cold, distance 210, cold).

Bases (extends M6, `localOffset` in TU): Anchor Station (Kessel's Reach, 0, critical path, `unlocks: [meridian-yard, scarp-outpost]`), Scarp Outpost (Kessel's Reach, 2.4, spur), Meridian Yard (Verdalis, 0, critical path, `unlocks: [rustwell-landing]`), Rustwell Landing (Pyrrhine Expanse, 0, critical path, `unlocks: [frostgate]`), Frostgate (Glacian Drift, 0, critical path). Starting state: Anchor Station `discovered-unclaimed`, everything else `locked`.

Constants used: `MISSION_BASE_COMPLETION_REWARD = 100`, `CARGO_RISK_BONUS_COEFFICIENT = 0.5`, `ESTABLISH_PRESENCE_BONUS_MULTIPLIER = 2.5`, `TRANSIT_LAUNCH_OVERHEAD = 8`. Descent-leg fuel figures below are illustrative typical-skilled-pilot values (only the transit-fuel term is exactly formula-computable pre-flight; descent burn depends on player input, which is why `relayFeasibility` uses an _estimated_ worst-case descent cost, not an exact one).

**Example A — Single-trip, Establish Presence (tutorial: founding Anchor Station)**
Ship: Courier, unarmed. Manifest: 6 troop squads (`minManifest: {troops: 6}`). `cargoMass = 60` MU, `equipmentMass = 0`, `totalCarriedMass = 60` (≤ `cargoBayCapacity` 160, ≤ `massBudget` 200). `massUtilization = 0.30` → `riskBonus = 1.15`. `effectiveThrustAccel = 46 × 400/460 = 40.0` px/s² — comfortable margin over `GRAVITY_ACCEL = 18`, appropriate for a tutorial. `cargoReward = 6 × 25 × 1.15 = 172.5 ≈ 173`. `missionReward = 100 + 173 × 2.5 + m4ScoreBonus ≈ 533 + scoreBonus`. On safe landing: Anchor Station `discovered-unclaimed → established`; Meridian Yard and Scarp Outpost flip to `discovered-unclaimed`; Verdalis becomes visible on the world map; `first-presence` achievement fires.

**Example B — Single-trip, Resupply (Anchor Station, now established)**
Ship: Scout, Light Cannon equipped (40 MU). Cargo: 20 supply units (40 MU). `totalCarriedMass = 80` (≤ 90 `massBudget`, cargo portion 40 ≤ 60 `cargoBayCapacity`). `massUtilization = 0.889` → `riskBonus = 1.444`. `effectiveThrustAccel = 54 × 250/330 = 40.9` px/s². `cargoReward = 20 × 5 × 1.444 = 144.4 ≈ 144`. `missionReward = 100 + 144 + scoreBonus = 244 + scoreBonus` (no flavor multiplier). `resupplyCounts['anchor-station']++`; no base-status change.

**Example C — Multi-trip-same-base, timed, Resupply (Meridian Yard, established off-screen prior to this example)**
Definition: `cargoTargetUnits = 60` supplies, `timeLimitSeconds = 300`, `crashPolicy = 'loseTripOnly'`. Ship: Courier, unequipped, 20 supply units chosen each trip (40 MU/trip, `riskBonus = 1.1`, `perTripCargoReward = 20 × 5 × 1.1 = 110`).

- `t=0:00` mission starts, terrain generated once (seeded from `meridian-yard`, reused every trip).
- `t=0:00–0:40` Trip 1: safe landing, scene exits to world-map screen. `delivered = 20/60`, reward banked 110.
- `t=0:50–1:30` Trip 2 (attempt, relaunched from the world map): crash. `loseTripOnly` → that trip's cargo lost, `delivered` stays 20/60, reward banked 0, scene exits to world-map screen exactly as a safe landing would.
- `t=1:35–2:10` Trip 2 (retry, launched again from the world map, mission clock untouched): safe landing. `delivered = 40/60`, reward banked 110 (running total 220).
- `t=2:20–2:55` Trip 3: safe landing. `delivered = 60/60` → target met → `missionStatus = 'success'` immediately, no further trips offered.
  `missionReward = 100 + (110+0+110+110) × 1.0 + Σ scoreBonus = 100 + 330 = 430 + scoreBonus`. Elapsed 2:55 of a 5:00 budget.

**Example D — Same-world relay, Establish Presence (Anchor Station → Scarp Outpost, both Kessel's Reach)**
`distanceTU = |0 − 2.4| = 2.4`. Ship: Courier. Manifest: 10 troop squads (100 MU, ≤160 cargoBayCapacity, ≤200 massBudget), unequipped. `massUtilization = 0.5` → `riskBonus = 1.25`. `totalMassFactor = 500/400 = 1.25`. `transitFuelCost = 8 + 2.4 × 1.0 × 1.25 = 11.0` fuel units. Fuel budget: ~35 (unloaded origin descent) + 11 (transit) + ~45 (loaded destination descent) ≈ 91 of 180 fuelCapacity — comfortable. `cargoReward = 10 × 25 × 1.25 = 312.5 ≈ 313`. `missionReward = 100 + 313 × 2.5 + scoreBonus ≈ 883 + scoreBonus`. On success: Scarp Outpost `discovered-unclaimed → established` (a same-world branch, no new world revealed since Kessel's Reach was already visible).

**Example E — Cross-world relay, Establish Presence (Meridian Yard, Verdalis → Rustwell Landing, Pyrrhine Expanse, corrosive)**
`distanceTU = |95 − 42| = 53`. Ship: Hauler. Manifest: 30 troop squads (300 MU, ≤340 cargoBayCapacity, ≤380 massBudget), unequipped. `massUtilization = 0.789` → `riskBonus = 1.395`. `totalMassFactor = 950/650 = 1.4615`. `transitFuelCost = 8 + 53 × 0.75 × 1.4615 ≈ 66.1`. Fuel budget: ~50 (unloaded origin descent) + 66.1 (transit) + ~70 (loaded destination descent, corrosive-hazard drain active) ≈ 186 of 260 fuelCapacity — feasible, ~74 fuel margin. `cargoReward = 30 × 25 × 1.395 = 1046.25 ≈ 1046`. `missionReward = 100 + 1046 × 2.5 + scoreBonus ≈ 2715 + scoreBonus` — the largest reward in these examples, reflecting the highest narrative/mechanical stakes (founding a hazardous cross-world base). On success: Rustwell Landing established, `world-pioneer-pyrrhine-expanse` fires, Frostgate flips to `discovered-unclaimed`, Glacian Drift becomes visible on the map.

**Example F — Cross-world relay, infeasible (Rustwell Landing, Pyrrhine Expanse → Frostgate, Glacian Drift, extreme cold) — a deliberate surfaced dead end**
`distanceTU = |210 − 95| = 115`. Manifest requirement: 30 troop squads (300 MU) — a harsher garrison requirement reflecting the destination's cold hazard.

- **Scout**: `cargoBayCapacity = 60 < 300` → excluded on cargo, before any fuel math.
- **Courier**: `cargoBayCapacity = 160 < 300` → excluded on cargo.
- **Hauler**: `cargoBayCapacity = 340 ≥ 300` → the only ship that can physically carry it. `totalMassFactor = 950/650 = 1.4615`. `transitFuelCost = 8 + 115 × 0.75 × 1.4615 ≈ 134.1`. Fuel budget: ~55 (origin descent, corrosive-hazard drain) + 134.1 (transit) + ~100 (destination descent, loaded, cold-hazard reduced thrust efficiency compounding an already-poor thrust-to-weight) ≈ **289 fuel needed against a 260 fuelCapacity — short by ~29 fuel, infeasible.** Reallocating the 80 MU of spare mass budget to an Aux Fuel Tank (+30 MU mass, +25 fuel capacity) adds that mass to `totalCarriedMass` (330 MU total), so `totalMassFactor` becomes `(650+330)/650 ≈ 1.508` and `transitFuelCost = 8 + 115 × 0.75 × 1.508 ≈ 138.0` — only ~4 fuel units costlier than before, since the added mass is small relative to the distance-driven term. `fuelCapacity` rises to 285 (260+25). Holding the same descent-fuel estimates (~55 + ~100 = 155): total need ≈ 155 + 138.0 = **293.0 against a 285 fuelCapacity — short by ~8 fuel, still infeasible.**

Result: this mission is currently uncompletable by the entire existing roster. It should render in the mission-select UI as "no owned ship can complete this," the same greyed-out-with-reason pattern M7 uses for locked ships — a deliberate, surfaced dead end (motivating either a future long-range heavy class or a multi-hop relay v2 feature), not a bug to quietly patch.

#### 9.5.8 Contradictions found across the four design-proposal angles (and how this spec resolves them)

1. **Cargo-integrity spectrum vs. all-or-nothing binary.** One proposal wanted a graded cargo-integrity meter (partial payout below 100%); another wanted strict binary (crash destroys everything, safe landing pays in full). **Resolved: binary, v1.** M2's `isSafeLanding` is already a binary pass/fail with no continuous impact-severity output, and no hazard/combat damage model exists yet to generate one. Cargo-integrity-as-a-spectrum is deferred as an explicitly future extension once M10/M11 exist to produce real degradation input.
2. **A separate hard cargo-capacity cap vs. one single shared mass budget.** One proposal wanted `cargoCapacity` as an independent hard ceiling; another wanted cargo and equipment drawing from one pool with no separate cargo ceiling. **Resolved: both, serving different purposes.** `massBudget` (shared, primary) is what creates the actual three-way tradeoff the task requires; `cargoBayCapacity` (secondary, cargo-only, can be `0`) is what lets ship-class _archetype_ exist — a pure combat ship simply can't run cargo missions, independent of its mass headroom.
3. **Fixed per-trip cargo amount vs. continuously-loadable-per-mission cargo.** One proposal modeled `cargoPerTripUnits` as a mission-wide constant (simpler to test); another modeled supplies as a continuous stepper. **Resolved: player-chosen per launch**, bounded by ship capacity and remaining mission need — generalizes the fixed-constant version as a valid non-default special case, and stays faithful to the continuous-loading model.
4. **Milestone placement**: proposals variously recommended M8.5 (between M8 and M9), M7a (after M7, before M8), or folding into M6 — three of the four proposals argued for an earlier slot. **Resolved: new Milestone 9.5, placed after M9.** The shared-mass-budget tradeoff this system depends on is M9's own mechanism — sequencing before M9 would mean defining the mass-budget/thrust-to-weight formula twice. M9.5 is the **first** milestone to merge the M6 (world/base) branch with the M8/M9 (economy/equipment) branch — a genuinely new cross-branch dependency, not a free one, but the right one: a mission-and-cargo system is meaningless without both a world/base graph to unlock (M6) and a mass-budget/equipment system to share cargo's pool with (M9), so the two branches were always going to have to merge somewhere for this feature to exist at all.
5. **M6's base model**: three-state (`locked`/`discovered-unclaimed`/`established`) vs. a simpler binary discovered/locked model. **Resolved**: amend M6's own not-yet-built scope now (§6, M6 amendment) rather than retrofitting after M6 ships — cheaper before certification, and M6 has zero certified code to disturb.
6. **M6's stated starting-state criterion** ("exactly one world and its first base unlocked") is ambiguous once a tri-state model exists. **Resolved**: "unlocked" means `discovered-unclaimed`; the opening mission is itself an Establish Presence mission that establishes the home base — teaches the mechanic immediately and gives the player a free "first ever" achievement moment.
7. **Relay crash policy vs. multi-trip's configurable `crashPolicy`.** Multi-trip missions get a real choice between `endMission` and `loseTripOnly`; relay has no equivalent "retry in place" option. **Resolved deliberately, not by oversight**: relay legs are always effectively `endMission` — a crash on either leg fails the whole relay (cargo lost), because a relay leg isn't retryable in place the way a same-base trip is (different terrain already generated, cargo already loaded/committed). Retrying a failed relay leg means starting the relay mission over from scratch.
8. **Cross-scene persistence** wasn't explicitly addressed by an early draft's `startTrip()`-based design, which assumed everything stays within one `GameScene` instance, while a relay-specific `TransitScene`-bridged design required state to survive a genuine scene change. **Resolved**: `MissionState` lives on `this.registry` (Phaser's game-global `DataManager`, which survives `scene.start()` to a different scene key) for every mission-context trip, not just relay — the existing per-scene `this.data.set('outcome', ...)` contract is left untouched in meaning, with a new `missionStatus` key added alongside it rather than repurposing the original.
9. **In-place relaunch vs. always-return-to-menu.** The original synthesis of this milestone (before adversarial review and before a clarifying instruction arrived) proposed an in-place "hold thrust to relaunch" mechanic within one `GameScene` instance for multi-trip missions specifically, with relay as the one exception requiring a scene change. **Resolved by explicit instruction, after this section was first drafted**: every trip/leg, of every structure, always exits to the world-map/mission screen — never an in-place relaunch. This is not a compromise between two designs; it fully replaces the in-place-relaunch mechanic, which is why §9.5.3 above reads as a correction rather than an amendment. It also collapses relay from "the one structure needing a scene-change mechanism" to "just another instance of the mechanism every structure now uses" — a net simplification, not a special case that needed preserving.

---

### Milestone 10 — Obstacles & Hazardous Conditions (not started)

**Goal**: Static obstacles (rock spires, floating debris) placed in
terrain generation, and per-world environmental conditions beyond
atmosphere (visibility, wind gusts, etc. — exact set finalized when this
milestone starts, informed by M5's hazard framework). **Classification
rule** (§6b.1, resolving a real ambiguity in this goal text's own
"visibility, wind gusts" phrasing): a per-world condition is _mechanical_
(M5's territory) if it changes a term in the flight-model equations
(gravity, drag, thrust efficiency, fuel drain, wind force); it's _spatial_
(this milestone's territory) if it changes the geometry the ship must
navigate (pad width, obstacle placement, terrain shape). Wind is
mechanical; spires are spatial — tag every base accordingly rather than
lumping "M10's own conditions" into one axis.

**Scope**: extends `src/game/terrain/terrain-generator.ts` with the merged
`Obstacle` type (§6b.2: `kind: 'spire' | 'debris'`, `xStart`/`xEnd`/
`yTop`/`yBottom`, plus optional `armorRating`/`cleared` fields — absent
means a pure flight hazard, present once M11 ships means combat-clearable)
and new `src/game/terrain/obstacles.ts` (pure `isCollidingWithObstacle`,
mirroring `landing.ts`'s dependency-free style). `GenerateTerrainOptions`
gains `padStartIndexOverride`, `terrainOverrides`, and `obstacles` — all
optional, so every existing M2 test's `BASE_OPTIONS` keeps compiling and
behaving identically unmodified. Randomized obstacle placement (for any
non-curated/procedural bases) draws from the same seeded PRNG stream that
already produces heights and pad index, strictly after pad placement —
the only way to keep "deterministic given a seed" extending cleanly to
obstacles. Colliding with an obstacle is a crash unless cleared by a
weapon (M11); populates `Base.difficulty.axes.spatial` (§6b.2) for bases
with real obstacle layouts.

**Acceptance criteria** (scoped to what M10 alone can certify — M10 is
built and certified before M11 exists, so nothing below depends on
clearing): obstacles are deterministic given a seed and never overlap the
landing pad; colliding with _any_ obstacle crashes the ship (every
obstacle M10 ships is, by construction, uncleared — `armorRating`/
`cleared` are optional fields M11 populates later, per §6b.2, and are
simply absent on every obstacle M10 itself authors); obstacles are
represented on `Base.terrainOptions.obstacles` and contribute to
`Base.difficulty.axes.spatial`. "A cleared obstacle no longer blocks
flight" is **M11's** acceptance criterion to certify, on M10's data — not
restated here, since M10 can't test a clearing mechanic that doesn't
exist yet at its own certification point.

**Required tests**: unit tests for obstacle placement (determinism,
non-overlap with the pad) and for `isCollidingWithObstacle` against
always-uncleared obstacles; e2e/integration coverage confirming collision
crashes the ship. (Clearing behavior is M11's required tests, against
M10's data — see M11's own section.)

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M5.

---

### Milestone 11 — Weapons & Combat (not started)

**Goal**: A weapons system per Decision D12 (landing + active combat, not
open-ended) — projectile physics, collision with obstacles (clearing
them, M10) and with local hostile inhabitants and enemy ships (simple
behavior, not necessarily complex AI). Weapons clear a landing path and
defend against hostiles, not a standalone shooter. This milestone
implements what firing _does_; M9 already established _which weapon is
selected and when it's triggered_ (cycling + trigger input) — M11 just
wires that trigger event to spawning a real projectile.

**Scope**: `src/game/combat/` — projectile physics (pure-function
trajectories, not Arcade Physics bodies — consistent with §4's physics
philosophy) parameterized by the currently-equipped weapon's stats (from
M9's equipment definitions); `CombatantDefinition` and `EncounterSpec`
(§6b.2: health, `armorRating` — `effectiveDamage = max(0, hit.damage -
armorRating)`, a hit whose damage doesn't clear the armor floor deals
**zero** effective damage, a hard fail rather than a slow grind — attack
stats, and a movement pattern: `static`/`homing`/`diveStrafe`); damage
resolution against shields (M9) before hull. Populates `Base.encounters`
and `Base.difficulty.axes.combat` (§6b.2) for bases with real
encounters; makes `evaluateBaseFit`'s (M9's `fit-check.ts`) combat branch
live instead of `'not-applicable'`.

**Acceptance criteria**: triggering the currently-selected weapon (M9)
clears an obstacle or damages a hostile; a shielded ship absorbs one hit
before taking hull damage; a hostile defeated after enough hits; the
equipped weapon's own stats (e.g. damage, fire rate) measurably change
outcomes (integration-tested).

**Required tests**: unit tests for projectile trajectory and damage
resolution (with/without shields, across different equipped weapon
stats); integration test for a full encounter (approach, trigger, hit,
outcome).

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M9 and M10.

---

### Milestone 12 — Achievements & Notifications (not started)

**Goal**: Achievement definitions (Decision D16 — first landing, first
upgrade purchased, N hostiles defeated, world fully unlocked, etc.) with
toast notifications on unlock.

**Scope**: `src/game/achievements/` — achievement registry (id, trigger
condition, display text), a toast-notification UI component, persisted
unlocked-achievement state (M4's pattern). Implements the five triggers
M9.5 §9.5.4 already specified (`first-presence`, `world-pioneer-<id>`,
`full-claim-<id>`, `resupply-streak-<tier>`, `frontier-claimed`), reading
the `resupplyCounts`/`establishedAt` records M9.5 already persists rather
than inventing new counters — this milestone is the consumer of that
table, not its author.

**Acceptance criteria**: completing a defined trigger (including all five
from M9.5's table) shows a toast and persists the unlock; an
already-unlocked achievement doesn't re-trigger its toast.

**Required tests**: unit tests for trigger evaluation (including each of
M9.5's five triggers against its real `resupplyCounts`/`establishedAt`
shape) and persistence; e2e test triggering at least one achievement and
confirming the toast appears.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M4 and M9.5.

---

### Milestone 13 — Audio, Juice & Accessibility Pass (not started)

**Goal**: Sound effects (thrust, landing, crash, weapons, achievement
unlock), thruster/impact/weapon particle effects, screen shake, and a
full accessibility pass across everything shipped by this point
(colorblind-safe palette check across all worlds/ships/UI, keyboard-
focus-visible menus/store/world-map).

**Scope**: audio asset loading (`BootScene`'s first real use as a
loader), particle/juice effects across `GameScene`/combat/UI.

**Acceptance criteria**: audio boot does not throw or produce an
unhandled rejection when the browser's autoplay policy blocks sound
(concretely assertable — see Required tests below; "respects autoplay
policy" alone isn't something any tool in this project's gates can check
pass/fail, so the criterion is stated as the observable behavior instead);
audio initializes on first user interaction if blocked at boot; Lighthouse
accessibility stays at or above the Milestone 1 baseline (1.00) across
all new UI.

**Required tests**: e2e test asserting zero console errors/unhandled
rejections through boot and first interaction with audio present (extends
the existing console-error assertion pattern from `e2e/game-boot.spec.ts`);
unit test on the audio loader's blocked-autoplay fallback branch (does it
correctly defer to first-interaction rather than throwing); unit tests for
any new particle/juice pure-logic parameters that become configurable.

**Required quality gates**: full gate list, must stay green, including a
fresh Lighthouse accessibility run.

**Certification checklist**: not started. Deliberately last — polishing
systems that need to exist first.

## 7. Definition of Done (per milestone)

A milestone is certified only when **all** of the following are true:

1. Every acceptance criterion in that milestone's section is met.
2. `pnpm quality` passes locally (format, lint, typecheck, unit+integration
   coverage, build, dead-code, secret scan).
3. `pnpm quality:full` passes locally (adds dependency audit + e2e across
   all three browsers). There is no CI (Decision D9) — this is run by
   whoever is making the change, on their own machine, before pushing.
4. `pnpm lighthouse` scores Performance/Accessibility/Best-Practices all
   ≥0.90 (SEO is intentionally not gated).
5. This file is updated: milestone status flipped to CERTIFIED, next
   milestone's "not started" replaced with real progress, any newly
   discovered open questions added to §3.
6. `README.md` and `CHANGELOG.md` reflect the real, current state — no
   stale commands, no claimed-but-missing features.

No milestone is marked complete with a known-failing or unverified gate
silently dropped, and no failing gate gets explained away without actually
fixing it — §5's Lighthouse Performance entry is the concrete example: the
first read of the failure ("sandbox can't measure this") was wrong, and was
corrected by reproducing it on a second machine, finding the real root
cause, and fixing the product/config rather than the documentation.
