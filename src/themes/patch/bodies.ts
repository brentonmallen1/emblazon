import { mulberry32, type Rng } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import { OUTLINE } from './frame.ts';
import type { BodyKind, BodyPlacement } from './types.ts';

/** Where a body sits: a big limb along the bottom, or a smaller planet in an upper corner. */
export function bodyGeometry(placement: BodyPlacement): { cx: number; cy: number; r: number } {
  switch (placement) {
    case 'horizon':
      return { cx: 120, cy: 302, r: 150 };
    case 'left':
      return { cx: 72, cy: 82, r: 38 };
    case 'right':
      return { cx: 168, cy: 82, r: 38 };
  }
}

/** Where details go: on a corner planet anywhere on the disc, on a horizon only in the visible band. */
interface Surface {
  cx: number;
  cy: number;
  r: number;
  horizon: boolean;
  spot: (reach?: number) => [number, number];
}

interface BodyLook {
  base: string;
  detail: (rng: Rng, s: Surface) => string;
  /** Thin glow just outside the limb. */
  atmosphere?: string;
}

const circlePath = (cx: number, cy: number, r: number): string =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;

/** A smooth closed blob: a jittered polygon drawn through its edge midpoints. */
function blob(rng: Rng, cx: number, cy: number, size: number, points = 9): string {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const r = size * (0.65 + rng() * 0.6);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8] as const;
  });
  const mid = (i: number) => {
    const [x1, y1] = pts[i % points];
    const [x2, y2] = pts[(i + 1) % points];
    return `${n((x1 + x2) / 2)} ${n((y1 + y2) / 2)}`;
  };
  let d = `M${mid(0)}`;
  for (let i = 1; i <= points; i++) d += `Q${n(pts[i % points][0])} ${n(pts[i % points][1])} ${mid(i)}`;
  return `${d}Z`;
}

/** A point inside the disc, biased away from the very edge. */
function inside(rng: Rng, cx: number, cy: number, r: number, reach = 0.85): [number, number] {
  const a = rng() * Math.PI * 2;
  const d = Math.sqrt(rng()) * r * reach;
  return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
}

function craters(rng: Rng, s: Surface, color: string, count: number): string {
  let d = '';
  const size = s.horizon ? 34 : s.r;
  for (let i = 0; i < count; i++) {
    const [x, y] = s.spot();
    d += circlePath(x, y, size * (0.05 + rng() * 0.12));
  }
  return `<path d="${d}" fill="${color}" fill-opacity="0.8"/>`;
}

const LOOKS: Readonly<Record<BodyKind, BodyLook>> = {
  earth: {
    base: '#2F6FD6',
    atmosphere: '#9FD3FF',
    detail: (rng, s) => {
      const size = s.horizon ? 40 : s.r;
      let land = '';
      for (let i = 0; i < 4; i++) {
        const [x, y] = s.spot(0.8);
        land += blob(rng, x, y, size * (0.16 + rng() * 0.18));
      }
      let clouds = '';
      for (let i = 0; i < 5; i++) {
        const [x, y] = s.spot(0.9);
        clouds += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(size * (0.12 + rng() * 0.16))}" ry="${n(size * 0.035)}" fill="#FFFFFF" fill-opacity="0.85"/>`;
      }
      return `<path d="${land}" fill="#4CAF50"/>` + clouds;
    },
  },
  moon: { base: '#B9BCC4', detail: (rng, s) => craters(rng, s, '#8C9099', 9) },
  mars: {
    base: '#C4532C',
    // The polar cap only reads on a whole planet; on a horizon it would be a white stripe.
    detail: (rng, s) =>
      craters(rng, s, '#8E3417', 6) +
      (s.horizon ? '' : `<ellipse cx="${n(s.cx)}" cy="${n(s.cy - s.r * 0.92)}" rx="${n(s.r * 0.32)}" ry="${n(s.r * 0.12)}" fill="#F4EDE6"/>`),
  },
  gasGiant: {
    base: '#E9C99A',
    detail: (rng, { cx, cy, r, spot }) => {
      // Wavy horizontal bands in alternating tones, plus one storm.
      const tones = ['#C98B55', '#F3DDB8', '#B9744A', '#E1B07C'];
      let bands = '';
      let y = cy - r;
      for (let i = 0; y < cy + r; i++) {
        const h = r * (0.12 + rng() * 0.16);
        const w = r * 0.04;
        bands +=
          `<path d="M${n(cx - r)} ${n(y)}Q${n(cx - r / 2)} ${n(y - w)} ${n(cx)} ${n(y)}T${n(cx + r)} ${n(y)}V${n(y + h)}H${n(cx - r)}Z" fill="${tones[i % tones.length]}"/>`;
        y += h * (1.4 + rng());
      }
      const [sx, sy] = spot(0.5);
      return bands + `<ellipse cx="${n(sx)}" cy="${n(sy)}" rx="${n(r * 0.16)}" ry="${n(r * 0.09)}" fill="#A9542E"/>`;
    },
  },
  ringed: {
    base: '#E2C88F',
    detail: (rng, { cx, cy, r }) => {
      let bands = '';
      for (let i = 0; i < 4; i++) {
        const y = cy - r + (i + 0.5 + rng() * 0.4) * (r / 2);
        bands += `<rect x="${n(cx - r)}" y="${n(y)}" width="${n(2 * r)}" height="${n(r * (0.07 + rng() * 0.08))}" fill="#C9A866"/>`;
      }
      return bands;
    },
  },
  ice: {
    base: '#CFE9F5',
    detail: (rng, s) => {
      const r = s.horizon ? 40 : s.r;
      let d = '';
      for (let i = 0; i < 6; i++) {
        let [x, y] = s.spot(0.9);
        d += `M${n(x)} ${n(y)}`;
        for (let k = 0; k < 3; k++) {
          x += (rng() - 0.5) * r * 0.5;
          y += (rng() - 0.5) * r * 0.5;
          d += `L${n(x)} ${n(y)}`;
        }
      }
      return `<path d="${d}" fill="none" stroke="#7FB4CF" stroke-width="${n(Math.max(1, r * 0.025))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    },
  },
};

/**
 * A planet as three layers so a ring can pass behind and in front of it, and a vehicle can be
 * drawn between (a horizon planet sits behind everything else).
 */
export function bodyLayers(kind: BodyKind, placement: BodyPlacement, seed: number, id: string): { defs: string; back: string; front: string } {
  const { cx, cy, r } = bodyGeometry(placement);
  const look = LOOKS[kind];
  const rng = mulberry32(seed);
  const disc = circlePath(cx, cy, r);
  const horizon = placement === 'horizon';
  const surface: Surface = {
    cx,
    cy,
    r,
    horizon,
    // A horizon shows only its top: keep details in the strip between the limb and the border.
    spot: horizon ? () => [cx + (rng() * 2 - 1) * 100, cy - r + 8 + rng() * 64] : (reach = 0.85) => inside(rng, cx, cy, r, reach),
  };
  const defs =
    `<clipPath id="${id}-body"><path d="${disc}"/></clipPath>` +
    // Lit from the upper left: transparent there, darkening toward the far side.
    `<radialGradient id="${id}-terminator" cx="0.3" cy="0.25" r="0.95">` +
    `<stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`;

  const ring = kind === 'ringed' ? ringParts(cx, cy, r, id) : undefined;
  const planet =
    (look.atmosphere ? `<path d="${circlePath(cx, cy, r + 3)}" fill="${look.atmosphere}" fill-opacity="0.45"/>` : '') +
    `<path d="${disc}" fill="${look.base}"/>` +
    `<g clip-path="url(#${id}-body)">${look.detail(rng, surface)}<path d="${disc}" fill="url(#${id}-terminator)"/></g>` +
    `<path d="${disc}" fill="none" stroke="${OUTLINE}" stroke-width="2.5"/>`;

  return {
    defs: defs + (ring?.defs ?? ''),
    back: (ring?.back ?? '') + planet,
    front: ring?.front ?? '',
  };
}

/** A tilted ring: drawn whole behind the planet, then its near half again in front. */
function ringParts(cx: number, cy: number, r: number, id: string): { defs: string; back: string; front: string } {
  const tilt = -18;
  const ring = (w: number, color: string) =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * 1.85)}" ry="${n(r * 0.42)}" fill="none" stroke="${color}" stroke-width="${n(w)}" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/>`;
  const both = ring(r * 0.2 + 3, OUTLINE) + ring(r * 0.2, '#D8BE84') + ring(r * 0.05, '#B8995E');
  return {
    defs: `<clipPath id="${id}-ringfront"><rect x="${n(cx - r * 2.2)}" y="${n(cy)}" width="${n(r * 4.4)}" height="${n(r * 2.2)}" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/></clipPath>`,
    back: both,
    front: `<g clip-path="url(#${id}-ringfront)">${both}</g>`,
  };
}
