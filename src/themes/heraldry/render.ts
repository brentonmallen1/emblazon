import { fnv1a } from '../../core/hash.ts';
import type { Arms } from './arms.ts';
import { partitionPath, variationPath, type Field } from './fields.ts';
import { BLEED, CANVAS, FIELD_H, FIELD_OFFSET, FIELD_W } from './geometry.ts';
import { BORDURE_WIDTH, ordinaryPath, type Ordinary } from './ordinaries.ts';
import { SHIELD_PATHS } from './shields.ts';
import { OUTLINE, TINCTURE_HEX, type Tincture } from './tinctures.ts';

export interface RenderOptions {
  /** Pixel width/height attributes. Omit for a fluid SVG. */
  size?: number;
  /** 'shaded' adds a soft highlight and vignette over the field. */
  finish?: 'flat' | 'shaded';
}

/** Pure: the same arms and options always produce the same SVG string. */
export function renderArms(arms: Arms, { size, finish = 'shaded' }: RenderOptions = {}): string {
  // Ids derive from the content so several emblems can share one HTML document.
  const id = `em${fnv1a(JSON.stringify(arms))}`;
  const shield = SHIELD_PATHS[arms.shield];
  const shaded = finish === 'shaded';

  const layers =
    fieldLayer(arms.field) +
    (arms.ordinary ? ordinaryLayer(arms.ordinary, shield) : '') +
    (shaded ? `<rect width="${FIELD_W}" height="${FIELD_H}" fill="url(#${id}-shade)"/>` : '');

  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dims}>` +
    `<defs><clipPath id="${id}-clip"><path d="${shield}"/></clipPath>${shaded ? shadeGradient(`${id}-shade`) : ''}</defs>` +
    `<g transform="translate(${FIELD_OFFSET[0]} ${FIELD_OFFSET[1]})">` +
    `<g clip-path="url(#${id}-clip)">${layers}</g>` +
    `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"/>` +
    `</g></svg>`
  );
}

function fieldLayer(field: Field): string {
  if (field.kind === 'plain') return baseFill(field.tincture);
  const [first, second] = field.tinctures;
  const d = field.kind === 'partition' ? partitionPath(field.partition, field.line) : variationPath(field.variation);
  return baseFill(first) + `<path d="${d}" fill="${TINCTURE_HEX[second]}" ${stroke(1.5)}/>`;
}

function ordinaryLayer({ kind, line, tincture }: Ordinary, shield: string): string {
  const fill = TINCTURE_HEX[tincture];
  if (kind === 'bordure') {
    // Stroke the shield outline (clipped, so only the inner half shows); a slightly wider dark
    // stroke underneath leaves a thin outline along the bordure's inner edge.
    const w = BORDURE_WIDTH * 2;
    return (
      `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="${w + 4}"/>` +
      `<path d="${shield}" fill="none" stroke="${fill}" stroke-width="${w}"/>`
    );
  }
  return `<path d="${ordinaryPath(kind, line)}" fill="${fill}" ${stroke(2)}/>`;
}

const baseFill = (t: Tincture): string =>
  `<rect x="${-BLEED}" y="${-BLEED}" width="${FIELD_W + 2 * BLEED}" height="${FIELD_H + 2 * BLEED}" fill="${TINCTURE_HEX[t]}"/>`;

const stroke = (width: number): string => `stroke="${OUTLINE}" stroke-width="${width}" stroke-linejoin="round"`;

const shadeGradient = (id: string): string =>
  `<radialGradient id="${id}" cx="0.32" cy="0.22" r="0.95">` +
  `<stop offset="0" stop-color="#fff" stop-opacity="0.3"/>` +
  `<stop offset="0.45" stop-color="#fff" stop-opacity="0"/>` +
  `<stop offset="0.7" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0.25"/>` +
  `</radialGradient>`;
