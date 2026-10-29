import { mulberry32 } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import { CANVAS } from './frame.ts';
import type { PatchPalette } from './frame.ts';

/** A four-pointed sparkle centred at (x, y). */
export function sparkle(x: number, y: number, r: number): string {
  const w = r * 0.28;
  return `M${n(x)} ${n(y - r)}Q${n(x + w)} ${n(y - w)} ${n(x + r)} ${n(y)}Q${n(x + w)} ${n(y + w)} ${n(x)} ${n(y + r)}` +
    `Q${n(x - w)} ${n(y + w)} ${n(x - r)} ${n(y)}Q${n(x - w)} ${n(y - w)} ${n(x)} ${n(y - r)}Z`;
}

/** Deep-space background: glow gradient, optional nebula clouds, seeded starfield. */
export function skyLayer(sky: { seed: number; stars: number; nebula: boolean }, palette: PatchPalette, id: string): { defs: string; body: string } {
  const rng = mulberry32(sky.seed);
  let defs =
    `<radialGradient id="${id}-sky" cx="0.38" cy="0.32" r="0.8">` +
    `<stop offset="0" stop-color="${palette.glow}"/><stop offset="1" stop-color="${palette.sky}"/></radialGradient>`;
  let body = `<rect width="${CANVAS}" height="${CANVAS}" fill="url(#${id}-sky)"/>`;

  if (sky.nebula) {
    defs +=
      `<radialGradient id="${id}-neb"><stop offset="0" stop-color="${palette.accent}" stop-opacity="0.42"/>` +
      `<stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient>`;
    for (let i = 0; i < 3; i++) {
      const cx = 40 + rng() * 160;
      const cy = 40 + rng() * 120;
      body += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(40 + rng() * 45)}" ry="${n(22 + rng() * 30)}" fill="url(#${id}-neb)" transform="rotate(${n(rng() * 180)} ${n(cx)} ${n(cy)})"/>`;
    }
  }

  // Mostly faint dots, a few bright sparkles: sizes skewed small (cubed uniform).
  let dots = '';
  let sparkles = '';
  for (let i = 0; i < sky.stars; i++) {
    const x = rng() * CANVAS;
    const y = rng() * CANVAS;
    const r = 0.5 + 2.6 * rng() ** 3;
    if (r > 1.9) sparkles += sparkle(x, y, r * 2.2);
    else dots += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
  }
  body += `<path d="${dots}" fill="${palette.thread}" fill-opacity="0.85"/><path d="${sparkles}" fill="${palette.thread}"/>`;
  return { defs, body };
}
