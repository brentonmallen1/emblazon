import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { textPath, textWidth } from '../../core/stroke-font.ts';
import { circle } from '../../core/draw.ts';
import { escapeXml, n } from '../../core/svg.ts';
import type { HazardShape, HazardTag, Insignia, InsigniaPalette, NeonShape, NeonTag, StampShape, StampTag } from './types.ts';

/** `main` is the neon colour, `ink` the near-black printed on it, `second` the status light. */
export const PALETTES: Readonly<Record<InsigniaPalette, { main: string; ink: string; second: string; name: string }>> = {
  sodium: { main: '#F2E64A', ink: '#0B0A0C', second: '#FF4D5E', name: 'yellow' },
  ice: { main: '#4DE1FF', ink: '#061017', second: '#FF3EA5', name: 'cyan' },
  magenta: { main: '#FF3EA5', ink: '#14040C', second: '#4DE1FF', name: 'magenta' },
  acid: { main: '#B6FF3B', ink: '#0B1004', second: '#FF3EA5', name: 'acid green' },
  blaze: { main: '#FF8A1F', ink: '#140904', second: '#4DE1FF', name: 'orange' },
  chrome: { main: '#E4E7EC', ink: '#0B0C10', second: '#FF4D5E', name: 'chrome' },
  ultraviolet: { main: '#A97CFF', ink: '#0B0716', second: '#F2E64A', name: 'violet' },
  jade: { main: '#2EE6A8', ink: '#04120D', second: '#FF8A1F', name: 'jade' },
};

const DARK = '#0D0C10';

/** Tag outlines (landscape, about 204 × 148) and the printed frame inside each. */
const TAGS: Readonly<Record<HazardShape, { outer: string; inner: string; light: readonly [number, number] }>> = {
  clipped: { outer: 'M44 46H222V168L196 194H18V72Z', inner: 'M52 56H212V164L192 184H28V78Z', light: [190, 62] },
  notched: { outer: 'M36 46H204L222 64V176L204 194H36L18 176V64Z', inner: 'M40 56H200L212 68V172L200 184H40L28 172V68Z', light: [186, 62] },
  tab: { outer: 'M18 46H180L222 88V194H18V136H28V104H18Z', inner: 'M28 56H176L212 92V184H28V140H38V100H28Z', light: [158, 62] },
  hex: { outer: 'M48 46H192L222 120L192 194H48L18 120Z', inner: 'M54 56H186L212 120L186 184H54L28 120Z', light: [170, 62] },
  bevel: {
    outer: 'M18 58Q18 46 30 46H210Q222 46 222 58V158L186 194H30Q18 194 18 182Z',
    inner: 'M28 62Q28 56 34 56H206Q212 56 212 62V154L182 184H34Q28 184 28 178Z',
    light: [190, 62],
  },
};

/** Neon outlines; `inset` keeps the footer clear of slanted sides, `dot` places the status light. */
const NEON: Readonly<Record<NeonShape, { outer: string; inset: number; dot: readonly [number, number] }>> = {
  notched: { outer: TAGS.notched.outer, inset: 42, dot: [198, 64] },
  clipped: { outer: TAGS.clipped.outer, inset: 42, dot: [204, 64] },
  hex: { outer: TAGS.hex.outer, inset: 56, dot: [184, 66] },
  bevel: { outer: TAGS.bevel.outer, inset: 42, dot: [204, 64] },
};

const STAMPS: Readonly<Record<StampShape, { outer: string; inner: string }>> = {
  corner: { outer: 'M20 20H190L220 50V220H20Z', inner: 'M30 30H186L210 54V210H30Z' },
  double: { outer: 'M20 20H190L220 50V220H50L20 190Z', inner: 'M30 30H186L210 54V210H54L30 186Z' },
  notch: { outer: 'M34 20H206L220 34V206L206 220H34L20 206V34Z', inner: 'M38 30H202L210 38V202L202 210H38L30 202V38Z' },
};

/** Stroke-font text as a stroked path. Square caps; sharp joins bevel instead of spiking. */
const ink = (d: string, color: string, width: number, extra = ''): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="2"${extra}/>`;

/** `text` centred on cx with its baseline (bottom) at y. */
const centred = (text: string, cx: number, bottom: number, height: number, tracking = 0.45): string =>
  textPath(text, cx - textWidth(text, height, tracking) / 2, bottom - height, height, tracking);

/** Bars laid left to right (or top to bottom) from `start` until `span` is filled. */
function bars(widths: readonly number[], start: number, span: number, gap = 3): [number, number][] {
  const out: [number, number][] = [];
  let at = start;
  for (const w of widths) {
    if (at + w > start + span) break;
    out.push([at, w]);
    at += w + gap;
  }
  return out;
}

/** Diagonal hazard stripes across the box, to be clipped. */
function stripes(x0: number, y0: number, x1: number, y1: number, pitch = 16, width = 8): string {
  const h = y1 - y0;
  let d = '';
  for (let x = x0 - h; x < x1; x += pitch) d += `M${n(x)} ${n(y1)}H${n(x + width)}L${n(x + width + h)} ${n(y0)}H${n(x + h)}Z`;
  return d;
}

function hazard(t: HazardTag, id: string): { outline: string; body: string } {
  const pal = PALETTES[t.palette];
  const tag = TAGS[t.shape];
  let body = `<path d="${tag.outer}" fill="${pal.main}"/>`;
  body += `<path d="${tag.inner}" fill="none" stroke="${pal.ink}" stroke-width="3"/>`;

  const [a, b] = t.mark;
  const bottom = 134;
  if (t.join === 'slash') {
    const h = 52;
    body += ink(centred(`${a}/${b}`, 120, bottom, h, 0.25), pal.ink, h / 5.6);
  } else if (t.join === 'none') {
    const h = 60;
    body += ink(centred(`${a}${b}`, 120, bottom, h, 0.5), pal.ink, h / 5.6);
  } else {
    // Wide tracking leaves room for a square dot between the characters.
    const h = 56;
    const tracking = 1.2;
    const left = 120 - textWidth(`${a}${b}`, h, tracking) / 2;
    const unit = h / 6;
    const s = h / 5.6;
    body += ink(textPath(`${a}${b}`, left, bottom - h, h, tracking), pal.ink, s);
    body += `<rect x="${n(left + 6.4 * unit - s / 2)}" y="${n(bottom - h / 2 - s / 2)}" width="${n(s)}" height="${n(s)}" fill="${pal.ink}"/>`;
  }

  // Footer: barcode, then the serial or a block of stripes, centred as one row.
  const barSpan = 56;
  const gap = 8;
  const serialH = 16;
  const rightW = t.footer === 'serial' ? textWidth(t.serial, serialH) + serialH / 7.5 : 64;
  const x0 = 120 - (barSpan + gap + rightW) / 2;
  const code = bars(t.barcode, x0, barSpan).map(([x, w]) => `M${n(x)} 148h${n(w)}v24h${n(-w)}Z`).join('');
  body += `<path d="${code}" fill="${pal.ink}"/>`;
  const rx = x0 + barSpan + gap;
  if (t.footer === 'serial') {
    body += ink(textPath(t.serial, rx + serialH / 15, 172 - serialH, serialH), pal.ink, serialH / 6.5);
  } else {
    body += `<clipPath id="${id}-hz"><path d="M${n(rx)} 148h${n(rightW)}v24h${n(-rightW)}Z"/></clipPath>`;
    body += `<path d="${stripes(rx, 148, rx + rightW, 172, 12, 6)}" fill="${pal.ink}" clip-path="url(#${id}-hz)"/>`;
  }

  const [lx, ly] = tag.light;
  if (t.light === 'square') body += `<rect x="${lx}" y="${ly}" width="14" height="14" fill="${pal.second}"/>`;
  if (t.light === 'circle') body += `<path d="${circle(lx + 7, ly + 7, 7)}" fill="${pal.second}"/>`;
  return { outline: tag.outer, body };
}

function neon(t: NeonTag): { outline: string; body: string } {
  const pal = PALETTES[t.palette];
  const shape = NEON[t.shape];
  const glow = (d: string, w: number) => ink(d, pal.main, w, ' stroke-opacity="0.22"');
  let body = `<path d="${shape.outer}" fill="${DARK}" stroke="${pal.main}" stroke-opacity="0.22" stroke-width="10" stroke-linejoin="round"/>`;
  body += `<path d="${shape.outer}" fill="none" stroke="${pal.main}" stroke-width="2.5"/>`;
  if (t.brackets) body += `<path d="M8 40V20H28M212 20H232V40M232 200V220H212M28 220H8V200" fill="none" stroke="${pal.main}" stroke-width="2.5"/>`;

  // Hollow tube letters: a wide neon stroke with a dark core, over a soft glow.
  const h = 70;
  const tube = 12;
  const letters = centred(t.mark.join(''), 120, 136, h, 0.5);
  body += glow(letters, tube + 7);
  body += ink(letters, pal.main, tube);
  body += ink(letters, DARK, tube - 6.5);

  const inset = shape.inset;
  body += `<path d="M${inset} 154H${240 - inset}" stroke="${pal.main}" stroke-opacity="0.5" stroke-width="1"/>`;
  let bitsPath = '';
  for (let i = 0; i < 12; i++) {
    if (!(t.bits & (1 << i))) continue;
    bitsPath += `M${inset + (i % 6) * 9} ${163 + Math.floor(i / 6) * 9}h6v6h-6Z`;
  }
  body += `<path d="${bitsPath}" fill="${pal.main}"/>`;
  // "ID", a dot, then the serial's number, right-aligned.
  const idH = 11;
  const num = t.serial.slice(-2);
  const right = 240 - inset;
  const numW = textWidth(num, idH);
  const idW = textWidth('ID', idH);
  const stroke = idH / 6;
  body += ink(textPath(num, right - numW, 178 - idH, idH) + textPath('ID', right - numW - 9 - idW, 178 - idH, idH), pal.main, stroke);
  body += `<rect x="${n(right - numW - 6)}" y="${n(178 - idH / 2 - 1.5)}" width="3" height="3" fill="${pal.main}"/>`;
  const [dx, dy] = shape.dot;
  body += `<path d="${circle(dx, dy, 4)}" fill="${pal.second}"/>`;
  return { outline: shape.outer, body };
}

function stamp(t: StampTag, id: string): { outline: string; body: string } {
  const pal = PALETTES[t.palette];
  const shape = STAMPS[t.shape];
  let body = `<path d="${shape.outer}" fill="${pal.main}"/>`;
  body += `<path d="${shape.inner}" fill="${DARK}"/>`;
  body += ink(textPath(t.serial, 41, 39, 10, 0.6), pal.main, 1.6);
  body += `<rect x="162" y="39" width="10" height="10" fill="${pal.second}"/>`;

  const h = 66;
  body += ink(centred(t.mark.join(''), 102, 152, h, 0.4), pal.main, h / 5.6);

  const code = bars(t.barcode, 66, 102).map(([y, w]) => `M180 ${n(y)}h22v${n(w)}h-22Z`).join('');
  body += `<path d="${code}" fill="${pal.main}"/>`;

  body += `<clipPath id="${id}-ft"><path d="${shape.inner}"/></clipPath>`;
  let footer = '';
  if (t.footer === 'stripes') footer = stripes(30, 176, 210, 210);
  else for (let i = 0, x = 40; x <= 200; i++, x += 6) footer += `M${x} ${i % 5 ? 192 : 180}h2.5V206h-2.5Z`;
  body += `<path d="${footer}" fill="${pal.main}" clip-path="url(#${id}-ft)"/>`;
  return { outline: shape.outer, body };
}

export function renderInsignia(t: Insignia, { size, backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  const id = `in${fnv1a(JSON.stringify(t))}`;
  const { outline, body } = t.style === 'hazard' ? hazard(t, id) : t.style === 'neon' ? neon(t) : stamp(t, id);
  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"${dims}>` +
    (backdrop === 'dark' ? `<path d="${outline}" fill="none" stroke="${escapeXml(rim)}" stroke-width="6" stroke-linejoin="round"/>` : '') +
    body +
    `</svg>`
  );
}
