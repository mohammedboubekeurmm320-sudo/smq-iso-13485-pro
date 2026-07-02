import { apiSuccess, apiError } from '../_lib/response';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLiveMode } from '../_lib/supabase';

// ---------------------------------------------------------------------------
// GET /api/health
//
// Diagnostic endpoint — returns Supabase connectivity status.
// Call this in the browser: /api/health
// Check Netlify function logs for detailed output.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 8)}...`
      : 'NOT SET';
    const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8)}...`
      : 'NOT SET';

    console.log('[Health] Checking Supabase connectivity...');
    console.log('[Health] URL:', envUrl);
    console.log('[Health] Anon key:', envKey);
    console.log('[Health] Service role key:', envServiceKey);
    console.log('[Health] isLiveMode:', isLiveMode());

    if (!isLiveMode()) {
      return apiSuccess({
        status: 'demo_mode',
        message: 'No valid Supabase URL configured — app is in demo mode.',
        env: {
          supabaseUrl: envUrl || 'NOT SET',
          anonKey: envKey,
          serviceRoleKey: envServiceKey,
        },
      });
    }

    // Test server client creation
    const serverClient = await createClient();
    if (!serverClient) {
      console.error('[Health] Server client creation FAILED');
      return apiError('Server client creation failed', 500, {
        env: { supabaseUrl: envUrl, anonKey: envKey, serviceRoleKey: envServiceKey },
      });
    }

    // Test Supabase Auth connectivity
    let authOk = false;
    let authError = null;
    try {
      const { error } = await serverClient.auth.getSession();
      authOk = !error;
      if (error) authError = error.message;
    } catch (err) {
      authError = err instanceof Error ? err.message : String(err);
    }
    console.log('[Health] Auth check:', authOk ? 'OK' : 'FAILED', authError);

    // Test database connectivity (try to query organizations table)
    let dbOk = false;
    let dbError = null;
    try {
      const { error } = await serverClient.from('organizations').select('id').limit(1);
      dbOk = !error;
      if (error) dbError = error.message;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }
    console.log('[Health] DB check:', dbOk ? 'OK' : 'FAILED', dbError);

    // Test admin client
    const adminClient = createAdminClient();
    const adminOk = adminClient !== null;
    console.log('[Health] Admin client:', adminOk ? 'OK' : 'FAILED');

    // Test profiles table
    let profilesOk = false;
    let profilesError = null;
    try {
      const { error } = await serverClient.from('profiles').select('id').limit(1);
      profilesOk = !error;
      if (error) profilesError = error.message;
    } catch (err) {
      profilesError = err instanceof Error ? err.message : String(err);
    }
    console.log('[Health] Profiles table:', profilesOk ? 'OK' : 'FAILED', profilesError);

    const allOk = authOk && dbOk && adminOk && profilesOk;

    return apiSuccess({
      status: allOk ? 'healthy' : 'degraded',
      checks: {
        auth: { ok: authOk, error: authError },
        database: { ok: dbOk, error: dbError },
        adminClient: { ok: adminOk },
        profilesTable: { ok: profilesOk, error: profilesError },
      },
      env: {
        supabaseUrl: envUrl,
        anonKey: envKey,
        serviceRoleKey: envServiceKey,
      },
    });
  } catch (error) {
    console.error('[Health] Unhandled error:', error);
    return apiError('Health check failed', 500, error instanceof Error ? error.message : undefined);
  }
}