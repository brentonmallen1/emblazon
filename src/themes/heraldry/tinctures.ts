export const METALS = ['or', 'argent'] as const;
export const COLORS = ['gules', 'azure', 'vert', 'sable', 'purpure'] as const;
export const TINCTURES = [...METALS, ...COLORS] as const;

export type Metal = (typeof METALS)[number];
export type Color = (typeof COLORS)[number];
export type Tincture = (typeof TINCTURES)[number];

/** Tuned for flat rendering at small sizes, not literal pigments. */
export const TINCTURE_HEX: Readonly<Record<Tincture, string>> = {
  or: '#EDB829',
  argent: '#F3F1EA',
  gules: '#C8312E',
  azure: '#2457A6',
  vert: '#2D8650',
  sable: '#26252B',
  purpure: '#7B3F8F',
};

/** Outline drawn around every division, ordinary, charge and the shield itself. */
export const OUTLINE = '#17161B';

export function isMetal(t: Tincture): t is Metal {
  return (METALS as readonly string[]).includes(t);
}

/** Blazon spelling, e.g. "Or", "Gules". */
export function tinctureName(t: Tincture): string {
  return t[0].toUpperCase() + t.slice(1);
}
