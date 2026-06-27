// Server-side in-memory demo store for QMS API routes
// Singleton pattern — shared across all API route handlers in the same process

import type {
  Profile, Organization, Document, Capa, NonConformance,
  BatchRecord, Supplier, FormTemplate, FormInstance,
  AuditTrail, Audit, Training, Risk, DocumentPrerequisite,
  OrganizationMember, ChangeControl, Deviation, CustomFieldDefinition, ScheduledReport,
  RecordTypeDefinitionLegacy as RecordTypeDefinition,
  RecordLinkLegacy as RecordLink,
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
  recordTypes: RecordTypeDefinition[] = [];
  recordLinks: RecordLink[] = [];

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
    this.recordTypes = [];  // Seeded on first access
    this.recordLinks = [];
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
      userEmail: userEmail || '',
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

  // -----------------------------------------------------------------------
  // Record Type Definitions
  // -----------------------------------------------------------------------
  getRecordTypes(): RecordTypeDefinition[] {
    if (this.recordTypes.length === 0) {
      // Seed system types on first access
      this.recordTypes = [
        { id: 'rt-capa', slug: 'capa', name: 'CAPA', nameEn: 'CAPA', icon: 'ShieldCheck', description: 'Corrective and Preventive Actions', statusFlow: [{ linear: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '8.5.2', standard: 'ISO 13485', description: 'Corrective action' }], codePrefix: 'CAPA', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'rt-ncr', slug: 'ncr', name: 'Non-Conformité', nameEn: 'Non-Conformance', icon: 'AlertTriangle', description: 'Non-Conformance Reports', statusFlow: [{ linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '8.3', standard: 'ISO 13485', description: 'Control of nonconforming product' }], codePrefix: 'NCR', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'rt-general', slug: 'general', name: 'Général', nameEn: 'General', icon: 'FileText', description: 'General purpose records', statusFlow: [{ linear: ['Open', 'Under Review', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [], codePrefix: 'GEN', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
    }
    return this.recordTypes;
  }

  addRecordType(data: Partial<RecordTypeDefinition> & { slug: string; name: string }): RecordTypeDefinition {
    const newType: RecordTypeDefinition = {
      id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      slug: data.slug,
      name: data.name,
      nameEn: data.nameEn,
      icon: data.icon || 'FileText',
      description: data.description,
      statusFlow: data.statusFlow || [],
      defaultFields: data.defaultFields || [],
      complianceRefs: data.complianceRefs || [],
      codePrefix: data.codePrefix,
      isSystem: false,
      isActive: true,
      requiresEsig: data.requiresEsig ?? true,
      minApproverCount: data.minApproverCount ?? 1,
      version: '1.0',
      changeReason: data.changeReason,
      effectiveDate: new Date().toISOString(),
      organizationId: 'org-001',
      createdById: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.recordTypes.push(newType);
    this.logAudit('CREATE', 'record_type_definitions', newType.id, undefined, { slug: newType.slug, name: newType.name });
    return newType;
  }

  deleteRecordType(id: string): void {
    const type = this.recordTypes.find(t => t.id === id);
    if (!type) return;
    if (type.isSystem) throw new Error('Cannot delete system record type');
    this.recordTypes = this.recordTypes.filter(t => t.id !== id);
    this.logAudit('DELETE', 'record_type_definitions', id, { slug: type.slug }, undefined);
  }

  // -----------------------------------------------------------------------
  // Record Links
  // -----------------------------------------------------------------------
  getRecordLinks(): RecordLink[] {
    return this.recordLinks;
  }

  addRecordLink(data: Partial<RecordLink> & { sourceRecordId: string; targetRecordId: string; linkType: string }): RecordLink {
    const newLink: RecordLink = {
      id: `rl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceRecordId: data.sourceRecordId,
      sourceRecordType: data.sourceRecordType || '',
      targetRecordId: data.targetRecordId,
      targetRecordType: data.targetRecordType || '',
      linkType: data.linkType,
      description: data.description,
      organizationId: 'org-001',
      createdById: 'user-001',
      createdAt: new Date().toISOString(),
    };
    this.recordLinks.push(newLink);
    this.logAudit('CREATE', 'record_links', newLink.id, undefined, { linkType: newLink.linkType });
    return newLink;
  }

  deleteRecordLink(id: string): void {
    this.recordLinks = this.recordLinks.filter(l => l.id !== id);
    this.logAudit('DELETE', 'record_links', id, undefined, undefined);
  }

  // -----------------------------------------------------------------------
  // API-compatible audit trail
  // -----------------------------------------------------------------------
  addAuditTrail(entry: { auditAction: string; tableName: string; recordId?: string; oldValues?: Record<string, unknown>; newValues?: Record<string, unknown> }): void {
    const auditEntry: AuditTrail = {
      id: `at-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action: entry.auditAction as AuditTrail['action'],
      tableName: entry.tableName,
      recordId: entry.recordId,
      userId: 'user-001',
      userEmail: '',
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
    };
    this.auditTrails.unshift(auditEntry);
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
