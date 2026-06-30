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

/** True when NEXT_PUBLIC_SUPABASE_URL is set (live mode with real DB). */
export const isLiveMode = (): boolean => !!process.env.NEXT_PUBLIC_SUPABASE_URL;

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

const SERVICE_CLASSES: Record<keyof ServiceMap, new (orgId?: string) => BaseService & ServiceMap[keyof ServiceMap]> = {
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
} as unknown as Record<keyof ServiceMap, new (orgId?: string) => BaseService & ServiceMap[keyof ServiceMap]>;

/**
 * Get an initialized Supabase service, or null if in demo mode.
 * The orgId is extracted from the request headers (set by AuthContext).
 */
export async function getService<K extends keyof ServiceMap>(
  key: K,
  request?: NextRequest,
): Promise<(ServiceMap[K] & { initialized: true }) | null> {
  if (!isLiveMode()) return null;

  let orgId: string | undefined;
  if (request) {
    orgId = request.headers.get('x-organization-id') || undefined;
  }

  const ServiceClass = SERVICE_CLASSES[key];
  const service = new ServiceClass(orgId) as BaseService & ServiceMap[K];
  try {
    await service.init();
    return { ...service, initialized: true } as ServiceMap[K] & { initialized: true };
  } catch (error) {
    console.error(`[Supabase] Failed to initialize ${key} service:`, error);
    return null;
  }
}