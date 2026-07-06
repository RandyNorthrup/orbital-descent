# GitHub Copilot Instructions

Full project standards live in [`../AGENTS.md`](../AGENTS.md) — read it
before suggesting non-trivial changes. Decisions, architecture rationale,
open questions, and per-milestone certification status live in
[`../PLAN.md`](../PLAN.md).

Key points when generating or completing code in this repo:

- No magic numbers — name constants in `src/game/constants.ts` (gameplay
  tuning) or as a local `const` at the top of the file (presentation-only).
  Enforced by `@typescript-eslint/no-magic-numbers`.
- `src/game/physics/**` and `src/game/flight/**` must never import `phaser`
  — physics/game logic stays framework-free and unit-testable in plain
  Node. Only `src/game/scenes/**` and `src/main.ts` touch Phaser.
- Exact dependency version pins in `package.json` (no `^`/`~`) — see
  `PLAN.md` §5 for why.
- Before suggesting a change is complete, it must pass `pnpm quality` (see
  `AGENTS.md` "Quality gates" for the full list: format, lint, typecheck,
  test coverage, build, dead-code, secret scan).
- Don't stub, mock, or fake production code paths — see `AGENTS.md` "Code
  standards."
