import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create a Supabase server client with cookie handling.
 * Returns null when env vars are missing or invalid (demo mode).
 * Callers MUST check the return value before using the client.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(url) || !key) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    return createServerClient(url, key, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component — ignored */ }
        },
      },
    });
  } catch (err) {
    console.error('[Supabase Server] Failed to create client:', err);
    return null;
  }
}