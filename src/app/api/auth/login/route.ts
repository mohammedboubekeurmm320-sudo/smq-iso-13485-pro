import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '../../_lib/response';
import { createClient } from '@/lib/supabase/server';
import { isLiveMode } from '../../_lib/supabase';

// ---------------------------------------------------------------------------
// POST /api/auth/login
//
// Authenticates a user with email + password against Supabase Auth.
// Sets session cookies via the server client (handled by createClient cookie
// sync). Returns the user profile and their organization membership.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    if (!isLiveMode()) {
      return apiError('Login is handled client-side in demo mode', 400);
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return apiError('Email and password are required', 400);
    }

    const serverClient = await createClient();
    if (!serverClient) {
      console.error('[Login] createClient returned null — check env vars');
      return apiError('Server configuration error', 500);
    }

    console.log('[Login] Attempting signInWithPassword for:', email.trim().toLowerCase());

    const { data, error } = await serverClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.warn('[Login] Auth error:', error.message);
      return apiError('Invalid email or password', 401);
    }

    console.log('[Login] Auth succeeded for user:', data.user.id);

    // Fetch user profile — non-fatal: if the profiles table doesn't exist
    // or the user has no profile row, continue without it.
    let profile = null;
    try {
      const result = await serverClient
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      profile = result.data;
      if (result.error) {
        console.warn('[Login] Profile fetch warning:', result.error.message);
      }
    } catch (err) {
      console.warn('[Login] Profile fetch failed (non-fatal):', err);
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
        console.warn('[Login] Organization fetch failed (non-fatal):', err);
      }
    }

    // Fetch organization memberships — non-fatal
    let memberships: unknown[] = [];
    try {
      const { data: mems } = await serverClient
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', data.user.id)
        .eq('status', 'active');
      memberships = mems || [];
    } catch (err) {
      console.warn('[Login] Memberships fetch failed (non-fatal):', err);
    }

    return apiSuccess({
      user: {
        id: data.user.id,
        email: data.user.email,
        profile,
        memberships,
        organization,
      },
      session: {
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
      },
    });
  } catch (error) {
    console.error('[Login] Unhandled error:', error);
    return apiError('Login failed', 500, error instanceof Error ? error.message : undefined);
  }
}