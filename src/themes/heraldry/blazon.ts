import type { Arms } from './arms.ts';
import { CHARGES, type Charges } from './charges.ts';
import type { Field, Partition } from './fields.ts';
import type { Ordinary, OrdinaryKind } from './ordinaries.ts';
import { tinctureName, type Tincture } from './tinctures.ts';

const PARTITION_NAMES: Readonly<Record<Partition, string>> = {
  perPale: 'per pale',
  perFess: 'per fess',
  perBend: 'per bend',
  perBendSinister: 'per bend sinister',
  perChevron: 'per chevron',
  perSaltire: 'per saltire',
  quarterly: 'quarterly',
  gyronny: 'gyronny',
};

const ORDINARY_NAMES: Readonly<Record<OrdinaryKind, string>> = {
  chief: 'chief',
  fess: 'fess',
  pale: 'pale',
  bend: 'bend',
  bendSinister: 'bend sinister',
  chevron: 'chevron',
  cross: 'cross',
  saltire: 'saltire',
  pile: 'pile',
  bordure: 'bordure',
};

/** Roundels take their name from their tincture, and the name replaces the tincture. */
const ROUNDELS: Readonly<Record<Tincture, readonly [string, string]>> = {
  or: ['bezant', 'bezants'],
  argent: ['plate', 'plates'],
  gules: ['torteau', 'torteaux'],
  azure: ['hurt', 'hurts'],
  vert: ['pomme', 'pommes'],
  sable: ['pellet', 'pellets'],
  purpure: ['golpe', 'golpes'],
};

const COUNTS = ['', 'a', 'two', 'three', 'four', 'five', 'six'];

/** The arms in heraldic language, e.g. "Azure, a chevron between three mullets Or." */
export function blazon({ field, ordinary, charges }: Arms): string {
  const parts = [describeField(field)];
  if (!ordinary) {
    if (charges) parts.push(describeCharges(charges));
  } else if (!charges) {
    parts.push(describeOrdinary(ordinary));
  } else if (charges.on) {
    parts.push(`on ${describeOrdinary(ordinary)} ${describeCharges(charges)}`);
  } else if (ordinary.kind === 'chief' || ordinary.kind === 'bordure') {
    // The chief and bordure are blazoned after the charges they surround.
    parts.push(describeCharges(charges), describeOrdinary(ordinary));
  } else if (charges.tincture === ordinary.tincture && charges.charge !== 'roundel') {
    // Shared tincture is named once, at the end.
    parts.push(`${describeOrdinary(ordinary, false)} between ${describeCharges(charges, false)} ${tinctureName(charges.tincture)}`);
  } else {
    parts.push(`${describeOrdinary(ordinary)} between ${describeCharges(charges)}`);
  }
  const text = parts.join(', ');
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

function describeField(field: Field): string {
  if (field.kind === 'plain') return tinctureName(field.tincture);
  const [a, b] = field.tinctures.map(tinctureName);
  const name = field.kind === 'partition' ? PARTITION_NAMES[field.partition] + lineSuffix(field.line) : field.variation;
  return `${name} ${a} and ${b}`;
}

function describeOrdinary({ kind, line, tincture }: Ordinary, withTincture = true): string {
  return `a ${ORDINARY_NAMES[kind]}${lineSuffix(line)}${withTincture ? ` ${tinctureName(tincture)}` : ''}`;
}

function describeCharges({ charge, tincture, at, arrangement }: Charges, withTincture = true): string {
  const count = at.length;
  const roundel = charge === 'roundel';
  const [one, many] = roundel ? ROUNDELS[tincture] : [CHARGES[charge].name, CHARGES[charge].plural];
  const noun = count === 1 ? one : many;
  const article = count === 1 ? (/^[aeiou]/i.test(noun) ? 'an' : 'a') : COUNTS[count];
  const where = arrangement === 'inPale' ? ' in pale' : '';
  return `${article} ${noun}${where}${withTincture && !roundel ? ` ${tinctureName(tincture)}` : ''}`;
}

const lineSuffix = (line: string): string => (line === 'straight' ? '' : ` ${line}`);
