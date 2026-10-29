/**
 * A tiny geometric stroke font: capitals A–Z, digits 0–9, "-" and "/", drawn as strokes on a
 * 4×6 grid with chamfered corners. Pure path data, so text renders identically everywhere with
 * no font files. Zero is slashed so it never reads as O.
 */
import { n } from './svg.ts';

/** Each glyph as path data in grid units: x 0–4, y 0–6 (y down). */
const GLYPHS: Readonly<Record<string, string>> = {
  A: 'M0 6V2L2 0L4 2V6M0 4H4',
  B: 'M0 0H3L4 1V2L3 3H0M3 3L4 4V5L3 6H0V0',
  C: 'M4 0H1L0 1V5L1 6H4',
  D: 'M0 0H3L4 1V5L3 6H0Z',
  E: 'M4 0H0V6H4M0 3H3',
  F: 'M4 0H0V6M0 3H3',
  G: 'M4 0H1L0 1V5L1 6H4V3H2',
  H: 'M0 0V6M4 0V6M0 3H4',
  I: 'M1 0H3M2 0V6M1 6H3',
  J: 'M4 0V5L3 6H1L0 5',
  K: 'M0 0V6M0 3H1L4 0M1 3L4 6',
  L: 'M0 0V6H4',
  M: 'M0 6V0L2 3L4 0V6',
  N: 'M0 6V0L4 6V0',
  O: 'M1 0H3L4 1V5L3 6H1L0 5V1Z',
  P: 'M0 6V0H3L4 1V2L3 3H0',
  Q: 'M1 0H3L4 1V5L3 6H1L0 5V1ZM2.5 4.5L4 6',
  R: 'M0 6V0H3L4 1V2L3 3H0M2 3L4 6',
  S: 'M4 0H1L0 1V2L1 3H3L4 4V5L3 6H0',
  T: 'M0 0H4M2 0V6',
  U: 'M0 0V5L1 6H3L4 5V0',
  V: 'M0 0V3L2 6L4 3V0',
  W: 'M0 0V6L2 4L4 6V0',
  X: 'M0 0L4 6M4 0L0 6',
  Y: 'M0 0L2 3L4 0M2 3V6',
  Z: 'M0 0H4L0 6H4',
  0: 'M1 0H3L4 1V5L3 6H1L0 5V1ZM4 1L0 5',
  1: 'M1 1L2 0V6M1 6H3',
  2: 'M0 1L1 0H3L4 1V2L0 6H4',
  3: 'M0 0H3L4 1V2L3 3H1M3 3L4 4V5L3 6H0',
  4: 'M3 6V0L0 4H4',
  5: 'M4 0H0V3H3L4 4V5L3 6H0',
  6: 'M3 0H1L0 1V5L1 6H3L4 5V4L3 3H0',
  7: 'M0 0H4V1L2 6',
  8: 'M1 0H3L4 1V2L3 3H1L0 2V1ZM1 3H3L4 4V5L3 6H1L0 5V4Z',
  9: 'M4 3H1L0 2V1L1 0H3L4 1V5L3 6H1',
  '-': 'M1 3H3',
  '/': 'M0 6L4 0',
};

export const FONT_CHARS = Object.keys(GLYPHS).join('');

/** True when every character can be drawn. */
export const canDraw = (text: string): boolean => [...text].every((c) => c in GLYPHS || c === ' ');

/** Scales one glyph's grid path to the given height, with its top-left at (x, y). */
function glyph(c: string, x: number, y: number, unit: number): string {
  return GLYPHS[c].replace(/([MLHVZ])([^MLHVZ]*)/g, (_, cmd: string, args: string) => {
    const v = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    switch (cmd) {
      case 'H':
        return `H${n(x + v[0] * unit)}`;
      case 'V':
        return `V${n(y + v[0] * unit)}`;
      case 'Z':
        return 'Z';
      default:
        return cmd + v.map((value, i) => n(i % 2 === 0 ? x + value * unit : y + value * unit)).join(' ');
    }
  });
}

/**
 * Path data for `text` (characters outside the font are skipped), cap height `height`, left edge
 * at x, top at y. Draw it with a stroke; `strokeFor(height)` is a good weight.
 */
export function textPath(text: string, x: number, y: number, height: number, tracking = 0.45): string {
  const unit = height / 6;
  let d = '';
  let cx = x;
  for (const c of text.toUpperCase()) {
    if (c in GLYPHS) d += glyph(c, cx, y, unit);
    cx += (4 + (c === ' ' ? 0 : 0) + tracking * 4) * unit;
  }
  return d;
}

/** Width of `text` as drawn by textPath. */
export const textWidth = (text: string, height: number, tracking = 0.45): number => {
  const unit = height / 6;
  return text.length * (4 + tracking * 4) * unit - tracking * 4 * unit;
};

/** A stroke weight that keeps letters open at a given cap height. */
export const strokeFor = (height: number): number => height / 7.5;
