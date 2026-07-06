# CLAUDE.md

Full project standards live in [`AGENTS.md`](./AGENTS.md) — read it before
starting any non-trivial task. Read [`PLAN.md`](./PLAN.md) for decisions,
architecture rationale, open questions, and per-milestone certification
status, and [`CHANGELOG.md`](./CHANGELOG.md) for what's actually shipped.

The short version, if you read nothing else:

- No magic numbers/dead code/placeholder code/unused deps — see AGENTS.md
  "Code standards."
- Physics/game logic (`src/game/physics/**`, `src/game/flight/**`) never
  imports `phaser`. Scenes render state, they don't compute it. See
  AGENTS.md "Architecture rules" and `PLAN.md` §4.
- Before marking anything done, run `pnpm quality` (or `pnpm quality:ci` for
  the full set including e2e). Don't claim a gate passed without running it.
- Update `PLAN.md` and `CHANGELOG.md` in the same session as the change that
  prompted them — not after the fact.
- Status/progress updates to the user: full structured prose (changed
  files, gates run, failures, fixes, blockers). Everything else: terse,
  direct, no filler. See AGENTS.md "Communication style" for the exact
  rule and why.
