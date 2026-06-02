// Demo Store - Zustand store for managing QMS data in memory (demo mode)
import { create } from 'zustand';
import type { Profile, Organization, Document, Capa, NonConformance, BatchRecord, Supplier, FormTemplate, FormInstance, AuditTrail, Audit, Training, Risk, DocumentPrerequisite, OrganizationMember, OrgSettings, ChangeControl, Deviation } from '@/types/qms';
import { mockProfiles, mockOrganizations, mockOrgMembers, mockDocuments, mockCapas, mockNCRs, mockBatchRecords, mockSuppliers, mockFormTemplates, mockFormInstances, mockAudits, mockTraining, mockRisks, mockAuditTrails, mockPrerequisites, mockChangeControls, mockDeviations } from './mock-data';

interface QMSStore {
  // Data
  profiles: Profile[];
  organizations: Organization[];
  orgMembers: OrganizationMember[];
  documents: Document[];
  capas: Capa[];
  ncrs: NonConformance[];
  batchRecords: BatchRecord[];
  suppliers: Supplier[];
  formTemplates: FormTemplate[];
  formInstances: FormInstance[];
  audits: Audit[];
  training: Training[];
  risks: Risk[];
  auditTrails: AuditTrail[];
  prerequisites: DocumentPrerequisite[];
  changeControls: ChangeControl[];
  deviations: Deviation[];

  // Computed helpers
  getProfile: (id: string) => Profile | undefined;
  getOrgSettings: (orgId: string) => OrgSettings | null;
  checkPrerequisites: (recordType: string, orgId: string) => { met: boolean; missing: DocumentPrerequisite[] };

  // CRUD operations
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  addCapa: (capa: Capa) => void;
  updateCapa: (id: string, updates: Partial<Capa>) => void;
  addNCR: (ncr: NonConformance) => void;
  updateNCR: (id: string, updates: Partial<NonConformance>) => void;
  addBatchRecord: (batch: BatchRecord) => void;
  updateBatchRecord: (id: string, updates: Partial<BatchRecord>) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  addAudit: (audit: Audit) => void;
  updateAudit: (id: string, updates: Partial<Audit>) => void;
  addTraining: (training: Training) => void;
  updateTraining: (id: string, updates: Partial<Training>) => void;
  addRisk: (risk: Risk) => void;
  updateRisk: (id: string, updates: Partial<Risk>) => void;
  addFormTemplate: (template: FormTemplate) => void;
  updateFormTemplate: (id: string, updates: Partial<FormTemplate>) => void;
  deactivateTemplatesByDocument: (documentId: string, reason: string) => void;
  addFormInstance: (instance: FormInstance) => void;
  updateFormInstance: (id: string, updates: Partial<FormInstance>) => void;
  addChangeControl: (cc: ChangeControl) => void;
  updateChangeControl: (id: string, updates: Partial<ChangeControl>) => void;
  addDeviation: (dev: Deviation) => void;
  updateDeviation: (id: string, updates: Partial<Deviation>) => void;

  // Profile management
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;

  // Audit trail logging
  logAudit: (action: AuditTrail['action'], tableName: string, recordId?: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) => void;

  // Organization management
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  updateOrgSettings: (orgId: string, settings: Partial<OrgSettings>) => void;

  // Signature generation
  generateSignatureHash: (signerId: string, documentId: string, type: string) => string;

  // P1: Template-Record integration helpers
  /** Create a FormInstance linked to a template when a record is created with templateId */
  createFormInstanceForRecord: (templateId: string, recordId: string, moduleName: string, fieldValues?: Record<string, unknown>) => FormInstance | null;
  /** Sync template version when parent document version changes */
  syncTemplateVersionsByDocument: (documentId: string, newVersion: string) => void;
  /** Link a CAPA to NCR(s) and Audit(s) bidirectionally */
  linkCapaToRecords: (capaId: string, ncrIds: string[], auditIds: string[]) => void;
  /** Link NCR to CAPA(s) bidirectionally */
  linkNcrToCapas: (ncrId: string, capaIds: string[]) => void;
}

export const useQMSStore = create<QMSStore>((set, get) => ({
  // Initial data from mock
  profiles: mockProfiles,
  organizations: mockOrganizations,
  orgMembers: mockOrgMembers,
  documents: mockDocuments,
  capas: mockCapas,
  ncrs: mockNCRs,
  batchRecords: mockBatchRecords,
  suppliers: mockSuppliers,
  formTemplates: mockFormTemplates,
  formInstances: mockFormInstances,
  audits: mockAudits,
  training: mockTraining,
  risks: mockRisks,
  auditTrails: mockAuditTrails,
  prerequisites: mockPrerequisites,
  changeControls: mockChangeControls,
  deviations: mockDeviations,

  // Computed helpers
  getProfile: (id: string) => get().profiles.find(p => p.id === id),

  getOrgSettings: (orgId: string) => {
    const org = get().organizations.find(o => o.id === orgId);
    if (!org) return null;
    try {
      return JSON.parse(org.settings) as OrgSettings;
    } catch {
      return null;
    }
  },

  checkPrerequisites: (recordType: string, orgId: string) => {
    const state = get();
    const prereqs = state.prerequisites.filter(
      p => p.recordType === recordType && (!p.organizationId || p.organizationId === orgId)
    );
    const missing: DocumentPrerequisite[] = [];
    for (const prereq of prereqs) {
      const hasDoc = state.documents.some(
        d => d.type === prereq.requiredDocType && (d.status === 'Approved' || d.status === 'Effective') &&
        (!prereq.requiredDocRef || d.documentNumber === prereq.requiredDocRef)
      );
      if (!hasDoc) {
        missing.push(prereq);
      }
    }
    return { met: missing.length === 0, missing };
  },

  // CRUD operations
  addDocument: (doc) => set(state => {
    state.logAudit('CREATE', 'Document', doc.id, undefined, { documentNumber: doc.documentNumber, title: doc.title, status: doc.status });
    return { documents: [...state.documents, doc] };
  }),

  updateDocument: (id, updates) => set(state => {
    const old = state.documents.find(d => d.id === id);
    state.logAudit('UPDATE', 'Document', id, old ? { status: old.status } : undefined, updates);
    return { documents: state.documents.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d) };
  }),

  addCapa: (capa) => set(state => {
    state.logAudit('CREATE', 'Capa', capa.id, undefined, { capaNumber: capa.capaNumber, title: capa.title, status: capa.status });
    return { capas: [...state.capas, capa] };
  }),

  updateCapa: (id, updates) => set(state => {
    const old = state.capas.find(c => c.id === id);
    state.logAudit('UPDATE', 'Capa', id, old ? { status: old.status } : undefined, updates);
    return { capas: state.capas.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c) };
  }),

  addNCR: (ncr) => set(state => {
    state.logAudit('CREATE', 'NonConformance', ncr.id, undefined, { ncrNumber: ncr.ncrNumber, title: ncr.title, status: ncr.status });
    return { ncrs: [...state.ncrs, ncr] };
  }),

  updateNCR: (id, updates) => set(state => {
    const old = state.ncrs.find(n => n.id === id);
    state.logAudit('UPDATE', 'NonConformance', id, old ? { status: old.status } : undefined, updates);
    return { ncrs: state.ncrs.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n) };
  }),

  addBatchRecord: (batch) => set(state => {
    state.logAudit('CREATE', 'BatchRecord', batch.id, undefined, { lotNumber: batch.lotNumber, productName: batch.productName, status: batch.status });
    return { batchRecords: [...state.batchRecords, batch] };
  }),

  updateBatchRecord: (id, updates) => set(state => {
    const old = state.batchRecords.find(b => b.id === id);
    state.logAudit('UPDATE', 'BatchRecord', id, old ? { status: old.status } : undefined, updates);
    return { batchRecords: state.batchRecords.map(b => b.id === id ? { ...b, ...updates } : b) };
  }),

  addSupplier: (supplier) => set(state => {
    state.logAudit('CREATE', 'Supplier', supplier.id, undefined, { supplierCode: supplier.supplierCode, name: supplier.name, status: supplier.status });
    return { suppliers: [...state.suppliers, supplier] };
  }),

  updateSupplier: (id, updates) => set(state => {
    const old = state.suppliers.find(s => s.id === id);
    state.logAudit('UPDATE', 'Supplier', id, old ? { status: old.status } : undefined, updates);
    return { suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s) };
  }),

  addAudit: (audit) => set(state => {
    state.logAudit('CREATE', 'Audit', audit.id, undefined, { auditNumber: audit.auditNumber, title: audit.title, status: audit.status });
    return { audits: [...state.audits, audit] };
  }),

  updateAudit: (id, updates) => set(state => {
    const old = state.audits.find(a => a.id === id);
    state.logAudit('UPDATE', 'Audit', id, old ? { status: old.status } : undefined, updates);
    return { audits: state.audits.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a) };
  }),

  addTraining: (training) => set(state => {
    state.logAudit('CREATE', 'Training', training.id, undefined, { title: training.title, status: training.status });
    return { training: [...state.training, training] };
  }),

  updateTraining: (id, updates) => set(state => {
    const old = state.training.find(t => t.id === id);
    state.logAudit('UPDATE', 'Training', id, old ? { status: old.status } : undefined, updates);
    return { training: state.training.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t) };
  }),

  addRisk: (risk) => set(state => {
    state.logAudit('CREATE', 'Risk', risk.id, undefined, { riskNumber: risk.riskNumber, title: risk.title, riskLevel: risk.riskLevel });
    return { risks: [...state.risks, risk] };
  }),

  updateRisk: (id, updates) => set(state => {
    const old = state.risks.find(r => r.id === id);
    state.logAudit('UPDATE', 'Risk', id, old ? { status: old.status } : undefined, updates);
    return { risks: state.risks.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r) };
  }),

  addFormTemplate: (template) => set(state => {
    state.logAudit('CREATE', 'FormTemplate', template.id, undefined, { title: template.title, version: template.version, isActive: template.isActive });
    return { formTemplates: [...state.formTemplates, template] };
  }),

  updateFormTemplate: (id, updates) => set(state => {
    const old = state.formTemplates.find(t => t.id === id);
    state.logAudit('UPDATE', 'FormTemplate', id, old ? { isActive: old.isActive, templateStatus: old.templateStatus } : undefined, updates);
    return { formTemplates: state.formTemplates.map(t => t.id === id ? { ...t, ...updates } : t) };
  }),

  deactivateTemplatesByDocument: (documentId, reason) => set(state => {
    const linkedTemplates = state.formTemplates.filter(t => t.documentId === documentId && t.isActive);
    if (linkedTemplates.length === 0) return state;
    linkedTemplates.forEach(t => {
      state.logAudit('UPDATE', 'FormTemplate', t.id, { isActive: true, templateStatus: t.templateStatus }, { isActive: false, templateStatus: 'Obsolete' });
    });
    return {
      formTemplates: state.formTemplates.map(t =>
        t.documentId === documentId && t.isActive
          ? { ...t, isActive: false, templateStatus: 'Obsolete' as const }
          : t
      ),
    };
  }),

  addFormInstance: (instance) => set(state => {
    state.logAudit('CREATE', 'FormInstance', instance.id, undefined, { referenceNumber: instance.referenceNumber, status: instance.status });
    return { formInstances: [...state.formInstances, instance] };
  }),

  updateFormInstance: (id, updates) => set(state => {
    const old = state.formInstances.find(f => f.id === id);
    state.logAudit('UPDATE', 'FormInstance', id, old ? { status: old.status } : undefined, updates);
    return { formInstances: state.formInstances.map(f => f.id === id ? { ...f, ...updates } : f) };
  }),

  addChangeControl: (cc) => set(state => {
    state.logAudit('CREATE', 'ChangeControl', cc.id, undefined, { ccNumber: cc.ccNumber, title: cc.title, status: cc.status });
    return { changeControls: [...state.changeControls, cc] };
  }),

  updateChangeControl: (id, updates) => set(state => {
    const old = state.changeControls.find(c => c.id === id);
    state.logAudit('UPDATE', 'ChangeControl', id, old ? { status: old.status } : undefined, updates);
    return { changeControls: state.changeControls.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c) };
  }),

  addDeviation: (dev) => set(state => {
    state.logAudit('CREATE', 'Deviation', dev.id, undefined, { devNumber: dev.devNumber, title: dev.title, status: dev.status });
    return { deviations: [...state.deviations, dev] };
  }),

  updateDeviation: (id, updates) => set(state => {
    const old = state.deviations.find(d => d.id === id);
    state.logAudit('UPDATE', 'Deviation', id, old ? { status: old.status } : undefined, updates);
    return { deviations: state.deviations.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d) };
  }),

  // Profile management
  addProfile: (profile) => set(state => {
    state.logAudit('CREATE', 'Profile', profile.id, undefined, { email: profile.email, fullName: profile.fullName, role: profile.role });
    return { profiles: [...state.profiles, profile] };
  }),

  updateProfile: (id, updates) => set(state => {
    const old = state.profiles.find(p => p.id === id);
    state.logAudit('UPDATE', 'Profile', id, old ? { role: old.role, department: old.department } : undefined, updates);
    return { profiles: state.profiles.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p) };
  }),

  // Audit trail logging
  logAudit: (action, tableName, recordId, oldValues, newValues) => {
    const entry: AuditTrail = {
      id: `at-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      tableName,
      recordId,
      userId: 'user-001', // demo user
      userEmail: 'admin@qms-demo.com',
      oldValues,
      newValues,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
    };
    set(state => ({ auditTrails: [entry, ...state.auditTrails] }));
  },

  // Organization management
  updateOrganization: (id, updates) => set(state => ({
    organizations: state.organizations.map(o => o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o),
  })),

  updateOrgSettings: (orgId, settingsUpdates) => set(state => {
    const org = state.organizations.find(o => o.id === orgId);
    if (!org) return state;
    const currentSettings = JSON.parse(org.settings) as OrgSettings;
    const newSettings = { ...currentSettings, ...settingsUpdates };
    return {
      organizations: state.organizations.map(o =>
        o.id === orgId ? { ...o, settings: JSON.stringify(newSettings), updatedAt: new Date().toISOString() } : o
      ),
    };
  }),

  // Signature generation
  generateSignatureHash: (signerId, documentId, type) => {
    const timestamp = Date.now();
    const data = `${signerId}:${documentId}:${type}:${timestamp}`;
    // Simple hash for demo purposes
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `SIG-${Math.abs(hash).toString(16).toUpperCase()}-${timestamp.toString(36).toUpperCase()}`;
  },

  // ─── P1: Template-Record Integration Helpers ──────────────────────────────────

  /** Create a FormInstance when a record is created with a templateId.
   *  Returns the created FormInstance or null if template not found. */
  createFormInstanceForRecord: (templateId, recordId, moduleName, fieldValues) => {
    const state = get();
    const template = state.formTemplates.find(t => t.id === templateId);
    if (!template) return null;

    // Build default values from template fields
    const defaultValues: Record<string, unknown> = {};
    for (const field of template.fields) {
      defaultValues[field.id] = fieldValues?.[field.id] ?? field.defaultValue ?? '';
    }

    const instance: FormInstance = {
      id: `fi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      templateId,
      templateVersion: template.version,
      referenceNumber: `FI-${moduleName}-${Date.now().toString(36).toUpperCase()}`,
      values: { ...defaultValues, ...fieldValues },
      status: 'Draft',
      isLocked: false,
      parentDocumentId: template.documentId,
      organizationId: 'org-001',
      createdById: 'user-001',
      createdAt: new Date().toISOString(),
    };

    set({ formInstances: [...state.formInstances, instance] });
    state.logAudit('CREATE', 'FormInstance', instance.id, undefined, {
      referenceNumber: instance.referenceNumber,
      templateId,
      recordId,
      moduleName,
    });
    return instance;
  },

  /** Sync template versions when the parent document version changes (P1-3).
   *  When a document is revised, linked templates should reflect the new version. */
  syncTemplateVersionsByDocument: (documentId, newVersion) => {
    const state = get();
    const linkedTemplates = state.formTemplates.filter(t => t.documentId === documentId);
    if (linkedTemplates.length === 0) return;

    // Increment template version to align with document
    const templateVersionSuffix = `.${newVersion}`;
    linkedTemplates.forEach(t => {
      state.logAudit('UPDATE', 'FormTemplate', t.id,
        { version: t.version },
        { version: t.version + templateVersionSuffix, syncReason: 'Document version updated' }
      );
    });

    set({
      formTemplates: state.formTemplates.map(t =>
        t.documentId === documentId
          ? { ...t, version: t.version + templateVersionSuffix }
          : t
      ),
    });
  },

  /** Link a CAPA to NCR(s) and Audit(s) bidirectionally (P1-4).
   *  Updates both the CAPA record and the referenced NCRs/Audits. */
  linkCapaToRecords: (capaId, ncrIds, auditIds) => {
    const state = get();

    // Update CAPA with linked NCR/Audit IDs
    const capa = state.capas.find(c => c.id === capaId);
    if (capa) {
      const existingNcrIds = capa.linkedNcrIds || [];
      const existingAuditIds = capa.linkedAuditIds || [];
      const mergedNcrIds = [...new Set([...existingNcrIds, ...ncrIds])];
      const mergedAuditIds = [...new Set([...existingAuditIds, ...auditIds])];

      // Also update deprecated singular fields for backward compat
      set({
        capas: state.capas.map(c =>
          c.id === capaId
            ? { ...c, linkedNcrIds: mergedNcrIds, linkedAuditIds: mergedAuditIds, linkedNcrId: mergedNcrIds[0], linkedAuditId: mergedAuditIds[0] }
            : c
        ),
      });
    }

    // Update each NCR with the linked CAPA ID
    if (ncrIds.length > 0) {
      set({
        ncrs: state.ncrs.map(n => {
          if (!ncrIds.includes(n.id)) return n;
          const existingCapaIds = n.linkedCapaIds || [];
          const mergedCapaIds = [...new Set([...existingCapaIds, capaId])];
          return { ...n, linkedCapaIds: mergedCapaIds, linkedCapaId: mergedCapaIds[0] };
        }),
      });
    }

    // Update each Audit with the linked CAPA ID
    if (auditIds.length > 0) {
      const updatedState = get();
      set({
        audits: updatedState.audits.map(a => {
          if (!auditIds.includes(a.id)) return a;
          const existingCapaIds = a.linkedCapaIds || [];
          const mergedCapaIds = [...new Set([...existingCapaIds, capaId])];
          return { ...a, linkedCapaIds: mergedCapaIds };
        }),
      });
    }

    state.logAudit('UPDATE', 'Capa', capaId, { linkedNcrIds: capa?.linkedNcrIds, linkedAuditIds: capa?.linkedAuditIds }, { linkedNcrIds: ncrIds, linkedAuditIds: auditIds });
  },

  /** Link NCR to CAPA(s) bidirectionally (P1-5).
   *  Used when creating a CAPA from an NCR detail view. */
  linkNcrToCapas: (ncrId, capaIds) => {
    const state = get();

    // Update NCR with linked CAPA IDs
    const ncr = state.ncrs.find(n => n.id === ncrId);
    if (ncr) {
      const existingCapaIds = ncr.linkedCapaIds || [];
      const mergedCapaIds = [...new Set([...existingCapaIds, ...capaIds])];

      set({
        ncrs: state.ncrs.map(n =>
          n.id === ncrId
            ? { ...n, linkedCapaIds: mergedCapaIds, linkedCapaId: mergedCapaIds[0] }
            : n
        ),
      });
    }

    // Update each CAPA with the linked NCR ID
    if (capaIds.length > 0) {
      const updatedState = get();
      set({
        capas: updatedState.capas.map(c => {
          if (!capaIds.includes(c.id)) return c;
          const existingNcrIds = c.linkedNcrIds || [];
          const mergedNcrIds = [...new Set([...existingNcrIds, ncrId])];
          return { ...c, linkedNcrIds: mergedNcrIds, linkedNcrId: mergedNcrIds[0] };
        }),
      });
    }

    state.logAudit('UPDATE', 'NonConformance', ncrId, { linkedCapaIds: ncr?.linkedCapaIds }, { linkedCapaIds: capaIds });
  },
}));
