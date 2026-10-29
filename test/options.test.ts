import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { toBrowserJs } from '../scripts/lib/browser-js.ts';
import { ATTRIBUTION, emblazon, emblazonOptions } from '../src/index.ts';
import { CHARGES, creditsFor, generateArms, lookKey, renderArms } from '../src/themes/heraldry/index.ts';

test('options are stable, distinct, and each regenerates from its stored input', () => {
  const a = emblazonOptions('session-1:Wren', { count: 6 });
  const b = emblazonOptions('session-1:Wren', { count: 6 });
  assert.equal(a.length, 6);
  assert.deepEqual(a.map((e) => e.svg), b.map((e) => e.svg));
  assert.equal(new Set(a.map((e) => lookKey(e.config))).size, 6, 'no two look alike');
  for (const e of a) assert.equal(emblazon(e.input, { version: e.version }).svg, e.svg, `${e.input} regenerates`);
  assert.notDeepEqual(
    a.map((e) => e.input),
    emblazonOptions('session-1:Wren:1').map((e) => e.input),
    'a different seed re-rolls',
  );
});

test('options vary the charge across many seeds', () => {
  for (let s = 0; s < 200; s++) {
    const charges = emblazonOptions(`seed-${s}`, { count: 6 }).flatMap((e) => (e.config.charges ? [e.config.charges.charge] : []));
    assert.equal(new Set(charges).size, charges.length, `seed-${s} repeats a charge`);
  }
});

test('credits follow the art: adapted charges carry one, original art none', () => {
  const field = { kind: 'plain', tincture: 'azure' } as const;
  const at = [{ x: 100, y: 100, size: 100 }];
  assert.match(CHARGES.lionHead.credit ?? '', /^Lorc, game-icons\.net, CC BY 3\.0$/);
  assert.equal(CHARGES.mullet.credit, undefined);
  assert.match(ATTRIBUTION, /^Icons made by .*Lorc.* from game-icons\.net, CC BY 3\.0\.$/);
  assert.deepEqual(creditsFor({ shield: 'heater', field, charges: { charge: 'lionHead', tincture: 'or', at } }), [CHARGES.lionHead.credit]);
  assert.deepEqual(creditsFor({ shield: 'heater', field, charges: { charge: 'mullet', tincture: 'or', at } }), []);
  for (let i = 0; i < 300; i++) {
    const e = emblazon(`credit-${i}`);
    const charge = e.config.charges?.charge;
    assert.deepEqual(e.credits, charge && CHARGES[charge].credit ? [CHARGES[charge].credit] : [], e.input);
  }
});

test('a dark backdrop adds a rim; the default output has none', () => {
  const arms = generateArms('rim-check');
  const plain = renderArms(arms);
  const dark = renderArms(arms, { backdrop: 'dark' });
  assert.doesNotMatch(plain, /stroke-width="9"/);
  assert.match(dark, /stroke="#EDE6D6" stroke-width="9"/);
  assert.match(renderArms(arms, { backdrop: 'dark', rim: '"><script>' }), /stroke="&quot;&gt;&lt;script&gt;"/, 'rim colour is escaped');
});

test('the plain-JS build produces exactly the same emblems as the TypeScript source', async () => {
  const out = mkdtempSync(join(tmpdir(), 'emblazon-build-'));
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  for (const file of walk('src').filter((f) => f.endsWith('.ts'))) {
    const js = toBrowserJs(readFileSync(file, 'utf8'));
    assert.doesNotMatch(js, /from\s+['"][^'"]+\.ts['"]/, `${file} still imports .ts`);
    const target = join(out, relative('src', file)).replace(/\.ts$/, '.js');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, js);
  }
  const built = await import(pathToFileURL(join(out, 'index.js')).href);
  for (const input of ['alice', 'Wren Hollowmere', '紋章']) {
    assert.equal(built.emblazon(input).svg, emblazon(input).svg, input);
  }
  assert.deepEqual(
    built.emblazonOptions('s', { backdrop: 'dark' }).map((e: { svg: string }) => e.svg),
    emblazonOptions('s', { backdrop: 'dark' }).map((e) => e.svg),
  );
});
