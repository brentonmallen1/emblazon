import { escapeXml } from '../core/svg.ts';
import { THEMES, type ThemeName } from '../index.ts';
import { LOOKS } from './looks.ts';

export interface PageOptions {
  /** Skip the title block: the page draws its own hero. */
  bare?: boolean;
}

/** The small shield in the header. */
const MARK = `<svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true"><path d="M1 2h20v9c0 6-4.4 10-10 12C5.4 21 1 17 1 11Z" fill="var(--brand)"/><path d="M11 6v13M6 11h10" stroke="var(--bg)" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/** Shared page shell for the site: header, title block, body, footer. */
export function page(title: string, subtitle: string, body: string, script = '', module = false, { bare = false }: PageOptions = {}): string {
  const themeLinks = Object.keys(THEMES)
    .map((t) => `<a href="/sheet/${t}" role="menuitem"><i style="background:${LOOKS[t as ThemeName].accent}"></i><span><b>${t}</b><small>${escapeXml(LOOKS[t as ThemeName].label)}</small></span></a>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(title)}</title>
<meta name="description" content="${escapeXml(subtitle)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 24"><path d="M1 2h20v9c0 6-4.4 10-10 12C5.4 21 1 17 1 11Z" fill="#c9963f"/></svg>')}">
<style>
  :root {
    color-scheme: light dark;
    --bg: #f7f6f2; --surface: #ffffff; --soft: #efede7; --fg: #17161b; --muted: #66656c; --line: #e3e1da; --field: #fff;
    --brand: #b7852f; --code: #f1efe9;
    --radius: 14px; --shadow: 0 1px 2px rgb(20 18 10 / .05), 0 8px 24px -12px rgb(20 18 10 / .18);
    --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #111114; --surface: #18181d; --soft: #222229; --fg: #ecebe6; --muted: #9a99a0; --line: #2a2a31; --field: #1c1c22; --brand: #e0b064; --code: #1c1c22; --shadow: 0 1px 2px rgb(0 0 0 / .3), 0 12px 32px -16px rgb(0 0 0 / .6); }
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 84px; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { transition: none !important; animation: none !important; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 6px; }
  code, pre, kbd { font-family: var(--mono); font-size: .88em; }
  :not(pre) > code { background: var(--code); border: 1px solid var(--line); padding: .1em .38em; border-radius: 6px; }
  pre { background: var(--code); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; overflow: auto; line-height: 1.5; margin: 0; }

  /* Header */
  .top { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px); border-bottom: 1px solid var(--line); }
  .top-in { max-width: 1180px; margin: 0 auto; padding: 0 16px; min-height: 62px; display: flex; align-items: center; gap: 12px 24px; flex-wrap: wrap; }
  .brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 700; font-size: 17px; letter-spacing: -.01em; text-decoration: none; }
  .links { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; margin-left: auto; }
  .links > a, .menu > summary { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 9px; color: var(--muted); text-decoration: none; font-weight: 500; font-size: 14px; cursor: pointer; transition: background .15s, color .15s; }
  .links > a:hover, .menu > summary:hover, .menu[open] > summary { background: var(--soft); color: var(--fg); }
  .links > a[aria-current="page"], .menu.current > summary { color: var(--fg); background: var(--soft); }
  .menu { position: relative; }
  .menu > summary { list-style: none; }
  .menu > summary::-webkit-details-marker { display: none; }
  .menu > summary::after { content: ''; width: 6px; height: 6px; border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: translateY(-2px) rotate(45deg); transition: transform .15s; }
  .menu[open] > summary::after { transform: translateY(1px) rotate(225deg); }
  .menu-panel { position: absolute; right: 0; top: calc(100% + 8px); width: 280px; padding: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); display: grid; }
  .menu-panel a { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 8px; text-decoration: none; }
  .menu-panel a:hover { background: var(--soft); }
  .menu-panel i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .menu-panel b { display: block; font-weight: 600; text-transform: capitalize; font-size: 14px; }
  .menu-panel small { display: block; color: var(--muted); font-size: 12px; }
  .links .btn { margin-left: 8px; }
  @media (max-width: 640px) { .top-in { padding-top: 10px; } .links { margin-left: -12px; width: calc(100% + 12px); padding-bottom: 8px; } .links .btn { display: none; } .menu-panel { left: 0; right: auto; } }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); font: 600 14px/1 inherit; font-family: inherit; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, transform .1s; }
  .btn:hover { background: var(--soft); border-color: color-mix(in srgb, var(--muted) 45%, var(--line)); }
  .btn:active { transform: translateY(1px); }
  .btn-primary { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .btn-primary:hover { background: color-mix(in srgb, var(--fg) 86%, var(--bg)); border-color: transparent; }
  .btn-sm { height: 32px; padding: 0 12px; font-size: 13px; border-radius: 8px; }
  .btn-lg { height: 48px; padding: 0 22px; font-size: 15px; border-radius: 12px; }

  /* Page */
  main { max-width: 1180px; margin: 0 auto; padding: 40px 16px 96px; }
  main.bare { padding-top: 0; }
  .page-head { margin-bottom: 8px; }
  h1 { font-size: clamp(26px, 3.4vw, 34px); line-height: 1.15; margin: 0; letter-spacing: -.02em; }
  .sub { color: var(--muted); margin: 8px 0 0; font-size: 16px; max-width: 64ch; }
  .note { color: var(--muted); margin: 0 0 12px; font-size: 13px; }
  section { margin-top: 44px; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 8px; margin: 0 0 16px; }
  .foot { border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
  .foot-in { max-width: 1180px; margin: 0 auto; padding: 28px 16px 40px; display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; }
  .foot a { color: var(--muted); }
  .foot a:hover { color: var(--fg); }
  .foot nav { display: flex; gap: 18px; flex-wrap: wrap; }

  /* Contact sheets */
  .row { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  figure > svg:not([width]) { width: 112px; height: 112px; }
  svg { display: block; }
  figcaption { font-size: 11px; color: var(--muted); text-align: center; max-width: 140px; overflow-wrap: anywhere; }
  .swatch { width: 56px; height: 56px; border-radius: 8px; border: 1px solid var(--line); }
  .scroll { overflow-x: auto; }
  .matrix { display: grid; grid-template-columns: 116px repeat(var(--cols), auto); justify-items: center; gap: 6px 10px; align-items: center; width: max-content; }
  .matrix .head { font-size: 11px; color: var(--muted); text-align: center; }
  .rowlabel { font-size: 12px; justify-self: start; }
  .sizes { display: flex; align-items: flex-end; gap: 18px; margin-bottom: 16px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 10px 6px; }
  .grid figure { gap: 2px; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
</head>
<body>
<header class="top">
  <div class="top-in">
    <a class="brand" href="/">${MARK}emblazon</a>
    <nav class="links" aria-label="Main">
      <a href="/#try">Playground</a>
      <details class="menu" id="themes-menu"><summary>Themes</summary><div class="menu-panel" role="menu">${themeLinks}</div></details>
      <a href="/picker">Picker</a>
      <a href="/docs">API</a>
      <a class="btn btn-primary btn-sm" href="/#try">Try it</a>
    </nav>
  </div>
</header>
<main${bare ? ' class="bare"' : ''}>
${bare ? '' : `<div class="page-head"><h1>${escapeXml(title)}</h1><p class="sub">${escapeXml(subtitle)}</p></div>`}
${body}
</main>
<footer class="foot"><div class="foot-in">
  <span>emblazon · deterministic emblems from any string. Some heraldic charges adapted from <a href="https://game-icons.net">game-icons.net</a> (CC BY 3.0).</span>
  <nav aria-label="Footer"><a href="/docs">API docs</a><a href="/api/v1/openapi.json">OpenAPI</a><a href="/picker">Picker</a></nav>
</div></footer>
<script>
(() => {
  const here = location.pathname;
  for (const a of document.querySelectorAll('.links > a:not(.btn)')) if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  const menu = document.getElementById('themes-menu');
  if (here.startsWith('/sheet/')) menu.classList.add('current');
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
})();
</script>
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

/** An SVG as an <img> source: no clashing ids between emblems on one page. */
export const svgUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;
