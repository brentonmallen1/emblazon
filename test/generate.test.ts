import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { emblazon } from '../src/index.ts';
import {
  CHARGES,
  FIELD_H,
  FIELD_W,
  LINED_ORDINARIES,
  LINED_PARTITIONS,
  blazon,
  generateArms,
  isMetal,
  type Arms,
  type Tincture,
} from '../src/themes/heraldry/index.ts';

// heraldry v1 is frozen: if one of these changes, existing users' emblems changed too.
// Intentional changes go in a new version, never into v1.
const V1_SNAPSHOTS: Record<string, [blazon: string, svgSha256: string]> = {
  alice: ['Azure, three bezants, a bordure Or.', 'f195635c26d41e29'],
  bob: ['Quarterly dancetty Argent and Azure, a key Vert.', '94fc3404b08e6597'],
  'carol@example.com': ['Sable, a saltire Or.', '193853211fb46222'],
  brenton: ['Vert, a fleur-de-lis Argent, a bordure Or.', '76ff23c87025ee1f'],
  emblazon: ['Or, a chevron indented between three mascles Azure.', '91803eec559d59d5'],
  peggy: ['Per bend engrailed Sable and Or, a chevron Azure between three towers Vert.', 'e6b5ba0fe547bb39'],
};

test('v1 output is frozen', () => {
  for (const [input, [text, hash]] of Object.entries(V1_SNAPSHOTS)) {
    const emblem = emblazon(input, { version: 1 });
    assert.equal(emblem.description, text, input);
    assert.equal(createHash('sha256').update(emblem.svg).digest('hex').slice(0, 16), hash, `${input} svg`);
  }
});

test('same input gives the same arms; case and surrounding space do not matter', () => {
  assert.deepEqual(generateArms('Alice'), generateArms('alice'));
  assert.deepEqual(generateArms('  alice\n'), generateArms('alice'));
  assert.notDeepEqual(generateArms('alice'), generateArms('alicf'));
});

test('unknown versions are rejected', () => {
  assert.throws(() => generateArms('alice', 99), RangeError);
});

const opposite = (a: Tincture, b: Tincture) => isMetal(a) !== isMetal(b);

function checkRules(input: string, { field, ordinary, charges }: Arms): void {
  const ctx = `${input}: ${blazon({ shield: 'heater', field, ordinary, charges })}`;
  const fieldTinctures = field.kind === 'plain' ? [field.tincture] : field.tinctures;

  if (field.kind !== 'plain') assert.ok(opposite(...field.tinctures), `divided field pairs metal and colour — ${ctx}`);
  if (field.kind === 'partition' && !LINED_PARTITIONS.includes(field.partition)) assert.equal(field.line, 'straight', ctx);
  if (field.kind === 'variation') assert.ok(ordinary, `patterned fields always get an ordinary — ${ctx}`);

  // Whatever sits on the field must contrast with it.
  const contrastsWithField = (t: Tincture) => (field.kind === 'plain' ? opposite(t, field.tincture) : !fieldTinctures.includes(t));

  if (ordinary) {
    assert.ok(contrastsWithField(ordinary.tincture), `ordinary tincture — ${ctx}`);
    if (!LINED_ORDINARIES.includes(ordinary.kind)) assert.equal(ordinary.line, 'straight', ctx);
    const fancyField = field.kind === 'partition' && field.line !== 'straight';
    assert.ok(!(fancyField && ordinary.line !== 'straight'), `at most one fancy line — ${ctx}`);
  }

  if (charges) {
    if (charges.on) {
      assert.ok(ordinary, ctx);
      assert.ok(opposite(charges.tincture, ordinary.tincture), `charges on the ordinary contrast with it — ${ctx}`);
      assert.ok((CHARGES[charges.charge].tags as readonly string[]).includes('compact'), `only compact charges on ordinaries — ${ctx}`);
    } else {
      assert.notEqual(field.kind, 'variation', `no charges directly on patterned fields — ${ctx}`);
      assert.ok(contrastsWithField(charges.tincture), `charges on the field contrast with it — ${ctx}`);
    }
    for (const { x, y, size } of charges.at) {
      assert.ok(x - size / 2 >= 0 && x + size / 2 <= FIELD_W && y - size / 2 >= 0 && y + size / 2 <= FIELD_H, `charge inside field — ${ctx}`);
    }
  }
}

test('10,000 generated arms all obey the rules', () => {
  for (let i = 0; i < 10_000; i++) {
    const input = `rule-check-${i}`;
    checkRules(input, generateArms(input));
  }
});

test('blazons are well-formed', () => {
  for (let i = 0; i < 2_000; i++) {
    const text = blazon(generateArms(`blazon-${i}`));
    assert.match(text, /^[A-Z][^.]*\.$/, text);
    assert.doesNotMatch(text, /undefined|NaN|  |\ba [aeiou]/i, text);
  }
});

test('emblazon() returns svg, config and description together', () => {
  const e = emblazon('alice', { size: 64 });
  assert.equal(e.theme, 'heraldry');
  assert.equal(e.version, 1);
  assert.match(e.svg, /^<svg [^>]*width="64"/);
  assert.deepEqual(e.config, generateArms('alice'));
  assert.equal(e.description, blazon(e.config));
});
