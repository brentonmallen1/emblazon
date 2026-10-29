import { circle, sparkle, starPolygon } from '../../core/draw.ts';
import { mulberry32, type Rng } from '../../core/rng.ts';
import { n, type Pt } from '../../core/svg.ts';
import type { ArtContext } from './art.ts';
import { FLESH_HEX, INK, LEATHER_HEX, PAGE_HEX, RIBBON_HEX, mix } from './palette.ts';
import type { Book } from './types.ts';

const COVER = 'M36 96L120 110L204 96V172L120 188L36 172Z';
const LEFT_PAGE = 'M42 92Q82 82 118 104V180Q82 162 42 170Z';
const RIGHT_PAGE = 'M198 92Q158 82 122 104V180Q158 162 198 170Z';
/** The page block under each page, offset down so the pages look thick. */
const LEFT_STACK = 'M42 98Q82 88 118 110V184Q82 166 42 174Z';
const RIGHT_STACK = 'M198 98Q158 88 122 110V184Q158 166 198 174Z';

/** Left page drawings, centred on (80, 124). */
const LEFT: Readonly<Record<Book['left'], string>> = {
  triangle: `<path d="${circle(80, 124, 15)}"/><path d="M80 111L91.3 130.5H68.7Z"/><path d="M80 109V104M80 139V144M65 124H60M95 124H100"/>`,
  pentacle: `<path d="${circle(80, 124, 16)}"/><path d="${starPolygon(80, 124, 14, 5, 2)}"/>`,
  moon: '<path d="M84 110.6A14 14 0 1 0 84 137.4A16 16 0 0 1 84 110.6Z"/><path d="M93 116h.01M97 127h.01M91 136h.01" stroke-width="3"/>',
  rings: `<path d="${circle(80, 124, 16) + circle(80, 124, 8)}"/><path d="M80 102V146M58 124H102"/>`,
};
const LEFT_DOT: Readonly<Record<Book['left'], boolean>> = { triangle: true, pentacle: false, moon: false, rings: true };

/** Right page drawings, centred on (161, 120); the glowing part is drawn separately. */
const RIGHT: Readonly<Record<Book['right'], { ink: string; glow: string; pupil?: string }>> = {
  eye: { ink: '<path d="M146 120Q160 108 176 120Q160 132 146 120Z"/>', glow: circle(161, 120, 6), pupil: 'M161 115V125' },
  squid: {
    ink: '<path d="M154 124C150 108 156 96 161 94C166 96 172 108 168 124Z"/><path d="M155 124Q152 132 156 138M159 125Q158 134 160 140M163 125Q164 134 162 140M167 124Q170 132 166 138"/>',
    glow: circle(157.5, 114, 1.9) + circle(164.5, 114, 1.9),
  },
  star: { ink: `<path d="${sparkle(161, 120, 15)}"/>`, glow: circle(161, 120, 3.4) },
  pyramid: { ink: '<path d="M161 102L178 132H144Z"/><path d="M153 123Q161 116 169 123Q161 130 153 123Z"/>', glow: circle(161, 123, 2.6) },
};

/** Scribbled marginalia under each drawing. */
const MARGIN_LEFT = 'M58 150Q62 147 66 150T74 150T82 150M86 148H98M58 157Q64 154 70 157T80 156';
const MARGIN_RIGHT = 'M146 146Q150 143 154 146T162 146T170 146M174 144H182M146 153Q152 150 158 153T168 152M172 152H180';

export function bookArt(s: Book, ctx: ArtContext): string {
  const rng = mulberry32(ctx.seed);
  const page = PAGE_HEX[Math.floor(rng() * PAGE_HEX.length)];
  const leather = LEATHER_HEX[s.leather];
  const ink = mix(leather, INK, 0.4);
  const stroke = (w: number) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  const right = RIGHT[s.right];

  let out = tentacles(s, rng);
  out += `<path d="${COVER}" fill="${leather}" ${stroke(2)}/>`;
  if (s.binding === 'corners') out += `<path d="M36 96L48 98V110L36 108ZM204 96L192 98V110L204 108ZM36 172L48 174V162L36 160ZM204 172L192 174V162L204 160Z" fill="${mix(leather, '#C9A55C', 0.85)}"/>`;
  if (s.binding === 'studs') out += `<path d="${[104, 122, 140, 158].map((y) => circle(39.5, y, 2) + circle(200.5, y, 2)).join('')}" fill="#C9A55C"/>`;
  const shade = mix(page, INK, 0.2);
  out += `<path d="${LEFT_STACK}" fill="${shade}"/><path d="${RIGHT_STACK}" fill="${shade}"/>`;
  out += `<path d="${LEFT_PAGE}" fill="${page}" ${stroke(1.6)}/><path d="${RIGHT_PAGE}" fill="${page}" ${stroke(1.6)}/>`;
  out += `<path d="M112 106V178M128 106V178" stroke="${ink}" stroke-opacity="0.18" stroke-width="6"/>`;
  out += `<g fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    LEFT[s.left] + right.ink + `<path d="${MARGIN_LEFT}"/><path d="${MARGIN_RIGHT}"/></g>`;
  if (LEFT_DOT[s.left]) out += `<path d="${circle(80, 124, 2.6)}" fill="${ink}"/>`;
  out += `<g${ctx.glowAttr}><path d="${right.glow}" fill="${ctx.glow}"/>` +
    (right.pupil ? `<path d="${right.pupil}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : '') + `</g>`;

  // Bookmark ribbons hanging from the foot of the spine.
  const ribbons = [[130, 184], [100, 180]].slice(0, s.ribbons);
  const first = Math.floor(rng() * RIBBON_HEX.length);
  ribbons.forEach(([x, y], i) => {
    const colour = RIBBON_HEX[(first + i * 2) % RIBBON_HEX.length];
    out += `<path d="M${x} ${y}V${y + 28}L${x + 6} ${y + 21}L${x + 12} ${y + 28}V${y - 1}" fill="${colour}" ${stroke(1.4)}/>`;
  });
  return out;
}

/** Tentacles rising from the spine, fanned out, their tips hooking back over the book. */
function tentacles(s: Book, rng: Rng): string {
  const flesh = FLESH_HEX[s.flesh];
  const spread = { 2: [-24, 24], 3: [-32, 0, 32], 4: [-38, -13, 13, 38] }[s.tentacles];
  let body = '';
  let suckers = '';
  for (const deg of spread) {
    const a = (deg * Math.PI) / 180;
    const len = 70 + rng() * 14;
    const curl = deg === 0 ? (rng() < 0.5 ? -1 : 1) : -Math.sign(deg);
    const shape = taper([120 + deg * 0.12, 108], a, len, curl * (0.85 + rng() * 0.3));
    body += shape.d;
    suckers += shape.suckers;
  }
  return `<path d="${body}" fill="${flesh}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="${suckers}" fill="${mix(flesh, '#FFFFFF', 0.45)}"/>`;
}

/** A tapering tentacle from `base`, leaning `a` radians from vertical, its tip hooked toward `curl`. */
function taper(base: Pt, a: number, len: number, curl: number): { d: string; suckers: string } {
  const dir: Pt = [Math.sin(a), -Math.cos(a)];
  const side: Pt = [-dir[1], dir[0]];
  const at = (along: number, across: number): Pt => [base[0] + dir[0] * along + side[0] * across, base[1] + dir[1] * along + side[1] * across];
  // An S: a sway against the curl low down, then the tip hooks over and back down.
  const p = [at(0, 0), at(len * 0.45, -curl * len * 0.18), at(len * 1.08, curl * len * 0.08), at(len * 0.9, curl * len * 0.3)];
  const point = (t: number): Pt => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [k.reduce((s, w, i) => s + w * p[i][0], 0), k.reduce((s, w, i) => s + w * p[i][1], 0)];
  };
  const steps = 18;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let suckers = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x0, y0] = point(Math.max(0, t - 0.01));
    const [x1, y1] = point(Math.min(1, t + 0.01));
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / l;
    const ny = (x1 - x0) / l;
    const w = 8.5 * (1 - t) ** 0.7 + 1.6 * t;
    const [x, y] = point(t);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
    // Suckers along the inside of the curl.
    if (i % 4 === 2 && t < 0.85) suckers += circle(x - nx * w * 0.45 * curl, y - ny * w * 0.45 * curl, 1.2 + (1 - t) * 0.8);
  }
  const pts = [...left, ...right.reverse()];
  return { d: `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`, suckers };
}
