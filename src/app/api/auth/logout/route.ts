import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/logout
 *
 * Signs out the user globally (revokes the refresh token server-side)
 * and explicitly clears all sb-* cookies so the browser stops sending them.
 */
export async function POST() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    // Even if Supabase is misconfigured, clear cookies and return success
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    clearSupabaseCookies(response);
    return response;
  }

  // Sign out globally (revokes the refresh token)
  const { error } = await supabase.auth.signOut({ scope: 'global' });

  if (error) {
    console.warn('[Logout] signOut error:', error.message);
    // Continue anyway — we still want to clear cookies
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  clearSupabaseCookies(response);

  return response;
}

/**
 * Explicitly clear all sb-* cookies set by Supabase Auth.
 * signOut() doesn't always do this — cookies can persist and cause
 * "ghost sessions" where the browser still sends expired tokens.
 */
function clearSupabaseCookies(response: NextResponse) {
  // We don't have direct access to request cookies here, so we set
  // the most common Supabase cookie names to empty with maxAge=0.
  // The browser will delete them.
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-localhost-auth-token',
    'sb-production-auth-token',
  ];

  // Also handle the project-specific cookie prefix (sb-<project-ref>-auth-token)
  // The project ref is the first 20 chars of the Supabase URL subdomain.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const hostname = new URL(url).hostname; // e.g. qhstvynjkrygwxilqaih.supabase.co
      const projectRef = hostname.split('.')[0];
      if (projectRef) {
        cookieNames.push(`sb-${projectRef}-auth-token`);
      }
    } catch {
      // ignore
    }
  }

  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
}
