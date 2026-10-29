import { PALETTES } from './render.ts';
import type { Insignia } from './types.ts';

const STYLE_NAMES = { hazard: 'hazard tag', neon: 'neon tag', stamp: 'corp stamp' } as const;
const SHAPE_NAMES: Readonly<Record<Insignia['shape'], string>> = {
  clipped: 'clipped corners',
  notched: 'notched corners',
  tab: 'a side tab',
  hex: 'hexagonal ends',
  bevel: 'a beveled corner',
  corner: 'one cut corner',
  double: 'two cut corners',
  notch: 'notched corners',
};

export function describeInsignia(t: Insignia): string {
  const mark = t.style === 'hazard' && t.join === 'slash' ? t.mark.join('/') : t.mark.join('');
  const colour = PALETTES[t.palette].name;
  return `Crew tag ${t.serial}: ${mark} on ${/^[aeiou]/.test(colour) ? 'an' : 'a'} ${colour} ${STYLE_NAMES[t.style]} with ${SHAPE_NAMES[t.shape]}`;
}

/** What you notice at avatar size: the two characters, then the sub-style, colour and outline. */
export const insigniaLookKey = (t: Insignia): string => [t.style, t.palette, t.shape, t.mark.join('')].join(' | ');

export const insigniaMotif = (t: Insignia): string => `${t.style} ${t.palette}`;
