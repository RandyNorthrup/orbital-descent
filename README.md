# Orbital Descent

A 2D landing-and-exploration game across fictional worlds: rotate and
thrust to fight gravity, terrain, and hazards to touch down safely. Built
with [Phaser 4](https://phaser.io) and TypeScript.

Full project plan, decisions, architecture rationale, and per-milestone
certification status: [`PLAN.md`](./PLAN.md). Change history:
[`CHANGELOG.md`](./CHANGELOG.md).

**Current status**: Milestone 8 (Economy & Store) certified — completing
a flight now earns "Credits" proportional to your landing score (shown on
the menu as "BALANCE"), and a new STORE screen lets you spend them —
currently on Vanguard, a purchasable ship, with more purchasable items
arriving as later milestones add their own catalog to the same store. On
top of: a SHIP SELECT screen for browsing and equipping any of 7 ships (5
starters, plus a purchase- and an unlock-gated ship), each with its own
thrust/fuel/handling stats shown at a glance — equipping a ship is a
persistent loadout choice that carries into every flight, free or curated
(Milestone 7); a WORLD MAP screen for picking a curated base from a
starter roster across 4 fictional worlds, gated by a persisted
three-state unlock machine (locked → discovered-unclaimed → established)
with a computed difficulty badge per base (Milestone 6); 12 fictional
worlds with their own gravity/atmosphere/hazard and terrain material
(Milestone 5); a safe landing scores (fuel remaining, time taken, landing
precision) with the top scores persisted across reloads, shown on both
the menu ("BEST") and result screen ("SCORE"/"BEST") (Milestone 4); the
full menu → start → fly → land or crash → result screen →
restart-or-menu loop with a pause/settings overlay mid-flight (Milestone
3); gravity, thrust, fuel, rotation, procedurally generated terrain, and
a scrolling parallax world (Milestones 2/2.5) in the paper-cutout art
style. See `PLAN.md` §6 for the full roadmap (upgrades, weapons,
obstacles/hostiles, missions, and more).

## Stack

- **Rendering / game framework**: [Phaser](https://phaser.io) `4.2.0`
- **Language**: TypeScript `6.0.3` (strict — see `tsconfig.app.json`)
- **Build tool**: Vite `8.1.3`
- **Package manager**: pnpm `11.10.0`
- **Unit / integration tests**: Vitest `4.1.9`
- **E2E tests**: Playwright `1.61.1` (Chromium, Firefox, WebKit)
- **Linting**: ESLint `10.6.0` + `typescript-eslint` `8.62.1` (flat config,
  type-checked rules)
- **Formatting**: Prettier `3.9.4`
- **Dead-code / unused-export / unused-dependency detection**: knip `6.24.0`
- **Secret scanning**: secretlint `13.0.2`
- **Bundle analysis**: vite-bundle-visualizer `1.2.1`
- **Performance/accessibility/best-practices audits**: Lighthouse CI
  (`@lhci/cli` `0.15.1`, run manually — see below)

No backend, no database, no authentication, no CI/CD — this is a fully
static, client-only game, and GitHub hosts the source only (no automated
pipeline runs on push). All quality gates are run locally, by whoever is
making the change, before pushing.

## Requirements

- Node.js `^20.19.0 || ^22.13.0 || >=24.0.0` (see `package.json` `engines`)
- pnpm `11.10.0`. Node no longer bundles Corepack, so install it directly:
  ```sh
  npm install -g pnpm@11.10.0
  ```

## Installation

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Opens the Vite dev server (default `http://localhost:5173`). From the
main menu, **Enter** or the START button begins a generic free flight
(random terrain, the default world); WORLD MAP instead lets you pick a
curated base from the worlds/bases unlocked so far; SHIP SELECT lets you
browse and equip any available ship — your choice persists and applies
to every flight until you change it again; STORE lets you spend Credits
(earned automatically from your landing score on every safe touchdown)
on any purchasable ship you can currently afford. In flight: **W** or
**↑** to thrust, **A**/**D** or **←**/**→** to rotate, **Escape** to
pause (opens a settings overlay; Escape or BACK resumes exactly where
play left off). On landing or crashing, a result screen offers **R** or
RESTART for a fresh flight, and **Escape** or MAIN MENU to return to the
menu.

## Build

```sh
pnpm build       # tsc -b (typecheck) && vite build -> dist/
pnpm preview     # serve the production build locally on :4173
```

## Tests

```sh
pnpm test              # all Vitest projects (unit + integration)
pnpm test:unit         # pure-function tests only (src/**/*.test.ts)
pnpm test:integration  # multi-module orchestration tests (src/**/*.integration.test.ts)
pnpm test:coverage     # unit + integration with coverage, thresholds enforced
pnpm test:e2e          # Playwright, real browsers, against a production build
pnpm test:e2e:ui       # Playwright's interactive UI runner
```

The Vitest coverage gate (90% statements/lines/functions, 85% branches) only
applies to the Phaser-free pure-logic layers
(`src/game/physics/**`, `src/game/flight/**`). Phaser scene glue
(`src/game/scenes/**`, `src/main.ts`) is intentionally verified by the
Playwright e2e suite instead — see `PLAN.md` §4 "Architecture Notes" for why.

## Quality gates

```sh
pnpm format:check      # Prettier check
pnpm lint              # ESLint
pnpm typecheck         # tsc -b --noEmit, both TS programs (app + tooling)
pnpm security:audit    # pnpm audit --prod
pnpm security:secrets  # secretlint across the repo
pnpm deadcode          # knip: unused files/exports/dependencies
pnpm bundle:analyze    # opens a treemap of the production JS bundle
pnpm lighthouse        # lhci autorun against the production build

pnpm quality           # format:check + lint + typecheck + test:coverage + build + deadcode + security:secrets
pnpm quality:full      # quality + security:audit + test:e2e
```

There is no CI — GitHub hosts source only (see Deployment below). Run
`pnpm quality:full` (and `pnpm lighthouse` separately, since it needs a
production build already in `dist/`) yourself before pushing. Nothing here
is advisory; a failure means don't push yet.

## Environment variables

None are currently required — see [`.env.example`](./.env.example). This is
a fully static, client-only build. If a hosting target that needs a
build-time base path (e.g. GitHub Pages) is chosen later, that will be
documented here and in `.env.example` when it happens.

## Project structure

```
├── e2e/                          # Playwright specs
├── src/
│   ├── game/
│   │   ├── constants.ts         # every tunable number, named
│   │   ├── physics/              # pure vector/physics functions (unit-tested)
│   │   ├── flight/               # FlightState — orchestrates physics into a
│   │   │                         # frame-by-frame simulation (integration-tested)
│   │   ├── terrain/              # procedural terrain + landing-pad rules
│   │   ├── random/               # seeded PRNG + bounded random walk
│   │   ├── scoring/              # the landing-score formula
│   │   ├── persistence/          # validated localStorage (high scores, base
│   │   │                         # progress, ship progress, currency)
│   │   ├── planets/              # CelestialBody registry (Milestone 5)
│   │   ├── bases/                # Base schema/registry/difficulty formula (Milestone 6)
│   │   ├── ships/                # ShipClass schema/registry (Milestone 7)
│   │   ├── economy/              # currency conversion, store listings (Milestone 8)
│   │   ├── rendering/             # background/terrain rendering, UI button helper
│   │   └── scenes/               # Phaser Scene classes (Boot, Menu, Game, Result,
│   │                             # Settings, WorldMap, ShipSelect, Store)
│   ├── main.ts                   # Phaser.Game bootstrap
│   ├── style.css
│   └── vite-env.d.ts
├── index.html
├── global.d.ts                   # ambient Window typing shared by app + e2e TS programs
├── vite.config.ts                # app build config
├── vitest.config.ts              # unit + integration project config, coverage thresholds
├── playwright.config.ts          # e2e config (builds + previews, then runs specs)
├── eslint.config.js              # flat config, type-checked rules
├── knip.json / .secretlintrc.json / lighthouserc.json
├── .github/copilot-instructions.md
├── PLAN.md                       # full plan, decisions, architecture notes, milestones
└── CHANGELOG.md
```

## Deployment

None — by design. The code is published to
[github.com/RandyNorthrup/orbital-descent](https://github.com/RandyNorthrup/orbital-descent)
(Decision D5 in `PLAN.md`) as source only — no live-hosted build, and no
CI/CD (Decision D9): GitHub stores the code, nothing more. Quality gates
(`pnpm quality:full`, `pnpm lighthouse`) are run locally before each push.

## Security notes

- No secrets in the repository (scanned via `secretlint` in CI and locally).
- No known dependency vulnerabilities as of the last `pnpm audit --prod` run
  (see `PLAN.md` §6 Milestone 1 certification table for the exact result).
- Dependency versions are pinned exactly (not `^`/`~` ranges) — see
  `PLAN.md` §5 for why, including a real supply-chain-timing decision
  (stepped Vitest back from a ~10-hour-old release to a ~3-week-old one).
- No backend/auth/database exists yet, so there is no server-side attack
  surface to harden. This will be revisited if any future milestone adds one.

## Troubleshooting

- **`pnpm: command not found`**: install it — see Requirements above.
- **Lighthouse Chrome launch issues (`NO_FCP`, can't find Chrome, etc.)**:
  `lighthouserc.json` runs with `--headless=new --no-sandbox --disable-gpu
--disable-dev-shm-usage`, needed in most sandboxed/containerized shells.
  If Performance specifically shows `NaN` with every metric erroring
  `NO_LCP`, that means the app's only paintable DOM content got removed —
  see `PLAN.md` §5 for what that bug actually was and how it was fixed (it
  was a real root cause, not an environment quirk — confirmed by
  reproducing it on a second, independent machine before this project
  dropped CI).
- **`pnpm test:e2e` fails with a missing browser**: run
  `pnpm exec playwright install chromium firefox webkit` once.
