export const BADGE_KINDS = ['flat', 'sticker'] as const;
export type BadgeKind = (typeof BADGE_KINDS)[number];

export const BADGE_SHAPES = ['circle', 'shield', 'hexagon', 'rounded', 'crest', 'octagon'] as const;
export type BadgeShape = (typeof BADGE_SHAPES)[number];

export const LAYOUTS = ['solid', 'band', 'split', 'chevron'] as const;
export type BadgeLayout = (typeof LAYOUTS)[number];

export const STICKER_CUTS = ['tile', 'square', 'ticket', 'pill', 'hexagon'] as const;
export type StickerCut = (typeof STICKER_CUTS)[number];

export const ICONS = [
  'bolt', 'star', 'spark', 'chevrons', 'mountain', 'wave', 'sun', 'crown', 'arrow', 'compass', 'target',
  'leaf', 'gem', 'moon', 'flame', 'plus', 'heart', 'atom', 'bars', 'infinity', 'key', 'anchor',
] as const;
export type BadgeIcon = (typeof ICONS)[number];

export const BADGE_PALETTES = [
  'indigo', 'teal', 'coral', 'mustard', 'slate', 'emerald', 'plum', 'sky', 'ink', 'cream', 'tangerine', 'rose',
] as const;
export type BadgePalette = (typeof BADGE_PALETTES)[number];

/** Modern A: a flat filled badge with one bold icon, after jb-rpg's modern symbol. */
export interface FlatBadge {
  kind: 'flat';
  shape: BadgeShape;
  palette: BadgePalette;
  layout: BadgeLayout;
  icon: BadgeIcon;
  stars: 0 | 3 | 5;
}

/** Modern C: a die-cut vinyl sticker with big initials, a small icon and a number pill. */
export interface StickerBadge {
  kind: 'sticker';
  cut: StickerCut;
  palette: BadgePalette;
  /** Two capitals, drawn with the stroke font. */
  letters: string;
  /** Two digits in the pill, e.g. "07". */
  number: string;
  icon: BadgeIcon;
  /** Degrees; never near zero, so it reads as stuck on by hand. */
  tilt: number;
}

export type Badge = FlatBadge | StickerBadge;
