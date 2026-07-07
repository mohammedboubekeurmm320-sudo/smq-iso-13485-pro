// src/app/api/auth/session/route.ts
// ============================================================================
// GET /api/auth/session
//
// Returns the current user's session info:
//   - user (id, email)
//   - profile (id, email, fullName, role, department, organizationId)
//   - organization (id, name, slug, subscriptionStatus)
//   - memberships (all orgs the user belongs to)
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Fetch profile (RLS allows self-read)
  let profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    department: string | null;
    organization_id: string | null;
  } | null = null;

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[Session] Profile fetch error:', profileError.message);
    } else {
      profile = profileData;
    }
  } catch (err) {
    console.warn('[Session] Profile fetch failed:', err);
  }

  // Fetch the user's default organization
  let organization: {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    settings: Record<string, unknown> | null;
  } | null = null;

  const orgId = profile?.organization_id;
  if (orgId) {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_status, settings')
        .eq('id', orgId)
        .maybeSingle();

      if (orgError) {
        console.warn('[Session] Organization fetch error:', orgError.message);
      } else {
        organization = orgData;
      }
    } catch (err) {
      console.warn('[Session] Organization fetch failed:', err);
    }
  }

  // Fetch all org memberships (for org switcher)
  let memberships: Array<{
    organization_id: string;
    role: string;
    status: string;
    organizations: { id: string; name: string; slug: string } | null;
  }> = [];
  try {
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select(
        `organization_id, role, status,
         organizations ( id, name, slug )`
      )
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberError) {
      console.warn('[Session] Memberships fetch error:', memberError.message);
    } else {
      memberships = memberData || [];
    }
  } catch (err) {
    console.warn('[Session] Memberships fetch failed:', err);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          department: profile.department,
          organizationId: profile.organization_id,
        }
      : null,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscriptionStatus: organization.subscription_status,
          settings: organization.settings,
        }
      : null,
    memberships: memberships.map((m) => ({
      organizationId: m.organization_id,
      role: m.role,
      status: m.status,
      organization: m.organizations
        ? {
            id: m.organizations.id,
            name: m.organizations.name,
            slug: m.organizations.slug,
          }
        : null,
    })),
    requiresOnboarding: !profile?.organization_id,
  });
}