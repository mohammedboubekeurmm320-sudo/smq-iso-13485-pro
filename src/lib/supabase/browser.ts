// src/lib/supabase/browser.ts
// ============================================================================
// Supabase browser client — singleton pattern with PKCE flow.
// Used by Client Components and hooks.
// ============================================================================

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Create (or return cached) Supabase browser client.
 * Throws if env vars are missing — fail-fast is better than silent demo fallback.
 *
 * Usage (in Client Components):
 *   import { createBrowserClient } from '@/lib/supabase/browser';
 *   const supabase = createBrowserClient();
 */
export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase Browser] Missing env vars. ' +
      'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  browserClient = createSSRBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return browserClient;
}

/**
 * Alias for backward compatibility with code that imports `createClient` from browser.
 */
export const createClient = createBrowserClient;