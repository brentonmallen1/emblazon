import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { emblazon } from './src/index.ts';
import { heraldrySheet } from './src/preview/heraldry-sheet.ts';
import { picker } from './src/preview/picker.ts';
import { playground } from './src/preview/playground.ts';
import { toBrowserJs } from './scripts/lib/browser-js.ts';
import { HERALDRY_VERSION, HERALDRY_VERSIONS } from './src/themes/heraldry/index.ts';

const PORT = Number(process.env.PORT ?? 4747);

function send(res: ServerResponse, status: number, type: string, body: string, cache = 'no-store'): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': cache });
  res.end(body);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const { pathname, searchParams } = url;

  if (pathname === '/') return send(res, 200, 'text/html; charset=utf-8', playground());
  if (pathname === '/sheet/heraldry') return send(res, 200, 'text/html; charset=utf-8', heraldrySheet());

  if (pathname === '/picker') return send(res, 200, 'text/html; charset=utf-8', picker());

  // The library as browser ES modules, types stripped on the fly: /lib/index.js ← src/index.ts.
  // Segments of word characters and '-', single dots allowed inside a file name (charges.generated),
  // so '..' can never match and nothing outside src/ is reachable.
  const lib = pathname.match(/^\/lib\/((?:[\w-]+\/)*[\w-]+(?:\.[\w-]+)*)\.js$/);
  if (lib) {
    try {
      return send(res, 200, 'text/javascript; charset=utf-8', toBrowserJs(readFileSync(join('src', `${lib[1]}.ts`), 'utf8')));
    } catch {
      return send(res, 404, 'text/plain; charset=utf-8', 'not found');
    }
  }

  // Generated review pages in out/ (gitignored). Plain names only: no directories, no traversal.
  const page = pathname.match(/^\/out\/([\w.-]+\.html)$/);
  if (page) {
    try {
      return send(res, 200, 'text/html; charset=utf-8', readFileSync(join('out', page[1]), 'utf8'));
    } catch {
      return send(res, 404, 'text/plain; charset=utf-8', 'not found');
    }
  }

  // GET /heraldry/{input}.svg?size=&v=   and   GET /heraldry/{input}.json?v=
  const m = pathname.match(/^\/heraldry\/(.+)\.(svg|json)$/);
  if (m) {
    let input: string;
    try {
      input = decodeURIComponent(m[1]);
    } catch {
      return send(res, 400, 'text/plain; charset=utf-8', 'malformed input');
    }
    const version = Number(searchParams.get('v') ?? HERALDRY_VERSION);
    if (!HERALDRY_VERSIONS.includes(version)) return send(res, 400, 'text/plain; charset=utf-8', `unknown version; have ${HERALDRY_VERSIONS.join(', ')}`);
    const sizeParam = searchParams.get('size');
    const size = sizeParam ? Math.min(1024, Math.max(16, Math.round(Number(sizeParam)) || 0)) : undefined;

    const emblem = emblazon(input, { version, size });
    // Output is a pure function of the URL, so a pinned version can be cached forever.
    const cache = searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
    if (m[2] === 'svg') return send(res, 200, 'image/svg+xml', emblem.svg, cache);
    const { svg: _svg, ...meta } = emblem;
    return send(res, 200, 'application/json', JSON.stringify(meta), cache);
  }

  send(res, 404, 'text/plain; charset=utf-8', 'not found');
}).listen(PORT, () => console.log(`emblazon preview on http://localhost:${PORT}`));
