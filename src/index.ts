import type { RenderOptions } from './core/render-options.ts';
import * as heraldryTheme from './themes/heraldry/index.ts';
import * as badgeTheme from './themes/badge/index.ts';
import * as insigniaTheme from './themes/insignia/index.ts';
import * as markTheme from './themes/mark/index.ts';
import * as patchTheme from './themes/patch/index.ts';
import * as sigilTheme from './themes/sigil/index.ts';
import type { Theme } from './themes/theme.ts';

export * as heraldry from './themes/heraldry/index.ts';
export * as patch from './themes/patch/index.ts';
export * as insignia from './themes/insignia/index.ts';
export * as sigil from './themes/sigil/index.ts';
export * as mark from './themes/mark/index.ts';
export * as badge from './themes/badge/index.ts';
export { ATTRIBUTION } from './themes/heraldry/index.ts';
export type { RenderOptions } from './core/render-options.ts';
export type { Theme } from './themes/theme.ts';

/** Each theme's config type, by name. */
interface Configs {
  heraldry: heraldryTheme.Arms;
  patch: patchTheme.Patch;
  insignia: insigniaTheme.Insignia;
  sigil: sigilTheme.Sigil;
  mark: markTheme.Mark;
  badge: badgeTheme.Badge;
}
export type ThemeName = keyof Configs;

export const THEMES: { readonly [T in ThemeName]: Theme<Configs[T]> } = {
  heraldry: {
    versions: heraldryTheme.HERALDRY_VERSIONS,
    latest: heraldryTheme.HERALDRY_VERSION,
    generate: heraldryTheme.generateArms,
    render: heraldryTheme.renderArms,
    describe: heraldryTheme.blazon,
    lookKey: heraldryTheme.lookKey,
    motif: (arms) => arms.charges?.charge,
    credits: heraldryTheme.creditsFor,
    styleFor: heraldryTheme.heraldryStyle,
  },
  patch: {
    versions: patchTheme.PATCH_VERSIONS,
    latest: patchTheme.PATCH_VERSION,
    generate: patchTheme.generatePatch,
    render: patchTheme.renderPatch,
    describe: patchTheme.describePatch,
    lookKey: patchTheme.patchLookKey,
    motif: patchTheme.patchMotif,
    credits: () => [],
    styleFor: () => 'flat',
  },
  insignia: {
    versions: insigniaTheme.INSIGNIA_VERSIONS,
    latest: insigniaTheme.INSIGNIA_VERSION,
    generate: insigniaTheme.generateInsignia,
    render: insigniaTheme.renderInsignia,
    describe: insigniaTheme.describeInsignia,
    lookKey: insigniaTheme.insigniaLookKey,
    motif: insigniaTheme.insigniaMotif,
    credits: () => [],
    styleFor: () => 'flat',
  },
  sigil: {
    versions: sigilTheme.SIGIL_VERSIONS,
    latest: sigilTheme.SIGIL_VERSION,
    generate: sigilTheme.generateSigil,
    render: sigilTheme.renderSigil,
    describe: sigilTheme.describeSigil,
    lookKey: sigilTheme.sigilLookKey,
    motif: sigilTheme.sigilMotif,
    credits: sigilTheme.sigilCredits,
    styleFor: () => 'flat',
  },
  mark: {
    versions: markTheme.MARK_VERSIONS,
    latest: markTheme.MARK_VERSION,
    generate: markTheme.generateMark,
    render: markTheme.renderMark,
    describe: markTheme.describeMark,
    lookKey: markTheme.markLookKey,
    motif: markTheme.markMotif,
    credits: () => [],
    styleFor: () => 'flat',
  },
  badge: {
    versions: badgeTheme.BADGE_VERSIONS,
    latest: badgeTheme.BADGE_VERSION,
    generate: badgeTheme.generateBadge,
    render: badgeTheme.renderBadge,
    describe: badgeTheme.describeBadge,
    lookKey: badgeTheme.badgeLookKey,
    motif: badgeTheme.badgeMotif,
    credits: () => [],
    styleFor: () => 'flat',
  },
};

export interface EmblazonOptions<T extends ThemeName = ThemeName> extends RenderOptions {
  /** Which kind of emblem (default 'heraldry'). */
  theme?: T;
  /** Theme version (default: the theme's latest). Pin it if emblems must never change. */
  version?: number;
}

/** One generated emblem. `config` narrows with `theme`. */
export type Emblem<T extends ThemeName = ThemeName> = {
  [K in T]: {
    theme: K;
    version: number;
    /** The string this emblem was generated from. Store it with `theme` and `version`. */
    input: string;
    svg: string;
    /** The generated configuration; store it to re-render later without the input. */
    config: Configs[K];
    /** Human-readable description: a blazon, or a mission name and scene. Never drawn. */
    description: string;
    /** License credits for third-party art in this emblem, if any. */
    credits: string[];
  };
}[T];

/** The emblem for any string: same input, theme and version, same emblem. */
export function emblazon<T extends ThemeName = 'heraldry'>(input: string, { theme, version, ...render }: EmblazonOptions<T> = {}): Emblem<T> {
  const name = (theme ?? 'heraldry') as T;
  const t = THEMES[name] as unknown as Theme<Configs[T]>;
  const v = version ?? t.latest;
  return build(name, t, input, t.generate(input, v), v, render);
}

export interface OptionsRequest<T extends ThemeName = ThemeName> extends EmblazonOptions<T> {
  /** How many emblems to offer (default 6). */
  count?: number;
}

/**
 * A picker's worth of emblems from one seed, e.g. a game session plus a hero's name. Stable:
 * the same seed always offers the same emblems, in the same order. No two look alike, and the
 * main motif differs where the set allows, so the choice feels like a real choice. Re-roll by
 * changing the seed (append a counter). Store the chosen emblem's `input`, `theme` and `version`.
 */
export function emblazonOptions<T extends ThemeName = 'heraldry'>(
  seed: string,
  { count = 6, theme, version, ...render }: OptionsRequest<T> = {},
): Emblem<T>[] {
  const name = (theme ?? 'heraldry') as T;
  const t = THEMES[name] as unknown as Theme<Configs[T]>;
  const v = version ?? t.latest;
  const picked: Emblem<T>[] = [];
  const looks = new Set<string>();
  const motifs = new Set<string>();
  // Prefer a new motif each time; after a few misses, settle for a new look.
  for (let i = 0; picked.length < count && i < count * 12; i++) {
    const input = `${seed}#${i}`;
    const config = t.generate(input, v);
    const look = t.lookKey(config);
    const motif = t.motif(config);
    if (looks.has(look) || (motif && motifs.has(motif) && i < count * 4)) continue;
    looks.add(look);
    if (motif) motifs.add(motif);
    picked.push(build(name, t, input, config, v, render));
  }
  return picked;
}

function build<T extends ThemeName>(theme: T, t: Theme<Configs[T]>, input: string, config: Configs[T], version: number, render: RenderOptions): Emblem<T> {
  const svg = t.render(config, { style: t.styleFor(version), ...render });
  return { theme, version, input, svg, config, description: t.describe(config), credits: t.credits(config) } as Emblem<T>;
}
