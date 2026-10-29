import { mulberry32 } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import { CENTER, OUTLINE, type PatchPalette } from './frame.ts';

/** A tapered swoosh arcing from lower left to upper right (mirrored when flipped). */
export function swoosh(palette: PatchPalette, flip: boolean): string {
  const p = [
    [30, 178],
    [70, 96],
    [150, 50],
    [222, 62],
  ] as const;
  const at = (t: number): [number, number, number, number] => {
    const u = 1 - t;
    const x = u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0];
    const y = u ** 3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t ** 3 * p[3][1];
    const dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
    const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
    const len = Math.hypot(dx, dy);
    return [x, y, -dy / len, dx / len];
  };
  const steps = 28;
  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y, nx, ny] = at(t);
    const w = 8 * Math.sin(Math.PI * t) ** 0.8;
    const fx = (v: number) => (flip ? 240 - v : v);
    upper.push(`${n(fx(x + nx * w))} ${n(y + ny * w)}`);
    lower.unshift(`${n(fx(x - nx * w))} ${n(y - ny * w)}`);
  }
  return `<path d="M${upper.join('L')}L${lower.join('L')}Z" fill="${palette.accent}" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/** An orbit ellipse around the vehicle's position: far half behind it, near half in front. */
export function orbit(palette: PatchPalette, cx: number, cy: number, flip: boolean, id: string): { defs: string; back: string; front: string } {
  const tilt = flip ? 16 : -16;
  const ring = (w: number, color: string) =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="88" ry="24" fill="none" stroke="${color}" stroke-width="${w}" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/>`;
  const both = ring(5.5, OUTLINE) + ring(3, palette.thread);
  return {
    defs: `<clipPath id="${id}-orbitfront"><rect x="${n(cx - 100)}" y="${n(cy)}" width="200" height="60" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/></clipPath>`,
    back: both,
    front: `<g clip-path="url(#${id}-orbitfront)">${both}</g>`,
  };
}

/** A five-pointed star centred at (x, y). */
function star(x: number, y: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${n(x + Math.cos(a) * rr)} ${n(y + Math.sin(a) * rr)}`;
  }
  return `${d}Z`;
}

/** One star per crew member, spread along an arc under the top of the border. */
export function crewStars(count: number, palette: PatchPalette): string {
  if (count === 0) return '';
  const spread = Math.min(0.9, 0.16 * (count - 1));
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1));
    d += star(CENTER + Math.cos(a) * 80, CENTER + Math.sin(a) * 80, 6.5);
  }
  return `<path d="${d}" fill="${palette.thread}" stroke="${OUTLINE}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

/** A small crescent moon and/or a constellation, placed in whichever upper corner is free. */
export function skyAccents(accents: { moon: boolean; constellation: boolean; seed: number }, palette: PatchPalette, freeSide: 'left' | 'right' | 'both'): string {
  const rng = mulberry32(accents.seed);
  let out = '';
  const side = freeSide === 'both' ? (rng() < 0.5 ? 'left' : 'right') : freeSide;
  const corner = side === 'left' ? 70 : 170;
  if (accents.moon) {
    const r = 11;
    const cx = corner + (side === 'left' ? -4 : 4);
    const cy = 78;
    out +=
      `<path d="M${n(cx)} ${n(cy - r)}A${r} ${r} 0 1 0 ${n(cx)} ${n(cy + r)}A${n(r * 0.75)} ${r} 0 1 1 ${n(cx)} ${n(cy - r)}Z" ` +
      `fill="${palette.thread}" stroke="${OUTLINE}" stroke-width="1.4"/>`;
  }
  if (accents.constellation) {
    // A few linked points in the other upper corner (or the same one if the moon isn't drawn).
    const cx = accents.moon ? 240 - corner : corner;
    const pts = Array.from({ length: 5 }, () => [cx - 26 + rng() * 52, 56 + rng() * 44] as const).sort((a, b) => a[0] - b[0]);
    out += `<path d="M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}" fill="none" stroke="${palette.thread}" stroke-opacity="0.6" stroke-width="1"/>`;
    out += pts.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="2" fill="${palette.thread}"/>`).join('');
  }
  return out;
}
