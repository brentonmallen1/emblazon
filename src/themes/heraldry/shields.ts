export const SHIELDS = ['heater', 'french', 'spanish', 'swiss', 'norman'] as const;
export type ShieldShape = (typeof SHIELDS)[number];

/**
 * Shield outlines in field coordinates (0–200 × 0–220). Each doubles as the clip for
 * everything drawn on the field, so all of them cover the fess point (100,100) and the
 * chief (top third) generously.
 */
export const SHIELD_PATHS: Readonly<Record<ShieldShape, string>> = {
  heater: 'M0 0H200V90C200 155 160 195 100 220C40 195 0 155 0 90Z',
  french:
    'M0 0H200V165C200 190 185 200 160 200H125C112 200 104 208 100 220C96 208 88 200 75 200H40C15 200 0 190 0 165Z',
  spanish: 'M0 0H200V120A100 100 0 0 1 0 120Z',
  swiss: 'M0 0C40 0 60 16 100 16C140 16 160 0 200 0V100C200 160 160 198 100 220C40 198 0 160 0 100Z',
  norman: 'M0 0H200C200 70 172 150 100 220C28 150 0 70 0 0Z',
};
