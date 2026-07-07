// src/lib/supabase/server.ts
// ============================================================================
// Supabase server client — throws on misconfiguration (no silent null return).
// Used by Route Handlers, Server Components, Server Actions.
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

function validateEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase Server] Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to .env.local (see .env.example).'
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }
  } catch {
    throw new Error(`[Supabase Server] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }

  return { url, key };
}

/**
 * Create a Supabase server client with cookie handling.
 * NEVER returns null — throws on misconfiguration so bugs are visible.
 *
 * Usage:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient(): Promise<SupabaseClient> {
  const { url, key } = validateEnv();

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (err) {
          // Server Component context — can't set cookies.
          // The middleware will refresh them on the next request.
          console.debug('[Supabase Server] Cookie set skipped (Server Component):', err);
        }
      },
    },
  });
}

/**
 * Check if Supabase is configured (for feature-flagging demo mode).
 */
export const isSupabaseConfigured = (): boolean => {
  try {
    validateEnv();
    return true;
  } catch {
    return false;
  }
};