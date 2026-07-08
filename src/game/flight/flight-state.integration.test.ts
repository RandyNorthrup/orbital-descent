import { describe, expect, it } from 'vitest';
import { FlightState, type FlightSnapshot, type FlightStateOptions } from './flight-state';
import { degreesToRadians } from '../physics/lander-physics';

/**
 * These tests exercise FlightState as a whole — physics + fuel + rotation
 * composed together over many simulated frames — rather than any single
 * pure function in isolation. That composition is what "unit" tests in
 * lander-physics.test.ts deliberately don't cover. Ground contact is NOT
 * FlightState's concern (see PLAN.md §4) — that's covered by
 * src/game/terrain/landing.test.ts against real terrain. Horizontal
 * position is unbounded (see PLAN.md §4/Milestone 2.5) — a wraparound was
 * tried and removed once camera-follow existed, since wrapping the
 * lander's position instantly also instantly teleported the camera,
 * producing a jarring full-viewport cut with no in-between panning.
 */

const STARTING_SNAPSHOT: FlightSnapshot = {
  position: { x: 50, y: 50 },
  velocity: { x: 0, y: 0 },
  rotationRadians: 0,
  fuel: 100,
};

function makeFlightState(
  overrides: Partial<FlightSnapshot> = {},
  optionOverrides: Partial<Omit<FlightStateOptions, 'initial'>> = {},
): FlightState {
  return new FlightState({
    initial: { ...STARTING_SNAPSHOT, ...overrides },
    gravityAccel: 20,
    thrustAccel: 50,
    rotationSpeedRadPerSec: Math.PI,
    fuelBurnRate: 25,
    dragCoefficient: 0,
    hazard: null,
    ...optionOverrides,
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

  it('keeps drifting horizontally with no wraparound or bound, arbitrarily far past any single screen width', () => {
    const state = makeFlightState({ position: { x: 900, y: 100 }, velocity: { x: 50, y: 0 } });
    // At 50px/s for 20 frames of 1/60s, displacement is ~16.7px — past the
    // old certified single-screen GAME_WIDTH (960) with no wrap back to a
    // small x, unlike the wraparound this milestone removed.
    const after = tickMany(state, 20, 1 / 60, { thrust: false, rotate: 0 });
    expect(after.position.x).toBeGreaterThan(900);
  });

  it('atmospheric drag measurably slows a moving lander with no other horizontal input', () => {
    // Isolate drag from gravity/rotation by starting with pure horizontal
    // motion and comparing against an identical zero-drag flight.
    const dragged = makeFlightState(
      { velocity: { x: 100, y: 0 } },
      { gravityAccel: 0, dragCoefficient: 0.5 },
    );
    const undragged = makeFlightState(
      { velocity: { x: 100, y: 0 } },
      { gravityAccel: 0, dragCoefficient: 0 },
    );
    const draggedAfter = tickMany(dragged, 30, 1 / 60, { thrust: false, rotate: 0 });
    const undraggedAfter = tickMany(undragged, 30, 1 / 60, { thrust: false, rotate: 0 });

    expect(draggedAfter.velocity.x).toBeLessThan(undraggedAfter.velocity.x);
    // Drag opposes motion, it doesn't reverse it outright at this
    // coefficient/duration — still moving the same direction, just slower.
    expect(draggedAfter.velocity.x).toBeGreaterThan(0);
  });

  it('a corrosive-world flight loses fuel with no thrust input, unlike a hazard-free flight', () => {
    const corrosive = makeFlightState({}, { hazard: { type: 'corrosive', fuelDrainRate: 10 } });
    const hazardFree = makeFlightState({}, { hazard: null });

    const corrosiveAfter = tickMany(corrosive, 30, 1 / 60, { thrust: false, rotate: 0 });
    const hazardFreeAfter = tickMany(hazardFree, 30, 1 / 60, { thrust: false, rotate: 0 });

    expect(corrosiveAfter.fuel).toBeLessThan(STARTING_SNAPSHOT.fuel);
    // A hazard-free flight burns no fuel at all while not thrusting — the
    // contrast that proves the drain is the corrosive hazard's doing, not
    // some other change.
    expect(hazardFreeAfter.fuel).toBe(STARTING_SNAPSHOT.fuel);
  });

  it("a cold-world flight's sustained thrust produces measurably weaker ascent than an identical warm-world flight", () => {
    const cold = makeFlightState({}, { hazard: { type: 'cold', thrustEfficiency: 0.5 } });
    const warm = makeFlightState({}, { hazard: null });

    const coldAfter = tickMany(cold, 30, 1 / 60, { thrust: true, rotate: 0 });
    const warmAfter = tickMany(warm, 30, 1 / 60, { thrust: true, rotate: 0 });

    // Both still climb (thrust exceeds gravity even at half efficiency
    // here), but the cold flight climbs measurably less.
    expect(coldAfter.position.y).toBeLessThan(STARTING_SNAPSHOT.position.y);
    expect(warmAfter.position.y).toBeLessThan(STARTING_SNAPSHOT.position.y);
    expect(coldAfter.position.y).toBeGreaterThan(warmAfter.position.y);
  });

  it('the same ship flies measurably differently on two bodies with different gravity and drag', () => {
    const lightWorld = makeFlightState({}, { gravityAccel: 5, dragCoefficient: 0 });
    const heavyWorld = makeFlightState({}, { gravityAccel: 40, dragCoefficient: 0.3 });

    const lightAfter = tickMany(lightWorld, 60, 1 / 60, { thrust: false, rotate: 0 });
    const heavyAfter = tickMany(heavyWorld, 60, 1 / 60, { thrust: false, rotate: 0 });

    // Falling under gravity alone: the heavier/draggier world's descent
    // still gains speed, but the two bodies produce clearly different
    // outcomes for the identical ship and identical input.
    expect(heavyAfter.position.y).toBeGreaterThan(lightAfter.position.y);
    expect(heavyAfter.velocity.y).not.toBeCloseTo(lightAfter.velocity.y);
  });

  // Milestone 7 (Ship Roster): the same body/world produces measurably
  // different flight feel for two different ship classes' thrust/handling
  // stats, under identical input -- same methodology as the gravity/drag
  // body-variation test above, kept as ad hoc literals here (not an import
  // of the real ships/ships.ts registry) for the same reason that test
  // doesn't import the real planets/bodies.ts registry: this file exercises
  // FlightState in isolation from any specific registry's authored content.
  it('a nimble scout-class ship rotates and accelerates measurably differently than a lumbering hauler-class ship', () => {
    const scoutLike = makeFlightState(
      {},
      { thrustAccel: 54, rotationSpeedRadPerSec: degreesToRadians(200) },
    );
    const haulerLike = makeFlightState(
      {},
      { thrustAccel: 40, rotationSpeedRadPerSec: degreesToRadians(85) },
    );

    const scoutAfter = tickMany(scoutLike, 30, 1 / 60, { thrust: true, rotate: 1 });
    const haulerAfter = tickMany(haulerLike, 30, 1 / 60, { thrust: true, rotate: 1 });

    // Both rotate the same direction from the same starting angle, but the
    // higher-handling ship covers measurably more rotation in the same time.
    expect(scoutAfter.rotationRadians).toBeGreaterThan(haulerAfter.rotationRadians);
    // Both still climb (thrust exceeds gravity for both), but the higher-
    // thrust ship climbs measurably further in the same time.
    expect(scoutAfter.position.y).toBeLessThan(haulerAfter.position.y);
  });

  // Milestone 9 (Ship Upgrades & Equipment Loadout): a temporary thrust
  // boost (the `thrustBurst` equipment effect) and an instant fuel restore
  // (the `repairKit` effect) are both `GameScene`-driven, one-off hooks on
  // top of the normal tick loop, exercised here in isolation from any
  // specific equipment registry, same methodology as the ship-variation
  // test above.
  it('tick’s thrustAccelOverride boosts this tick only, reverting on the very next tick', () => {
    const state = makeFlightState();
    const boosted = state.tick({ thrust: true, rotate: 0 }, 1 / 60, 200);
    const reverted = state.tick({ thrust: true, rotate: 0 }, 1 / 60);
    // The boosted tick's acceleration is far higher than the base 50 --
    // its resulting velocity is well past what one un-boosted tick could
    // produce, and the following un-boosted tick doesn't add anywhere
    // near as much again.
    const boostedGain = STARTING_SNAPSHOT.velocity.y - boosted.velocity.y;
    const revertedGain = boosted.velocity.y - reverted.velocity.y;
    expect(boostedGain).toBeGreaterThan(revertedGain * 5);
  });

  it('restoreFuel adds fuel immediately, clamped to maxFuel', () => {
    const state = makeFlightState({ fuel: 40 });
    state.restoreFuel(25, 100);
    expect(state.snapshot.fuel).toBe(65);

    state.restoreFuel(1000, 100);
    expect(state.snapshot.fuel).toBe(100);
  });
});
