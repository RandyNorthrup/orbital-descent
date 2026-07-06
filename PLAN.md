# Lunar Lander — Project Execution Plan

This document is the single source of truth for scope, decisions, and milestone
certification. It is updated every time a decision is made or a milestone is
certified — stale entries are corrected or removed, not left to rot.

## 1. Project Assumptions

- **Application type**: standalone, client-only, static single-page web game.
  No backend, no accounts, no server-persisted state.
- **Art direction**: minimalist vector/geometric shapes (Phaser `Triangle`
  shape, solid colors), not sprite-sheet artwork. This is a deliberate choice
  for "modern 2D," not a placeholder — see Architecture Notes.
- **Platform**: desktop, keyboard-only input for v1 (Decision D6). Mobile/touch
  is explicitly out of scope until a future milestone decision.
- **No env vars required**: fully static build, nothing secret. See
  `.env.example`.

## 2. Resolved Decisions

Captured in the order they were made, with the reasoning, since later
milestones depend on understanding _why_, not just _what_.

| #   | Decision              | Chosen                                     | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Rendering engine      | **Phaser 4.2.0** (not 3.x)                 | Phaser 3 is frozen at 3.90.0 since 2025-05-23 — legacy. Phaser 4.0.0 went stable 2026-04-10 (after this assistant's Jan-2026 training cutoff, verified live against the npm registry, not assumed). Core `Scene`/`GameObject`/config API is unchanged from v3 (verified directly against `node_modules/phaser/types/phaser.d.ts`); the v4 rewrite is renderer-internal (new WebGL node renderer, unified filter/FX system, GPU-batched sprite/tilemap layers). |
| D2  | Language              | **TypeScript 6.0.3**                       | Required for the strict typecheck gate. Pinned `6.0.3` (not `^6.0.3`) because `typescript-eslint@8.62.1` requires `typescript >=4.8.4 <6.1.0` — a caret range risked a silent break the moment TS 6.1 ships.                                                                                                                                                                                                                                                   |
| D3  | Build tooling         | **Vite 8.1.3 + vanilla TS** (no React)     | No app-wide UI state beyond the game itself; Phaser scenes own the canvas and game loop directly. Smallest dependency surface.                                                                                                                                                                                                                                                                                                                                 |
| D4  | Package manager       | **pnpm 11.10.0**                           | Strict dependency resolution (no phantom deps), fast, disk-efficient. Installed globally via `npm install -g pnpm@11.10.0` since Node 26 no longer bundles Corepack — documented as a required one-time global install in README Prerequisites.                                                                                                                                                                                                                |
| D5  | Hosting/deploy target | **None — source published to GitHub only** | `github.com/RandyNorthrup/lunar-lander` (public). No live deployment (no Pages/Vercel/Netlify) — the repository itself is the deliverable. CI runs quality gates on push/PR; no `deploy` job needed.                                                                                                                                                                                                                                                           |
| D6  | Platform/input        | **Desktop keyboard only (v1)**             | Arrow keys / WASD, classic lunar-lander controls. Touch controls are a possible future milestone, not committed.                                                                                                                                                                                                                                                                                                                                               |
| D7  | Testing depth         | **Unit + integration + e2e**               | Vitest for pure-function and multi-module-orchestration logic; Playwright for real-browser verification. See Architecture Notes for why this split exists and what each tier actually covers.                                                                                                                                                                                                                                                                  |
| D8  | Score persistence     | **`localStorage`, schema-validated**       | No backend. Deferred to Milestone 4 — not yet implemented.                                                                                                                                                                                                                                                                                                                                                                                                     |

## 3. Open Questions

- **Lighthouse performance score, unverified locally**: see §6 Certification
  Gates — Chrome in this development sandbox cannot produce a performance
  trace (GPU/compositor-constrained headless environment), confirmed by
  direct investigation, not assumed. Accessibility (1.00) and Best Practices
  (0.96) scored fine in the same run, so this is specifically a performance
  _trace capture_ limitation of the local sandbox, not a broader Lighthouse
  or app failure. **Action**: verify on first CI run (GitHub Actions
  `ubuntu-latest` reliably supports full Lighthouse traces — this is the
  same setup Google's own `lhci` GitHub Action documents). If the real score
  comes in under the 0.9 gate, the likely cause is Phaser's bundle size
  (~360 KB gzipped JS, flagged by Vite's build output as a >500 KB chunk) —
  options at that point: code-split so game init isn't on the critical
  rendering path, or accept and document a lower justified threshold.
- **Mobile/touch controls**: deferred (D6). Revisit if the game is played on
  touch devices in practice.

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

### `window.__LUNAR_LANDER_GAME__`

`src/main.ts` assigns the booted `Phaser.Game` instance to
`window.__LUNAR_LANDER_GAME__` (declared in root `global.d.ts`, shared by
both the `tsconfig.app.json` and `tsconfig.node.json` TS programs so the e2e
spec can reference it too). This is a genuine e2e test hook, not a debug
leftover: canvas pixel content isn't otherwise inspectable from outside
Phaser, and it holds no secrets, so shipping it is harmless.

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
- **`@secretlint/secretlint-rule-preset-recommend`**: referenced only by
  _id_ string inside `.secretlintrc.json`, not a JS import — `knip` can't see
  that usage statically, so it's listed in `knip.json`'s
  `ignoreDependencies` with this note as the paper trail for why it isn't
  dead weight.

## 6. Milestones

### Milestone 1 — Project Foundation + Flight Core

**Status: CERTIFIED**, with one caveat noted below (Lighthouse performance).

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

| Gate                                     | Command                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                                   | `pnpm format:check`     | ✅ pass                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Lint                                     | `pnpm lint`             | ✅ pass (0 problems)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Typecheck                                | `pnpm typecheck`        | ✅ pass                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Unit + integration + coverage            | `pnpm test:coverage`    | ✅ 26/26 tests, 100% stmts/branches/funcs/lines on the pure-logic scope (thresholds: 90/85/90/90)                                                                                                                                                                                                                                                                                                                                                       |
| Production build                         | `pnpm build`            | ✅ succeeds. Output: 359.50 KB gzip JS (Phaser itself) — flagged by Vite as a >500 KB chunk; tracked as a performance-budget risk, see §3 Open Questions                                                                                                                                                                                                                                                                                                |
| Dead code / unused exports / unused deps | `pnpm deadcode`         | ✅ pass (0 issues after fixing `knip.json`)                                                                                                                                                                                                                                                                                                                                                                                                             |
| Secret scan                              | `pnpm security:secrets` | ✅ pass                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Dependency audit                         | `pnpm security:audit`   | ✅ "No known vulnerabilities found"                                                                                                                                                                                                                                                                                                                                                                                                                     |
| E2E (Chromium, Firefox, WebKit)          | `pnpm test:e2e`         | ✅ 3/3 passed, real browsers, real canvas, real boot                                                                                                                                                                                                                                                                                                                                                                                                    |
| Lighthouse — Accessibility               | `pnpm lighthouse`       | ✅ **1.00** (≥0.90 required)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Lighthouse — Best Practices              | `pnpm lighthouse`       | ✅ **0.96** (≥0.90 required)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Lighthouse — Performance                 | `pnpm lighthouse`       | ⚠️ **unverified** — this sandbox's headless Chrome cannot produce a paint trace even with `--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage` (`NO_FCP` without `--disable-gpu`; performance category itself returns `null` with it, while a11y/best-practices/SEO score normally in the same run — isolates the failure to trace capture, not the app). **Must be verified on first CI run before this gate can be marked certified.** |

**Documentation updates**: this file, `README.md`, `CHANGELOG.md`,
`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` — all written
this milestone.

**Security checks**: no secrets in repo (scanned), no known dependency
vulnerabilities (audited), no backend/auth attack surface (none exists yet).

**Performance checks**: build succeeds; bundle-size warning noted and
tracked; Lighthouse performance pending CI (above).

---

### Milestone 2 — Terrain & Landing (not started)

**Goal**: Replace the Milestone 1 temporary floor with real procedurally
generated terrain, a landing pad, collision detection, and safe-landing vs.
crash determination.

**Scope**: `src/game/terrain/terrain-generator.ts` (pure, seeded, unit-tested
— generates a heightmap with one flat landing-pad segment), collision
detection against the lander's actual triangle geometry, a safe-landing
check (touchdown velocity/angle thresholds — reuses the existing
`WorldBounds`-style pure-function pattern from Milestone 1), crash vs.
landed state in `GameScene`.

**Acceptance criteria**: lander collides with terrain (not just an invisible
floor); landing softly and level on the pad is distinguishable from crashing;
both states are visibly different in-game (even before Milestone 3's
game-over screen exists).

**Required tests**: unit tests for terrain generation (determinism given a
seed, landing pad always flat, always reachable) and the safe-landing
threshold function; integration test extending `FlightState` (or a sibling)
to cover a full descent-to-landing/crash sequence; e2e smoke test updated if
the boot assertions change.

**Required quality gates**: same full gate list as Milestone 1, all must
stay green — this milestone must not regress Milestone 1's certification.

**Required documentation updates**: this file (mark M2 certified, update M3
scope if collision changes assumptions), `CHANGELOG.md`.

**Certification checklist**: not started.

---

### Milestone 3 — HUD, Menus & Game Flow (not started)

**Goal**: Real game loop shell — main menu, in-game HUD (altitude, velocity,
fuel — fuel readout already exists from M1 and carries forward), pause,
game-over (crashed) and success (landed) screens, restart flow.

**Scope**: new scenes (`MenuScene`, `GameOverScene` or a unified result
scene), HUD overlay refinements, scene transition wiring.

**Acceptance criteria**: a full play session is reachable end-to-end from the
browser: menu → fly → land or crash → result screen → restart, with no dead
ends.

**Required tests**: e2e test covering the full flow (menu → play → result);
unit tests for any new pure logic (e.g. HUD value formatting if it grows
beyond the current `updateFuelText`).

**Required quality gates**: full gate list, must stay green.

**Required documentation updates**: this file, `CHANGELOG.md`, README
screenshots/description if the play experience changes materially.

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

### Milestone 5 — Audio, Juice & Accessibility Pass (not started)

**Goal**: Sound effects (thrust, landing, crash), thruster particle effect,
screen shake on crash, and a real accessibility pass beyond the M1 baseline
(colorblind-safe palette check, keyboard-focus-visible menus once M3 adds
DOM-adjacent UI, if any).

**Scope**: audio asset loading (first real use of `BootScene` as a loader,
per its Milestone-1 comment), particle/juice effects in `GameScene`.

**Acceptance criteria**: audio plays without blocking boot (respects browser
autoplay policy — first-interaction gated); Lighthouse accessibility stays
at or above the Milestone 1 baseline (1.00) after any new UI is added.

**Required tests**: e2e assertions that audio elements/context exist and
don't throw; no new unit-testable pure logic expected unless particle
tuning becomes parameterized.

**Required quality gates**: full gate list, must stay green, including a
fresh Lighthouse accessibility run.

**Certification checklist**: not started.

---

### Milestone 6 — Publish to GitHub

**Status: CERTIFIED** (2026-07-06).

**Goal**: Resolved per Decision D5 — no live hosting/deployment. The
deliverable is the source repository itself, published publicly on GitHub.

**Scope**: `git init`, initial commit, `gh repo create`, push to
`github.com/RandyNorthrup/lunar-lander` (public). No `deploy` CI job — none
is needed since there's nothing to deploy to.

**Acceptance criteria**: repository is public and reachable at
`github.com/RandyNorthrup/lunar-lander`; CI runs on push to `main`.

**Certification checklist**: repo created and pushed; CI workflow present
and will run automatically on the push (see Actions tab for the live
result — not independently re-verified from this session beyond confirming
the push succeeded).

## 7. Definition of Done (per milestone)

A milestone is certified only when **all** of the following are true:

1. Every acceptance criterion in that milestone's section is met.
2. `pnpm quality` passes locally (format, lint, typecheck, unit+integration
   coverage, build, dead-code, secret scan).
3. `pnpm quality:ci` passes in GitHub Actions (adds dependency audit + e2e
   across all three browsers).
4. Lighthouse Performance/Accessibility/Best-Practices all score ≥0.90 in
   CI (SEO is intentionally not gated).
5. This file is updated: milestone status flipped to CERTIFIED, next
   milestone's "not started" replaced with real progress, any newly
   discovered open questions added to §3.
6. `README.md` and `CHANGELOG.md` reflect the real, current state — no
   stale commands, no claimed-but-missing features.

No milestone is marked complete with a known-failing or unverified gate
silently dropped. Milestone 1 above documents its one open item
(Lighthouse performance) explicitly rather than hiding it.
