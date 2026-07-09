import { describe, expect, it } from 'vitest';
import {
  encounterSpawnY,
  FROSTGATE_ENCOUNTER,
  MERIDIAN_YARD_ENCOUNTER,
  simulateEncounter,
  spawnEncounterCombatants,
} from './encounter';
import type { CombatantDefinition, EncounterSpec } from '../bases/base';
import { findEquipmentById } from '../equipment/equipment';
import { SHIP_BASE_HULL_POINTS } from '../constants';

const WEAK_UNARMED: CombatantDefinition = {
  id: 'test-weak',
  health: 20,
  armorRating: 0,
  contactDamage: 5,
  attack: null,
  movement: { kind: 'static' },
};

const WEAK_ENCOUNTER: EncounterSpec = {
  id: 'test-weak-encounter',
  combatants: [{ definition: WEAK_UNARMED, count: 1 }],
  clearWindowMs: 2000,
  triggerAltitude: 100,
  seed: 7,
};

const ARMORED: CombatantDefinition = {
  id: 'test-armored',
  health: 20,
  armorRating: 10,
  contactDamage: 0,
  attack: null,
  movement: { kind: 'static' },
};

const ARMORED_ENCOUNTER: EncounterSpec = {
  id: 'test-armored-encounter',
  combatants: [{ definition: ARMORED, count: 1 }],
  clearWindowMs: 5000,
  triggerAltitude: 100,
  seed: 8,
};

describe('spawnEncounterCombatants', () => {
  it('spawns exactly the authored count per group, all at spawnY', () => {
    const combatants = spawnEncounterCombatants(MERIDIAN_YARD_ENCOUNTER, 1440, 150, 220);
    expect(combatants).toHaveLength(4);
    combatants.forEach((combatant) => {
      expect(combatant.position.y).toBe(220);
    });
  });

  it('is deterministic given the same seed -- identical positions on repeat calls', () => {
    const first = spawnEncounterCombatants(MERIDIAN_YARD_ENCOUNTER, 1440, 150, 220);
    const second = spawnEncounterCombatants(MERIDIAN_YARD_ENCOUNTER, 1440, 150, 220);
    expect(second.map((combatant) => combatant.position.x)).toEqual(
      first.map((combatant) => combatant.position.x),
    );
  });

  it('spreads combatants within spawnCenterX +/- spawnHalfWidth, centered on the player, not the whole world', () => {
    const combatants = spawnEncounterCombatants(MERIDIAN_YARD_ENCOUNTER, 1440, 150, 220);
    combatants.forEach((combatant) => {
      expect(combatant.position.x).toBeGreaterThanOrEqual(1440 - 150);
      expect(combatant.position.x).toBeLessThan(1440 + 150);
    });
  });
});

describe('encounterSpawnY', () => {
  it('is a fixed margin above triggerAltitude', () => {
    expect(encounterSpawnY(MERIDIAN_YARD_ENCOUNTER)).toBeLessThan(
      MERIDIAN_YARD_ENCOUNTER.triggerAltitude,
    );
  });
});

describe('simulateEncounter', () => {
  it('is never cleared with no weapon equipped, but contact damage still lands (worst case)', () => {
    const result = simulateEncounter(WEAK_ENCOUNTER, null, 0, 30);
    expect(result.cleared).toBe(false);
    expect(result.hullRemaining).toBe(25);
  });

  it('is never cleared when the weapon cannot clear the combatant’s armor floor', () => {
    const result = simulateEncounter(ARMORED_ENCOUNTER, { damage: 10, cooldownMs: 200 }, 0, 30);
    expect(result.cleared).toBe(false);
    expect(result.hullRemaining).toBe(30);
  });

  it('clears when the weapon defeats the combatant within clearWindowMs', () => {
    const result = simulateEncounter(WEAK_ENCOUNTER, { damage: 20, cooldownMs: 100 }, 0, 30);
    expect(result.cleared).toBe(true);
  });

  it('does not clear when the weapon is too slow to defeat the combatant before clearWindowMs elapses', () => {
    const result = simulateEncounter(WEAK_ENCOUNTER, { damage: 1, cooldownMs: 500 }, 0, 30);
    expect(result.cleared).toBe(false);
  });

  it('a faster fire rate (same damage) clears in time where a slower one does not -- weapon stats measurably change the outcome', () => {
    const fast = simulateEncounter(WEAK_ENCOUNTER, { damage: 20, cooldownMs: 100 }, 0, 30);
    const slow = simulateEncounter(WEAK_ENCOUNTER, { damage: 20, cooldownMs: 3000 }, 0, 30);
    expect(fast.cleared).toBe(true);
    expect(slow.cleared).toBe(false);
  });

  it('a shield hit absorbs the encounter’s contact damage, raising hullRemaining', () => {
    const withoutShield = simulateEncounter(WEAK_ENCOUNTER, null, 0, 30);
    const withShield = simulateEncounter(WEAK_ENCOUNTER, null, 1, 30);
    expect(withShield.hullRemaining).toBeGreaterThan(withoutShield.hullRemaining);
    expect(withShield.hullRemaining).toBe(30);
  });

  it('real registry: the tier-1 Pulse Cannon cannot clear Frostgate’s Glacian Warden', () => {
    const pulseCannon = findEquipmentById('pulse-cannon');
    if (pulseCannon.slotType !== 'weapon') {
      throw new Error('expected pulse-cannon to be a weapon');
    }
    const result = simulateEncounter(
      FROSTGATE_ENCOUNTER,
      { damage: pulseCannon.damage, cooldownMs: pulseCannon.cooldownMs },
      0,
      SHIP_BASE_HULL_POINTS,
    );
    expect(result.cleared).toBe(false);
  });

  it('real registry: the tier-2 Autocannon clears Frostgate’s Glacian Warden within its clearWindowMs', () => {
    const autocannon = findEquipmentById('autocannon');
    if (autocannon.slotType !== 'weapon') {
      throw new Error('expected autocannon to be a weapon');
    }
    const result = simulateEncounter(
      FROSTGATE_ENCOUNTER,
      { damage: autocannon.damage, cooldownMs: autocannon.cooldownMs },
      0,
      SHIP_BASE_HULL_POINTS,
    );
    expect(result.cleared).toBe(true);
  });
});
