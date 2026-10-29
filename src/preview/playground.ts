import { escapeXml } from '../core/svg.ts';
import { MAX_VARIANTS, THEMES, emblazon, emblazonMany, type ThemeName } from '../index.ts';
import { page, svgUri } from './layout.ts';
import { LOOKS } from './looks.ts';

/** The hero's mosaic: one emblem per theme, from names that suit it. */
const HERO: readonly [ThemeName, string][] = [
  ['heraldry', 'aldric'],
  ['patch', 'artemis'],
  ['insignia', 'nyx'],
  ['sigil', 'hollow'],
  ['eldritch', 'dagon'],
  ['badge', 'brenton'],
];

const onScreen = (t: ThemeName) => ({ backdrop: 'dark' as const, rim: LOOKS[t].accent });
const img = (svg: string, alt: string, extra = '') => `<img src="${svgUri(svg)}" alt="${escapeXml(alt)}"${extra}>`;

/** The home page: hero, the playground, every theme, and a pointer to the API. */
export function playground(origin: string): string {
  const themes = Object.keys(THEMES) as ThemeName[];

  const mosaic = HERO.map(([t, input]) => {
    const e = emblazon(input, { theme: t, ...onScreen(t) });
    return `<a class="tile" href="/?theme=${t}&input=${encodeURIComponent(input)}#try" style="--tbg:${LOOKS[t].bg};--accent:${LOOKS[t].accent}">${img(e.svg, e.description)}<span>${t}</span></a>`;
  }).join('');

  const chips = themes
    .map((t) => {
      const [mood, kind] = LOOKS[t].label.split(' · ');
      return `<button type="button" class="chip" data-theme="${t}" role="radio" aria-checked="false" style="--accent:${LOOKS[t].accent}"><i></i><span><b>${t}</b><small>${mood} · ${kind}</small></span></button>`;
    })
    .join('');

  const counts = Array.from({ length: MAX_VARIANTS }, (_, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-count="${i + 1}">${i + 1}</button>`).join('');

  const gallery = themes
    .map((t) => {
      const set = emblazonMany(t === 'patch' ? 'odyssey' : t === 'sigil' ? 'thorn' : `${t}-gallery`, { theme: t, count: 3, ...onScreen(t) });
      const [mood, kind] = LOOKS[t].label.split(' · ');
      return `<article class="theme" style="--tbg:${LOOKS[t].bg};--accent:${LOOKS[t].accent}">
  <div class="theme-art">${set.map((e) => img(e.svg, e.description, ' loading="lazy"')).join('')}</div>
  <div class="theme-text"><h3>${t}</h3><p>${escapeXml(mood)} · ${escapeXml(kind)}</p>
  <div class="theme-links"><a href="/?theme=${t}#try">Try it</a><a href="/sheet/${t}">Contact sheet <span aria-hidden="true">→</span></a></div></div>
</article>`;
    })
    .join('');

  const sample = emblazonMany('brenton', { theme: 'patch', count: 2 });
  const sampleJson = JSON.stringify(
    {
      theme: 'patch',
      version: sample[0].version,
      input: 'brenton',
      count: 2,
      emblems: sample.map((e) => ({ input: e.input, version: e.version, description: e.description, url: `${origin}/patch/${encodeURIComponent(e.input)}.svg?v=${e.version}`, config: '{…}', svg: '<svg …>' })),
    },
    null,
    2,
  );

  const body = `
<style>
  /* Hero */
  .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 48px; align-items: center; padding: 72px 0 56px; }
  @media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 36px; padding: 44px 0 32px; } }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 99px; background: var(--surface); border: 1px solid var(--line); font-size: 13px; color: var(--muted); font-weight: 500; }
  .eyebrow b { color: var(--brand); font-weight: 600; }
  .hero h1 { font-size: clamp(38px, 5.6vw, 64px); line-height: 1.02; letter-spacing: -.035em; margin: 20px 0 0; font-weight: 750; }
  .hero h1 em { font-style: normal; color: var(--brand); }
  .lede { font-size: clamp(16px, 1.6vw, 19px); color: var(--muted); margin: 20px 0 0; max-width: 46ch; line-height: 1.55; }
  .ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 30px; }
  .hero-code { margin-top: 26px; font-family: var(--mono); font-size: 13px; color: var(--muted); }
  .hero-code b { color: var(--fg); font-weight: 500; }
  .mosaic { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .tile { position: relative; aspect-ratio: 1; border-radius: 20px; background: var(--tbg); display: grid; place-items: center; padding: 10% 16% 22%; text-decoration: none; box-shadow: var(--shadow); transition: transform .2s, box-shadow .2s; }
  .tile:nth-child(3n+2) { transform: translateY(18px); }
  .tile:hover { transform: translateY(-4px); }
  .tile:nth-child(3n+2):hover { transform: translateY(14px); }
  .tile img { width: 100%; height: 100%; }
  .tile span { position: absolute; left: 0; right: 0; text-align: center; bottom: 8%; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); opacity: .85; }

  /* Section heads */
  .sec { margin-top: 72px; }
  .sec-head { display: flex; justify-content: space-between; align-items: end; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
  .sec-head h2 { all: unset; display: block; font-size: clamp(24px, 2.6vw, 30px); font-weight: 700; letter-spacing: -.02em; }
  .sec-head p { margin: 6px 0 0; color: var(--muted); max-width: 60ch; }

  /* Playground */
  .try { display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 860px) { .try { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
  .controls { padding: 20px; }
  .label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin: 22px 0 8px; }
  .label:first-child { margin-top: 0; }
  .field { display: flex; gap: 8px; }
  .field input { flex: 1; min-width: 0; height: 44px; font: inherit; font-size: 16px; padding: 0 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--field); color: var(--fg); transition: border-color .15s, box-shadow .15s; }
  .field input:focus { outline: none; border-color: var(--accent, var(--brand)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, var(--brand)) 25%, transparent); }
  .field .btn { height: 44px; }
  .chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .chip { display: flex; gap: 10px; align-items: center; padding: 9px 10px; text-align: left; font: inherit; color: var(--fg); background: var(--field); border: 1px solid var(--line); border-radius: 10px; cursor: pointer; transition: border-color .15s, background .15s; }
  .chip:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--line)); }
  .chip i { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex: none; }
  .chip b { display: block; font-weight: 600; font-size: 14px; text-transform: capitalize; }
  .chip small { display: block; font-size: 11.5px; color: var(--muted); line-height: 1.3; }
  .chip[aria-checked="true"] { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, var(--field)); box-shadow: inset 0 0 0 1px var(--accent); }
  .seg { display: grid; grid-template-columns: repeat(var(--segs), minmax(0, 1fr)); padding: 3px; gap: 2px; background: var(--soft); border-radius: 10px; }
  .seg button { height: 34px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--muted); font: 600 14px/1 inherit; font-family: inherit; cursor: pointer; }
  .seg button:hover { color: var(--fg); }
  .seg button[aria-checked="true"] { background: var(--surface); color: var(--fg); box-shadow: 0 1px 3px rgb(0 0 0 / .15); }
  .hint { font-size: 12.5px; color: var(--muted); margin: 8px 0 0; }
  .toggle { display: flex; align-items: center; gap: 10px; margin-top: 18px; font-size: 14px; cursor: pointer; }
  .toggle input { width: 16px; height: 16px; accent-color: var(--accent, var(--brand)); }
  .adv { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 14px; }
  .adv summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--muted); list-style: none; display: flex; align-items: center; gap: 8px; }
  .adv summary::-webkit-details-marker { display: none; }
  .adv summary::before { content: ''; width: 6px; height: 6px; border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: rotate(-45deg); transition: transform .15s; }
  .adv[open] summary::before { transform: rotate(45deg); }
  .adv summary:hover { color: var(--fg); }
  .adv-body { padding-top: 12px; display: grid; gap: 10px; font-size: 14px; }
  .adv-body label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .adv-body select { font: inherit; font-size: 14px; height: 34px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--field); color: var(--fg); }

  .out { overflow: hidden; }
  .stage { background: var(--soft); padding: 28px; display: grid; gap: 14px; grid-template-columns: repeat(var(--n, 1), minmax(0, 1fr)); transition: background .25s; align-items: center; }
  .stage[data-n="1"] { min-height: 280px; }
  .stage { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; }
  .stage > .result { flex: 0 0 calc((100% - 28px) / 3); }
  .stage[data-n="1"] > .result { flex-basis: min(300px, 100%); }
  .stage[data-n="2"] > .result, .stage[data-n="4"] > .result { flex-basis: min(220px, calc((100% - 14px) / 2)); }
  .stage[data-n="7"] > .result, .stage[data-n="8"] > .result { flex-basis: calc((100% - 42px) / 4); }
  .stage[data-n="10"] > .result { flex-basis: calc((100% - 56px) / 5); }
  .stage[data-n="7"], .stage[data-n="8"], .stage[data-n="10"] { padding: 22px 18px; }
  .stage[data-n="7"] .result, .stage[data-n="8"] .result, .stage[data-n="10"] .result { padding: 4px; border-radius: 12px; }
  .result { padding: 8px; border: 2px solid transparent; border-radius: 16px; background: none; cursor: pointer; transition: border-color .15s, background .15s; }
  .result:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .result[aria-pressed="true"] { border-color: var(--accent); }
  .stage[data-n="1"] .result { cursor: default; border-color: transparent; background: none; }
  .result img { width: 100%; aspect-ratio: 1; display: block; }
  .stage .msg { grid-column: 1 / -1; text-align: center; color: var(--muted); }
  .detail { padding: 20px 22px 22px; border-top: 1px solid var(--line); }
  .blazon { font: italic 20px/1.4 Georgia, 'Times New Roman', serif; margin: 0; min-height: 1.4em; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin-top: 10px; color: var(--muted); font-size: 13px; }
  .sizes-row { display: flex; align-items: flex-end; gap: 14px; margin-top: 18px; padding: 14px; border-radius: 12px; background: var(--soft); width: max-content; max-width: 100%; transition: background .25s; }
  .sizes-row img { display: block; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .json { margin-top: 14px; }
  .json summary { cursor: pointer; color: var(--muted); font-size: 13px; }
  .json pre { margin-top: 8px; max-height: 320px; font-size: 12px; }

  /* Gallery */
  .themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .theme { border-radius: var(--radius); overflow: hidden; border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow); }
  .theme-art { background: var(--tbg); display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 22px 18px; }
  .theme-art img { width: 100%; aspect-ratio: 1; }
  .theme-text { padding: 14px 18px 16px; }
  .theme-text h3 { margin: 0; font-size: 17px; text-transform: capitalize; display: flex; align-items: center; gap: 8px; }
  .theme-text h3::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }
  .theme-text p { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
  .theme-links { display: flex; gap: 16px; margin-top: 12px; font-size: 14px; font-weight: 600; }
  .theme-links a { text-decoration: none; }
  .theme-links a:hover { text-decoration: underline; text-underline-offset: 3px; }

  /* API teaser */
  .api { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 32px; align-items: center; padding: 32px; }
  @media (max-width: 860px) { .api { grid-template-columns: 1fr; padding: 22px; } }
  .api h2 { all: unset; display: block; font-size: clamp(24px, 2.6vw, 30px); font-weight: 700; letter-spacing: -.02em; }
  .api p { color: var(--muted); margin: 10px 0 0; }
  .api ul { margin: 16px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; font-size: 14px; }
  .api li::before { content: '✓'; color: var(--brand); font-weight: 700; margin-right: 8px; }
  .api pre { font-size: 12.5px; max-height: 340px; }
  .api .req { color: var(--brand); }
</style>

<section class="hero" aria-labelledby="hero-title">
  <div>
    <span class="eyebrow"><b>Six themes</b> · no dependencies · free API</span>
    <h1 id="hero-title">An emblem for <em>every name.</em></h1>
    <p class="lede">Turn any string into a coat of arms, a mission patch, a crew tag, a sigil, a relic or a badge. The same input gives the same emblem, forever.</p>
    <div class="ctas"><a class="btn btn-primary btn-lg" href="#try">Try it now</a><a class="btn btn-lg" href="/docs">Read the API docs</a></div>
    <p class="hero-code">GET <b>/patch/artemis.svg</b></p>
  </div>
  <div class="mosaic">${mosaic}</div>
</section>

<section class="sec" id="try" aria-labelledby="try-title">
  <div class="sec-head"><div><h2 id="try-title">Playground</h2><p>Type a name and pick a theme. Ask for up to ${MAX_VARIANTS} images to see the fixed variants for that name.</p></div></div>
  <div class="try">
    <div class="card controls">
      <label class="label" for="input">Any string</label>
      <div class="field">
        <input id="input" type="text" value="brenton" autocomplete="off" spellcheck="false" placeholder="A username, email or UUID">
        <button id="random" class="btn" type="button" title="Random input">Shuffle</button>
      </div>
      <span class="label" id="themes-label">Theme</span>
      <div class="chips" role="radiogroup" aria-labelledby="themes-label" id="themes">${chips}</div>
      <span class="label" id="count-label">Images</span>
      <div class="seg" role="radiogroup" aria-labelledby="count-label" id="count" style="--segs:${MAX_VARIANTS}">${counts}</div>
      <p class="hint">The first is always the emblem for this exact input. The others are its variants, the same every time.</p>
      <label class="toggle"><input type="checkbox" id="dark" checked> Show on the theme's screen colour</label>
      <details class="adv">
        <summary>Advanced</summary>
        <div class="adv-body">
          <label>Theme version <select id="version"></select></label>
          <p class="hint" style="margin:0">Older versions are frozen. Pin one if stored emblems must never change.</p>
        </div>
      </details>
    </div>
    <div class="card out">
      <div class="stage" id="stage" data-n="1" aria-live="polite"></div>
      <div class="detail">
        <p class="blazon" id="blazon"></p>
        <div class="meta"><span>input <code id="used"></code></span><span id="ver"></span></div>
        <div class="sizes-row" id="sizes" aria-label="At avatar sizes"></div>
        <div class="actions">
          <button class="btn btn-sm" id="copy" type="button">Copy image URL</button>
          <button class="btn btn-sm" id="copysvg" type="button">Copy SVG</button>
          <a class="btn btn-sm" id="download" download="emblem.svg">Download SVG</a>
        </div>
        <details class="json"><summary>Config JSON</summary><pre id="json"></pre></details>
      </div>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="themes-title">
  <div class="sec-head"><div><h2 id="themes-title">Six themes</h2><p>Each made for one of jb-rpg's settings, drawn flat for dark screens.</p></div></div>
  <div class="themes">${gallery}</div>
</section>

<section class="sec">
  <div class="card api">
    <div>
      <h2>Call it from anywhere</h2>
      <p>One GET request returns up to ${MAX_VARIANTS} emblems with descriptions, version-pinned image URLs and SVG markup. No keys, no state.</p>
      <ul><li>Deterministic and cacheable forever when pinned</li><li>CORS enabled for browser apps</li><li>OpenAPI description included</li></ul>
      <div class="ctas"><a class="btn btn-primary" href="/docs">API docs</a><a class="btn" href="/api/v1/openapi.json">OpenAPI JSON</a></div>
    </div>
    <pre><span class="req">GET ${escapeXml(origin)}/api/v1/emblems?input=brenton&amp;theme=patch&amp;count=2</span>

${escapeXml(sampleJson)}</pre>
  </div>
</section>`;

  const script = `
const $ = (id) => document.getElementById(id);
const VERSIONS = ${JSON.stringify(Object.fromEntries(Object.entries(THEMES).map(([t, th]) => [t, { versions: th.versions, latest: th.latest }])))};
const LOOKS = ${JSON.stringify(LOOKS)};
const q = new URLSearchParams(location.search);
let theme = q.get('theme') in LOOKS ? q.get('theme') : 'heraldry';
let count = Math.min(${MAX_VARIANTS}, Math.max(1, Number(q.get('count')) || 1));
if (q.get('input')) $('input').value = q.get('input');
let emblems = [], selected = 0, timer, ticket = 0;
const uri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);

function pickTheme(t) {
  theme = t;
  for (const c of $('themes').children) c.setAttribute('aria-checked', String(c.dataset.theme === t));
  document.documentElement.style.setProperty('--accent', LOOKS[t].accent);
  const { versions, latest } = VERSIONS[t];
  $('version').innerHTML = versions.slice().reverse().map((v) => '<option value="' + v + '"' + (v === latest ? ' selected' : '') + '>v' + v + (v === latest ? ' (latest)' : '') + '</option>').join('');
}
function pickCount(n) {
  count = n;
  for (const b of $('count').children) b.setAttribute('aria-checked', String(Number(b.dataset.count) === n));
}
function remember() {
  const p = new URLSearchParams({ theme, input: $('input').value });
  if (count > 1) p.set('count', count);
  history.replaceState(null, '', '/?' + p + location.hash);
}
function select(i) {
  selected = i;
  const e = emblems[i];
  if (!e) return;
  for (const [k, b] of [...$('stage').querySelectorAll('.result')].entries()) b.setAttribute('aria-pressed', String(k === i));
  $('blazon').textContent = e.description;
  $('used').textContent = e.input;
  $('ver').textContent = e.theme + ' v' + e.version;
  $('sizes').innerHTML = [32, 48, 64, 96].map((s) => '<img width="' + s + '" height="' + s + '" src="' + uri(e.svg) + '" alt="">').join('');
  $('json').textContent = JSON.stringify(e.config, null, 2);
  $('download').href = uri(e.svg);
  $('download').download = e.theme + '-' + e.input.replace(/[^\\w-]+/g, '_') + '.svg';
}
async function show() {
  const value = $('input').value;
  const dark = $('dark').checked;
  const look = LOOKS[theme];
  $('stage').style.background = dark ? look.bg : '';
  $('sizes').style.background = dark ? look.bg : '';
  remember();
  if (!value.trim()) { emblems = []; $('stage').dataset.n = 1; $('stage').innerHTML = '<p class="msg">Type something to see its emblem.</p>'; $('blazon').textContent = ''; return; }
  const p = new URLSearchParams({ input: value, theme, count, v: $('version').value });
  if (dark) { p.set('backdrop', 'dark'); p.set('rim', look.accent); }
  const mine = ++ticket;
  try {
    const res = await fetch('/api/v1/emblems?' + p);
    const data = await res.json();
    if (mine !== ticket) return;
    if (!res.ok) throw new Error(data.error?.message ?? res.statusText);
    emblems = data.emblems;
    const n = emblems.length;
    $('stage').dataset.n = n;
    $('stage').style.setProperty('--n', n);
    $('stage').innerHTML = emblems.map((e, i) => '<button type="button" class="result" aria-pressed="false" aria-label="Emblem ' + (i + 1) + ': ' + e.description.replace(/"/g, '&quot;') + '"><img src="' + uri(e.svg) + '" alt=""></button>').join('');
    select(Math.min(selected, n - 1));
  } catch (err) {
    if (mine !== ticket) return;
    $('stage').innerHTML = '<p class="msg">' + String(err.message).replace(/</g, '&lt;') + '</p>';
  }
}
async function copy(btn, text, label) {
  await navigator.clipboard.writeText(text);
  btn.textContent = 'Copied';
  setTimeout(() => (btn.textContent = label), 1200);
}
$('input').addEventListener('input', () => { clearTimeout(timer); selected = 0; timer = setTimeout(show, 140); });
$('version').addEventListener('change', show);
$('dark').addEventListener('change', show);
$('themes').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { pickTheme(c.dataset.theme); show(); } });
$('count').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { pickCount(Number(b.dataset.count)); show(); } });
$('stage').addEventListener('click', (e) => { const b = e.target.closest('.result'); if (b) select([...$('stage').children].indexOf(b)); });
$('random').addEventListener('click', () => { $('input').value = Math.random().toString(36).slice(2, 10); selected = 0; show(); });
$('copy').addEventListener('click', () => emblems[selected] && copy($('copy'), emblems[selected].url, 'Copy image URL'));
$('copysvg').addEventListener('click', () => emblems[selected] && copy($('copysvg'), emblems[selected].svg, 'Copy SVG'));
pickTheme(theme);
pickCount(count);
show();`;

  return page('emblazon · an emblem for every name', 'Deterministic emblems from any string, in six themes. Same input, same emblem, forever.', body, script, false, { bare: true });
}
