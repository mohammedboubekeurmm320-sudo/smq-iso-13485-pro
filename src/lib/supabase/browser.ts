import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

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
 * Create a Supabase browser client.
 * Returns null when env vars are missing or invalid (demo mode).
 * Callers MUST check the return value before using the client.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(url) || !key) {
    return null;
  }

  try {
    return _createBrowserClient(url, key);
  } catch (err) {
    console.error('[Supabase Browser] Failed to create client:', err);
    return null;
  }
}