import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { THEMES, emblazon, type ThemeName } from './src/index.ts';
import { cacheFor, emblemsResult, openApi, readRender, themesResult, type ApiResult } from './src/preview/api.ts';
import { docs } from './src/preview/docs.ts';
import { heraldrySheet } from './src/preview/heraldry-sheet.ts';
import { patchSheet } from './src/preview/patch-sheet.ts';
import { themeSheet } from './src/preview/theme-sheet.ts';
import { picker } from './src/preview/picker.ts';
import { playground } from './src/preview/playground.ts';
import { toBrowserJs } from './scripts/lib/browser-js.ts';

const PORT = Number(process.env.PORT ?? 4747);

function send(res: ServerResponse, status: number, type: string, body: string, cache = 'no-store', cors = false): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': cache, ...(cors && { 'access-control-allow-origin': '*' }) });
  res.end(body);
}

/** API responses: JSON, readable from any origin (emblems are public and deterministic). */
const sendJson = (res: ServerResponse, r: ApiResult): void => send(res, r.status, 'application/json; charset=utf-8', JSON.stringify(r.body), r.cache, true);

/** Where this server is reached, for absolute URLs in API responses and docs. */
function originOf(headers: Record<string, string | string[] | undefined>): string {
  const proto = String(headers['x-forwarded-proto'] ?? 'http').split(',')[0].trim();
  const host = String(headers['x-forwarded-host'] ?? headers.host ?? `localhost:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const { pathname, searchParams } = url;
  const origin = originOf(req.headers);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400' });
    return res.end();
  }

  if (pathname === '/') return send(res, 200, 'text/html; charset=utf-8', playground(origin));
  if (pathname === '/docs') return send(res, 200, 'text/html; charset=utf-8', docs(origin));
  if (pathname === '/api/v1/emblems') return sendJson(res, emblemsResult(searchParams, origin));
  if (pathname === '/api/v1/themes') return sendJson(res, themesResult());
  if (pathname === '/api/v1/openapi.json') return sendJson(res, { status: 200, body: openApi(origin), cache: 'public, max-age=3600' });
  if (pathname.startsWith('/api/')) return sendJson(res, { status: 404, body: { error: { code: 'not_found', message: 'no such endpoint; see /docs' } }, cache: 'no-store' });
  if (pathname === '/sheet/heraldry') return send(res, 200, 'text/html; charset=utf-8', heraldrySheet(searchParams.get('style') === 'classic' ? 'classic' : 'flat'));
  if (pathname === '/sheet/patch') return send(res, 200, 'text/html; charset=utf-8', patchSheet());
  const sheet = pathname.match(/^\/sheet\/(\w+)$/);
  if (sheet && Object.hasOwn(THEMES, sheet[1])) return send(res, 200, 'text/html; charset=utf-8', themeSheet(sheet[1] as ThemeName));

  if (pathname === '/picker') return send(res, 200, 'text/html; charset=utf-8', picker());

  // The library as browser ES modules, types stripped on the fly: /lib/index.js ← src/index.ts.
  // Segments of word characters and '-', single dots allowed inside a file name (charges.generated),
  // so '..' can never match and nothing outside src/ is reachable.
  const lib = pathname.match(/^\/lib\/((?:[\w-]+\/)*[\w-]+(?:\.[\w-]+)*)\.js$/);
  if (lib) {
    try {
      return send(res, 200, 'text/javascript; charset=utf-8', toBrowserJs(readFileSync(join('src', `${lib[1]}.ts`), 'utf8')));
    } catch {
      return send(res, 404, 'text/plain; charset=utf-8', 'not found');
    }
  }

  // Generated review pages in out/ (gitignored). Plain names only: no directories, no traversal.
  const page = pathname.match(/^\/out\/([\w.-]+\.html)$/);
  if (page) {
    try {
      return send(res, 200, 'text/html; charset=utf-8', readFileSync(join('out', page[1]), 'utf8'));
    } catch {
      return send(res, 404, 'text/plain; charset=utf-8', 'not found');
    }
  }

  // GET /{theme}/{input}.svg?size=&v=&backdrop=dark&rim=   and   GET /{theme}/{input}.json?v=
  const m = pathname.match(/^\/(\w+)\/(.+)\.(svg|json)$/);
  if (m && Object.hasOwn(THEMES, m[1])) {
    let input: string;
    try {
      input = decodeURIComponent(m[2]);
    } catch {
      return send(res, 400, 'text/plain; charset=utf-8', 'malformed input', 'no-store', true);
    }
    const parsed = readRender(m[1], searchParams);
    if (!parsed.ok) return send(res, 400, 'text/plain; charset=utf-8', (parsed.error.body as { error: { message: string } }).error.message, 'no-store', true);
    const { theme, ...options } = parsed.value;
    const emblem = emblazon(input, { theme, ...options });
    if (m[3] === 'svg') return send(res, 200, 'image/svg+xml', emblem.svg, cacheFor(searchParams), true);
    const { svg: _svg, ...meta } = emblem;
    return send(res, 200, 'application/json', JSON.stringify(meta), cacheFor(searchParams), true);
  }

  send(res, 404, 'text/plain; charset=utf-8', 'not found');
}).listen(PORT, () => console.log(`emblazon preview on http://localhost:${PORT}`));
