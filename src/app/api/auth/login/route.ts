import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isLiveMode } from '../../_lib/supabase';

// ---------------------------------------------------------------------------
// POST /api/auth/login
//
// Authenticates a user with email + password against Supabase Auth.
// Uses request-based cookie pattern (same as middleware) to guarantee that
// session cookies are properly set on the HTTP response.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    if (!isLiveMode()) {
      return NextResponse.json(
        { success: false, error: 'Login is handled client-side in demo mode' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Login] Missing env vars');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      );
    }

    // --- Request-based cookie pattern (same as middleware) ---
    // This guarantees cookies are set on the response object.
    let cookieResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    console.log('[Login] Attempting signInWithPassword for:', email.trim().toLowerCase());

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.warn('[Login] Auth error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    console.log('[Login] Auth succeeded for user:', data.user.id);

    // Fetch user profile — non-fatal
    let profile = null;
    try {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      profile = result.data;
      if (result.error) {
        console.warn('[Login] Profile fetch warning:', result.error.message);
      }
    } catch (err) {
      console.warn('[Login] Profile fetch failed (non-fatal):', err);
    }

    // Fetch organization — non-fatal
    let organization = null;
    if (profile?.organization_id) {
      try {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        if (org) {
          organization = {
            id: org.id,
            name: org.name,
            slug: org.slug,
            subscriptionStatus: org.subscription_status,
            settings: org.settings,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
          };
        }
      } catch (err) {
        console.warn('[Login] Organization fetch failed (non-fatal):', err);
      }
    }

    // Fetch organization memberships — non-fatal
    let memberships: unknown[] = [];
    try {
      const { data: mems } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations( id, name, slug )')
        .eq('user_id', data.user.id)
        .eq('status', 'active');
      memberships = mems || [];
    } catch (err) {
      console.warn('[Login] Memberships fetch failed (non-fatal):', err);
    }

    // Build the JSON response
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          profile,
          memberships,
          organization,
        },
        session: {
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
        },
      },
    });

    // CRITICAL: Transfer session cookies from the Supabase-managed response
    // to the actual JSON response we're returning.
    cookieResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  } catch (error) {
    console.error('[Login] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 },
    );
  }
}