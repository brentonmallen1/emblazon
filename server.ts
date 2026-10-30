/**
 * The site and API on Node, for `just dev` and Docker. All routing lives in the shared handler
 * (src/preview/handler.ts); this file adapts Node's HTTP server to it and supplies what only
 * Node has: the socket address, the in-memory rate limiter, and files on disk.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { RateLimiter, clientKey } from './src/preview/guard.ts';
import { handle } from './src/preview/handler.ts';

const env = process.env;
const PORT = Number(env.PORT ?? 4747);
/** Public base URL, e.g. https://emblems.example.com. Set it in production so links never come from request headers. */
const PUBLIC_URL = env.PUBLIC_URL || undefined;
/** Behind a reverse proxy or CDN, believe its client-IP and host headers. Off when exposed directly. */
const TRUST_PROXY = env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true';
/** Sustained requests per minute per client; 0 turns rate limiting off. */
const RATE_PER_MINUTE = Number(env.RATE_LIMIT_PER_MINUTE ?? 120);
/** Requests a client may make at once before the sustained rate applies. */
const RATE_BURST = Math.max(1, Number(env.RATE_LIMIT_BURST ?? 60));

const limiter = RATE_PER_MINUTE > 0 ? new RateLimiter(RATE_PER_MINUTE, RATE_BURST) : undefined;

function reviewPage(name: string): string | undefined {
  try {
    return readFileSync(join('out', name), 'utf8');
  } catch {
    return undefined;
  }
}

const context = {
  publicUrl: PUBLIC_URL,
  trustProxy: TRUST_PROXY,
  fallbackHost: `localhost:${PORT}`,
  rateLimit: limiter && ((ip: string) => limiter.take(ip)),
  limitSummary: limiter && `Each client may make <b>${RATE_BURST}</b> requests at once, refilled at <b>${RATE_PER_MINUTE} per minute</b>.`,
  reviewPage,
};

const server = createServer(async (req, res) => {
  let request: Request;
  try {
    request = new Request(new URL(req.url ?? '/', `http://${context.fallbackHost}`), { method: req.method, headers: req.headers as Record<string, string> });
  } catch {
    // Methods the Request constructor refuses (TRACE, CONNECT), or a malformed target.
    res.writeHead(405, { allow: 'GET, HEAD, OPTIONS', 'content-type': 'text/plain; charset=utf-8' });
    return res.end('method not allowed');
  }
  let response: Response;
  try {
    response = await handle(request, { ...context, clientIp: clientKey(req.headers, req.socket.remoteAddress, TRUST_PROXY) });
  } catch (err) {
    console.error(err);
    response = new Response('internal error', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
});

// Slow or stalled clients can't hold connections open.
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;

server.listen(PORT, () =>
  console.log(
    `emblazon on http://localhost:${PORT}` +
      (limiter ? ` · rate limit ${RATE_PER_MINUTE}/min, burst ${RATE_BURST}` : ' · rate limit off') +
      (TRUST_PROXY ? ' · trusting proxy headers' : '') +
      (PUBLIC_URL ? ` · public URL ${PUBLIC_URL}` : ''),
  ),
);
