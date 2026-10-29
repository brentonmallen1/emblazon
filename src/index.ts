import { HERALDRY_VERSION, blazon, generateArms, renderArms, type Arms, type RenderOptions } from './themes/heraldry/index.ts';

export * as heraldry from './themes/heraldry/index.ts';

export interface EmblazonOptions extends RenderOptions {
  /** Theme version. Pin it if your app needs emblems that never change. */
  version?: number;
}

export interface Emblem {
  theme: 'heraldry';
  version: number;
  svg: string;
  /** The generated configuration; store it to re-render later without the input. */
  config: Arms;
  /** Human-readable description (for heraldry, the blazon). */
  description: string;
}

/** The emblem for any string: same input, same emblem. */
export function emblazon(input: string, { version = HERALDRY_VERSION, ...render }: EmblazonOptions = {}): Emblem {
  const config = generateArms(input, version);
  return { theme: 'heraldry', version, svg: renderArms(config, render), config, description: blazon(config) };
}
