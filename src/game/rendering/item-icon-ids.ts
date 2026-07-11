/**
 * The ids `rendering/item-icons.ts` draws, as pure data — split from the
 * Phaser-importing drawer module so the registry-completeness pin
 * (`item-icons.test.ts`: every EQUIPMENT_ITEMS/UPGRADES id has an icon)
 * can run in Node like every other pure test. `item-icons.ts` verifies at
 * module load that its drawer table covers exactly this list, so the two
 * files can't drift apart silently.
 */
export const ITEM_ICON_IDS: readonly string[] = [
  'pulse-cannon',
  'autocannon',
  'fuel-tank',
  'corrosion-coating',
  'thermal-lining',
  'barrier-shield',
  'repair-kit',
  'thrust-booster',
  'stronger-engines',
  'lighter-hull-alloy',
  'extended-fuel-cells',
  'efficient-injectors',
];

export function hasItemIcon(id: string): boolean {
  return ITEM_ICON_IDS.includes(id);
}
