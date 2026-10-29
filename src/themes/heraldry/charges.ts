import { CHARGES as GENERATED } from './charges.generated.ts';
import type { Counterchanged, Tincture } from './tinctures.ts';

export interface ChargeDef {
  name: string;
  plural: string;
  /** Relative pick weight within a theme version. */
  weight: number;
  /** e.g. 'compact' (fits on narrow ordinaries), 'tall', 'geometric'. */
  tags: readonly string[];
  /** Inner SVG markup in a 100×100 box, with no colours of its own. */
  markup: string;
  /** Attribution required by the art's license, for adapted third-party art. */
  credit?: string;
}

export type ChargeId = keyof typeof GENERATED;

/** Every charge by id, typed by its declared shape (so optional fields like `credit` are visible). */
export const CHARGES: Readonly<Record<ChargeId, ChargeDef>> = GENERATED;
export const CHARGE_IDS = Object.keys(CHARGES) as ChargeId[];

/** Centre and size of one charge, in field coordinates. */
export interface ChargePlacement {
  x: number;
  y: number;
  size: number;
}

/** One or more identical charges in one tincture. Placement is resolved by the generator. */
export interface Charges {
  charge: ChargeId;
  tincture: Tincture | Counterchanged;
  at: readonly ChargePlacement[];
  /** True when the charges sit on the ordinary rather than the field. */
  on?: boolean;
  /** Blazon hint for arrangements the count alone doesn't imply. */
  arrangement?: 'inPale';
}
