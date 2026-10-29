import { L, M, n, type Pt } from '../../core/svg.ts';
import { BOTTOM, FESS, FIELD_H, FIELD_W, LEFT, RIGHT, TOP } from './geometry.ts';
import { edge, type LineStyle } from './lines.ts';
import type { Tincture } from './tinctures.ts';

export const PARTITIONS = [
  'perPale',
  'perFess',
  'perBend',
  'perBendSinister',
  'perChevron',
  'perSaltire',
  'quarterly',
  'gyronny',
] as const;
export type Partition = (typeof PARTITIONS)[number];

/** Partitions whose dividing lines can take a line style; gyronny is always straight. */
export const LINED_PARTITIONS: readonly Partition[] = PARTITIONS.filter((p) => p !== 'gyronny');

export const VARIATIONS = ['paly', 'barry', 'bendy', 'chequy', 'lozengy'] as const;
export type Variation = (typeof VARIATIONS)[number];

export type Field =
  | { kind: 'plain'; tincture: Tincture }
  | { kind: 'partition'; partition: Partition; line: LineStyle; tinctures: readonly [Tincture, Tincture] }
  | { kind: 'variation'; variation: Variation; tinctures: readonly [Tincture, Tincture] };

/**
 * Region painted in the second tincture; the first tincture is the base fill. Blazon names the
 * chief/dexter side first, so the second region is the base/sinister side.
 */
export function partitionPath(partition: Partition, line: LineStyle): string {
  const [cx, cy] = FESS;
  const e = (a: Pt, b: Pt) => edge(a, b, line);
  // Ends of the bend (\) and bend sinister (/) diagonals through the fess point.
  const bendTop: Pt = [LEFT, cy - (cx - LEFT)];
  const bendBottom: Pt = [RIGHT, cy + (RIGHT - cx)];
  const sinTop: Pt = [RIGHT, cy - (RIGHT - cx)];
  const sinBottom: Pt = [LEFT, cy + (cx - LEFT)];

  switch (partition) {
    case 'perPale':
      return `${M([cx, TOP])}${L([RIGHT, TOP])}${L([RIGHT, BOTTOM])}${L([cx, BOTTOM])}${e([cx, BOTTOM], [cx, TOP])}Z`;
    case 'perFess':
      return `${M([RIGHT, cy])}${L([RIGHT, BOTTOM])}${L([LEFT, BOTTOM])}${L([LEFT, cy])}${e([LEFT, cy], [RIGHT, cy])}Z`;
    case 'perBend':
      return `${M(bendTop)}${e(bendTop, bendBottom)}${L([RIGHT, BOTTOM])}${L([LEFT, BOTTOM])}Z`;
    case 'perBendSinister':
      return `${M(sinTop)}${L([RIGHT, BOTTOM])}${L([LEFT, BOTTOM])}${L(sinBottom)}${e(sinBottom, sinTop)}Z`;
    case 'perChevron': {
      const apex: Pt = [cx, cy - 20];
      const left: Pt = [LEFT, apex[1] + (cx - LEFT)];
      const right: Pt = [RIGHT, apex[1] + (RIGHT - cx)];
      return `${M(left)}${e(left, apex)}${e(apex, right)}${L([RIGHT, BOTTOM])}${L([LEFT, BOTTOM])}Z`;
    }
    case 'perSaltire':
      // Second tincture takes the flanks; the chief and base triangles keep the first.
      return (
        `${M(bendTop)}${e(bendTop, FESS)}${e(FESS, sinBottom)}Z` +
        `${M(FESS)}${e(FESS, sinTop)}${L(bendBottom)}${e(bendBottom, FESS)}Z`
      );
    case 'quarterly':
      // Second tincture takes quarters 2 (upper sinister) and 3 (lower dexter).
      return (
        `${M([cx, TOP])}${L([RIGHT, TOP])}${L([RIGHT, cy])}${e([RIGHT, cy], FESS)}${e(FESS, [cx, TOP])}Z` +
        `${M([LEFT, cy])}${e([LEFT, cy], FESS)}${e(FESS, [cx, BOTTOM])}${L([LEFT, BOTTOM])}Z`
      );
    case 'gyronny': {
      const r = 400;
      const ray = (deg: number): Pt => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
      let d = '';
      for (let i = 0; i < 8; i += 2) d += `${M(FESS)}${L(ray(i * 45 - 90))}${L(ray(i * 45 - 45))}Z`;
      return d;
    }
  }
}

/** Second-tincture pieces of a patterned field. Always straight-lined. */
export function variationPath(variation: Variation): string {
  let d = '';
  switch (variation) {
    case 'paly': {
      const w = FIELD_W / 6;
      for (let i = 1; i < 6; i += 2) d += `${M([i * w, TOP])}h${n(w)}V${BOTTOM}h${n(-w)}Z`;
      return d;
    }
    case 'barry': {
      const h = FIELD_H / 8;
      for (let j = 1; j < 8; j += 2) d += `${M([LEFT, j * h])}H${RIGHT}v${n(h)}H${LEFT}Z`;
      return d;
    }
    case 'bendy': {
      // Stripes bounded by lines x − y = c, one boundary through the fess point.
      const c0 = FESS[0] - FESS[1];
      const step = 64;
      for (let k = -7; k < 7; k += 2) {
        const c1 = c0 + k * step;
        const c2 = c1 + step;
        d += `${M([TOP + c1, TOP])}${L([TOP + c2, TOP])}${L([BOTTOM + c2, BOTTOM])}${L([BOTTOM + c1, BOTTOM])}Z`;
      }
      return d;
    }
    case 'chequy': {
      const s = 25;
      for (let i = 0; i * s < FIELD_W; i++) {
        for (let j = 0; j * s < FIELD_H; j++) {
          if ((i + j) % 2 === 1) d += `${M([i * s, j * s])}h${s}v${s}h${-s}Z`;
        }
      }
      return d;
    }
    case 'lozengy': {
      // One lattice of lozenges, centred on the fess point; the offset lattice is the base fill.
      const dx = 40;
      const dy = 50;
      for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
          const x = FESS[0] + i * dx;
          const y = FESS[1] + j * dy;
          d += `${M([x, y - dy / 2])}${L([x + dx / 2, y])}${L([x, y + dy / 2])}${L([x - dx / 2, y])}Z`;
        }
      }
      return d;
    }
  }
}
