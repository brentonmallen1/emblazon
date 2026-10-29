import { L, M, type Pt } from '../../core/svg.ts';
import { BOTTOM, FESS, LEFT, RIGHT, TOP } from './geometry.ts';
import { edge, type LineStyle } from './lines.ts';
import type { Tincture } from './tinctures.ts';

export const ORDINARIES = [
  'chief',
  'fess',
  'pale',
  'bend',
  'bendSinister',
  'chevron',
  'cross',
  'saltire',
  'pile',
  'bordure',
] as const;
export type OrdinaryKind = (typeof ORDINARIES)[number];

/**
 * Ordinaries that take a line style. The bordure follows the shield outline, and patterns
 * collapse into noise at the pile's narrow tip, so both stay plain.
 */
export const LINED_ORDINARIES: readonly OrdinaryKind[] = ORDINARIES.filter((o) => o !== 'bordure' && o !== 'pile');

export interface Ordinary {
  kind: OrdinaryKind;
  line: LineStyle;
  tincture: Tincture;
}

/** Visible width of the bordure inside the shield edge. */
export const BORDURE_WIDTH = 18;

/** Chief depth: the top third of the field, less a little so charges in base have room. */
export const CHIEF_DEPTH = 66;

/**
 * Outline of an ordinary, traced clockwise so line styles face the right way. The bordure has
 * no path of its own: the renderer strokes the shield outline instead.
 */
export function ordinaryPath(kind: Exclude<OrdinaryKind, 'bordure'>, line: LineStyle): string {
  const [cx, cy] = FESS;
  switch (kind) {
    case 'chief':
      return `${M([LEFT, TOP])}${L([RIGHT, TOP])}${L([RIGHT, CHIEF_DEPTH])}${edge([RIGHT, CHIEF_DEPTH], [LEFT, CHIEF_DEPTH], line)}Z`;
    case 'fess':
      return band([LEFT, cy], [RIGHT, cy], 28, line);
    case 'pale':
      return band([cx, TOP], [cx, BOTTOM], 28, line);
    case 'bend':
      return band([LEFT, cy - (cx - LEFT)], [cx + (BOTTOM - cy), BOTTOM], 26, line);
    case 'bendSinister':
      return band([RIGHT, cy - (RIGHT - cx)], [cx - (BOTTOM - cy), BOTTOM], 26, line);
    case 'chevron': {
      // Centre line: apex at (100,80), arms at 45°. Edges sit half-width × √2 above and below.
      const off = 24 * Math.SQRT2;
      const apex = cy - 20;
      const up = (x: number): Pt => [x, apex - off + Math.abs(x - cx)];
      const down = (x: number): Pt => [x, apex + off + Math.abs(x - cx)];
      return (
        `${M(up(LEFT))}${edge(up(LEFT), up(cx), line)}${edge(up(cx), up(RIGHT), line)}` +
        `${L(down(RIGHT))}${edge(down(RIGHT), down(cx), line)}${edge(down(cx), down(LEFT), line)}Z`
      );
    }
    case 'cross':
      return cross(22, 160, line, 0);
    case 'saltire':
      return cross(20, 200, line, Math.PI / 4);
    case 'pile': {
      const tl: Pt = [cx - 50, TOP];
      const tr: Pt = [cx + 50, TOP];
      const tip: Pt = [cx, 190];
      return `${M(tl)}${L(tr)}${edge(tr, tip, line)}${edge(tip, tl, line)}Z`;
    }
  }
}

/** A straight band of half-width `half` along the centre line a→b. Clockwise by construction. */
function band(a: Pt, b: Pt, half: number, line: LineStyle): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = (-(b[1] - a[1]) / len) * half;
  const ny = ((b[0] - a[0]) / len) * half;
  const a1: Pt = [a[0] - nx, a[1] - ny];
  const b1: Pt = [b[0] - nx, b[1] - ny];
  const b2: Pt = [b[0] + nx, b[1] + ny];
  const a2: Pt = [a[0] + nx, a[1] + ny];
  return `${M(a1)}${edge(a1, b1, line)}${L(b2)}${edge(b2, a2, line)}Z`;
}

/**
 * A cross centred on the fess point as one clockwise outline (no seams where arms meet),
 * optionally rotated — a saltire is a cross turned 45°. Arm ends are always straight.
 */
function cross(half: number, reach: number, line: LineStyle, angle: number): string {
  const [cx, cy] = FESS;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const h = half;
  const r = reach;
  const ring: Pt[] = (
    [
      [-h, -r], [h, -r], [h, -h],
      [r, -h], [r, h], [h, h],
      [h, r], [-h, r], [-h, h],
      [-r, h], [-r, -h], [-h, -h],
    ] as const
  ).map(([x, y]): Pt => [cx + x * cos - y * sin, cy + x * sin + y * cos]);

  let d = M(ring[0]);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    d += i % 3 === 0 ? L(b) : edge(a, b, line);
  }
  return `${d}Z`;
}
