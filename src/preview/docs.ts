import { escapeXml } from '../core/svg.ts';
import { MAX_VARIANTS, THEMES, type ThemeName } from '../index.ts';
import { MAX_INPUT, emblemsResult, themesResult } from './api.ts';
import { page } from './layout.ts';
import { LOOKS } from './looks.ts';

const code = (s: string) => `<pre><code>${escapeXml(s)}</code></pre>`;
const json = (v: unknown) => code(JSON.stringify(v, null, 2));

/** Shorten long values in an example response so the shape stays readable. */
function trimmed(body: unknown): unknown {
  return JSON.parse(JSON.stringify(body), (key, v) => {
    if (key === 'svg' && typeof v === 'string') return `${v.slice(0, 64)}…`;
    if (key === 'config' && v && typeof v === 'object') return Object.fromEntries(Object.entries(v).slice(0, 4).concat([['…', '…']]));
    return v;
  });
}

const params = (rows: [name: string, type: string, def: string, what: string][]) =>
  `<div class="table"><table><thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody>${rows
    .map(([n, t, d, w]) => `<tr><td><code>${n}</code></td><td>${t}</td><td>${d ? `<code>${escapeXml(d)}</code>` : '—'}</td><td>${w}</td></tr>`)
    .join('')}</tbody></table></div>`;

/** The API reference: how to call the service from jb-rpg or anything else. */
export function docs(origin: string, limitSummary?: string): string {
  const themes = Object.keys(THEMES) as ThemeName[];
  const example = emblemsResult(new URLSearchParams({ input: 'wren', theme: 'patch', count: '2' }), origin);
  const renderRows: [string, string, string, string][] = [
    ['v', 'integer', 'latest', 'Theme version. Pin it once you store emblems: released versions never change.'],
    ['size', 'integer', '', 'Width and height attributes on the SVG, clamped to 16–1024. Omit for a fluid SVG that fills its box.'],
    ['backdrop', '<code>dark</code>', '', 'Adds a thin rim outside the outline so the edge reads on near-black screens.'],
    ['rim', 'colour', '#EDE6D6', 'Rim colour for <code>backdrop=dark</code>: a hex colour such as the theme accent from <code>/api/v1/themes</code>, or a CSS colour name. URL-encode the <code>#</code>.'],
  ];

  const toc: [string, string][] = [
    ['overview', 'Overview'],
    ['quick-start', 'Quick start'],
    ['emblems', 'GET /api/v1/emblems'],
    ['images', 'GET /{theme}/{input}.svg'],
    ['themes', 'GET /api/v1/themes'],
    ['variants', 'Variants'],
    ['versions', 'Versions and storage'],
    ['caching', 'Caching and CORS'],
    ['limits', 'Rate limits'],
    ['errors', 'Errors'],
    ['credits', 'Credits'],
  ];

  const body = `
<style>
  .docs { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 48px; margin-top: 32px; }
  @media (max-width: 860px) { .docs { grid-template-columns: 1fr; gap: 8px; } .toc { position: static !important; } }
  .toc { position: sticky; top: 86px; align-self: start; display: grid; gap: 2px; font-size: 14px; }
  .toc b { font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-bottom: 6px; }
  .toc a { color: var(--muted); text-decoration: none; padding: 5px 10px; border-radius: 7px; border-left: 2px solid transparent; }
  .toc a:hover { color: var(--fg); background: var(--soft); }
  .prose { max-width: 820px; min-width: 0; }
  .prose section { margin-top: 0; padding-top: 8px; padding-bottom: 28px; border-bottom: 1px solid var(--line); margin-bottom: 28px; }
  .prose section:last-child { border-bottom: 0; }
  .prose h2 { all: unset; display: block; font-size: 24px; font-weight: 700; letter-spacing: -.015em; margin-bottom: 10px; }
  .prose h3 { font-size: 15px; margin: 22px 0 8px; }
  .prose p, .prose li { color: color-mix(in srgb, var(--fg) 82%, var(--muted)); }
  .prose pre { margin: 10px 0 0; font-size: 12.5px; max-height: 460px; }
  .endpoint { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-family: var(--mono); font-size: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
  .method { font-weight: 700; font-size: 12px; color: #fff; background: #2f8f5b; padding: 3px 8px; border-radius: 6px; }
  .table { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; margin-top: 12px; background: var(--surface); }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; background: var(--soft); }
  tr:last-child td { border-bottom: 0; }
  td:first-child { white-space: nowrap; }
  .callout { border: 1px solid color-mix(in srgb, var(--brand) 40%, var(--line)); background: color-mix(in srgb, var(--brand) 8%, var(--surface)); border-radius: 10px; padding: 12px 14px; margin-top: 14px; font-size: 14px; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
  .try-link { font-size: 13px; }
</style>
<div class="docs">
  <nav class="toc" aria-label="On this page"><b>On this page</b>${toc.map(([id, label]) => `<a href="#${id}">${escapeXml(label)}</a>`).join('')}</nav>
  <div class="prose">

<section id="overview">
  <h2>Overview</h2>
  <p>emblazon turns any string into an emblem. Send a username, an email or a UUID and get back an SVG, a one-line description, and the configuration it was drawn from. The same input, theme and version always give the same emblem, so you never need to store the image: store the input and regenerate it.</p>
  <p>Base URL: <code>${escapeXml(origin)}</code>. Every endpoint is a plain <code>GET</code>. There are no keys and no state.</p>
</section>

<section id="quick-start">
  <h2>Quick start</h2>
  <h3>Show an emblem</h3>
  <p>The image route works straight in an <code>&lt;img&gt;</code> tag.</p>
  ${code(`<img src="${origin}/patch/wren.svg?v=2" width="64" height="64" alt="">`)}
  <h3>Offer a choice (e.g. a hero's symbol in jb-rpg)</h3>
  <p>Ask for up to ${MAX_VARIANTS} emblems in one call, then step through them locally: show their URLs and store what the player picks.</p>
  ${code(`const EMBLAZON = '${origin}';

const params = new URLSearchParams({ input: \`\${sessionId}:\${heroName}\`, theme: 'patch', count: '10', svg: '0' });
const res = await fetch(\`\${EMBLAZON}/api/v1/emblems?\${params}\`);
if (!res.ok) throw new Error((await res.json()).error.message);
const { emblems } = await res.json();

// Render emblems[i].url in <img> tags. When the player chooses one, store:
const choice = { theme: picked.theme, input: picked.input, version: picked.version };

// Later, anywhere:
const src = \`\${EMBLAZON}/\${choice.theme}/\${encodeURIComponent(choice.input)}.svg?v=\${choice.version}\`;`)}
  <p>To offer a fresh set, change the input, for example by appending a re-roll counter: <code>\`\${sessionId}:\${heroName}:2\`</code>.</p>
</section>

<section id="emblems">
  <h2>Emblems</h2>
  <div class="endpoint"><span class="method">GET</span>/api/v1/emblems</div>
  <p>One to ${MAX_VARIANTS} emblems for an input, as JSON. <a class="try-link" href="/api/v1/emblems?input=wren&theme=patch&count=2&svg=0">Try it</a></p>
  ${params([
    ['input', 'string', '', `<b>Required.</b> Any string up to ${MAX_INPUT} characters. Case and surrounding spaces are ignored.`],
    ['theme', 'string', 'heraldry', `One of ${themes.map((t) => `<code>${t}</code>`).join(', ')}.`],
    ['count', 'integer', '1', `How many emblems, 1 to ${MAX_VARIANTS}. See <a href="#variants">Variants</a>.`],
    ['svg', '<code>0</code> | <code>1</code>', '1', '<code>0</code> leaves out the SVG markup; use the <code>url</code> fields instead.'],
    ...renderRows,
  ])}
  <h3>Response</h3>
  <p>Each emblem's <code>input</code> is the exact string that reproduces it; <code>url</code> is pinned to its version.</p>
  ${code(`GET /api/v1/emblems?input=wren&theme=patch&count=2`)}
  ${json(trimmed(example.body))}
  <div class="table"><table><thead><tr><th>Field</th><th>Description</th></tr></thead><tbody>
    <tr><td><code>input</code></td><td>The string that reproduces this emblem by itself. Store it with <code>theme</code> and <code>version</code>.</td></tr>
    <tr><td><code>description</code></td><td>A blazon for heraldry, a mission name and scene for patches, and so on. Good alt text. Never drawn.</td></tr>
    <tr><td><code>credits</code></td><td>License lines for third-party art in this emblem, often empty. See <a href="#credits">Credits</a>.</td></tr>
    <tr><td><code>url</code></td><td>Version-pinned image URL.</td></tr>
    <tr><td><code>config</code></td><td>The generated configuration, per theme. Useful for search or analytics; not needed to redraw.</td></tr>
    <tr><td><code>svg</code></td><td>The SVG markup, unless <code>svg=0</code>.</td></tr>
  </tbody></table></div>
</section>

<section id="images">
  <h2>Images</h2>
  <div class="endpoint"><span class="method">GET</span>/{theme}/{input}.svg</div>
  <p>The emblem itself, as <code>image/svg+xml</code>. URL-encode the input (a <code>#</code> becomes <code>%23</code>). <a class="try-link" href="/patch/wren.svg?v=2">Try it</a></p>
  ${params(renderRows)}
  <div class="endpoint" style="margin-top:18px"><span class="method">GET</span>/{theme}/{input}.json</div>
  <p>The same emblem's metadata without the SVG: <code>theme</code>, <code>version</code>, <code>input</code>, <code>config</code>, <code>description</code>, <code>credits</code>. Takes <code>v</code>.</p>
</section>

<section id="themes">
  <h2>Themes</h2>
  <div class="endpoint"><span class="method">GET</span>/api/v1/themes</div>
  <p>Every theme with its versions and the screen colours it was designed for.</p>
  <div class="table"><table><thead><tr><th>Theme</th><th>Look</th><th>Versions</th><th>Accent</th></tr></thead><tbody>${themes
    .map((t) => `<tr><td><code>${t}</code></td><td>${escapeXml(LOOKS[t].label)}</td><td>${THEMES[t].versions.join(', ')} (latest ${THEMES[t].latest})</td><td><span class="dot" style="background:${LOOKS[t].accent}"></span><code>${LOOKS[t].accent}</code></td></tr>`)
    .join('')}</tbody></table></div>
  <h3>Response</h3>
  ${json({ themes: (themesResult().body as { themes: unknown[] }).themes.slice(0, 2).concat(['…']) })}
</section>

<section id="variants">
  <h2>Variants</h2>
  <p>With <code>count</code> above 1, the first emblem is always the plain emblem for the input, exactly what the image route draws. The others are fixed variants with inputs <code>input#1</code>, <code>input#2</code> and so on, skipping any that would look like one already in the set.</p>
  <p>There is no seed to set. Like Robohash, the input is the seed: everyone who asks for the same input sees the same set, in the same order. To get different emblems, change the input.</p>
</section>

<section id="versions">
  <h2>Versions and storage</h2>
  <p>Each theme is versioned. A released version is frozen and tested byte for byte, so a pinned emblem never changes. Without <code>v</code> you get the latest version, which can change when a new one ships.</p>
  <div class="callout">Store <code>{ theme, input, version }</code> for every emblem you keep, and always send <code>v</code>. That is all you need to redraw it, at any size, forever.</div>
</section>

<section id="caching">
  <h2>Caching and CORS</h2>
  <p>Responses are a pure function of the URL. Requests with <code>v</code> are served with <code>Cache-Control: public, max-age=31536000, immutable</code>; without it, for an hour.</p>
  <p>Every API and image response carries <code>Access-Control-Allow-Origin: *</code>, so browser apps can call the service directly.</p>
</section>

<section id="limits">
  <h2>Rate limits</h2>
  ${limitSummary
    ? `<p>${limitSummary} Every request counts once, so a batch of ${MAX_VARIANTS} emblems costs the same as one.</p>`
    : '<p>This server has rate limiting turned off.</p>'}
  <p>Past the limit you get status 429 with <code>Retry-After</code> in seconds. Responses may also carry <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code> and <code>RateLimit-Reset</code>.</p>
  <div class="callout">Ask for a whole batch in one call with <code>count</code>, and pin <code>v</code> so browsers and CDNs can cache images for good. Cached responses never reach the server, so they never count.</div>
</section>

<section id="errors">
  <h2>Errors</h2>
  <p>The JSON API answers bad requests with status 400 and a code you can switch on. The image routes answer with plain text.</p>
  ${json({ error: { code: 'bad_count', message: `count must be a whole number from 1 to ${MAX_VARIANTS}` } })}
  <div class="table"><table><thead><tr><th>Code</th><th>When</th></tr></thead><tbody>
    <tr><td><code>missing_input</code></td><td>No <code>input</code>, or only spaces.</td></tr>
    <tr><td><code>input_too_long</code></td><td>Input over ${MAX_INPUT} characters.</td></tr>
    <tr><td><code>bad_count</code></td><td><code>count</code> is not a whole number from 1 to ${MAX_VARIANTS}.</td></tr>
    <tr><td><code>unknown_theme</code></td><td>No such theme.</td></tr>
    <tr><td><code>unknown_version</code></td><td>The theme has no such version.</td></tr>
    <tr><td><code>bad_rim</code></td><td><code>rim</code> is not a hex colour or a CSS colour name.</td></tr>
    <tr><td><code>not_found</code></td><td>No such endpoint (status 404).</td></tr>
    <tr><td><code>rate_limited</code></td><td>Too many requests (status 429). Wait <code>Retry-After</code> seconds. See <a href="#limits">Rate limits</a>.</td></tr>
  </tbody></table></div>
</section>

<section id="credits">
  <h2>Credits</h2>
  <p>Some heraldic charges are adapted from <a href="https://game-icons.net">game-icons.net</a> under CC BY 3.0. An app that shows emblems should credit them somewhere, such as an about screen. Each emblem lists its own lines in <code>credits</code>.</p>
  <p>A machine-readable description of this API is at <a href="/api/v1/openapi.json"><code>/api/v1/openapi.json</code></a> (OpenAPI 3.1).</p>
</section>

  </div>
</div>`;

  return page('API reference', 'Generate emblems from any service with one GET request.', body);
}
