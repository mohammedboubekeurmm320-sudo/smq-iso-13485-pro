import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Validate Supabase environment configuration.
 * Throws a clear error if env vars are missing or invalid.
 */
function validateEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase] Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to .env.local (see .env.example).'
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }
  } catch {
    throw new Error(`[Supabase] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }

  return { url, key };
}

/**
 * Create a Supabase server client with cookie handling.
 *
 * This version NEVER returns null — it throws on misconfiguration
 * so that bugs are visible immediately (vs silent fallback to demo mode).
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
          // This is expected; the middleware will refresh them.
          console.debug('[Supabase Server] Cookie set skipped (Server Component):', err);
        }
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Check if Supabase is configured (for feature-flagging demo mode).
 * Use this in routes that need to fall back to demo data when Supabase is not configured.
 */
export const isSupabaseConfigured = (): boolean => {
  try {
    validateEnv();
    return true;
  } catch {
    return false;
  }
};
