import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pt } from '../src/core/svg.ts';
import {
  LINE_STYLES,
  LINED_ORDINARIES,
  LINED_PARTITIONS,
  ORDINARIES,
  PARTITIONS,
  SHIELDS,
  VARIATIONS,
  edge,
  renderArms,
  type Arms,
} from '../src/themes/heraldry/index.ts';

test('every line style ends exactly on its end point', () => {
  const cases: [Pt, Pt][] = [
    [[-40, 66], [240, 66]],
    [[100, -40], [100, 260]],
    [[-40, -40], [260, 260]],
    [[240, -40], [-60, 260]],
    [[122, 78], [240, 78]],
  ];
  for (const style of LINE_STYLES) {
    for (const [a, b] of cases) {
      const d = edge(a, b, style);
      const m = d.match(/(-?[\d.]+) (-?[\d.]+)$/);
      assert.ok(m, `${style}: no trailing point in ${d.slice(-40)}`);
      assert.ok(Math.abs(Number(m[1]) - b[0]) < 0.01 && Math.abs(Number(m[2]) - b[1]) < 0.01, `${style} ends at ${m[1]},${m[2]}`);
    }
  }
});

function* everyArms(): Generator<Arms> {
  for (const shield of SHIELDS) yield { shield, field: { kind: 'plain', tincture: 'azure' } };
  for (const partition of PARTITIONS) {
    for (const line of LINED_PARTITIONS.includes(partition) ? LINE_STYLES : (['straight'] as const)) {
      yield { shield: 'heater', field: { kind: 'partition', partition, line, tinctures: ['or', 'gules'] } };
    }
  }
  for (const variation of VARIATIONS) yield { shield: 'heater', field: { kind: 'variation', variation, tinctures: ['argent', 'sable'] } };
  for (const kind of ORDINARIES) {
    for (const line of LINED_ORDINARIES.includes(kind) ? LINE_STYLES : (['straight'] as const)) {
      yield { shield: 'french', field: { kind: 'plain', tincture: 'vert' }, ordinary: { kind, line, tincture: 'or' } };
    }
  }
}

test('every procedural option renders well-formed, deterministic SVG', () => {
  let count = 0;
  for (const arms of everyArms()) {
    const svg = renderArms(arms);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, JSON.stringify(arms));
    assert.match(svg, /^<svg [^>]*viewBox="0 0 240 240"/);
    assert.equal(svg, renderArms(structuredClone(arms)));
    count++;
  }
  assert.ok(count > 100, `only ${count} combinations`);
});

test('different arms get different element ids', () => {
  const a = renderArms({ shield: 'heater', field: { kind: 'plain', tincture: 'or' } });
  const b = renderArms({ shield: 'heater', field: { kind: 'plain', tincture: 'gules' } });
  const id = (svg: string) => svg.match(/clipPath id="([^"]+)"/)?.[1];
  assert.notEqual(id(a), id(b));
});
