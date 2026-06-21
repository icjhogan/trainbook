// In-memory fixed-window rate limiter.
//
// Posture: single-user "light hardening". The goal is a ceiling against a runaway
// client loop or a leaked session running up Anthropic spend — not precise
// multi-tenant throttling. On serverless this counter lives per warm instance and is
// NOT shared across instances; for a single athlete that still caps the instance a
// runaway client hammers, which is the threat we care about. To make limits durable
// across instances (needed if signups ever open), swap `buckets` for Upstash Redis via
// @upstash/ratelimit and the UPSTASH_REDIS_REST_* env vars documented in .env.example.
//
// Because the store is in-process there is no external call to fail, so there is no
// fail-open/closed decision here. A Redis-backed version should fail OPEN (log + allow)
// so an outage can't lock the sole user out.

interface WindowState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, WindowState>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets; 0 when allowed. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter. `now` is injectable for deterministic tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Test/maintenance helper — clears all windows. */
export function __resetRateLimits() {
  buckets.clear();
}

// Per-user limits, calibrated generously for a single athlete.
export const CHAT_LIMIT = { max: 30, windowMs: 60_000 };
export const EXTRACT_LIMIT = { max: 10, windowMs: 60_000 };

// Bound the chat payload so a malformed or abusive client can't push an unbounded
// history (and token bill) into the model.
export const CHAT_MAX_MESSAGES = 50;
export const CHAT_MAX_TOTAL_CHARS = 100_000;
