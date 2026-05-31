// Server-side in-memory demo store for QMS API routes
// Singleton pattern — shared across all API route handlers in the same process

import type {
  Profile, Organization, Document, Capa, NonConformance,
  BatchRecord, Supplier, FormTemplate, FormInstance,
  AuditTrail, Audit, Training, Risk, DocumentPrerequisite,
  OrganizationMember, ChangeControl, Deviation, CustomFieldDefinition, ScheduledReport,
} from '@/types/qms';
import {
  mockProfiles, mockOrganizations, mockOrgMembers, mockDocuments,
  mockCapas, mockNCRs, mockBatchRecords, mockSuppliers,
  mockFormTemplates, mockFormInstances, mockAudits, mockTraining,
  mockRisks, mockAuditTrails, mockPrerequisites, mockChangeControls,
  mockDeviations,
} from '@/lib/mock-data';

// ---------------------------------------------------------------------------
// Singleton demo store
// ---------------------------------------------------------------------------

class DemoStore {
  profiles: Profile[] = [];
  organizations: Organization[] = [];
  orgMembers: OrganizationMember[] = [];
  documents: Document[] = [];
  capas: Capa[] = [];
  ncrs: NonConformance[] = [];
  batchRecords: BatchRecord[] = [];
  suppliers: Supplier[] = [];
  formTemplates: FormTemplate[] = [];
  formInstances: FormInstance[] = [];
  audits: Audit[] = [];
  training: Training[] = [];
  risks: Risk[] = [];
  auditTrails: AuditTrail[] = [];
  prerequisites: DocumentPrerequisite[] = [];
  changeControls: ChangeControl[] = [];
  deviations: Deviation[] = [];
  customFieldDefinitions: CustomFieldDefinition[] = [];
  scheduledReports: ScheduledReport[] = [];

  private static instance: DemoStore | null = null;

  private constructor() {
    this.profiles = structuredClone(mockProfiles);
    this.organizations = structuredClone(mockOrganizations);
    this.orgMembers = structuredClone(mockOrgMembers);
    this.documents = structuredClone(mockDocuments);
    this.capas = structuredClone(mockCapas);
    this.ncrs = structuredClone(mockNCRs);
    this.batchRecords = structuredClone(mockBatchRecords);
    this.suppliers = structuredClone(mockSuppliers);
    this.formTemplates = structuredClone(mockFormTemplates);
    this.formInstances = structuredClone(mockFormInstances);
    this.audits = structuredClone(mockAudits);
    this.training = structuredClone(mockTraining);
    this.risks = structuredClone(mockRisks);
    this.auditTrails = structuredClone(mockAuditTrails);
    this.prerequisites = structuredClone(mockPrerequisites);
    this.changeControls = structuredClone(mockChangeControls);
    this.deviations = structuredClone(mockDeviations);
  }

  static getInstance(): DemoStore {
    if (!DemoStore.instance) {
      DemoStore.instance = new DemoStore();
    }
    return DemoStore.instance;
  }

  // -----------------------------------------------------------------------
  // Audit trail helper
  // -----------------------------------------------------------------------
  logAudit(
    action: AuditTrail['action'],
    tableName: string,
    recordId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: string,
    userEmail?: string,
    organizationId?: string,
  ) {
    const entry: AuditTrail = {
      id: `at-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      tableName,
      recordId,
      userId: userId || 'user-001',
      userEmail: userEmail || 'admin@qms-demo.com',
      oldValues,
      newValues,
      organizationId: organizationId || 'org-001',
      createdAt: new Date().toISOString(),
    };
    this.auditTrails.unshift(entry);
  }

  // -----------------------------------------------------------------------
  // Helper
  // -----------------------------------------------------------------------
  getOrganizationName(orgId?: string): string {
    if (!orgId) return 'Unknown';
    const org = this.organizations.find(o => o.id === orgId);
    return org?.name ?? 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Export singleton accessor
// ---------------------------------------------------------------------------

let _store: DemoStore | null = null;

export function getDemoStore(): DemoStore {
  if (!_store) {
    _store = DemoStore.getInstance();
  }
  return _store;
}

export type { DemoStore };
