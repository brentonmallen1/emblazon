import { normalizeInput } from '../../core/hash.ts';
import { chance, int, pick, rngFor, weighted, type Rng } from '../../core/rng.ts';
import { LEATHER_CLASH } from './palette.ts';
import { FIELDS, FLESH, GLOWS, LEATHERS, METALS, STONES, type Book, type FieldId, type Idol, type Mark, type Tablet } from './types.ts';

export const MARK_VERSION = 1;
export const MARK_VERSIONS: readonly number[] = [1];

/** Pick weights for mark v1. Frozen once released, like heraldry's. Key order matters. */
const W1 = {
  kinds: { idol: 1, tablet: 1, book: 1 },
  frames: { token: 3, octagon: 3, arch: 2, cartouche: 2 },
  patterns: { plain: 3, rays: 2, rings: 2, stars: 2 },
  idol: {
    heads: { dome: 3, mantle: 2, crowned: 2, horned: 2 },
    eyes: { 1: 1, 2: 3, 3: 2 },
    tentacles: { 4: 1, 5: 2, 6: 2, 7: 1 },
    wings: { spread: 3, raised: 2, bust: 2 },
    plinths: { block: 2, stepped: 2, none: 1 },
  },
  tablet: {
    shapes: { arched: 3, pointed: 2, stepped: 2, broken: 2 },
    carvings: { figure: 3, eye: 2, star: 2, kraken: 2 },
    crowns: { star: 2, eye: 2, moon: 2, none: 1 },
  },
  book: {
    left: { triangle: 1, pentacle: 1, moon: 1, rings: 1 },
    right: { eye: 2, squid: 1, star: 1, pyramid: 1 },
    tentacles: { 2: 1, 3: 2, 4: 1 },
    bindings: { corners: 2, studs: 1, plain: 1 },
    ribbons: { 0: 1, 1: 2, 2: 1 },
  },
};

const seed = (rng: Rng): number => int(rng, 0, 0x7fffffff);

/** Pure and deterministic, one seeded stream per slot (see heraldry's generateArms). */
export function generateMark(input: string, version: number = MARK_VERSION): Mark {
  if (!MARK_VERSIONS.includes(version)) throw new RangeError(`mark v${version} does not exist (have: ${MARK_VERSIONS.join(', ')})`);
  const w = W1;
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'mark', name, key);

  const cRng = slot('colours');
  const metal = pick(cRng, METALS);
  const field = pick(cRng, FIELDS);
  const glow = pick(cRng, GLOWS);

  const kind = weighted(slot('kind'), w.kinds);
  const sRng = slot(kind);
  const subject = kind === 'idol' ? makeIdol(sRng) : kind === 'tablet' ? makeTablet(sRng) : makeBook(sRng, field);

  return {
    frame: weighted(slot('frame'), w.frames),
    pattern: weighted(slot('pattern'), w.patterns),
    metal,
    field,
    glow,
    subject,
    seed: seed(slot('details')),
  };
}

function makeIdol(rng: Rng): Idol {
  const w = W1.idol;
  const wings = weighted(rng, w.wings);
  const idol: Idol = {
    kind: 'idol',
    stone: pick(rng, STONES),
    head: weighted(rng, w.heads),
    eyes: Number(weighted(rng, w.eyes)) as Idol['eyes'],
    tentacles: Number(weighted(rng, w.tentacles)) as Idol['tentacles'],
    curl: chance(rng, 0.4),
    wings,
    plinth: weighted(rng, w.plinths),
  };
  // A bust is cut off by the frame; it stands on nothing.
  if (wings === 'bust') idol.plinth = 'none';
  return idol;
}

function makeTablet(rng: Rng): Tablet {
  const w = W1.tablet;
  const carving = weighted(rng, w.carvings);
  // A star carving needs no second star above it.
  const crowns = carving === 'star' ? { ...w.crowns, star: 0 } : w.crowns;
  return {
    kind: 'tablet',
    stone: pick(rng, STONES),
    shape: weighted(rng, w.shapes),
    carving,
    crown: weighted(rng, crowns),
    runes: chance(rng, 0.5) ? 1 : 2,
  };
}

function makeBook(rng: Rng, field: FieldId): Book {
  const w = W1.book;
  // Skip the one cover colour that would vanish into the field.
  const leathers = LEATHERS.filter((l) => LEATHER_CLASH[l] !== field);
  return {
    kind: 'book',
    leather: pick(rng, leathers),
    flesh: pick(rng, FLESH),
    left: weighted(rng, w.left),
    right: weighted(rng, w.right),
    tentacles: Number(weighted(rng, w.tentacles)) as Book['tentacles'],
    binding: weighted(rng, w.bindings),
    ribbons: Number(weighted(rng, w.ribbons)) as Book['ribbons'],
  };
}
