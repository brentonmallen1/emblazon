import { CHARGES } from '../heraldry/charges.ts';
import { INK_HEX, WAX_HEX } from './render.ts';
import type { Figure, RuneMark, SealCenter, Sigil, ThornRing, WaxCenter, WaxRim } from './types.ts';

const FIGURE_NAMES: Readonly<Record<Figure, string>> = {
  triangle: 'bound in a triangle',
  invertedTriangle: 'beneath an inverted triangle',
  square: 'sealed in a square',
  diamond: 'held in a diamond',
  pentagram: 'within a pentagram',
  hexagram: 'within a hexagram',
  heptagram: 'within a seven-pointed star',
  twinTriangles: 'between two triangles',
  crossed: 'pinned by four spokes',
  none: 'circled',
};

const CENTER_NAMES: Readonly<Record<string, string>> = {
  eye: 'the watching eye',
  radiantEye: 'the burning eye',
  closedEye: 'the sleeping eye',
  crescent: 'the waning moon',
  keyhole: 'the locked door',
  dagger: 'the dagger',
  skull: 'the skull',
  moon: 'the moon and star',
  candle: 'the candle',
  coffin: 'the coffin',
  hourglass: 'the hourglass',
  crossbones: 'the crossed bones',
};

const centerName = (center: SealCenter | WaxCenter): string => CENTER_NAMES[center] ?? `the ${CHARGES[center as keyof typeof CHARGES].name}`;

const RIM_NAMES: Readonly<Record<WaxRim, string>> = {
  ring: 'a plain rim',
  double: 'a double rim',
  beaded: 'a beaded rim',
  runes: 'a rim of marks',
  stars: 'a rim of stars',
  thorny: 'a thorny rim',
};

const RING_NAMES: Readonly<Record<ThornRing, string>> = { thorns: 'a ring of thorns', briar: 'a briar', nails: 'a ring of nails' };

const MARK_NAMES: Readonly<Record<string, string>> = {
  armsUp: 'raised arms',
  armsDown: 'lowered arms',
  bar: 'a bar',
  diamond: 'a diamond',
  flag: 'a flag',
  chevron: 'a chevron',
  hook: 'a hook',
  ring: 'a ring',
  lid: 'a lid',
  base: 'a base',
  stem: 'a stem',
  dots: 'two dots',
};

const marksText = (marks: readonly RuneMark[]): string => {
  const names = [...new Set(marks.map((m) => MARK_NAMES[m.kind]))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

export function describeSigil(sg: Sigil): string {
  switch (sg.style) {
    case 'seal':
      return `Sigil of ${centerName(sg.center)} in ${INK_HEX[sg.ink].name}, ${FIGURE_NAMES[sg.figure]}${sg.runes ? ', ringed with marks' : ''}`;
    case 'wax':
      return `Seal of ${centerName(sg.center)}${sg.gilt ? ' in gold leaf on' : ' in'} ${WAX_HEX[sg.wax].name} wax, ${RIM_NAMES[sg.rim]}${sg.ribbon ? `, on a ${sg.ribbon} ribbon` : sg.drips.length ? ', dripping' : ''}`;
    case 'thorn': {
      const stave = sg.stave === 'single' ? 'a staff' : sg.stave === 'crossed' ? 'crossed staves' : sg.tine ? 'a trident' : 'a fork';
      return `Thorned rune in ${INK_HEX[sg.ink].name}: ${stave} with ${marksText(sg.marks)}, in ${RING_NAMES[sg.ring]}${sg.drips ? ', bleeding' : ''}`;
    }
  }
}

/** What you notice at avatar size: the style, its colour, the centre or rune, and the frame. */
export function sigilLookKey(sg: Sigil): string {
  switch (sg.style) {
    case 'seal':
      return ['seal', sg.ink, sg.figure, sg.center, sg.rings, sg.ticks.count ? `${sg.ticks.count} ${sg.ticks.style}` : 'no ticks', Boolean(sg.runes)].join(' | ');
    case 'wax':
      return ['wax', sg.wax, sg.center, sg.gilt, sg.rim, sg.ribbon ?? 'no ribbon'].join(' | ');
    case 'thorn':
      return ['thorn', sg.ink, sg.ring, sg.stave, sg.tine, sg.marks.map((m) => `${m.kind}@${m.slot}${m.flip ? '<' : ''}`).join(' ')].join(' | ');
  }
}

export const sigilMotif = (sg: Sigil): string => (sg.style === 'thorn' ? `rune:${sg.stave}` : sg.center);

export function sigilCredits(sg: Sigil): string[] {
  if (sg.style === 'thorn' || !(sg.center in CHARGES)) return [];
  const credit = CHARGES[sg.center as keyof typeof CHARGES].credit;
  return credit ? [credit] : [];
}
