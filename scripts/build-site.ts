/**
 * Writes site/: every page prerendered, the library as browser modules for the picker, and a
 * _headers file with the pages' security headers. Cloudflare serves these as static assets
 * (free, no Worker invocation); the sheets take longer to render than a free Worker may run.
 *
 * Settings come from wrangler.toml's [vars] so there is one place to change them:
 * PUBLIC_URL for links, RATE_LIMIT_PER_MINUTE for the docs. Environment variables override.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { BASE_HEADERS, PAGE_HEADERS } from '../src/preview/guard.ts';
import { sitePages } from '../src/preview/handler.ts';
import { toBrowserJs } from './lib/browser-js.ts';

const OUT = 'site';

/** A string value from wrangler.toml's [vars], e.g. PUBLIC_URL = "https://…". */
function wranglerVar(name: string): string | undefined {
  try {
    return readFileSync('wrangler.toml', 'utf8').match(new RegExp(`^${name}\\s*=\\s*"([^"]*)"`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

const publicUrl = (process.env.PUBLIC_URL || wranglerVar('PUBLIC_URL') || 'http://localhost:8787').replace(/\/+$/, '');
const perMinute = Number(process.env.RATE_LIMIT_PER_MINUTE || wranglerVar('RATE_LIMIT_PER_MINUTE') || 120);

rmSync(OUT, { recursive: true, force: true });
const write = (path: string, body: string) => {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), body);
};

// Pages: / → index.html, /docs → docs.html, /sheet/patch → sheet/patch.html.
const pages = sitePages(publicUrl, perMinute > 0 ? `Each client may make <b>${perMinute}</b> requests per minute.` : undefined);
for (const [path, render] of Object.entries(pages)) write(path === '/' ? 'index.html' : `${path.slice(1)}.html`, render());

// The library for the in-browser picker, at the same /lib/… paths the Node server uses.
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const modules = walk('src').filter((f) => f.endsWith('.ts') && !f.startsWith(join('src', 'preview')));
for (const file of modules) write(join('lib', relative('src', file)).replace(/\.ts$/, '.js'), toBrowserJs(readFileSync(file, 'utf8')));

// Static assets don't pass through the Worker, so their headers are declared here.
const block = (pattern: string, headers: Record<string, string>) => `${pattern}\n${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
write('_headers', [block('/*', { ...BASE_HEADERS, ...PAGE_HEADERS }), block('/lib/*', { 'cache-control': 'public, max-age=300' })].join('\n'));

console.log(`wrote ${Object.keys(pages).length} pages and ${modules.length} modules to ${OUT}/ for ${publicUrl}`);
