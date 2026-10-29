import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emblazon, emblazonOptions } from '../src/index.ts';
import { canDraw } from '../src/core/stroke-font.ts';
import { INSIGNIA_STYLES, describeInsignia, generateInsignia, insigniaLookKey, renderInsignia } from '../src/themes/insignia/index.ts';

test('crew tags are deterministic and well-formed', () => {
  for (let i = 0; i < 500; i++) {
    const input = `tag-${i}`;
    const t = generateInsignia(input);
    assert.deepEqual(generateInsignia(input), t);
    const svg = renderInsignia(t);
    assert.equal(renderInsignia(structuredClone(t)), svg);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, input);
    assert.doesNotMatch(svg, /<text/, `letters are paths, not font-dependent text — ${input}`);
  }
});

test('crew tag rules hold over 5,000 inputs', () => {
  const styles = new Set<string>();
  for (let i = 0; i < 5_000; i++) {
    const t = generateInsignia(`rule-${i}`);
    const ctx = `rule-${i}: ${describeInsignia(t)}`;
    styles.add(t.style);
    const [a, b] = t.mark;
    assert.match(a, /^[A-Z]$/, `the mark starts with a capital — ${ctx}`);
    assert.match(b, /^[A-Z0-9]$/, ctx);
    assert.doesNotMatch(a + b, /[IOQ]/, `no characters that read as digits — ${ctx}`);
    assert.ok(!['SS', 'SA', 'KK', 'HH', 'FU'].includes(a + b), `no unfortunate pairs — ${ctx}`);
    assert.match(t.serial, /^[A-Z]{2}-\d{2}$/, ctx);
    assert.ok(!['14', '18', '88'].includes(t.serial.slice(-2)), ctx);
    assert.ok(canDraw(a + b + t.serial), ctx);
    if (t.style === 'neon') assert.ok(t.bits > 0 && t.bits < 0x1000, ctx);
    assert.match(describeInsignia(t), /^Crew tag [A-Z]{2}-\d{2}: \S+ on an? [\w ]+ (hazard tag|neon tag|corp stamp) with .+/, ctx);
  }
  assert.deepEqual([...styles].sort(), [...INSIGNIA_STYLES].sort());
});

test('the theme option routes to crew tags, with pickers and dark rims', () => {
  const e = emblazon('alice', { theme: 'insignia', backdrop: 'dark' });
  assert.equal(e.theme, 'insignia');
  assert.deepEqual(e.credits, []);
  assert.match(e.svg, /stroke="#EDE6D6" stroke-width="6"/);
  const options = emblazonOptions('session:Wren', { theme: 'insignia', count: 6 });
  assert.equal(options.length, 6);
  assert.equal(new Set(options.map((o) => insigniaLookKey(o.config))).size, 6);
  for (const o of options) assert.equal(emblazon(o.input, { theme: 'insignia', version: o.version }).svg, o.svg);
  assert.throws(() => generateInsignia('x', 99), RangeError);
});
