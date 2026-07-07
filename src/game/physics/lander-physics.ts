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
