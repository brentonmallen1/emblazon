import { CHARGES } from './charges.generated.ts';
import type { Tincture } from './tinctures.ts';

export { CHARGES };

export interface ChargeDef {
  name: string;
  plural: string;
  /** Relative pick weight within a theme version. */
  weight: number;
  /** e.g. 'compact' (fits on narrow ordinaries), 'tall', 'geometric'. */
  tags: readonly string[];
  /** Inner SVG markup in a 100×100 box, with no colours of its own. */
  markup: string;
}

export type ChargeId = keyof typeof CHARGES;
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
  tincture: Tincture;
  at: readonly ChargePlacement[];
  /** True when the charges sit on the ordinary rather than the field. */
  on?: boolean;
  /** Blazon hint for arrangements the count alone doesn't imply. */
  arrangement?: 'inPale';
}
