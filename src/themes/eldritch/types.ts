/** An eldritch relic. The stable contract between generate() and render(). Imagery only. */
export interface Relic {
  frame: FrameShape;
  /** Faint pattern on the field, behind the subject. */
  pattern: Pattern;
  metal: MetalId;
  field: FieldId;
  /** The colour of eyes and other things that shouldn't be lit. */
  glow: GlowId;
  subject: Idol | Tablet | Book;
  /** Star placement, ribbon and page tints, cracks: detail you don't notice at avatar size. */
  seed: number;
}

export const FRAMES = ['token', 'octagon', 'arch', 'cartouche'] as const;
export type FrameShape = (typeof FRAMES)[number];

export const PATTERNS = ['plain', 'rays', 'rings', 'stars'] as const;
export type Pattern = (typeof PATTERNS)[number];

export const METALS = ['brass', 'copper', 'silver', 'verdigris'] as const;
export type MetalId = (typeof METALS)[number];

export const FIELDS = ['abyss', 'plum', 'midnight', 'oxblood', 'olive', 'slate'] as const;
export type FieldId = (typeof FIELDS)[number];

export const GLOWS = ['bile', 'amber', 'ember', 'violet', 'witchlight'] as const;
export type GlowId = (typeof GLOWS)[number];

export const STONES = ['limestone', 'soapstone', 'bone', 'jade', 'basalt', 'sandstone'] as const;
export type StoneId = (typeof STONES)[number];

export const LEATHERS = ['oxblood', 'moss', 'umber', 'wine', 'navy', 'black'] as const;
export type LeatherId = (typeof LEATHERS)[number];

export const FLESH = ['moss', 'violet', 'teal', 'blood', 'grey'] as const;
export type FleshId = (typeof FLESH)[number];

export const KINDS = ['idol', 'tablet', 'book'] as const;
export type SubjectKind = (typeof KINDS)[number];

/** A winged idol with a tentacled face. */
export interface Idol {
  kind: 'idol';
  stone: StoneId;
  head: 'dome' | 'mantle' | 'crowned' | 'horned';
  eyes: 1 | 2 | 3;
  tentacles: 4 | 5 | 6 | 7;
  /** Tentacle tips curl outward instead of hanging straight. */
  curl: boolean;
  wings: 'spread' | 'raised' | 'bust';
  plinth: 'block' | 'stepped' | 'none';
}

/** A carved stone tablet. */
export interface Tablet {
  kind: 'tablet';
  stone: StoneId;
  shape: 'arched' | 'pointed' | 'stepped' | 'broken';
  carving: 'figure' | 'eye' | 'star' | 'kraken';
  /** A small carving above the main one. */
  crown: 'star' | 'eye' | 'moon' | 'none';
  runes: 1 | 2;
}

/** An open grimoire with tentacles rising from its spine. */
export interface Book {
  kind: 'book';
  leather: LeatherId;
  flesh: FleshId;
  /** What is inked on each page. */
  left: 'triangle' | 'pentacle' | 'moon' | 'rings';
  right: 'eye' | 'squid' | 'star' | 'pyramid';
  tentacles: 2 | 3 | 4;
  binding: 'corners' | 'studs' | 'plain';
  ribbons: 0 | 1 | 2;
}
