import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, getRateLimitConfig } from '@/lib/rate-limit';
import { updateSession } from '@/lib/supabase/supabase-auth';

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Next.js Middleware — Supabase session refresh + API rate limiting.
 *
 * In Supabase live mode with a valid session cookie, the middleware
 * refreshes the session and enforces auth on protected routes.
 * In demo mode, it only applies rate limiting to /api/* routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Refresh Supabase session (no-op in demo mode).
  const supabaseResponse = await updateSession(request);

  // 2) Auth enforcement — ONLY when Supabase URL is a valid HTTP(S) URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isLive = isValidUrl(supabaseUrl);

  if (isLive) {
    // Never apply auth enforcement to requests with a file extension
    // (e.g. /manifest.json, /robots.txt served by public/ directory).
    if (pathname.includes('.')) {
      return supabaseResponse;
    }

    // Public paths that don't require auth
    const publicPaths = [
      '/auth/login',
      '/auth/signup',
      '/auth/callback',
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/session',
      '/api/auth/logout',
      '/api/health',
    ];

    const isPublicPath = publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );

    if (!isPublicPath) {
      // Check for Supabase auth cookies
      const cookies = supabaseResponse.cookies.getAll();
      const hasAuthToken = cookies.some(
        (c) =>
          c.name.includes('sb-') &&
          (c.name.includes('access-token') || c.name.includes('auth-token')),
      );

      if (!hasAuthToken) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: supabaseResponse.headers },
          );
        }
        // Redirect to login for page routes
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 3) Rate-limit only API routes
  if (!pathname.startsWith('/api/')) {
    return supabaseResponse;
  }

  const forwarded = supabaseResponse.headers.get('x-forwarded-for')
    ?? request.headers.get('x-forwarded-for');
  const realIp = supabaseResponse.headers.get('x-real-ip')
    ?? request.headers.get('x-real-ip');
  const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  const method = request.method;
  const config = getRateLimitConfig(method, pathname);

  const methodGroup = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
    ? 'write'
    : 'read';
  const routePrefix = pathname.split('/').slice(0, 3).join('/');
  const identifier = `${clientIp}:${methodGroup}:${routePrefix}`;

  const result = rateLimit(identifier, config.limit, config.windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  if (!result.success) {
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
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  }

  supabaseResponse.headers.set('X-RateLimit-Limit', String(config.limit));
  supabaseResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
  supabaseResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  return supabaseResponse;
}

/**
 * Middleware matcher — skip Next.js internals, static assets, and JSON files.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|manifest|robots\\.txt)$).*)',
  ],
};