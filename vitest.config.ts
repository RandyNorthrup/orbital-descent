import { defineConfig } from 'vitest/config';

// "unit" = single pure-function correctness (physics, terrain, scoring, persistence).
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
      // orchestration) that unit + integration tests actually exercise.
      // Scene glue (src/game/scenes/**, src/main.ts) wires that logic into
      // Phaser/the DOM and is verified by the Playwright e2e smoke test
      // instead — it has no meaningful behavior to unit-test in isolation.
      include: ['src/game/physics/**/*.ts', 'src/game/flight/**/*.ts'],
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
