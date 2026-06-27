/**
 * Server-side adapter for the QMS demo store.
 * API routes use this to access the Zustand store without React hooks.
 *
 * Note: In demo mode, the store lives in memory on the client side.
 * For server-side API routes, we re-create a fresh store instance per request.
 * In production with Supabase, this would be replaced by actual DB queries.
 */

import { create } from 'zustand';
import type { Profile, Organization, Document, Capa, NonConformance, BatchRecord, Supplier, FormTemplate, FormInstance, AuditTrail, Audit, Training, Risk, DocumentPrerequisite, OrganizationMember, OrgSettings, ChangeControl, Deviation, ElectronicSignature, RecordTypeDefinitionLegacy as RecordTypeDefinition, RecordLinkLegacy as RecordLink } from '@/types/qms';
import { FORM_TEMPLATE_TRANSITIONS, FORM_TEMPLATE_TRANSITION_ROLES } from '@/types/qms';
import { mockProfiles, mockOrganizations, mockOrgMembers, mockDocuments, mockCapas, mockNCRs, mockBatchRecords, mockSuppliers, mockFormTemplates, mockFormInstances, mockAudits, mockTraining, mockRisks, mockAuditTrails, mockPrerequisites, mockChangeControls, mockDeviations } from './mock-data';

// Minimal store interface for server-side API routes
interface ServerQMSStore {
  recordTypes: RecordTypeDefinition[];
  recordLinks: RecordLink[];
  auditTrails: AuditTrail[];
  formTemplates: FormTemplate[];
  formInstances: FormInstance[];
  getRecordTypes: () => RecordTypeDefinition[];
  addRecordType: (typeData: Partial<RecordTypeDefinition> & { slug: string; name: string }) => RecordTypeDefinition;
  deleteRecordType: (id: string) => void;
  getRecordLinks: () => RecordLink[];
  addRecordLink: (linkData: Partial<RecordLink> & { sourceRecordId: string; targetRecordId: string; linkType: RecordLink['linkType'] }) => RecordLink;
  deleteRecordLink: (id: string) => void;
  getFormTemplates: () => FormTemplate[];
  getFormInstances: () => FormInstance[];
  addFormInstance: (data: Partial<FormInstance> & { templateId: string; referenceNumber: string; values: Record<string, unknown>; status: FormInstance['status']; isLocked: boolean }) => FormInstance;
  addAuditTrail: (entry: { auditAction: string; tableName: string; recordId?: string; oldValues?: Record<string, unknown>; newValues?: Record<string, unknown> }) => void;
}

function createServerStore() {
  return create<ServerQMSStore>((set, get) => ({
    recordTypes: [
      { id: 'rt-capa', slug: 'capa', name: 'CAPA', nameEn: 'CAPA', icon: 'ShieldCheck', description: 'Corrective and Preventive Actions', statusFlow: [{ linear: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '8.5.2', standard: 'ISO 13485', description: 'Corrective action' }], codePrefix: 'CAPA', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-ncr', slug: 'ncr', name: 'Non-Conformité', nameEn: 'Non-Conformance', icon: 'AlertTriangle', description: 'Non-Conformance Reports', statusFlow: [{ linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '8.3', standard: 'ISO 13485', description: 'Control of nonconforming product' }], codePrefix: 'NCR', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-deviation', slug: 'deviation', name: 'Déviation', nameEn: 'Deviation', icon: 'GitBranch', description: 'Deviations', statusFlow: [{ linear: ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'], eSigRequired: ['Approved', 'Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '7.1', standard: 'ISO 13485', description: 'Planning of product realization' }], codePrefix: 'DEV', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-cc', slug: 'change_control', name: 'Maîtrise des Changements', nameEn: 'Change Control', icon: 'RefreshCw', description: 'Change Control', statusFlow: [{ linear: ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed'], branches: { 'Rejected': ['Requested'] }, eSigRequired: ['Approved', 'Rejected', 'Completed'], terminal: ['Completed', 'Rejected'] }], defaultFields: [], complianceRefs: [{ clause: '7.3.7', standard: 'ISO 13485', description: 'Design changes' }], codePrefix: 'CC', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-audit', slug: 'audit', name: 'Audit', nameEn: 'Audit', icon: 'Search', description: 'Internal/External/Supplier Audits', statusFlow: [{ linear: ['Planned', 'In Progress', 'Completed'], eSigRequired: ['Completed'], terminal: ['Completed'] }], defaultFields: [], complianceRefs: [{ clause: '8.2.4', standard: 'ISO 13485', description: 'Internal audit' }], codePrefix: 'AUD', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-risk', slug: 'risk', name: 'Risque', nameEn: 'Risk Management', icon: 'TrendingUp', description: 'Risk Management', statusFlow: [{ linear: ['Open', 'Mitigated', 'Closed'], branches: { 'Accepted': ['Closed'] }, eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '7.1', standard: 'ISO 13485', description: 'Risk management' }], codePrefix: 'RSK', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-training', slug: 'training', name: 'Formation', nameEn: 'Training', icon: 'GraduationCap', description: 'Training Records', statusFlow: [{ linear: ['Planned', 'In Progress', 'Completed'], eSigRequired: ['Completed'], terminal: ['Completed'] }], defaultFields: [], complianceRefs: [{ clause: '6.2', standard: 'ISO 13485', description: 'Competence, awareness and training' }], codePrefix: 'TRN', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-supplier', slug: 'supplier', name: 'Fournisseur', nameEn: 'Supplier', icon: 'Truck', description: 'Supplier Management', statusFlow: [{ linear: ['Under Evaluation', 'Conditional', 'Qualified'], branches: { 'Disqualified': [] }, eSigRequired: ['Qualified', 'Disqualified'], terminal: ['Disqualified'] }], defaultFields: [], complianceRefs: [{ clause: '7.4', standard: 'ISO 13485', description: 'Purchasing' }], codePrefix: 'SUP', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-batch', slug: 'batch_record', name: 'Enregistrement de Lot', nameEn: 'Batch Record', icon: 'Package', description: 'Batch Records', statusFlow: [{ linear: ['In Progress', 'Pending QA Review', 'Released'], branches: { 'Rejected': [], 'Quarantine': ['Pending QA Review'] }, eSigRequired: ['Released', 'Rejected'], terminal: ['Released', 'Rejected'] }], defaultFields: [], complianceRefs: [{ clause: '7.5.1', standard: 'ISO 13485', description: 'Control of production' }], codePrefix: 'BR', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rt-oos', slug: 'oos_oot', name: 'HSP/HOT', nameEn: 'OOS/OOT', icon: 'FlaskConical', description: 'Out of Specification / Out of Trend', statusFlow: [{ linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [{ clause: '8.2.6', standard: 'ISO 13485', description: 'Monitoring and measurement of product' }], codePrefix: 'OOS', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    recordLinks: [],
    auditTrails: mockAuditTrails,
    formTemplates: mockFormTemplates,
    formInstances: mockFormInstances,

    getRecordTypes: () => get().recordTypes,

    addRecordType: (typeData) => {
      const newType: RecordTypeDefinition = {
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        slug: typeData.slug,
        name: typeData.name,
        nameEn: typeData.nameEn,
        icon: typeData.icon || 'FileText',
        description: typeData.description,
        statusFlow: typeData.statusFlow || [],
        defaultFields: typeData.defaultFields || [],
        complianceRefs: typeData.complianceRefs || [],
        codePrefix: typeData.codePrefix,
        isSystem: false,
        isActive: true,
        requiresEsig: typeData.requiresEsig ?? true,
        minApproverCount: typeData.minApproverCount ?? 1,
        version: '1.0',
        changeReason: typeData.changeReason,
        effectiveDate: new Date().toISOString(),
        organizationId: 'org-001',
        createdById: 'user-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set(state => ({ recordTypes: [...state.recordTypes, newType] }));
      get().addAuditTrail({ auditAction: 'CREATE', tableName: 'record_type_definitions', recordId: newType.id, newValues: { slug: newType.slug, name: newType.name } });
      return newType;
    },

    deleteRecordType: (id) => {
      const type = get().recordTypes.find(t => t.id === id);
      if (!type) return;
      if (type.isSystem) throw new Error('Cannot delete system record type');
      set(state => ({ recordTypes: state.recordTypes.filter(t => t.id !== id) }));
      get().addAuditTrail({ auditAction: 'DELETE', tableName: 'record_type_definitions', recordId: id, oldValues: { slug: type.slug, name: type.name } });
    },

    getRecordLinks: () => get().recordLinks,

    addRecordLink: (linkData) => {
      const newLink: RecordLink = {
        id: `rl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sourceRecordId: linkData.sourceRecordId,
        sourceRecordType: linkData.sourceRecordType || '',
        targetRecordId: linkData.targetRecordId,
        targetRecordType: linkData.targetRecordType || '',
        linkType: linkData.linkType,
        description: linkData.description,
        organizationId: 'org-001',
        createdById: 'user-001',
        createdAt: new Date().toISOString(),
      };
      set(state => ({ recordLinks: [...state.recordLinks, newLink] }));
      get().addAuditTrail({ auditAction: 'CREATE', tableName: 'record_links', recordId: newLink.id, newValues: { linkType: newLink.linkType } });
      return newLink;
    },

    deleteRecordLink: (id) => {
      set(state => ({ recordLinks: state.recordLinks.filter(l => l.id !== id) }));
      get().addAuditTrail({ auditAction: 'DELETE', tableName: 'record_links', recordId: id });
    },

    getFormTemplates: () => get().formTemplates,

    getFormInstances: () => get().formInstances,

    addFormInstance: (data) => {
      const newInstance: FormInstance = {
        id: `fi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        templateId: data.templateId,
        templateVersion: data.templateVersion || '1.0',
        referenceNumber: data.referenceNumber,
        values: data.values,
        status: data.status,
        isLocked: data.isLocked,
        parentDocumentId: data.parentDocumentId,
        organizationId: 'org-001',
        createdAt: new Date().toISOString(),
      };
      set(state => ({ formInstances: [newInstance, ...state.formInstances] }));
      get().addAuditTrail({
        auditAction: 'CREATE',
        tableName: 'form_instances',
        recordId: newInstance.id,
        newValues: { referenceNumber: newInstance.referenceNumber, templateId: newInstance.templateId },
      });
      return newInstance;
    },

    addAuditTrail: (entry) => {
      const auditEntry: AuditTrail = {
        id: `at-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        action: entry.auditAction as AuditTrail['action'],
        tableName: entry.tableName,
        recordId: entry.recordId,
        userId: '',
        userEmail: '',
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        organizationId: 'org-001',
        createdAt: new Date().toISOString(),
      };
      set(state => ({ auditTrails: [auditEntry, ...state.auditTrails] }));
    },
  }));
}

// Singleton instance for server-side use
let _store: ReturnType<typeof createServerStore> | null = null;

export function getDemoStore() {
  if (!_store) {
    _store = createServerStore();
  }
  return _store.getState();
}
