import { normalizeAngle, type Vector2 } from '../physics/lander-physics';
import type { LandingPad } from './terrain-generator';

export interface LandingThresholds {
  readonly maxSafeSpeed: number;
  readonly maxSafeAngleRadians: number;
}

export function isOnLandingPad(x: number, pad: LandingPad): boolean {
  return x >= pad.xStart && x <= pad.xEnd;
}

/** Call once ground contact is already detected (see GameScene) — decides
 * whether that touchdown was gentle and upright enough, and on the pad. */
export function isSafeLanding(
  touchdown: { readonly velocity: Vector2; readonly rotationRadians: number },
  onPad: boolean,
  thresholds: LandingThresholds,
): boolean {
  const speed = Math.hypot(touchdown.velocity.x, touchdown.velocity.y);
  const uprightness = Math.abs(normalizeAngle(touchdown.rotationRadians));
  return onPad && speed <= thresholds.maxSafeSpeed && uprightness <= thresholds.maxSafeAngleRadians;
}
