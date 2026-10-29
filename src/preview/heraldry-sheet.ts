import { escapeXml } from '../core/svg.ts';
import {
  CHARGE_IDS,
  CHARGES,
  LINE_STYLES,
  LINED_ORDINARIES,
  LINED_PARTITIONS,
  ORDINARIES,
  PARTITIONS,
  SHIELDS,
  TINCTURE_HEX,
  TINCTURES,
  VARIATIONS,
  blazon,
  generateArms,
  isMetal,
  renderArms,
  renderCharge,
  tinctureName,
  type Arms,
  type ChargePlacement,
  type Tincture,
} from '../themes/heraldry/index.ts';
import { page } from './layout.ts';

/** Contact sheet: every procedural option, at a glance and at avatar sizes. */
export function heraldrySheet(): string {
  return page(
    'emblazon · heraldry',
    'Contact sheet: every procedural option and charge, then generated emblems at avatar size.',
    [
      section('Tinctures', row(TINCTURES.map((t) => swatch(t)))),
      section('Shields', row(SHIELDS.map((s) => tile(renderArms({ shield: s, field: { kind: 'plain', tincture: 'azure' } }), label(s))))),
      section('Partitions × lines', partitionMatrix()),
      section('Variations', row(VARIATIONS.map((v, i) => tile(renderArms({ shield: 'heater', field: { kind: 'variation', variation: v, tinctures: PAIRS[i] } }), label(v))))),
      section('Ordinaries × lines', ordinaryMatrix()),
      section('Charges', row(CHARGE_IDS.map((c) => tile(renderCharge(c, 'or'), CHARGES[c].name)))),
      section('Charges × tinctures and sizes', chargeMatrix()),
      section('At avatar sizes', sizeRows()),
      section('Generated', generatedGrid(200)),
    ].join(''),
  );
}

/** Metal/colour pairs, rotated through so the sheet isn't one colourway. */
const PAIRS: readonly (readonly [Tincture, Tincture])[] = [
  ['argent', 'azure'],
  ['or', 'gules'],
  ['argent', 'sable'],
  ['or', 'vert'],
  ['argent', 'purpure'],
  ['or', 'azure'],
  ['argent', 'gules'],
  ['or', 'sable'],
];

function partitionMatrix(): string {
  const cells = PARTITIONS.map((partition, i) => {
    const lined = LINED_PARTITIONS.includes(partition);
    return [
      `<div class="rowlabel">${label(partition)}</div>`,
      ...LINE_STYLES.map((line) =>
        lined || line === 'straight'
          ? cell(renderArms({ shield: 'heater', field: { kind: 'partition', partition, line, tinctures: PAIRS[i % PAIRS.length] } }, { size: 88 }))
          : '<div></div>',
      ),
    ].join('');
  });
  return matrix(LINE_STYLES, cells);
}

function ordinaryMatrix(): string {
  const cells = ORDINARIES.map((kind, i) => {
    const [metal, color] = PAIRS[i % PAIRS.length];
    // Alternate colour-on-metal and metal-on-colour.
    const [fieldT, ordT] = i % 2 === 0 ? [color, metal] : [metal, color];
    const lined = LINED_ORDINARIES.includes(kind);
    return [
      `<div class="rowlabel">${label(kind)}</div>`,
      ...LINE_STYLES.map((line) =>
        lined || line === 'straight'
          ? cell(renderArms({ shield: 'heater', field: { kind: 'plain', tincture: fieldT }, ordinary: { kind, line, tincture: ordT } }, { size: 88 }))
          : '<div></div>',
      ),
    ].join('');
  });
  return matrix(LINE_STYLES, cells);
}

/** Three charges in 2-1, the most common arrangement on an otherwise empty field. */
const THREE: readonly ChargePlacement[] = [
  { x: 58, y: 64, size: 66 },
  { x: 142, y: 64, size: 66 },
  { x: 100, y: 148, size: 66 },
];
const ONE: readonly ChargePlacement[] = [{ x: 100, y: 100, size: 120 }];

function chargeMatrix(): string {
  const heads = [...TINCTURES.map(tinctureName), '128px', 'three · 64px', '48px', '32px'];
  const rows = CHARGE_IDS.map((charge, i) => {
    const [metal, color] = PAIRS[i % PAIRS.length];
    const [fieldT, chargeT] = i % 2 === 0 ? [color, metal] : [metal, color];
    const onShield = (at: readonly ChargePlacement[], size: number) =>
      cell(renderArms({ shield: 'heater', field: { kind: 'plain', tincture: fieldT }, charges: { charge, tincture: chargeT, at } }, { size }));
    return [
      `<div class="rowlabel">${CHARGES[charge].name}</div>`,
      ...TINCTURES.map((t) => cell(renderCharge(charge, t, { size: 40 }))),
      onShield(ONE, 128),
      onShield(THREE, 64),
      onShield(ONE, 48),
      onShield(ONE, 32),
    ].join('');
  });
  return matrix(heads, rows);
}

function sizeRows(): string {
  const examples: Arms[] = [
    { shield: 'heater', field: { kind: 'partition', partition: 'perBend', line: 'wavy', tinctures: ['azure', 'or'] }, ordinary: { kind: 'chief', line: 'embattled', tincture: 'argent' } },
    { shield: 'french', field: { kind: 'plain', tincture: 'gules' }, ordinary: { kind: 'cross', line: 'engrailed', tincture: 'or' } },
    { shield: 'spanish', field: { kind: 'variation', variation: 'chequy', tinctures: ['argent', 'sable'] }, ordinary: { kind: 'bordure', line: 'straight', tincture: 'gules' } },
    { shield: 'swiss', field: { kind: 'partition', partition: 'quarterly', line: 'indented', tinctures: ['or', 'vert'] }, ordinary: { kind: 'saltire', line: 'straight', tincture: 'argent' } },
  ];
  const sizes = [32, 48, 64, 96, 128];
  return examples
    .map((arms) => `<div class="sizes">${sizes.map((s) => tile(renderArms(arms, { size: s }), `${s}px`)).join('')}</div>`)
    .join('');
}

/** Real generator output for inputs user0…userN, blazon on hover. */
function generatedGrid(count: number): string {
  const tiles = Array.from({ length: count }, (_, i) => {
    const input = `user${i}`;
    const arms = generateArms(input);
    return `<figure title="${escapeXml(`${input}: ${blazon(arms)}`)}">${renderArms(arms, { size: 56 })}<figcaption>${input}</figcaption></figure>`;
  });
  return `<p class="note">heraldry v1 at 56px. Hover for the blazon; open <a href="/">Try it</a> for any input.</p><div class="grid">${tiles.join('')}</div>`;
}

// --- HTML scaffolding -------------------------------------------------------------------------

/** camelCase id → "per bend sinister". */
const label = (id: string): string => id.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`);

const tile = (svg: string, caption: string): string => `<figure>${svg}<figcaption>${escapeXml(caption)}</figcaption></figure>`;
const cell = (svg: string): string => `<div class="cell">${svg}</div>`;
const row = (items: string[]): string => `<div class="row">${items.join('')}</div>`;
const section = (title: string, body: string): string => `<section><h2>${escapeXml(title)}</h2>${body}</section>`;

function swatch(t: Tincture): string {
  return `<figure><div class="swatch" style="background:${TINCTURE_HEX[t]}"></div><figcaption>${tinctureName(t)} · ${isMetal(t) ? 'metal' : 'colour'}</figcaption></figure>`;
}

function matrix(heads: readonly string[], rows: string[]): string {
  const head = ['<div></div>', ...heads.map((h) => `<div class="head">${escapeXml(h)}</div>`)].join('');
  return `<div class="scroll"><div class="matrix" style="--cols:${heads.length}">${head}${rows.join('')}</div></div>`;
}
