import { NextResponse } from 'next/server';
import { apiSuccess, apiError } from '../../_lib/response';
import { createClient } from '@/lib/supabase/server';
import { isLiveMode } from '../../_lib/supabase';

// ---------------------------------------------------------------------------
// GET /api/auth/session
//
// Returns the current Supabase session + profile + organization.
// Used by the frontend to restore auth state on page load.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    if (!isLiveMode()) {
      return apiSuccess({ session: null, user: null, source: 'demo' });
    }

    const serverClient = await createClient();
    if (!serverClient) {
      console.error('[Session] createClient returned null');
      return apiSuccess({ session: null, user: null, source: 'supabase' });
    }

    const {
      data: { session },
      error: sessionError,
    } = await serverClient.auth.getSession();

    if (sessionError) {
      console.warn('[Session] getSession error:', sessionError.message);
      return apiSuccess({ session: null, user: null, source: 'supabase' });
    }

    if (!session) {
      return apiSuccess({ session: null, user: null, source: 'supabase' });
    }

    const authUser = session.user;

    // Fetch profile — non-fatal
    let profile = null;
    try {
      const result = await serverClient
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      profile = result.data;
      if (result.error) {
        console.warn('[Session] Profile fetch warning:', result.error.message);
      }
    } catch (err) {
      console.warn('[Session] Profile fetch failed (non-fatal):', err);
    }

    // Fetch organization — non-fatal
    let organization = null;
    if (profile?.organization_id) {
      try {
        const { data: org } = await serverClient
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (org) {
          organization = {
            id: org.id,
            name: org.name,
            slug: org.slug,
            subscriptionStatus: org.subscription_status,
            settings: org.settings,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
          };
        }
      } catch (err) {
        console.warn('[Session] Organization fetch failed (non-fatal):', err);
      }
    }

    // Fetch all memberships — non-fatal
    let memberships: unknown[] = [];
    try {
      const { data: mems } = await serverClient
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, slug)')
        .eq('user_id', authUser.id)
        .eq('status', 'active');
      memberships = mems || [];
    } catch (err) {
      console.warn('[Session] Memberships fetch failed (non-fatal):', err);
    }

    return apiSuccess({
      session: {
        accessToken: session.access_token,
        expiresIn: session.expires_in,
      },
      user: {
        id: authUser.id,
        email: authUser.email,
        profile,
        organization,
        memberships,
      },
      source: 'supabase',
    });
  } catch (error) {
    console.error('[Session] Unhandled error:', error);
    return apiError('Failed to fetch session', 500, error instanceof Error ? error.message : undefined);
  }
}