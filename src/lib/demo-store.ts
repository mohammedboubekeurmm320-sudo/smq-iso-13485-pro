// Demo Store - Zustand store for managing QMS data in memory (demo mode)
import { create } from 'zustand';
import type { Profile, Organization, Document, Capa, NonConformance, BatchRecord, Supplier, FormTemplate, FormInstance, AuditTrail, Audit, Training, Risk, DocumentPrerequisite, OrganizationMember, OrgSettings, ChangeControl, Deviation, FormTemplateStatus, UserRole, ElectronicSignature, RecordTypeDefinition, RecordLink } from '@/types/qms';
import { FORM_TEMPLATE_TRANSITIONS, FORM_TEMPLATE_TRANSITION_ROLES } from '@/types/qms';
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
  recordTypes: RecordTypeDefinition[];
  recordLinks: RecordLink[];

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
  /** Transition template status with role-based guard (Layer 1) */
  transitionFormTemplateStatus: (templateId: string, targetStatus: FormTemplateStatus, userId: string, userRole: UserRole, signatureHash?: string, comment?: string) => { success: boolean; error?: string };
  /** Get only Approved templates for a given module type */
  getApprovedTemplatesForModule: (moduleType: string) => FormTemplate[];
  addFormInstance: (instance: FormInstance) => void;
  updateFormInstance: (id: string, updates: Partial<FormInstance>) => void;
  /** Transition instance status with workflow enforcement from parent template (Layer 2) */
  transitionFormInstanceStatus: (instanceId: string, targetStatus: FormInstance['status'], userId: string, userRole: UserRole, signatureHash?: string, comment?: string) => { success: boolean; error?: string };
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

  // Record Type Definitions (extensible custom record types)
  getRecordTypes: () => RecordTypeDefinition[];
  addRecordType: (type: Partial<RecordTypeDefinition> & { slug: string; name: string }) => RecordTypeDefinition;
  deleteRecordType: (id: string) => void;

  // Record Links (generic cross-record linking)
  getRecordLinks: () => RecordLink[];
  addRecordLink: (link: Partial<RecordLink> & { sourceRecordId: string; targetRecordId: string; linkType: RecordLink['linkType'] }) => RecordLink;
  deleteRecordLink: (id: string) => void;

  // API-compatible audit trail (used by API routes)
  addAuditTrail: (entry: { auditAction: string; tableName: string; recordId?: string; oldValues?: Record<string, unknown>; newValues?: Record<string, unknown> }) => void;
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

  // Record Types — seed the 10 system modules
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
    { id: 'rt-general', slug: 'general', name: 'Général', nameEn: 'General', icon: 'FileText', description: 'General purpose records', statusFlow: [{ linear: ['Open', 'Under Review', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }], defaultFields: [], complianceRefs: [], codePrefix: 'GEN', isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1, version: '1.0', organizationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  recordLinks: [],

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
        d => d.type === prereq.requiredDocType && d.status === 'Approved' &&
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
    state.logAudit('CREATE', 'FormTemplate', template.id, undefined, { title: template.title, version: template.version, status: template.status, moduleType: template.moduleType });
    return { formTemplates: [...state.formTemplates, template] };
  }),

  updateFormTemplate: (id, updates) => set(state => {
    const old = state.formTemplates.find(t => t.id === id);
    state.logAudit('UPDATE', 'FormTemplate', id, old ? { status: old.status, version: old.version } : undefined, updates);
    return { formTemplates: state.formTemplates.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t) };
  }),

  /** Layer 1: Transition FormTemplate status with full role-based guard and e-signature enforcement */
  transitionFormTemplateStatus: (templateId, targetStatus, userId, userRole, signatureHash, comment) => {
    const state = get();
    const template = state.formTemplates.find(t => t.id === templateId);
    if (!template) return { success: false, error: 'Template not found' };

    // Validate transition is allowed
    const allowedTransitions = FORM_TEMPLATE_TRANSITIONS[template.status];
    if (!allowedTransitions.includes(targetStatus)) {
      return { success: false, error: `Transition from ${template.status} to ${targetStatus} is not allowed` };
    }

    // Validate role is authorized for this transition
    const transitionKey = `${template.status}→${targetStatus}`;
    const allowedRoles = FORM_TEMPLATE_TRANSITION_ROLES[transitionKey];
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return { success: false, error: `Role '${userRole}' is not authorized for transition ${transitionKey}` };
    }

    // For approval (Under_Review → Approved), enforce e-signature
    const requiresESig = targetStatus === 'Approved';
    if (requiresESig && !signatureHash) {
      return { success: false, error: 'Electronic signature is required for template approval' };
    }

    // Build signature record if provided
    const newSignature: ElectronicSignature | undefined = signatureHash ? {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      documentId: templateId,
      signedById: userId,
      signerName: state.profiles.find(p => p.id === userId)?.fullName || userId,
      signerRole: userRole,
      signatureType: targetStatus === 'Approved' ? 'approval' : targetStatus === 'Obsolete' ? 'rejection' : 'review',
      signatureHash,
      revoked: false,
      createdAt: new Date().toISOString(),
    } : undefined;

    // Compute updated fields
    const now = new Date().toISOString();
    const updates: Partial<FormTemplate> = {
      status: targetStatus,
      isActive: targetStatus === 'Approved', // isActive derived from status
      updatedAt: now,
      reviewComment: comment,
    };
    if (targetStatus === 'Approved') {
      updates.effectiveDate = now;
    }
    if (newSignature) {
      updates.signatures = [...(template.signatures || []), newSignature];
    }

    // Apply update
    set(st => ({
      formTemplates: st.formTemplates.map(t => t.id === templateId ? { ...t, ...updates } : t),
    }));

    // Log audit trail
    const updatedTemplate = get().formTemplates.find(t => t.id === templateId);
    get().logAudit(
      targetStatus === 'Approved' ? 'APPROVE' : targetStatus === 'Obsolete' ? 'REJECT' : 'UPDATE',
      'FormTemplate',
      templateId,
      { status: template.status },
      { status: targetStatus, approvedBy: userId, comment }
    );

    return { success: true };
  },

  /** Get only Approved templates for a given module type (used by 10 record modules) */
  getApprovedTemplatesForModule: (moduleType) => {
    return get().formTemplates.filter(t => t.status === 'Approved' && t.moduleType === moduleType);
  },

  addFormInstance: (instance) => set(state => {
    state.logAudit('CREATE', 'FormInstance', instance.id, undefined, { referenceNumber: instance.referenceNumber, status: instance.status, templateId: instance.templateId });
    return { formInstances: [...state.formInstances, instance] };
  }),

  updateFormInstance: (id, updates) => set(state => {
    const old = state.formInstances.find(f => f.id === id);
    state.logAudit('UPDATE', 'FormInstance', id, old ? { status: old.status } : undefined, updates);
    return { formInstances: state.formInstances.map(f => f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f) };
  }),

  /** Layer 2: Transition FormInstance status with workflow enforcement from parent template */
  transitionFormInstanceStatus: (instanceId, targetStatus, userId, userRole, signatureHash, comment) => {
    const state = get();
    const instance = state.formInstances.find(f => f.id === instanceId);
    if (!instance) return { success: false, error: 'Instance not found' };

    // Find parent template
    const template = state.formTemplates.find(t => t.id === instance.templateId);
    if (!template) return { success: false, error: 'Parent template not found' };

    // Validate template is still Approved (cannot approve instances from Draft/Obsolete templates)
    if (template.status !== 'Approved') {
      return { success: false, error: `Cannot transition instance: parent template status is '${template.status}', must be 'Approved'` };
    }

    // Enforce workflow configuration from template
    const wf = template.workflow;
    if (wf) {
      // Check eSignature requirement
      if (wf.eSignatureRequired && (targetStatus === 'Approved' || targetStatus === 'Rejected') && !signatureHash) {
        return { success: false, error: 'Electronic signature is required per template workflow configuration' };
      }

      // Enforce lockAfterSubmission: once Submitted, cannot go back to Draft
      if (wf.lockAfterSubmission && instance.status === 'Submitted' && targetStatus === 'Draft') {
        return { success: false, error: 'Template configuration prohibits returning to Draft after submission' };
      }

      // For sequential workflow: check currentApprovalStep
      if (wf.workflowType === 'sequential' && targetStatus === 'Approved') {
        const approvers = wf.approvers || [];
        const currentStep = instance.currentApprovalStep || 0;
        if (approvers.length > 0 && currentStep < approvers.length - 1) {
          // Not all sequential approvers have approved yet
          const nextStep = currentStep + 1;
          const nextApprover = approvers[nextStep];
          if (nextApprover && nextApprover.userId !== userId) {
            // Update step and continue
            set(st => ({
              formInstances: st.formInstances.map(f => f.id === instanceId ? {
                ...f,
                currentApprovalStep: nextStep,
                updatedAt: new Date().toISOString(),
                approvalHistory: [
                  ...(f.approvalHistory || []),
                  {
                    id: `ae-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                    approverId: userId,
                    approverName: state.profiles.find(p => p.id === userId)?.fullName || userId,
                    action: 'approved' as const,
                    comment,
                    signatureHash,
                    timestamp: new Date().toISOString(),
                  },
                ],
              } : f),
            }));
            get().logAudit('APPROVE', 'FormInstance', instanceId, { currentApprovalStep: instance.currentApprovalStep }, { currentApprovalStep: nextStep, approver: userId });
            return { success: true, error: `Step ${currentStep + 1}/${approvers.length} approved. Waiting for step ${nextStep + 1}/${approvers.length}.` };
          }
        }
      }

      // For parallel workflow: all approvers must approve
      if (wf.workflowType === 'parallel' && targetStatus === 'Approved') {
        const approvers = wf.approvers || [];
        if (approvers.length > 1) {
          // Record this approver's approval
          const approvalEntry = {
            id: `ae-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            approverId: userId,
            approverName: state.profiles.find(p => p.id === userId)?.fullName || userId,
            action: 'approved' as const,
            comment,
            signatureHash,
            timestamp: new Date().toISOString(),
          };

          const existingHistory = instance.approvalHistory || [];
          const approvedIds = [...existingHistory.filter(e => e.action === 'approved'), approvalEntry].map(e => e.approverId);
          const allApproved = approvers.every(a => approvedIds.includes(a.userId));

          if (!allApproved) {
            // Not all approvers have approved yet
            set(st => ({
              formInstances: st.formInstances.map(f => f.id === instanceId ? {
                ...f,
                updatedAt: new Date().toISOString(),
                approvalHistory: [...(f.approvalHistory || []), approvalEntry],
              } : f),
            }));
            const approvedCount = approvedIds.length;
            get().logAudit('APPROVE', 'FormInstance', instanceId, undefined, { approver: userId, progress: `${approvedCount}/${approvers.length}` });
            return { success: true, error: `Partial approval: ${approvedCount}/${approvers.length} approvers have approved.` };
          }
        }
      }

      // Check approval permission for instance
      const hasApprovePerm = ['admin', 'quality_manager'].includes(userRole);
      if ((targetStatus === 'Approved' || targetStatus === 'Rejected') && !hasApprovePerm) {
        return { success: false, error: `Role '${userRole}' is not authorized to approve/reject instances` };
      }
    }

    // Build signature if provided
    const newSignature: ElectronicSignature | undefined = signatureHash ? {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      documentId: instanceId,
      signedById: userId,
      signerName: state.profiles.find(p => p.id === userId)?.fullName || userId,
      signerRole: userRole,
      signatureType: targetStatus === 'Approved' ? 'approval' : targetStatus === 'Rejected' ? 'rejection' : 'review',
      signatureHash,
      revoked: false,
      createdAt: new Date().toISOString(),
    } : undefined;

    // Apply status transition
    const now = new Date().toISOString();
    const updates: Partial<FormInstance> = {
      status: targetStatus,
      isLocked: targetStatus === 'Approved' || (wf?.lockAfterSubmission && targetStatus === 'Submitted'),
      signatureHash: signatureHash || instance.signatureHash,
      updatedAt: now,
    };
    if (newSignature) {
      updates.signatures = [...(instance.signatures || []), newSignature];
    }
    if (targetStatus === 'Approved' || targetStatus === 'Rejected') {
      updates.approvalHistory = [
        ...(instance.approvalHistory || []),
        {
          id: `ae-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          approverId: userId,
          approverName: state.profiles.find(p => p.id === userId)?.fullName || userId,
          action: targetStatus === 'Approved' ? 'approved' as const : 'rejected' as const,
          comment,
          signatureHash,
          timestamp: now,
        },
      ];
    }

    set(st => ({
      formInstances: st.formInstances.map(f => f.id === instanceId ? { ...f, ...updates } : f),
    }));

    get().logAudit(
      targetStatus === 'Approved' ? 'APPROVE' : targetStatus === 'Rejected' ? 'REJECT' : 'UPDATE',
      'FormInstance',
      instanceId,
      { status: instance.status },
      { status: targetStatus, by: userId }
    );

    return { success: true };
  },

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

  // Record Type Definitions
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
    get().logAudit('CREATE', 'record_type_definitions', newType.id, undefined, { slug: newType.slug, name: newType.name });
    return newType;
  },

  deleteRecordType: (id) => {
    const type = get().recordTypes.find(t => t.id === id);
    if (!type) return;
    if (type.isSystem) throw new Error('Cannot delete system record type');
    set(state => ({ recordTypes: state.recordTypes.filter(t => t.id !== id) }));
    get().logAudit('DELETE', 'record_type_definitions', id, { slug: type.slug, name: type.name }, undefined);
  },

  // Record Links
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
    get().logAudit('CREATE', 'record_links', newLink.id, undefined, { linkType: newLink.linkType });
    return newLink;
  },

  deleteRecordLink: (id) => {
    set(state => ({ recordLinks: state.recordLinks.filter(l => l.id !== id) }));
    get().logAudit('DELETE', 'record_links', id, undefined, undefined);
  },

  // API-compatible audit trail
  addAuditTrail: (entry) => {
    const auditEntry: AuditTrail = {
      id: `at-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      auditAction: entry.auditAction as AuditTrail['auditAction'],
      tableName: entry.tableName,
      recordId: entry.recordId,
      userId: 'user-001',
      userEmail: 'admin@qms-demo.com',
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
    };
    set(state => ({ auditTrails: [auditEntry, ...state.auditTrails] }));
  },
}));
