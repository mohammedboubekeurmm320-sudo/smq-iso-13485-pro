// src/app/api/auth/signup/route.ts
// ============================================================================
// POST /api/auth/signup
// Body: {
//   email: string,
//   password: string,
//   fullName: string,
//   createOrganization: boolean,
//   organizationName?: string  (required if createOrganization=true)
// }
//
// Sign up a new user. If createOrganization=true, atomically creates an org
// via the create_organization_for_user RPC (transactional).
//
// Returns:
//   201 — { success: true, user: {...}, organization: {...} | null, requiresConfirmation: boolean }
//   400 — invalid input
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
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  let body: {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    createOrganization?: unknown;
    organizationName?: unknown;
  };

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
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const createOrganization = body.createOrganization === true;
  const organizationName =
    typeof body.organizationName === 'string' ? body.organizationName.trim() : '';

  // Validate inputs
  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Please enter a valid email address' },
      { status: 400 }
    );
  }

  // Password policy: min 12 chars, 1 upper, 1 lower, 1 digit, 1 symbol
  if (password.length < 12) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 12 characters long' },
      { status: 400 }
    );
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json(
      { success: false, error: 'Password must contain at least one uppercase, one lowercase, one digit, and one symbol' },
      { status: 400 }
    );
  }

  if (createOrganization && !organizationName) {
    return NextResponse.json(
      { success: false, error: 'organizationName is required when createOrganization is true' },
      { status: 400 }
    );
  }

  // 1. Create the auth user via Supabase Auth (client anon)
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    console.error('[Signup] Supabase auth error:', error.message, error.code);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }

  if (!data.user) {
    return NextResponse.json(
      { success: false, error: 'Registration failed — no user returned' },
      { status: 500 }
    );
  }

  const requiresConfirmation = !data.session;

  // 2. If email confirmation is required, return early — profile + org
  //    will be created by handle_new_user trigger when the user confirms.
  //    But if createOrganization=true, we cannot create the org yet
  //    (the user might never confirm). Tell the client to complete
  //    onboarding after confirmation.
  if (requiresConfirmation) {
    return NextResponse.json(
      {
        success: true,
        user: { id: data.user.id, email: data.user.email },
        organization: null,
        requiresConfirmation: true,
        message: createOrganization
          ? 'Please confirm your email, then complete organization setup at /setup'
          : 'Please confirm your email to activate your account',
      },
      { status: 201 }
    );
  }

  // 3. User is authenticated (email confirmation disabled) — create org if requested
  let organization: { id: string; name: string; slug: string } | null = null;

  if (createOrganization) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          success: true,
          user: { id: data.user.id, email: data.user.email },
          organization: null,
          requiresConfirmation: false,
          message: 'Account created but organization setup failed — please contact support',
        },
        { status: 201 }
      );
    }

    const slug = slugify(organizationName);

    try {
      const { data: orgId, error: rpcError } = await admin.rpc(
        'create_organization_for_user',
        {
          p_user_id: data.user.id,
          p_name: organizationName,
          p_slug: slug,
          p_settings: {},
        }
      );

      if (rpcError) {
        // Check for slug collision (PostgreSQL error code 23505)
        if (rpcError.code === '23505' || rpcError.message.includes('already exists')) {
          return NextResponse.json(
            {
              success: true,
              user: { id: data.user.id, email: data.user.email },
              organization: null,
              requiresConfirmation: false,
              message: `Organization slug "${slug}" is already taken. Please choose a different name at /setup`,
            },
            { status: 201 }
          );
        }
        console.error('[Signup] RPC error:', rpcError.message);
        return NextResponse.json(
          {
            success: true,
            user: { id: data.user.id, email: data.user.email },
            organization: null,
            requiresConfirmation: false,
            message: 'Account created but organization setup failed — please complete at /setup',
          },
          { status: 201 }
        );
      }

      organization = {
        id: orgId as string,
        name: organizationName,
        slug,
      };
    } catch (err) {
      console.error('[Signup] Org creation error:', err);
      return NextResponse.json(
        {
          success: true,
          user: { id: data.user.id, email: data.user.email },
          organization: null,
          requiresConfirmation: false,
          message: 'Account created but organization setup failed — please complete at /setup',
        },
        { status: 201 }
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      user: { id: data.user.id, email: data.user.email },
      organization,
      requiresConfirmation: false,
    },
    { status: 201 }
  );
}