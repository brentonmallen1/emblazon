import assert from 'node:assert/strict';
import { test } from 'node:test';
import { int, pick, rngFor, weighted } from '../src/core/rng.ts';

const draw = (n: number, ...parts: string[]) => {
  const r = rngFor(...parts);
  return Array.from({ length: n }, () => r());
};

test('same parts give the same sequence', () => {
  assert.deepEqual(draw(20, 'v1', 'heraldry', 'field', 'alice'), draw(20, 'v1', 'heraldry', 'field', 'alice'));
});

test('slots, inputs and versions give independent streams', () => {
  const base = draw(5, 'v1', 'heraldry', 'field', 'alice');
  assert.notDeepEqual(base, draw(5, 'v1', 'heraldry', 'shield', 'alice'));
  assert.notDeepEqual(base, draw(5, 'v1', 'heraldry', 'field', 'bob'));
  assert.notDeepEqual(base, draw(5, 'v2', 'heraldry', 'field', 'alice'));
});

test('values stay in range', () => {
  const r = rngFor('range');
  for (let i = 0; i < 10_000; i++) {
    const x = r();
    assert.ok(x >= 0 && x < 1);
    const k = int(r, 3, 7);
    assert.ok(Number.isInteger(k) && k >= 3 && k <= 7);
    assert.ok(['a', 'b', 'c'].includes(pick(r, ['a', 'b', 'c'])));
  }
});

test('weighted follows weights and never picks zero-weight keys', () => {
  const r = rngFor('weights');
  const counts = { common: 0, rare: 0, never: 0 };
  for (let i = 0; i < 20_000; i++) counts[weighted(r, { common: 9, rare: 1, never: 0 })]++;
  assert.equal(counts.never, 0);
  const share = counts.rare / 20_000;
  assert.ok(share > 0.08 && share < 0.12, `rare share ${share}`);
});
