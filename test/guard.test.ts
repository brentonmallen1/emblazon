import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblemsResult } from '../src/preview/api.ts';
import { RateLimiter, clientKey, isColour, originOf, rateHeaders } from '../src/preview/guard.ts';

test('rate limiter allows a burst, then refills at the sustained rate', () => {
  const rl = new RateLimiter(60, 3); // one a second, three at once
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rl.take('a', t).ok, true);
  const refused = rl.take('a', t);
  assert.equal(refused.ok, false);
  assert.equal(refused.retryAfter, 1);
  assert.equal(rateHeaders(refused)['retry-after'], '1');
  assert.equal(rl.take('b', t).ok, true, 'clients have separate buckets');
  assert.equal(rl.take('a', t + 999).ok, false);
  assert.equal(rl.take('a', t + 2000).ok, true, 'refilled after a second');
  const full = rl.take('c', t);
  assert.equal(full.remaining, 2);
  assert.equal(full.reset, 1);
});

test('rate limiter memory stays bounded', () => {
  const rl = new RateLimiter(60, 5, 100);
  for (let i = 0; i < 1000; i++) rl.take(`ip-${i}`, 0);
  assert.equal(rl.size, 100);
  rl.take('late', 10 * 60_000); // a sweep drops every refilled bucket
  assert.equal(rl.size, 1);
});

test('forwarded client and host headers count only behind a trusted proxy', () => {
  const h = { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'cf-connecting-ip': '198.51.100.7', host: 'emblems.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' };
  assert.equal(clientKey(h, '10.0.0.2', false), '10.0.0.2');
  assert.equal(clientKey(h, '10.0.0.2', true), '198.51.100.7');
  assert.equal(clientKey({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }, '10.0.0.2', true), '203.0.113.9');

  const fallback = 'localhost:4747';
  assert.equal(originOf(h, { trustProxy: false, fallback }), 'http://emblems.example');
  assert.equal(originOf(h, { trustProxy: true, fallback }), 'https://evil.example');
  assert.equal(originOf(h, { publicUrl: 'https://emblems.example/', trustProxy: true, fallback }), 'https://emblems.example');
  assert.equal(originOf({ host: 'a"><script>' }, { trustProxy: false, fallback }), 'http://localhost:4747', 'junk hosts never reach a page');
});

test('rim colours are checked before they reach an SVG', () => {
  for (const ok of ['#fff', '#F0B060', '#f0b06080', 'goldenrod']) assert.ok(isColour(ok), ok);
  for (const bad of ['red;stroke:url(x)', '#12', 'url(#a)', '" onload="x', '']) assert.ok(!isColour(bad), bad);
  const r = emblemsResult(new URLSearchParams({ input: 'x', backdrop: 'dark', rim: 'red" onload="x' }), 'http://x');
  assert.equal(r.status, 400);
  assert.equal((r.body as { error: { code: string } }).error.code, 'bad_rim');
});
