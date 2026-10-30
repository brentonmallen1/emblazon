/**
 * The whole service as one function from a web Request to a Response, shared by the Node
 * server (server.ts) and the Cloudflare Worker (worker.ts). No Node APIs: anything that needs
 * a file system or a runtime binding comes in through the context.
 */
import { THEMES, emblazon, type ThemeName } from '../index.ts';
import { MAX_INPUT, cacheFor, emblemsResult, openApi, readRender, themesResult, type ApiResult } from './api.ts';
import { docs } from './docs.ts';
import { API_HEADERS, BASE_HEADERS, IMAGE_HEADERS, MAX_URL, PAGE_HEADERS, originOf, rateHeaders, type RateDecision } from './guard.ts';
import { heraldrySheet } from './heraldry-sheet.ts';
import { patchSheet } from './patch-sheet.ts';
import { playground } from './playground.ts';
import { themeSheet } from './theme-sheet.ts';

export interface ServiceContext {
  /** Who is asking, already resolved by the runtime (socket address, proxy or CDN header). */
  clientIp: string;
  /** Public base URL; when unset, links are built from the request's host. */
  publicUrl?: string;
  /** Believe X-Forwarded-Host/-Proto when building links (Node behind a proxy). */
  trustProxy?: boolean;
  /** Host to fall back on when the request's is missing or implausible. */
  fallbackHost: string;
  /** Charge one request to a client; omit to turn rate limiting off. */
  rateLimit?: (clientIp: string) => RateDecision | Promise<RateDecision>;
  /** One sentence for the docs describing the limit in force. */
  limitSummary?: string;
  /** Generated review pages in out/. Node only. */
  reviewPage?: (name: string) => string | undefined;
}

/** The shield in the header, for browsers that ask for /favicon.ico regardless of the page's icon. */
export const FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 24"><path d="M1 2h20v9c0 6-4.4 10-10 12C5.4 21 1 17 1 11Z" fill="#c9963f"/></svg>';

type Kind = 'page' | 'image' | 'api' | 'plain';
const KIND_HEADERS: Record<Kind, Readonly<Record<string, string>>> = { page: PAGE_HEADERS, image: IMAGE_HEADERS, api: API_HEADERS, plain: {} };
const TYPES: Record<Kind, string> = {
  page: 'text/html; charset=utf-8',
  image: 'image/svg+xml',
  api: 'application/json; charset=utf-8',
  plain: 'text/plain; charset=utf-8',
};

function reply(status: number, kind: Kind, body: string | null, cache = 'no-store', extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...BASE_HEADERS, ...KIND_HEADERS[kind], 'content-type': TYPES[kind], 'cache-control': cache, ...extra } });
}

const json = (r: ApiResult, extra?: Record<string, string>): Response => reply(r.status, 'api', JSON.stringify(r.body), r.cache, extra);
const apiError = (status: number, code: string, message: string): ApiResult => ({ status, body: { error: { code, message } }, cache: 'no-store' });

/** Every site page by path, as a function of the origin its links should use. */
export function sitePages(origin: string, limitSummary?: string): Record<string, () => string> {
  return {
    '/': () => playground(origin),
    '/docs': () => docs(origin, limitSummary),
    '/sheet/heraldry': () => heraldrySheet('flat'),
    '/sheet/patch': patchSheet,
    ...Object.fromEntries((Object.keys(THEMES) as ThemeName[]).filter((t) => t !== 'heraldry' && t !== 'patch').map((t) => [`/sheet/${t}`, () => themeSheet(t)])),
  };
}

/** Pages are pure functions of path and origin: render each once. Bounded, since origin can vary. */
const pageCache = new Map<string, string>();
function cachedPage(key: string, render: () => string): string {
  let html = pageCache.get(key);
  if (html === undefined) {
    if (pageCache.size >= 64) pageCache.clear();
    html = render();
    pageCache.set(key, html);
  }
  return html;
}

export async function handle(request: Request, ctx: ServiceContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.length + url.search.length > MAX_URL) return reply(414, 'plain', 'request target too long');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...BASE_HEADERS, 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-max-age': '86400' } });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, 'plain', 'method not allowed', 'no-store', { allow: 'GET, HEAD, OPTIONS' });

  const { pathname, searchParams } = url;
  const isApi = pathname.startsWith('/api/');

  // Static things first: they cost nothing and don't count against a client.
  if (pathname === '/favicon.ico') return reply(200, 'image', FAVICON, 'public, max-age=86400');

  let limits: Record<string, string> = {};
  if (ctx.rateLimit) {
    const decision = await ctx.rateLimit(ctx.clientIp);
    limits = rateHeaders(decision);
    if (!decision.ok) {
      const message = `rate limit exceeded; retry in ${decision.retryAfter}s`;
      return isApi ? json(apiError(429, 'rate_limited', message), limits) : reply(429, 'plain', message, 'no-store', limits);
    }
  }

  const headers = Object.fromEntries(request.headers);
  const origin = originOf(headers, { publicUrl: ctx.publicUrl, trustProxy: ctx.trustProxy ?? false, fallback: ctx.fallbackHost });

  if (pathname === '/sheet/heraldry' && searchParams.get('style') === 'classic') {
    return reply(200, 'page', cachedPage('/sheet/heraldry|classic', () => heraldrySheet('classic')));
  }
  const render = sitePages(origin, ctx.limitSummary)[pathname];
  if (render) return reply(200, 'page', cachedPage(`${pathname}|${origin}`, render));

  if (pathname === '/api/v1/emblems') return json(emblemsResult(searchParams, origin), limits);
  if (pathname === '/api/v1/themes') return json(themesResult(), limits);
  if (pathname === '/api/v1/openapi.json') return json({ status: 200, body: openApi(origin), cache: 'public, max-age=3600' }, limits);
  if (isApi) return json(apiError(404, 'not_found', 'no such endpoint; see /docs'), limits);

  // Generated review pages in out/ (gitignored). Plain names only: no directories, no traversal.
  const review = pathname.match(/^\/out\/([\w.-]+\.html)$/);
  if (review) {
    const html = ctx.reviewPage?.(review[1]);
    return html === undefined ? reply(404, 'plain', 'not found', 'no-store', limits) : reply(200, 'page', html);
  }

  // GET /{theme}/{input}.svg?size=&v=&backdrop=dark&rim=   and   GET /{theme}/{input}.json?v=
  const m = pathname.match(/^\/(\w+)\/(.+)\.(svg|json)$/);
  if (m && Object.hasOwn(THEMES, m[1])) {
    const bad = (message: string) => reply(400, 'plain', message, 'no-store', { ...IMAGE_HEADERS, ...limits });
    let input: string;
    try {
      input = decodeURIComponent(m[2]);
    } catch {
      return bad('malformed input');
    }
    if (input.length > MAX_INPUT) return bad(`input is limited to ${MAX_INPUT} characters`);
    const parsed = readRender(m[1], searchParams);
    if (!parsed.ok) return bad((parsed.error.body as { error: { message: string } }).error.message);
    const { theme, ...options } = parsed.value;
    const emblem = emblazon(input, { theme, ...options });
    if (m[3] === 'svg') return reply(200, 'image', emblem.svg, cacheFor(searchParams), limits);
    const { svg: _svg, ...meta } = emblem;
    return reply(200, 'api', JSON.stringify(meta), cacheFor(searchParams), limits);
  }

  return reply(404, 'plain', 'not found', 'no-store', limits);
}
