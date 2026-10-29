import { normalizeInput } from '../../core/hash.ts';
import { chance, rngFor, weighted, type Rng } from '../../core/rng.ts';
import type { Arms } from './arms.ts';
import { CHARGES, type ChargeId, type Charges } from './charges.ts';
import { LINED_PARTITIONS, type Field, type Partition } from './fields.ts';
import type { LineStyle } from './lines.ts';
import { LINED_ORDINARIES, type Ordinary, type OrdinaryKind } from './ordinaries.ts';
import { PLACEMENTS, round2 } from './placements.ts';
import {
  COLORS,
  COUNTERCHANGED,
  FUR_CONTRASTS,
  METALS,
  TINCTURES,
  contrastsWith,
  isFur,
  type Fur,
  type Paint,
  type Tincture,
} from './tinctures.ts';
import { WEIGHTS_V1, WEIGHTS_V2, type HeraldryWeights } from './weights.ts';

export const HERALDRY_VERSION = 2;
export const HERALDRY_VERSIONS: readonly number[] = [1, 2];

const WEIGHTS: Readonly<Record<number, HeraldryWeights>> = { 1: WEIGHTS_V1, 2: WEIGHTS_V2 };

/** Tall charges get a little extra size so they read as tall rather than thin. */
const TALL_BOOST = 1.12;

/**
 * Pure and deterministic: the same input and version always give the same arms.
 * Each slot draws from its own seeded stream, so adding a slot never disturbs the others, and a
 * feature a version doesn't use draws nothing.
 */
export function generateArms(input: string, version: number = HERALDRY_VERSION): Arms {
  const w = WEIGHTS[version];
  if (!w) throw new RangeError(`heraldry v${version} does not exist (have: ${HERALDRY_VERSIONS.join(', ')})`);
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'heraldry', name, key);

  const shield = weighted(slot('shield'), w.shields);
  const field = generateField(slot('field'), w);
  let ordinary = generateOrdinary(slot('ordinary'), w, field);
  let charges = generateCharges(slot('charges'), w, field, ordinary);

  // Counterchanging: what crosses the partition line takes the field's other tincture on each
  // side. Not for an ordinary that carries charges (they need one tincture to contrast with).
  if (w.counterchange > 0 && field.kind === 'partition' && chance(slot('counterchange'), w.counterchange)) {
    if (charges && !charges.on) charges = { ...charges, tincture: COUNTERCHANGED };
    if (ordinary && !charges?.on && !isFur(ordinary.tincture)) ordinary = { ...ordinary, tincture: COUNTERCHANGED };
  }

  return { shield, field, ...(ordinary && { ordinary }), ...(charges && { charges }) };
}

function generateField(rng: Rng, w: HeraldryWeights): Field {
  const kind = weighted(rng, w.fieldKinds);
  if (kind === 'plain') return { kind, tincture: paint(rng, w, TINCTURES, w.furs) };
  // Divided fields always pair a metal with a colour.
  const metal = paint(rng, w, METALS) as Tincture;
  const color = paint(rng, w, COLORS) as Tincture;
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
  // A fur ordinary must contrast with every tincture of the field; a bordure is never furred.
  const fieldTinctures = field.kind === 'plain' ? [field.tincture] : field.tinctures;
  const furs = Object.fromEntries(
    Object.entries(w.ordinaryFurs).filter(
      ([fur]) => kind !== 'bordure' && fieldTinctures.every((t) => !isFur(t) && FUR_CONTRASTS[fur as Fur].includes(t)),
    ),
  );
  return { kind, line, tincture: paint(rng, w, contrasting(field), furs) };
}

function generateCharges(rng: Rng, w: HeraldryWeights, field: Field, ordinary: Ordinary | undefined): Charges | undefined {
  const options = Object.entries(PLACEMENTS[ordinary?.kind ?? 'none'])
    // Patterned fields are too busy for small charges; only the ordinary can carry them.
    .filter(([, pl]) => field.kind !== 'variation' || pl.surface === 'ordinary' || pl.at.length === 0);
  if (options.length === 0) return undefined;
  const placement = Object.fromEntries(options)[weighted(rng, Object.fromEntries(options.map(([id, pl]) => [id, pl.weight])))];
  if (placement.at.length === 0) return undefined;

  const onOrdinary = placement.surface === 'ordinary' && ordinary !== undefined;
  // On the ordinary: contrast with it. On the field: whatever contrasts with the field.
  const tinctureOf = paint(rng, w, onOrdinary ? contrastsWith(ordinary.tincture as Paint) : contrasting(field)) as Tincture;
  // Narrow ordinaries only take compact charges, and not the ones too detailed for that size.
  const pool = (Object.keys(w.charges) as ChargeId[]).filter(
    (id) => !onOrdinary || (hasTag(id, 'compact') && !w.notOnOrdinaries.some((tag) => hasTag(id, tag))),
  );
  const charge = weighted(rng, Object.fromEntries(pool.map((id) => [id, w.charges[id]!])) as Record<ChargeId, number>);
  const boost = hasTag(charge, 'tall') ? TALL_BOOST : 1;

  return {
    charge,
    tincture: tinctureOf,
    at: placement.at.map((pl) => ({ ...pl, size: round2(pl.size * boost) })),
    ...(onOrdinary && { on: true }),
    ...(placement.arrangement && { arrangement: placement.arrangement }),
  };
}

/** Rule of tincture (extended to furs). Divided fields: anything not already on them. */
function contrasting(field: Field): readonly Tincture[] {
  if (field.kind === 'plain') return contrastsWith(field.tincture);
  return TINCTURES.filter((t) => !field.tinctures.includes(t));
}

const hasTag = (id: ChargeId, tag: string): boolean => (CHARGES[id].tags as readonly string[]).includes(tag);

/** Weighted pick among allowed tinctures, plus any furs offered. With no furs, identical to v1. */
function paint(rng: Rng, w: HeraldryWeights, allowed: readonly Tincture[], furs: Readonly<Partial<Record<Fur, number>>> = {}): Paint {
  return weighted(rng, Object.fromEntries([...allowed.map((t) => [t, w.tinctures[t]]), ...Object.entries(furs)]) as Record<Paint, number>);
}
