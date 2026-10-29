import { escapeXml } from '../core/svg.ts';
import {
  CHARGE_IDS,
  CHARGES,
  FURS,
  HERALDRY_VERSION,
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
import { emblazonOptions } from '../index.ts';
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
      section('Furs (v2)', furRow()),
      section('Counterchanging (v2)', counterchangeRow()),
      section('Charges', row(CHARGE_IDS.map((c) => tile(renderCharge(c, 'or'), CHARGES[c].name + (CHARGES[c].credit ? ' ·' : ''))))),
      section('Charges × tinctures and sizes', chargeMatrix()),
      section('At avatar sizes', sizeRows()),
      section('On jb-rpg backgrounds', backdropRows()),
      section('Generated', generatedGrid(200)),
    ].join(''),
  );
}

/** jb-rpg's theme screens: background and accent, from its design canvas and theme styles. */
const JB_RPG_THEMES: readonly [name: string, background: string, accent: string][] = [
  ['fantasy', '#1b120a', '#d9a557'],
  ['horror', '#0c0b0b', '#e0574b'],
  ['cyberpunk', '#0a090b', '#f2e64a'],
  ['deep space', '#0b0a1a', '#9d4edd'],
  ['insanity', '#0f0c14', '#a9dc7e'],
  ['modern', '#1a1a2e', '#667eea'],
];

/** The same picks with no rim, the default rim, and the theme's accent as rim. */
function backdropRows(): string {
  const picks = emblazonOptions('sheet:backdrops', { count: 3 });
  const rows = JB_RPG_THEMES.map(([name, background, accent]) => {
    const variant = (label: string, opts: object) =>
      `<div class="bd-group"><span>${label}</span>${picks.map((e) => renderArms(e.config, { size: 64, ...opts })).join('')}</div>`;
    return (
      `<div class="bd-row" style="background:${background}"><span class="bd-name" style="color:${accent}">${name}</span>` +
      variant('no rim', {}) +
      variant('rim', { backdrop: 'dark' }) +
      variant('accent rim', { backdrop: 'dark', rim: accent }) +
      `</div>`
    );
  });
  return (
    `<p class="note">Picks from <code>emblazonOptions()</code> on each theme's screen colour. Without a rim, the shield's dark outline and any sable disappear.</p>` +
    `<style>.bd-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px;padding:14px 18px;border-radius:10px;margin-bottom:8px}` +
    `.bd-name{width:84px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.bd-group{display:flex;align-items:center;gap:6px}` +
    `.bd-group span{font-size:10px;color:#9a978e;width:44px}</style>` +
    rows.join('')
  );
}

/** Each fur as a field, then as an ordinary on a field it contrasts with. */
function furRow(): string {
  const asField = FURS.map((fur) => ({ shield: 'heater', field: { kind: 'plain', tincture: fur } }) satisfies Arms);
  const onField: Arms[] = [
    { shield: 'heater', field: { kind: 'plain', tincture: 'gules' }, ordinary: { kind: 'chief', line: 'straight', tincture: 'ermine' } },
    { shield: 'heater', field: { kind: 'plain', tincture: 'azure' }, ordinary: { kind: 'chevron', line: 'straight', tincture: 'erminois' } },
    { shield: 'heater', field: { kind: 'plain', tincture: 'gules' }, ordinary: { kind: 'bend', line: 'wavy', tincture: 'vair' } },
  ];
  return row([...asField, ...onField].map((arms) => tile(renderArms(arms), blazon(arms))));
}

/** Ordinaries and charges that swap tinctures across the partition line. */
function counterchangeRow(): string {
  const cc = 'counterchanged' as const;
  const examples: Arms[] = [
    { shield: 'heater', field: { kind: 'partition', partition: 'perPale', line: 'straight', tinctures: ['or', 'azure'] }, ordinary: { kind: 'chevron', line: 'straight', tincture: cc }, charges: { charge: 'mullet', tincture: cc, at: [{ x: 45, y: 45, size: 44 }, { x: 155, y: 45, size: 44 }, { x: 100, y: 166, size: 42 }] } },
    { shield: 'heater', field: { kind: 'partition', partition: 'perBend', line: 'straight', tinctures: ['argent', 'gules'] }, charges: { charge: 'lionHead', tincture: cc, at: ONE } },
    { shield: 'french', field: { kind: 'partition', partition: 'quarterly', line: 'straight', tinctures: ['sable', 'or'] }, charges: { charge: 'roundel', tincture: cc, at: ONE } },
    { shield: 'heater', field: { kind: 'partition', partition: 'perFess', line: 'wavy', tinctures: ['azure', 'argent'] }, charges: { charge: 'octopus', tincture: cc, at: ONE } },
    { shield: 'spanish', field: { kind: 'partition', partition: 'gyronny', line: 'straight', tinctures: ['vert', 'or'] }, ordinary: { kind: 'bordure', line: 'straight', tincture: cc } },
  ];
  return row(examples.map((arms) => tile(renderArms(arms), blazon(arms))));
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
  return `<p class="note">heraldry v${HERALDRY_VERSION} at 56px. Hover for the blazon; open <a href="/">Try it</a> for any input. Charges marked · are adapted from game-icons.net (CC BY 3.0, see assets/CREDITS.md).</p><div class="grid">${tiles.join('')}</div>`;
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
