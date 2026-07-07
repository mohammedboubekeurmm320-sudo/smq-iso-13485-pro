// src/__tests__/integration/auth-flow.test.ts
// ============================================================================
// Integration tests for the auth flow (login → session → switch-org → logout).
// These tests require a live Supabase instance configured via env vars.
//
// Run with: npm test -- auth-flow
// ============================================================================

import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import type { FetchInterface } from './types';

// Helper: polyfill fetch for Node test environment
const fetchImpl: FetchInterface =
  typeof fetch !== 'undefined' ? (fetch as FetchInterface) : (require('node-fetch') as FetchInterface);

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test credentials — these should be set via env vars, NOT hardcoded
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_ORG_ID = process.env.TEST_ORG_ID;

// Skip all tests if test credentials are not configured
const describeIfConfigured = TEST_EMAIL && TEST_PASSWORD ? describe : describe.skip;

describeIfConfigured('Auth Flow Integration', () => {
  let sessionCookie: string | null = null;

  beforeAll(() => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.warn('TEST_USER_EMAIL or TEST_USER_PASSWORD not set — skipping auth tests');
    }
  });

  // -------------------------------------------------------------------------
  // Test 1: Login
  // -------------------------------------------------------------------------
  it('should login successfully with valid credentials', async () => {
    const res = await fetchImpl(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(TEST_EMAIL);

    // Capture session cookie for subsequent tests
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/sb-[^=]+=[^;]+/);
      sessionCookie = match ? match[0] : null;
    }
    expect(sessionCookie).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 2: Login with wrong password
  // -------------------------------------------------------------------------
  it('should reject login with wrong password', async () => {
    const res = await fetchImpl(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrong-password-12345' }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid email or password');
  });

  // -------------------------------------------------------------------------
  // Test 3: Login with missing fields
  // -------------------------------------------------------------------------
  it('should reject login with missing fields', async () => {
    const res = await fetchImpl(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 4: Session retrieval
  // -------------------------------------------------------------------------
  it('should retrieve session with valid cookie', async () => {
    expect(sessionCookie).not.toBeNull();

    const res = await fetchImpl(`${API_BASE}/api/auth/session`, {
      method: 'GET',
      headers: {
        Cookie: sessionCookie!,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(TEST_EMAIL);
    expect(data.profile).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 5: Session without cookie returns user=null
  // -------------------------------------------------------------------------
  it('should return user=null without session cookie', async () => {
    const res = await fetchImpl(`${API_BASE}/api/auth/session`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 6: Switch organization (if TEST_ORG_ID is set)
  // -------------------------------------------------------------------------
  itIfOrgConfigured('should switch organization', async () => {
    expect(sessionCookie).not.toBeNull();
    expect(TEST_ORG_ID).toBeDefined();

    const res = await fetchImpl(`${API_BASE}/api/auth/switch-org`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie!,
      },
      body: JSON.stringify({ organizationId: TEST_ORG_ID }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.organization.id).toBe(TEST_ORG_ID);
  });

  // -------------------------------------------------------------------------
  // Test 7: Switch to non-member org should fail
  // -------------------------------------------------------------------------
  it('should reject switch to non-member org', async () => {
    expect(sessionCookie).not.toBeNull();

    const fakeOrgId = '00000000-0000-0000-0000-000000000000';
    const res = await fetchImpl(`${API_BASE}/api/auth/switch-org`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie!,
      },
      body: JSON.stringify({ organizationId: fakeOrgId }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('not an active member');
  });

  // -------------------------------------------------------------------------
  // Test 8: Logout
  // -------------------------------------------------------------------------
  it('should logout successfully', async () => {
    expect(sessionCookie).not.toBeNull();

    const res = await fetchImpl(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie!,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify session is invalidated
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // The logout response should set sb-* cookies to empty
      expect(setCookie).toMatch(/Max-Age=0|sb-[^=]+=/);
    }
  });

  // -------------------------------------------------------------------------
  // Test 9: Verify signature endpoint
  // -------------------------------------------------------------------------
  it('should verify signature with correct password', async () => {
    // Re-login first (logout invalidated previous session)
    const loginRes = await fetchImpl(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const setCookie = loginRes.headers.get('set-cookie');
    const match = setCookie?.match(/sb-[^=]+=[^;]+/);
    sessionCookie = match ? match[0] : null;

    expect(sessionCookie).not.toBeNull();

    const res = await fetchImpl(`${API_BASE}/api/auth/verify-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie!,
      },
      body: JSON.stringify({
        password: TEST_PASSWORD,
        recordId: 'test-record-id',
        signatureType: 'approval',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.signatureHash).toBeDefined();
    expect(data.signatureHash).toHaveLength(64); // HMAC-SHA256 hex = 64 chars
    expect(data.signedAt).toBeDefined();
    expect(data.signedById).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 10: Verify signature with wrong password
  // -------------------------------------------------------------------------
  it('should reject signature with wrong password', async () => {
    expect(sessionCookie).not.toBeNull();

    const res = await fetchImpl(`${API_BASE}/api/auth/verify-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie!,
      },
      body: JSON.stringify({
        password: 'wrong-password-12345',
        recordId: 'test-record-id',
        signatureType: 'approval',
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid password');
  });
});

// Helper for conditional test (only if TEST_ORG_ID is set)
function itIfOrgConfigured(name: string, fn: () => Promise<void>) {
  if (TEST_ORG_ID) {
    it(name, fn);
  } else {
    it.skip(name, fn);
  }
}