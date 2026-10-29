import { normalizeInput } from '../../core/hash.ts';
import { int, pick, rngFor, weighted } from '../../core/rng.ts';
import { ICONS, type Badge, type BadgeIcon, type BadgeKind, type BadgeLayout, type BadgePalette, type BadgeShape, type StickerCut } from './types.ts';

export const BADGE_VERSION = 1;
export const BADGE_VERSIONS: readonly number[] = [1];

/** Pick weights for badge v1. Frozen once released, like heraldry's. Key order matters. */
const W1 = {
  kinds: { flat: 3, sticker: 2 } satisfies Record<BadgeKind, number>,
  shapes: { circle: 2, shield: 3, hexagon: 2, rounded: 2, crest: 1, octagon: 1 } satisfies Record<BadgeShape, number>,
  layouts: { solid: 2, band: 3, split: 2, chevron: 2 } satisfies Record<BadgeLayout, number>,
  stars: { 0: 2, 3: 2, 5: 1 },
  cuts: { tile: 3, square: 2, ticket: 2, pill: 2, hexagon: 2 } satisfies Record<StickerCut, number>,
  palettes: {
    indigo: 2, teal: 1, coral: 1, mustard: 1, slate: 1, emerald: 1, plum: 1, sky: 1, ink: 1, cream: 1, tangerine: 1, rose: 1,
  } satisfies Record<BadgePalette, number>,
};

/** Initials avoid I (too thin alone) and Q (reads as O at avatar size). */
const LETTERS = 'ABCDEFGHJKLMNOPRSTUVWXYZ';

/** Pure and deterministic, one seeded stream per slot (see heraldry's generateArms). */
export function generateBadge(input: string, version: number = BADGE_VERSION): Badge {
  if (!BADGE_VERSIONS.includes(version)) throw new RangeError(`badge v${version} does not exist (have: ${BADGE_VERSIONS.join(', ')})`);
  const w = W1;
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'badge', name, key);

  const kind = weighted(slot('kind'), w.kinds);
  const palette = weighted(slot('palette'), w.palettes);
  const icon: BadgeIcon = pick(slot('icon'), ICONS);

  if (kind === 'flat') {
    return {
      kind,
      shape: weighted(slot('shape'), w.shapes),
      palette,
      layout: weighted(slot('layout'), w.layouts),
      icon,
      stars: Number(weighted(slot('stars'), w.stars)) as 0 | 3 | 5,
    };
  }

  const lRng = slot('letters');
  const first = LETTERS[int(lRng, 0, LETTERS.length - 1)];
  let second = LETTERS[int(lRng, 0, LETTERS.length - 1)];
  while (second === first) second = LETTERS[int(lRng, 0, LETTERS.length - 1)];
  const tRng = slot('tilt');
  return {
    kind,
    cut: weighted(slot('cut'), w.cuts),
    palette,
    letters: first + second,
    number: String(int(slot('number'), 1, 99)).padStart(2, '0'),
    icon,
    tilt: int(tRng, 3, 8) * (tRng() < 0.5 ? -1 : 1),
  };
}
