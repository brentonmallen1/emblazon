import { M, n, type Pt } from '../../core/svg.ts';
import { BOTTOM, FESS, LEFT, RIGHT, TOP } from './geometry.ts';
import { TINCTURE_HEX, type Fur, type Tincture } from './tinctures.ts';

/** How a fur is drawn: a ground colour and a repeating pattern of spots or pelts over it. */
export interface FurLook {
  ground: string;
  pattern: string;
  /** Path data for the pattern, covering the whole bleed area in field coordinates. */
  d: string;
}

export function furLook(fur: Fur, hex: Readonly<Record<Tincture, string>> = TINCTURE_HEX): FurLook {
  const { or, argent, sable, azure } = hex;
  switch (fur) {
    case 'ermine':
      return { ground: argent, pattern: sable, d: ERMINE_SPOTS };
    case 'ermines':
      return { ground: sable, pattern: argent, d: ERMINE_SPOTS };
    case 'erminois':
      return { ground: or, pattern: sable, d: ERMINE_SPOTS };
    case 'pean':
      return { ground: sable, pattern: or, d: ERMINE_SPOTS };
    case 'vair':
      return { ground: argent, pattern: azure, d: VAIR_PELTS };
  }
}

/** One ermine spot (three dots over a split tail), centred at (x, y), `h` tall. */
function ermineSpot(x: number, y: number, h: number): string {
  const s = h / 1;
  const p = (dx: number, dy: number): string => `${n(x + dx * s)} ${n(y + dy * s)}`;
  const dot = (dx: number, dy: number, r: number) =>
    `${M([x + (dx - r) * s, y + dy * s])}A${n(r * s)} ${n(r * s)} 0 1 0 ${p(dx + r, dy)}A${n(r * s)} ${n(r * s)} 0 1 0 ${p(dx - r, dy)}Z`;
  return (
    dot(0, -0.4, 0.1) +
    dot(-0.19, -0.27, 0.1) +
    dot(0.19, -0.27, 0.1) +
    `M${p(0, -0.2)}C${p(0.06, 0.05)} ${p(0.16, 0.25)} ${p(0.26, 0.42)}L${p(0.09, 0.33)}L${p(0, 0.5)}L${p(-0.09, 0.33)}L${p(-0.26, 0.42)}C${p(-0.16, 0.25)} ${p(-0.06, 0.05)} ${p(0, -0.2)}Z`
  );
}

/** Staggered rows of ermine spots, one row centred on the fess point. */
const ERMINE_SPOTS = (() => {
  const dx = 38;
  const dy = 42;
  let d = '';
  for (let j = -4; j <= 4; j++) {
    const y = FESS[1] + j * dy;
    const shift = j % 2 === 0 ? 0 : dx / 2;
    for (let i = -4; i <= 4; i++) {
      const x = FESS[0] + i * dx + shift;
      if (x > LEFT - dx && x < RIGHT + dx && y > TOP - dy && y < BOTTOM + dy) d += ermineSpot(x, y, 18);
    }
  }
  return d;
})();

/** Rows of bell-shaped vair pelts, alternate rows offset by half a pelt. */
const VAIR_PELTS = (() => {
  const w = 200 / 6;
  const h = 30;
  const pelt = (x0: number, y0: number): string => {
    const pts: Pt[] = [
      [x0 + w * 0.3, y0],
      [x0 + w * 0.7, y0],
      [x0 + w * 0.7, y0 + h * 0.45],
      [x0 + w, y0 + h * 0.72],
      [x0 + w, y0 + h],
      [x0, y0 + h],
      [x0, y0 + h * 0.72],
      [x0 + w * 0.3, y0 + h * 0.45],
    ];
    return `${M(pts[0])}${pts.slice(1).map(([x, y]) => `L${n(x)} ${n(y)}`).join('')}Z`;
  };
  let d = '';
  for (let j = -2; j * h < BOTTOM; j++) {
    const shift = j % 2 === 0 ? 0 : -w / 2;
    for (let i = -2; i * w < RIGHT; i++) d += pelt(i * w + shift, j * h);
  }
  return d;
})();
