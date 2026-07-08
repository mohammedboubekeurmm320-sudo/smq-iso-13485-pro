// src/middleware.ts
// ============================================================================
// Middleware — refreshes Supabase session.
//
// Behavior:
//   1. Refreshes the Supabase session on every request (handles token rotation)
//   2. Returns the user from getUser() (validates the JWT server-side)
//   3. Lets ALL requests through (auth guard removed for demo/testing)
//
// NOTE: Auth protection is temporarily disabled. Re-enable by uncommenting
// the redirect block at the bottom of middleware().
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/session',
  '/api/health',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // No Supabase config — let the request through (demo mode)
    return { response, user: null as null | { id: string } };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value, options)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() validates the JWT server-side.
  // Do NOT rely on getSession() which only checks cookie presence.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.debug('[Middleware] getUser error:', error.message);
  }

  return { response, user };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const { response, user } = await refreshSession(request);

  // If public path, let it through regardless of auth state
  if (isPublicPath(pathname)) {
    // If user is authenticated and tries to access /auth/login, redirect to dashboard
    if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // ── Auth guard disabled for demo/testing ──
  // All requests pass through regardless of auth state.
  // The session API returns a demo user when no real session exists.
  //
  // To re-enable auth protection, uncomment below:
  // if (!user) {
  //   const loginUrl = new URL('/auth/login', request.url);
  //   loginUrl.searchParams.set('next', pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};