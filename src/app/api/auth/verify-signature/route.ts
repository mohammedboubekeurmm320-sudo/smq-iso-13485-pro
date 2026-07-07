// src/app/api/auth/verify-signature/route.ts
// ============================================================================
// POST /api/auth/verify-signature
// Body: { password: string, recordId: string, signatureType: string }
//
// Verifies the user's password before generating an electronic signature.
// Uses Supabase signInWithPassword() server-side (without persisting a new
// session — we only validate the credentials).
//
// This is REQUIRED for 21 CFR Part 11 §11.100 compliance — e-signatures
// must be authenticated, not just collected.
//
// Returns:
//   200 — { success: true, signatureHash: string, signedAt: string }
//   400 — missing password
//   401 — invalid password
//   500 — server error
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  let body: { password?: unknown; recordId?: unknown; signatureType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const password = typeof body.password === 'string' ? body.password : '';
  const recordId = typeof body.recordId === 'string' ? body.recordId : '';
  const signatureType =
    typeof body.signatureType === 'string' ? body.signatureType : 'approval';

  if (!password) {
    return NextResponse.json(
      { success: false, error: 'Password is required for electronic signature' },
      { status: 400 }
    );
  }

  if (!recordId) {
    return NextResponse.json(
      { success: false, error: 'recordId is required for electronic signature' },
      { status: 400 }
    );
  }

  // 1. Get the authenticated user
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      { success: false, error: 'User has no email — cannot verify password' },
      { status: 400 }
    );
  }

  // 2. Verify password by attempting a signInWithPassword with the admin client.
  //    Note: Supabase doesn't expose a "verify password" RPC, so we use
  //    signInWithPassword and immediately sign out the ephemeral session.
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Service role unavailable — contact administrator' },
      { status: 503 }
    );
  }

  const { data: sigInData, error: sigInError } = await admin.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (sigInError || !sigInData.user) {
    // Wrong password
    return NextResponse.json(
      { success: false, error: 'Invalid password. Please re-enter your password.' },
      { status: 401 }
    );
  }

  // 3. Immediately revoke the ephemeral session (we don't want a second session)
  if (sigInData.session?.access_token) {
    await admin.auth.signOut({ scope: 'global' });
  }

  // 4. Verify that the signed-in user matches the authenticated user
  if (sigInData.user.id !== user.id) {
    // Should never happen (same email → same user), but defensive
    return NextResponse.json(
      { success: false, error: 'User mismatch — signature refused' },
      { status: 403 }
    );
  }

  // 5. Fetch the user's profile for signer_name and signer_role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const signerName = profile?.full_name || user.email;
  const signerRole = profile?.role || 'unknown';

  // 6. Generate the signature hash (HMAC-SHA256 server-side)
  //    The hash includes: userId, recordId, signatureType, timestamp
  //    This makes the signature non-repudiable and linked to the record (§11.70).
  const signedAt = new Date().toISOString();
  const crypto = await import('crypto');
  const SIGNATURE_SECRET =
    process.env.SIGNATURE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'fallback-dev-only-do-not-use-in-prod';
  const payload = `${user.id}|${recordId}|${signatureType}|${signedAt}`;
  const signatureHash = crypto
    .createHmac('sha256', SIGNATURE_SECRET)
    .update(payload)
    .digest('hex');

  // 7. Return the signature data — the caller persists it on the record
  return NextResponse.json({
    success: true,
    signatureHash,
    signedAt,
    signatureType,
    signedById: user.id,
    signerName,
    signerRole,
  });
}