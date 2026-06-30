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
    const {
      data: { session },
      error: sessionError,
    } = await serverClient.auth.getSession();

    if (sessionError || !session) {
      return apiSuccess({ session: null, user: null, source: 'supabase' });
    }

    const authUser = session.user;

    // Fetch profile
    const { data: profile } = await serverClient
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // Fetch organization if linked
    let organization = null;
    let membership = null;
    if (profile?.organization_id) {
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
    }

    // Fetch all memberships for org switching
    const { data: memberships } = await serverClient
      .from('organization_members')
      .select('organization_id, role, status, organizations(id, name, slug)')
      .eq('user_id', authUser.id)
      .eq('status', 'active');

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
        memberships: memberships || [],
      },
      source: 'supabase',
    });
  } catch (error) {
    return apiError('Failed to fetch session', 500, error instanceof Error ? error.message : undefined);
  }
}