import {
  addVectors,
  consumeFuel,
  integrate,
  integrateRotation,
  thrustVector,
  wrapHorizontal,
  ZERO_VECTOR,
  type Vector2,
} from '../physics/lander-physics';

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
  readonly worldWidth: number;
  readonly gravityAccel: number;
  readonly thrustAccel: number;
  readonly rotationSpeedRadPerSec: number;
  readonly fuelBurnRate: number;
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
  private readonly worldWidth: number;
  private readonly gravityAccel: number;
  private readonly thrustAccel: number;
  private readonly rotationSpeedRadPerSec: number;
  private readonly fuelBurnRate: number;

  constructor(options: FlightStateOptions) {
    this.currentSnapshot = options.initial;
    this.worldWidth = options.worldWidth;
    this.gravityAccel = options.gravityAccel;
    this.thrustAccel = options.thrustAccel;
    this.rotationSpeedRadPerSec = options.rotationSpeedRadPerSec;
    this.fuelBurnRate = options.fuelBurnRate;
  }

  get snapshot(): FlightSnapshot {
    return this.currentSnapshot;
  }

  tick(input: FlightInput, dtSeconds: number): FlightSnapshot {
    const current = this.currentSnapshot;
    const isThrusting = input.thrust && current.fuel > 0;

    const gravity: Vector2 = { x: 0, y: this.gravityAccel };
    const thrust = isThrusting
      ? thrustVector(current.rotationRadians, this.thrustAccel)
      : ZERO_VECTOR;
    const acceleration = addVectors(gravity, thrust);

    const velocity = integrate(current.velocity, acceleration, dtSeconds);
    const rawPosition = integrate(current.position, velocity, dtSeconds);
    const rotationRadians = integrateRotation(
      current.rotationRadians,
      input.rotate,
      this.rotationSpeedRadPerSec,
      dtSeconds,
    );
    const fuel = isThrusting
      ? consumeFuel(current.fuel, this.fuelBurnRate, dtSeconds)
      : current.fuel;

    this.currentSnapshot = {
      position: { x: wrapHorizontal(rawPosition.x, this.worldWidth), y: rawPosition.y },
      velocity,
      rotationRadians,
      fuel,
    };

    return this.currentSnapshot;
  }
}
