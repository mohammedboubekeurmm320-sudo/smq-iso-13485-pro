import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/session
 *
 * Returns the current user's session info:
 *   - user (id, email)
 *   - profile (id, email, fullName, role, department, organizationId)
 *   - organization (id, name, slug, subscriptionStatus)
 *   - memberships (all orgs the user belongs to)
 *
 * Returns:
 *   200 — { user, profile, organization, memberships } or { user: null }
 *   401 — if no authenticated session
 */
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

  // Fetch profile (single row, no RLS issue since RLS allows self-read)
  let profile: Record<string, unknown> | null = null;
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
  let organization: Record<string, unknown> | null = null;
  const orgId = (profile as { organization_id?: string } | null)?.organization_id;
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

  // Map profile to camelCase for the frontend
  const p = profile as {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    department: string | null;
    organization_id: string | null;
  } | null;

  const o = organization as {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    settings: Record<string, unknown> | null;
  } | null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: p
      ? {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.role,
          department: p.department,
          organizationId: p.organization_id,
        }
      : null,
    organization: o
      ? {
          id: o.id,
          name: o.name,
          slug: o.slug,
          subscriptionStatus: o.subscription_status,
          settings: o.settings,
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
    requiresOnboarding: !p?.organization_id,
  });
}
