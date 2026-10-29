import { parsePath, serializePath, transformPath } from '../../core/path.ts';
import { n } from '../../core/svg.ts';
import type { BorderStyle, PaletteId, PatchShape } from './types.ts';

/** Patch canvas: 240×240, centred at (120,120). Shapes reach ~110 from the centre. */
export const CANVAS = 240;
export const CENTER = 120;
const REACH = 110;
/** Width of the band between the outer and inner rings. */
export const BAND = 26;

/**
 * Flat patch colours (after jb-rpg's deep-space symbol): an accent for rings, trajectories and
 * detail, a near-black band, a slightly lighter navy for the scene, and a light "thread".
 */
export interface PatchPalette {
  accent: string;
  band: string;
  inner: string;
  thread: string;
}

export const PALETTES: Readonly<Record<PaletteId, PatchPalette>> = {
  amber: { accent: '#F0B060', band: '#0C111D', inner: '#141C33', thread: '#EEF1F6' },
  cyan: { accent: '#5FD3E3', band: '#081419', inner: '#0F2430', thread: '#EAF8FB' },
  scarlet: { accent: '#E0574B', band: '#120A0C', inner: '#211217', thread: '#F4E9E4' },
  gold: { accent: '#D9A557', band: '#120E09', inner: '#221A11', thread: '#F3EAD7' },
  lime: { accent: '#A9DC7E', band: '#0A1009', inner: '#142014', thread: '#EEF6E6' },
  violet: { accent: '#B48CF2', band: '#0D0A17', inner: '#1A142E', thread: '#F1ECFB' },
  rose: { accent: '#F28AB2', band: '#130A10', inner: '#24131F', thread: '#FBEDF3' },
  silver: { accent: '#C9D1DC', band: '#0A0C10', inner: '#161A22', thread: '#FFFFFF' },
  teal: { accent: '#4FC1A6', band: '#07120F', inner: '#0F231E', thread: '#E8F7F2' },
  sun: { accent: '#F2E64A', band: '#0B0A06', inner: '#19170C', thread: '#FBF8E4' },
  azure: { accent: '#7DA7F0', band: '#090D18', inner: '#121A30', thread: '#EDF2FC' },
  coral: { accent: '#FF8C6B', band: '#120B09', inner: '#241612', thread: '#FCEEE9' },
  mint: { accent: '#7FE0B0', band: '#08120E', inner: '#11241C', thread: '#EBFAF2' },
  tangerine: { accent: '#FF9F43', band: '#120C07', inner: '#251910', thread: '#FFF1E2' },
  periwinkle: { accent: '#9C9AF5', band: '#0B0B17', inner: '#17172E', thread: '#EFEFFD' },
  crimson: { accent: '#D6455A', band: '#12080B', inner: '#241016', thread: '#FBE9EC' },
};

/** Outer outlines at full size; insets are exact scalings about the centre. */
const SHAPE_PATHS: Readonly<Record<PatchShape, string>> = {
  circle: `M${CENTER - REACH} ${CENTER}A${REACH} ${REACH} 0 1 0 ${CENTER + REACH} ${CENTER}A${REACH} ${REACH} 0 1 0 ${CENTER - REACH} ${CENTER}Z`,
  oval: 'M28 120A92 112 0 1 0 212 120A92 112 0 1 0 28 120Z',
  shield: 'M20 12H220V108C220 168 176 207 120 230C64 207 20 168 20 108Z',
  hexagon: 'M120 8L217 64V176L120 232L23 176V64Z',
  octagon: 'M77.1 16.5H162.9L223.5 77.1V162.9L162.9 223.5H77.1L16.5 162.9V77.1Z',
  square: 'M42 14H198Q226 14 226 42V198Q226 226 198 226H42Q14 226 14 198V42Q14 14 42 14Z',
};

/** Half-width and half-height of each shape about the centre, for placing marks in the band. */
const EXTENT: Readonly<Record<PatchShape, readonly [number, number]>> = {
  circle: [110, 110],
  oval: [92, 112],
  shield: [100, 108],
  hexagon: [97, 112],
  octagon: [103.5, 103.5],
  square: [106, 106],
};

/** Shapes with a flat top edge, and where it sits: crew stars run along it in a straight row. */
const FLAT_TOP: Readonly<Partial<Record<PatchShape, number>>> = { shield: 12, octagon: 16.5, square: 14 };

const cache = new Map<string, string>();

/** The shape scaled about the centre so its edge sits `inset` units inside the outer edge. */
export function shapePath(shape: PatchShape, inset = 0): string {
  const key = `${shape}:${inset}`;
  let d = cache.get(key);
  if (!d) {
    const k = (REACH - inset) / REACH;
    d = inset === 0 ? SHAPE_PATHS[shape] : serializePath(transformPath(parsePath(SHAPE_PATHS[shape]), k, CENTER * (1 - k), CENTER * (1 - k)));
    cache.set(key, d);
  }
  return d;
}

/** A point in the middle of the band at angle `a` (radians, 0 = right, −π/2 = top). */
export function bandPoint(shape: PatchShape, a: number): [number, number] {
  const [rx, ry] = EXTENT[shape];
  const k = (REACH - BAND / 2) / REACH;
  // Flat-topped shapes: keep marks on the straight top edge rather than an ellipse.
  const top = FLAT_TOP[shape];
  if (top !== undefined && Math.sin(a) < -0.5) return [CENTER + Math.cos(a) * rx * k, top + BAND / 2];
  return [CENTER + Math.cos(a) * rx * k, CENTER + Math.sin(a) * ry * k];
}

/** The frame: dark band, outer and inner rings in the accent colour, and the border's detail. */
export function frameLayer(shape: PatchShape, style: BorderStyle, palette: PatchPalette): { under: string; over: string } {
  const ring = (inset: number, width: number, extra = '') =>
    `<path d="${shapePath(shape, inset)}" fill="none" stroke="${palette.accent}" stroke-width="${width}"${extra}/>`;
  const under = `<path d="${shapePath(shape)}" fill="${palette.band}"/>`;
  let over = ring(BAND, 2.5);
  switch (style) {
    case 'single':
      over += ring(2, 4);
      break;
    case 'double':
      over += ring(2, 3) + ring(8, 1.6);
      break;
    case 'stitched':
      over += ring(2, 3.5, ' stroke-dasharray="7 4.5" stroke-linecap="round"');
      break;
    case 'beaded':
      over += ring(2, 3) + ring(9, 3.4, ` stroke-dasharray="0.01 8" stroke-linecap="round"`);
      break;
  }
  // Two small separator dots at the band's sides, as on stitched mission patches.
  for (const a of [Math.PI, 0]) {
    const [x, y] = bandPoint(shape, a);
    over += `<circle cx="${n(x)}" cy="${n(y)}" r="2.4" fill="${palette.accent}"/>`;
  }
  return { under, over };
}
