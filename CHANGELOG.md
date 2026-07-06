# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Only real,
already-made changes are recorded — planned work lives in `PLAN.md`, not here.

## [Unreleased]

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
