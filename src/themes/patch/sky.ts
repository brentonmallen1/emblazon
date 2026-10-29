import { mulberry32 } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import { CANVAS } from './frame.ts';
import type { PatchPalette } from './frame.ts';

/** A four-pointed sparkle centred at (x, y). */
export function sparkle(x: number, y: number, r: number): string {
  const w = r * 0.22;
  return `M${n(x)} ${n(y - r)}Q${n(x + w)} ${n(y - w)} ${n(x + r)} ${n(y)}Q${n(x + w)} ${n(y + w)} ${n(x)} ${n(y + r)}` +
    `Q${n(x - w)} ${n(y + w)} ${n(x - r)} ${n(y)}Q${n(x - w)} ${n(y - w)} ${n(x)} ${n(y - r)}Z`;
}

/** Flat sky: the inner colour, a scatter of small dots and a few sparkles. */
export function skyLayer(sky: { seed: number; stars: number }, palette: PatchPalette): string {
  const rng = mulberry32(sky.seed);
  let dots = '';
  let sparkles = '';
  for (let i = 0; i < sky.stars; i++) {
    const x = 30 + rng() * (CANVAS - 60);
    const y = 30 + rng() * (CANVAS - 80);
    if (i % 5 === 0) sparkles += sparkle(x, y, 4 + rng() * 4);
    else {
      const r = 0.8 + rng() * 1.1;
      dots += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
    }
  }
  return (
    `<rect width="${CANVAS}" height="${CANVAS}" fill="${palette.inner}"/>` +
    `<path d="${dots}" fill="${palette.thread}" fill-opacity="0.55"/><path d="${sparkles}" fill="${palette.thread}"/>`
  );
}
