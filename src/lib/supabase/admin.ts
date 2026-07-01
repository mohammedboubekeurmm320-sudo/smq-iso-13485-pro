import { createClient as _createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

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
 * Create a Supabase client with the service_role key.
 *
 * SECURITY WARNING: This client BYPASSES Row Level Security.
 * Only use for server-side administrative operations (e.g., user management).
 * NEVER expose this client to client-side code.
 *
 * The SUPABASE_SERVICE_ROLE_KEY env var has no NEXT_PUBLIC_ prefix,
 * so it is automatically excluded from the client-side bundle by Next.js.
 *
 * Returns null when env vars are missing or invalid.
 */
export function createAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isValidSupabaseUrl(url) || !key) {
    return null;
  }

  try {
    adminClient = _createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return adminClient;
  } catch (err) {
    console.error('[Supabase Admin] Failed to create client:', err);
    return null;
  }
}