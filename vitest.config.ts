import { defineConfig } from 'vitest/config';

// "unit" = single pure-function correctness (physics, terrain, scoring, persistence, planets, bases).
// "integration" = multi-module orchestration in plain Node (e.g. FlightState ticking
// physics + fuel + rotation together over many frames). Full-browser rendering
// correctness is Playwright's job (see playwright.config.ts) — this project has no
// backend/API layer, so there is no third "integration" boundary beyond that.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Scoped to the Phaser-free pure-logic layers (physics, flight
      // orchestration, terrain generation, landing rules, seeded procedural
      // layout, the scoring formula, validated high-score/base-progress/
      // ship-progress/currency-progress/upgrade-progress/equipment-progress
      // persistence, the celestial-body registry, the base/difficulty/
      // fit-check registry, the ship/upgrade registry, the equipment
      // registry, the economy layer, the mission/cargo/relay/reward layer,
      // and (Milestone 11) the combat layer) that unit + integration tests
      // actually exercise. Scene glue and Phaser-dependent rendering
      // (src/game/scenes/**, most of src/game/rendering/**, src/main.ts)
      // wire that logic into Phaser/the DOM and are verified by the
      // Playwright e2e smoke test instead — no meaningful behavior to
      // unit-test in isolation. starfield.ts and ridgeline.ts are the
      // exception within rendering/: pure, seeded layout generators (same
      // shape as terrain-generator.ts), so they're included here rather
      // than under the untested rendering blanket.
      include: [
        'src/game/physics/**/*.ts',
        'src/game/flight/**/*.ts',
        'src/game/terrain/**/*.ts',
        'src/game/random/**/*.ts',
        'src/game/scoring/**/*.ts',
        'src/game/persistence/**/*.ts',
        'src/game/planets/**/*.ts',
        'src/game/bases/**/*.ts',
        'src/game/ships/**/*.ts',
        'src/game/equipment/**/*.ts',
        'src/game/economy/**/*.ts',
        'src/game/missions/**/*.ts',
        'src/game/combat/**/*.ts',
        'src/game/rendering/starfield.ts',
        'src/game/rendering/ridgeline.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
