import type { Field, Partition, Variation } from './fields.ts';
import type { LineStyle } from './lines.ts';
import type { OrdinaryKind } from './ordinaries.ts';
import type { ShieldShape } from './shields.ts';
import type { Tincture } from './tinctures.ts';

/**
 * Pick weights for one version of the heraldry theme. Frozen once released: changing a number
 * here changes existing emblems, so tune by adding a new version instead.
 * Key order is part of the contract too (weighted picks walk keys in order).
 */
export interface HeraldryWeights {
  shields: Readonly<Record<ShieldShape, number>>;
  fieldKinds: Readonly<Record<Field['kind'], number>>;
  partitions: Readonly<Record<Partition, number>>;
  variations: Readonly<Record<Variation, number>>;
  lines: Readonly<Record<LineStyle, number>>;
  tinctures: Readonly<Record<Tincture, number>>;
  /**
   * Probability of an ordinary, by field kind. Patterned fields always get one: they can't take
   * charges directly, and a bare pattern is drawn from too few combinations to stay distinct.
   */
  ordinaryChance: Readonly<Record<Field['kind'], number>>;
  ordinaries: Readonly<Record<OrdinaryKind, number>>;
  /** Patterned fields only take the bold ordinaries that still read on top of them. */
  ordinariesOnPatterns: Readonly<Partial<Record<OrdinaryKind, number>>>;
}

export const WEIGHTS_V1: HeraldryWeights = {
  shields: { heater: 5, french: 2, spanish: 2, swiss: 1, norman: 2 },
  fieldKinds: { plain: 3, partition: 5, variation: 1.5 },
  partitions: { perPale: 3, perFess: 3, perBend: 3, perBendSinister: 2, perChevron: 2, perSaltire: 1, quarterly: 3, gyronny: 1 },
  variations: { paly: 2, barry: 2, bendy: 2, chequy: 2, lozengy: 1 },
  lines: { straight: 8, wavy: 2, indented: 2, dancetty: 1, embattled: 2, engrailed: 2, invected: 1 },
  tinctures: { or: 3, argent: 3, gules: 3, azure: 3, vert: 2, sable: 2, purpure: 1 },
  ordinaryChance: { plain: 0.7, partition: 0.4, variation: 1 },
  ordinaries: { chief: 4, fess: 3, pale: 2, bend: 3, bendSinister: 1, chevron: 3, cross: 2, saltire: 2, pile: 1, bordure: 2 },
  ordinariesOnPatterns: { chief: 3, fess: 2, pale: 2, bend: 2, cross: 1, bordure: 3 },
};
