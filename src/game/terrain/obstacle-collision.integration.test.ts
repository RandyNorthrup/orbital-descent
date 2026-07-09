import { describe, expect, it } from 'vitest';
import { FlightState } from '../flight/flight-state';
import { isCollidingWithObstacle } from './obstacles';
import { BASES } from '../bases/bases';
import { LANDER_RADIUS, LANDER_START_X, LANDER_START_Y } from '../constants';
import { findShipById } from '../ships/ships';

/**
 * Exercises FlightState (real per-frame integration, not a single pure
 * function) flying toward Scarp Outpost's real, shipped obstacle
 * (`bases.ts`) — proving Milestone 10's curated placement is actually
 * reachable from the real spawn point under realistic ship physics, and
 * that `isCollidingWithObstacle` correctly fires partway through that
 * real trajectory, before the ship would otherwise reach the ground.
 * Complements `terrain/obstacles.test.ts` (the pure collision-geometry
 * unit tests, synthetic coordinates) and `bases.test.ts` (the curated
 * layout's own non-overlap-with-the-pad proof) — this is the one place
 * all three (real ship, real spawn point, real obstacle) fly together.
 */
function findScarpOutpostObstacle() {
  const scarpOutpost = BASES.find((base) => base.id === 'scarp-outpost');
  if (!scarpOutpost) {
    throw new Error('test setup error: scarp-outpost not found in BASES');
  }
  const obstacle = scarpOutpost.terrainOptions.obstacles?.[0];
  if (!obstacle) {
    throw new Error('test setup error: scarp-outpost has no authored obstacle');
  }
  return obstacle;
}

describe('a real flight toward a curated obstacle', () => {
  it('collides with Scarp Outpost’s authored spire partway through a realistic descent from spawn', () => {
    const obstacle = findScarpOutpostObstacle();
    const ship = findShipById('falcon');

    const state = new FlightState({
      initial: {
        position: { x: LANDER_START_X, y: LANDER_START_Y },
        velocity: { x: 0, y: 0 },
        rotationRadians: 0,
        fuel: ship.fuelCapacity,
      },
      gravityAccel: 20, // representative mid-range body gravity, not tied to any one CelestialBody
      thrustAccel: ship.baseThrustAccel,
      rotationSpeedRadPerSec: (ship.handling * Math.PI) / 180,
      fuelBurnRate: ship.burnRate,
      dragCoefficient: 0,
      hazard: null,
    });

    // The spire sits to the right of spawn (LANDER_START_X = 1440, spire
    // x=[1470,1494]) -- a brief rotate-right-and-thrust pulse drifts the
    // ship rightward, then it free-falls the rest of the way, same
    // two-phase "steer, then descend" shape a real player would fly.
    const STEER_FRAMES = 20;
    const FALL_FRAMES = 300;
    const DT_SECONDS = 1 / 60;

    for (let i = 0; i < STEER_FRAMES; i += 1) {
      state.tick({ thrust: true, rotate: 1 }, DT_SECONDS);
    }

    let collided = false;
    for (let i = 0; i < FALL_FRAMES && !collided; i += 1) {
      const snapshot = state.tick({ thrust: false, rotate: 0 }, DT_SECONDS);
      collided = isCollidingWithObstacle(snapshot.position, LANDER_RADIUS, obstacle);
      // A collision must be detected before the ship would have reached
      // the obstacle's own lower edge -- proves the hit happens *during*
      // a realistic fall through the obstacle's real vertical span, not
      // as an artifact of falling straight through and past it undetected.
      if (snapshot.position.y > obstacle.yBottom + LANDER_RADIUS) {
        break;
      }
    }

    expect(collided).toBe(true);
  });
});
