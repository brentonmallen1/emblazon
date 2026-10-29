/**
 * Distinctness report: how often do two inputs produce emblems that look alike?
 * "Salient" = what you notice at avatar size: field type and tinctures, the ordinary and its
 * tincture, the charge and its tincture. Shield shape, line style and charge count are ignored,
 * so this errs toward calling two emblems lookalikes.
 * Usage: just stats [count] [theme] [version]   (or: node scripts/stats.ts 10000 patch 1)
 */
import { THEMES, type ThemeName } from '../src/index.ts';

const N = Number(process.argv[2] ?? 10_000);
const THEME = (process.argv[3] || 'heraldry') as ThemeName;
if (!Object.hasOwn(THEMES, THEME)) throw new Error(`unknown theme "${THEME}"; have ${Object.keys(THEMES).join(', ')}`);
const theme = THEMES[THEME] as (typeof THEMES)[ThemeName] & { generate(input: string, v: number): never; lookKey(c: never): string };
const VERSION = Number(process.argv[4] || theme.latest);

const tally = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
const salient = new Map<string, number>();
const full = new Map<string, number>();
const motifs = new Map<string, number>();

for (let i = 0; i < N; i++) {
  const config = theme.generate(`user${i}@example.com`, VERSION);
  tally(salient, theme.lookKey(config));
  tally(full, JSON.stringify(config));
  tally(motifs, theme.motif(config) ?? '(none)');
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

console.log(`${THEME} v${VERSION} · ${N.toLocaleString()} inputs

distinct emblems (full config)    ${full.size.toLocaleString()}  (${pct(full.size / N)})
distinct salient looks            ${salient.size.toLocaleString()}
lookalike chance for one pair     1 in ${Math.round(1 / pairProbability).toLocaleString()}   (target: better than 1 in 10,000)
inputs with a lookalike in set    ${pct(shared / N)}
lookalike pairs in set            ${pairs.toLocaleString()}

most common motifs
${top(motifs, 8)}

most common salient looks
${top(salient, 8)}`);
