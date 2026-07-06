# Agent Instructions — Lunar Lander

This file is the canonical source of project standards for any AI coding
agent working in this repository (Claude Code, GitHub Copilot, Cursor, or
otherwise). `CLAUDE.md` and `.github/copilot-instructions.md` are thin
pointers back to this file — keep this one authoritative and update it
first when a rule changes.

Read `PLAN.md` before starting any non-trivial task: it has the resolved
decisions, open questions, architecture rationale, and per-milestone
certification status. Read `CHANGELOG.md` to see what's actually shipped
versus what's planned.

## Code standards (non-negotiable)

- **No unexplained magic numbers/strings/booleans.** Name them as constants
  in `src/game/constants.ts` (gameplay tuning) or as a local `const` at the
  top of the file (presentation-only values scoped to one file). Enforced by
  `@typescript-eslint/no-magic-numbers` — see `eslint.config.js` for the
  narrow allowed set (`-1, 0, 1, 2`, array indexes, enum members) and why
  each is exempt.
- **No dead code, no commented-out code, no unused files/exports/deps.**
  Enforced by `noUnusedLocals`/`noUnusedParameters` (TypeScript) and `knip`
  (dead code / unused exports / unused dependencies). Run `pnpm deadcode`
  before considering any change done.
- **No silent fallbacks, no fake implementations, no placeholder production
  code, no half-finished implementations.** If a milestone's scope doesn't
  include something yet (e.g. terrain/landing before Milestone 2), don't
  stub it — leave it absent and documented as not-yet-started in `PLAN.md`.
- **No `any`, no unchecked casts, no suppressed lint rules or ignored type
  errors** without an inline comment explaining why and a corresponding note
  in `PLAN.md`. This codebase has none as of Milestone 1 — keep it that way.
- **No global installs** unless genuinely required (pnpm itself is the one
  documented exception — see README Requirements — because Node no longer
  bundles Corepack).
- **No dependency added without checking its purpose, current stable
  version, and compatibility** (peer deps, engines, `no-magic-numbers`-style
  gotchas). Verify against the live npm registry / the package's own
  `.d.ts` or release notes — do not assume from training data, especially
  given how fast this stack moves (see `PLAN.md` §5 for the Phaser 3→4 and
  Vitest supply-chain-timing examples of what "verify, don't guess" caught
  in this project specifically).
- **Exact version pins** (`"6.0.3"`, not `"^6.0.3"`) across `package.json` —
  this project deliberately doesn't use caret/tilde ranges. See `PLAN.md`
  §5 for why (a caret range on `typescript` would have silently crossed
  `typescript-eslint`'s `<6.1.0` peer ceiling).

## Architecture rules

- **Physics/game logic stays Phaser-free.** `src/game/physics/**` and
  `src/game/flight/**` must not import `phaser`. Phaser lives only in
  `src/game/scenes/**` and `src/main.ts`, which read a state snapshot and
  render it — they don't compute physics themselves. This is what makes
  unit/integration testing possible without a browser. See `PLAN.md` §4.
- **Scene keys** come from `src/game/scenes/scene-keys.ts` — never inline a
  scene-key string literal in a second place.
- **Test tier discipline**: pure functions get `*.test.ts` (unit); stateful
  multi-module orchestration gets `*.integration.test.ts`; anything that
  needs a real Phaser boot or DOM gets a Playwright spec in `e2e/`, not a
  `jsdom` workaround. See `PLAN.md` §4 for the reasoning — don't reach for
  `jsdom`/`happy-dom`/the `canvas` npm package to test Phaser scenes
  directly; that tradeoff was deliberately rejected once already.

## Quality gates

Every one of these must pass before a change is considered done — see
README "Quality gates" for the exact commands:

```
pnpm quality      # format:check, lint, typecheck, test:coverage, build, deadcode, security:secrets
pnpm quality:ci   # quality + security:audit + test:e2e
```

Don't mark a task complete with a failing or skipped gate. If a gate can't
be verified in the current environment (e.g. this sandbox's headless Chrome
can't produce a Lighthouse performance trace — see `PLAN.md` §3), say so
explicitly rather than assuming it passes, and note it as an open item.

## Documentation discipline

- `PLAN.md` is updated **the same session** a decision is made or a
  milestone's certification status changes — not batched for later.
- `CHANGELOG.md` records what actually shipped, never planned work. Don't
  list something as done if a gate for it failed or wasn't run.
- `README.md` commands must actually work as written. If a command changes
  (a script gets renamed, a flag changes), update the README in the same
  change — don't let it drift.
- Remove stale claims immediately; mark deferred work as deferred, not done.

## Communication style

**Status/progress updates** (task-completion reports, milestone
certification summaries) use full structured prose: what changed, which
gates ran, what failed, what was fixed, what's still blocked. Do not
compress these — the user reads them to verify real state, not vibes.

**Everything else** (explanations, discussion, answers to questions) uses a
terse, direct, fragment-based style — no filler, no unnecessary preamble,
no restating the question back. Preserve code/commands/error text exactly;
compress the prose around it, never the technical content, code comments,
plan detail, or architectural rationale.
