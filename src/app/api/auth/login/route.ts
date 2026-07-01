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
      return apiError('Login is handled client-side in demo mode', 400);
    }
    const { data, error } = await serverClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Don't leak specific auth error details
      return apiError('Invalid email or password', 401);
    }

    // Fetch user profile
    const { data: profile } = await serverClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Fetch organization membership
    let membership = null;
    let organization = null;
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

    // Also check organization_members for any orgs this user belongs to
    const { data: memberships } = await serverClient
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', data.user.id)
      .eq('status', 'active');

    return apiSuccess({
      user: {
        id: data.user.id,
        email: data.user.email,
        profile,
        memberships: memberships || [],
        organization,
      },
      session: {
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
      },
    });
  } catch (error) {
    return apiError('Login failed', 500, error instanceof Error ? error.message : undefined);
  }
}