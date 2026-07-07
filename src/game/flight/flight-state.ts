import {
  addVectors,
  atmosphericDrag,
  consumeFuel,
  integrate,
  integrateRotation,
  thrustVector,
  ZERO_VECTOR,
  type Vector2,
} from '../physics/lander-physics';
import type { Hazard } from '../planets/celestial-body';

export interface FlightInput {
  readonly thrust: boolean;
  readonly rotate: -1 | 0 | 1;
}

export interface FlightSnapshot {
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly rotationRadians: number;
  readonly fuel: number;
}

export interface FlightStateOptions {
  readonly initial: FlightSnapshot;
  /** Body/environment stats (Milestone 5) — sourced from the selected
   * CelestialBody, not a ship-intrinsic constant. */
  readonly gravityAccel: number;
  /** Ship-intrinsic stats — owned by Milestone 7's ShipClass once that
   * milestone lands; a global constant until then. */
  readonly thrustAccel: number;
  readonly rotationSpeedRadPerSec: number;
  readonly fuelBurnRate: number;
  /** Body/environment stat — CelestialBody.atmosphereDensity, passed
   * through unchanged into atmosphericDrag. 0 for airless worlds. */
  readonly dragCoefficient: number;
  /** Body/environment stat — CelestialBody.hazard. Required (not
   * optional) so every call site is explicit about hazard status rather
   * than relying on an implicit "no hazard" default. */
  readonly hazard: Hazard;
}

/**
 * Orchestrates the pure physics functions into a stateful, frame-by-frame
 * flight simulation. Deliberately has no Phaser dependency: a Scene owns one
 * of these, feeds it keyboard input + delta time each frame, and reads the
 * resulting snapshot back to position its game objects. Keeping this
 * Phaser-free is what makes it unit/integration-testable without a browser.
 */
export class FlightState {
  private currentSnapshot: FlightSnapshot;
  private readonly gravityAccel: number;
  private readonly thrustAccel: number;
  private readonly rotationSpeedRadPerSec: number;
  private readonly fuelBurnRate: number;
  private readonly dragCoefficient: number;
  /** Derived once from `hazard` at construction, not re-derived every tick:
   * 1 (no reduction) unless a cold hazard is active. */
  private readonly thrustEfficiency: number;
  /** Derived once from `hazard`: 0 (no passive drain) unless a corrosive
   * hazard is active. */
  private readonly passiveFuelDrainRate: number;

  constructor(options: FlightStateOptions) {
    this.currentSnapshot = options.initial;
    this.gravityAccel = options.gravityAccel;
    this.thrustAccel = options.thrustAccel;
    this.rotationSpeedRadPerSec = options.rotationSpeedRadPerSec;
    this.fuelBurnRate = options.fuelBurnRate;
    this.dragCoefficient = options.dragCoefficient;
    this.thrustEfficiency = options.hazard?.type === 'cold' ? options.hazard.thrustEfficiency : 1;
    this.passiveFuelDrainRate =
      options.hazard?.type === 'corrosive' ? options.hazard.fuelDrainRate : 0;
  }

  get snapshot(): FlightSnapshot {
    return this.currentSnapshot;
  }

  tick(input: FlightInput, dtSeconds: number): FlightSnapshot {
    const current = this.currentSnapshot;
    const isThrusting = input.thrust && current.fuel > 0;

    const gravity: Vector2 = { x: 0, y: this.gravityAccel };
    const thrust = isThrusting
      ? thrustVector(current.rotationRadians, this.thrustAccel * this.thrustEfficiency)
      : ZERO_VECTOR;
    const drag = atmosphericDrag(current.velocity, this.dragCoefficient);
    const acceleration = addVectors(addVectors(gravity, thrust), drag);

    const velocity = integrate(current.velocity, acceleration, dtSeconds);
    const rawPosition = integrate(current.position, velocity, dtSeconds);
    const rotationRadians = integrateRotation(
      current.rotationRadians,
      input.rotate,
      this.rotationSpeedRadPerSec,
      dtSeconds,
    );
    // A corrosive hazard drains fuel passively every tick regardless of
    // thrust input, composed into the same consumeFuel call as the normal
    // thrust burn rather than a second, separate subtraction.
    const burnRateThisTick = (isThrusting ? this.fuelBurnRate : 0) + this.passiveFuelDrainRate;
    const fuel = consumeFuel(current.fuel, burnRateThisTick, dtSeconds);

    this.currentSnapshot = {
      position: rawPosition,
      velocity,
      rotationRadians,
      fuel,
    };

    return this.currentSnapshot;
  }
}
