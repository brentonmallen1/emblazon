import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THEMES } from '../src/index.ts';
import { RateLimiter } from '../src/preview/guard.ts';
import { handle, sitePages, type ServiceContext } from '../src/preview/handler.ts';

const base: ServiceContext = { clientIp: '203.0.113.5', fallbackHost: 'localhost:4747' };
const get = (path: string, ctx: Partial<ServiceContext> = {}, init: RequestInit = {}) =>
  handle(new Request(`http://emblems.test${path}`, init), { ...base, ...ctx });

test('routes answer with the right status, type and headers', async () => {
  const cases: [string, number, string][] = [
    ['/', 200, 'text/html'],
    ['/docs', 200, 'text/html'],
    ['/sheet/sigil', 200, 'text/html'],
    ['/favicon.ico', 200, 'image/svg+xml'],
    ['/api/v1/emblems?input=x&count=3&svg=0', 200, 'application/json'],
    ['/api/v1/themes', 200, 'application/json'],
    ['/patch/x.svg?v=2', 200, 'image/svg+xml'],
    ['/patch/x.json', 200, 'application/json'],
    ['/api/v1/nope', 404, 'application/json'],
    ['/lib/index.js', 404, 'text/plain'], // no module loader in this context (as on Workers)
    ['/nope', 404, 'text/plain'],
  ];
  for (const [path, status, type] of cases) {
    const r = await get(path);
    assert.equal(r.status, status, path);
    assert.ok(r.headers.get('content-type')?.startsWith(type), `${path}: ${r.headers.get('content-type')}`);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', path);
  }
  assert.match((await get('/')).headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  const svg = await get('/patch/x.svg');
  assert.match(svg.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.equal(svg.headers.get('access-control-allow-origin'), '*');
});

test('methods, sizes and inputs are checked', async () => {
  assert.equal((await get('/', {}, { method: 'POST' })).status, 405);
  assert.equal((await get('/', {}, { method: 'OPTIONS' })).status, 204);
  assert.equal((await get(`/patch/${'a'.repeat(3000)}.svg`)).status, 414);
  assert.equal((await get(`/patch/${'a'.repeat(300)}.svg`)).status, 400);
  assert.equal((await get('/patch/%E0%A4%A.svg')).status, 400, 'malformed escape');
  assert.equal((await get('/patch/x.svg?rim=url(x)')).status, 400);
});

test('the rate limit refuses with 429 and Retry-After, and spares static routes', async () => {
  const limiter = new RateLimiter(60, 2);
  const ctx = { rateLimit: (ip: string) => limiter.take(ip, 0) };
  assert.equal((await get('/patch/a.svg', ctx)).status, 200);
  assert.equal((await get('/patch/b.svg', ctx)).status, 200);
  const refused = await get('/api/v1/emblems?input=c', ctx);
  assert.equal(refused.status, 429);
  assert.equal(refused.headers.get('retry-after'), '1');
  assert.equal(((await refused.json()) as { error: { code: string } }).error.code, 'rate_limited');
  assert.equal((await get('/favicon.ico', ctx)).status, 200, 'favicon is not charged');
  assert.equal((await get('/patch/d.svg', { ...ctx, clientIp: 'other' })).status, 200, 'clients are separate');
});

test('links use the public URL, and the prerendered site covers every theme sheet', async () => {
  const body = (await (await get('/api/v1/emblems?input=x&svg=0', { publicUrl: 'https://emblazon.example' })).json()) as { emblems: { url: string }[] };
  assert.equal(body.emblems[0].url, `https://emblazon.example/heraldry/x.svg?v=${THEMES.heraldry.latest}`);
  const pages = Object.keys(sitePages('https://emblazon.example'));
  for (const t of Object.keys(THEMES)) assert.ok(pages.includes(`/sheet/${t}`), t);
  assert.ok(pages.includes('/') && pages.includes('/docs') && pages.includes('/picker'));
});
