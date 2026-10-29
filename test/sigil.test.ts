import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblazon, emblazonOptions } from '../src/index.ts';
import { MARKS_FOR, SIGIL_STYLES, describeSigil, generateSigil, renderSigil, sigilCredits, sigilLookKey, type Sigil } from '../src/themes/sigil/index.ts';

test('sigils are deterministic and well-formed in every style', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 600; i++) {
    const input = `sigil-${i}`;
    const sg = generateSigil(input);
    seen.add(sg.style);
    assert.deepEqual(generateSigil(input), sg);
    for (const backdrop of ['light', 'dark'] as const) {
      const svg = renderSigil(sg, { backdrop });
      assert.equal(renderSigil(structuredClone(sg), { backdrop }), svg);
      assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, input);
    }
  }
  assert.deepEqual([...seen].sort(), [...SIGIL_STYLES].sort());
});

test('sigil rules hold over 5,000 inputs', () => {
  for (let i = 0; i < 5_000; i++) {
    const sg: Sigil = generateSigil(`rule-${i}`);
    const ctx = `rule-${i}: ${describeSigil(sg)}`;
    switch (sg.style) {
      case 'seal':
        if (sg.runes) {
          assert.ok(sg.rings >= 2, `runes need a band between two rings — ${ctx}`);
          assert.ok(sg.ticks.count === 0 || sg.ticks.style !== 'cross', `runes never sit under crossing ticks — ${ctx}`);
        }
        break;
      case 'wax':
        assert.ok(!(sg.ribbon && sg.drips.length), `a ribbon hides drips, so never both — ${ctx}`);
        assert.ok(!(sg.gilt && (sg.wax === 'ochre' || sg.wax === 'bone')), `gold leaf only shows on darker wax — ${ctx}`);
        assert.ok(sg.lobes.every((r) => r >= 86 && r <= 95), ctx);
        assert.ok(sg.drips.every((d, k) => k === 0 || d.at - sg.drips[k - 1].at >= 6), `drips hang apart — ${ctx}`);
        break;
      case 'thorn': {
        assert.ok(sg.marks.length >= 1, ctx);
        assert.ok(sg.marks.every((m) => MARKS_FOR[sg.stave].includes(m.kind)), ctx);
        const slots = sg.marks.map((m) => m.slot).sort();
        if (sg.stave === 'single') assert.ok(slots.every((s, k) => k === 0 || s - slots[k - 1] >= 2), `marks never on adjacent heights — ${ctx}`);
        assert.ok(!sg.tine || sg.stave === 'forked', ctx);
        break;
      }
    }
    assert.ok(sg.style === 'thorn' || sigilCredits(sg).length <= 1, ctx);
    assert.match(describeSigil(sg), /^(Sigil|Seal|Thorned rune) (of|in) .+/, ctx);
  }
});

test('the theme option routes to sigils, with pickers and dark rims', () => {
  const e = emblazon('alice', { theme: 'sigil', backdrop: 'dark' });
  assert.equal(e.theme, 'sigil');
  assert.match(e.svg, /#EDE6D6/);
  const options = emblazonOptions('session:Wren', { theme: 'sigil', count: 6 });
  assert.equal(options.length, 6);
  assert.equal(new Set(options.map((o) => sigilLookKey(o.config))).size, 6);
  for (const o of options) assert.equal(emblazon(o.input, { theme: 'sigil', version: o.version }).svg, o.svg);
  assert.throws(() => generateSigil('x', 99), RangeError);
});

test('creature sigils carry their art credit', () => {
  for (let i = 0; i < 2_000; i++) {
    const sg = generateSigil(`credit-${i}`);
    if (sg.style !== 'thorn' && ['raven', 'bat', 'owl', 'rose'].includes(sg.center)) {
      assert.equal(sigilCredits(sg).length, 1, describeSigil(sg));
      return;
    }
  }
  assert.fail('no creature sigil in 2,000 inputs');
});
