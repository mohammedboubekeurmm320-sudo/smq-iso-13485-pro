// src/app/api/auth/switch-org/route.ts
// ============================================================================
// POST /api/auth/switch-org  — Switch the user's current organization
// GET  /api/auth/switch-org  — List all orgs the user is a member of
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/switch-org
 * Body: { organizationId: string }
 *
 *   1. Validates the user is authenticated
 *   2. Validates membership via is_org_member RPC
 *   3. Updates profiles.organization_id (default org)
 *   4. Sets a current_org_id cookie (read by BaseService)
 */
export async function POST(request: NextRequest) {
  let body: { organizationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const organizationId =
    typeof body.organizationId === 'string' ? body.organizationId : '';

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: 'organizationId is required' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  // 1. Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Verify membership via is_org_member RPC
  const { data: isMember, error: memberError } = await supabase.rpc(
    'is_org_member',
    { org_id: organizationId }
  );

  if (memberError) {
    console.error('[Switch-org] RPC error:', memberError.message);
    return NextResponse.json(
      { success: false, error: 'Failed to verify membership' },
      { status: 500 }
    );
  }

  if (!isMember) {
    return NextResponse.json(
      {
        success: false,
        error: 'You are not an active member of this organization',
      },
      { status: 403 }
    );
  }

  // 3. Update profiles.organization_id (default org)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[Switch-org] Profile update error:', updateError.message);
    return NextResponse.json(
      { success: false, error: 'Failed to update default organization' },
      { status: 500 }
    );
  }

  // 4. Fetch the new org info for the response
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, subscription_status, settings')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) {
    console.warn('[Switch-org] Org fetch error:', orgError.message);
  }

  // 5. Set the current_org_id cookie
  const response = NextResponse.json({
    success: true,
    organization: orgData
      ? {
          id: (orgData as { id: string }).id,
          name: (orgData as { name: string }).name,
          slug: (orgData as { slug: string }).slug,
          subscriptionStatus: (orgData as { subscription_status: string }).subscription_status,
          settings: (orgData as { settings: Record<string, unknown> | null }).settings,
        }
      : { id: organizationId },
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
}

/**
 * GET /api/auth/switch-org
 * Returns all orgs the user is a member of (for the org switcher UI).
 */
export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(
      `organization_id, role, status,
       organizations ( id, name, slug, subscription_status )`
    )
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('[Switch-org GET] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    memberships: (memberships || []).map((m) => ({
      organizationId: (m as { organization_id: string }).organization_id,
      role: (m as { role: string }).role,
      status: (m as { status: string }).status,
      organization: (m as { organizations: Record<string, unknown> | null }).organizations,
    })),
  });
}