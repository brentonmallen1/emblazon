import { mulberry32, type Rng } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import type { BodyKind, BodyPlacement } from './types.ts';

/** Where a body sits: a broad limb along the bottom, or a small planet in an upper corner. */
export function bodyGeometry(placement: BodyPlacement): { cx: number; cy: number; r: number } {
  switch (placement) {
    case 'horizon':
      return { cx: 120, cy: 302, r: 150 };
    case 'left':
      return { cx: 82, cy: 86, r: 30 };
    case 'right':
      return { cx: 158, cy: 86, r: 30 };
  }
}

/** Where details go: anywhere on a corner planet; on a horizon, only in the visible strip. */
interface Surface {
  cx: number;
  cy: number;
  r: number;
  horizon: boolean;
  /** Detail scale: the planet's radius, or the visible strip's height on a horizon. */
  size: number;
  spot: (reach?: number) => [number, number];
}

interface BodyLook {
  base: string;
  detail: (rng: Rng, s: Surface) => string;
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

function inside(rng: Rng, cx: number, cy: number, r: number, reach = 0.85): [number, number] {
  const a = rng() * Math.PI * 2;
  const d = Math.sqrt(rng()) * r * reach;
  return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
}

function craters(rng: Rng, s: Surface, color: string, count: number): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const [x, y] = s.spot();
    d += circlePath(x, y, s.size * (0.06 + rng() * 0.1));
  }
  return `<path d="${d}" fill="${color}"/>`;
}

const LOOKS: Readonly<Record<BodyKind, BodyLook>> = {
  earth: {
    base: '#3E6FB0',
    detail: (rng, s) => {
      let land = '';
      for (let i = 0; i < 3; i++) {
        const [x, y] = s.spot(0.75);
        land += blob(rng, x, y, s.size * (0.18 + rng() * 0.16));
      }
      return `<path d="${land}" fill="#5E9E6A"/>`;
    },
  },
  moon: { base: '#B7B2A6', detail: (rng, s) => craters(rng, s, '#9A958A', 7) },
  mars: {
    base: '#C8693E',
    detail: (rng, s) =>
      craters(rng, s, '#A4532F', 5) +
      (s.horizon ? '' : `<ellipse cx="${n(s.cx)}" cy="${n(s.cy - s.r * 0.9)}" rx="${n(s.r * 0.32)}" ry="${n(s.r * 0.12)}" fill="#EFE4D6"/>`),
  },
  gasGiant: {
    base: '#D9B07A',
    detail: (rng, { cx, cy, r, horizon, spot, size }) => {
      // Flat bands; on a horizon only the visible top needs them.
      let bands = '';
      let y = horizon ? cy - r + 10 : cy - r + r * 0.25;
      const end = horizon ? cy - r + 60 : cy + r;
      while (y < end) {
        const h = size * (0.1 + rng() * 0.12);
        bands += `<rect x="${n(cx - r)}" y="${n(y)}" width="${n(2 * r)}" height="${n(h)}" fill="#B98B57"/>`;
        y += h * (2 + rng() * 1.5);
      }
      const [sx, sy] = spot(0.5);
      return bands + `<ellipse cx="${n(sx)}" cy="${n(sy)}" rx="${n(size * 0.16)}" ry="${n(size * 0.09)}" fill="#A5673E"/>`;
    },
  },
  ringed: {
    base: '#D8C08A',
    detail: (rng, { cx, cy, r }) => {
      let bands = '';
      for (let i = 0; i < 3; i++) {
        const y = cy - r + (i + 0.6 + rng() * 0.4) * (r / 1.7);
        bands += `<rect x="${n(cx - r)}" y="${n(y)}" width="${n(2 * r)}" height="${n(r * 0.1)}" fill="#BFA36A"/>`;
      }
      return bands;
    },
  },
  ice: {
    base: '#BFD9E3',
    detail: (rng, s) => {
      let d = '';
      for (let i = 0; i < 5; i++) {
        let [x, y] = s.spot(0.85);
        d += `M${n(x)} ${n(y)}`;
        for (let k = 0; k < 3; k++) {
          x += (rng() - 0.5) * s.size * 0.5;
          y += (rng() - 0.5) * s.size * 0.4;
          d += `L${n(x)} ${n(y)}`;
        }
      }
      return `<path d="${d}" fill="none" stroke="#8FB7C6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    },
  },
  dune: {
    base: '#D4A060',
    // Wind-cut ridges: soft waves across the sand.
    detail: (rng, { cx, cy, r, horizon, size }) => {
      let d = '';
      const top = horizon ? cy - r + 14 : cy - r * 0.6;
      for (let i = 0; i < 3; i++) {
        const y = top + i * size * (horizon ? 0.3 : 0.45) + rng() * 4;
        const w = size * 0.08;
        d += `M${n(cx - r)} ${n(y)}Q${n(cx - r / 2)} ${n(y - w)} ${n(cx)} ${n(y)}T${n(cx + r)} ${n(y)}`;
      }
      return `<path d="${d}" fill="none" stroke="#B9844A" stroke-width="2" stroke-linecap="round"/>`;
    },
  },
};

/**
 * A planet as two layers so a ring can pass behind and in front of it, with the craft drawn
 * after both. Flat: one colour, flat details, no shading or outline.
 */
export function bodyLayers(kind: BodyKind, placement: BodyPlacement, seed: number, id: string, ringColor: string): { defs: string; back: string; front: string } {
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
    size: horizon ? 48 : r,
    // A horizon shows only its top: keep details in the strip between the limb and the inner ring.
    spot: horizon ? () => [cx + (rng() * 2 - 1) * 70, cy - r + 8 + rng() * 40] : (reach = 0.85) => inside(rng, cx, cy, r, reach),
  };

  const ring = kind === 'ringed' ? ringParts(cx, cy, r, id, ringColor) : undefined;
  const planet = `<path d="${disc}" fill="${look.base}"/><g clip-path="url(#${id}-body)">${look.detail(rng, surface)}</g>`;
  return {
    defs: `<clipPath id="${id}-body"><path d="${disc}"/></clipPath>` + (ring?.defs ?? ''),
    back: (ring?.back ?? '') + planet,
    front: ring?.front ?? '',
  };
}

/** A tilted ring line: drawn whole behind the planet, then its near half again in front. */
function ringParts(cx: number, cy: number, r: number, id: string, color: string): { defs: string; back: string; front: string } {
  const tilt = -18;
  const ring = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * 1.8)}" ry="${n(r * 0.42)}" fill="none" stroke="${color}" stroke-width="${n(Math.max(2, r * 0.08))}" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/>`;
  return {
    defs: `<clipPath id="${id}-ringfront"><rect x="${n(cx - r * 2.2)}" y="${n(cy)}" width="${n(r * 4.4)}" height="${n(r * 2.2)}" transform="rotate(${tilt} ${n(cx)} ${n(cy)})"/></clipPath>`,
    back: ring,
    front: `<g clip-path="url(#${id}-ringfront)">${ring}</g>`,
  };
}
