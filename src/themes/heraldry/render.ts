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
import { COUNTERCHANGED, FLAT_EDGE, FLAT_TINCTURE_HEX, OUTLINE, TINCTURE_HEX, isFur, type Counterchanged, type Paint, type Tincture } from './tinctures.ts';

export type { RenderOptions } from '../../core/render-options.ts';

/** What layers need beyond their own config: the id prefix, the field, and a place to add defs. */
interface Context {
  id: string;
  field?: Field;
  defs: string[];
  /** Tincture colours for the chosen style. */
  hex: Readonly<Record<Tincture, string>>;
  flat: boolean;
}

/** Pure: the same arms and options always produce the same SVG string. */
export function renderArms(
  arms: Arms,
  { size, finish = 'shaded', backdrop = 'light', rim = DEFAULT_RIM, style = 'classic' }: RenderOptions = {},
): string {
  // Ids derive from the content so several emblems can share one HTML document.
  const flat = style === 'flat';
  const id = `em${fnv1a(JSON.stringify(arms))}${flat ? 'f' : ''}`;
  const shield = SHIELD_PATHS[arms.shield];
  const shaded = !flat && finish === 'shaded';
  const ctx: Context = { id, field: arms.field, defs: [], hex: flat ? FLAT_TINCTURE_HEX : TINCTURE_HEX, flat };

  const layers =
    fieldLayer(arms.field, ctx) +
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
    (flat
      ? // A dark hairline under the rim keeps it apart from argent fields.
        `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"/>` +
        `<path d="${shield}" fill="none" stroke="${FLAT_EDGE}" stroke-width="6" stroke-linejoin="round"/>`
      : `<path d="${shield}" fill="none" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"/>`) +
    `</g></svg>`
  );
}

function fieldLayer(field: Field, ctx: Context): string {
  if (field.kind === 'plain') {
    if (!isFur(field.tincture)) return baseFill(ctx.hex[field.tincture]);
    const fur = furLook(field.tincture, ctx.hex);
    return baseFill(fur.ground) + `<path d="${fur.d}" fill="${fur.pattern}"/>`;
  }
  const [first, second] = field.tinctures;
  // The flat style lets the two tinctures meet without a drawn line.
  return baseFill(ctx.hex[first]) + `<path d="${secondRegion(field)}" fill="${ctx.hex[second]}"${ctx.flat ? '' : ` ${stroke(1.5)}`}/>`;
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
  if (tincture !== COUNTERCHANGED && !isFur(tincture)) return `<path d="${d}" fill="${ctx.hex[tincture]}" ${stroke(2)}/>`;
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
  if (!isFur(p)) return shape(ctx.hex[p]);
  if (!clip) throw new Error(`${p} needs a shape to clip its pattern to`);
  const fur = furLook(p, ctx.hex);
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
    { clip: a, color: ctx.hex[second] },
    { clip: b, color: ctx.hex[first] },
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
  const ctx: Context = { id: ref, defs: [], hex: TINCTURE_HEX, flat: false };
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
