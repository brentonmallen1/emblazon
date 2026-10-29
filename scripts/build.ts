/**
 * Writes dist/: the library as plain ES modules for consumers that can't compile TypeScript.
 * TypeScript consumers (like jb-rpg's Vite frontend) can import src/ directly instead.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { toBrowserJs } from './lib/browser-js.ts';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

rmSync('dist', { recursive: true, force: true });
const files = walk('src').filter((f) => f.endsWith('.ts') && !f.startsWith(join('src', 'preview')));
for (const file of files) {
  const out = join('dist', relative('src', file)).replace(/\.ts$/, '.js');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toBrowserJs(readFileSync(file, 'utf8')));
}
console.log(`wrote ${files.length} modules to dist/`);
