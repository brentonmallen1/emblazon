import { parsePath, serializePath, transformPath } from '../../core/path.ts';
import { n, type Pt } from '../../core/svg.ts';
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
  triangle: 'M120 16L228 206H12Z',
  triangleDown: 'M120 224L228 34H12Z',
};

/** Inradius of the triangles: insets scale about the incentre so the band is even all round. */
const TRI_R = (216 * 190) / (216 + 2 * Math.hypot(108, 190));

/** Centre and reach each shape is scaled about. Round shapes use the canvas centre. */
const PIVOT: Readonly<Partial<Record<PatchShape, readonly [number, number, number]>>> = {
  triangle: [CENTER, 206 - TRI_R, TRI_R],
  triangleDown: [CENTER, 34 + TRI_R, TRI_R],
};

/** Triangles have a narrow band: a full one would leave little room inside. */
export const bandFor = (shape: PatchShape): number => (PIVOT[shape] ? 14 : BAND);

/** True for frames whose scene is drawn smaller, about the incentre (see sceneTransform). */
export const isTriangle = (shape: PatchShape): boolean => PIVOT[shape] !== undefined;

/**
 * Where a triangle's scene goes: the round-frame scene scaled about the inner incircle. Empty for
 * other shapes, whose scene is drawn as is.
 */
export function sceneTransform(shape: PatchShape): string {
  const pivot = PIVOT[shape];
  if (!pivot) return '';
  const k = ((pivot[2] - bandFor(shape)) / (REACH - BAND)) * 1.22;
  return `translate(${n(pivot[0])} ${n(pivot[1])}) scale(${n(k)}) translate(${-CENTER} ${-CENTER})`;
}

/** Round shapes: half-axes about the centre. */
const ELLIPSES: Readonly<Partial<Record<PatchShape, readonly [number, number]>>> = { circle: [REACH, REACH], oval: [92, 112] };

/** Points along a cubic from p0 to p3, for turning the shield's curved sides into a polygon. */
function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    const u = 1 - t;
    const at = (k: 0 | 1) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k];
    return [at(0), at(1)];
  });
}

/** The other shapes as polygons (the square's rounded corners chamfered), outer size. */
const VERTICES: Readonly<Partial<Record<PatchShape, readonly Pt[]>>> = {
  shield: [[20, 12], [220, 12], [220, 108], ...cubic([220, 108], [220, 168], [176, 207], [120, 230], 6), ...cubic([120, 230], [64, 207], [20, 168], [20, 108], 6)],
  hexagon: [[120, 8], [217, 64], [217, 176], [120, 232], [23, 176], [23, 64]],
  octagon: [[77.1, 16.5], [162.9, 16.5], [223.5, 77.1], [223.5, 162.9], [162.9, 223.5], [77.1, 223.5], [16.5, 162.9], [16.5, 77.1]],
  square: [[42, 14], [198, 14], [217.8, 22.2], [226, 42], [226, 198], [217.8, 217.8], [198, 226], [42, 226], [22.2, 217.8], [14, 198], [14, 42], [22.2, 22.2]],
  triangle: [[120, 16], [228, 206], [12, 206]],
  triangleDown: [[120, 224], [228, 34], [12, 34]],
};

/** Even-odd point-in-polygon test. */
function inPolygon(poly: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when (x, y) lies inside the shape's edge drawn `inset` units in from the outer edge. */
export function insideShape(shape: PatchShape, x: number, y: number, inset: number): boolean {
  const [px, py, reach] = PIVOT[shape] ?? [CENTER, CENTER, REACH];
  const k = (reach - inset) / reach;
  // Map the point back onto the outer outline, which the inset one is a scaling of.
  const ux = px + (x - px) / k;
  const uy = py + (y - py) / k;
  const ell = ELLIPSES[shape];
  if (ell) return ((ux - CENTER) / ell[0]) ** 2 + ((uy - CENTER) / ell[1]) ** 2 <= 1;
  return inPolygon(VERTICES[shape]!, ux, uy);
}

/** Where a ray from the centre at angle `a` leaves the outer polygon. */
function rayExit(poly: readonly Pt[], a: number): Pt {
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ex, ey] = [poly[i][0] - poly[j][0], poly[i][1] - poly[j][1]];
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-9) continue;
    const [wx, wy] = [poly[j][0] - CENTER, poly[j][1] - CENTER];
    const t = (wx * ey - wy * ex) / det;
    const s = (wx * dy - wy * dx) / det;
    if (t > 0 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return [CENTER + dx * best, CENTER + dy * best];
}

const cache = new Map<string, string>();

/** The shape scaled about the centre so its edge sits `inset` units inside the outer edge. */
export function shapePath(shape: PatchShape, inset = 0): string {
  const key = `${shape}:${inset}`;
  let d = cache.get(key);
  if (!d) {
    const [px, py, reach] = PIVOT[shape] ?? [CENTER, CENTER, REACH];
    const k = (reach - inset) / reach;
    d = inset === 0 ? SHAPE_PATHS[shape] : serializePath(transformPath(parsePath(SHAPE_PATHS[shape]), k, px * (1 - k), py * (1 - k)));
    cache.set(key, d);
  }
  return d;
}

/**
 * A point in the middle of the band at angle `a` (radians, 0 = right, −π/2 = top): on the
 * shape's own edge, so marks follow a hexagon's roof rather than an ellipse through its peak.
 */
export function bandPoint(shape: PatchShape, a: number): [number, number] {
  const k = (REACH - BAND / 2) / REACH;
  const ell = ELLIPSES[shape];
  const [x, y] = ell ? [CENTER + Math.cos(a) * ell[0], CENTER + Math.sin(a) * ell[1]] : rayExit(VERTICES[shape]!, a);
  return [CENTER + (x - CENTER) * k, CENTER + (y - CENTER) * k];
}

/** The frame: dark band, outer and inner rings in the accent colour, and the border's detail. */
export function frameLayer(shape: PatchShape, style: BorderStyle, palette: PatchPalette): { under: string; over: string } {
  const ring = (inset: number, width: number, extra = '') =>
    `<path d="${shapePath(shape, inset)}" fill="none" stroke="${palette.accent}" stroke-width="${width}"${extra}/>`;
  const under = `<path d="${shapePath(shape)}" fill="${palette.band}"/>`;
  let over = ring(bandFor(shape), 2.5);
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
  if (!isTriangle(shape)) for (const a of [Math.PI, 0]) {
    const [x, y] = bandPoint(shape, a);
    over += `<circle cx="${n(x)}" cy="${n(y)}" r="2.4" fill="${palette.accent}"/>`;
  }
  return { under, over };
}
