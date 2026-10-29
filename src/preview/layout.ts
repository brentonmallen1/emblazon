import { escapeXml } from '../core/svg.ts';

/** Shared page shell for the preview pages. */
export function page(title: string, subtitle: string, body: string, script = '', module = false): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(title)}</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f5f1; --fg: #1d1c21; --muted: #6b6a70; --line: #dedcd5; --field: #fff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #16161a; --fg: #ecebe6; --muted: #9a99a0; --line: #2c2c33; --field: #1f1f25; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 96px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: -0.01em; }
  nav { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 13px; margin-bottom: 20px; color: var(--muted); }
  nav a { color: var(--muted); }
  .sub, .note { color: var(--muted); margin: 4px 0 0; }
  .note { margin: 0 0 12px; font-size: 13px; }
  section { margin-top: 40px; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 8px; margin: 0 0 16px; }
  .row { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  figure > svg:not([width]) { width: 112px; height: 112px; }
  svg { display: block; }
  figcaption { font-size: 11px; color: var(--muted); text-align: center; max-width: 140px; overflow-wrap: anywhere; }
  .swatch { width: 56px; height: 56px; border-radius: 8px; border: 1px solid var(--line); }
  .scroll { overflow-x: auto; }
  .matrix { display: grid; grid-template-columns: 116px repeat(var(--cols), auto); justify-items: center; gap: 6px 10px; align-items: center; width: max-content; }
  .head { font-size: 11px; color: var(--muted); text-align: center; }
  .rowlabel { font-size: 12px; justify-self: start; }
  .sizes { display: flex; align-items: flex-end; gap: 18px; margin-bottom: 16px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 10px 6px; }
  .grid figure { gap: 2px; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
</head>
<body>
<main>
<nav><a href="/">Try it</a><a href="/picker">Hero symbol picker</a><span>Sheets:</span><a href="/sheet/heraldry">heraldry</a><a href="/sheet/patch">patch</a><a href="/sheet/insignia">insignia</a><a href="/sheet/sigil">sigil</a><a href="/sheet/mark">mark</a><a href="/sheet/badge">badge</a></nav>
<h1>${escapeXml(title)}</h1>
<p class="sub">${escapeXml(subtitle)}</p>
${body}
</main>
${script ? `<script${module ? ' type="module"' : ''}>${script}</script>` : ''}
</body>
</html>
`;
}

export const tile = (svg: string, caption: string): string => `<figure>${svg}<figcaption>${escapeXml(caption)}</figcaption></figure>`;
export const cell = (svg: string): string => `<div class="cell">${svg}</div>`;
export const row = (items: string[]): string => `<div class="row">${items.join('')}</div>`;
export const section = (title: string, body: string): string => `<section><h2>${escapeXml(title)}</h2>${body}</section>`;

export function matrix(heads: readonly string[], rows: string[]): string {
  const head = ['<div></div>', ...heads.map((h) => `<div class="head">${escapeXml(h)}</div>`)].join('');
  return `<div class="scroll"><div class="matrix" style="--cols:${heads.length}">${head}${rows.join('')}</div></div>`;
}
