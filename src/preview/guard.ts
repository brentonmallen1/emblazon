/**
 * Request protection for the service: a per-client rate limiter, client identification behind
 * proxies, and the security headers each kind of response gets. No Node APIs, so a Worker or
 * other runtime can reuse it.
 */

export interface RateDecision {
  ok: boolean;
  /** Bucket size: requests allowed in a burst. */
  limit: number;
  /** Whole requests left right now, when the limiter knows. */
  remaining?: number;
  /** Seconds until the allowance is full again, when the limiter knows. */
  reset?: number;
  /** Seconds to wait before the next request is allowed (0 when ok). */
  retryAfter: number;
}

/**
 * Token bucket per key: `burst` requests at once, refilled at `perMinute`. Memory is bounded:
 * full buckets are dropped on a sweep, and at `maxKeys` the oldest entries go first.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();
  /** Tokens per millisecond. */
  private readonly rate: number;
  readonly burst: number;
  private readonly maxKeys: number;
  private lastSweep = 0;

  constructor(perMinute: number, burst: number, maxKeys = 50_000) {
    this.rate = perMinute / 60_000;
    this.burst = burst;
    this.maxKeys = maxKeys;
  }

  take(key: string, now: number = Date.now(), cost = 1): RateDecision {
    if (now - this.lastSweep > 60_000) this.sweep(now);
    const b = this.buckets.get(key) ?? { tokens: this.burst, at: now };
    b.tokens = Math.min(this.burst, b.tokens + (now - b.at) * this.rate);
    b.at = now;
    const ok = b.tokens >= cost;
    if (ok) b.tokens -= cost;
    // Re-insert so Map order tracks recent use; evict the least recent past the cap.
    this.buckets.delete(key);
    this.buckets.set(key, b);
    if (this.buckets.size > this.maxKeys) this.buckets.delete(this.buckets.keys().next().value!);
    return {
      ok,
      limit: this.burst,
      remaining: Math.max(0, Math.floor(b.tokens)),
      reset: Math.ceil((this.burst - b.tokens) / this.rate / 1000),
      retryAfter: ok ? 0 : Math.ceil((cost - b.tokens) / this.rate / 1000),
    };
  }

  /** Drop buckets that have refilled: they hold nothing a fresh one wouldn't. */
  private sweep(now: number): void {
    this.lastSweep = now;
    for (const [key, b] of this.buckets) if (b.tokens + (now - b.at) * this.rate >= this.burst) this.buckets.delete(key);
  }

  get size(): number {
    return this.buckets.size;
  }
}

type Headers = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim() || undefined;

/**
 * Who is asking, for rate limiting. Forwarded headers are only believed behind a trusted proxy;
 * otherwise anyone could pick a new identity per request.
 */
export function clientKey(headers: Headers, remoteAddress: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = first(headers['cf-connecting-ip']) ?? first(headers['x-real-ip']) ?? first(headers['x-forwarded-for']);
    if (forwarded) return forwarded;
  }
  return remoteAddress ?? 'unknown';
}

/** Where the service is reached, for absolute URLs. A fixed public URL wins over request headers. */
export function originOf(headers: Headers, { publicUrl, trustProxy, fallback }: { publicUrl?: string; trustProxy: boolean; fallback: string }): string {
  if (publicUrl) return publicUrl.replace(/\/+$/, '');
  const proto = (trustProxy && first(headers['x-forwarded-proto'])) || 'http';
  const host = (trustProxy && first(headers['x-forwarded-host'])) || first(headers.host) || fallback;
  // Only plausible host names reach pages and API responses.
  return /^[\w.-]+(:\d{1,5})?$/.test(host) && /^https?$/.test(proto) ? `${proto}://${host}` : `http://${fallback}`;
}

/** A CSS colour we are willing to write into an SVG: #rgb, #rgba, #rrggbb, #rrggbbaa or a keyword. */
export const isColour = (s: string): boolean => /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || /^[a-z]{3,20}$/i.test(s);

/** Longest request target served; anything longer is refused before routing. */
export const MAX_URL = 2048;

/** Headers every response carries. */
export const BASE_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

/** Site pages: inline styles and scripts are ours; nothing loads from elsewhere; no framing. */
export const PAGE_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-frame-options': 'DENY',
};

/**
 * Emblem images: embeddable anywhere, and inert if opened directly (no scripts, no outside
 * resources; the relic's motion is plain CSS).
 */
export const IMAGE_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
  'cross-origin-resource-policy': 'cross-origin',
  'access-control-allow-origin': '*',
};

/** API responses: readable from any origin, never rendered as a page. */
export const API_HEADERS: Readonly<Record<string, string>> = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After',
  'cross-origin-resource-policy': 'cross-origin',
};

/** Standard rate-limit headers (IETF draft names), plus Retry-After when refused. */
export function rateHeaders(d: RateDecision): Record<string, string> {
  return {
    'ratelimit-limit': String(d.limit),
    ...(d.remaining !== undefined && { 'ratelimit-remaining': String(d.remaining) }),
    ...(d.reset !== undefined && { 'ratelimit-reset': String(d.reset) }),
    ...(d.ok ? {} : { 'retry-after': String(d.retryAfter) }),
  };
}
