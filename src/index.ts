import {
  HERALDRY_VERSION,
  blazon,
  creditsFor,
  generateArms,
  lookKey,
  renderArms,
  type Arms,
  type RenderOptions,
} from './themes/heraldry/index.ts';

export * as heraldry from './themes/heraldry/index.ts';
export { ATTRIBUTION } from './themes/heraldry/index.ts';

export interface EmblazonOptions extends RenderOptions {
  /** Theme version. Pin it if your app needs emblems that never change. */
  version?: number;
}

export interface Emblem {
  theme: 'heraldry';
  version: number;
  /** The string this emblem was generated from. Store it with `version` to get it back. */
  input: string;
  svg: string;
  /** The generated configuration; store it to re-render later without the input. */
  config: Arms;
  /** Human-readable description (for heraldry, the blazon). */
  description: string;
  /** License credits for third-party art in this emblem, if any. */
  credits: string[];
}

/** The emblem for any string: same input, same emblem. */
export function emblazon(input: string, { version = HERALDRY_VERSION, ...render }: EmblazonOptions = {}): Emblem {
  return build(input, generateArms(input, version), version, render);
}

export interface OptionsRequest extends EmblazonOptions {
  /** How many emblems to offer (default 6). */
  count?: number;
}

/**
 * A picker's worth of emblems from one seed, e.g. a game session plus the hero's name. Stable:
 * the same seed always offers the same emblems, in the same order. No two look alike, and the
 * charges differ where the set allows, so the choice feels like a real choice. Re-roll by
 * changing the seed (append a counter). Store the chosen emblem's `input` and `version`.
 */
export function emblazonOptions(seed: string, { count = 6, version = HERALDRY_VERSION, ...render }: OptionsRequest = {}): Emblem[] {
  const picked: Emblem[] = [];
  const looks = new Set<string>();
  const charges = new Set<string>();
  // Prefer a new charge each time; after a few misses, settle for a new look.
  for (let i = 0; picked.length < count && i < count * 12; i++) {
    const input = `${seed}#${i}`;
    const config = generateArms(input, version);
    const look = lookKey(config);
    const charge = config.charges?.charge;
    if (looks.has(look) || (charge && charges.has(charge) && i < count * 4)) continue;
    looks.add(look);
    if (charge) charges.add(charge);
    picked.push(build(input, config, version, render));
  }
  return picked;
}

function build(input: string, config: Arms, version: number, render: RenderOptions): Emblem {
  return { theme: 'heraldry', version, input, svg: renderArms(config, render), config, description: blazon(config), credits: creditsFor(config) };
}
