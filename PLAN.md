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

| #   | Decision              | Chosen                                                                                                                                                                              | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Rendering engine      | **Phaser 4.2.0** (not 3.x)                                                                                                                                                          | Phaser 3 is frozen at 3.90.0 since 2025-05-23 — legacy. Phaser 4.0.0 went stable 2026-04-10 (after this assistant's Jan-2026 training cutoff, verified live against the npm registry, not assumed). Core `Scene`/`GameObject`/config API is unchanged from v3 (verified directly against `node_modules/phaser/types/phaser.d.ts`); the v4 rewrite is renderer-internal (new WebGL node renderer, unified filter/FX system, GPU-batched sprite/tilemap layers).                                                                                                    |
| D2  | Language              | **TypeScript 6.0.3**                                                                                                                                                                | Required for the strict typecheck gate. Pinned `6.0.3` (not `^6.0.3`) because `typescript-eslint@8.62.1` requires `typescript >=4.8.4 <6.1.0` — a caret range risked a silent break the moment TS 6.1 ships.                                                                                                                                                                                                                                                                                                                                                      |
| D3  | Build tooling         | **Vite 8.1.3 + vanilla TS** (no React)                                                                                                                                              | No app-wide UI state beyond the game itself; Phaser scenes own the canvas and game loop directly. Smallest dependency surface.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D4  | Package manager       | **pnpm 11.10.0**                                                                                                                                                                    | Strict dependency resolution (no phantom deps), fast, disk-efficient. Installed globally via `npm install -g pnpm@11.10.0` since Node 26 no longer bundles Corepack — documented as a required one-time global install in README Prerequisites.                                                                                                                                                                                                                                                                                                                   |
| D5  | Hosting/deploy target | **None — source published to GitHub only**                                                                                                                                          | `github.com/RandyNorthrup/orbital-descent` (public). No live deployment (no Pages/Vercel/Netlify) — the repository itself is the deliverable. No CI/CD either (Decision D9) — GitHub stores the code only; quality gates are run locally before each push.                                                                                                                                                                                                                                                                                                        |
| D6  | Platform/input        | **Desktop keyboard only (v1)**                                                                                                                                                      | Arrow keys / WASD, classic lunar-lander controls. Touch controls are a possible future milestone, not committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D7  | Testing depth         | **Unit + integration + e2e**                                                                                                                                                        | Vitest for pure-function and multi-module-orchestration logic; Playwright for real-browser verification. See Architecture Notes for why this split exists and what each tier actually covers.                                                                                                                                                                                                                                                                                                                                                                     |
| D8  | Score persistence     | **`localStorage`, schema-validated**                                                                                                                                                | No backend. Deferred to Milestone 4 — not yet implemented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D9  | CI/CD                 | **None — GitHub is code storage only**                                                                                                                                              | `.github/workflows/ci.yml` existed briefly (two real pushes, both verified green — see §5's Lighthouse investigation, which happened precisely because that CI run existed) and was removed by explicit instruction after Milestone 1/6. Quality gates (`pnpm quality`, `pnpm quality:full`, `pnpm lighthouse`) are run locally, by whoever makes a change, before pushing — not automated.                                                                                                                                                                       |
| D10 | Project name          | **Orbital Descent** (was "Lunar Lander")                                                                                                                                            | Renamed once the scope grew to multiple fictional worlds, ships, and combat — "Lunar Lander" implied a single-Moon physics-sim scope that no longer fit. Renamed everywhere in the same pass: GitHub repo (`gh repo rename`), `package.json`, `index.html`, all docs, and the `window.__ORBITAL_DESCENT_GAME__` e2e test hook. The local working directory (`lunar_lander/`) was deliberately left as-is — renaming it mid-session would have broken every subsequent absolute-path tool call; rename it yourself with `mv` if you want the folder name to match. |
| D11 | Celestial bodies      | **Fictional worlds, not real planets**                                                                                                                                              | Explicit instruction: worlds are invented, not "Mars"/"Venus"/etc. Frees up gravity/atmosphere/hazard combinations from real planetary data and avoids any implied claim of scientific accuracy.                                                                                                                                                                                                                                                                                                                                                                  |
| D12 | Combat scope          | **Landing + active combat**, weapons help with obstacles and local hostiles                                                                                                         | Not open-ended combat — weapons exist to clear a landing path and defend against hostiles/enemy ships encountered while descending, not a standalone shooter. Scopes Milestones 10-11.                                                                                                                                                                                                                                                                                                                                                                            |
| D13 | Ship roster           | **5 starter ships + unlockable ships**                                                                                                                                              | Ships differ in mass/thrust/fuel-capacity/handling, unlocked through progression (exact trigger tied to M6/M12 when built). Scopes Milestone 7.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D14 | Ship upgrades         | **Shields, weapons, longer boost/fuel, stronger engines, lighter materials — equipped weapons/utility items are slotted, cycled, and triggered, and every equipped item adds mass** | Concrete upgrade categories for Milestone 9, purchasable via Milestone 8's store. Equipment mass feeds thrust-to-weight (same relationship as ship class/world gravity) — deliberate: heavier loadouts trade handling for capability, so equipment choice must fit the target base.                                                                                                                                                                                                                                                                               |
| D15 | Economy               | **Fictional currency, earned per completed mission, spent in a store**                                                                                                              | Placeholder name "Credits" until a better one is chosen — trivially renamed later, low-stakes. Scopes Milestone 8.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D16 | Achievements          | **Achievement system + toast notifications**                                                                                                                                        | Scopes Milestone 12.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D17 | World progression     | **Planetary browser/map: discovered vs. locked worlds, multi-base worlds, progression unlocks farther worlds/bases**                                                                | Scopes Milestone 6; depends on Milestone 5's per-world config existing first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 3. Open Questions

- **Mobile/touch controls**: deferred (D6). Revisit if the game is played on
  touch devices in practice. Note this also means Lighthouse is deliberately
  run with the `desktop` preset (§5) — testing this app under Lighthouse's
  default mobile emulation would be testing a platform it doesn't target.

## 4. Architecture Notes

### Custom physics core, not Phaser Arcade Physics

`src/game/physics/lander-physics.ts` and `src/game/flight/flight-state.ts`
implement gravity, thrust, fuel burn, rotation, and world-bounds handling as
plain, framework-free TypeScript — no Phaser `Arcade.Body` involved. Phaser is
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

### Paper-cutout art style — concrete rules

Every visual element follows the same construction, so the game reads as
one consistent style rather than a grab-bag of shapes:

- **Silhouette fills carry a visible paper-grain texture, not flat vector
  color.** No gradients, no blur/glow, no photographic textures — but real
  cutout animation shows the grain of the actual paper, so fills shouldn't
  look like perfectly smooth vector output either. Implemented
  procedurally (`src/game/rendering/paper-texture.ts` generates a small
  speckled-noise `CanvasTexture` once per scene, no external image
  assets), applied via a `TileSprite` tinted per-shape and masked to that
  shape's silhouette (`Phaser.GameObjects.GameObject#createGeometryMask`) —
  see `src/game/rendering/paper-shape.ts`.
- **Crisp bold outline** on every shape that represents a physical object
  (lander, terrain) — a stroke around the fill, like a cut paper edge.
- **Layered hard-edged drop shadows for depth**, not soft/blurred ones — an
  offset solid-color silhouette behind an element (e.g. terrain drawn twice:
  a darker offset copy first, the textured fill on top) reads as "this
  piece of paper sits above that one," which is the actual visual cue
  cutout animation uses for depth, instead of lighting/perspective.
- **Named palette in `constants.ts`**, not one-off hex literals per shape —
  keeps every layer's fill/stroke/shadow color intentional and reusable.

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

| #   | Milestone                         | Depends on       | One-line goal                                                                                                                                        |
| --- | --------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| M3  | Start Screen & Game Flow          | M2               | Menu, start button, settings stub, pause, landed/crashed result screen, restart — replaces M2's placeholder restart-on-R.                            |
| M4  | Scoring & High Scores             | M3               | Score formula + `localStorage` high scores (Decision D8).                                                                                            |
| M5  | Fictional Celestial Bodies        | M2               | Generalize gravity/terrain into a per-world config; first multi-world variation (Decision D11: gravity, atmosphere drag, one hazard type per world). |
| M6  | Planetary Browser (World Map)     | M5, M3           | Discovered vs. locked worlds, per-world multiple landing bases, progression unlocks farther worlds/bases (Decision D17).                             |
| M7  | Ship Roster                       | M3               | 5 starter ships + unlockable ships (Decision D13), each with distinct mass/thrust/fuel-capacity/handling.                                            |
| M8  | Economy & Store                   | M4, M7           | Fictional currency earned per completed mission; store UI to spend it (Decision D15).                                                                |
| M9  | Ship Upgrades & Equipment Loadout | M8               | Permanent stat upgrades + slotted/cycled/triggered weapons and utility items, each adding mass (Decision D14).                                       |
| M10 | Obstacles & Hazardous Conditions  | M5               | Static obstacles and per-world environmental conditions beyond atmosphere.                                                                           |
| M11 | Weapons & Combat                  | M9, M10          | Firing weapons to clear obstacles and fight local hostile inhabitants/enemy ships (Decision D12 — landing + active combat, not open-ended).          |
| M12 | Achievements & Notifications      | M4               | Achievement definitions + toast notifications (Decision D16).                                                                                        |
| M13 | Audio, Juice & Accessibility Pass | all of the above | Sound, particles, screen shake, full accessibility pass — deliberately last, since it polishes systems that need to exist first.                     |

**Core gameplay loop, once M9-M11 land**: the pilot juggles three
concurrent systems every mission — flight control (thrust/rotation/fuel,
M1-M2), the weapon system (cycle + trigger, M9/M11), and the buff/utility
system (cycle + trigger non-combat items, M9) — and every equipped
weapon/buff adds mass that degrades handling (M9). Beating a given base
means choosing a loadout that fits _that_ base's obstacles, hostiles, and
environmental conditions (M10), then executing flight + combat together,
not managing them as separate phases. This is the design goal that
threads M9 through M11 together — restated here because it's the point
of the whole equipment system, not just a mechanical detail.

---

### Milestone 3 — Start Screen & Game Flow (not started)

**Goal**: Real game loop shell — main menu, start button, settings stub,
in-game HUD (fuel readout already exists from M1/M2 and carries forward),
pause, and a proper landed/crashed result screen with restart — replacing
M2's placeholder "press R to try again" text-only flow.

**Scope**: new scenes (`MenuScene`, a unified result scene), HUD overlay
refinements, scene transition wiring. Settings is a stub for now (no real
options until a concrete need exists — e.g. audio volume once M13 adds
sound).

**Acceptance criteria**: a full play session is reachable end-to-end from
the browser: menu → start → fly → land or crash → result screen →
restart-or-menu, with no dead ends.

**Required tests**: e2e test covering the full flow (menu → play →
result → restart); unit tests for any new pure logic.

**Required quality gates**: full gate list, must stay green.

**Required documentation updates**: this file, `CHANGELOG.md`, README.

**Certification checklist**: not started.

---

### Milestone 4 — Scoring & High Scores (not started)

**Goal**: Implement Decision D8 — a scoring formula (fuel remaining, time
taken, landing precision) and `localStorage`-backed high scores, schema
validated on read so a corrupted or old-shape entry can't crash the game.

**Scope**: `src/game/scoring/score.ts` (pure formula, unit-tested),
`src/game/persistence/high-scores.ts` (storage interface + validated
localStorage adapter, unit-tested against an injected in-memory fake — no
`jsdom` needed, consistent with the Architecture Notes testing philosophy).
This persistence pattern (validated `localStorage`, injectable storage
interface for testing) is reused as-is by M6's unlock state, M8's currency
balance, and M12's achievement state — one philosophy, four consumers.

**Acceptance criteria**: landing produces a score; scores persist across a
real page reload (verified in e2e, not just unit-tested); a manually
corrupted `localStorage` entry is rejected gracefully, not thrown.

**Required tests**: unit tests for the scoring formula and the storage
schema validator (valid entry, corrupted entry, wrong-shape entry, empty
storage); e2e test reloading the page and confirming a prior score persists.

**Required quality gates**: full gate list, must stay green.

**Required documentation updates**: this file, `CHANGELOG.md`, README.

**Certification checklist**: not started.

---

### Milestone 5 — Fictional Celestial Bodies (not started)

**Goal**: Generalize the single hardcoded world into a data-driven
`CelestialBody` config, and add real per-world variation per Decision
D11: gravity, atmospheric drag, and one hazard type per body (corrosive
atmosphere = passive fuel drain; extreme cold = reduced thrust
efficiency). Bodies are entirely fictional (Decision D11) — not real
planets.

**Scope**:

- `src/game/planets/celestial-body.ts` — the `CelestialBody` interface:
  id, name, `gravityAccel`, `atmosphereDensity` (drag coefficient; 0 for
  airless worlds), `hazard` (`{ type: 'corrosive'; fuelDrainRate: number }`
  \| `{ type: 'cold'; thrustEfficiency: number }` \| `null`), terrain
  palette, and a "distance" number used for unlock ordering in M6.
- `src/game/planets/bodies.ts` — a starter registry of at least 4
  fictional worlds spanning the gravity/atmosphere/hazard space
  meaningfully (an airless low-gravity moon, a thin-atmosphere temperate
  world, a thick-atmosphere corrosive world, an extreme-cold world).
- `src/game/physics/lander-physics.ts` — new pure
  `atmosphericDrag(velocity, dragCoefficient): Vector2` (opposes velocity,
  scaled by the coefficient — the simplest physically reasonable linear
  drag model, consistent with this project's "arcade game, not a physics
  sandbox" philosophy from §4).
- `FlightState` generalized: ship-intrinsic stats (thrust, fuel burn,
  rotation speed — owned by M7's `ShipClass` once that milestone lands)
  stay separate from body/environment stats (gravity, drag, hazard
  effects) passed in from the selected `CelestialBody`.
- `GameScene` takes the selected body via scene data (default: the first
  registry entry, until M6 adds real selection).

**Acceptance criteria**: the same ship flies measurably differently on at
least two different bodies (integration-tested: compare descent
time/fuel-at-landing between bodies with different gravity/drag); a
corrosive-world flight loses fuel with no thrust input; a cold-world
flight's thrust is measurably weaker than an identical warm-world flight.

**Required tests**: unit tests for `atmosphericDrag` (opposes velocity,
scales with coefficient and speed, zero at zero coefficient) and the body
registry (every body valid and distinct, no duplicate ids); integration
tests for each hazard type's effect composed into `FlightState`.

**Required quality gates**: full gate list, must stay green.

**Required documentation updates**: this file (mark M5 certified, record
the final `FlightState`/`CelestialBody` interface shape in Architecture
Notes), `CHANGELOG.md`.

**Certification checklist**: not started.

---

### Milestone 6 — Planetary Browser (World Map) (not started)

**Goal**: A world-select screen (extends M3's menu system) per Decision
D17: discovered (unlocked) worlds are selectable, locked worlds are
visible but unavailable; worlds with more than one landing base show
base-select within that world; completing/upgrading bases unlocks
farther worlds and/or more bases.

**Scope**: `src/game/progression/` — unlock-state data model (which
worlds/bases are discovered), persisted via M4's validated-`localStorage`
pattern; a `WorldMapScene` rendering M5's body registry with locked/
unlocked visual states; base-select UI for multi-base worlds.

**Acceptance criteria**: starting state has exactly one world (and its
first base) unlocked; completing a base updates persisted unlock state;
locked worlds/bases are visible but not selectable; unlock state survives
a real page reload.

**Required tests**: unit tests for the unlock-state data model (initial
state, unlock transitions, persistence schema validation); e2e test
reaching a locked world/base, confirming it can't be entered, then
unlocking one and confirming it can.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M5 and M3.

---

### Milestone 7 — Ship Roster (not started)

**Goal**: 5 selectable starter ships (Decision D13), each with distinct
mass/thrust/fuel-capacity/handling, plus additional ships unlockable
through progression (exact trigger finalized alongside M6/M12).

**Scope**: `src/game/ships/ship.ts` (a `ShipClass` config: id, name, mass
or thrust multiplier, fuel capacity, rotation speed, unlock condition),
`src/game/ships/ships.ts` (registry: 5 unlocked-from-start + at least 2
locked), a ship-select screen (extends M3/M6's menu system),
`FlightState`/`GameScene` taking the selected ship's stats instead of the
current hardcoded `THRUST_ACCEL`/`MAX_FUEL`/etc.

**Acceptance criteria**: selecting different ships produces measurably
different flight feel (integration-tested, same pattern as M5's
body-variation test); locked ships are visible but not selectable until
unlocked.

**Required tests**: unit tests for the ship registry; integration test
comparing two ships' handling under identical input.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M3.

---

### Milestone 8 — Economy & Store (not started)

**Goal**: A fictional currency (Decision D15 — placeholder name
"Credits", trivially renamed later) earned per completed mission based on
M4's scoring formula, and a store UI to spend it.

**Scope**: `src/game/economy/currency.ts` (pure score-to-currency
conversion, persisted balance via M4's pattern), a `StoreScene` listing
purchasable upgrades (from M9) and their prices, gated by currency
balance and ship-ownership from M7.

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
   into a limited number of slots before a mission, and each **carrying a
   mass value that adds to the ship's total mass**. Heavier loadouts mean
   worse thrust-to-weight (same mass-affects-handling relationship M5/M7
   already establish for ship class and world gravity) — so clearing a
   hostile-heavy base by loading up on weapons costs you handling, and the
   player must weigh equipment choice against the specific base's demands.
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
  are currently equipped, within a slot-count and/or mass budget); total
  equipped mass feeds into the same thrust-to-weight calculation as ship
  class and world gravity.
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
fuel-tank-vs-handling and shield-vs-handling).

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M8.

---

### Milestone 10 — Obstacles & Hazardous Conditions (not started)

**Goal**: Static obstacles (rock spires, floating debris) placed in
terrain generation, and per-world environmental conditions beyond
atmosphere (visibility, wind gusts, etc. — exact set finalized when this
milestone starts, informed by M5's hazard framework).

**Scope**: extends `src/game/terrain/terrain-generator.ts` with obstacle
placement (seeded, same determinism guarantee as terrain/pad placement —
see the existing landing-pad placement logic for the pattern to follow).
Colliding with an obstacle is a crash unless cleared by a weapon (M11).

**Acceptance criteria**: obstacles are deterministic given a seed and
never overlap the landing pad; colliding with an uncleared obstacle
crashes the ship; a cleared obstacle no longer blocks flight.

**Required tests**: unit tests for obstacle placement (determinism,
non-overlap with the pad); e2e/integration coverage for obstacle
collision (full clearing behavior lands once M11's weapons exist — this
milestone can ship obstacles as pure hazards first if sequenced before
M11, acceptance criteria adjusted accordingly at implementation time).

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
M9's equipment definitions), hostile/enemy definitions (position, simple
movement pattern, health), damage resolution against shields (M9) before
hull.

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
unlocked-achievement state (M4's pattern).

**Acceptance criteria**: completing a defined trigger shows a toast and
persists the unlock; an already-unlocked achievement doesn't re-trigger
its toast.

**Required tests**: unit tests for trigger evaluation and persistence;
e2e test triggering at least one achievement and confirming the toast
appears.

**Required quality gates**: full gate list, must stay green.

**Certification checklist**: not started. Depends on M4.

---

### Milestone 13 — Audio, Juice & Accessibility Pass (not started)

**Goal**: Sound effects (thrust, landing, crash, weapons, achievement
unlock), thruster/impact/weapon particle effects, screen shake, and a
full accessibility pass across everything shipped by this point
(colorblind-safe palette check across all worlds/ships/UI, keyboard-
focus-visible menus/store/world-map).

**Scope**: audio asset loading (`BootScene`'s first real use as a
loader), particle/juice effects across `GameScene`/combat/UI.

**Acceptance criteria**: audio plays without blocking boot (respects
browser autoplay policy); Lighthouse accessibility stays at or above the
Milestone 1 baseline (1.00) across all new UI.

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
