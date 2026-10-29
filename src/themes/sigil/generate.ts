import { normalizeInput } from '../../core/hash.ts';
import { chance, int, pick, rngFor, weighted, type Rng } from '../../core/rng.ts';
import {
  CREATURES,
  CROSS_MARKS,
  RIBBONS,
  STAVE_MARKS,
  type Figure,
  type Ink,
  type RuneMark,
  type SealSigil,
  type Sigil,
  type SigilStyle,
  type Stave,
  type ThornRing,
  type ThornSigil,
  type Wax,
  type WaxRim,
  type WaxSigil,
} from './types.ts';

export const SIGIL_VERSION = 1;
export const SIGIL_VERSIONS: readonly number[] = [1];

/** Pick weights for sigil v1. Frozen once released, like heraldry's. Key order matters. */
const W1 = {
  styles: { seal: 4, wax: 3, thorn: 3 } satisfies Record<SigilStyle, number>,
  // Horror leans red; bone, ash, rust, violet and bile for variety.
  inks: { blood: 3, crimson: 2, bone: 1.5, ash: 1, rust: 1, violet: 1, bile: 0.8 } satisfies Record<Ink, number>,
  seal: {
    rings: { 1: 2, 2: 4, 3: 2 },
    ticks: { 0: 1, 4: 2, 8: 3, 12: 1 },
    tickStyles: { cross: 3, out: 1, in: 1 },
    figures: { triangle: 4, invertedTriangle: 2, square: 1, diamond: 1, pentagram: 2, hexagram: 2, heptagram: 1, twinTriangles: 1, crossed: 1, none: 1 } satisfies Record<Figure, number>,
    centers: { eye: 3, radiantEye: 1, closedEye: 1.5, crescent: 1.5, keyhole: 1.5, creature: 4 },
  },
  wax: {
    waxes: { red: 2, black: 1.5, bone: 1.5, plum: 1.5, moss: 1.2, ochre: 1.2, oxblood: 1.5 } satisfies Record<Wax, number>,
    rims: { ring: 1, double: 1, beaded: 1, runes: 1, stars: 1, thorny: 1 } satisfies Record<WaxRim, number>,
    centers: { eye: 1.5, dagger: 1.2, skull: 1.5, moon: 1.2, keyhole: 1, candle: 1, coffin: 1, hourglass: 1, crossbones: 1, rose: 1, creature: 4 },
    ribbonChance: 0.45,
    drips: { 0: 2, 1: 2, 2: 2, 3: 1 },
  },
  thorn: {
    rings: { thorns: 3, briar: 2, nails: 2 } satisfies Record<ThornRing, number>,
    staves: { single: 6, crossed: 1.5, forked: 2 } satisfies Record<Stave, number>,
    marks: { armsUp: 3, armsDown: 2, bar: 3, diamond: 1.5, flag: 2, chevron: 2, hook: 1.5, ring: 1 },
    drips: { 0: 2, 1: 1, 2: 1, 3: 2 },
  },
};

/** Height slots for marks on a single stave: no two adjacent, so marks never collide. */
const SLOT_SETS = { '0,2': 1, '0,3': 1, '0,4': 1, '1,3': 1, '1,4': 1, '2,4': 1, '0,2,4': 3 };

/** Pure and deterministic, one seeded stream per slot (see heraldry's generateArms). */
export function generateSigil(input: string, version: number = SIGIL_VERSION): Sigil {
  if (!SIGIL_VERSIONS.includes(version)) throw new RangeError(`sigil v${version} does not exist (have: ${SIGIL_VERSIONS.join(', ')})`);
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'sigil', name, key);
  switch (weighted(slot('style'), W1.styles)) {
    case 'seal':
      return makeSeal(slot);
    case 'wax':
      return makeWax(slot);
    case 'thorn':
      return makeThorn(slot);
  }
}

type Slot = (name: string) => Rng;

function makeSeal(slot: Slot): SealSigil {
  const w = W1.seal;
  const rRng = slot('rings');
  const rings = Number(weighted(rRng, w.rings)) as 1 | 2 | 3;
  const dashed = chance(rRng, 0.3);
  const tRng = slot('ticks');
  const ticks = { count: Number(weighted(tRng, w.ticks)) as 0 | 4 | 8 | 12, offset: chance(tRng, 0.4), style: weighted(tRng, w.tickStyles) };
  const figure = weighted(slot('figure'), w.figures);
  const cRng = slot('center');
  const kind = weighted(cRng, w.centers);
  const center = kind === 'creature' ? pick(cRng, CREATURES) : kind;
  // Runes sit in the band between the rings, so not where ticks cross it.
  const uRng = slot('runes');
  const room = rings >= 2 && (ticks.count === 0 || ticks.style !== 'cross');
  const runes = room && chance(uRng, 0.6) ? { seed: int(uRng, 0, 0x7fffffff), count: int(uRng, 14, 22) } : undefined;
  return { style: 'seal', ink: weighted(slot('ink'), W1.inks), rings, dashed, ticks, figure, center, ...(runes && { runes }) };
}

function makeWax(slot: Slot): WaxSigil {
  const w = W1.wax;
  const wax = weighted(slot('wax'), w.waxes);
  const sRng = slot('shape');
  const lobes = Array.from({ length: int(sRng, 10, 14) }, () => int(sRng, 86, 95));
  const cRng = slot('center');
  const kind = weighted(cRng, w.centers);
  const center = kind === 'creature' ? pick(cRng, CREATURES.filter((c) => c !== 'centipede')) : kind;
  const gilt = wax !== 'ochre' && wax !== 'bone' && chance(cRng, 0.25);

  const dRng = slot('drips');
  const ribbon = chance(dRng, w.ribbonChance) ? pick(dRng, RIBBONS.filter((r) => !(r === 'black' && wax === 'black') && !(r === 'bone' && wax === 'bone') && !(r === 'red' && (wax === 'red' || wax === 'oxblood')))) : undefined;
  // Drips hang from distinct spots along the bottom edge; a ribbon hides them, so none then.
  const spots = [62, 76, 90, 104, 118];
  const drips: { at: number; length: number }[] = [];
  for (let i = 0, count = ribbon ? 0 : Number(weighted(dRng, w.drips)); i < count; i++) {
    const at = spots.splice(int(dRng, 0, spots.length - 1), 1)[0] + int(dRng, -4, 4);
    drips.push({ at, length: int(dRng, 6, 22) });
  }
  drips.sort((a, b) => a.at - b.at);

  return { style: 'wax', wax, lobes, rim: weighted(slot('rim'), w.rims), center, gilt, drips, ...(ribbon && { ribbon }) };
}

function makeThorn(slot: Slot): ThornSigil {
  const w = W1.thorn;
  const rRng = slot('rune');
  const stave = weighted(rRng, w.staves);
  const mark = (s: number): RuneMark => {
    const kind = weighted(rRng, w.marks);
    return { kind, slot: s, flip: (kind === 'flag' || kind === 'hook') && chance(rRng, 0.5) };
  };
  let marks: RuneMark[];
  let tine = false;
  switch (stave) {
    case 'single':
      marks = weighted(rRng, SLOT_SETS).split(',').map((s) => mark(Number(s)));
      break;
    case 'forked':
      // The fork fills the top; one mark on the stem below it.
      tine = chance(rRng, 0.4);
      marks = [mark(int(rRng, 3, 4))];
      break;
    case 'crossed': {
      const pool = [...CROSS_MARKS];
      marks = Array.from({ length: int(rRng, 1, 2) }, () => {
        const kind = pool.splice(int(rRng, 0, pool.length - 1), 1)[0];
        return { kind, slot: 2, flip: kind === 'flag' && chance(rRng, 0.5) };
      });
      marks.sort((a, b) => CROSS_MARKS.indexOf(a.kind as never) - CROSS_MARKS.indexOf(b.kind as never));
      break;
    }
  }
  const fRng = slot('frame');
  return {
    style: 'thorn',
    ink: weighted(slot('ink'), W1.inks),
    ring: weighted(fRng, w.rings),
    stave,
    marks,
    tine,
    drips: Number(weighted(fRng, w.drips)) as 0 | 1 | 2 | 3,
  };
}

/** Every mark kind a stave can carry, for tests and docs. */
export const MARKS_FOR: Readonly<Record<Stave, readonly string[]>> = { single: STAVE_MARKS, forked: STAVE_MARKS, crossed: CROSS_MARKS };
