import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiError } from '../../_lib/response';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLiveMode } from '../../_lib/supabase';

async function createRequestClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });
}

function validateOnboardInput(body: Record<string, unknown>) {
  const errors: string[] = [];
  const name = body.name;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('name: required, minimum 2 characters');
  }
  let slug = body.slug;
  if (!slug || typeof slug !== 'string' || slug.trim().length < 2) {
    if (typeof name === 'string' && name.trim().length >= 2) {
      slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    } else {
      errors.push('slug: required (auto-generated from name when omitted)');
    }
  } else {
    slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
  const industryType = body.industryType;
  if (industryType && !['medical_device', 'pharmaceutical', 'biotech', 'ivd', 'combination_product'].includes(industryType as string)) {
    errors.push('industryType: must be one of medical_device, pharmaceutical, biotech, ivd, combination_product');
  }
  return {
    valid: errors.length === 0,
    errors,
    data: {
      name: (name as string).trim(),
      slug: slug as string,
      industryType: (industryType as string) || 'medical_device',
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/organizations/onboard
//
// Creates an organization AND adds the authenticated user as owner.
// Uses admin client (service_role) for inserts (bypasses RLS), but validates
// the user's session first via the request-based server client.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    if (!isLiveMode()) {
      return apiError('On-demand organization creation requires Supabase (live mode).', 400);
    }

    // 1) Authenticate the requesting user via session cookies
    const serverClient = await createRequestClient(request);
    if (!serverClient) {
      console.error('[Onboard] createRequestClient returned null');
      return apiError('Server configuration error', 500);
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await serverClient.auth.getUser();

    if (authError) {
      console.error('[Onboard] getUser error:', authError.message);
      return apiError('Authentication required', 401);
    }

    if (!authUser) {
      console.warn('[Onboard] No user in session');
      return apiError('Authentication required', 401);
    }

    console.log('[Onboard] Authenticated user:', authUser.id, authUser.email);

    // 2) Parse and validate request body
    const body = await request.json();
    const validation = validateOnboardInput(body);
    if (!validation.valid) {
      return apiError('Validation failed', 400, validation.errors);
    }
    const { name, slug, industryType } = validation.data;

    // 3) Use admin client (bypasses RLS)
    const admin = createAdminClient();
    if (!admin) {
      console.error('[Onboard] createAdminClient returned null');
      return apiError('Server configuration error — admin client unavailable', 500);
    }

    // 3a) Check slug uniqueness
    const { data: existingOrg, error: slugCheckErr } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (slugCheckErr) {
      console.error('[Onboard] Slug check failed:', slugCheckErr.message);
      return apiError('Failed to check organization availability', 500);
    }
    if (existingOrg) {
      return apiError('An organization with this slug already exists', 409);
    }

    // 3b) Create organization with default settings
    const defaultSettings = {
      setup_completed: false,
      industry_type: industryType,
      applicable_standards: [],
      active_modules: ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'],
      company_name: name,
      require_electronic_signatures: true,
      require_prerequisite_docs: false,
      audit_trail_enabled: true,
      notification_settings: {
        email_notifications: true,
        due_date_reminders: true,
        approval_requests: true,
      },
    };

    const { data: newOrg, error: orgError } = await admin
      .from('organizations')
      .insert({
        name,
        slug,
        subscription_status: 'trial',
        settings: defaultSettings,
      })
      .select()
      .single();

    if (orgError) {
      console.error('[Onboard] Org insert failed:', orgError.message, orgError.code);
      if (orgError.code === '23505') {
        return apiError('An organization with this slug already exists', 409);
      }
      return apiError('Failed to create organization', 500);
    }

    console.log('[Onboard] Organization created:', newOrg.id, newOrg.name);

    // 3c) Add the user as organization owner
    const { error: memberError } = await admin.from('organization_members').insert({
      organization_id: newOrg.id,
      user_id: authUser.id,
      role: 'owner',
      status: 'active',
    });

    if (memberError) {
      console.error('[Onboard] Member insert failed:', memberError.message);
      await admin.from('organizations').delete().eq('id', newOrg.id);
      return apiError('Failed to add user as organization member', 500);
    }

    // 3d) Update the user's profile with the new organization_id
    try {
      await admin
        .from('profiles')
        .update({ organization_id: newOrg.id, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)
        .is('organization_id', null);
    } catch (err) {
      console.warn('[Onboard] Profile update failed (non-fatal):', err);
    }

    // 3e) Audit trail — non-fatal
    try {
      await admin.from('audit_trails').insert({
        audit_action: 'CREATE',
        table_name: 'organizations',
        record_id: newOrg.id,
        user_id: authUser.id,
        new_values: JSON.stringify({ name, slug, industryType }),
        organization_id: newOrg.id,
      });
    } catch (err) {
      console.warn('[Onboard] Audit trail insert failed (non-fatal):', err);
    }

    // 4) Return the created organization
    const org = {
      id: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      subscriptionStatus: newOrg.subscription_status,
      settings: JSON.stringify(newOrg.settings),
      createdAt: newOrg.created_at,
      updatedAt: newOrg.updated_at,
    };

    console.log('[Onboard] Success — returning org:', org.id);
    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    console.error('[Onboard] Unhandled error:', error);
    return apiError('Failed to onboard organization', 500, error instanceof Error ? error.message : undefined);
  }
}