import { parsePath, serializePath, transformPath } from '../../core/path.ts';
import type { BorderStyle, PaletteId, PatchShape } from './types.ts';

/** Patch canvas: 240×240, centred at (120,120). Shapes reach ~110 from the centre. */
export const CANVAS = 240;
export const CENTER = 120;
const REACH = 110;
/** Width of the embroidered border band. */
export const BORDER_WIDTH = 14;

/** Dark thread used for every outline. */
export const OUTLINE = '#101018';

export interface PatchPalette {
  /** Border band. */
  border: string;
  /** Light thread: stitching, stars, highlights. */
  thread: string;
  /** Deep sky, and the lighter glow it fades from. */
  sky: string;
  glow: string;
  /** Second colour: swooshes, stage bands, fins. */
  accent: string;
}

export const PALETTES: Readonly<Record<PaletteId, PatchPalette>> = {
  nasa: { border: '#1F3F8F', thread: '#F4F4F2', sky: '#08112B', glow: '#1D3470', accent: '#C8102E' },
  gold: { border: '#B8862B', thread: '#F6DB8B', sky: '#0B0B1E', glow: '#26244A', accent: '#2A6FDB' },
  crimson: { border: '#A3192D', thread: '#F4E8D0', sky: '#120814', glow: '#3A1530', accent: '#F2A93B' },
  teal: { border: '#127C7C', thread: '#E8FBFF', sky: '#04161C', glow: '#0D3B44', accent: '#FFB703' },
  violet: { border: '#5B2A86', thread: '#F1E3FF', sky: '#0D0618', glow: '#2C1650', accent: '#2EC4B6' },
  silver: { border: '#8A94A6', thread: '#FAFBFC', sky: '#05070D', glow: '#1B2233', accent: '#E63946' },
  ember: { border: '#D35400', thread: '#FFF1E0', sky: '#0D0A14', glow: '#2E1A26', accent: '#3A86FF' },
  forest: { border: '#2D6A4F', thread: '#EAF7EF', sky: '#06140F', glow: '#123528', accent: '#F4D35E' },
  ice: { border: '#3D6E9E', thread: '#FFFFFF', sky: '#071425', glow: '#173A5E', accent: '#9FD8FF' },
  midnight: { border: '#22223A', thread: '#FFCC33', sky: '#020208', glow: '#14142C', accent: '#FFCC33' },
  rose: { border: '#B5446E', thread: '#FFE8F0', sky: '#110711', glow: '#36152E', accent: '#7BDFF2' },
  copper: { border: '#9C5B32', thread: '#F7E1C8', sky: '#0E0A08', glow: '#2E1E16', accent: '#4ECDC4' },
};

/** Outer outlines at full size; insets are exact scalings about the centre. */
const SHAPE_PATHS: Readonly<Record<PatchShape, string>> = {
  circle: `M${CENTER - REACH} ${CENTER}A${REACH} ${REACH} 0 1 0 ${CENTER + REACH} ${CENTER}A${REACH} ${REACH} 0 1 0 ${CENTER - REACH} ${CENTER}Z`,
  oval: 'M28 120A92 112 0 1 0 212 120A92 112 0 1 0 28 120Z',
  shield: 'M20 12H220V108C220 168 176 207 120 230C64 207 20 168 20 108Z',
  hexagon: 'M120 8L217 64V176L120 232L23 176V64Z',
};

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

/**
 * The embroidered border: the band itself, then the stitch detail along its middle.
 * The art inside is drawn separately, clipped to shapePath(shape, BORDER_WIDTH).
 */
export function borderLayer(shape: PatchShape, style: BorderStyle, palette: PatchPalette): string {
  const outer = shapePath(shape);
  const mid = shapePath(shape, BORDER_WIDTH / 2);
  const band = `<path d="${outer}" fill="${palette.border}"/>`;
  switch (style) {
    case 'single':
      return band;
    case 'double':
      return band + `<path d="${shapePath(shape, 4)}" fill="none" stroke="${palette.thread}" stroke-width="1.6"/>` +
        `<path d="${shapePath(shape, BORDER_WIDTH - 3.5)}" fill="none" stroke="${palette.thread}" stroke-width="1.6"/>`;
    case 'stitched':
      return band + `<path d="${mid}" fill="none" stroke="${palette.thread}" stroke-width="2.4" stroke-dasharray="5 3.5" stroke-linecap="round"/>`;
    case 'beaded':
      return band + `<path d="${mid}" fill="none" stroke="${palette.thread}" stroke-width="4.2" stroke-dasharray="0.01 7.5" stroke-linecap="round"/>`;
  }
}
