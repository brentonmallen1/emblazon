import { circle, polyline, regular, sparkle, star } from '../../core/draw.ts';
import { n, type Pt } from '../../core/svg.ts';
import type { BadgeIcon, BadgePalette, BadgeShape, StickerCut } from './types.ts';

export const PALETTES: Readonly<Record<BadgePalette, { base: string; accent: string; icon: string; name: string }>> = {
  indigo: { base: '#667EEA', accent: '#3C4FB5', icon: '#F5F7FF', name: 'indigo' },
  teal: { base: '#2EC4B6', accent: '#168F84', icon: '#F2FFFD', name: 'teal' },
  coral: { base: '#FF6B6B', accent: '#C94545', icon: '#FFF5F5', name: 'coral' },
  mustard: { base: '#F4B942', accent: '#C48A16', icon: '#2A2210', name: 'mustard' },
  slate: { base: '#4A5568', accent: '#2D3748', icon: '#EDF2F7', name: 'slate' },
  emerald: { base: '#2F9E6E', accent: '#1D6B49', icon: '#F0FFF7', name: 'emerald' },
  plum: { base: '#8E5BA6', accent: '#643C79', icon: '#FBF5FF', name: 'plum' },
  sky: { base: '#3FA7F5', accent: '#1F78BF', icon: '#F4FAFF', name: 'sky blue' },
  ink: { base: '#1F2937', accent: '#374151', icon: '#F59E0B', name: 'ink' },
  cream: { base: '#EFE6D2', accent: '#C9B998', icon: '#2F2A22', name: 'cream' },
  tangerine: { base: '#FF8C42', accent: '#C9621C', icon: '#FFF7F0', name: 'tangerine' },
  rose: { base: '#E86A92', accent: '#B4436A', icon: '#FFF5F8', name: 'rose' },
};

/** Sticker vinyl and its drop shadow. */
export const VINYL = '#F5F7FF';
export const SHADOW = '#07071A';

export const SHAPE_PATHS: Readonly<Record<BadgeShape, string>> = {
  circle: circle(120, 120, 106),
  shield: 'M120 14L212 44V112C212 170 172 206 120 226C68 206 28 170 28 112V44Z',
  hexagon: polyline(regular(120, 120, 110, 6), true),
  rounded: 'M50 18H190Q222 18 222 50V190Q222 222 190 222H50Q18 222 18 190V50Q18 18 50 18Z',
  crest: 'M28 20H96L120 34L144 20H212V116C212 172 172 206 120 226C68 206 28 172 28 116Z',
  octagon: polyline(regular(120, 120, 110, 8, -Math.PI / 2 + Math.PI / 8), true),
};

/** A rounded rectangle centred on (cx, cy), with optional half-round notches in the short sides. */
function ticket(cx: number, cy: number, w: number, h: number, r: number, notch = 0): string {
  const [x0, y0, x1, y1] = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  const corner = (x: number, y: number) => `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
  const right = notch ? `V${n(cy - notch)}A${n(notch)} ${n(notch)} 0 0 0 ${n(x1)} ${n(cy + notch)}` : '';
  const left = notch ? `V${n(cy + notch)}A${n(notch)} ${n(notch)} 0 0 0 ${n(x0)} ${n(cy - notch)}` : '';
  return (
    `M${n(x0 + r)} ${n(y0)}H${n(x1 - r)}${corner(x1, y0 + r)}${right}V${n(y1 - r)}${corner(x1 - r, y1)}` +
    `H${n(x0 + r)}${corner(x0, y1 - r)}${left}V${n(y0 + r)}${corner(x0 + r, y0)}Z`
  );
}

/** A polygon with each corner rounded off `d` units along both edges. */
function roundedPolygon(pts: readonly Pt[], d: number): string {
  const along = (a: Pt, b: Pt, t: number): Pt => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
  };
  let path = '';
  pts.forEach((p, i) => {
    const prev = pts[(i + pts.length - 1) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const a = along(p, prev, d);
    const b = along(p, next, d);
    path += `${i ? 'L' : 'M'}${n(a[0])} ${n(a[1])}Q${n(p[0])} ${n(p[1])} ${n(b[0])} ${n(b[1])}`;
  });
  return path + 'Z';
}

/** Where things sit on a sticker, before it is tilted. */
export interface StickerLayout {
  /** Die-cut edge (the white vinyl) and the coloured face inside it. */
  outer: string;
  face: string;
  /** Initials: centre and cap height. */
  letters: { x: number; y: number; height: number };
  /** Small icon: top-left corner and size. */
  icon: { x: number; y: number; size: number };
  /** Number pill: top-left corner; always 38 × 20. */
  pill: { x: number; y: number };
}

export const STICKERS: Readonly<Record<StickerCut, StickerLayout>> = {
  tile: {
    outer: ticket(120, 120, 172, 152, 30),
    face: ticket(120, 120, 156, 136, 24),
    letters: { x: 120, y: 121, height: 46 },
    icon: { x: 56, y: 62, size: 30 },
    pill: { x: 150, y: 158 },
  },
  square: {
    outer: ticket(120, 120, 160, 160, 26),
    face: ticket(120, 120, 144, 144, 20),
    letters: { x: 120, y: 124, height: 48 },
    icon: { x: 60, y: 58, size: 30 },
    pill: { x: 146, y: 166 },
  },
  ticket: {
    outer: ticket(120, 120, 184, 136, 16, 13),
    face: ticket(120, 120, 168, 120, 11, 21),
    letters: { x: 120, y: 118, height: 44 },
    icon: { x: 50, y: 70, size: 26 },
    pill: { x: 158, y: 154 },
  },
  pill: {
    outer: ticket(120, 120, 196, 128, 64),
    face: ticket(120, 120, 180, 112, 56),
    letters: { x: 130, y: 110, height: 40 },
    icon: { x: 46, y: 105, size: 30 },
    pill: { x: 111, y: 141 },
  },
  hexagon: {
    outer: roundedPolygon(regular(120, 120, 102, 6), 14),
    face: roundedPolygon(regular(120, 120, 90, 6), 11),
    letters: { x: 120, y: 117, height: 44 },
    icon: { x: 106, y: 52, size: 28 },
    pill: { x: 101, y: 150 },
  },
};

/**
 * Icons in a 100×100 box. Filled paths take the icon colour; `cut` details are drawn in the
 * badge colour, as if punched out.
 */
export function iconArt(icon: BadgeIcon, color: string, cut: string): string {
  const f = (d: string, c = color) => `<path d="${d}" fill="${c}"/>`;
  const s = (d: string, w: number, c = color) =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  switch (icon) {
    case 'bolt':
      return f('M58 6L22 56H46L38 94L78 40H54Z');
    case 'star':
      return f(star(50, 53, 46, 5, 0.42));
    case 'spark':
      return f(sparkle(50, 50, 46));
    case 'chevrons':
      return s('M20 28L50 52L80 28M20 56L50 80L80 56', 12);
    case 'mountain':
      return f('M4 86L36 28L54 58L66 42L96 86Z') + f('M36 28L46 46L40 43L34 49L27 44Z', cut);
    case 'wave':
      return s('M10 30Q30 16 50 30T90 30M10 52Q30 38 50 52T90 52M10 74Q30 60 50 74T90 74', 9);
    case 'sun': {
      let rays = '';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        rays += `M${n(50 + Math.cos(a) * 30)} ${n(50 + Math.sin(a) * 30)}L${n(50 + Math.cos(a) * 44)} ${n(50 + Math.sin(a) * 44)}`;
      }
      return f(circle(50, 50, 20)) + s(rays, 8);
    }
    case 'crown':
      return f('M10 78L16 28L35 52L50 20L65 52L84 28L90 78Z') + s('M18 66H82', 5, cut);
    case 'arrow':
      return f('M50 6L86 46H62V94H38V46H14Z');
    case 'compass':
      return s(circle(50, 50, 40), 7) + f('M50 16L60 50L50 84L40 50Z') + f(circle(50, 50, 5), cut);
    case 'target':
      return s(circle(50, 50, 40), 8) + s(circle(50, 50, 21), 8) + f(circle(50, 50, 7));
    case 'leaf':
      return f('M50 6C84 30 84 70 50 94C16 70 16 30 50 6Z') + s('M50 22V84M50 46L34 34M50 62L66 50', 4, cut);
    case 'gem':
      return f('M28 14H72L92 40L50 92L8 40Z') + s('M8 40H92M28 14L40 40L50 92M72 14L60 40L50 92', 3.5, cut);
    case 'moon':
      return f('M64 8A44 44 0 1 0 64 92A34 44 0 1 1 64 8Z');
    case 'flame':
      return f('M50 4C64 28 82 40 82 62C82 82 67 96 50 96C33 96 18 82 18 62C18 46 30 38 36 22C42 34 44 42 52 46C55 32 53 18 50 4Z');
    case 'plus':
      return f('M38 8H62V38H92V62H62V92H38V62H8V38H38Z');
    case 'heart':
      return f('M50 90C18 68 6 48 9 31C12 15 33 7 50 25C67 7 88 15 91 31C94 48 82 68 50 90Z');
    case 'atom': {
      const orbit = s('M6 50a44 16 0 1 0 88 0a44 16 0 1 0 -88 0', 6);
      return orbit + `<g transform="rotate(60 50 50)">${orbit}</g><g transform="rotate(-60 50 50)">${orbit}</g>` + f(circle(50, 50, 8));
    }
    case 'bars':
      return f('M10 66H30V92H10ZM40 42H60V92H40ZM70 14H90V92H70Z');
    case 'infinity':
      return s('M50 50C40 32 12 32 12 50C12 68 40 68 50 50C60 32 88 32 88 50C88 68 60 68 50 50Z', 10);
    case 'key':
      return f(circle(30, 50, 24)) + f('M46 42H94V58H86V72H72V58H64V68H50V58H46Z') + f(circle(26, 50, 9), cut);
    case 'anchor':
      return s('M50 26V88M32 40H68M14 60Q18 88 50 88Q82 88 86 60', 9) + s(circle(50, 15, 9), 7) + f('M4 66L14 50L24 66Z') + f('M76 66L86 50L96 66Z');
  }
}
