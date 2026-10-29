import { THEMES } from '../index.ts';
import { page } from './layout.ts';
import { LOOKS } from './looks.ts';

/** Type anything, see its emblem in any theme. Talks to the same /{theme} routes an app would use. */
export function playground(): string {
  const chips = Object.entries(LOOKS)
    .map(([t, l]) => {
      const [mood, kind] = l.label.split(' · ');
      return `<button type="button" class="chip" data-theme="${t}" role="radio" aria-checked="false" style="--accent:${l.accent}"><b>${t}</b><span>${mood} · ${kind}</span></button>`;
    })
    .join('');

  const body = `
<style>
  .try { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 36px; align-items: start; margin-top: 28px; }
  @media (max-width: 720px) { .try { grid-template-columns: 1fr; } }
  .stage { border-radius: 18px; padding: 28px 24px 20px; background: var(--field); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 18px; transition: background .25s; }
  .stage.dark { border-color: transparent; }
  .stage img.big { width: 100%; max-width: 280px; aspect-ratio: 1; display: block; }
  .sizes { display: flex; align-items: flex-end; gap: 14px; margin: 0; }
  .sizes img { display: block; }
  .field { display: flex; gap: 8px; }
  input[type=text] { flex: 1; min-width: 0; font: inherit; font-size: 16px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--field); color: var(--fg); }
  input[type=text]:focus { outline: 2px solid var(--accent, #7a7a90); outline-offset: 1px; }
  button { font: inherit; font-size: 13px; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--field); color: var(--fg); cursor: pointer; }
  button:hover { border-color: var(--muted); }
  .label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 20px 0 8px; }
  .label:first-child { margin-top: 0; }
  .themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .chip { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 10px 8px 14px; text-align: left; border-left: 4px solid var(--accent); }
  .chip b { font-weight: 600; text-transform: capitalize; }
  .chip span { font-size: 11px; color: var(--muted); }
  .chip[aria-checked="true"] { background: color-mix(in srgb, var(--accent) 14%, var(--field)); border-color: var(--accent); }
  .opts { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; font-size: 13px; color: var(--muted); }
  .opts select { font: inherit; font-size: 13px; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--field); color: var(--fg); }
  .opts label { display: inline-flex; align-items: center; gap: 6px; }
  .blazon { font: italic 19px/1.4 Georgia, 'Times New Roman', serif; margin: 20px 0 0; min-height: 1.4em; }
  .url { display: flex; gap: 8px; align-items: center; margin-top: 10px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
  .url code { padding: 3px 6px; border-radius: 5px; background: var(--field); border: 1px solid var(--line); color: var(--fg); overflow-wrap: anywhere; }
  .url button { padding: 4px 8px; font-size: 12px; }
  details { margin-top: 14px; }
  details summary { cursor: pointer; color: var(--muted); font-size: 13px; }
  pre { font-size: 12px; background: var(--field); border: 1px solid var(--line); border-radius: 8px; padding: 12px; overflow: auto; max-height: 320px; margin: 8px 0 0; }
</style>
<div class="try">
  <div class="stage" id="stage">
    <img id="big" class="big" alt="Generated emblem">
    <div class="sizes" id="sizes" aria-label="At avatar sizes"></div>
  </div>
  <div>
    <label class="label" for="input">Any string: a username, email or UUID</label>
    <div class="field">
      <input id="input" type="text" value="brenton" autocomplete="off" spellcheck="false">
      <button id="random" type="button">Random</button>
    </div>
    <span class="label" id="themes-label">Theme</span>
    <div class="themes" role="radiogroup" aria-labelledby="themes-label" id="themes">${chips}</div>
    <span class="label">Options</span>
    <div class="opts">
      <label>Version <select id="version"></select></label>
      <label><input type="checkbox" id="dark" checked> On the theme's screen colour</label>
    </div>
    <p class="blazon" id="blazon"></p>
    <div class="url"><code id="url"></code><button id="copy" type="button">Copy URL</button></div>
    <details><summary>Config JSON</summary><pre id="json"></pre></details>
  </div>
</div>`;

  const script = `
const $ = (id) => document.getElementById(id);
const VERSIONS = ${JSON.stringify(Object.fromEntries(Object.entries(THEMES).map(([t, th]) => [t, { versions: th.versions, latest: th.latest }])))};
const LOOKS = ${JSON.stringify(LOOKS)};
let theme = location.hash.slice(1) in LOOKS ? location.hash.slice(1) : 'heraldry';
let timer;
function pickTheme(t) {
  theme = t;
  for (const c of $('themes').children) c.setAttribute('aria-checked', String(c.dataset.theme === t));
  document.documentElement.style.setProperty('--accent', LOOKS[t].accent);
  history.replaceState(null, '', '#' + t);
  const { versions, latest } = VERSIONS[t];
  $('version').innerHTML = versions.map((v) => '<option value="' + v + '"' + (v === latest ? ' selected' : '') + '>v' + v + '</option>').join('');
}
async function show(value) {
  const key = encodeURIComponent(value || ' ');
  const base = '/' + theme + '/' + key;
  const dark = $('dark').checked;
  const look = LOOKS[theme];
  const query = '?v=' + $('version').value + (dark ? '&backdrop=dark&rim=' + encodeURIComponent(look.accent) : '');
  $('stage').classList.toggle('dark', dark);
  $('stage').style.background = dark ? look.bg : '';
  $('big').src = base + '.svg' + query;
  $('sizes').innerHTML = [32, 48, 64, 96].map((s) => '<img width="' + s + '" height="' + s + '" src="' + base + '.svg' + query + '&size=' + s + '" alt="">').join('');
  $('url').textContent = base + '.svg?v=' + $('version').value;
  const res = await fetch(base + '.json?v=' + $('version').value);
  const data = await res.json();
  $('blazon').textContent = data.description;
  $('json').textContent = JSON.stringify(data.config, null, 2);
}
const refresh = () => show($('input').value);
$('input').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 120); });
$('version').addEventListener('change', refresh);
$('dark').addEventListener('change', refresh);
$('themes').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { pickTheme(c.dataset.theme); refresh(); } });
$('random').addEventListener('click', () => { $('input').value = Math.random().toString(36).slice(2, 10); refresh(); });
$('copy').addEventListener('click', async () => { await navigator.clipboard.writeText(location.origin + $('url').textContent); $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy URL'), 1200); });
pickTheme(theme);
refresh();`;

  return page('emblazon', 'Deterministic emblems from any string, in six themes. Same input, same emblem, forever.', body, script);
}
