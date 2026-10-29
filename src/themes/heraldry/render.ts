import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { escapeXml, n } from '../../core/svg.ts';
import type { Arms } from './arms.ts';
import { CHARGES, type ChargeId, type Charges } from './charges.ts';
import { partitionPath, variationPath, type Field } from './fields.ts';
import { furLook } from './furs.ts';
import { BLEED, CANVAS, FIELD_H, FIELD_OFFSET, FIELD_W } from './geometry.ts';
import { BORDURE_WIDTH, ordinaryPath, type Ordinary } from './ordinaries.ts';
import { SHIELD_PATHS } from './shields.ts';
import { COUNTERCHANGED, OUTLINE, TINCTURE_HEX, isFur, type Counterchanged, type Paint, type Tincture } from './tinctures.ts';

export type { RenderOptions } from '../../core/render-options.ts';

/** What layers need beyond their own config: the id prefix, the field, and a place to add defs. */
interface Context {
  id: string;
  field?: Field;
  defs: string[];
}

/** Pure: the same arms and options always produce the same SVG string. */
export function renderArms(arms: Arms, { size, finish = 'shaded', backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  // Ids derive from the content so several emblems can share one HTML document.
  const id = `em${fnv1a(JSON.stringify(arms))}`;
  const shield = SHIELD_PATHS[arms.shield];
  const shaded = finish === 'shaded';
  const ctx: Context = { id, field: arms.field, defs: [] };

  const layers =
    fieldLayer(arms.field) +
    (arms.ordinary ? ordinaryLayer(arms.ordinary, shield, ctx) : '') +
    (arms.charges ? chargeLayer(arms.charges, `${id}-ch`, ctx) : '') +
    (shaded ? `<rect width="${FIELD_W}" height="${FIELD_H}" fill="url(#${id}-shade)"/>` : '');

  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dims}>` +
    `<defs><clipPath id="${id}-clip"><path d="${shield}"/></clipPath>` +
    (arms.charges ? chargeDef(arms.charges.charge, `${id}-ch`) : '') +
    ctx.defs.join('') +
    `${shaded ? shadeGradient(`${id}-shade`) : ''}</defs>` +
    `<g transform="translate(${FIELD_OFFSET[0]} ${FIELD_OFFSET[1]})">` +
    `<g clip-path="url(#${id}-clip)">${layers}</g>` +
    (backdrop === 'dark' ? `<path d="${shield}" fill="none" stroke="${escapeXml(rim)}" stroke-width="9" stroke-linejoin="round"/>` : '') +
    `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"/>` +
    `</g></svg>`
  );
}

function fieldLayer(field: Field): string {
  if (field.kind === 'plain') {
    if (!isFur(field.tincture)) return baseFill(TINCTURE_HEX[field.tincture]);
    const fur = furLook(field.tincture);
    return baseFill(fur.ground) + `<path d="${fur.d}" fill="${fur.pattern}"/>`;
  }
  const [first, second] = field.tinctures;
  return baseFill(TINCTURE_HEX[first]) + `<path d="${secondRegion(field)}" fill="${TINCTURE_HEX[second]}" ${stroke(1.5)}/>`;
}

function ordinaryLayer({ kind, line, tincture }: Ordinary, shield: string, ctx: Context): string {
  if (kind === 'bordure') {
    // Stroke the shield outline (clipped, so only the inner half shows); a slightly wider dark
    // stroke underneath leaves a thin outline along the bordure's inner edge.
    const w = BORDURE_WIDTH * 2;
    const band = (color: string) => `<path d="${shield}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
    return `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="${w + 4}"/>` + paint(tincture, band, ctx);
  }
  const d = ordinaryPath(kind, line);
  if (tincture !== COUNTERCHANGED && !isFur(tincture)) return `<path d="${d}" fill="${TINCTURE_HEX[tincture]}" ${stroke(2)}/>`;
  // Patterned paints draw the shape, then its outline on top so the pattern can't cover it.
  return paint(tincture, (color) => `<path d="${d}" fill="${color}"/>`, ctx, d) + `<path d="${d}" fill="none" ${stroke(2)}/>`;
}

/**
 * Draws `shape` in any paint: a flat tincture, a fur (ground plus pattern clipped to `clip`), or
 * counterchanged (each side of the partition line gets the field's other tincture).
 */
function paint(p: Paint | Counterchanged, shape: (color: string) => string, ctx: Context, clip?: string): string {
  if (p === COUNTERCHANGED) {
    const [first, second] = counterchangeClips(ctx);
    return `<g clip-path="url(#${first.clip})">${shape(first.color)}</g><g clip-path="url(#${second.clip})">${shape(second.color)}</g>`;
  }
  if (!isFur(p)) return shape(TINCTURE_HEX[p]);
  if (!clip) throw new Error(`${p} needs a shape to clip its pattern to`);
  const fur = furLook(p);
  const clipId = `${ctx.id}-fur${ctx.defs.length}`;
  ctx.defs.push(`<clipPath id="${clipId}"><path d="${clip}"/></clipPath>`);
  return shape(fur.ground) + `<path d="${fur.d}" fill="${fur.pattern}" clip-path="url(#${clipId})"/>`;
}

/**
 * Clip paths for the field's two regions, each paired with the tincture a counterchanged shape
 * takes there: the first region gets the second tincture and vice versa. Added to defs once.
 */
function counterchangeClips(ctx: Context): [{ clip: string; color: string }, { clip: string; color: string }] {
  const field = ctx.field;
  if (!field || field.kind === 'plain') throw new Error('counterchanged needs a divided field');
  const [first, second] = field.tinctures;
  const a = `${ctx.id}-ccA`;
  const b = `${ctx.id}-ccB`;
  if (!ctx.defs.some((d) => d.includes(`id="${a}"`))) {
    const region = secondRegion(field);
    ctx.defs.push(
      `<clipPath id="${a}"><path clip-rule="evenodd" d="M-500 -500H700V700H-500Z${region}"/></clipPath>` +
        `<clipPath id="${b}"><path d="${region}"/></clipPath>`,
    );
  }
  return [
    { clip: a, color: TINCTURE_HEX[second] },
    { clip: b, color: TINCTURE_HEX[first] },
  ];
}

const secondRegion = (field: Exclude<Field, { kind: 'plain' }>): string =>
  field.kind === 'partition' ? partitionPath(field.partition, field.line) : variationPath(field.variation);

/** Total outline stroke around charges, in field units (half of it shows outside the fill). */
const CHARGE_OUTLINE = 3.5;

/** A charge on its own, for asset previews. */
export function renderCharge(charge: ChargeId, tincture: Tincture, { size }: Pick<RenderOptions, 'size'> = {}): string {
  const ref = `ch${fnv1a(charge)}`;
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const ctx: Context = { id: ref, defs: [] };
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 108"${dims}>` +
    `<defs>${chargeDef(charge, ref)}</defs>${chargeLayer({ charge, tincture, at: [{ x: 50, y: 50, size: 100 }] }, ref, ctx)}</svg>`
  );
}

const chargeDef = (charge: ChargeId, ref: string): string => `<g id="${ref}">${CHARGES[charge].markup}</g>`;

/**
 * Each charge is drawn twice: a dark copy with a wide stroke, then the tincture on top. Only the
 * outer half of the stroke survives, so overlapping pieces get one clean outline and cut-outs
 * get an outline on their inside edge.
 */
function chargeLayer({ tincture, at }: Charges, ref: string, ctx: Context): string {
  const uses = (outline: boolean) =>
    at
      .map(
        ({ x, y, size }) =>
          `<use href="#${ref}" transform="translate(${n(x - size / 2)} ${n(y - size / 2)}) scale(${size / 100})"` +
          (outline ? ` stroke-width="${n((CHARGE_OUTLINE * 100) / size)}"` : '') +
          '/>',
      )
      .join('');
  return (
    `<g fill="${OUTLINE}" stroke="${OUTLINE}" stroke-linejoin="round">${uses(true)}</g>` +
    paint(tincture, (color) => `<g fill="${color}">${uses(false)}</g>`, ctx)
  );
}

const baseFill = (color: string): string =>
  `<rect x="${-BLEED}" y="${-BLEED}" width="${FIELD_W + 2 * BLEED}" height="${FIELD_H + 2 * BLEED}" fill="${color}"/>`;

const stroke = (width: number): string => `stroke="${OUTLINE}" stroke-width="${width}" stroke-linejoin="round"`;

const shadeGradient = (id: string): string =>
  `<radialGradient id="${id}" cx="0.32" cy="0.22" r="0.95">` +
  `<stop offset="0" stop-color="#fff" stop-opacity="0.3"/>` +
  `<stop offset="0.45" stop-color="#fff" stop-opacity="0"/>` +
  `<stop offset="0.7" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0.25"/>` +
  `</radialGradient>`;
