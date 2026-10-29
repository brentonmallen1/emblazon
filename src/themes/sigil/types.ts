import type { ChargeId } from '../heraldry/charges.ts';

/** The three looks a horror sigil comes in: line-art seal, pressed wax, thorned rune. */
export const SIGIL_STYLES = ['seal', 'wax', 'thorn'] as const;
export type SigilStyle = (typeof SIGIL_STYLES)[number];

/** Line colours for the seal and the thorned rune. */
export const INKS = ['blood', 'crimson', 'bone', 'ash', 'rust', 'violet', 'bile'] as const;
export type Ink = (typeof INKS)[number];

export const FIGURES = ['triangle', 'invertedTriangle', 'square', 'diamond', 'pentagram', 'hexagram', 'heptagram', 'twinTriangles', 'crossed', 'none'] as const;
export type Figure = (typeof FIGURES)[number];

/** Creatures that suit a horror seal, from the heraldic charge set (credited where adapted). */
export const CREATURES = ['raven', 'bat', 'owl', 'wolfHead', 'tick', 'scorpion', 'centipede', 'mantis', 'seaSerpent', 'key', 'bell'] as const satisfies readonly ChargeId[];
export type Creature = (typeof CREATURES)[number];

export const SEAL_CENTERS = ['eye', 'radiantEye', 'closedEye', 'crescent', 'keyhole'] as const;
export type SealCenter = (typeof SEAL_CENTERS)[number] | Creature;

/** Watching seal: thin rings, ticks and an inscribed figure around a centre motif. */
export interface SealSigil {
  style: 'seal';
  ink: Ink;
  rings: 1 | 2 | 3;
  dashed: boolean;
  ticks: { count: 0 | 4 | 8 | 12; offset: boolean; style: 'cross' | 'out' | 'in' };
  figure: Figure;
  center: SealCenter;
  /** A ring of rune-like marks between the rings (two rings or more, never under crossing ticks). */
  runes?: { seed: number; count: number };
}

export const WAXES = ['red', 'black', 'bone', 'plum', 'moss', 'ochre', 'oxblood'] as const;
export type Wax = (typeof WAXES)[number];

export const WAX_CENTERS = ['eye', 'dagger', 'skull', 'moon', 'keyhole', 'candle', 'coffin', 'hourglass', 'crossbones'] as const;
/** Wax takes the creatures (bar the long centipede) and the rose, a classic of sealing wax. */
export type WaxCenter = (typeof WAX_CENTERS)[number] | Exclude<Creature, 'centipede'> | 'rose';

export const WAX_RIMS = ['ring', 'double', 'beaded', 'runes', 'stars', 'thorny'] as const;
export type WaxRim = (typeof WAX_RIMS)[number];

export const RIBBONS = ['black', 'red', 'gold', 'violet', 'green', 'bone', 'blue'] as const;
export type Ribbon = (typeof RIBBONS)[number];

/** Wax seal: an irregular blob of wax with a stamped motif, maybe drips, maybe a ribbon. */
export interface WaxSigil {
  style: 'wax';
  wax: Wax;
  /** The blob's outline: radii of its lobes, in order around the centre. */
  lobes: readonly number[];
  rim: WaxRim;
  center: WaxCenter;
  /** The stamp's motif picked out in gold leaf (never on ochre or bone wax, where it would vanish). */
  gilt: boolean;
  /** Drips hanging off the bottom edge: angle in degrees (90 = straight down) and length. */
  drips: readonly { at: number; length: number }[];
  /** Ribbon tails behind the seal (never with drips). */
  ribbon?: Ribbon;
}

export const STAVES = ['single', 'crossed', 'forked'] as const;
export type Stave = (typeof STAVES)[number];

/** Marks on a single or forked stave, at one of five heights. */
export const STAVE_MARKS = ['armsUp', 'armsDown', 'bar', 'diamond', 'flag', 'chevron', 'hook', 'ring'] as const;
/** Marks on a crossed stave, all about its centre. */
export const CROSS_MARKS = ['flag', 'ring', 'lid', 'base', 'stem', 'bar', 'dots'] as const;
export type RuneMarkKind = (typeof STAVE_MARKS)[number] | (typeof CROSS_MARKS)[number];

export interface RuneMark {
  kind: RuneMarkKind;
  /** Height slot 0–4, top to bottom (unused on a crossed stave). */
  slot: number;
  /** Mirror one-sided marks (flag, hook) to the left. */
  flip: boolean;
}

export const THORN_RINGS = ['thorns', 'briar', 'nails'] as const;
export type ThornRing = (typeof THORN_RINGS)[number];

/** Thorned rune: one heavy invented rune inside a ring of thorns, bleeding at the bottom. */
export interface ThornSigil {
  style: 'thorn';
  ink: Ink;
  ring: ThornRing;
  stave: Stave;
  marks: readonly RuneMark[];
  /** A middle tine between a forked stave's arms, making a trident. */
  tine: boolean;
  drips: 0 | 1 | 2 | 3;
}

export type Sigil = SealSigil | WaxSigil | ThornSigil;
