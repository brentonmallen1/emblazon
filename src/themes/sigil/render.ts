import { circle, polar, polyline, regular, star, strokeAttrs } from '../../core/draw.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { mulberry32, seedFrom, type Rng } from '../../core/rng.ts';
import { escapeXml, n, type Pt } from '../../core/svg.ts';
import { CHARGES } from '../heraldry/charges.ts';
import type { Figure, Ink, Ribbon, RuneMark, SealCenter, SealSigil, Sigil, ThornSigil, Wax, WaxCenter, WaxSigil } from './types.ts';

export const INK_HEX: Readonly<Record<Ink, { line: string; name: string }>> = {
  blood: { line: '#E0574B', name: 'blood' },
  crimson: { line: '#C2281F', name: 'crimson' },
  bone: { line: '#E8E2D6', name: 'bone' },
  ash: { line: '#A9A196', name: 'ash' },
  rust: { line: '#C46A2B', name: 'rust' },
  violet: { line: '#9A78C9', name: 'violet' },
  bile: { line: '#A3B547', name: 'bile' },
};

/** Wax body, the deeper colour a stamp presses into it, and its sheen. */
export const WAX_HEX: Readonly<Record<Wax, { wax: string; deep: string; hi: string; name: string }>> = {
  red: { wax: '#8E1D17', deep: '#55100C', hi: '#C2453A', name: 'red' },
  black: { wax: '#2A2323', deep: '#0B0909', hi: '#655A5A', name: 'black' },
  bone: { wax: '#D6C8AC', deep: '#8F8168', hi: '#F3EAD6', name: 'bone' },
  plum: { wax: '#4B2A5C', deep: '#2A1534', hi: '#7E5A92', name: 'plum' },
  moss: { wax: '#3F5A2E', deep: '#22331A', hi: '#6F8F55', name: 'moss-green' },
  ochre: { wax: '#B07A2A', deep: '#6B4512', hi: '#D9A55C', name: 'ochre' },
  oxblood: { wax: '#5E1A22', deep: '#340C12', hi: '#8E3A44', name: 'oxblood' },
};

export const RIBBON_HEX: Readonly<Record<Ribbon, string>> = {
  black: '#1A1414',
  red: '#9E2A22',
  gold: '#C9A55C',
  violet: '#6A4272',
  green: '#2F5A3A',
  bone: '#D6C8AC',
  blue: '#2E4A70',
};

const C = 120;
/** The seal and the rune sit on a near-black plate, so they read on light pages too. */
const PLATE = '#120E0D';
const PLATE_R = 112;

export function renderSigil(sg: Sigil, { size, backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  let art: string;
  if (sg.style === 'wax') art = waxArt(sg, backdrop === 'dark' ? escapeXml(rim) : undefined);
  else {
    art = backdrop === 'dark' ? `<path d="${circle(C, C, PLATE_R + 2.5)}" fill="none" stroke="${escapeXml(rim)}" stroke-width="5"/>` : '';
    art += `<path d="${circle(C, C, PLATE_R)}" fill="${PLATE}"/>`;
    art += sg.style === 'seal' ? sealArt(sg) : thornArt(sg);
  }
  const dims = size ? ` width="${size}" height="${size}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"${dims}>${art}</svg>`;
}

// --- watching seal ----------------------------------------------------------------------------

const OUTER = 96;
const INNER = 80;
const LINE = 2.8;

function sealArt(sg: SealSigil): string {
  const line = INK_HEX[sg.ink].line;
  const dash = sg.dashed ? ' stroke-dasharray="10 6"' : '';
  let art = `<path d="${circle(C, C, OUTER)}" ${strokeAttrs(line, LINE, dash)}/>`;
  if (sg.rings >= 2) art += `<path d="${circle(C, C, INNER)}" ${strokeAttrs(line, LINE)}/>`;
  if (sg.rings === 3) art += `<path d="${circle(C, C, OUTER + 8)}" ${strokeAttrs(line, LINE * 0.7)}/>`;

  if (sg.ticks.count) {
    let d = '';
    const start = -Math.PI / 2 + (sg.ticks.offset ? Math.PI / sg.ticks.count : 0);
    const [r0, r1] = sg.ticks.style === 'out' ? [OUTER + 3, OUTER + 14] : sg.ticks.style === 'in' ? [INNER + 3, OUTER - 3] : [OUTER - 8, OUTER + 10];
    for (let i = 0; i < sg.ticks.count; i++) {
      const a = start + (i * 2 * Math.PI) / sg.ticks.count;
      d += line2(polar(C, C, r0, a), polar(C, C, r1, a));
    }
    art += `<path d="${d}" ${strokeAttrs(line, LINE)}/>`;
  }

  if (sg.runes) {
    const rng = mulberry32(sg.runes.seed);
    for (let i = 0; i < sg.runes.count; i++) {
      const a = (i * 2 * Math.PI) / sg.runes.count + Math.PI / sg.runes.count;
      const [x, y] = polar(C, C, (OUTER + INNER) / 2, a);
      art += `<path d="${rune(rng, 5)}" transform="translate(${n(x)} ${n(y)}) rotate(${n((a * 180) / Math.PI + 90)})" ${strokeAttrs(line, 1.8)}/>`;
    }
  }

  const fig = figureGeometry(sg.figure);
  if (fig.d) art += `<path d="${fig.d}" ${strokeAttrs(line, LINE)}/>`;
  return art + sealCenter(sg.center, line, fig.room, fig.cy);
}

const line2 = ([x0, y0]: Pt, [x1, y1]: Pt): string => `M${n(x0)} ${n(y0)}L${n(x1)} ${n(y1)}`;

/** The figure inscribed in the inner ring, and the room and centre it leaves for the motif. */
function figureGeometry(figure: Figure): { d: string; room: number; cy: number } {
  const r = INNER - 2;
  switch (figure) {
    case 'triangle':
      return { d: polyline(regular(C, C, r, 3), true), room: r * 0.5, cy: C + r * 0.13 };
    case 'invertedTriangle':
      return { d: polyline(regular(C, C, r, 3, Math.PI / 2), true), room: r * 0.5, cy: C - r * 0.13 };
    case 'square':
      return { d: polyline(regular(C, C, r, 4, -Math.PI / 4), true), room: r * 0.64, cy: C };
    case 'diamond':
      return { d: polyline(regular(C, C, r, 4), true), room: r * 0.6, cy: C };
    case 'pentagram':
      return { d: star(C, C, r, 5, 0.38), room: r * 0.36, cy: C + 2 };
    case 'hexagram':
      return { d: star(C, C, r, 6, 0.58), room: r * 0.5, cy: C };
    case 'heptagram':
      return { d: star(C, C, r, 7, 0.62), room: r * 0.52, cy: C };
    case 'twinTriangles':
      // Two overlapping triangles, drawn whole: their lines cross around the centre.
      return { d: polyline(regular(C, C, r, 3), true) + polyline(regular(C, C, r, 3, Math.PI / 2), true), room: r * 0.44, cy: C };
    case 'crossed': {
      // Four spokes that stop short of the centre, like a compass of nails.
      let d = '';
      for (let i = 0; i < 4; i++) d += line2(polar(C, C, r * 0.62, -Math.PI / 2 + (i * Math.PI) / 2), polar(C, C, r, -Math.PI / 2 + (i * Math.PI) / 2));
      return { d, room: r * 0.56, cy: C };
    }
    case 'none':
      return { d: '', room: r * 0.72, cy: C };
  }
}

/** One rune-like mark: two or three short strokes in a small cell at the origin. */
function rune(rng: Rng, h: number): string {
  const w = h * 0.6;
  const pts: Pt[] = [[-w, -h], [w, -h], [-w, 0], [w, 0], [-w, h], [w, h], [0, -h], [0, h]];
  let d = '';
  for (let i = 0, count = 2 + Math.floor(rng() * 2); i < count; i++) {
    const p = pts[Math.floor(rng() * pts.length)];
    const q = pts[Math.floor(rng() * pts.length)];
    if (p !== q) d += line2(p, q);
  }
  return d || `M0 ${-h}V${h}`;
}

/** Centre motifs in units where the eye spans ±36 at s = 1 (the mock-up's size in a triangle). */
function sealCenter(center: SealCenter, line: string, room: number, cy: number): string {
  const s = room / 39;
  const x = (dx: number) => n(C + dx * s);
  const y = (dy: number) => n(cy + dy * s);
  const eye = (lid: number) =>
    `<path d="M${x(-36)} ${y(0)}Q${x(0)} ${y(-lid)} ${x(36)} ${y(0)}Q${x(0)} ${y(26)} ${x(-36)} ${y(0)}Z" ${strokeAttrs(line, LINE)}/><path d="${circle(C, cy, 10 * s)}" fill="${line}"/>`;
  switch (center) {
    case 'eye':
      return eye(26);
    case 'radiantEye': {
      let rays = '';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * (0.18 + (0.64 * i) / 6);
        rays += line2(polar(C, cy, 24 * s, a), polar(C, cy, 36 * s, a));
      }
      return eye(22) + `<path d="${rays}" transform="translate(0 ${n(-8 * s)})" ${strokeAttrs(line, LINE * 0.85)}/>`;
    }
    case 'closedEye': {
      let lashes = '';
      for (const [x0, y0, x1, y1] of [[-24, 4, -28, 14], [-12, 9, -14, 20], [0, 11, 0, 22], [12, 9, 14, 20], [24, 4, 28, 14]]) lashes += `M${x(x0)} ${y(y0)}L${x(x1)} ${y(y1)}`;
      return `<path d="M${x(-36)} ${y(-4)}Q${x(0)} ${y(20)} ${x(36)} ${y(-4)}${lashes}" ${strokeAttrs(line, LINE)}/>`;
    }
    case 'crescent':
      return `<path d="M${x(8)} ${y(-24)}A${n(24 * s)} ${n(24 * s)} 0 1 0 ${x(8)} ${y(24)}A${n(18 * s)} ${n(24 * s)} 0 1 1 ${x(8)} ${y(-24)}Z" ${strokeAttrs(line, LINE)}/>`;
    case 'keyhole':
      return `<path d="${circle(C, cy - 8 * s, 9 * s)}M${x(-5)} ${y(-3)}L${x(-10)} ${y(20)}H${x(10)}L${x(5)} ${y(-3)}Z" fill="${line}"/>`;
    default: {
      // A creature silhouette, filled in the line colour.
      const size = room * 1.7;
      return `<g fill="${line}" transform="translate(${n(C - size / 2)} ${n(cy - size / 2)}) scale(${n(size / 100)})">${CHARGES[center].markup}</g>`;
    }
  }
}

// --- wax seal ---------------------------------------------------------------------------------

/** The blob: a smooth curve through the midpoints between lobes, bulging toward each lobe. */
function blobPath(lobes: readonly number[]): string {
  const pts = lobes.map((r, i) => polar(C, C, r, -Math.PI / 2 + (i * 2 * Math.PI) / lobes.length));
  const mid = (p: Pt, q: Pt): string => `${n((p[0] + q[0]) / 2)} ${n((p[1] + q[1]) / 2)}`;
  let d = `M${mid(pts[pts.length - 1], pts[0])}`;
  pts.forEach((p, i) => (d += `Q${n(p[0])} ${n(p[1])} ${mid(p, pts[(i + 1) % pts.length])}`));
  return d + 'Z';
}

/** A drip hanging from (x, y): width w, length l, rounded at the bottom. */
const drip = (x: number, y: number, w: number, l: number): string =>
  `M${n(x - w / 2)} ${n(y)}Q${n(x - w / 2 + 2)} ${n(y + l * 0.74)} ${n(x)} ${n(y + l)}Q${n(x + w / 2)} ${n(y + l * 0.74)} ${n(x + w / 2)} ${n(y)}Z`;

/** A rounded tongue of wax hanging from (x, y). */
const waxDrip = (x: number, y: number, w: number, l: number): string =>
  `M${n(x - w / 2)} ${n(y)}C${n(x - w / 2)} ${n(y + l * 0.6)} ${n(x - w * 0.45)} ${n(y + l)} ${n(x)} ${n(y + l)}` +
  `C${n(x + w * 0.45)} ${n(y + l)} ${n(x + w / 2)} ${n(y + l * 0.6)} ${n(x + w / 2)} ${n(y)}Z`;

/** Gold leaf for a gilt stamp. */
const GILT = '#D9B26A';

const RIBBON_TAIL = 'M100 146L128 160L80 234L72 220L54 226Z';
const mirror = 'translate(240 0) scale(-1 1)';

function waxArt(sg: WaxSigil, rim?: string): string {
  const c = WAX_HEX[sg.wax];
  const blob = blobPath(sg.lobes);
  const drips = sg.drips
    .map(({ at, length }) => {
      const [x, y] = polar(C, C, 76, (at * Math.PI) / 180);
      return waxDrip(x, y, 13, length + 14);
    })
    .join('');
  const tails = sg.ribbon ? `<path d="${RIBBON_TAIL}"/><path d="${RIBBON_TAIL}" transform="${mirror}"/>` : '';

  let art = '';
  if (rim) {
    // The rim goes round everything that pokes out: the blob, its drips and the ribbon tails.
    const attrs = `fill="${rim}" stroke="${rim}" stroke-width="6" stroke-linejoin="round"`;
    art += `<g ${attrs}><path d="${blob}"/>${drips && `<path d="${drips}"/>`}${tails}</g>`;
  }
  if (sg.ribbon) art += `<g fill="${RIBBON_HEX[sg.ribbon]}">${tails}</g>`;
  // Drips are their own path: wound the other way round, they would cut holes in the blob.
  art += `<path d="${blob}" fill="${c.wax}"/>${drips && `<path d="${drips}" fill="${c.wax}"/>`}`;
  // Sheen on the upper left, the pressed rim, then the stamp.
  art += `<path d="M58 92Q76 54 118 44" fill="none" stroke="${c.hi}" stroke-opacity="0.55" stroke-width="6" stroke-linecap="round"/>`;
  art += `<path d="${circle(C, C, 66)}" fill="none" stroke="${c.hi}" stroke-opacity="0.5" stroke-width="1.5"/>`;
  art += waxRim(sg, c.deep);
  return art + waxCenter(sg.center, sg.gilt ? GILT : c.deep, c.wax);
}

function waxRim(sg: WaxSigil, deep: string): string {
  const ring = (r: number, w: number) => `<path d="${circle(C, C, r)}" fill="none" stroke="${deep}" stroke-width="${w}"/>`;
  const around = (count: number, draw: (a: number) => string) => Array.from({ length: count }, (_, i) => draw(-Math.PI / 2 + (i * 2 * Math.PI) / count)).join('');
  switch (sg.rim) {
    case 'ring':
      return ring(64, 4);
    case 'double':
      return ring(64, 3) + ring(57, 1.6);
    case 'beaded':
      return ring(64, 3) + `<path d="${around(24, (a) => circle(...polar(C, C, 73, a), 2.4))}" fill="${deep}"/>`;
    case 'runes': {
      const rng = mulberry32(seedFrom(...sg.lobes));
      const marks = around(16, (a) => {
        const [x, y] = polar(C, C, 74, a);
        return `<path d="${rune(rng, 4.5)}" transform="translate(${n(x)} ${n(y)}) rotate(${n((a * 180) / Math.PI + 90)})"/>`;
      });
      return ring(64, 3) + `<g ${strokeAttrs(deep, 2)}>${marks}</g>`;
    }
    case 'stars':
      return ring(64, 3) + `<path d="${around(8, (a) => star(...polar(C, C, 74, a), 4.5, 5, 0.42))}" fill="${deep}"/>`;
    case 'thorny':
      return ring(64, 3) + `<path d="${around(20, (a) => polyline([polar(C, C, 64, a - 0.07), polar(C, C, 72, a), polar(C, C, 64, a + 0.07)], true))}" fill="${deep}"/>`;
  }
}

function waxCenter(center: WaxCenter, deep: string, wax: string): string {
  switch (center) {
    case 'eye':
      return `<path d="M82 120Q120 90 158 120Q120 150 82 120Z" fill="none" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/><path d="${circle(C, C, 12)}" fill="${deep}"/>`;
    case 'dagger':
      return `<path d="M120 70L128 84V140H112V84ZM96 140H144V148H96ZM116 148H124V166H116Z${circle(C, 172, 6)}" fill="${deep}"/>`;
    case 'skull':
      return (
        `<path d="M94 114Q94 82 120 82Q146 82 146 114Q146 128 136 132V146H104V132Q94 128 94 114Z" fill="${deep}"/>` +
        `<path d="${circle(108, 114, 8)}${circle(132, 114, 8)}M120 122L114 132H126Z" fill="${wax}"/>` +
        `<path d="M112 138V146M120 138V146M128 138V146" stroke="${wax}" stroke-width="2.5"/>`
      );
    case 'moon':
      return `<path d="M128 84A36 36 0 1 0 128 156A27 36 0 1 1 128 84Z${star(150, 116, 12, 5, 0.42)}" fill="${deep}"/>`;
    case 'keyhole':
      return `<path d="${circle(C, 104, 15)}M112 112L103 160H137L128 112Z" fill="${deep}"/>`;
    case 'candle':
      return (
        `<path d="M120 70Q134 90 120 104Q106 90 120 70ZM108 112H132V164H108ZM94 164H146V174H94Z" fill="${deep}"/>` +
        `<path d="M112 112V126Q115 131 118 126V112Z" fill="${wax}"/><path d="M120 103V112" stroke="${deep}" stroke-width="2.5"/>`
      );
    case 'coffin':
      return `<path d="M106 66H134L150 94L136 176H104L90 94Z" fill="${deep}"/><path d="M120 88V142M106 104H134" stroke="${wax}" stroke-width="6"/>`;
    case 'hourglass':
      return (
        `<path d="M96 72H144V80H96ZM96 160H144V168H96ZM104 80H136L123 120L136 160H104L117 120Z" fill="${deep}"/>` +
        `<path d="M110 154H130L120 138ZM112 88H128L120 100Z" fill="${wax}"/>`
      );
    case 'crossbones': {
      const knobs = [[82, 92], [92, 82], [148, 158], [158, 148], [148, 82], [158, 92], [82, 148], [92, 158]].map(([x, y]) => circle(x, y, 7)).join('');
      return `<path d="M88 88L152 152M152 88L88 152" stroke="${deep}" stroke-width="10"/><path d="${knobs}" fill="${deep}"/>`;
    }
    default:
      return `<g fill="${deep}" transform="translate(76 76) scale(0.88)">${CHARGES[center].markup}</g>`;
  }
}

// --- thorned rune -----------------------------------------------------------------------------

const RUNE_WIDTH = 7;
const SLOT_Y = [72, 96, 120, 144, 168] as const;

function thornArt(sg: ThornSigil): string {
  const line = INK_HEX[sg.ink].line;
  const fill = (d: string) => `<path d="${d}" fill="${line}"/>`;
  const stroke = (d: string, w: number, extra = '') => `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w}"${extra}/>`;
  const around = (count: number, draw: (a: number, i: number) => string, phase = 0) =>
    Array.from({ length: count }, (_, i) => draw(-Math.PI / 2 + ((i + phase) * 2 * Math.PI) / count, i)).join('');
  /** A hooked thorn on the ring at angle a, from radius r0 to its tip at r1. */
  const thorn = (a: number, r0: number, r1: number, half = 0.05) => polyline([polar(C, C, r0, a - half), polar(C, C, r1, a + half * 1.2), polar(C, C, r0, a + half)], true);

  let art = '';
  switch (sg.ring) {
    case 'thorns':
      art += stroke(circle(C, C, 90), 3, ' stroke-dasharray="18 6"') + stroke(circle(C, C, 95), 3, ' stroke-dasharray="18 6" stroke-dashoffset="12"');
      art += fill(around(18, (a) => thorn(a, 96, 109)));
      break;
    case 'briar': {
      // A twisting vine with thorns turning out and in by turns.
      const vine = Array.from({ length: 145 }, (_, i) => {
        const a = (i / 144) * 2 * Math.PI;
        return polar(C, C, 93 + 3.5 * Math.sin(a * 14), a);
      });
      art += stroke(polyline(vine, true), 3.5, ' stroke-linejoin="round"');
      art += fill(around(14, (a, i) => (i % 2 ? thorn(a, 90, 79, 0.045) : thorn(a, 96, 108))));
      break;
    }
    case 'nails': {
      // Eight nails driven inward through the ring: square heads, tapering shafts.
      art += stroke(circle(C, C, 96), 4) + stroke(circle(C, C, 86), 1.6);
      art += fill(around(8, (a) => polyline([polar(C, C, 102, a - 0.022), polar(C, C, 76, a), polar(C, C, 102, a + 0.022)], true)));
      art += fill(around(8, (a) => polyline([polar(C, C, 100, a - 0.05), polar(C, C, 109, a - 0.05), polar(C, C, 109, a + 0.05), polar(C, C, 100, a + 0.05)], true)));
      break;
    }
  }
  // Blood runs from the bottom of the ring.
  const DRIPS: Readonly<Record<number, readonly [deg: number, length: number][]>> = {
    1: [[90, 22]],
    2: [[83, 20], [98, 15]],
    3: [[80, 17], [90, 22], [101, 14]],
  };
  art += fill((DRIPS[sg.drips] ?? []).map(([deg, l]) => drip(...polar(C, C, 97, (deg * Math.PI) / 180), 9, l)).join(''));
  return art + stroke(runePath(sg), RUNE_WIDTH, ' stroke-linecap="square" stroke-linejoin="miter"');
}

/** The rune's strokes: its stave, then each mark. */
export function runePath(sg: Pick<ThornSigil, 'stave' | 'marks' | 'tine'>): string {
  let d = '';
  switch (sg.stave) {
    case 'single':
      d = 'M120 58V182';
      break;
    case 'forked':
      d = `M120 182V114M90 64L120 114L150 64${sg.tine ? 'M120 114V60' : ''}`;
      break;
    case 'crossed':
      d = 'M94 64L146 176M146 64L94 176';
      break;
  }
  for (const m of sg.marks) d += sg.stave === 'crossed' ? crossMark(m) : staveMark(m);
  return d;
}

function staveMark({ kind, slot, flip }: RuneMark): string {
  const y = SLOT_Y[slot];
  const s = flip ? -1 : 1;
  switch (kind) {
    case 'armsUp':
      return `M92 ${y - 24}L120 ${y}L148 ${y - 24}`;
    case 'armsDown':
      return `M92 ${y + 24}L120 ${y}L148 ${y + 24}`;
    case 'bar':
      return `M100 ${y}H140`;
    case 'diamond':
      return `M104 ${y}L120 ${y - 18}L136 ${y}L120 ${y + 18}Z`;
    case 'flag':
      return `M120 ${y}L${120 + 24 * s} ${y - 15}`;
    case 'chevron':
      return `M100 ${y - 10}L120 ${y + 8}L140 ${y - 10}`;
    case 'hook':
      return `M120 ${y}H${120 + 24 * s}V${y + 16}`;
    default:
      return circle(C, y, 10);
  }
}

function crossMark({ kind, flip }: RuneMark): string {
  const s = flip ? -1 : 1;
  switch (kind) {
    case 'flag':
      return `M120 120H${120 + 32 * s}L${120 + 44 * s} 106`;
    case 'ring':
      return circle(C, C, 13);
    case 'lid':
      return 'M94 64H146';
    case 'base':
      return 'M94 176H146';
    case 'bar':
      return 'M98 120H142';
    case 'dots':
      return `${circle(96, 120, 3)}${circle(144, 120, 3)}`;
    default:
      return 'M120 84V156';
  }
}
