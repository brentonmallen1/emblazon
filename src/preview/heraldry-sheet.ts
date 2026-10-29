import { chance, pick, rngFor, weighted } from '../core/rng.ts';
import { escapeXml } from '../core/svg.ts';
import {
  COLORS,
  LINE_STYLES,
  LINED_ORDINARIES,
  LINED_PARTITIONS,
  METALS,
  ORDINARIES,
  PARTITIONS,
  SHIELDS,
  TINCTURE_HEX,
  TINCTURES,
  VARIATIONS,
  isMetal,
  renderArms,
  tinctureName,
  type Arms,
  type Field,
  type LineStyle,
  type Ordinary,
  type Tincture,
} from '../themes/heraldry/index.ts';

/** Contact sheet: every procedural option, at a glance and at avatar sizes. */
export function heraldrySheet(): string {
  return page(
    [
      section('Tinctures', row(TINCTURES.map((t) => swatch(t)))),
      section('Shields', row(SHIELDS.map((s) => tile(renderArms({ shield: s, field: { kind: 'plain', tincture: 'azure' } }), label(s))))),
      section('Partitions × lines', partitionMatrix()),
      section('Variations', row(VARIATIONS.map((v, i) => tile(renderArms({ shield: 'heater', field: { kind: 'variation', variation: v, tinctures: PAIRS[i] } }), label(v))))),
      section('Ordinaries × lines', ordinaryMatrix()),
      section('At avatar sizes', sizeRows()),
      section(
        'Sampler',
        `<p class="note">Seeded random mixes of the options above. Preview only: the real generator, rules and charges arrive in Phases 2–3.</p>` +
          row(Array.from({ length: 48 }, (_, i) => tile(renderArms(sampleArms(i), { size: 72 }), `#${i}`))),
      ),
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
  return matrix(cells);
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
  return matrix(cells);
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

const LINE_WEIGHTS: Readonly<Record<LineStyle, number>> = {
  straight: 5,
  wavy: 1,
  indented: 1,
  dancetty: 1,
  embattled: 1,
  engrailed: 1,
  invected: 1,
};

function sampleArms(i: number): Arms {
  const r = rngFor('sheet', 'sampler', i);
  const metal = pick(r, METALS);
  const color = pick(r, COLORS);
  const pair: readonly [Tincture, Tincture] = chance(r, 0.5) ? [metal, color] : [color, metal];
  const kind = weighted(r, { plain: 3, partition: 4, variation: 1 });

  let field: Field;
  if (kind === 'plain') field = { kind, tincture: pair[0] };
  else if (kind === 'partition') {
    const partition = pick(r, PARTITIONS);
    field = { kind, partition, line: LINED_PARTITIONS.includes(partition) ? weighted(r, LINE_WEIGHTS) : 'straight', tinctures: pair };
  } else field = { kind, variation: pick(r, VARIATIONS), tinctures: pair };

  let ordinary: Ordinary | undefined;
  if (field.kind !== 'variation' && chance(r, 0.75)) {
    const ordKind = pick(r, ORDINARIES);
    // Plain field: opposite class. Divided field: anything not already on the field.
    const tincture =
      field.kind === 'plain'
        ? isMetal(field.tincture) ? pick(r, COLORS) : pick(r, METALS)
        : pick(r, TINCTURES.filter((t) => !pair.includes(t)));
    ordinary = { kind: ordKind, line: LINED_ORDINARIES.includes(ordKind) ? weighted(r, LINE_WEIGHTS) : 'straight', tincture };
  }

  return { shield: pick(r, SHIELDS), field, ...(ordinary && { ordinary }) };
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

function matrix(rows: string[]): string {
  const head = ['<div></div>', ...LINE_STYLES.map((l) => `<div class="head">${l}</div>`)].join('');
  return `<div class="scroll"><div class="matrix" style="--cols:${LINE_STYLES.length}">${head}${rows.join('')}</div></div>`;
}

function page(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>emblazon · heraldry sheet</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f5f1; --fg: #1d1c21; --muted: #6b6a70; --line: #dedcd5; }
  @media (prefers-color-scheme: dark) { :root { --bg: #16161a; --fg: #ecebe6; --muted: #9a99a0; --line: #2c2c33; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 96px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: -0.01em; }
  .sub, .note { color: var(--muted); margin: 4px 0 0; }
  .note { margin: 0 0 12px; font-size: 13px; }
  section { margin-top: 40px; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 8px; margin: 0 0 16px; }
  .row { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  figure > svg:not([width]) { width: 112px; height: 112px; }
  svg { display: block; }
  figcaption { font-size: 11px; color: var(--muted); text-align: center; }
  .swatch { width: 56px; height: 56px; border-radius: 8px; border: 1px solid var(--line); }
  .scroll { overflow-x: auto; }
  .matrix { display: grid; grid-template-columns: 116px repeat(var(--cols), 88px); gap: 6px 10px; align-items: center; width: max-content; }
  .head { font-size: 11px; color: var(--muted); text-align: center; }
  .rowlabel { font-size: 12px; }
  .sizes { display: flex; align-items: flex-end; gap: 18px; margin-bottom: 16px; flex-wrap: wrap; }
</style>
</head>
<body>
<main>
<h1>emblazon · heraldry</h1>
<p class="sub">Phase 1 contact sheet: shields, partitions, variations, ordinaries and line styles.</p>
${body}
</main>
</body>
</html>
`;
}
