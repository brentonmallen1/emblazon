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

/**
 * The flat style's tinctures: muted and earthy, to sit on dark screens (after jb-rpg's fantasy
 * symbol). Same heraldic meaning, different paint.
 */
export const FLAT_TINCTURE_HEX: Readonly<Record<Tincture, string>> = {
  or: '#D4A15F',
  argent: '#EFE4C8',
  gules: '#7E2F22',
  azure: '#2E4A70',
  vert: '#3E6B47',
  sable: '#221C18',
  purpure: '#5E3A63',
};

/** The flat style's shield edge: a cream rim instead of a dark outline. */
export const FLAT_EDGE = '#EFE4C8';

/** Outline drawn around every division, ordinary, charge and the shield itself. */
export const OUTLINE = '#17161B';

export function isMetal(t: Tincture): t is Metal {
  return (METALS as readonly string[]).includes(t);
}

/** Furs: patterned tinctures that are neither metal nor colour (heraldry v2+). */
export const FURS = ['ermine', 'ermines', 'erminois', 'pean', 'vair'] as const;
export type Fur = (typeof FURS)[number];

/** Anything that can fill a field or an ordinary. Charges stay plain tinctures. */
export type Paint = Tincture | Fur;

/** Counterchanged: takes the field's other tincture on each side of its partition line. */
export const COUNTERCHANGED = 'counterchanged';
export type Counterchanged = typeof COUNTERCHANGED;

export function isFur(p: string): p is Fur {
  return (FURS as readonly string[]).includes(p);
}

/**
 * What reads clearly on (or under) each fur, judged by its ground and spots: ermine is white
 * with black spots, so it pairs with colours; vair is blue and white, so it takes or, gules, sable.
 */
export const FUR_CONTRASTS: Readonly<Record<Fur, readonly Tincture[]>> = {
  ermine: COLORS,
  ermines: METALS,
  erminois: COLORS,
  pean: ['argent'],
  vair: ['or', 'gules', 'sable'],
};

/** Tinctures that contrast with a paint: the rule of tincture, extended to furs. */
export function contrastsWith(p: Paint): readonly Tincture[] {
  if (isFur(p)) return FUR_CONTRASTS[p];
  return isMetal(p) ? COLORS : METALS;
}

/** Blazon spelling, e.g. "Or", "Gules", "Ermine"; "counterchanged" stays lower case. */
export function tinctureName(t: Paint | Counterchanged): string {
  return t === COUNTERCHANGED ? t : t[0].toUpperCase() + t.slice(1);
}
