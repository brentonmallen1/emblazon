import { normalizeInput } from '../../core/hash.ts';
import { chance, rngFor, weighted, type Rng } from '../../core/rng.ts';
import type { Arms } from './arms.ts';
import { CHARGE_IDS, CHARGES, type ChargeId, type Charges } from './charges.ts';
import { LINED_PARTITIONS, type Field, type Partition } from './fields.ts';
import type { LineStyle } from './lines.ts';
import { LINED_ORDINARIES, type Ordinary, type OrdinaryKind } from './ordinaries.ts';
import { PLACEMENTS, round2 } from './placements.ts';
import { COLORS, METALS, TINCTURES, isMetal, type Tincture } from './tinctures.ts';
import { WEIGHTS_V1, type HeraldryWeights } from './weights.ts';

export const HERALDRY_VERSION = 1;
export const HERALDRY_VERSIONS: readonly number[] = [1];

const WEIGHTS: Readonly<Record<number, HeraldryWeights>> = { 1: WEIGHTS_V1 };

/** Tall charges get a little extra size so they read as tall rather than thin. */
const TALL_BOOST = 1.12;

/**
 * Pure and deterministic: the same input and version always give the same arms.
 * Each slot draws from its own seeded stream, so adding a slot never disturbs the others.
 */
export function generateArms(input: string, version: number = HERALDRY_VERSION): Arms {
  const w = WEIGHTS[version];
  if (!w) throw new RangeError(`heraldry v${version} does not exist (have: ${HERALDRY_VERSIONS.join(', ')})`);
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'heraldry', name, key);

  const shield = weighted(slot('shield'), w.shields);
  const field = generateField(slot('field'), w);
  const ordinary = generateOrdinary(slot('ordinary'), w, field);
  const charges = generateCharges(slot('charges'), w, field, ordinary);
  return { shield, field, ...(ordinary && { ordinary }), ...(charges && { charges }) };
}

function generateField(rng: Rng, w: HeraldryWeights): Field {
  const kind = weighted(rng, w.fieldKinds);
  if (kind === 'plain') return { kind, tincture: tincture(rng, w, TINCTURES) };
  // Divided fields always pair a metal with a colour.
  const metal = tincture(rng, w, METALS);
  const color = tincture(rng, w, COLORS);
  const tinctures: readonly [Tincture, Tincture] = chance(rng, 0.5) ? [metal, color] : [color, metal];
  if (kind === 'partition') {
    const partition = weighted(rng, w.partitions);
    return { kind, partition, line: LINED_PARTITIONS.includes(partition) ? weighted(rng, w.lines) : 'straight', tinctures };
  }
  return { kind, variation: weighted(rng, w.variations), tinctures };
}

/** Ordinaries that would sit exactly on a partition's dividing line and hide it. */
const HIDES: Readonly<Partial<Record<Partition, OrdinaryKind>>> = {
  perPale: 'pale',
  perFess: 'fess',
  perBend: 'bend',
  perBendSinister: 'bendSinister',
  perChevron: 'chevron',
  perSaltire: 'saltire',
  quarterly: 'cross',
};

function generateOrdinary(rng: Rng, w: HeraldryWeights, field: Field): Ordinary | undefined {
  if (!chance(rng, w.ordinaryChance[field.kind])) return undefined;
  const hidden = field.kind === 'partition' ? HIDES[field.partition] : undefined;
  const table = Object.fromEntries(
    Object.entries(field.kind === 'variation' ? w.ordinariesOnPatterns : w.ordinaries).filter(([k]) => k !== hidden),
  ) as Partial<Record<OrdinaryKind, number>>;
  const kind = weighted(rng, table as Record<OrdinaryKind, number>);
  // At most one fancy line per shield: two compete and neither reads at avatar size.
  const fieldIsLined = field.kind === 'partition' && field.line !== 'straight';
  const line: LineStyle = LINED_ORDINARIES.includes(kind) && !fieldIsLined ? weighted(rng, w.lines) : 'straight';
  return { kind, line, tincture: tincture(rng, w, contrasting(field)) };
}

function generateCharges(rng: Rng, w: HeraldryWeights, field: Field, ordinary: Ordinary | undefined): Charges | undefined {
  const options = Object.entries(PLACEMENTS[ordinary?.kind ?? 'none'])
    // Patterned fields are too busy for small charges; only the ordinary can carry them.
    .filter(([, pl]) => field.kind !== 'variation' || pl.surface === 'ordinary' || pl.at.length === 0);
  if (options.length === 0) return undefined;
  const placement = Object.fromEntries(options)[weighted(rng, Object.fromEntries(options.map(([id, pl]) => [id, pl.weight])))];
  if (placement.at.length === 0) return undefined;

  const onOrdinary = placement.surface === 'ordinary' && ordinary !== undefined;
  // On the ordinary: opposite class to it. On the field: whatever contrasts with the field.
  const tinctureOf = onOrdinary ? tincture(rng, w, opposite(ordinary.tincture)) : tincture(rng, w, contrasting(field));
  // Narrow ordinaries only take compact charges.
  const pool = onOrdinary ? CHARGE_IDS.filter((id) => CHARGES[id].tags.includes('compact')) : CHARGE_IDS;
  const charge = weighted(rng, Object.fromEntries(pool.map((id) => [id, CHARGES[id].weight])) as Record<ChargeId, number>);
  const boost = (CHARGES[charge].tags as readonly string[]).includes('tall') ? TALL_BOOST : 1;

  return {
    charge,
    tincture: tinctureOf,
    at: placement.at.map((pl) => ({ ...pl, size: round2(pl.size * boost) })),
    ...(onOrdinary && { on: true }),
    ...(placement.arrangement && { arrangement: placement.arrangement }),
  };
}

/** Rule of tincture: metal on colour, colour on metal. Divided fields: anything not already on them. */
function contrasting(field: Field): readonly Tincture[] {
  if (field.kind === 'plain') return opposite(field.tincture);
  return TINCTURES.filter((t) => !field.tinctures.includes(t));
}

const opposite = (t: Tincture): readonly Tincture[] => (isMetal(t) ? COLORS : METALS);

function tincture(rng: Rng, w: HeraldryWeights, allowed: readonly Tincture[]): Tincture {
  return weighted(rng, Object.fromEntries(allowed.map((t) => [t, w.tinctures[t]])) as Record<Tincture, number>);
}
