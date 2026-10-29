import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_VARIANTS, THEMES, emblazon, emblazonMany, type ThemeName } from '../src/index.ts';
import { emblemsResult, openApi, themesResult } from '../src/preview/api.ts';

const themes = Object.keys(THEMES) as ThemeName[];
const ORIGIN = 'https://emblems.example';

test('variants: the first is the plain emblem, the rest are distinct and stable', () => {
  for (const theme of themes) {
    for (let s = 0; s < 40; s++) {
      const input = `hero-${s}`;
      const set = emblazonMany(input, { theme, count: MAX_VARIANTS });
      assert.equal(set.length, MAX_VARIANTS, `${theme} ${input} fills the set`);
      assert.equal(set[0].input, input);
      assert.equal(set[0].svg, emblazon(input, { theme }).svg, 'first is the plain emblem');
      const looks = set.map((e) => THEMES[theme].lookKey(e.config as never));
      assert.equal(new Set(looks).size, set.length, `${theme} ${input}: no two look alike`);
      for (const e of set) assert.equal(emblazon(e.input, { theme }).svg, e.svg, `${e.input} regenerates on its own`);
      assert.deepEqual(emblazonMany(input, { theme, count: 3 }).map((e) => e.input), set.slice(0, 3).map((e) => e.input), 'a smaller set is a prefix');
    }
  }
});

test('variants clamp the count', () => {
  assert.equal(emblazonMany('x', { count: 0 }).length, 1);
  assert.equal(emblazonMany('x', { count: 99 }).length, MAX_VARIANTS);
});

test('emblems endpoint returns the set with pinned urls', () => {
  const r = emblemsResult(new URLSearchParams({ input: 'Wren', theme: 'patch', count: '3', svg: '0' }), ORIGIN);
  assert.equal(r.status, 200);
  const body = r.body as { count: number; version: number; emblems: { input: string; url: string; svg?: string; version: number }[] };
  assert.equal(body.count, 3);
  assert.equal(body.version, THEMES.patch.latest);
  assert.equal(body.emblems[0].url, `${ORIGIN}/patch/Wren.svg?v=${THEMES.patch.latest}`);
  assert.match(body.emblems[1].url, /\/patch\/Wren%23\d+\.svg\?v=\d+$/, 'variant inputs are URL-encoded');
  assert.ok(body.emblems.every((e) => e.svg === undefined), 'svg=0 leaves the markup out');
  assert.equal(r.cache, 'public, max-age=3600');

  const pinned = emblemsResult(new URLSearchParams({ input: 'wren', v: '1' }), ORIGIN);
  assert.equal(pinned.cache, 'public, max-age=31536000, immutable');
  assert.match((pinned.body as { emblems: { svg: string }[] }).emblems[0].svg, /^<svg /);
});

test('emblems endpoint rejects bad requests with codes', () => {
  const code = (q: Record<string, string>) => {
    const r = emblemsResult(new URLSearchParams(q), ORIGIN);
    assert.equal(r.status, 400);
    return (r.body as { error: { code: string } }).error.code;
  };
  assert.equal(code({}), 'missing_input');
  assert.equal(code({ input: '   ' }), 'missing_input');
  assert.equal(code({ input: 'x'.repeat(257) }), 'input_too_long');
  for (const count of ['0', String(MAX_VARIANTS + 1), '2.5', 'two']) assert.equal(code({ input: 'x', count }), 'bad_count');
  assert.equal(code({ input: 'x', theme: 'nope' }), 'unknown_theme');
  assert.equal(code({ input: 'x', theme: 'patch', v: '99' }), 'unknown_version');
});

test('themes endpoint and OpenAPI list every theme', () => {
  const listed = (themesResult().body as { themes: { name: string }[] }).themes.map((t) => t.name);
  assert.deepEqual(listed, themes);
  const spec = openApi(ORIGIN) as { openapi: string; paths: Record<string, unknown> };
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.paths['/api/v1/emblems'] && spec.paths['/api/v1/themes']);
});
