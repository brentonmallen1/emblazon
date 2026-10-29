import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { sha256 } from '../src/core/hash.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

test('pure-JS sha256 matches node:crypto, including padding boundaries and Unicode', () => {
  const inputs = ['', 'a', 'abc', 'v1:heraldry:field:alice', 'ünïcödé · 紋章 · 🛡️', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)];
  for (let i = 0; i < 200; i++) inputs.push(`user${i}@example.com`);
  for (const s of inputs) assert.equal(hex(sha256(s)), createHash('sha256').update(s, 'utf8').digest('hex'), JSON.stringify(s.slice(0, 20)));
});

test('the library source (src/) imports nothing from Node, so it runs in the browser', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  for (const file of walk('src').filter((f) => f.endsWith('.ts'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /from ['"]node:|require\(/, file);
  }
});
