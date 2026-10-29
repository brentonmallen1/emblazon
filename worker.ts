/**
 * The service on Cloudflare Workers (see wrangler.toml). Site pages, the picker's library modules
 * and their headers are static assets built by scripts/build-site.ts and served by Cloudflare
 * before this code runs; the Worker answers the API and emblem image routes.
 */
import { handle } from './src/preview/handler.ts';

/** Cloudflare's rate-limiting binding: a fixed allowance per key per period. */
interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  PUBLIC_URL?: string;
  /** Must match `simple.limit` of the LIMITER binding in wrangler.toml; used in headers and docs. */
  RATE_LIMIT_PER_MINUTE?: string;
  LIMITER?: RateLimitBinding;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const perMinute = Number(env.RATE_LIMIT_PER_MINUTE ?? 120);
    const limiter = env.LIMITER;
    return handle(request, {
      // Set by Cloudflare from the connection: clients can't forge it.
      clientIp: request.headers.get('cf-connecting-ip') ?? 'unknown',
      publicUrl: env.PUBLIC_URL,
      fallbackHost: new URL(request.url).host,
      rateLimit:
        limiter &&
        (async (key) => {
          const { success } = await limiter.limit({ key });
          // The binding counts in one-minute windows and reports nothing more; at worst a client waits a window.
          return { ok: success, limit: perMinute, retryAfter: success ? 0 : 60 };
        }),
      limitSummary: limiter && `Each client may make <b>${perMinute}</b> requests per minute.`,
    });
  },
};
