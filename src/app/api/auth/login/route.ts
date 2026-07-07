// src/app/api/auth/login/route.ts
// ============================================================================
// POST /api/auth/login
// Body: { email: string, password: string }
//
// Authenticates the user with Supabase Auth.
// On success, sets httpOnly cookies (handled by Supabase SDK).
// NEVER returns the access_token in the body (anti-XSS).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Please enter a valid email address' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error('[Login] Supabase client error:', err);
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  // Sign in with password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Map common Supabase auth errors to clear messages
    if (
      error.message.toLowerCase().includes('email not confirmed') ||
      error.code === 'email_not_confirmed'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email not confirmed. Please check your inbox and click the confirmation link.',
          code: 'EMAIL_NOT_CONFIRMED',
        },
        { status: 403 }
      );
    }

    if (
      error.message.toLowerCase().includes('invalid login credentials') ||
      error.message.toLowerCase().includes('invalid credentials')
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.error('[Login] Supabase auth error:', error.message, error.code);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }

  if (!data.user || !data.session) {
    return NextResponse.json(
      { success: false, error: 'Login failed — no session returned' },
      { status: 500 }
    );
  }

  // Fetch the user's profile + organization (with proper error handling)
  let profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    department: string | null;
    organization_id: string | null;
  } | null = null;

  let organization: {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
  } | null = null;

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department, organization_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[Login] Profile fetch error:', profileError.message);
    } else {
      profile = profileData;
    }

    // Fetch organization if user has one
    if (profile?.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_status')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError) {
        console.warn('[Login] Organization fetch error:', orgError.message);
      } else {
        organization = orgData;
      }
    }
  } catch (err) {
    // Don't fail the login if profile/org fetch fails — user is authenticated
    console.warn('[Login] Profile/org fetch failed (non-fatal):', err);
  }

  // Build response — DO NOT include access_token (cookies handle it)
  return NextResponse.json({
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
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
        }
      : null,
    requiresOnboarding: !profile?.organization_id,
  });
}