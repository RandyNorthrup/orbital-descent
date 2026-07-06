import { describe, expect, it } from 'vitest';
import { FlightState, type FlightSnapshot } from './flight-state';

/**
 * These tests exercise FlightState as a whole — physics + fuel + rotation +
 * horizontal world-wrap composed together over many simulated frames —
 * rather than any single pure function in isolation. That composition is
 * what "unit" tests in lander-physics.test.ts deliberately don't cover.
 * Ground contact is NOT FlightState's concern (see PLAN.md §4) — that's
 * covered by src/game/terrain/landing.test.ts against real terrain.
 */

const STARTING_SNAPSHOT: FlightSnapshot = {
  position: { x: 50, y: 50 },
  velocity: { x: 0, y: 0 },
  rotationRadians: 0,
  fuel: 100,
};

function makeFlightState(overrides: Partial<FlightSnapshot> = {}): FlightState {
  return new FlightState({
    initial: { ...STARTING_SNAPSHOT, ...overrides },
    worldWidth: 200,
    gravityAccel: 20,
    thrustAccel: 50,
    rotationSpeedRadPerSec: Math.PI,
    fuelBurnRate: 25,
  });
}

function tickMany(
  state: FlightState,
  frames: number,
  dtSeconds: number,
  input: Parameters<FlightState['tick']>[0],
): FlightSnapshot {
  let last = state.snapshot;
  for (let i = 0; i < frames; i += 1) {
    last = state.tick(input, dtSeconds);
  }
  return last;
}

describe('FlightState', () => {
  it('falls under gravity alone, gaining downward velocity each frame', () => {
    const state = makeFlightState();
    const after = tickMany(state, 10, 1 / 60, { thrust: false, rotate: 0 });
    expect(after.velocity.y).toBeGreaterThan(0);
    expect(after.position.y).toBeGreaterThan(STARTING_SNAPSHOT.position.y);
  });

  it('sustained upward thrust overcomes gravity and produces net ascent', () => {
    const state = makeFlightState();
    const after = tickMany(state, 30, 1 / 60, { thrust: true, rotate: 0 });
    expect(after.velocity.y).toBeLessThan(0);
    expect(after.position.y).toBeLessThan(STARTING_SNAPSHOT.position.y);
  });

  it('depletes fuel while thrusting and stops burning at zero', () => {
    const state = makeFlightState({ fuel: 1 });
    const after = tickMany(state, 5, 1 / 60, { thrust: true, rotate: 0 });
    expect(after.fuel).toBe(0);
  });

  it('produces no thrust once fuel is exhausted, even with thrust held', () => {
    const state = makeFlightState({ fuel: 0 });
    const withThrust = tickMany(state, 10, 1 / 60, { thrust: true, rotate: 0 });

    const controlState = makeFlightState({ fuel: 0 });
    const withoutThrust = tickMany(controlState, 10, 1 / 60, { thrust: false, rotate: 0 });

    expect(withThrust.velocity.y).toBeCloseTo(withoutThrust.velocity.y);
    expect(withThrust.position.y).toBeCloseTo(withoutThrust.position.y);
  });

  it('rotating changes the direction sustained thrust accelerates toward', () => {
    const rotatingRight = makeFlightState();
    // Rotate a quarter turn clockwise first, then thrust "up" relative to the ship.
    tickMany(rotatingRight, 30, 1 / 60, { thrust: false, rotate: 1 });
    const after = tickMany(rotatingRight, 20, 1 / 60, { thrust: true, rotate: 0 });
    expect(after.velocity.x).toBeGreaterThan(0);
  });

  it('falls straight through where a fixed floor used to be — ground contact is not its job', () => {
    const state = makeFlightState({ position: { x: 100, y: 185 }, velocity: { x: 0, y: 40 } });
    const after = tickMany(state, 60, 1 / 60, { thrust: false, rotate: 0 });
    expect(after.position.y).toBeGreaterThan(190);
  });

  it('wraps around the side of the world during sustained horizontal drift', () => {
    const state = makeFlightState({ position: { x: 195, y: 100 }, velocity: { x: 50, y: 0 } });
    // At 50px/s for 20 frames of 1/60s, displacement is ~16.7px — enough to
    // cross the width=200 edge and wrap back around to a small x.
    const after = tickMany(state, 20, 1 / 60, { thrust: false, rotate: 0 });
    expect(after.position.x).toBeLessThan(195);
  });
});
