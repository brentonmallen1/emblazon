import { n } from '../../core/svg.ts';
import { MIRROR, type ArtContext } from './art.ts';
import { INK, STONE_HEX } from './palette.ts';
import type { Idol } from './types.ts';

/** Left wing (the right one is its mirror): membrane, then the finger bones. */
const WINGS = {
  spread: {
    fill: 'M120 108C100 84 72 74 46 80C58 90 62 104 58 118C72 112 88 114 98 122Z',
    ribs: 'M98 120C88 104 72 92 54 84M108 112C100 96 88 86 70 80',
  },
  raised: {
    fill: 'M118 112C108 88 92 60 64 42C70 60 64 78 54 92C72 92 88 104 98 122Z',
    ribs: 'M100 118C94 98 84 76 68 50M108 110C102 92 94 76 82 62',
  },
} as const;

/** Bare shoulders, for an idol with no wings: a bust. */
const BUST = 'M68 206C70 168 94 146 120 146C146 146 170 168 172 206Z';

const HEADS = {
  dome: { shape: 'M92 128C88 96 100 72 120 70C140 72 152 96 148 128Z', brow: 'M98 104Q120 94 142 104', third: 90 },
  mantle: { shape: 'M94 128C90 100 104 54 120 46C136 54 150 100 146 128Z', brow: 'M100 106Q120 98 140 106', third: 86 },
} as const;

/** Behind the head: a spiked crown or a pair of horns (left horn; the right is mirrored). */
const CROWN = 'M100 86L95 60L108 75L113 52L120 70L127 52L132 75L145 60L140 86Z';
const HORN = 'M98 92C78 88 66 66 74 40C80 58 92 70 108 76Z';

/** One tentacle hanging from (0, 0), 12 wide at the root, 64 long. Mirrored for the right side. */
const TENTACLE = {
  hanging: 'M-6 0Q-12 38 6 64Q-2 36 6 0Z',
  curling: 'M-6 0C-10 26 -2 40 -10 52C-15 60 -8 68 -3 62C0 58 -6 54 -2 50C4 42 4 26 6 0Z',
} as const;

const PLINTH = {
  block: 'M84 188H156V200H84Z',
  stepped: 'M88 184H152V192H88ZM76 192H164V204H76Z',
} as const;

export function idolArt(s: Idol, ctx: ArtContext): string {
  const stone = STONE_HEX[s.stone];
  const line = (w: number) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  let out = '';

  if (s.wings === 'bust') out += `<path d="${BUST}" fill="${stone.shade}" ${line(1.8)}/>`;
  else {
    const w = WINGS[s.wings];
    out += `<g fill="${stone.shade}" ${line(1.8)}><path d="${w.fill}"/><path d="${w.fill}" transform="${MIRROR}"/></g>`;
    out += `<g fill="none" stroke="${INK}" stroke-width="1.4"><path d="${w.ribs}"/><path d="${w.ribs}" transform="${MIRROR}"/></g>`;
  }
  if (s.plinth !== 'none') out += `<path d="${PLINTH[s.plinth]}" fill="${stone.shade}" ${line(1.8)}/>`;

  const head = s.head === 'mantle' ? HEADS.mantle : HEADS.dome;
  if (s.head === 'crowned') out += `<path d="${CROWN}" fill="${stone.face}" ${line(1.8)}/>`;
  if (s.head === 'horned') out += `<g fill="${stone.face}" ${line(1.8)}><path d="${HORN}"/><path d="${HORN}" transform="${MIRROR}"/></g>`;
  out += `<path d="${head.shape}" fill="${stone.face}" ${line(2)}/>`;
  out += `<path d="${head.brow}" fill="none" stroke="${INK}" stroke-width="2"/>`;

  // Eyes slant toward the nose; a third sits above the brow.
  const pair =
    `<ellipse cx="108" cy="112" rx="5.5" ry="2.8" transform="rotate(14 108 112)"/>` +
    `<ellipse cx="132" cy="112" rx="5.5" ry="2.8" transform="rotate(-14 132 112)"/>`;
  const eyes =
    s.eyes === 1 ? `<ellipse cx="120" cy="113" rx="8" ry="3.6"/>` : pair + (s.eyes === 3 ? `<circle cx="120" cy="${head.third}" r="3.2"/>` : '');
  out += `<g fill="${ctx.glow}"${ctx.glowAttr}>${eyes}</g>`;

  // The beard: tentacles fanning out from under the eyes, longest in the middle.
  let beard = '';
  const shape = s.curl ? TENTACLE.curling : TENTACLE.hanging;
  for (let i = 0; i < s.tentacles; i++) {
    const t = i / (s.tentacles - 1);
    const middle = 1 - Math.abs(2 * t - 1);
    const flip = t > 0.5 ? -1 : 1;
    const x = 97 + 46 * t;
    const y = 122 + 3 * middle;
    const rot = (0.5 - t) * 20;
    const len = 0.9 + 0.22 * middle;
    beard += `<path d="${shape}" transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${flip} ${n(len)})"/>`;
  }
  out += `<g fill="${stone.face}" ${line(1.6)}>${beard}</g>`;
  return out;
}
