import { star } from '../../core/draw.ts';
import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { textPath, textWidth } from '../../core/stroke-font.ts';
import { escapeXml, n } from '../../core/svg.ts';
import { PALETTES, SHADOW, SHAPE_PATHS, STICKERS, VINYL, iconArt } from './art.ts';
import type { Badge, FlatBadge, StickerBadge } from './types.ts';

/** Initials are heavy, like a display face at 800 weight; tracking keeps them apart. */
const LETTER_WEIGHT = 1 / 4.6;
const LETTER_TRACKING = 0.7;

const icon = (b: Badge, x: number, y: number, size: number, color: string, cut: string): string =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${n(size / 100)})">${iconArt(b.icon, color, cut)}</g>`;

function flatBody(b: FlatBadge, id: string, backdrop: 'light' | 'dark', rim: string): string {
  const pal = PALETTES[b.palette];
  const outline = SHAPE_PATHS[b.shape];
  // With a band or chevron the icon rides higher and the stars sit in the band.
  const low = b.layout === 'band' || b.layout === 'chevron';

  let decor = '';
  switch (b.layout) {
    case 'band':
      decor = `<rect x="0" y="150" width="240" height="34" fill="${pal.accent}"/>`;
      break;
    case 'split':
      decor = `<path d="M240 40V240H40Z" fill="${pal.accent}"/>`;
      break;
    case 'chevron':
      decor = `<path d="M0 150L120 196L240 150V186L120 232L0 186Z" fill="${pal.accent}"/>`;
      break;
  }
  const size = low ? 84 : 104;
  const cy = low ? 98 : 116;

  let stars = '';
  if (b.stars) {
    const y = b.layout === 'band' ? 167 : b.layout === 'chevron' ? 162 : 188;
    const spread = b.stars === 3 ? 22 : 18;
    for (let i = 0; i < b.stars; i++) stars += star(120 + (i - (b.stars - 1) / 2) * spread, y, 7.5, 5, 0.42);
    stars = `<path d="${stars}" fill="${pal.icon}"/>`;
  }

  return (
    `<defs><clipPath id="${id}-c"><path d="${outline}"/></clipPath></defs>` +
    (backdrop === 'dark' ? `<path d="${outline}" fill="none" stroke="${escapeXml(rim)}" stroke-width="6" stroke-linejoin="round"/>` : '') +
    `<path d="${outline}" fill="${pal.base}"/>` +
    (decor ? `<g clip-path="url(#${id}-c)">${decor}</g>` : '') +
    // A thin keyline inside the edge, in the icon colour.
    `<path d="${outline}" fill="none" stroke="${pal.icon}" stroke-opacity="0.55" stroke-width="2.4" transform="translate(120 120) scale(0.92) translate(-120 -120)"/>` +
    icon(b, 120 - size / 2, cy - size / 2, size, pal.icon, pal.base) +
    stars
  );
}

function stickerBody(b: StickerBadge, backdrop: 'light' | 'dark'): string {
  const pal = PALETTES[b.palette];
  const s = STICKERS[b.cut];
  const h = s.letters.height;
  const letters = textPath(b.letters, s.letters.x - textWidth(b.letters, h, LETTER_TRACKING) / 2, s.letters.y - h / 2, h, LETTER_TRACKING);
  const digitHeight = 10;
  const digits = textPath(b.number, s.pill.x + 19 - textWidth(b.number, digitHeight) / 2, s.pill.y + 5, digitHeight);
  const ink = (d: string, width: number, color: string) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return (
    `<g transform="rotate(${b.tilt} 120 120)">` +
    // The drop shadow vanishes on a dark screen; the white vinyl edge is rim enough there.
    (backdrop === 'dark' ? '' : `<path d="${s.outer}" fill="${SHADOW}" fill-opacity="0.6" transform="translate(6 8)"/>`) +
    `<path d="${s.outer}" fill="${VINYL}"/>` +
    `<path d="${s.face}" fill="${pal.base}"/>` +
    icon(b, s.icon.x, s.icon.y, s.icon.size, pal.icon, pal.base) +
    ink(letters, h * LETTER_WEIGHT, pal.icon) +
    `<rect x="${s.pill.x}" y="${s.pill.y}" width="38" height="20" rx="10" fill="${pal.icon}"/>` +
    ink(digits, 2.3, pal.base) +
    `</g>`
  );
}

/**
 * Pure: the same badge and options always produce the same SVG string. Badges have one look,
 * flat (after jb-rpg's modern symbol), so `style` and `finish` don't change them.
 */
export function renderBadge(b: Badge, { size, backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  const id = `bd${fnv1a(JSON.stringify(b))}`;
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const body = b.kind === 'flat' ? flatBody(b, id, backdrop, rim) : stickerBody(b, backdrop);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"${dims}>${body}</svg>`;
}
