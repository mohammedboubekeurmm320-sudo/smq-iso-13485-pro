// Backward-compatibility alias: /api/organisations/onboard → /api/organizations/onboard

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '../../_lib/response';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLiveMode } from '../../_lib/supabase';
import { createServerClient } from '@supabase/ssr';

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
      errors.push('slug: required');
    }
  } else {
    slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
  const industryType = body.industryType;
  if (industryType && !['medical_device', 'pharmaceutical', 'biotech', 'ivd', 'combination_product'].includes(industryType as string)) {
    errors.push('industryType: invalid');
  }
  return {
    valid: errors.length === 0,
    errors,
    data: { name: (name as string).trim(), slug: slug as string, industryType: (industryType as string) || 'medical_device' },
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isLiveMode()) return apiError('Requires Supabase (live mode)', 400);

    // Authenticate via request-based cookie pattern
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return apiError('Server configuration error', 500);

    let cookieRes = NextResponse.next({ request });
    const serverClient = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieRes = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => cookieRes.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser();
    if (authError || !authUser) return apiError('Authentication required', 401);

    const body = await request.json();
    const validation = validateOnboardInput(body);
    if (!validation.valid) return apiError('Validation failed', 400, validation.errors);
    const { name, slug, industryType } = validation.data;

    const admin = createAdminClient();
    if (!admin) return apiError('Admin client unavailable', 500);

    const { data: existingOrg } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle();
    if (existingOrg) return apiError('Organization slug already exists', 409);

    const defaultSettings = {
      setup_completed: false,
      industry_type: industryType,
      applicable_standards: [],
      active_modules: ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'],
      company_name: name,
      require_electronic_signatures: true,
      require_prerequisite_docs: false,
      audit_trail_enabled: true,
      notification_settings: { email_notifications: true, due_date_reminders: true, approval_requests: true },
    };

    const { data: newOrg, error: orgError } = await admin.from('organizations').insert({ name, slug, subscription_status: 'trial', settings: defaultSettings }).select().single();
    if (orgError) {
      if (orgError.code === '23505') return apiError('Organization slug already exists', 409);
      return apiError('Failed to create organization', 500);
    }

    await admin.from('organization_members').insert({ organization_id: newOrg.id, user_id: authUser.id, role: 'owner', status: 'active' });
    try {
      await admin.from('profiles').update({ organization_id: newOrg.id, updated_at: new Date().toISOString() }).eq('id', authUser.id).is('organization_id', null);
    } catch { /* non-fatal */ }
    try {
      await admin.from('audit_trails').insert({ audit_action: 'CREATE', table_name: 'organizations', record_id: newOrg.id, user_id: authUser.id, new_values: JSON.stringify({ name, slug }), organization_id: newOrg.id });
    } catch { /* non-fatal */ }

    const response = NextResponse.json({
      success: true,
      data: { id: newOrg.id, name: newOrg.name, slug: newOrg.slug, subscriptionStatus: newOrg.subscription_status, settings: JSON.stringify(newOrg.settings), createdAt: newOrg.created_at, updatedAt: newOrg.updated_at },
    }, { status: 201 });

    cookieRes.cookies.getAll().forEach((c) => response.cookies.set(c.name, c.value));
    return response;
  } catch (error) {
    console.error('[Onboard Alias] Error:', error);
    return apiError('Failed to onboard organization', 500);
  }
}