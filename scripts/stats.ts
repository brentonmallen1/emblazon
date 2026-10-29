/**
 * Distinctness report: how often do two inputs produce emblems that look alike?
 * "Salient" = what you notice at avatar size: field type and tinctures, the ordinary and its
 * tincture, the charge and its tincture. Shield shape, line style and charge count are ignored,
 * so this errs toward calling two emblems lookalikes.
 * Usage: npm run stats [-- count [version]]
 */
import { HERALDRY_VERSION, generateArms, type Arms } from '../src/themes/heraldry/index.ts';

const N = Number(process.argv[2] ?? 10_000);
const VERSION = Number(process.argv[3] ?? HERALDRY_VERSION);

function salientKey({ field, ordinary, charges }: Arms): string {
  const f =
    field.kind === 'plain'
      ? `plain:${field.tincture}`
      : `${field.kind === 'partition' ? field.partition : field.variation}:${field.tinctures.join('/')}`;
  return [f, ordinary ? `${ordinary.kind}:${ordinary.tincture}` : '-', charges ? `${charges.charge}:${charges.tincture}` : '-'].join(' | ');
}

const tally = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
const salient = new Map<string, number>();
const full = new Map<string, number>();
const breakdown = { field: new Map<string, number>(), ordinary: new Map<string, number>(), charges: new Map<string, number>() };

for (let i = 0; i < N; i++) {
  const arms = generateArms(`user${i}@example.com`, VERSION);
  tally(salient, salientKey(arms));
  tally(full, JSON.stringify(arms));
  tally(breakdown.field, arms.field.kind);
  tally(breakdown.ordinary, arms.ordinary?.kind ?? '(none)');
  tally(breakdown.charges, arms.charges ? `${arms.charges.at.length} ${arms.charges.on ? 'on ordinary' : 'on field'}` : '(none)');
}

// Probability that two different random inputs share a salient key.
let pairs = 0;
let shared = 0;
for (const c of salient.values()) {
  pairs += (c * (c - 1)) / 2;
  if (c > 1) shared += c;
}
const pairProbability = pairs / ((N * (N - 1)) / 2);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const top = (map: Map<string, number>, k = 12) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([key, c]) => `  ${pct(c / N).padStart(6)}  ${key}`).join('\n');

console.log(`heraldry v${VERSION} · ${N.toLocaleString()} inputs

distinct emblems (full config)    ${full.size.toLocaleString()}  (${pct(full.size / N)})
distinct salient looks            ${salient.size.toLocaleString()}
lookalike chance for one pair     1 in ${Math.round(1 / pairProbability).toLocaleString()}   (target: better than 1 in 10,000)
inputs with a lookalike in set    ${pct(shared / N)}
lookalike pairs in set            ${pairs.toLocaleString()}

field kind
${top(breakdown.field)}

ordinary
${top(breakdown.ordinary)}

charges
${top(breakdown.charges)}

most common salient looks
${top(salient, 8)}`);
