import { DEGREES_PER_HALF_TURN } from '../constants';

const TAU = Math.PI * 2;

/** Immutable 2D vector. Framework-agnostic — no Phaser import in this module,
 * so it can be unit-tested in plain Node and reused if the renderer ever changes. */
export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO_VECTOR: Vector2 = { x: 0, y: 0 };

export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

/**
 * Thrust vector for a heading measured in radians clockwise from "up"
 * (0 = up, quarter turn clockwise = +x/right), matching Phaser's rotation
 * convention for a sprite whose default artwork points up.
 */
export function thrustVector(headingRadians: number, thrustAccel: number): Vector2 {
  return {
    x: Math.sin(headingRadians) * thrustAccel,
    y: -Math.cos(headingRadians) * thrustAccel,
  };
}

export function integrate(current: Vector2, rateOfChange: Vector2, dtSeconds: number): Vector2 {
  return {
    x: current.x + rateOfChange.x * dtSeconds,
    y: current.y + rateOfChange.y * dtSeconds,
  };
}

/**
 * Linear atmospheric drag: a force opposing velocity, scaled by a single
 * coefficient. No v² term and no directional dependence beyond "opposite
 * the way we're already moving" — the simplest physically-reasonable drag
 * model, chosen to match this project's "arcade game, not a physics
 * sandbox" philosophy (see PLAN.md §4, "Custom physics core, not Phaser
 * Arcade Physics").
 *
 * `dragCoefficient` is a `CelestialBody`'s `atmosphereDensity` field (0 for
 * airless worlds) passed through unchanged — same quantity, named for what
 * it models there (a world property) vs. how it's used here (a drag-physics
 * coefficient); see `planets/celestial-body.ts`. The caller (`FlightState`)
 * adds the returned vector into its per-frame acceleration sum alongside
 * gravity and thrust.
 */
export function atmosphericDrag(velocity: Vector2, dragCoefficient: number): Vector2 {
  return {
    x: -velocity.x * dragCoefficient,
    y: -velocity.y * dragCoefficient,
  };
}

export function integrateRotation(
  currentRadians: number,
  rotationInput: -1 | 0 | 1,
  rotationSpeedRadPerSec: number,
  dtSeconds: number,
): number {
  return currentRadians + rotationInput * rotationSpeedRadPerSec * dtSeconds;
}

export function consumeFuel(currentFuel: number, burnRate: number, dtSeconds: number): number {
  return Math.max(0, currentFuel - burnRate * dtSeconds);
}

/** Wraps radians into (-PI, PI], so accumulated rotation from many spins can
 * still be compared meaningfully against a small "how upright is this"
 * tolerance for landing safety. */
export function normalizeAngle(radians: number): number {
  const wrapped = ((radians + Math.PI) % TAU) - Math.PI;
  return wrapped <= -Math.PI ? wrapped + TAU : wrapped;
}
