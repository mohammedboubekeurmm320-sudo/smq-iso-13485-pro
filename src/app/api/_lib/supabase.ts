import type { NextRequest } from 'next/server';

// Supabase bridge — returns initialized service if Supabase is configured,
// otherwise returns null (demo-mode fallback).

import { CapaService } from '@/lib/supabase/services/capa-service';
import { NcrService } from '@/lib/supabase/services/ncr-service';
import { DocumentService } from '@/lib/supabase/services/document-service';
import { AuditService } from '@/lib/supabase/services/audit-service';
import { TrainingService } from '@/lib/supabase/services/training-service';
import { BatchRecordService } from '@/lib/supabase/services/batch-record-service';
import { SupplierService } from '@/lib/supabase/services/supplier-service';
import { RiskService } from '@/lib/supabase/services/risk-service';
import { AuditTrailService } from '@/lib/supabase/services/audit-trail-service';
import { DeviationService } from '@/lib/supabase/services/deviation-service';
import { ChangeControlService } from '@/lib/supabase/services/change-control-service';
import { FormService } from '@/lib/supabase/services/form-service';
import { OrganizationService } from '@/lib/supabase/services/organization-service';
import type { BaseService } from '@/lib/supabase/services/base-service';

/** True when NEXT_PUBLIC_SUPABASE_URL is a valid HTTP(S) URL (live mode). */
export const isLiveMode = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  try {
    const p = new URL(url);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
};

type ServiceMap = {
  organization: OrganizationService;
  capa: CapaService;
  ncr: NcrService;
  document: DocumentService;
  audit: AuditService;
  training: TrainingService;
  batchRecord: BatchRecordService;
  supplier: SupplierService;
  risk: RiskService;
  auditTrail: AuditTrailService;
  deviation: DeviationService;
  changeControl: ChangeControlService;
  form: FormService;
};

const SERVICE_CLASSES = {
  organization: OrganizationService,
  capa: CapaService,
  ncr: NcrService,
  document: DocumentService,
  audit: AuditService,
  training: TrainingService,
  batchRecord: BatchRecordService,
  supplier: SupplierService,
  risk: RiskService,
  auditTrail: AuditTrailService,
  deviation: DeviationService,
  changeControl: ChangeControlService,
  form: FormService,
} as const;

/**
 * Resolve the current user's organization_id from the authenticated session.
 * Priority:
 *   1. Cookie "current_org_id" (set by /api/auth/switch-org endpoint)
 *   2. profiles.organization_id (default org)
 * Returns undefined if no user or no org.
 */
async function resolveOrgIdFromSession(): Promise<string | undefined> {
  const { createClient } = await import('@/lib/supabase/server');
  const client = await createClient();
  if (!client) return undefined;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return undefined;

    // 1. Check cookie "current_org_id" (user may have switched org via UI)
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const currentOrgId = cookieStore.get('current_org_id')?.value;
    if (currentOrgId) {
      // Validate membership via RPC (defensive — RLS already enforces this)
      const { data: isMember } = await client.rpc('is_org_member', {
        org_id: currentOrgId,
      });
      if (isMember === true) return currentOrgId;
    }

    // 2. Fallback: profiles.organization_id
    const { data: profile } = await client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    return profile?.organization_id ?? undefined;
  } catch (err) {
    console.error('[getService] Failed to resolve orgId from session:', err);
    return undefined;
  }
}

/**
 * Get an initialized Supabase service, or null if in demo mode.
 * The orgId is resolved from the authenticated session (cookie or profile).
 */
export async function getService<K extends keyof ServiceMap>(
  key: K,
  request?: NextRequest,
): Promise<(ServiceMap[K] & { initialized: true }) | null> {
  if (!isLiveMode()) return null;

  // Resolve orgId from session (cookie current_org_id or profiles.organization_id)
  const orgId = await resolveOrgIdFromSession();

  const ServiceClass = SERVICE_CLASSES[key];
  const service = new ServiceClass(orgId) as BaseService & ServiceMap[K];
  try {
    await service.init();
    // FIX: do NOT spread — use Object.defineProperty to preserve prototype chain
    Object.defineProperty(service, 'initialized', { value: true, writable: false, enumerable: true });
    return service as ServiceMap[K] & { initialized: true };
  } catch (error) {
    console.error(`[Supabase] Failed to initialize ${key} service:`, error);
    return null;
  }
}