import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { emblazon, type ThemeName } from '../src/index.ts';
import {
  CHARGES,
  COUNTERCHANGED,
  FIELD_H,
  FIELD_W,
  FUR_CONTRASTS,
  HERALDRY_VERSION,
  HERALDRY_VERSIONS,
  LINED_ORDINARIES,
  LINED_PARTITIONS,
  blazon,
  contrastsWith,
  generateArms,
  isFur,
  isMetal,
  type Arms,
  type ChargeId,
  type Paint,
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

// Every released theme version, frozen: 2,000 emblems each (default render options, so each in
// the style it was released with), hashed. A change here means existing emblems changed.
const FROZEN: [theme: ThemeName, version: number, sha256: string][] = [
  ['heraldry', 1, 'ac1349f373a697bd88f590220a1fb66013f8da8b960cbdb39b63fd809c01a57a'],
  ['heraldry', 2, 'd0302e3f70d47e4c5dab295ac1a9793daac6e7e55ae1eb2bfa78eb575c0ff2d3'],
  ['heraldry', 3, '9f54b7f3537e02299edcfa14175868dde9116f23ee63eee8adf4dc5575cab2b5'],
  ['patch', 1, '7833ecf990330b4bafbaeae0a41615226ca9adb0b4cb07a00d66393b77fd623e'],
  ['patch', 2, '96be061d8fd799a5cdd63f692596d749379ea6eff3f0f0d5a8b02a46ddd71eb8'],
  ['insignia', 1, '0680ac292273579910d28e5d0db5fe5b56dd2c52502636eb76b90aba1b76b9df'],
  ['sigil', 1, '92cb3563345f5a2ac34fa7fdfe9ddb7cfc8c7d86a101b45f859299d5d759d6f8'],
  ['eldritch', 1, '6d79aac9b90eae3db76d54dd57cd6f29acd179a613ff7a6ae82258bfc36094aa'],
  ['badge', 1, 'cb9cfb17f6d96f042116428ed8db69e9655d25a705f4297d150ac0dbfc0e5e2f'],
];

for (const [theme, version, digest] of FROZEN) {
  test(`${theme} v${version}: corpus of 2,000 emblems is byte-for-byte unchanged`, () => {
    const h = createHash('sha256');
    for (let i = 0; i < 2000; i++) {
      const e = emblazon(`corpus-${i}`, { theme, version });
      h.update(e.svg);
      h.update(e.description);
    }
    assert.equal(h.digest('hex'), digest);
  });
}

test('same input gives the same arms; case and surrounding space do not matter', () => {
  assert.deepEqual(generateArms('Alice'), generateArms('alice'));
  assert.deepEqual(generateArms('  alice\n'), generateArms('alice'));
  assert.notDeepEqual(generateArms('alice'), generateArms('alicf'));
});

test('unknown versions are rejected', () => {
  assert.throws(() => generateArms('alice', 99), RangeError);
});

const hasTag = (id: ChargeId, tag: string) => CHARGES[id].tags.includes(tag);

function checkRules(input: string, version: number, { field, ordinary, charges }: Arms): void {
  const ctx = `v${version} ${input}: ${blazon({ shield: 'heater', field, ordinary, charges })}`;
  const fieldTinctures: readonly Paint[] = field.kind === 'plain' ? [field.tincture] : field.tinctures;

  if (field.kind !== 'plain') assert.ok(isMetal(field.tinctures[0]) !== isMetal(field.tinctures[1]), `divided field pairs metal and colour — ${ctx}`);
  if (field.kind === 'partition' && !LINED_PARTITIONS.includes(field.partition)) assert.equal(field.line, 'straight', ctx);
  if (field.kind === 'variation') assert.ok(ordinary, `patterned fields always get an ordinary — ${ctx}`);
  if (version === 1) {
    assert.ok(!fieldTinctures.some(isFur) && !isFur(String(ordinary?.tincture)), `no furs in v1 — ${ctx}`);
    assert.ok(ordinary?.tincture !== COUNTERCHANGED && charges?.tincture !== COUNTERCHANGED, `no counterchanging in v1 — ${ctx}`);
  }

  // Whatever sits on the field must contrast with it; a fur on top must contrast with all of it.
  const contrastsWithField = (p: Paint) =>
    field.kind === 'plain'
      ? isFur(p)
        ? !isFur(field.tincture) && FUR_CONTRASTS[p].includes(field.tincture)
        : contrastsWith(field.tincture).includes(p)
      : isFur(p)
        ? field.tinctures.every((t) => FUR_CONTRASTS[p].includes(t))
        : !fieldTinctures.includes(p);

  if (ordinary) {
    if (ordinary.tincture === COUNTERCHANGED) {
      assert.equal(field.kind, 'partition', `only partitioned fields counterchange — ${ctx}`);
      assert.ok(!charges?.on, `a counterchanged ordinary carries no charges — ${ctx}`);
    } else assert.ok(contrastsWithField(ordinary.tincture), `ordinary tincture — ${ctx}`);
    if (isFur(String(ordinary.tincture))) assert.notEqual(ordinary.kind, 'bordure', `no fur bordure — ${ctx}`);
    if (!LINED_ORDINARIES.includes(ordinary.kind)) assert.equal(ordinary.line, 'straight', ctx);
    const fancyField = field.kind === 'partition' && field.line !== 'straight';
    assert.ok(!(fancyField && ordinary.line !== 'straight'), `at most one fancy line — ${ctx}`);
  }

  if (charges) {
    if (charges.on) {
      assert.ok(ordinary && ordinary.tincture !== COUNTERCHANGED, ctx);
      assert.ok(charges.tincture !== COUNTERCHANGED && contrastsWith(ordinary.tincture).includes(charges.tincture), `charges on the ordinary contrast with it — ${ctx}`);
      assert.ok(hasTag(charges.charge, 'compact'), `only compact charges on ordinaries — ${ctx}`);
      if (version >= 2) assert.ok(!hasTag(charges.charge, 'beast'), `no beasts on ordinaries in v2 — ${ctx}`);
    } else {
      assert.notEqual(field.kind, 'variation', `no charges directly on patterned fields — ${ctx}`);
      if (charges.tincture === COUNTERCHANGED) assert.equal(field.kind, 'partition', `only partitioned fields counterchange — ${ctx}`);
      else assert.ok(contrastsWithField(charges.tincture), `charges on the field contrast with it — ${ctx}`);
    }
    for (const { x, y, size } of charges.at) {
      assert.ok(x - size / 2 >= 0 && x + size / 2 <= FIELD_W && y - size / 2 >= 0 && y + size / 2 <= FIELD_H, `charge inside field — ${ctx}`);
    }
  }
}

for (const version of HERALDRY_VERSIONS) {
  test(`v${version}: 10,000 generated arms all obey the rules`, () => {
    for (let i = 0; i < 10_000; i++) {
      const input = `rule-check-${i}`;
      checkRules(input, version, generateArms(input, version));
    }
  });

  test(`v${version}: blazons are well-formed`, () => {
    for (let i = 0; i < 2_000; i++) {
      const text = blazon(generateArms(`blazon-${i}`, version));
      assert.match(text, /^[A-Z][^.]*\.$/, text);
      assert.doesNotMatch(text, /undefined|NaN|  |\ba [aeiou]/i, text);
      assert.doesNotMatch(text, /Counterchanged/, `"counterchanged" stays lower case: ${text}`);
    }
  });
}

test('emblazon() returns svg, config and description together', () => {
  const e = emblazon('alice', { size: 64 });
  assert.equal(e.theme, 'heraldry');
  assert.equal(e.version, HERALDRY_VERSION);
  assert.match(e.svg, /^<svg [^>]*width="64"/);
  assert.deepEqual(e.config, generateArms('alice'));
  assert.equal(e.description, blazon(e.config));
});
