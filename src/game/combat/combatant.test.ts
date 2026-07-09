import { describe, expect, it } from 'vitest';
import {
  advanceCombatantState,
  GLACIAN_WARDEN,
  spawnCombatant,
  VERDALIS_WASP,
  type CombatantState,
} from './combatant';
import { effectiveDamage } from './damage';
import type { CombatantDefinition } from '../bases/base';
import { findEquipmentById } from '../equipment/equipment';
import { headingVector } from '../physics/lander-physics';

const STATIC_DEFINITION: CombatantDefinition = {
  id: 'test-turret',
  health: 10,
  armorRating: 0,
  contactDamage: 0,
  attack: { damagePerHit: 5, cooldownMs: 1000, range: 200 },
  movement: { kind: 'static' },
};

describe('spawnCombatant', () => {
  it('starts at full health, zero cooldown, facing 0', () => {
    const state = spawnCombatant(VERDALIS_WASP, { x: 5, y: 10 });
    expect(state).toEqual({
      definition: VERDALIS_WASP,
      position: { x: 5, y: 10 },
      headingRadians: 0,
      health: VERDALIS_WASP.health,
      attackCooldownRemainingMs: 0,
    });
  });
});

describe('advanceCombatantState -- static', () => {
  it('never moves regardless of player position', () => {
    const state = spawnCombatant(STATIC_DEFINITION, { x: 100, y: 100 });
    const next = advanceCombatantState(state, { x: 0, y: 0 }, 1);
    expect(next.position).toEqual({ x: 100, y: 100 });
  });
});

describe('advanceCombatantState -- homing', () => {
  it('turns toward the player and closes distance over time', () => {
    let state: CombatantState = spawnCombatant(VERDALIS_WASP, { x: 0, y: 0 });
    const player = { x: 0, y: 200 };
    const initialDistance = Math.hypot(player.x - state.position.x, player.y - state.position.y);
    for (let i = 0; i < 120; i += 1) {
      state = advanceCombatantState(state, player, 1 / 30);
    }
    const finalDistance = Math.hypot(player.x - state.position.x, player.y - state.position.y);
    expect(finalDistance).toBeLessThan(initialDistance);
    // A full 180-degree turn at 180deg/s takes 1s (30 ticks at 1/30s),
    // well within the 120 ticks simulated -- heading should now point
    // close to straight down (toward the player, who never moves).
    // Compared via the actual unit facing vector, not the raw
    // `headingRadians` number directly: `normalizeAngle`'s -pi/pi branch
    // cut can make two physically near-identical headings (e.g. 179 vs
    // -179 degrees) differ hugely as raw numbers, and the wasp's own
    // position drift during the turn (it keeps moving while still
    // mid-turn) means the converged heading isn't exactly pi either.
    const facing = headingVector(state.headingRadians, 1);
    expect(Math.abs(facing.x)).toBeLessThan(0.3);
    expect(facing.y).toBeGreaterThan(0.9);
  });

  it("is turn-rate-limited: a single tick can't snap directly onto the target heading", () => {
    const state = spawnCombatant(VERDALIS_WASP, { x: 0, y: 0 });
    // Player directly behind (heading 0 = up/-y; player at +y is a 180
    // degree turn) -- at 180deg/s, one 1/60s tick can turn at most 3
    // degrees, nowhere near enough to face down and move toward the player.
    const next = advanceCombatantState(state, { x: 0, y: 200 }, 1 / 60);
    expect(next.position.y).toBeLessThanOrEqual(0.5);
  });
});

describe('advanceCombatantState -- diveStrafe', () => {
  const definition: CombatantDefinition = {
    id: 'test-diver',
    health: 10,
    armorRating: 0,
    contactDamage: 4,
    attack: null,
    movement: { kind: 'diveStrafe', speed: 40, diveAltitude: 150 },
  };

  it('moves toward the diveAltitude and the player x position', () => {
    const state = spawnCombatant(definition, { x: 0, y: 0 });
    const next = advanceCombatantState(state, { x: 100, y: 0 }, 1);
    const scale = 40 / Math.hypot(100, 150);
    expect(next.position.x).toBeCloseTo(100 * scale, 5);
    expect(next.position.y).toBeCloseTo(150 * scale, 5);
  });

  it('stops exactly at the target without overshooting once within one tick’s reach', () => {
    const state = spawnCombatant(definition, { x: 100, y: 149 });
    const next = advanceCombatantState(state, { x: 100, y: 0 }, 1);
    expect(next.position).toEqual({ x: 100, y: 150 });
  });

  it('stays exactly in place once already sitting on the target (zero distance)', () => {
    const state = spawnCombatant(definition, { x: 100, y: 150 });
    const next = advanceCombatantState(state, { x: 100, y: 0 }, 1);
    expect(next.position).toEqual({ x: 100, y: 150 });
  });
});

describe('GLACIAN_WARDEN armor floor (the "Bruiser" puzzle archetype)', () => {
  it('hard-fails the tier-1 Pulse Cannon -- zero effective damage', () => {
    const pulseCannon = findEquipmentById('pulse-cannon');
    expect(pulseCannon.slotType).toBe('weapon');
    if (pulseCannon.slotType === 'weapon') {
      expect(effectiveDamage(pulseCannon.damage, GLACIAN_WARDEN.armorRating)).toBe(0);
    }
  });

  it('is still clearable by the tier-2 Autocannon', () => {
    const autocannon = findEquipmentById('autocannon');
    expect(autocannon.slotType).toBe('weapon');
    if (autocannon.slotType === 'weapon') {
      expect(effectiveDamage(autocannon.damage, GLACIAN_WARDEN.armorRating)).toBeGreaterThan(0);
    }
  });
});
