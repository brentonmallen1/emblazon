import type { RenderOptions } from '../core/render-options.ts';

/** What a theme plugs into emblazon(): every function pure and deterministic. */
export interface Theme<Config> {
  /** Released versions, oldest first. Each is frozen once released. */
  versions: readonly number[];
  latest: number;
  generate(input: string, version: number): Config;
  render(config: Config, options?: RenderOptions): string;
  /** Human-readable description, e.g. a blazon. */
  describe(config: Config): string;
  /** Two configs with the same key look alike at avatar size. */
  lookKey(config: Config): string;
  /** The most prominent motif, so a picker can avoid offering the same one twice. */
  motif(config: Config): string | undefined;
  /** License credits for third-party art in this config. */
  credits(config: Config): string[];
}
