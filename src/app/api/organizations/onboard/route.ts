// src/app/api/organizations/onboard/route.ts
// ============================================================================
// POST /api/organizations/onboard
// Body: { name: string, slug?: string, settings?: object }
//
// Creates a new organization for the authenticated user.
// Uses the create_organization_for_user RPC for atomic creation.
//
// Returns:
//   201 — { success: true, organization: {...} }
//   400 — missing name
//   401 — not authenticated
//   409 — slug collision
//   500 — server error
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  let body: { name?: unknown; slug?: unknown; settings?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slugInput = typeof body.slug === 'string' ? body.slug.trim() : '';
  const settings =
    body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
      ? (body.settings as Record<string, unknown>)
      : {};

  if (!name) {
    return NextResponse.json(
      { success: false, error: 'Organization name is required' },
      { status: 400 }
    );
  }

  const slug = slugify(slugInput || name);
  if (!slug) {
    return NextResponse.json(
      { success: false, error: 'Could not generate a valid slug from the organization name' },
      { status: 400 }
    );
  }

  // 1. Verify user is authenticated
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

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

  // 2. Call create_organization_for_user RPC (atomic)
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Service role unavailable — contact administrator' },
      { status: 503 }
    );
  }

  const { data: orgId, error: rpcError } = await admin.rpc(
    'create_organization_for_user',
    {
      p_user_id: user.id,
      p_name: name,
      p_slug: slug,
      p_settings: settings,
    }
  );

  if (rpcError) {
    if (rpcError.code === '23505' || rpcError.message.includes('already exists')) {
      return NextResponse.json(
        {
          success: false,
          error: `Organization slug "${slug}" is already taken. Please choose a different name.`,
          code: 'SLUG_COLLISION',
        },
        { status: 409 }
      );
    }
    console.error('[Onboard] RPC error:', rpcError.message);
    return NextResponse.json(
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }

  // 3. Fetch the created org details
  const { data: orgData, error: orgFetchError } = await admin
    .from('organizations')
    .select('id, name, slug, subscription_status, settings, created_at, updated_at')
    .eq('id', orgId as string)
    .maybeSingle();

  if (orgFetchError || !orgData) {
    // Org was created but we couldn't fetch it — return minimal info
    return NextResponse.json(
      {
        success: true,
        organization: {
          id: orgId as string,
          name,
          slug,
          subscriptionStatus: 'trial',
          settings: {},
        },
      },
      { status: 201 }
    );
  }

  // 4. Set current_org_id cookie via response (so the user lands in their new org)
  const response = NextResponse.json(
    {
      success: true,
      organization: {
        id: (orgData as { id: string }).id,
        name: (orgData as { name: string }).name,
        slug: (orgData as { slug: string }).slug,
        subscriptionStatus: (orgData as { subscription_status: string }).subscription_status,
        settings: (orgData as { settings: Record<string, unknown> | null }).settings || {},
      },
    },
    { status: 201 }
  );

  response.cookies.set('current_org_id', orgId as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

/**
 * GET /api/organizations/onboard
 * Returns the user's current organizations (for the onboarding wizard).
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
    console.error('[Onboard GET] Error:', error.message);
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
      organization: (m as { organizations: Record<string, unknown> | null }).organizations,
    })),
  });
}