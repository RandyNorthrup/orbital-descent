# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Only real,
already-made changes are recorded — planned work lives in `PLAN.md`, not here.

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
