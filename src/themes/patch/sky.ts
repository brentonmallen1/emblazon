import { mulberry32 } from '../../core/rng.ts';
import { n, type Pt } from '../../core/svg.ts';
import { CANVAS, bandFor, insideShape, type PatchPalette } from './frame.ts';
import type { PatchShape } from './types.ts';

/** A four-pointed sparkle centred at (x, y). */
export function sparkle(x: number, y: number, r: number): string {
  const w = r * 0.22;
  return `M${n(x)} ${n(y - r)}Q${n(x + w)} ${n(y - w)} ${n(x + r)} ${n(y)}Q${n(x + w)} ${n(y + w)} ${n(x)} ${n(y + r)}` +
    `Q${n(x - w)} ${n(y + w)} ${n(x - r)} ${n(y)}Q${n(x - w)} ${n(y - w)} ${n(x)} ${n(y - r)}Z`;
}

/**
 * Flat sky: the inner colour, a scatter of small dots and a few sparkles. Every star sits whole
 * inside the frame's inner edge: one the edge cut through would read as a stray white wedge.
 */
export function skyLayer(sky: { seed: number; stars: number }, palette: PatchPalette, shape: PatchShape): string {
  const rng = mulberry32(sky.seed);
  const band = bandFor(shape);
  let dots = '';
  let sparkles = '';
  for (let i = 0; i < sky.stars; i++) {
    const big = i % 5 === 0;
    const r = big ? 4 + rng() * 4 : 0.8 + rng() * 1.1;
    let at: Pt | undefined;
    for (let tries = 0; tries < 24 && !at; tries++) {
      const x = 8 + rng() * (CANVAS - 16);
      const y = 8 + rng() * (CANVAS - 16);
      if (insideShape(shape, x, y, band + r + 2)) at = [x, y];
    }
    if (!at) continue;
    const [x, y] = at;
    if (big) sparkles += sparkle(x, y, r);
    else dots += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
  }
  return (
    `<rect width="${CANVAS}" height="${CANVAS}" fill="${palette.inner}"/>` +
    `<path d="${dots}" fill="${palette.thread}" fill-opacity="0.55"/><path d="${sparkles}" fill="${palette.thread}"/>`
  );
}
