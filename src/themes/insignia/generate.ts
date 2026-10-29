import { normalizeInput } from '../../core/hash.ts';
import { chance, int, pick, rngFor, weighted, type Rng } from '../../core/rng.ts';
import { INSIGNIA_PALETTES, type HazardShape, type Insignia, type InsigniaStyle, type NeonShape, type StampShape } from './types.ts';

export const INSIGNIA_VERSION = 1;
export const INSIGNIA_VERSIONS: readonly number[] = [1];

/** Pick weights for insignia v1. Frozen once released. Key order matters. */
const W1 = {
  styles: { hazard: 4, neon: 3, stamp: 3 } satisfies Record<InsigniaStyle, number>,
  hazardShapes: { clipped: 3, notched: 2, tab: 2, hex: 1, bevel: 2 } satisfies Record<HazardShape, number>,
  joins: { slash: 3, none: 2, dot: 1 },
  hazardFooters: { serial: 3, stripes: 1 },
  lights: { square: 3, circle: 1, none: 1 },
  neonShapes: { notched: 3, clipped: 2, hex: 1, bevel: 2 } satisfies Record<NeonShape, number>,
  bracketChance: 0.6,
  stampShapes: { corner: 3, double: 2, notch: 2 } satisfies Record<StampShape, number>,
  stampFooters: { stripes: 3, ticks: 2 },
  digitChance: 0.35,
};

/** No I, O or Q: they read as 1, 0 and O at avatar size. */
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const DIGITS = '02345679';
/** Pairs and numbers with unfortunate readings, never drawn. */
const BLOCKED_PAIRS = new Set(['SS', 'SA', 'KK', 'HH', 'FU']);
const BLOCKED_NUMBERS = new Set([14, 18, 88]);

const letter = (rng: Rng): string => LETTERS[int(rng, 0, LETTERS.length - 1)];

function letterPair(rng: Rng, digitChance: number): [string, string] {
  for (;;) {
    const pair: [string, string] = [letter(rng), chance(rng, digitChance) ? DIGITS[int(rng, 0, DIGITS.length - 1)] : letter(rng)];
    if (!BLOCKED_PAIRS.has(pair.join(''))) return pair;
  }
}

function serialNumber(rng: Rng): string {
  const [a, b] = letterPair(rng, 0);
  let num = int(rng, 1, 99);
  while (BLOCKED_NUMBERS.has(num)) num = int(rng, 1, 99);
  return `${a}${b}-${String(num).padStart(2, '0')}`;
}

/** Pure and deterministic, one seeded stream per slot (see heraldry's generateArms). */
export function generateInsignia(input: string, version: number = INSIGNIA_VERSION): Insignia {
  if (!INSIGNIA_VERSIONS.includes(version)) throw new RangeError(`insignia v${version} does not exist (have: ${INSIGNIA_VERSIONS.join(', ')})`);
  const w = W1;
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'insignia', name, key);

  const style = weighted(slot('style'), w.styles);
  const palette = pick(slot('palette'), INSIGNIA_PALETTES);
  const mark = letterPair(slot('mark'), w.digitChance);
  const serial = serialNumber(slot('serial'));
  const bRng = slot('barcode');
  const barcode = Array.from({ length: 24 }, () => pick(bRng, [2, 2, 3, 4, 5]));
  const base = { palette, mark, serial, barcode };

  const sRng = slot('shape');
  const dRng = slot('details');
  switch (style) {
    case 'hazard':
      return {
        style,
        shape: weighted(sRng, w.hazardShapes),
        join: weighted(dRng, w.joins),
        footer: weighted(dRng, w.hazardFooters),
        light: weighted(dRng, w.lights),
        ...base,
      };
    case 'neon': {
      let bits = 0;
      // Between 4 and 9 lit, so the block always reads as data.
      while (popcount(bits) < 4 || popcount(bits) > 9) bits = int(dRng, 0, 0xfff);
      return { style, shape: weighted(sRng, w.neonShapes), brackets: chance(dRng, w.bracketChance), bits, ...base };
    }
    case 'stamp':
      return { style, shape: weighted(sRng, w.stampShapes), footer: weighted(dRng, w.stampFooters), ...base };
  }
}

function popcount(x: number): number {
  let c = 0;
  for (; x; x &= x - 1) c++;
  return c;
}
