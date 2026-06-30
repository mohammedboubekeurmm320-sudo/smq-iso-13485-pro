import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /auth/callback
//
// Supabase Auth redirects here after email confirmation or OAuth.
// We exchange the auth code for a session and redirect to the app.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // We need to create a server client and exchange the code
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully exchanged code for session
      // If there's no organization, redirect to org creation
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile && !profile.organization_id) {
          return NextResponse.redirect(`${origin}/?onboard=true`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[Auth Callback] Code exchange error:', error.message);
  }

  // Error or no code — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}