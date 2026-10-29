import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblazon, emblazonOptions } from '../src/index.ts';
import { SURFACE_CRAFT, describePatch, generatePatch, patchLookKey, renderPatch } from '../src/themes/patch/index.ts';

// Patch v1's exact output is frozen by the corpus digest in generate.test.ts; these check
// behaviour and rules.

test('patches are deterministic and well-formed', () => {
  for (let i = 0; i < 500; i++) {
    const input = `patch-${i}`;
    const p = generatePatch(input);
    assert.deepEqual(generatePatch(input), p);
    const svg = renderPatch(p);
    assert.equal(renderPatch(structuredClone(p)), svg);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, input);
  }
});

test('patch rules hold over 5,000 inputs', () => {
  for (let i = 0; i < 5_000; i++) {
    const p = generatePatch(`rule-${i}`);
    const ctx = `rule-${i}: ${describePatch(p)}`;
    if (SURFACE_CRAFT.includes(p.vehicle.kind)) {
      assert.ok(p.body && p.body.placement === 'horizon' && ['moon', 'mars', 'dune'].includes(p.body.kind), `surface craft stand on rock or sand — ${ctx}`);
      assert.equal(p.angle, 0, `surface craft stand upright — ${ctx}`);
      assert.equal(p.trajectory, undefined, `surface craft have no trajectory — ${ctx}`);
    }
    assert.ok(p.accents.crew >= 0 && p.accents.crew <= 7, ctx);
    assert.ok(!(p.body?.kind === 'moon' && p.accents.moon), `no extra moon beside the Moon — ${ctx}`);
    assert.match(describePatch(p), /^[A-Z][\w-]*( [\w-]+)?: an? .+/, ctx);
  }
});

test('the theme option routes to patches, with pickers and dark rims', () => {
  const e = emblazon('alice', { theme: 'patch', backdrop: 'dark' });
  assert.equal(e.theme, 'patch');
  assert.deepEqual(e.credits, []);
  assert.match(e.svg, /stroke="#EDE6D6" stroke-width="5"/);
  const options = emblazonOptions('session:Wren', { theme: 'patch', count: 6 });
  assert.equal(options.length, 6);
  assert.equal(new Set(options.map((o) => patchLookKey(o.config))).size, 6);
  for (const o of options) assert.equal(emblazon(o.input, { theme: 'patch', version: o.version }).svg, o.svg);
  assert.throws(() => generatePatch('x', 99), RangeError);
});
