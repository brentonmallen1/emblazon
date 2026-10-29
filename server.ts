import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { THEMES, emblazon, type ThemeName } from './src/index.ts';
import { MAX_INPUT, cacheFor, emblemsResult, openApi, readRender, themesResult, type ApiResult } from './src/preview/api.ts';
import { docs } from './src/preview/docs.ts';
import { API_HEADERS, BASE_HEADERS, IMAGE_HEADERS, MAX_URL, PAGE_HEADERS, RateLimiter, clientKey, originOf, rateHeaders } from './src/preview/guard.ts';
import { heraldrySheet } from './src/preview/heraldry-sheet.ts';
import { patchSheet } from './src/preview/patch-sheet.ts';
import { themeSheet } from './src/preview/theme-sheet.ts';
import { picker } from './src/preview/picker.ts';
import { playground } from './src/preview/playground.ts';
import { toBrowserJs } from './scripts/lib/browser-js.ts';

const env = process.env;
const PORT = Number(env.PORT ?? 4747);
/** Public base URL, e.g. https://emblems.example.com. Set it in production so links never come from request headers. */
const PUBLIC_URL = env.PUBLIC_URL || undefined;
/** Behind a reverse proxy or CDN, believe its client-IP and host headers. Off when exposed directly. */
const TRUST_PROXY = env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true';
/** Sustained requests per minute per client; 0 turns rate limiting off. */
const RATE_PER_MINUTE = Number(env.RATE_LIMIT_PER_MINUTE ?? 120);
/** Requests a client may make at once before the sustained rate applies. */
const RATE_BURST = Number(env.RATE_LIMIT_BURST ?? 60);

const limiter = RATE_PER_MINUTE > 0 ? new RateLimiter(RATE_PER_MINUTE, Math.max(1, RATE_BURST)) : undefined;

type Kind = 'page' | 'image' | 'api' | 'plain' | 'script';
const KIND_HEADERS: Record<Kind, Readonly<Record<string, string>>> = { page: PAGE_HEADERS, image: IMAGE_HEADERS, api: API_HEADERS, plain: {}, script: {} };
const TYPES: Record<Kind, string> = {
  page: 'text/html; charset=utf-8',
  image: 'image/svg+xml',
  api: 'application/json; charset=utf-8',
  plain: 'text/plain; charset=utf-8',
  script: 'text/javascript; charset=utf-8',
};

function send(res: ServerResponse, status: number, kind: Kind, body: string, cache = 'no-store', extra: Record<string, string> = {}): void {
  res.writeHead(status, { ...BASE_HEADERS, ...KIND_HEADERS[kind], 'content-type': TYPES[kind], 'cache-control': cache, ...extra });
  res.end(body);
}

const sendJson = (res: ServerResponse, r: ApiResult, extra?: Record<string, string>): void => send(res, r.status, 'api', JSON.stringify(r.body), r.cache, extra);
const apiError = (status: number, code: string, message: string): ApiResult => ({ status, body: { error: { code, message } }, cache: 'no-store' });

/** Pages are pure functions of path and origin: render each once. Bounded, since origin can vary. */
const pages = new Map<string, string>();
function cachedPage(key: string, render: () => string): string {
  let html = pages.get(key);
  if (html === undefined) {
    if (pages.size >= 64) pages.clear();
    html = render();
    pages.set(key, html);
  }
  return html;
}

/** The header's shield, for browsers that ask for /favicon.ico regardless of the page's icon. */
const FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 24"><path d="M1 2h20v9c0 6-4.4 10-10 12C5.4 21 1 17 1 11Z" fill="#c9963f"/></svg>';

/** Library modules for the in-browser picker, transpiled once each. */
const modules = new Map<string, string>();

const server = createServer((req, res) => {
  const target = req.url ?? '/';
  if (target.length > MAX_URL) return send(res, 414, 'plain', 'request target too long');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...BASE_HEADERS, 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-max-age': '86400' });
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'plain', 'method not allowed', 'no-store', { allow: 'GET, HEAD, OPTIONS' });

  const { pathname, searchParams } = new URL(target, 'http://localhost');
  const origin = originOf(req.headers, { publicUrl: PUBLIC_URL, trustProxy: TRUST_PROXY, fallback: `localhost:${PORT}` });
  const isApi = pathname.startsWith('/api/');

  // The library's own modules are static source: not worth a client's budget.
  const lib = pathname.match(/^\/lib\/((?:[\w-]+\/)*[\w-]+(?:\.[\w-]+)*)\.js$/);
  if (lib) {
    // Segments of word characters and '-', single dots allowed inside a file name (charges.generated),
    // so '..' can never match and nothing outside src/ is reachable.
    let js = modules.get(lib[1]);
    if (js === undefined) {
      try {
        js = toBrowserJs(readFileSync(join('src', `${lib[1]}.ts`), 'utf8'));
        modules.set(lib[1], js);
      } catch {
        return send(res, 404, 'plain', 'not found');
      }
    }
    return send(res, 200, 'script', js, 'public, max-age=300');
  }

  if (pathname === '/favicon.ico') return send(res, 200, 'image', FAVICON, 'public, max-age=86400');

  let limits: Record<string, string> = {};
  if (limiter) {
    const decision = limiter.take(clientKey(req.headers, req.socket.remoteAddress, TRUST_PROXY));
    limits = rateHeaders(decision);
    if (!decision.ok) {
      const message = `rate limit exceeded; retry in ${decision.retryAfter}s`;
      return isApi ? sendJson(res, apiError(429, 'rate_limited', message), limits) : send(res, 429, 'plain', message, 'no-store', limits);
    }
  }

  if (pathname === '/') return send(res, 200, 'page', cachedPage(`/|${origin}`, () => playground(origin)));
  if (pathname === '/docs') return send(res, 200, 'page', cachedPage(`/docs|${origin}`, () => docs(origin, limiter && { perMinute: RATE_PER_MINUTE, burst: RATE_BURST })));
  if (pathname === '/picker') return send(res, 200, 'page', cachedPage('/picker', picker));
  if (pathname === '/sheet/heraldry') {
    const style = searchParams.get('style') === 'classic' ? 'classic' : 'flat';
    return send(res, 200, 'page', cachedPage(`/sheet/heraldry|${style}`, () => heraldrySheet(style)));
  }
  if (pathname === '/sheet/patch') return send(res, 200, 'page', cachedPage('/sheet/patch', patchSheet));
  const sheet = pathname.match(/^\/sheet\/(\w+)$/);
  if (sheet && Object.hasOwn(THEMES, sheet[1])) return send(res, 200, 'page', cachedPage(pathname, () => themeSheet(sheet[1] as ThemeName)));

  if (pathname === '/api/v1/emblems') return sendJson(res, emblemsResult(searchParams, origin), limits);
  if (pathname === '/api/v1/themes') return sendJson(res, themesResult(), limits);
  if (pathname === '/api/v1/openapi.json') return sendJson(res, { status: 200, body: openApi(origin), cache: 'public, max-age=3600' }, limits);
  if (isApi) return sendJson(res, apiError(404, 'not_found', 'no such endpoint; see /docs'), limits);

  // Generated review pages in out/ (gitignored, absent from the Docker image). Plain names only.
  const review = pathname.match(/^\/out\/([\w.-]+\.html)$/);
  if (review) {
    try {
      return send(res, 200, 'page', readFileSync(join('out', review[1]), 'utf8'));
    } catch {
      return send(res, 404, 'plain', 'not found');
    }
  }

  // GET /{theme}/{input}.svg?size=&v=&backdrop=dark&rim=   and   GET /{theme}/{input}.json?v=
  const m = pathname.match(/^\/(\w+)\/(.+)\.(svg|json)$/);
  if (m && Object.hasOwn(THEMES, m[1])) {
    let input: string;
    try {
      input = decodeURIComponent(m[2]);
    } catch {
      return send(res, 400, 'plain', 'malformed input', 'no-store', { ...IMAGE_HEADERS, ...limits });
    }
    if (input.length > MAX_INPUT) return send(res, 400, 'plain', `input is limited to ${MAX_INPUT} characters`, 'no-store', { ...IMAGE_HEADERS, ...limits });
    const parsed = readRender(m[1], searchParams);
    if (!parsed.ok) return send(res, 400, 'plain', (parsed.error.body as { error: { message: string } }).error.message, 'no-store', { ...IMAGE_HEADERS, ...limits });
    const { theme, ...options } = parsed.value;
    const emblem = emblazon(input, { theme, ...options });
    if (m[3] === 'svg') return send(res, 200, 'image', emblem.svg, cacheFor(searchParams), limits);
    const { svg: _svg, ...meta } = emblem;
    return send(res, 200, 'api', JSON.stringify(meta), cacheFor(searchParams), limits);
  }

  send(res, 404, 'plain', 'not found', 'no-store', limits);
});

// Slow or stalled clients can't hold connections open.
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;

server.listen(PORT, () =>
  console.log(
    `emblazon on http://localhost:${PORT}` +
      (limiter ? ` · rate limit ${RATE_PER_MINUTE}/min, burst ${RATE_BURST}` : ' · rate limit off') +
      (TRUST_PROXY ? ' · trusting proxy headers' : '') +
      (PUBLIC_URL ? ` · public URL ${PUBLIC_URL}` : ''),
  ),
);
