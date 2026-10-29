import { n, type Pt } from './svg.ts';

/** Small path builders shared by the line-art themes. All return path data. */

export const circle = (cx: number, cy: number, r: number): string =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;

export const polyline = (pts: readonly Pt[], closed = false): string =>
  `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${closed ? 'Z' : ''}`;

/** Point at angle `a` (radians, 0 = right, −π/2 = up) and radius `r` around (cx, cy). */
export const polar = (cx: number, cy: number, r: number, a: number): Pt => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

/** Regular polygon with one vertex at angle `start` (default: pointing up). */
export function regular(cx: number, cy: number, r: number, sides: number, start = -Math.PI / 2): Pt[] {
  return Array.from({ length: sides }, (_, i) => polar(cx, cy, r, start + (i * 2 * Math.PI) / sides));
}

/** A star polygon: `points` tips at radius r, valleys at r·inner. */
export function star(cx: number, cy: number, r: number, points: number, inner: number, start = -Math.PI / 2): string {
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) pts.push(polar(cx, cy, i % 2 ? r * inner : r, start + (i * Math.PI) / points));
  return polyline(pts, true);
}

/** Star drawn as one continuous line through every k-th vertex: {5/2} pentagram, {6/2} hexagram… */
export function starPolygon(cx: number, cy: number, r: number, points: number, step: number, start = -Math.PI / 2): string {
  const v = regular(cx, cy, r, points, start);
  // When points and step share a factor the figure splits into separate polygons (hexagram).
  const g = gcd(points, step);
  let d = '';
  for (let s = 0; s < g; s++) {
    const loop: Pt[] = [];
    for (let i = 0; i < points / g; i++) loop.push(v[(s + i * step) % points]);
    d += polyline(loop, true);
  }
  return d;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** An arc from angle a0 to a1 (radians, clockwise on screen when a1 > a0). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${n(x0)} ${n(y0)}A${n(r)} ${n(r)} 0 ${large} ${a1 > a0 ? 1 : 0} ${n(x1)} ${n(y1)}`;
}

/** A four-pointed sparkle centred at (x, y). */
export function sparkle(x: number, y: number, r: number): string {
  const w = r * 0.22;
  return `M${n(x)} ${n(y - r)}Q${n(x + w)} ${n(y - w)} ${n(x + r)} ${n(y)}Q${n(x + w)} ${n(y + w)} ${n(x)} ${n(y + r)}` +
    `Q${n(x - w)} ${n(y + w)} ${n(x - r)} ${n(y)}Q${n(x - w)} ${n(y - w)} ${n(x)} ${n(y - r)}Z`;
}

/** Stroke attributes for line art: round joins and caps. */
export const strokeAttrs = (color: string, width: number, extra = ''): string =>
  `fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"${extra}`;
