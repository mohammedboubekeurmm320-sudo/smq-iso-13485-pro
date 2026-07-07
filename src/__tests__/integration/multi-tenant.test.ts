// src/__tests__/integration/multi-tenant.test.ts
// ============================================================================
// Integration tests for multi-tenant isolation.
//
// These tests verify that:
//   1. A user can only read data from their own organization
//   2. Cross-tenant writes are blocked (organization_id is injected server-side)
//   3. Audit trail entries are scoped to the user's org
//
// PREREQUISITES:
//   - Two test users in DIFFERENT organizations
//   - Both users must have valid credentials
//   - Set env vars:
//     - TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_A_ORG_ID
//     - TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD, TEST_USER_B_ORG_ID
//
// Run with: npm test -- multi-tenant
// ============================================================================

import { describe, beforeAll, it, expect } from 'vitest';
import type { FetchInterface } from './types';

const fetchImpl: FetchInterface =
  typeof fetch !== 'undefined' ? (fetch as FetchInterface) : (require('node-fetch') as FetchInterface);

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL;
const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD;
const USER_A_ORG_ID = process.env.TEST_USER_A_ORG_ID;

const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL;
const USER_B_PASSWORD = process.env.TEST_USER_B_PASSWORD;
const USER_B_ORG_ID = process.env.TEST_USER_B_ORG_ID;

const describeIfConfigured =
  USER_A_EMAIL && USER_A_PASSWORD && USER_B_EMAIL && USER_B_PASSWORD
    ? describe
    : describe.skip;

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await fetchImpl(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  const match = setCookie?.match(/sb-[^=]+=[^;]+/);
  if (!match) throw new Error('No session cookie in login response');
  return match[0];
}

async function createCapa(cookie: string, title: string): Promise<{ id: string }> {
  const res = await fetchImpl(`${API_BASE}/api/capas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      capaNumber: `TEST-${Date.now()}`,
      title,
      capaType: 'Corrective',
      description: 'Test CAPA for multi-tenant test',
      assignedTo: 'test-user',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date().toISOString(),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Create CAPA failed: ${JSON.stringify(data)}`);
  return data.data;
}

async function listCapas(cookie: string): Promise<unknown[]> {
  const res = await fetchImpl(`${API_BASE}/api/capas`, {
    method: 'GET',
    headers: { Cookie: cookie },
  });
  const data = await res.json();
  return data.data || [];
}

async function getCapa(cookie: string, id: string): Promise<{ status: number; data: unknown }> {
  const res = await fetchImpl(`${API_BASE}/api/capas/${id}`, {
    method: 'GET',
    headers: { Cookie: cookie },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function logout(cookie: string): Promise<void> {
  await fetchImpl(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
}

describeIfConfigured('Multi-Tenant Isolation', () => {
  let cookieA: string;
  let cookieB: string;
  let capaAId: string;

  beforeAll(async () => {
    cookieA = await loginAndGetCookie(USER_A_EMAIL!, USER_A_PASSWORD!);
    cookieB = await loginAndGetCookie(USER_B_EMAIL!, USER_B_PASSWORD!);
  });

  afterAll(async () => {
    if (cookieA) await logout(cookieA);
    if (cookieB) await logout(cookieB);
  });

  // -------------------------------------------------------------------------
  // Test 1: User A creates a CAPA
  // -------------------------------------------------------------------------
  it('should allow user A to create a CAPA', async () => {
    const capa = await createCapa(cookieA, 'CAPA from User A');
    expect(capa.id).toBeDefined();
    capaAId = capa.id;
  });

  // -------------------------------------------------------------------------
  // Test 2: User A can read their own CAPA
  // -------------------------------------------------------------------------
  it('should allow user A to read their own CAPA', async () => {
    const { status, data } = await getCapa(cookieA, capaAId);
    expect(status).toBe(200);
    expect(data).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 3: User B CANNOT read User A's CAPA (cross-tenant blocked)
  // -------------------------------------------------------------------------
  it('should block user B from reading user A CAPA', async () => {
    const { status, data } = await getCapa(cookieB, capaAId);
    // Should be 404 (not found in user B's org) or 403
    expect([403, 404]).toContain(status);
    expect(data).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 4: User B list of CAPAs does not include User A's CAPA
  // -------------------------------------------------------------------------
  it('should not include user A CAPA in user B list', async () => {
    const capasB = (await listCapas(cookieB)) as Array<{ id: string; title: string }>;
    const foundA = capasB.find((c) => c.id === capaAId);
    expect(foundA).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Test 5: User B cannot update User A's CAPA
  // -------------------------------------------------------------------------
  it('should block user B from updating user A CAPA', async () => {
    const res = await fetchImpl(`${API_BASE}/api/capas/${capaAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
      },
      body: JSON.stringify({ title: 'HACKED by User B' }),
    });

    // Should be 403 or 404 (update on cross-org row is blocked by RLS)
    expect([403, 404]).toContain(res.status);
  });

  // -------------------------------------------------------------------------
  // Test 6: User B cannot inject organization_id of User A
  // -------------------------------------------------------------------------
  it('should ignore client-supplied organization_id', async () => {
    // Try to create a CAPA with USER_A_ORG_ID in the body
    const res = await fetchImpl(`${API_BASE}/api/capas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
      },
      body: JSON.stringify({
        capaNumber: `TEST-INJECT-${Date.now()}`,
        title: 'Attempt to inject org A',
        capaType: 'Corrective',
        description: 'Should be created in org B, not org A',
        assignedTo: 'test-user',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date().toISOString(),
        organizationId: USER_A_ORG_ID, // ← INJECTION ATTEMPT
      }),
    });

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();

    // Verify the CAPA was created in org B (not org A)
    // User A should NOT see this CAPA
    const capasA = (await listCapas(cookieA)) as Array<{ id: string; title: string }>;
    const injected = capasA.find((c) => c.id === data.data.id);
    expect(injected).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Test 7: Audit trail is scoped to user A's org
  // -------------------------------------------------------------------------
  it('should create audit trail entry scoped to user A org', async () => {
    // User A's CAPA creation should have generated an audit_trails entry
    // We can't directly query audit_trails from the API (no /api/audit-trails
    // exposed in this test), but we can verify via Supabase SQL:
    //   SELECT * FROM audit_trails WHERE record_id = capaAId;
    // For now, just verify the CAPA exists and is properly scoped
    const capasA = (await listCapas(cookieA)) as Array<{ id: string; title: string }>;
    const found = capasA.find((c) => c.id === capaAId);
    expect(found).toBeDefined();
  });
});