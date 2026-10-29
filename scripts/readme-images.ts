/**
 * Draws the README's images into docs/images/ from real emblems: a hero banner, one row per
 * theme, and a set of variants. Writes SVGs, then PNGs at 2x with rsvg-convert when it is
 * installed (brew install librsvg), since GitHub can't be relied on for SVG text rendering.
 *
 *   just readme-images
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES, emblazon, emblazonMany, type ThemeName } from '../src/index.ts';
import { LOOKS } from '../src/preview/looks.ts';

const OUT = join('docs', 'images');
const FONT = "font-family=\"'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif\"";
const themes = Object.keys(THEMES) as ThemeName[];

/** Fixed, neutral example inputs: the images never change unless the emblems do. */
const NAMES = ['ada', 'orion', 'juniper', 'kestrel', 'marlow', 'sable', 'tamsin', 'vesper', 'quill', 'rook', 'ember', 'nova'];

/** An emblem drawn on its theme's screen colour, placed into a larger SVG. */
function place(theme: ThemeName, input: string, x: number, y: number, size: number): string {
  const { svg } = emblazon(input, { theme, backdrop: 'dark', rim: LOOKS[theme].accent });
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 240 240">${inner}</svg>`;
}

const tile = (x: number, y: number, w: number, h: number, fill: string, r = 22) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const doc = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

function hero(): string {
  const [w, h] = [1280, 440];
  const picks: [ThemeName, string][] = [['heraldry', 'aldric'], ['patch', 'artemis'], ['insignia', 'nyx'], ['sigil', 'hollow'], ['eldritch', 'dagon'], ['badge', 'nova']];
  const size = 150;
  const gap = 18;
  const x0 = w - 56 - 3 * size - 2 * gap;
  let art = '';
  picks.forEach(([t, input], i) => {
    const x = x0 + (i % 3) * (size + gap);
    const y = 52 + Math.floor(i / 3) * (size + gap) + (i % 3 === 1 ? 14 : 0);
    art += tile(x, y, size, size, LOOKS[t].bg) + place(t, input, x + 18, y + 12, size - 36);
    art += `<text x="${x + size / 2}" y="${y + size - 12}" text-anchor="middle" ${FONT} font-size="11" font-weight="700" letter-spacing="1.4" fill="${LOOKS[t].accent}">${t.toUpperCase()}</text>`;
  });
  const text =
    `<text x="64" y="168" ${FONT} font-size="76" font-weight="800" letter-spacing="-2.5" fill="#ECEBE6">emblazon</text>` +
    `<text x="66" y="222" ${FONT} font-size="26" font-weight="600" fill="#E0B064">An emblem for every name.</text>` +
    `<text ${FONT} font-size="19" fill="#9A99A0"><tspan x="66" y="276">Coats of arms, mission patches, crew tags, sigils,</tspan><tspan x="66" y="304">relics and badges from any string. Same input,</tspan><tspan x="66" y="332">same emblem, forever.</tspan></text>` +
    `<text x="66" y="384" font-family="'SF Mono', Menlo, Consolas, monospace" font-size="16" fill="#ECEBE6">emblazon.mallen.us</text>`;
  const bg = `<defs><radialGradient id="glow" cx="78%" cy="40%" r="70%"><stop offset="0" stop-color="#2A2418"/><stop offset="1" stop-color="#111114"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#glow)"/>`;
  return doc(w, h, bg + text + art);
}

function themeRows(): string {
  const w = 1280;
  const row = 196;
  const per = 6;
  const size = 132;
  const left = 250;
  const step = (w - left - 40 - size) / (per - 1);
  let body = `<rect width="${w}" height="${row * themes.length + 24}" fill="#111114"/>`;
  themes.forEach((t, r) => {
    const y = 12 + r * row;
    const [mood, kind] = LOOKS[t].label.split(' · ');
    body += tile(12, y, w - 24, row - 12, LOOKS[t].bg, 18);
    body += `<circle cx="48" cy="${y + 76}" r="7" fill="${LOOKS[t].accent}"/>`;
    body += `<text x="66" y="${y + 84}" ${FONT} font-size="26" font-weight="700" fill="#ECEBE6">${t}</text>`;
    body += `<text x="48" y="${y + 116}" ${FONT} font-size="16" fill="#9A99A0">${mood}</text>`;
    body += `<text x="48" y="${y + 138}" ${FONT} font-size="16" fill="#9A99A0">${kind}</text>`;
    NAMES.slice(r, r + per).forEach((name, i) => (body += place(t, name, Math.round(left + i * step), y + 26, size)));
  });
  return doc(w, row * themes.length + 24, body);
}

function variants(): string {
  const [w, cols, size, pad] = [1280, 5, 200, 28];
  const set = emblazonMany('vesper', { theme: 'patch', count: 10, backdrop: 'dark', rim: LOOKS.patch.accent });
  const step = (w - 2 * pad - size) / (cols - 1);
  const h = 2 * (size + 16) + 2 * pad;
  let body = `<rect width="${w}" height="${h}" rx="0" fill="${LOOKS.patch.bg}"/>`;
  set.forEach((e, i) => {
    const inner = e.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const x = Math.round(pad + (i % cols) * step);
    const y = pad + Math.floor(i / cols) * (size + 16);
    body += `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 240 240">${inner}</svg>`;
  });
  return doc(w, h, body);
}

mkdirSync(OUT, { recursive: true });
const images: Record<string, string> = { hero: hero(), themes: themeRows(), variants: variants() };
for (const [name, svg] of Object.entries(images)) {
  const path = join(OUT, `${name}.svg`);
  writeFileSync(path, svg);
  try {
    execFileSync('rsvg-convert', ['--zoom', '2', '-o', join(OUT, `${name}.png`), path]);
  } catch {
    console.warn(`rsvg-convert not found: wrote ${path} only (brew install librsvg for PNGs)`);
  }
}
console.log(`wrote ${Object.keys(images).join(', ')} to ${OUT}/`);
