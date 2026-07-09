import { describe, expect, it } from 'vitest';
import { advanceProjectile, isProjectileExpired, spawnProjectile } from './projectile';

describe('spawnProjectile', () => {
  it('starts at the given origin with zero distance traveled', () => {
    const projectile = spawnProjectile({ x: 10, y: 20 }, 0, 500, 15);
    expect(projectile.position).toEqual({ x: 10, y: 20 });
    expect(projectile.distanceTraveled).toBe(0);
    expect(projectile.damage).toBe(15);
  });

  it('fires straight up (heading 0) as a negative-y velocity', () => {
    const projectile = spawnProjectile({ x: 0, y: 0 }, 0, 500, 15);
    expect(projectile.velocity.x).toBeCloseTo(0);
    expect(projectile.velocity.y).toBeCloseTo(-500);
  });

  it('fires to the right for a quarter-turn clockwise heading', () => {
    const projectile = spawnProjectile({ x: 0, y: 0 }, Math.PI / 2, 500, 15);
    expect(projectile.velocity.x).toBeCloseTo(500);
    expect(projectile.velocity.y).toBeCloseTo(0);
  });
});

describe('advanceProjectile', () => {
  it('moves position by velocity * dt and accumulates distance traveled', () => {
    const projectile = spawnProjectile({ x: 0, y: 0 }, 0, 500, 15);
    const advanced = advanceProjectile(projectile, 0.1);
    expect(advanced.position.y).toBeCloseTo(-50);
    expect(advanced.distanceTraveled).toBeCloseTo(50);
  });

  it('accumulates distance across multiple ticks', () => {
    let projectile = spawnProjectile({ x: 0, y: 0 }, 0, 500, 15);
    projectile = advanceProjectile(projectile, 0.1);
    projectile = advanceProjectile(projectile, 0.1);
    expect(projectile.distanceTraveled).toBeCloseTo(100);
  });
});

describe('isProjectileExpired', () => {
  it('is false while distance traveled is under maxRange', () => {
    const projectile = spawnProjectile({ x: 0, y: 0 }, 0, 500, 15);
    expect(isProjectileExpired(projectile, 400)).toBe(false);
  });

  it('is true once distance traveled reaches maxRange', () => {
    let projectile = spawnProjectile({ x: 0, y: 0 }, 0, 500, 15);
    projectile = advanceProjectile(projectile, 1);
    expect(projectile.distanceTraveled).toBeCloseTo(500);
    expect(isProjectileExpired(projectile, 400)).toBe(true);
  });
});
