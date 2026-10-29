import { page } from './layout.ts';
import { LOOKS } from './looks.ts';

/**
 * A jb-rpg-style "choose your hero's symbol" picker. Everything below runs in the browser: the
 * page imports the library from /lib (the same source, types stripped) and generates locally.
 */
export function picker(): string {
  const body = `
<style>
  .stage { background: #1b120a; color: #efe3cc; border-radius: 14px; padding: 24px 20px; margin-top: 24px; max-width: 760px; }
  .stage h2 { color: #d9c08f; border: 0; padding: 0; margin: 0 0 4px; font: 600 13px/1.4 ui-serif, Georgia, serif; letter-spacing: .16em; }
  .stage .hint { color: #b9a88c; font-size: 13px; margin: 0 0 18px; }
  .opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  @media (max-width: 520px) { .opts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .opt { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; background: #0d0a0799; border: 1px solid #ffffff14; border-radius: 12px; color: inherit; font: inherit; cursor: pointer; text-align: center; }
  .opt:hover { border-color: #d9a55799; }
  .opt[aria-pressed="true"] { border-color: #d9a557; box-shadow: 0 0 0 1px #d9a557 inset; }
  .opt svg { width: 96px; height: 96px; }
  .opt span { font: italic 13px/1.35 Georgia, serif; color: #d6c8ae; min-height: 3.6em; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
  .row input { flex: 1; min-width: 180px; font: inherit; padding: 9px 11px; border-radius: 8px; border: 1px solid #ffffff22; background: #0d0a07; color: #efe3cc; }
  .row button { font: inherit; font-size: 13px; padding: 9px 12px; border-radius: 8px; border: 1px solid #d9a55766; background: transparent; color: #f0c27a; cursor: pointer; }
  .chosen { margin-top: 18px; font-size: 13px; color: #b9a88c; }
  .chosen code { color: #efe3cc; }
  .credit { margin-top: 14px; font-size: 11px; color: #8f8370; }
</style>
<div class="stage">
  <h2>THE HERO'S SYMBOL</h2>
  <p class="hint">Generated in this browser from the hero's name. Same name, same choices.</p>
  <div class="row">
    <label class="visually-hidden" for="hero">Hero name</label>
    <input id="hero" value="Wren Hollowmere" autocomplete="off" spellcheck="false" aria-label="Hero name">
    <button id="reroll" type="button">Other symbols</button>
    <label class="visually-hidden" for="theme">Theme</label>
    <select id="theme" aria-label="Theme" style="font: inherit; padding: 8px; border-radius: 8px; background: #0d0a07; color: #efe3cc; border: 1px solid #ffffff22">
      ${Object.entries(LOOKS).map(([t, l]) => `<option value="${t}">${l.label}</option>`).join('')}
    </select>
  </div>
  <div class="opts" id="opts"></div>
  <p class="chosen" id="chosen">Tap a symbol to choose it.</p>
  <p class="credit" id="credit"></p>
</div>`;

  const script = `
import { emblazonOptions, ATTRIBUTION } from '/lib/index.js';
const $ = (id) => document.getElementById(id);
// jb-rpg's screen for each theme: background and accent.
const LOOKS = ${JSON.stringify(LOOKS)};
let roll = 0;
function deal() {
  const seed = 'demo-session:' + $('hero').value + (roll ? ':' + roll : '');
  const theme = $('theme').value;
  const look = LOOKS[theme];
  document.querySelector('.stage').style.background = look.bg;
  const t0 = performance.now();
  const options = emblazonOptions(seed, { theme, count: 6, backdrop: 'dark', rim: look.accent, animate: theme === 'eldritch' });
  const ms = (performance.now() - t0).toFixed(1);
  $('opts').innerHTML = '';
  for (const e of options) {
    const b = document.createElement('button');
    b.className = 'opt';
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = e.svg + '<span></span>';
    b.querySelector('span').textContent = e.description;
    b.addEventListener('click', () => {
      for (const o of $('opts').children) o.setAttribute('aria-pressed', String(o === b));
      $('chosen').innerHTML = 'Store: <code></code>';
      $('chosen').querySelector('code').textContent = JSON.stringify({ theme: e.theme, input: e.input, version: e.version });
    });
    $('opts').appendChild(b);
  }
  $('chosen').textContent = 'Tap a symbol to choose it. (' + options.length + ' generated in ' + ms + ' ms, in this browser)';
}
$('hero').addEventListener('input', () => { roll = 0; deal(); });
$('reroll').addEventListener('click', () => { roll++; deal(); });
$('theme').addEventListener('change', () => { roll = 0; deal(); });
$('credit').textContent = ATTRIBUTION;
deal();`;

  return page('Hero symbol picker', 'What jb-rpg could show after character creation: emblazonOptions() running client-side.', body, script, true);
}
