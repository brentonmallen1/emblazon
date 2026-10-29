import { circle, polar, sparkle } from '../../core/draw.ts';
import { mulberry32 } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import { INK, mix } from './palette.ts';
import type { FrameShape, Pattern } from './types.ts';

/** The metal outline, the field inside it, and a thin decorative line just inside the field. */
interface FrameGeometry {
  outer: string;
  inner: string;
  deco: string;
  /** Subjects are drawn on the 240 canvas, then scaled about (120, 124) to sit in the field. */
  fit: number;
}

const FRAMES: Readonly<Record<FrameShape, FrameGeometry>> = {
  // A round studded token: metal rim, dark band with studs, metal-edged field.
  token: { outer: circle(120, 120, 108), inner: circle(120, 120, 88), deco: circle(120, 120, 80), fit: 0.94 },
  // Stepped art-deco octagon.
  octagon: {
    outer: 'M70 12H170L228 70V170L170 228H70L12 170V70Z',
    inner: 'M76 24H164L216 76V164L164 216H76L24 164V76Z',
    deco: 'M82 30H158L210 82V158L158 210H82L30 158V82Z',
    fit: 1,
  },
  // A shrine doorway: round-topped, with a keystone.
  arch: {
    outer: 'M26 226V104A94 94 0 0 1 214 104V226Z',
    inner: 'M38 214V104A82 82 0 0 1 202 104V214Z',
    deco: 'M45 207V104A75 75 0 0 1 195 104V207Z',
    fit: 0.96,
  },
  // A deco cartouche: a square with its corners scooped out.
  cartouche: {
    outer: 'M44 14H196A30 30 0 0 0 226 44V196A30 30 0 0 0 196 226H44A30 30 0 0 0 14 196V44A30 30 0 0 0 44 14Z',
    inner: 'M185.8 26A42 42 0 0 0 214 54.2V185.8A42 42 0 0 0 185.8 214H54.2A42 42 0 0 0 26 185.8V54.2A42 42 0 0 0 54.2 26Z',
    deco: 'M181 33A49 49 0 0 0 207 59V181A49 49 0 0 0 181 207H59A49 49 0 0 0 33 181V59A49 49 0 0 0 59 33Z',
    fit: 0.96,
  },
};

export const framePaths = (f: FrameShape): FrameGeometry => FRAMES[f];

/** Metal and field, drawn under the subject. */
export function frameUnder(f: FrameShape, metal: string, field: string): string {
  const g = FRAMES[f];
  let s = `<path d="${g.outer}" fill="${metal}"/>`;
  if (f === 'token') {
    s += `<path d="${circle(120, 120, 104)}" fill="#15110D"/>`;
    let studs = '';
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6 - Math.PI / 2;
      const [x, y] = polar(120, 120, 96, a);
      const [dx, dy] = [Math.cos(a) * 5, Math.sin(a) * 5];
      const [px, py] = [-Math.sin(a) * 4, Math.cos(a) * 4];
      studs += `M${n(x - dx)} ${n(y - dy)}L${n(x + px)} ${n(y + py)}L${n(x + dx)} ${n(y + dy)}L${n(x - px)} ${n(y - py)}Z`;
    }
    s += `<path d="${studs}" fill="${metal}"/>`;
  }
  if (f === 'arch') s += `<path d="M110 8H130L127 24H113Z" fill="${mix(metal, '#FFFFFF', 0.25)}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
  if (f === 'cartouche') {
    const dots = [[30, 30], [210, 30], [210, 210], [30, 210]].map(([x, y]) => circle(x, y, 4)).join('');
    s += `<path d="${dots}" fill="${mix(metal, INK, 0.45)}"/>`;
  }
  return s + `<path d="${g.inner}" fill="${field}"/>`;
}

/** Edges and the inner decorative line, drawn over the subject. */
export function frameOver(f: FrameShape, metal: string): string {
  const g = FRAMES[f];
  const edge = f === 'token' ? `stroke="${metal}" stroke-width="2.5"` : `stroke="${INK}" stroke-width="2"`;
  return (
    `<path d="${g.inner}" fill="none" ${edge} stroke-linejoin="round"/>` +
    (f === 'arch' ? `<path d="M110 8H130L127 24H113Z" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` : '') +
    `<path d="${g.deco}" fill="none" stroke="${metal}" stroke-opacity="0.45" stroke-width="1"/>`
  );
}

/** The faint pattern on the field: deco sunburst, concentric rings or a scatter of stars. */
export function patternLayer(p: Pattern, field: string, metal: string, seed: number): string {
  const faint = mix(field, '#FFFFFF', 0.07);
  switch (p) {
    case 'plain':
      return '';
    case 'rays': {
      let d = '';
      for (let k = 0; k < 11; k++) {
        const a = ((-75 + k * 15) * Math.PI) / 180;
        d += `M120 206L${n(120 + 220 * Math.sin(a))} ${n(206 - 220 * Math.cos(a))}`;
      }
      return `<path d="${d}" stroke="${faint}" stroke-width="7"/>`;
    }
    case 'rings':
      return `<path d="${circle(120, 124, 50) + circle(120, 124, 66)}" fill="none" stroke="${metal}" stroke-opacity="0.22" stroke-width="1.6"/>` +
        `<path d="${circle(120, 124, 82)}" fill="none" stroke="${metal}" stroke-opacity="0.22" stroke-width="1.6" stroke-dasharray="2 6"/>`;
    case 'stars': {
      const rng = mulberry32(seed);
      let d = '';
      for (let k = 0; k < 9; k++) {
        const [x, y] = polar(120, 124, 62 + rng() * 26, (k / 9) * 2 * Math.PI + rng() * 0.5);
        d += k % 3 === 0 ? sparkle(x, y, 4.5) : circle(x, y, 1.3);
      }
      return `<path d="${d}" fill="${mix(field, '#FFFFFF', 0.4)}"/>`;
    }
  }
}
