import type { FieldId, FleshId, GlowId, LeatherId, MetalId, StoneId } from './types.ts';

/** Outlines and carved lines: a warm near-black, never pure black. */
export const INK = '#1A140F';

export const METAL_HEX: Readonly<Record<MetalId, string>> = {
  brass: '#C9A55C',
  copper: '#B8744A',
  silver: '#A7ABAE',
  verdigris: '#7FA88E',
};

export const FIELD_HEX: Readonly<Record<FieldId, string>> = {
  abyss: '#1F3A36',
  plum: '#2E1B2E',
  midnight: '#1E2433',
  oxblood: '#3A1E22',
  olive: '#2B2A1A',
  slate: '#232628',
};

export const GLOW_HEX: Readonly<Record<GlowId, string>> = {
  bile: '#9FD36B',
  amber: '#E8C26A',
  ember: '#E0574B',
  violet: '#B38BF0',
  witchlight: '#7FD4F5',
};

/** Carved stone: the face, its shadow side, and the highlight that makes carving read as cut. */
export const STONE_HEX: Readonly<Record<StoneId, { face: string; shade: string; light: string }>> = {
  limestone: { face: '#CFC3A6', shade: '#8C7F66', light: '#E8DFC8' },
  soapstone: { face: '#B9C2A0', shade: '#6E7A5C', light: '#D6DDC2' },
  bone: { face: '#D9D2C0', shade: '#8E8778', light: '#F0EBDE' },
  jade: { face: '#8FA38A', shade: '#5A6B57', light: '#B7C8B1' },
  basalt: { face: '#8E8C88', shade: '#5C5A57', light: '#B4B2AD' },
  sandstone: { face: '#C9A27A', shade: '#8A6A4C', light: '#E2C4A0' },
};

export const LEATHER_HEX: Readonly<Record<LeatherId, string>> = {
  oxblood: '#5A2A22',
  moss: '#2E4A3A',
  umber: '#4A3A28',
  wine: '#4A1F33',
  navy: '#26324A',
  black: '#2A2420',
};

/** A cover that would vanish into the field it sits on. */
export const LEATHER_CLASH: Readonly<Record<LeatherId, FieldId>> = {
  oxblood: 'oxblood',
  moss: 'abyss',
  umber: 'olive',
  wine: 'plum',
  navy: 'midnight',
  black: 'slate',
};

export const FLESH_HEX: Readonly<Record<FleshId, string>> = {
  moss: '#6E8F5A',
  violet: '#7E5F8F',
  teal: '#4F7A78',
  blood: '#8C3A3A',
  grey: '#7D8478',
};

export const PAGE_HEX = ['#E8DCC0', '#DCCFAE', '#EFE4C8', '#D9CBA6'] as const;
export const RIBBON_HEX = ['#7E2F22', '#C9A55C', '#5E3A63', '#2E4A70', '#3E6B47'] as const;

export const NAMES = {
  metal: { brass: 'brass', copper: 'copper', silver: 'silver', verdigris: 'verdigris' } satisfies Record<MetalId, string>,
  field: { abyss: 'deep green', plum: 'plum', midnight: 'midnight blue', oxblood: 'oxblood', olive: 'dark olive', slate: 'slate' } satisfies Record<FieldId, string>,
  glow: { bile: 'green', amber: 'amber', ember: 'red', violet: 'violet', witchlight: 'pale blue' } satisfies Record<GlowId, string>,
  leather: { oxblood: 'oxblood', moss: 'green', umber: 'brown', wine: 'wine', navy: 'navy', black: 'black' } satisfies Record<LeatherId, string>,
};

/** Linear blend of two #RRGGBB colours, t = 0 gives a. */
export function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
