import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '../../_lib/response';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLiveMode } from '../../_lib/supabase';

// ---------------------------------------------------------------------------
// POST /api/auth/signup
//
// Registers a new user via Supabase Auth and creates their profile.
// Optionally creates a default organization if `createOrganization` is true.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    if (!isLiveMode()) {
      return apiError('Registration is handled client-side in demo mode', 400);
    }

    const body = await request.json();
    const { email, password, fullName, jobTitle, department, createOrganization, organizationName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
      jobTitle?: string;
      department?: string;
      createOrganization?: boolean;
      organizationName?: string;
    };

    // --- Validate ---
    if (!email || typeof email !== 'string') {
      return apiError('A valid email address is required', 400);
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return apiError('Password must be at least 8 characters', 400);
    }

    const emailNormalized = email.trim().toLowerCase();

    // --- 1) Create Supabase Auth user ---
    const serverClient = await createClient();
    if (!serverClient) {
      return apiError('Registration is handled client-side in demo mode', 400);
    }
    const { data, error } = await serverClient.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: {
          full_name: fullName || '',
          job_title: jobTitle || '',
          department: department || '',
        },
        // If email confirmation is disabled in Supabase, the session is returned.
        // If enabled, the user must click the confirmation link first.
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return apiError('An account with this email already exists', 409);
      }
      return apiError('Registration failed', 400);
    }

    // If email confirmation is enabled, we get a user but no session
    const requiresConfirmation = !data.session;

    // --- 2) Create profile (via admin client since RLS may block) ---
    //     The profile trigger in migration 004 should handle this, but we
    //     ensure it exists as a safety net.
    const admin = createAdminClient();
    if (!admin) {
      console.error('[Signup] createAdminClient returned null');
      return apiError('Server configuration error', 500);
    }

    // Check if profile was auto-created by trigger — non-fatal
    try {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile manually
        const { error: profileErr } = await admin.from('profiles').insert({
          id: data.user.id,
          email: emailNormalized,
          full_name: fullName || null,
          role: 'admin',
          department: department || null,
          job_title: jobTitle || null,
        });
        if (profileErr) {
          console.warn('[Signup] Profile insert failed (non-fatal):', profileErr.message);
        }
      }
    } catch (err) {
      console.warn('[Signup] Profile setup failed (non-fatal):', err);
    }

    // --- 3) Optionally create organization — non-fatal ---
    let organization = null;
    if (createOrganization && organizationName) {
      try {
        const slug = organizationName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60);

        const defaultSettings = {
          setup_completed: false,
          industry_type: 'medical_device',
          applicable_standards: [],
          active_modules: ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'],
          company_name: organizationName.trim(),
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
            name: organizationName.trim(),
            slug,
            subscription_status: 'trial',
            settings: defaultSettings,
          })
          .select()
          .single();

        if (!orgError && newOrg) {
          await admin.from('organization_members').insert({
            organization_id: newOrg.id,
            user_id: data.user.id,
            role: 'owner',
            status: 'active',
          });

          await admin
            .from('profiles')
            .update({ organization_id: newOrg.id })
            .eq('id', data.user.id);

          organization = {
            id: newOrg.id,
            name: newOrg.name,
            slug: newOrg.slug,
            subscriptionStatus: newOrg.subscription_status,
          };
        } else if (orgError) {
          console.warn('[Signup] Org creation failed (non-fatal):', orgError.message);
        }
      } catch (err) {
        console.warn('[Signup] Org creation error (non-fatal):', err);
      }
    }

    return apiSuccess(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          requiresConfirmation,
          organization,
        },
      },
      201,
    );
  } catch (error) {
    return apiError('Registration failed', 500, error instanceof Error ? error.message : undefined);
  }
}