import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblazon, emblazonOptions } from '../src/index.ts';
import { LEATHER_CLASH } from '../src/themes/mark/palette.ts';
import { describeMark, generateMark, markLookKey, renderMark } from '../src/themes/mark/index.ts';

// Mark v1's exact output will be frozen by a corpus digest in generate.test.ts once released;
// these check behaviour and rules.

test('marks are deterministic and well-formed', () => {
  for (let i = 0; i < 500; i++) {
    const input = `mark-${i}`;
    const m = generateMark(input);
    assert.deepEqual(generateMark(input), m);
    const svg = renderMark(m);
    assert.equal(renderMark(structuredClone(m)), svg);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, input);
    assert.doesNotMatch(svg, /<text/, `marks carry no text — ${input}`);
  }
});

test('mark rules hold over 5,000 inputs', () => {
  const kinds = new Set<string>();
  for (let i = 0; i < 5_000; i++) {
    const m = generateMark(`rule-${i}`);
    const s = m.subject;
    const ctx = `rule-${i}: ${describeMark(m)}`;
    kinds.add(s.kind);
    if (s.kind === 'idol' && s.wings === 'bust') assert.equal(s.plinth, 'none', `a bust stands on nothing — ${ctx}`);
    if (s.kind === 'tablet' && s.carving === 'star') assert.notEqual(s.crown, 'star', `no star above a star — ${ctx}`);
    if (s.kind === 'book') assert.notEqual(LEATHER_CLASH[s.leather], m.field, `the cover stands out from the field — ${ctx}`);
    assert.match(describeMark(m), /^An? [a-z]+ [a-z]+ on [a-z ]+: an? .+/, ctx);
  }
  assert.deepEqual([...kinds].sort(), ['book', 'idol', 'tablet']);
});

test('ids are unique per mark and animation is opt-in and respects reduced motion', () => {
  const a = renderMark(generateMark('alice'));
  const b = renderMark(generateMark('bob'));
  const ids = (svg: string) => new Set([...svg.matchAll(/id="([^"]+)"/g)].map((x) => x[1]));
  for (const id of ids(a)) assert.ok(!ids(b).has(id), id);
  assert.doesNotMatch(a, /@keyframes/);
  const moving = renderMark(generateMark('alice'), { animate: true });
  assert.match(moving, /@keyframes/);
  assert.match(moving, /prefers-reduced-motion: reduce/);
});

test('the theme option routes to marks, with pickers and dark rims', () => {
  const e = emblazon('alice', { theme: 'mark', backdrop: 'dark' });
  assert.equal(e.theme, 'mark');
  assert.deepEqual(e.credits, []);
  assert.match(e.svg, /stroke="#EDE6D6" stroke-width="6"/);
  const options = emblazonOptions('session:Wren', { theme: 'mark', count: 6 });
  assert.equal(options.length, 6);
  assert.equal(new Set(options.map((o) => markLookKey(o.config))).size, 6);
  for (const o of options) assert.equal(emblazon(o.input, { theme: 'mark', version: o.version }).svg, o.svg);
  assert.throws(() => generateMark('x', 99), RangeError);
});
