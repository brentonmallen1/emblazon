import { NAMES } from './palette.ts';
import type { Book, Idol, Relic, Tablet } from './types.ts';

const FRAME_NAMES = { token: 'token', octagon: 'octagon', arch: 'arch', cartouche: 'cartouche' } as const;
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
/** "a" or "an" before a word. */
const a = (word: string): string => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

function idol(s: Idol, glow: string): string {
  const head = { dome: 'domed', mantle: 'tall', crowned: 'crowned', horned: 'horned' }[s.head];
  const body = { spread: 'wings spread', raised: 'wings raised', bust: 'a bust' }[s.wings];
  const eyes = s.eyes === 1 ? `one ${glow} eye` : `${COUNT[s.eyes]} ${glow} eyes`;
  const base = s.plinth === 'none' ? '' : `, on ${a(s.plinth)} plinth`;
  return `${a(head)} ${s.stone} idol, ${body}, with ${eyes} and ${COUNT[s.tentacles]} ${s.curl ? 'curling' : 'hanging'} tentacles${base}`;
}

function tablet(s: Tablet, glow: string): string {
  const carving = { figure: 'a winged, squid-headed figure', eye: 'a watching eye', star: 'a star with an eye', kraken: 'a kraken' }[s.carving];
  const crown = s.crown === 'none' ? '' : ` beneath ${a(s.crown)}`;
  return `${a(s.shape)} ${s.stone} tablet carved with ${carving}${crown}, ${glow} eyes`;
}

function book(s: Book, glow: string): string {
  const right = { eye: a(`${glow} eye`), squid: 'a squid', star: 'a star', pyramid: 'an eye in a pyramid' }[s.right];
  return `${a(NAMES.leather[s.leather])} grimoire open to ${a(s.left)} and ${right}, ${COUNT[s.tentacles]} tentacles rising from its spine`;
}

/** e.g. "A brass token on deep green: a domed limestone idol, wings spread, …". */
export function describeRelic(m: Relic): string {
  const glow = NAMES.glow[m.glow];
  const s = m.subject;
  const what = s.kind === 'idol' ? idol(s, glow) : s.kind === 'tablet' ? tablet(s, glow) : book(s, glow);
  const frame = a(`${NAMES.metal[m.metal]} ${FRAME_NAMES[m.frame]}`);
  return `${frame[0].toUpperCase()}${frame.slice(1)} on ${NAMES.field[m.field]}: ${what}`;
}

/** The subject's features you can make out at avatar size. */
function subjectKey(s: Relic['subject']): string {
  switch (s.kind) {
    case 'idol':
      return [s.kind, s.stone, s.head, s.eyes, s.wings].join(' ');
    case 'tablet':
      return [s.kind, s.stone, s.shape, s.carving].join(' ');
    case 'book':
      return [s.kind, s.leather, s.flesh, s.right, s.tentacles].join(' ');
  }
}

/** What you notice at a glance: frame shape and colours, the glow, the subject and its outline. */
export const relicLookKey = (m: Relic): string => [m.frame, m.metal, m.field, m.glow, subjectKey(m.subject)].join(' | ');

/** The subject and its main feature: what a picker should vary. */
export function relicMotif(m: Relic): string {
  const s = m.subject;
  return `${s.kind}:${s.kind === 'idol' ? s.head : s.kind === 'tablet' ? s.carving : s.right}`;
}
