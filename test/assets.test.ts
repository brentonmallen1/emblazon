import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { OUT_FILE, compileAsset, compileDir, generateModule } from '../scripts/build-assets.ts';
import { CHARGE_IDS, TINCTURES, renderArms, renderCharge } from '../src/themes/heraldry/index.ts';

test('every charge source passes the asset contract', () => {
  const { assets, errors } = compileDir();
  assert.deepEqual(errors, []);
  assert.ok(assets.length >= 20, `only ${assets.length} charges`);
});

test('compiled charges are up to date with their sources', () => {
  const { assets } = compileDir();
  assert.equal(readFileSync(OUT_FILE, 'utf8'), generateModule(assets), 'run `npm run assets`');
});

const svg = (body: string, root = 'viewBox="0 0 100 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${root} data-id="x" data-name="x" data-plural="xs" data-weight="1" data-tags="">${body}</svg>`;

test('the validator rejects contract violations', () => {
  const errorsFor = (source: string) => compileAsset('x.svg', source).errors.join('\n');
  assert.equal(errorsFor(svg('<path d="M0 0H10V10Z"/>')), '');
  assert.match(errorsFor(svg('<path fill="#f00" d="M0 0H10V10Z"/>')), /fill/);
  assert.match(errorsFor(svg('<path transform="scale(2)" d="M0 0H10V10Z"/>')), /transform/);
  assert.match(errorsFor(svg('<text>hi</text>')), /<text> is not allowed/);
  assert.match(errorsFor(svg('<path d="M0 0H140V10Z"/>')), /outside/);
  assert.match(errorsFor(svg('<path d="M0 0H10V10Z"/>', 'viewBox="0 0 24 24"')), /viewBox/);
  assert.match(errorsFor(svg('')), /no shapes/);
});

test('every charge renders in every tincture and on a shield', () => {
  for (const charge of CHARGE_IDS) {
    for (const tincture of TINCTURES) assert.doesNotMatch(renderCharge(charge, tincture), /NaN|undefined/);
    const arms = renderArms({
      shield: 'heater',
      field: { kind: 'plain', tincture: 'azure' },
      charges: { charge, tincture: 'or', at: [{ x: 100, y: 100, size: 120 }] },
    });
    assert.doesNotMatch(arms, /NaN|undefined/);
    assert.match(arms, /<use href="#[^"]+-ch"/);
  }
});
