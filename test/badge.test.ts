import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblazon, emblazonOptions } from '../src/index.ts';
import { canDraw } from '../src/core/stroke-font.ts';
import { badgeLookKey, describeBadge, generateBadge, renderBadge } from '../src/themes/badge/index.ts';

// Badge v1 is not frozen yet; once released, its corpus digest goes in generate.test.ts.

test('badges are deterministic and well-formed', () => {
  for (let i = 0; i < 500; i++) {
    const input = `badge-${i}`;
    const b = generateBadge(input);
    assert.deepEqual(generateBadge(input), b);
    const svg = renderBadge(b);
    assert.equal(renderBadge(structuredClone(b)), svg);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity|<text/, input);
  }
});

test('badge rules hold over 5,000 inputs', () => {
  const kinds = new Set<string>();
  for (let i = 0; i < 5_000; i++) {
    const b = generateBadge(`rule-${i}`);
    const ctx = `rule-${i}: ${describeBadge(b)}`;
    kinds.add(b.kind);
    if (b.kind === 'sticker') {
      assert.match(b.letters, /^[A-Z]{2}$/, ctx);
      assert.notEqual(b.letters[0], b.letters[1], ctx);
      assert.ok(canDraw(b.letters + b.number), ctx);
      assert.match(b.number, /^\d\d$/, ctx);
      assert.ok(Math.abs(b.tilt) >= 3 && Math.abs(b.tilt) <= 8, `stickers are visibly tilted — ${ctx}`);
    } else {
      assert.ok([0, 3, 5].includes(b.stars), ctx);
    }
    assert.match(describeBadge(b), /^[A-Z][\w ]+ (badge|sticker): .+/, ctx);
  }
  assert.deepEqual([...kinds].sort(), ['flat', 'sticker']);
});

test('the theme option routes to badges, with pickers and dark rims', () => {
  let flat = '';
  for (let i = 0; !flat; i++) {
    const e = emblazon(`dark-${i}`, { theme: 'badge', backdrop: 'dark' });
    if (e.config.kind === 'flat') flat = e.svg;
  }
  assert.match(flat, /stroke="#EDE6D6" stroke-width="6"/);
  const e = emblazon('alice', { theme: 'badge' });
  assert.equal(e.theme, 'badge');
  assert.deepEqual(e.credits, []);
  const options = emblazonOptions('session:Wren', { theme: 'badge', count: 6 });
  assert.equal(options.length, 6);
  assert.equal(new Set(options.map((o) => badgeLookKey(o.config))).size, 6);
  for (const o of options) assert.equal(emblazon(o.input, { theme: 'badge', version: o.version }).svg, o.svg);
  assert.throws(() => generateBadge('x', 99), RangeError);
});
