import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, getRateLimitConfig } from '@/lib/rate-limit';
import { updateSession } from '@/lib/supabase/supabase-auth';

/**
 * Next.js Middleware — Supabase session refresh + API rate limiting + auth enforcement.
 *
 * Three responsibilities, in order:
 *   1. `updateSession()` — refreshes the Supabase auth session on every
 *      request and syncs cookies (no-op in demo mode; see
 *      `src/lib/supabase/supabase-auth.ts`). This is required for SSR auth
 *      to work in Supabase mode, as specified in agent-ctx/3+4-supabase-integration.md.
 *   2. Rate limiting — applies token bucket throttling to all /api/* routes.
 *   3. Auth enforcement (Supabase mode only) — redirects unauthenticated users
 *      to /auth/login for non-API, non-auth routes. API routes return 401.
 *
 * The matcher covers every route except Next.js internals and static assets.
 */
export async function middleware(request: NextRequest) {
  // 1) Refresh Supabase session (no-op in demo mode). When Supabase is
  //    configured, this also rewrites the response cookies. We must propagate
  //    that response onward so cookies survive to the browser.
  const supabaseResponse = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Determine if we're in Supabase live mode
  const isLive = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')
    && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost');

  // -----------------------------------------------------------------------
  // Auth enforcement (Supabase mode only)
  // -----------------------------------------------------------------------
  if (isLive) {
    // Skip auth checks for these paths
    const publicPaths = [
      '/auth/login',
      '/auth/signup',
      '/auth/callback',
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/session',
    ];

    const isPublicPath = publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );

    if (!isPublicPath) {
      // Check for Supabase auth cookie — the updateSession response should
      // have set cookies if the user had a valid session.
      // We look for sb-access-token or sb-refresh-token cookies.
      const cookies = supabaseResponse.cookies.getAll();
      const hasAuthToken = cookies.some(
        (c) =>
          c.name.includes('sb-') &&
          (c.name.includes('access-token') || c.name.includes('auth-token')),
      );

      if (!hasAuthToken) {
        // No auth token found
        if (pathname.startsWith('/api/')) {
          // API routes: return 401
          return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: supabaseResponse.headers },
          );
        } else {
          // Page routes: redirect to login
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
    }
  }

  // 2) Rate-limit only API routes. Non-API routes have already been handled
  //    by updateSession and can be returned as-is.
  if (!pathname.startsWith('/api/')) {
    return supabaseResponse;
  }

  // Extract client IP from common headers or fallback
  const forwarded = supabaseResponse.headers.get('x-forwarded-for')
    ?? request.headers.get('x-forwarded-for');
  const realIp = supabaseResponse.headers.get('x-real-ip')
    ?? request.headers.get('x-real-ip');
  const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  // Determine rate limit configuration based on method and route
  const method = request.method;
  const config = getRateLimitConfig(method, pathname);

  // Create a unique identifier combining IP, method group, and route prefix
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
    // Rate limit exceeded — return 429. Preserve the Supabase cookies set by
    // updateSession by copying them onto the error response.
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
      },
    );
    // Copy any auth cookies that updateSession may have set on its response
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  }

  // Request allowed — propagate rate limit headers onto the Supabase response.
  supabaseResponse.headers.set('X-RateLimit-Limit', String(config.limit));
  supabaseResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
  supabaseResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  return supabaseResponse;
}

/**
 * Middleware matcher — runs on everything except Next.js internals and static
 * assets. This ensures Supabase sessions are refreshed on page navigations,
 * while rate-limiting logic is gated by the `/api/` check inside the handler.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest|robots\\.txt)$).*)',
  ],
};