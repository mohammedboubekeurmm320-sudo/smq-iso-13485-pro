import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, getRateLimitConfig } from '@/lib/rate-limit';

/**
 * Next.js Middleware — Rate Limiting for API Routes
 *
 * Applies token bucket rate limiting to all /api/* routes:
 * - Auth routes: 10 req/min per IP
 * - Write operations (POST/PUT/DELETE/PATCH): 30 req/min per IP
 * - Read operations (GET/HEAD): 100 req/min per IP
 *
 * On success: Adds X-RateLimit-* headers to the response.
 * On failure: Returns 429 Too Many Requests with Retry-After header.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Extract client IP from common headers or fallback
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  // Determine rate limit configuration based on method and route
  const method = request.method;
  const config = getRateLimitConfig(method, pathname);

  // Create a unique identifier combining IP, method group, and route prefix
  // This prevents write operations from consuming the read quota and vice-versa
  const methodGroup = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
    ? 'write'
    : 'read';
  const routePrefix = pathname.split('/').slice(0, 3).join('/'); // e.g., /api/auth
  const identifier = `${clientIp}:${methodGroup}:${routePrefix}`;

  // Perform rate limit check
  const result = rateLimit(identifier, config.limit, config.windowMs);

  // Calculate retry-after in seconds
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  if (!result.success) {
    // Rate limit exceeded — return 429
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
    return response;
  }

  // Request allowed — proceed and add rate limit headers
  const response = NextResponse.next();

  response.headers.set('X-RateLimit-Limit', String(config.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  return response;
}

/**
 * Configure the middleware to only run on API routes.
 * This is more efficient than checking inside the middleware function.
 */
export const config = {
  matcher: '/api/:path*',
};
