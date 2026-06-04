/**
 * Tiny fixed-window rate limiter.
 *
 * In-memory and per-process: good enough for a single instance and for local
 * development, and a clear seam to swap for a shared store (Upstash/Redis) if
 * the app is ever deployed across multiple instances — at which point this
 * map would only see a fraction of the traffic per node.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Avoid unbounded growth on a long-lived process: prune expired buckets once
// the map gets large.
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Milliseconds until the window resets (0 when a fresh window just opened). */
  retryAfterMs: number;
  /** Remaining allowance in the current window. */
  remaining: number;
};

/**
 * Record a hit for `key` and report whether it is within `limit` per
 * `windowMs`. `now` is injectable for deterministic tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  prune(now);

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: windowMs, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now, remaining: 0 };
  }

  bucket.count += 1;
  return {
    ok: true,
    retryAfterMs: bucket.resetAt - now,
    remaining: limit - bucket.count,
  };
}

/** Test helper: wipe all state. */
export function __resetRateLimitStore() {
  buckets.clear();
}
