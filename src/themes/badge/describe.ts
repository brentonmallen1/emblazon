import { PALETTES } from './art.ts';
import type { Badge, BadgeIcon, BadgeLayout } from './types.ts';

const LAYOUT_NAMES: Readonly<Record<BadgeLayout, string>> = {
  solid: '',
  band: ' over a band',
  split: ' on a split field',
  chevron: ' above a chevron',
};

const ICON_NAMES: Readonly<Record<BadgeIcon, string>> = {
  bolt: 'a lightning bolt', star: 'a star', spark: 'a spark', chevrons: 'a chevron stack', mountain: 'a mountain',
  wave: 'a set of waves', sun: 'a sun', crown: 'a crown', arrow: 'an arrow', compass: 'a compass', target: 'a target',
  leaf: 'a leaf', gem: 'a gem', moon: 'a crescent moon', flame: 'a flame', plus: 'a cross', heart: 'a heart', atom: 'an atom',
  bars: 'signal bars', infinity: 'an infinity loop', key: 'a key', anchor: 'an anchor',
};

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export function describeBadge(b: Badge): string {
  const colour = capital(PALETTES[b.palette].name);
  if (b.kind === 'flat') return `${colour} ${b.shape} badge: ${ICON_NAMES[b.icon]}${LAYOUT_NAMES[b.layout]}${b.stars ? `, ${b.stars} stars` : ''}`;
  return `${colour} ${b.cut} sticker: ${b.letters} No. ${b.number}, with ${ICON_NAMES[b.icon]}`;
}

/**
 * What you notice at avatar size. Flat: outline, colour, layout, icon and star count.
 * Sticker: the big initials, colour and die-cut; the corner icon and number are too small to tell.
 */
export const badgeLookKey = (b: Badge): string =>
  b.kind === 'flat'
    ? ['flat', b.shape, b.palette, b.layout, b.icon, b.stars].join(' | ')
    : ['sticker', b.cut, b.palette, b.letters].join(' | ');

export const badgeMotif = (b: Badge): string => (b.kind === 'flat' ? b.icon : b.letters);
