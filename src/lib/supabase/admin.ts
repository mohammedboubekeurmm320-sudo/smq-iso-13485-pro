import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Create a Supabase client with the service_role key.
 *
 * SECURITY WARNING: This client BYPASSES Row Level Security.
 * Only use for server-side administrative operations (e.g., user management).
 * NEVER expose this client to client-side code.
 *
 * The SUPABASE_SERVICE_ROLE_KEY env var has no NEXT_PUBLIC_ prefix,
 * so it is automatically excluded from the client-side bundle by Next.js.
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'This client must only be used in server-side code with proper env vars.'
    );
  }

  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return adminClient;
}