import { NextResponse } from 'next/server';
import { apiSuccess, apiError } from '../../_lib/response';
import { createClient } from '@/lib/supabase/server';
import { isLiveMode } from '../../_lib/supabase';

// ---------------------------------------------------------------------------
// POST /api/auth/logout
//
// Signs the user out of their Supabase session.
// ---------------------------------------------------------------------------
export async function POST() {
  try {
    if (!isLiveMode()) {
      return apiSuccess({ message: 'Logged out (demo mode)' });
    }

    const serverClient = await createClient();
    const { error } = await serverClient.auth.signOut({ scope: 'global' });

    if (error) {
      return apiError('Logout failed', 500);
    }

    // Clear cookies by returning an empty set
    const response = apiSuccess({ message: 'Logged out successfully' });
    return response;
  } catch (error) {
    return apiError('Logout failed', 500, error instanceof Error ? error.message : undefined);
  }
}