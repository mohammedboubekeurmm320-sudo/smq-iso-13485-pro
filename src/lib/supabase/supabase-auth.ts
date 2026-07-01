import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  // In demo mode (no valid Supabase env vars), skip auth middleware entirely
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isValidUrl(supabaseUrl) || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          },
        },
      }
    );
    await supabase.auth.getUser();
  } catch (err) {
    // If Supabase client creation or getUser fails, continue without auth
    // (demo/fallback mode). Log for debugging but don't crash the request.
    console.error('[Supabase Middleware] Session refresh failed:', err);
  }
  return supabaseResponse;
}