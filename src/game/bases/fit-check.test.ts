import { describe, expect, it } from 'vitest';
import { evaluateBaseFit } from './fit-check';
import type { Base, BaseRequirements, CombatantDefinition, HandlingBand, TWRBand } from './base';
import type { CelestialBody, Hazard } from '../planets/celestial-body';
import type { ShipClass } from '../ships/ship';
import type { PermanentUpgrade } from '../ships/upgrades';
import type { EquipmentItem } from '../equipment/equipment';
import { SCORE_TIME_PAR_MS } from '../constants';

const GENEROUS_TWR: TWRBand = { hardFloor: 1.05, comfortable: 1.3 };

function makeShip(overrides: Partial<ShipClass> = {}): ShipClass {
  return {
    id: 'test-ship',
    name: 'Test Ship',
    archetype: 'balanced',
    dryMass: 100,
    baseThrustAccel: 46,
    fuelCapacity: 100,
    burnRate: 18,
    handling: 150,
    equipmentSlots: 3,
    massBudget: 150,
    cargoBayCapacity: 100,
    fuelPerDistanceUnit: 1.2,
    hullFillColorTop: 0xffffff,
    hullFillColorBottom: 0x888888,
    acquisition: { type: 'starter' },
    ...overrides,
  };
}

function makeBody(gravityAccel: number, hazard: Hazard = null): CelestialBody {
  return {
    id: 'test-body',
    name: 'Test Body',
    gravityAccel,
    atmosphereDensity: 0,
    hazard,
    terrainPalette: { fillTopColor: 0x000000, fillBottomColor: 0xffffff, etchStyle: 'rock' },
    skyPalette: {
      skyTopColor: 0x000000,
      skyBottomColor: 0xffffff,
      moonColor: 0xffffff,
      ridgeColor: 0x888888,
      starColor: 0xffffff,
    },
    distance: 0,
  };
}

function makeRequirements(overrides: Partial<BaseRequirements> = {}): BaseRequirements {
  return {
    minTWR: GENEROUS_TWR,
    handling: null,
    hazardCounterTags: [],
    recommendedTags: [],
    combat: { minWeaponTier: 0, minShieldTier: 0 },
    ...overrides,
  };
}

function makeBase(overrides: Partial<Base> = {}): Base {
  return {
    id: 'test-base',
    name: 'Test Base',
    worldId: 'test-body',
    order: 0,
    terrainOptions: {
      seed: 1,
      width: 960,
      height: 640,
      segments: 40,
      minHeightFraction: 0.6,
      maxHeightFraction: 0.85,
      maxStepFraction: 0.03,
      padSegmentCount: 4,
    },
    encounters: [],
    requirements: makeRequirements(),
    difficulty: { axes: { mechanical: 0, spatial: 0, combat: 0 }, dominant: 'tutorial', budget: 0 },
    status: 'discovered-unclaimed',
    isCriticalPath: false,
    unlocks: [],
    localOffset: 0,
    garrisonRequirement: 0,
    ...overrides,
  };
}

describe('evaluateBaseFit — mechanical (TWR) branch', () => {
  it("bands 'comfortable' when TWR is at or above the comfortable threshold", () => {
    const ship = makeShip({ baseThrustAccel: 46, dryMass: 100 });
    const body = makeBody(18); // TWR = 46/18 ≈ 2.556
    const result = evaluateBaseFit(ship, [], [], body, makeBase());
    expect(result.twrBand).toBe('comfortable');
  });

  it("bands 'risky' strictly between hardFloor and comfortable", () => {
    const ship = makeShip({ baseThrustAccel: 12, dryMass: 100 });
    const body = makeBody(10); // TWR = 12/10 = 1.2, between 1.05 and 1.3
    const result = evaluateBaseFit(ship, [], [], body, makeBase());
    expect(result.twrBand).toBe('risky');
    expect(result.warnings).toContain(
      'Thrust-to-weight ratio is tight for this base -- flyable, but with little margin.',
    );
  });

  it("bands 'impossible' strictly below hardFloor and warns", () => {
    const ship = makeShip({ baseThrustAccel: 5, dryMass: 100 });
    const body = makeBody(10); // TWR = 0.5
    const result = evaluateBaseFit(ship, [], [], body, makeBase());
    expect(result.twrBand).toBe('impossible');
    expect(result.warnings).toContain(
      "Thrust-to-weight ratio is below this base's minimum -- landing is not completable.",
    );
  });

  it('equipped mass measurably lowers effective TWR', () => {
    const ship = makeShip({ baseThrustAccel: 46, dryMass: 100 });
    const body = makeBody(18);
    const weapon: EquipmentItem = {
      slotType: 'weapon',
      id: 'heavy-weapon',
      name: 'Heavy Weapon',
      mass: 100,
      acquisition: { type: 'purchase', price: 1 },
      tier: 1,
      damage: 1,
      cooldownMs: 300,
      tags: [],
    };
    const unloaded = evaluateBaseFit(ship, [], [], body, makeBase());
    const loaded = evaluateBaseFit(ship, [], [weapon], body, makeBase());
    expect(loaded.twr).toBeLessThan(unloaded.twr);
  });

  it('a permanent thrust upgrade measurably raises effective TWR', () => {
    const ship = makeShip({ baseThrustAccel: 46, dryMass: 100 });
    const body = makeBody(18);
    const upgrade: PermanentUpgrade = {
      id: 'test-upgrade',
      name: 'Test Upgrade',
      price: 1,
      stat: 'baseThrustAccel',
      amount: 20,
      tags: [],
    };
    const base = evaluateBaseFit(ship, [], [], body, makeBase());
    const upgraded = evaluateBaseFit(ship, [upgrade], [], body, makeBase());
    expect(upgraded.twr).toBeGreaterThan(base.twr);
  });
});

describe('evaluateBaseFit — mechanical (fuel margin) branch', () => {
  it('warns when the estimated fuel margin is insufficient', () => {
    const ship = makeShip({ fuelCapacity: 1, burnRate: 18 });
    const body = makeBody(18);
    const result = evaluateBaseFit(ship, [], [], body, makeBase());
    expect(result.fuelMarginRatio).toBeLessThan(1);
    expect(result.warnings).toContain(
      'Estimated fuel margin is insufficient for a full-thrust descent at this base.',
    );
  });

  it('does not warn when fuel capacity comfortably covers the reference descent burn', () => {
    const referenceDescentSeconds = SCORE_TIME_PAR_MS / 1000;
    const ship = makeShip({ fuelCapacity: 18 * referenceDescentSeconds * 2, burnRate: 18 });
    const body = makeBody(18);
    const result = evaluateBaseFit(ship, [], [], body, makeBase());
    expect(result.fuelMarginRatio).toBeGreaterThan(1);
    expect(result.warnings).not.toContain(
      'Estimated fuel margin is insufficient for a full-thrust descent at this base.',
    );
  });

  it('a corrosive hazard raises the estimated fuel need, lowering the margin', () => {
    const ship = makeShip({ fuelCapacity: 100, burnRate: 18 });
    const clean = evaluateBaseFit(ship, [], [], makeBody(18, null), makeBase());
    const corrosive = evaluateBaseFit(
      ship,
      [],
      [],
      makeBody(18, { type: 'corrosive', fuelDrainRate: 4 }),
      makeBase(),
    );
    expect(corrosive.fuelMarginRatio).toBeLessThan(clean.fuelMarginRatio);
  });

  it('an equipped corrosion-resistant item negates the corrosive drain entirely', () => {
    const ship = makeShip({ fuelCapacity: 100, burnRate: 18 });
    const body = makeBody(18, { type: 'corrosive', fuelDrainRate: 4 });
    const coating: EquipmentItem = {
      slotType: 'utility',
      id: 'test-coating',
      name: 'Test Coating',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      effect: { kind: 'corrosionResistance' },
      tags: ['corrosion-resistant'],
    };
    const withoutCoating = evaluateBaseFit(ship, [], [], body, makeBase());
    const withCoating = evaluateBaseFit(ship, [], [coating], body, makeBase());
    expect(withCoating.fuelMarginRatio).toBeGreaterThan(withoutCoating.fuelMarginRatio);
  });

  it('an equipped fuel tank raises the effective fuel capacity, raising the margin', () => {
    const ship = makeShip({ fuelCapacity: 100, burnRate: 18 });
    const body = makeBody(18);
    const fuelTank: EquipmentItem = {
      slotType: 'utility',
      id: 'test-fuel-tank',
      name: 'Test Fuel Tank',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      effect: { kind: 'fuelCapacityBonus', amount: 50 },
      tags: [],
    };
    const without = evaluateBaseFit(ship, [], [], body, makeBase());
    const withTank = evaluateBaseFit(ship, [], [fuelTank], body, makeBase());
    expect(withTank.fuelMarginRatio).toBeGreaterThan(without.fuelMarginRatio);
  });
});

describe('evaluateBaseFit — spatial (handling) branch', () => {
  it("is 'not-applicable' when the base places no handling demand", () => {
    const result = evaluateBaseFit(makeShip(), [], [], makeBody(18), makeBase());
    expect(result.handlingBand).toBe('not-applicable');
  });

  const HANDLING_BAND: HandlingBand = { hardFloor: 140, comfortable: 200 };

  it("bands 'comfortable' at or above the comfortable threshold", () => {
    const ship = makeShip({ handling: 210 });
    const base = makeBase({ requirements: makeRequirements({ handling: HANDLING_BAND }) });
    expect(evaluateBaseFit(ship, [], [], makeBody(18), base).handlingBand).toBe('comfortable');
  });

  it("bands 'risky' strictly between hardFloor and comfortable, and warns", () => {
    const ship = makeShip({ handling: 160 });
    const base = makeBase({ requirements: makeRequirements({ handling: HANDLING_BAND }) });
    const result = evaluateBaseFit(ship, [], [], makeBody(18), base);
    expect(result.handlingBand).toBe('risky');
    expect(result.warnings).toContain(
      'Handling is tight for this base -- flyable, but with little margin.',
    );
  });

  it("bands 'impossible' strictly below hardFloor, and warns", () => {
    const ship = makeShip({ handling: 100 });
    const base = makeBase({ requirements: makeRequirements({ handling: HANDLING_BAND }) });
    const result = evaluateBaseFit(ship, [], [], makeBody(18), base);
    expect(result.handlingBand).toBe('impossible');
    expect(result.warnings).toContain(
      "Handling is below this base's minimum -- precise maneuvers are not completable.",
    );
  });
});

describe('evaluateBaseFit — combat branch', () => {
  const WEAK_COMBATANT: CombatantDefinition = {
    id: 'test-weak',
    health: 10,
    armorRating: 0,
    contactDamage: 4,
    attack: null,
    movement: { kind: 'static' },
  };
  const ARMORED_COMBATANT: CombatantDefinition = {
    id: 'test-armored',
    health: 10,
    armorRating: 50,
    contactDamage: 0,
    attack: null,
    movement: { kind: 'static' },
  };

  function makeEncounterBase(combatant: CombatantDefinition): Base {
    return makeBase({
      encounters: [
        {
          id: 'test-encounter',
          combatants: [{ definition: combatant, count: 1 }],
          clearWindowMs: 5000,
          triggerAltitude: 100,
          seed: 1,
        },
      ],
    });
  }

  it("is 'not-applicable' for a base with no encounters (every base authored before Milestone 11)", () => {
    const result = evaluateBaseFit(makeShip(), [], [], makeBody(18), makeBase());
    expect(result.combatOutcome).toBe('not-applicable');
  });

  it('is uncleared with no weapon equipped', () => {
    const base = makeEncounterBase(WEAK_COMBATANT);
    const result = evaluateBaseFit(makeShip(), [], [], makeBody(18), base);
    expect(result.combatOutcome).not.toBe('not-applicable');
    if (result.combatOutcome !== 'not-applicable') {
      expect(result.combatOutcome.cleared).toBe(false);
    }
  });

  it('clears once a weapon strong enough to clear the armor floor is equipped', () => {
    const base = makeEncounterBase(WEAK_COMBATANT);
    const weapon: EquipmentItem = {
      slotType: 'weapon',
      id: 'test-weapon',
      name: 'Test Weapon',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      tier: 1,
      damage: 20,
      cooldownMs: 100,
      tags: [],
    };
    const result = evaluateBaseFit(makeShip(), [], [weapon], makeBody(18), base);
    expect(result.combatOutcome).not.toBe('not-applicable');
    if (result.combatOutcome !== 'not-applicable') {
      expect(result.combatOutcome.cleared).toBe(true);
    }
  });

  it('picks the strongest of several equipped weapons, regardless of listed order', () => {
    const base = makeEncounterBase(ARMORED_COMBATANT);
    const weak: EquipmentItem = {
      slotType: 'weapon',
      id: 'test-weak-weapon',
      name: 'Weak Weapon',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      tier: 1,
      damage: 10,
      cooldownMs: 100,
      tags: [],
    };
    const strong: EquipmentItem = {
      slotType: 'weapon',
      id: 'test-strong-weapon',
      name: 'Strong Weapon',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      tier: 2,
      damage: 60,
      cooldownMs: 100,
      tags: [],
    };
    // Weak-then-strong: bestCarriedWeapon's reduce must swap to the later,
    // stronger item -- not just default to whichever came first.
    const weakFirst = evaluateBaseFit(makeShip(), [], [weak, strong], makeBody(18), base);
    // Strong-then-weak: the reduce must also correctly *keep* the earlier,
    // already-strongest item rather than overwriting it with a weaker one.
    const strongFirst = evaluateBaseFit(makeShip(), [], [strong, weak], makeBody(18), base);
    for (const result of [weakFirst, strongFirst]) {
      expect(result.combatOutcome).not.toBe('not-applicable');
      if (result.combatOutcome !== 'not-applicable') {
        // Only the 60-damage weapon clears ARMORED_COMBATANT's 50 armor.
        expect(result.combatOutcome.cleared).toBe(true);
      }
    }
  });

  it('stays uncleared when every equipped weapon’s damage cannot clear the combatant’s armor floor', () => {
    const base = makeEncounterBase(ARMORED_COMBATANT);
    const weapon: EquipmentItem = {
      slotType: 'weapon',
      id: 'test-weapon',
      name: 'Test Weapon',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      tier: 1,
      damage: 20,
      cooldownMs: 100,
      tags: [],
    };
    const result = evaluateBaseFit(makeShip(), [], [weapon], makeBody(18), base);
    expect(result.combatOutcome).not.toBe('not-applicable');
    if (result.combatOutcome !== 'not-applicable') {
      expect(result.combatOutcome.cleared).toBe(false);
    }
  });

  it('an equipped shield raises hullRemaining against the same encounter', () => {
    const base = makeEncounterBase(WEAK_COMBATANT);
    const shield: EquipmentItem = {
      slotType: 'utility',
      id: 'test-shield',
      name: 'Test Shield',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      effect: { kind: 'shield', tier: 1, hitsAbsorbed: 1 },
      tags: [],
    };
    const without = evaluateBaseFit(makeShip(), [], [], makeBody(18), base);
    const withShield = evaluateBaseFit(makeShip(), [], [shield], makeBody(18), base);
    if (
      without.combatOutcome !== 'not-applicable' &&
      withShield.combatOutcome !== 'not-applicable'
    ) {
      expect(withShield.combatOutcome.hullRemaining).toBeGreaterThan(
        without.combatOutcome.hullRemaining,
      );
    } else {
      expect.fail('expected both combatOutcome results to be applicable');
    }
  });
});

describe('evaluateBaseFit — hazard-counter tag warnings', () => {
  it('warns when a hazard-counter tag is not covered by any owned upgrade/equipment', () => {
    const base = makeBase({
      requirements: makeRequirements({ hazardCounterTags: ['corrosion-resistant'] }),
    });
    const result = evaluateBaseFit(makeShip(), [], [], makeBody(18), base);
    expect(result.warnings).toContain('No countermeasure equipped for: corrosion-resistant.');
  });

  it('does not warn once a matching-tag upgrade or equipment item is owned', () => {
    const base = makeBase({
      requirements: makeRequirements({ hazardCounterTags: ['corrosion-resistant'] }),
    });
    const coating: EquipmentItem = {
      slotType: 'utility',
      id: 'test-coating',
      name: 'Test Coating',
      mass: 1,
      acquisition: { type: 'purchase', price: 1 },
      effect: { kind: 'corrosionResistance' },
      tags: ['corrosion-resistant'],
    };
    const result = evaluateBaseFit(makeShip(), [], [coating], makeBody(18), base);
    expect(result.warnings).not.toContain('No countermeasure equipped for: corrosion-resistant.');
  });
});
