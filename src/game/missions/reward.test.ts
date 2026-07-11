import { describe, expect, it } from 'vitest';
import {
  flavorMultiplier,
  massUtilization,
  missionReward,
  perTripCargoReward,
  perTripReward,
  riskBonus,
} from './reward';

describe('massUtilization', () => {
  it('is 0 at zero carried mass and 1 at full budget', () => {
    expect(massUtilization(0, 200)).toBe(0);
    expect(massUtilization(200, 200)).toBe(1);
  });

  it('is the raw carriedMass/massBudget ratio', () => {
    expect(massUtilization(60, 200)).toBeCloseTo(0.3);
  });
});

describe('riskBonus', () => {
  it('is 1.0 at zero utilization and 1.5 at full utilization (coefficient 0.5)', () => {
    expect(riskBonus(0)).toBe(1);
    expect(riskBonus(1)).toBe(1.5);
  });

  it('scales linearly between the two', () => {
    expect(riskBonus(0.3)).toBeCloseTo(1.15);
  });
});

describe('flavorMultiplier', () => {
  it('is 2.5 for establish-presence and 1.0 for every repeatable flavor', () => {
    expect(flavorMultiplier('establish-presence')).toBe(2.5);
    expect(flavorMultiplier('resupply')).toBe(1);
    expect(flavorMultiplier('extraction')).toBe(1);
  });
});

describe('perTripCargoReward', () => {
  it('matches PLAN.md §9.5.7 Example A: 6 troop squads at riskBonus 1.15', () => {
    const reward = perTripCargoReward({ troops: 6, supplies: 0 }, 1.15);
    expect(reward).toBeCloseTo(172.5);
  });

  it('matches PLAN.md §9.5.7 Example B: 20 supply units at riskBonus 1.444', () => {
    const reward = perTripCargoReward({ troops: 0, supplies: 20 }, 1.444);
    expect(reward).toBeCloseTo(144.4, 1);
  });
});

describe('perTripReward', () => {
  it('pays the fixed materials haul (12 × 10 CR) for an extraction trip, scaled by riskBonus, ignoring the (always-empty) delivered manifest', () => {
    expect(perTripReward('extraction', { troops: 0, supplies: 0 }, 1)).toBe(120);
    expect(perTripReward('extraction', { troops: 0, supplies: 0 }, 1.15)).toBeCloseTo(138);
    // Even a hypothetically non-empty manifest wouldn't change the haul —
    // extraction pays on what the trip brings back, not what it carried out.
    expect(perTripReward('extraction', { troops: 6, supplies: 20 }, 1)).toBe(120);
  });

  it('defers to perTripCargoReward for every delivery flavor', () => {
    const manifest = { troops: 6, supplies: 0 };
    expect(perTripReward('establish-presence', manifest, 1.15)).toBe(
      perTripCargoReward(manifest, 1.15),
    );
    expect(perTripReward('resupply', manifest, 1.444)).toBe(perTripCargoReward(manifest, 1.444));
  });
});

describe('missionReward', () => {
  it('matches PLAN.md §9.5.7 Example A (establish-presence, single trip)', () => {
    const reward = missionReward({
      flavor: 'establish-presence',
      cargoRewardAccumulated: 172.5,
      scoreAccumulated: 0,
    });
    // 100 + 172.5 * 2.5 + 0
    expect(reward).toBeCloseTo(531.25);
  });

  it('matches PLAN.md §9.5.7 Example B (resupply, no flavor bonus)', () => {
    const reward = missionReward({
      flavor: 'resupply',
      cargoRewardAccumulated: 144.4,
      scoreAccumulated: 0,
    });
    // 100 + 144.4 * 1.0 + 0
    expect(reward).toBeCloseTo(244.4, 1);
  });

  it('sums score across every credited trip, unscaled by the flavor multiplier', () => {
    const reward = missionReward({
      flavor: 'establish-presence',
      cargoRewardAccumulated: 0,
      scoreAccumulated: 900,
    });
    expect(reward).toBe(100 + 900);
  });

  it('matches PLAN.md §9.5.7 Example C: multi-trip resupply, cargo reward summed across 3 credited trips', () => {
    // 110 + 0 (crash) + 110 + 110 = 330 cumulative cargo reward.
    const reward = missionReward({
      flavor: 'resupply',
      cargoRewardAccumulated: 330,
      scoreAccumulated: 0,
    });
    expect(reward).toBe(100 + 330);
  });
});
