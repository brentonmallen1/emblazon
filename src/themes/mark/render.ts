import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { escapeXml } from '../../core/svg.ts';
import type { ArtContext } from './art.ts';
import { bookArt } from './book.ts';
import { framePaths, frameOver, frameUnder, patternLayer } from './frame.ts';
import { idolArt } from './idol.ts';
import { FIELD_HEX, GLOW_HEX, METAL_HEX } from './palette.ts';
import { tabletArt } from './tablet.ts';
import type { Mark } from './types.ts';

/**
 * Pure: the same mark and options always produce the same SVG string. Marks have one look, flat
 * (after jb-rpg's insanity symbol), so `style` and `finish` don't change them. `animate` makes
 * the glowing parts pulse slowly.
 */
export function renderMark(m: Mark, { size, backdrop = 'light', rim = DEFAULT_RIM, animate = false }: RenderOptions = {}): string {
  const id = `mk${fnv1a(JSON.stringify(m))}`;
  const metal = METAL_HEX[m.metal];
  const field = FIELD_HEX[m.field];
  const frame = framePaths(m.frame);
  const ctx: ArtContext = { id, glow: GLOW_HEX[m.glow], glowAttr: animate ? ` class="${id}-g"` : '', seed: m.seed };

  const s = m.subject;
  const art = s.kind === 'idol' ? idolArt(s, ctx) : s.kind === 'tablet' ? tabletArt(s, ctx) : bookArt(s, ctx);
  const fit = frame.fit * (s.kind === 'book' ? 0.94 : 1);
  const subject = fit === 1 ? art : `<g transform="translate(120 124) scale(${fit}) translate(-120 -124)">${art}</g>`;

  const motion = animate
    ? `<style>@keyframes ${id}-p{0%,100%{opacity:1}50%{opacity:.5}}` +
      `.${id}-g{animation:${id}-p 3.2s ease-in-out infinite}` +
      `@media (prefers-reduced-motion: reduce){.${id}-g{animation:none}}</style>`
    : '';

  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"${dims}>${motion}` +
    `<defs><clipPath id="${id}-in"><path d="${frame.inner}"/></clipPath></defs>` +
    (backdrop === 'dark' ? `<path d="${frame.outer}" fill="none" stroke="${escapeXml(rim)}" stroke-width="6" stroke-linejoin="round"/>` : '') +
    frameUnder(m.frame, metal, field) +
    `<g clip-path="url(#${id}-in)">${patternLayer(m.pattern, field, metal, m.seed)}${subject}</g>` +
    frameOver(m.frame, metal) +
    `</svg>`
  );
}
