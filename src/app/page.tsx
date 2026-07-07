// src/app/page.tsx
// ============================================================================
// Root page — redirects based on auth state:
//   - Not authenticated → /auth/login
//   - Authenticated but no organization → /setup (onboarding)
//   - Authenticated with organization → /dashboard
// ============================================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect('/auth/login');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has an organization
  let hasOrg = false;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    hasOrg = Boolean(profile?.organization_id);
  } catch {
    // If we can't check, assume no org → go to setup
  }

  if (!hasOrg) {
    redirect('/setup');
  }

  redirect('/dashboard');
}