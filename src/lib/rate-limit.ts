/**
 * In-memory Token Bucket Rate Limiter
 *
 * Implements a token bucket algorithm for API rate limiting.
 * Each identifier (e.g., IP address) gets a bucket with a fixed capacity.
 * Tokens are refilled at a constant rate over time.
 *
 * Note: This is an in-memory implementation suitable for demo / single-instance deployments.
 * For production multi-instance deployments, use Redis or similar shared state.
 */

interface TokenBucket {
  /** Current number of tokens available */
  tokens: number;
  /** Timestamp (ms) of the last refill */
  lastRefill: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining tokens after this request */
  remaining: number;
  /** Timestamp (ms epoch) when the bucket will be fully refilled */
  resetAt: number;
}

/** In-memory store of all active token buckets, keyed by identifier */
const buckets = new Map<string, TokenBucket>();

/** Periodic cleanup interval (ms) — remove stale buckets every 5 minutes */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
/** Bucket is considered stale if not used for this long (ms) — 30 minutes */
const STALE_THRESHOLD = 30 * 60 * 1000;

/**
 * Perform a token bucket rate limit check.
 *
 * @param identifier - Unique key for the client (e.g., IP address or route+IP)
 * @param limit      - Maximum number of requests allowed per window
 * @param windowMs   - Time window in milliseconds
 * @returns RateLimitResult with success, remaining, and resetAt
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const refillRate = limit / windowMs; // tokens per ms

  let bucket = buckets.get(identifier);

  if (!bucket) {
    // First request — create a new bucket with limit-1 tokens (one consumed now)
    bucket = {
      tokens: limit - 1,
      lastRefill: now,
    };
    buckets.set(identifier, bucket);

    return {
      success: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  // Calculate how many tokens to add based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = elapsed * refillRate;
  const currentTokens = Math.min(limit, bucket.tokens + tokensToAdd);

  if (currentTokens < 1) {
    // Not enough tokens — rate limited
    const tokensNeeded = 1 - currentTokens;
    const waitTimeMs = Math.ceil(tokensNeeded / refillRate);
    const resetAt = now + waitTimeMs;

    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  // Consume one token
  bucket.tokens = currentTokens - 1;
  bucket.lastRefill = now;

  // Calculate when the bucket will be fully refilled
  const tokensToFull = limit - bucket.tokens;
  const timeToFull = Math.ceil(tokensToFull / refillRate);

  return {
    success: true,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + timeToFull,
  };
}

/**
 * Determine the rate limit configuration based on the request method and path.
 *
 * - Auth routes (login, sign-in): strictest — 10 req/min
 * - Write operations (POST, PUT, DELETE): 30 req/min
 * - Read operations (GET, HEAD): 100 req/min (default)
 */
export function getRateLimitConfig(
  method: string,
  pathname: string
): { limit: number; windowMs: number } {
  const windowMs = 60 * 1000; // 1 minute

  // Auth routes — strictest limit
  const authRoutes = ['/api/auth/login', '/api/auth/signin', '/api/auth/callback'];
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return { limit: 10, windowMs };
  }

  // Write operations — moderate limit
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    return { limit: 30, windowMs };
  }

  // Default (read operations) — generous limit
  return { limit: 100, windowMs };
}

/**
 * Clean up stale buckets that haven't been used recently.
 * This prevents memory leaks from accumulating abandoned buckets.
 */
export function cleanupStaleBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > STALE_THRESHOLD) {
      buckets.delete(key);
    }
  }
}

/**
 * Get the current number of active buckets (useful for monitoring).
 */
export function getActiveBucketCount(): number {
  return buckets.size;
}

// ─── Periodic cleanup ────────────────────────────────────────────────────────
// Run cleanup every CLEANUP_INTERVAL to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleBuckets, CLEANUP_INTERVAL);
}
