import { THEMES } from '../index.ts';
import { page } from './layout.ts';

/** Type anything, see its emblem in any theme. Talks to the same /{theme} routes an app would use. */
export function playground(): string {
  const body = `
<style>
  .try { display: grid; grid-template-columns: minmax(0, 280px) minmax(0, 1fr); gap: 32px; align-items: start; margin-top: 28px; }
  @media (max-width: 640px) { .try { grid-template-columns: 1fr; } }
  .try img { width: 100%; max-width: 280px; aspect-ratio: 1; display: block; }
  input { width: 100%; font: inherit; font-size: 16px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--field); color: var(--fg); }
  .blazon { font: italic 20px/1.4 Georgia, 'Times New Roman', serif; margin: 20px 0 8px; }
  .sizes img { width: auto; }
  pre { font-size: 12px; background: var(--field); border: 1px solid var(--line); border-radius: 8px; padding: 12px; overflow: auto; max-height: 320px; }
  button { font: inherit; font-size: 13px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--field); color: var(--fg); cursor: pointer; margin-top: 8px; }
  details summary { cursor: pointer; color: var(--muted); font-size: 13px; }
</style>
<div class="try">
  <img id="big" alt="Generated emblem">
  <div>
    <label for="input" class="note">Any string: a username, email or UUID</label>
    <input id="input" value="brenton" autocomplete="off" spellcheck="false">
    <button id="random" type="button">Random</button>
    <label class="note" style="margin-left: 12px">Theme
      <select id="theme">${Object.keys(THEMES).map((t) => `<option value="${t}">${t}</option>`).join('')}</select>
    </label>
    <label class="note" style="margin-left: 12px">Version <select id="version"></select></label>
    <p class="blazon" id="blazon"></p>
    <div class="sizes" id="sizes"></div>
    <details><summary>Config JSON</summary><pre id="json"></pre></details>
  </div>
</div>`;

  const script = `
const $ = (id) => document.getElementById(id);
const VERSIONS = ${JSON.stringify(Object.fromEntries(Object.entries(THEMES).map(([t, th]) => [t, { versions: th.versions, latest: th.latest }])))};
let timer;
function versions() {
  const { versions, latest } = VERSIONS[$('theme').value];
  $('version').innerHTML = versions.map((v) => '<option value="' + v + '"' + (v === latest ? ' selected' : '') + '>v' + v + '</option>').join('');
}
async function show(value) {
  const key = encodeURIComponent(value || ' ');
  const base = '/' + $('theme').value + '/' + key;
  const v = '?v=' + $('version').value;
  $('big').src = base + '.svg' + v;
  $('sizes').innerHTML = [32, 48, 64, 96].map((s) => '<img width="' + s + '" height="' + s + '" src="' + base + '.svg' + v + '&size=' + s + '" alt="">').join('');
  const res = await fetch(base + '.json' + v);
  const data = await res.json();
  $('blazon').textContent = data.description;
  $('json').textContent = JSON.stringify(data.config, null, 2);
}
$('input').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => show(e.target.value), 120); });
$('version').addEventListener('change', () => show($('input').value));
$('theme').addEventListener('change', () => { versions(); show($('input').value); });
versions();
$('random').addEventListener('click', () => { const v = Math.random().toString(36).slice(2, 10); $('input').value = v; show(v); });
show($('input').value);`;

  return page('emblazon', 'Deterministic emblems from any string: coats of arms and mission patches.', body, script);
}
