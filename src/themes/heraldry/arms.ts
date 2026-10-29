import type { Charges } from './charges.ts';
import type { Field } from './fields.ts';
import type { Ordinary } from './ordinaries.ts';
import type { ShieldShape } from './shields.ts';

/** A complete coat of arms. This is the stable contract between generate() and render(). */
export interface Arms {
  shield: ShieldShape;
  field: Field;
  ordinary?: Ordinary;
  charges?: Charges;
}
