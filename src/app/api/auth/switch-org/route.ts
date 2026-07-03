import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '../../_lib/response';

/**
 * POST /api/auth/switch-org
 * Body: { organizationId: string }
 *
 * Switches the user's current organization. Validates membership via
 * is_org_member RPC, then sets a httpOnly cookie `current_org_id` that
 * BaseService reads via resolveOrgIdFromSession().
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.organizationId !== 'string') {
      return apiError('organizationId is required', 400);
    }

    const { organizationId } = body;

    const supabase = await createClient();
    if (!supabase) {
      return apiError('Authentication service unavailable', 503);
    }

    // 1. Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return apiError('Unauthorized', 401);
    }

    // 2. Verify membership via is_org_member RPC (RLS also enforces this)
    const { data: isMember, error: memberError } = await supabase.rpc(
      'is_org_member',
      { org_id: organizationId }
    );

    if (memberError || !isMember) {
      return apiError(
        'You are not an active member of this organization',
        403
      );
    }

    // 3. Optionally update profiles.organization_id (default org)
    //    so the user lands in this org on next login
    await supabase
      .from('profiles')
      .update({ organization_id: organizationId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // 4. Set the current_org_id cookie (httpOnly, secure in prod)
    const response = apiSuccess({
      organizationId,
      message: 'Organization switched successfully',
    });
    response.cookies.set('current_org_id', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error('[switch-org] Error:', err);
    return apiError('Failed to switch organization', 500);
  }
}

/**
 * GET /api/auth/switch-org
 * Returns the user's current org id (from cookie or profile default).
 */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return apiError('Unauthorized', 401);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('Unauthorized', 401);

  // List all orgs the user is a member of
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role,
      status,
      organizations (
        id,
        name,
        slug,
        subscription_status,
        settings
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    return apiError('Failed to fetch organizations', 500);
  }

  return apiSuccess({ memberships: memberships || [] });
}