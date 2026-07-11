import { describe, expect, it } from 'vitest';
import { hasItemIcon } from './item-icon-ids';
import { EQUIPMENT_ITEMS } from '../equipment/equipment';
import { UPGRADES } from '../ships/upgrades';

describe('item icon registry', () => {
  it('has an icon for every equipment item (a new item cannot ship iconless)', () => {
    for (const item of EQUIPMENT_ITEMS) {
      expect(hasItemIcon(item.id), `missing icon for equipment '${item.id}'`).toBe(true);
    }
  });

  it('has an icon for every permanent upgrade', () => {
    for (const upgrade of UPGRADES) {
      expect(hasItemIcon(upgrade.id), `missing icon for upgrade '${upgrade.id}'`).toBe(true);
    }
  });

  it('reports false for an unknown id (createItemIconImage throws on these at render time)', () => {
    expect(hasItemIcon('not-a-real-item')).toBe(false);
  });
});
