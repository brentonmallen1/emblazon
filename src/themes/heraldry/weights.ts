import type { ChargeId } from './charges.ts';
import type { Field, Partition, Variation } from './fields.ts';
import type { LineStyle } from './lines.ts';
import type { OrdinaryKind } from './ordinaries.ts';
import type { ShieldShape } from './shields.ts';
import type { Fur, Tincture } from './tinctures.ts';

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
  /** The charge pool for this version. New charges join a new version, never an old pool. */
  charges: Readonly<Partial<Record<ChargeId, number>>>;
  /** Charges with any of these tags never go *on* an ordinary (too detailed at that size). */
  notOnOrdinaries: readonly string[];
  /** Furs a plain field can take, alongside the tinctures. */
  furs: Readonly<Partial<Record<Fur, number>>>;
  /** Furs an ordinary can take, when they contrast with the field. Never a bordure. */
  ordinaryFurs: Readonly<Partial<Record<Fur, number>>>;
  /** Probability that what sits across a partitioned field is counterchanged. */
  counterchange: number;
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
  charges: {
    anchor: 1, annulet: 2, bell: 1, crescent: 3, crossCrosslet: 2, crossPatee: 2, crown: 2,
    escallop: 2, estoile: 2, fleurDeLis: 3, heart: 1, key: 1, lozenge: 1, mascle: 1, mullet: 3,
    mullet6: 1, roundel: 2, sun: 1, sword: 2, tower: 2,
  },
  notOnOrdinaries: [],
  furs: {},
  ordinaryFurs: {},
  counterchange: 0,
};

/** v2: game-icons beasts and objects, furs, counterchanging. */
export const WEIGHTS_V2: HeraldryWeights = {
  ...WEIGHTS_V1,
  charges: {
    acorn: 1, ammonite: 1, anchor: 1, annulet: 2, axe: 1, axolotl: 1, bat: 1, bearHead: 1, bee: 2,
    bell: 1, boar: 2, castle: 1, centipede: 1, crab: 1, crescent: 3, crossCrosslet: 2, crossPatee: 2,
    crown: 2, dodo: 1, dolphin: 1, dragonHead: 2, dragonfly: 1, eagle: 3, elephant: 1, escallop: 2,
    estoile: 2, flamingo: 1, fleurDeLis: 3, frog: 1, griffin: 2, hare: 1, heart: 1, hedgehog: 1,
    horseHead: 1, horseshoe: 1, jellyfish: 1, key: 1, lionHead: 3, lozenge: 1, mantis: 1, mascle: 1,
    mullet: 3, mullet6: 1, oak: 1, octopus: 1, owl: 2, ramHead: 1, raven: 2, rose: 2, roundel: 2,
    scarab: 1, scorpion: 1, seaSerpent: 1, seahorse: 1, snail: 1, stagHead: 2, sun: 1, swan: 1,
    sword: 2, tick: 1, tower: 2, turtle: 1, unicornHead: 2, wolfHead: 2, wyvern: 2,
  },
  notOnOrdinaries: ['beast'],
  furs: { ermine: 1.2, ermines: 0.3, erminois: 0.4, pean: 0.3, vair: 0.8 },
  ordinaryFurs: { ermine: 1, erminois: 0.3, vair: 0.6 },
  counterchange: 0.5,
};
