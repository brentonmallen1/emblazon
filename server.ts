import { createServer, type ServerResponse } from 'node:http';
import { heraldrySheet } from './src/preview/heraldry-sheet.ts';

const PORT = Number(process.env.PORT ?? 4747);

function send(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/') {
    res.writeHead(302, { location: '/sheet/heraldry' });
    res.end();
  } else if (pathname === '/sheet/heraldry') {
    send(res, 200, 'text/html; charset=utf-8', heraldrySheet());
  } else {
    send(res, 404, 'text/plain; charset=utf-8', 'not found');
  }
}).listen(PORT, () => console.log(`emblazon preview on http://localhost:${PORT}`));
