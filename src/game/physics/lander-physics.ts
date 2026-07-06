import { DEGREES_PER_HALF_TURN } from '../constants';

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

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
  readonly floorMargin: number;
}

/**
 * Wraps the lander horizontally (arcade-style screen wrap) and stops it at a
 * temporary floor vertically, zeroing vertical velocity on contact. This is a
 * placeholder world boundary for Milestone 1's flight-only demo; Milestone 2
 * replaces the floor with real terrain/landing-pad collision.
 */
export function applyWorldBounds(
  position: Vector2,
  velocity: Vector2,
  bounds: WorldBounds,
): { position: Vector2; velocity: Vector2 } {
  const wrappedX = ((position.x % bounds.width) + bounds.width) % bounds.width;
  const floorY = bounds.height - bounds.floorMargin;

  if (position.y >= floorY) {
    return {
      position: { x: wrappedX, y: floorY },
      velocity: { x: velocity.x, y: Math.min(velocity.y, 0) },
    };
  }

  return { position: { x: wrappedX, y: position.y }, velocity };
}
