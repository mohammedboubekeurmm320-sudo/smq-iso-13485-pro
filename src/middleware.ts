import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware — refreshes Supabase session and protects routes.
 *
 * Behavior:
 *   1. Refreshes the Supabase session on every request (handles token rotation)
 *   2. Returns the user from getUser() (validates the JWT server-side)
 *   3. Redirects unauthenticated users to /auth/login (except public paths)
 *   4. Lets authenticated users through
 *
 * Public paths (no auth required):
 *   - /auth/login, /auth/signup, /auth/callback
 *   - /api/auth/login, /api/auth/signup, /api/auth/session, /api/health
 *   - Static assets (_next, favicon, etc.) — handled by matcher
 */

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
    return { response, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Set on request (for downstream route handlers)
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value, options)
        );
        // Set on response (for browser)
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
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
    return response;
  }

  // If no user and not a public path → redirect to login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user — let them through
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
