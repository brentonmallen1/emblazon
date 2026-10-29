import type { ChargePlacement } from './charges.ts';
import type { OrdinaryKind } from './ordinaries.ts';

/** Where charges go for one arrangement. Part of a theme version's data, like the weights. */
export interface Placement {
  weight: number;
  /** 'ordinary': the charges sit on the ordinary. 'field': alone, or around the ordinary. */
  surface: 'field' | 'ordinary';
  /** Blazon hint for arrangements the count alone doesn't imply. */
  arrangement?: 'inPale';
  /** Empty means "no charges". */
  at: readonly ChargePlacement[];
}

/** Rounded to 2 decimals so stored configs hold clean numbers. */
export const round2 = (x: number): number => Math.round(x * 100) / 100;
const p = (x: number, y: number, size: number): ChargePlacement => ({ x: round2(x), y: round2(y), size: round2(size) });
const field = (weight: number, at: ChargePlacement[], arrangement?: 'inPale'): Placement => ({ weight, surface: 'field', at, ...(arrangement && { arrangement }) });
const on = (weight: number, at: ChargePlacement[]): Placement => ({ weight, surface: 'ordinary', at });
const none = (weight: number): Placement => ({ weight, surface: 'field', at: [] });

// All positions stay inside the narrowest shield (norman) at the sizes given.
const ALONE = {
  one: field(4, [p(100, 100, 112)]),
  three: field(4, [p(58, 64, 66), p(142, 64, 66), p(100, 148, 66)]),
  twoInPale: field(1, [p(100, 58, 64), p(100, 146, 64)], 'inPale'),
  threeInPale: field(1, [p(100, 40, 48), p(100, 100, 48), p(100, 160, 48)], 'inPale'),
};

/** The ALONE arrangements pulled toward the centre, to clear a bordure. */
const insideBordure = Object.fromEntries(
  Object.entries(ALONE).map(([id, pl]) => [
    id,
    { ...pl, at: pl.at.map(({ x, y, size }) => p(100 + (x - 100) * 0.8, 100 + (y - 100) * 0.8, size * 0.8)) },
  ]),
);

/** Arrangements available with each ordinary ('none' = no ordinary). Key order is part of the contract. */
export const PLACEMENTS: Readonly<Record<OrdinaryKind | 'none', Readonly<Record<string, Placement>>>> = {
  none: ALONE,
  chief: {
    onChief: on(3, [p(45, 33, 44), p(100, 33, 44), p(155, 33, 44)]),
    inBase: field(2, [p(100, 138, 88)]),
    none: none(0.6),
  },
  fess: {
    on: on(2, [p(55, 100, 40), p(100, 100, 40), p(145, 100, 40)]),
    between: field(3, [p(58, 44, 46), p(142, 44, 46), p(100, 160, 50)]),
    none: none(0.6),
  },
  pale: {
    on: on(2, [p(100, 40, 40), p(100, 100, 40), p(100, 160, 40)]),
    between: field(2, [p(45, 90, 44), p(155, 90, 44)]),
    none: none(0.6),
  },
  bend: {
    on: on(2, [p(52, 52, 38), p(100, 100, 38), p(148, 148, 38)]),
    between: field(2, [p(150, 50, 52), p(56, 146, 48)]),
    none: none(0.6),
  },
  bendSinister: {
    on: on(2, [p(148, 52, 38), p(100, 100, 38), p(52, 148, 38)]),
    between: field(2, [p(50, 50, 52), p(144, 146, 48)]),
    none: none(0.6),
  },
  chevron: {
    between: field(4, [p(45, 45, 44), p(155, 45, 44), p(100, 166, 42)]),
    on: on(1, [p(60, 120, 30), p(100, 80, 30), p(140, 120, 30)]),
    none: none(0.6),
  },
  cross: {
    on: on(1, [p(100, 100, 40)]),
    between: field(3, [p(50, 50, 48), p(150, 50, 48), p(50, 148, 42), p(150, 148, 42)]),
    none: none(0.6),
  },
  saltire: {
    on: on(1, [p(100, 100, 40)]),
    between: field(3, [p(100, 36, 40), p(36, 100, 40), p(164, 100, 40), p(100, 168, 40)]),
    none: none(0.6),
  },
  pile: {
    on: on(2, [p(100, 48, 44)]),
    between: field(2, [p(40, 150, 46), p(160, 150, 46)]),
    none: none(0.6),
  },
  bordure: { ...insideBordure, none: none(0.6) },
};
