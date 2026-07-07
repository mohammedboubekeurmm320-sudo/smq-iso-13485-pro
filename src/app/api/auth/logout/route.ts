// src/app/api/auth/logout/route.ts
// ============================================================================
// POST /api/auth/logout
//
// Signs out the user globally (revokes the refresh token server-side)
// and explicitly clears all sb-* cookies so the browser stops sending them.
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-localhost-auth-token',
    'sb-production-auth-token',
    'current_org_id',
  ];

  // Handle the project-specific cookie prefix (sb-<project-ref>-auth-token)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const hostname = new URL(url).hostname;
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