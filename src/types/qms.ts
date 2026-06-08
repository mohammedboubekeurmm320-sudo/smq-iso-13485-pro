// QMS Types - Complete type definitions for the Quality Management System

// ============================================================================
// User Roles & Permissions
// ============================================================================

export type UserRole = 'admin' | 'quality_manager' | 'auditor' | 'document_controller' | 'executive' | 'operator';

export type Permission =
  | 'documents.create' | 'documents.read' | 'documents.update' | 'documents.delete' | 'documents.approve'
  | 'capa.create' | 'capa.read' | 'capa.update' | 'capa.delete' | 'capa.approve'
  | 'ncr.create' | 'ncr.read' | 'ncr.update' | 'ncr.delete' | 'ncr.approve'
  | 'deviation.create' | 'deviation.read' | 'deviation.update' | 'deviation.delete' | 'deviation.approve'
  | 'changecontrol.create' | 'changecontrol.read' | 'changecontrol.update' | 'changecontrol.delete' | 'changecontrol.approve'
  | 'audit.create' | 'audit.read' | 'audit.update' | 'audit.delete'
  | 'training.create' | 'training.read' | 'training.update' | 'training.delete'
  | 'risk.create' | 'risk.read' | 'risk.update' | 'risk.delete'
  | 'batch.create' | 'batch.read' | 'batch.update' | 'batch.delete' | 'batch.release'
  | 'supplier.create' | 'supplier.read' | 'supplier.update' | 'supplier.delete'
  | 'reports.view' | 'reports.export'
  | 'compliance.view' | 'compliance.manage'
  | 'admin.users' | 'admin.settings' | 'admin.audit_trail';

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve',
    'capa.create', 'capa.read', 'capa.update', 'capa.delete', 'capa.approve',
    'ncr.create', 'ncr.read', 'ncr.update', 'ncr.delete', 'ncr.approve',
    'deviation.create', 'deviation.read', 'deviation.update', 'deviation.delete', 'deviation.approve',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update', 'changecontrol.delete', 'changecontrol.approve',
    'audit.create', 'audit.read', 'audit.update', 'audit.delete',
    'training.create', 'training.read', 'training.update', 'training.delete',
    'risk.create', 'risk.read', 'risk.update', 'risk.delete',
    'batch.create', 'batch.read', 'batch.update', 'batch.delete', 'batch.release',
    'supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete',
    'reports.view', 'reports.export',
    'compliance.view', 'compliance.manage',
    'admin.users', 'admin.settings', 'admin.audit_trail',
  ],
  quality_manager: [
    'documents.create', 'documents.read', 'documents.update', 'documents.approve',
    'capa.create', 'capa.read', 'capa.update', 'capa.approve',
    'ncr.create', 'ncr.read', 'ncr.update', 'ncr.approve',
    'deviation.create', 'deviation.read', 'deviation.update', 'deviation.approve',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update', 'changecontrol.approve',
    'audit.create', 'audit.read', 'audit.update',
    'training.create', 'training.read', 'training.update',
    'risk.create', 'risk.read', 'risk.update',
    'batch.create', 'batch.read', 'batch.update', 'batch.release',
    'supplier.create', 'supplier.read', 'supplier.update',
    'reports.view', 'reports.export',
    'compliance.view', 'compliance.manage',
    'admin.audit_trail',
  ],
  auditor: [
    'documents.read',
    'capa.read',
    'ncr.read',
    'deviation.read',
    'changecontrol.read',
    'audit.create', 'audit.read', 'audit.update',
    'training.read',
    'risk.read',
    'batch.read',
    'supplier.read',
    'reports.view',
    'compliance.view',
    'admin.audit_trail',
  ],
  document_controller: [
    'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve',
    'capa.read',
    'ncr.read',
    'deviation.read',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update',
    'audit.read',
    'training.create', 'training.read', 'training.update',
    'batch.read',
    'supplier.read',
    'reports.view',
    'compliance.view',
  ],
  executive: [
    'documents.read',
    'capa.read',
    'ncr.read',
    'deviation.read',
    'changecontrol.read',
    'audit.read',
    'training.read',
    'risk.read',
    'batch.read',
    'supplier.read',
    'reports.view', 'reports.export',
    'compliance.view',
  ],
  operator: [
    'documents.read',
    'capa.read',
    'ncr.create', 'ncr.read',
    'deviation.create', 'deviation.read',
    'batch.create', 'batch.read', 'batch.update',
    'training.read',
    'supplier.read',
  ],
};

// ============================================================================
// Organization & Settings
// ============================================================================

export type IndustryType = 'medical_device' | 'pharmaceutical' | 'biotech' | 'ivd' | 'combination_product';

export const CORE_MODULES = ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'] as const;
export const OPTIONAL_MODULES = ['risks', 'hierarchy', 'batch_records', 'suppliers', 'forms', 'change_control', 'deviations', 'oos_oot'] as const;

export const STANDARDS_BY_INDUSTRY: Record<IndustryType, string[]> = {
  medical_device: ['ISO 13485:2016', 'ISO 14971:2019', 'IEC 62304', 'FDA 21 CFR 820', 'MDR EU 2017/745'],
  pharmaceutical: ['ICH Q10', 'FDA 21 CFR 210/211', 'cGMP', 'EU GMP Annex 15', 'ISO 13485:2016'],
  biotech: ['ICH Q10', 'FDA 21 CFR 210/211', 'cGMP', 'ISO 14971:2019', 'ISO 13485:2016'],
  ivd: ['IVDR EU 2017/746', 'ISO 13485:2016', 'ISO 14971:2019', 'FDA 21 CFR 820', 'CLSI Guidelines'],
  combination_product: ['ISO 13485:2016', 'ISO 14971:2019', 'FDA 21 CFR 820', 'FDA 21 CFR 210/211', 'MDR EU 2017/745'],
};

// ============================================================================
// Industry Configuration
// ============================================================================

export interface IndustryConfig {
  label: string;
  primaryStandard: string;
  recommendedModules: string[];
  complianceWeights: {
    documents: number;
    capas: number;
    training: number;
    audits: number;
    ncrs: number;
    risks: number;
    batchRecords: number;
    suppliers: number;
  };
  checklistId: string;
  terminology: Record<string, string>;
}

export const INDUSTRY_CONFIG: Record<IndustryType, IndustryConfig> = {
  medical_device: {
    label: 'Medical Device',
    primaryStandard: 'ISO 13485:2016',
    recommendedModules: ['risks', 'hierarchy', 'suppliers', 'forms'],
    complianceWeights: { documents: 0.25, capas: 0.20, training: 0.15, audits: 0.15, ncrs: 0.10, risks: 0.10, batchRecords: 0.03, suppliers: 0.02 },
    checklistId: 'iso13485',
    terminology: { batchRecord: 'Production Record', deviation: 'Nonconformity' },
  },
  pharmaceutical: {
    label: 'Pharmaceutical',
    primaryStandard: 'ICH Q10',
    recommendedModules: ['risks', 'batch_records', 'suppliers', 'forms', 'oos_oot', 'deviations', 'change_control'],
    complianceWeights: { documents: 0.20, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.10, risks: 0.05, batchRecords: 0.15, suppliers: 0.10 },
    checklistId: 'ichq10',
    terminology: { batchRecord: 'Batch Record', deviation: 'Deviation' },
  },
  biotech: {
    label: 'Biotech',
    primaryStandard: 'ICH Q10',
    recommendedModules: ['risks', 'batch_records', 'suppliers', 'forms', 'oos_oot', 'deviations', 'change_control'],
    complianceWeights: { documents: 0.20, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.10, risks: 0.10, batchRecords: 0.10, suppliers: 0.10 },
    checklistId: 'ichq10',
    terminology: { batchRecord: 'Batch Record', deviation: 'Deviation' },
  },
  ivd: {
    label: 'IVD',
    primaryStandard: 'IVDR EU 2017/746',
    recommendedModules: ['risks', 'hierarchy', 'suppliers', 'forms'],
    complianceWeights: { documents: 0.25, capas: 0.20, training: 0.15, audits: 0.15, ncrs: 0.10, risks: 0.10, batchRecords: 0.03, suppliers: 0.02 },
    checklistId: 'ivdr',
    terminology: { batchRecord: 'Production Record', deviation: 'Nonconformity' },
  },
  combination_product: {
    label: 'Combination Product',
    primaryStandard: 'ISO 13485:2016',
    recommendedModules: ['risks', 'hierarchy', 'batch_records', 'suppliers', 'forms', 'oos_oot', 'deviations', 'change_control'],
    complianceWeights: { documents: 0.22, capas: 0.18, training: 0.12, audits: 0.12, ncrs: 0.10, risks: 0.10, batchRecords: 0.10, suppliers: 0.06 },
    checklistId: 'iso13485',
    terminology: { batchRecord: 'Batch Record', deviation: 'Deviation' },
  },
};

export interface OrgSettings {
  setup_completed: boolean;
  industry_type: IndustryType;
  applicable_standards: string[];
  active_modules: string[];
  company_name?: string;
  logo_url?: string;
  default_document_retention?: string;
  require_electronic_signatures?: boolean;
  require_prerequisite_docs?: boolean;
  audit_trail_enabled?: boolean;
  notification_settings?: {
    capa_overdue: boolean;
    ncr_overdue: boolean;
    document_expiry: boolean;
    training_overdue: boolean;
    audit_due: boolean;
  };
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType =
  // Qwen-aligned types (French taxonomy)
  | 'MANUEL' | 'POLITIQUE' | 'INDICATEUR' | 'PROCESS_MAP' | 'ORGANIGRAMME'
  | 'REGLEMENTAIRE' | 'MAPPING'
  | 'PROCEDURE' | 'INSTRUCTION' | 'FORMULAIRE' | 'REGISTRE' | 'ENREGISTREMENT' | 'MASTER_BATCH'
  // Legacy English types (kept for backward compatibility)
  | 'SOP' | 'WI' | 'Form' | 'Policy' | 'Specification' | 'Technical'
  | 'Risk Analysis' | 'Validation Protocol' | 'Record' | 'Manual' | 'Instruction'
  | 'Register' | 'Master Batch' | 'Procedure' | 'Process Map' | 'Organigram';
export type DocumentStatus =
  | 'Draft' | 'Under Review' | 'Approved' | 'Effective' | 'Obsolete' | 'Withdrawn';
export type DocumentClassification = 'Internal' | 'External' | 'Regulatory' | 'Confidential';
export type DocumentLevel = 1 | 2 | 3 | 4;

/** Qwen niveau labels for each document level */
export const DOCUMENT_LEVEL_LABELS: Record<DocumentLevel, { fr: string; en: string }> = {
  1: { fr: 'Stratégique', en: 'Strategic' },
  2: { fr: 'Transversal', en: 'Cross-Functional' },
  3: { fr: 'Métier / Technique', en: 'Operational / Technical' },
  4: { fr: 'Enregistrement / Formulaire', en: 'Record / Form' },
};

export type ValidationPhase = 'IQ' | 'OQ' | 'PQ' | 'Full';

export interface Document {
  id: string;
  documentNumber: string;
  title: string;
  type: DocumentType;
  version: string;
  status: DocumentStatus;
  effectiveDate?: string;
  expirationDate?: string;
  owner?: string;
  department?: string;
  lastReviewed?: string;
  nextReview?: string;
  description?: string;
  classification?: DocumentClassification;
  retentionPeriod?: string;
  docScope?: string;
  docReferences?: string;
  typeSpecificData?: Record<string, unknown>;
  parentDocumentId?: string;
  documentLevel?: DocumentLevel;
  validationPhase?: ValidationPhase;
  parentValidationId?: string;
  authorId?: string;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  signatures?: ElectronicSignature[];
  childDocuments?: Document[];
  author?: Profile;
  createdBy?: Profile;
  // --- P0: Qwen-aligned fields ---
  /** Structured document code (e.g. MQ-001, PR-4.2.4, FORM-DOC-001, WI-LAB-PCQ-001) */
  code?: string;
  /** ISO 13485 clause reference for traceability */
  isoClause?: string;
  /** Document triggers (declencheurs) — codes of documents that trigger or are triggered by this document */
  triggers?: string[];
  /** Child document codes (from Qwen enfants field) */
  childCodes?: string[];
  /** Whether this document is a prerequisite for other documents */
  isPrerequisite?: boolean;
  /** Review cycle in months */
  reviewCycleMonths?: number;
}

// ============================================================================
// Electronic Signature
// ============================================================================

export type SignatureType = 'approval' | 'rejection' | 'review' | 'verification';

export interface ElectronicSignature {
  id: string;
  documentId: string;
  signedById: string;
  signerName: string;
  signerRole: string;
  signatureType: SignatureType;
  signatureHash: string;
  userAgent?: string;
  revoked: boolean;
  revocationReason?: string;
  createdAt: string;
}

// ============================================================================
// CAPA
// ============================================================================

export type CapaType = 'Corrective' | 'Preventive';
export type CapaStatus = 'Open' | 'Investigation' | 'Implementation' | 'Effectiveness Check' | 'Closed';
export type CapaPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type CapaSource = 'Non-Conformance' | 'Audit Finding' | 'Customer Complaint' | 'Management Review' | 'Process Monitoring' | 'Supplier Issue';
export type RootCauseCategory = 'Man' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment' | 'Management';

export interface Capa {
  id: string;
  capaNumber: string;
  title: string;
  type: CapaType;
  status: CapaStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  priority?: CapaPriority;
  source?: CapaSource;
  sourceReferenceId?: string;
  description: string;
  problemStatement?: string;
  investigationDetails?: string;
  rootCauseAnalysis?: string;
  rootCauseCategory?: RootCauseCategory;
  fiveWhys?: string[];
  correctiveAction?: string;
  effectivenessVerificationMethod?: string;
  effectivenessCriteria?: string;
  effectivenessResult?: 'Effective' | 'Not Effective' | 'Pending Review';
  linkedDocumentId?: string;
  linkedNcrId?: string;
  linkedAuditId?: string;
  assignedTo: string;
  dueDate: string;
  createdDate: string;
  closedDate?: string;
  createdById?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Non-Conformance
// ============================================================================

export type NcrType = 'Product' | 'Process' | 'System' | 'Supplier' | 'OOS' | 'OOT';
export type NcrStatus = 'Open' | 'Under Investigation' | 'Pending Disposition' | 'Closed';
export type NcrSeverity = 'Critical' | 'Major' | 'Minor';
export type NcrDisposition = 'Use As Is' | 'Rework' | 'Scrap' | 'Return to Supplier' | 'Concession' | 'Pending';

export interface NonConformance {
  id: string;
  ncrNumber: string;
  title: string;
  type: NcrType;
  status: NcrStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  severity?: NcrSeverity;
  source?: string;
  description: string;
  lotNumber?: string;
  quantityAffected?: number;
  disposition?: NcrDisposition;
  linkedCapaId?: string;
  linkedProcedureRef?: string;
  supplierId?: string;
  isOosOot: boolean;
  analyticalMethod?: string;
  measuredValue?: number;
  measuredUnit?: string;
  specLimit?: string;
  phase1Conclusion?: 'Error Found' | 'No Error Found' | 'Pending';
  phase2Required: boolean;
  phase2Conclusion?: 'Confirmed OOS' | 'Invalidated' | 'Pending';
  rejectLot: boolean;
  impactAssessment?: string;
  containmentActions?: string;
  affectedProduct?: string;
  assignedTo?: string;
  dueDate?: string;
  createdDate: string;
  createdById?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Batch Record
// ============================================================================

export type BatchStatus = 'In Progress' | 'Pending QA Review' | 'Released' | 'Rejected' | 'Quarantine';
export type BatchStepStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';
export type StepType = 'Weighing' | 'Mixing' | 'Filtration' | 'Filling' | 'Inspection' | 'Labeling' | 'Packaging' | 'QC Testing' | 'Other';
export type RawMaterialStatus = 'Verified' | 'Pending' | 'Rejected';

export interface BatchStep {
  id: string;
  batchRecordId: string;
  stepOrder: number;
  stepName: string;
  instructions?: string;
  expectedValue?: string;
  actualValue?: string;
  status: BatchStepStatus;
  stepType?: StepType;
  operatorId?: string;
  performedAt?: string;
  signatureHash?: string;
  createdAt: string;
}

export interface RawMaterial {
  id: string;
  material: string;
  lotNumber: string;
  supplier: string;
  status: RawMaterialStatus;
}

export interface BatchRecord {
  id: string;
  lotNumber: string;
  productName: string;
  productCode?: string;
  batchSize?: number;
  batchSizeUnit?: string;
  masterFormulaId?: string;
  sopReference?: string;
  manufacturingDate: string;
  expiryDate?: string;
  status: BatchStatus;
  isLocked: boolean;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  qaReleaseDate?: string;
  qaReleasedById?: string;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  steps?: BatchStep[];
  rawMaterials?: RawMaterial[];
}

// ============================================================================
// Supplier
// ============================================================================

export type SupplierCategory = 'Raw Material' | 'Packaging' | 'Equipment' | 'Service' | 'Contract Manufacturer' | 'Laboratory' | 'Other';
export type SupplierStatus = 'Qualified' | 'Conditional' | 'Disqualified' | 'Under Evaluation';
export type QualificationMethod = 'On-Site Audit' | 'Questionnaire' | 'Certificate Review' | 'Third-Party Assessment' | 'Historical Performance';

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  category?: SupplierCategory;
  status: SupplierStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  qualificationDate?: string;
  nextReviewDate?: string;
  certifications?: string[];
  performanceScore?: number;
  qualificationDocId?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  street?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  qualificationMethod?: QualificationMethod;
  qualificationDocRef?: string;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
}

// ============================================================================
// Form Template & Instance — Hybrid 2-Layer Supervision
// Layer 1: Template Approval (§4.2.3 Sovereign)
// Layer 2: Record Execution (§4.2.4 Execution)
// ============================================================================

/** FormTemplate lifecycle states — Layer 1 of Hybrid Supervision */

/** Maps each record module to its FormTemplate target */
export type FormTemplateModule =
  | 'CAPA' | 'NCR' | 'DEVIATION' | 'CHANGE_CONTROL' | 'AUDIT'
  | 'RISK' | 'TRAINING' | 'SUPPLIER' | 'BATCH_RECORD' | 'OOS_OOT'
  | 'GENERAL';

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'signature' | 'table' | 'rating' | 'file' | 'repeater';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  validation?: { min?: number; max?: number; pattern?: string };
}

export interface FormTemplateWorkflow {
  requiresApproval: boolean;
  workflowType: 'single' | 'sequential' | 'parallel';
  allowDraftSaves: boolean;
  lockAfterSubmission: boolean;
  eSignatureRequired: boolean;
  /** Approvers assigned for this template's approval workflow */
  approvers?: WorkflowApprover[];
}

/** Approver in a workflow chain — used for sequential/parallel approval */
export interface WorkflowApprover {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  order?: number; // For sequential: step order (1, 2, 3...)
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ============================================================================
// Form Template Status (Layer 1 — Template Approval Lifecycle)
// ============================================================================

/**
 * FormTemplateStatus governs the lifecycle of a form template (Layer 1).
 * ISO 13485 §4.2.3 requires document approval before use.
 *
 * Transitions:
 *   Draft → Under_Review (submit for review)
 *   Under_Review → Approved (approve, requires e-signature)
 *   Under_Review → Draft (return for revision)
 *   Approved → Obsolete (supersede/retire)
 *   Approved → Draft (create new revision)
 */
export type FormTemplateStatus = 'Draft' | 'Under_Review' | 'Approved' | 'Obsolete';

/** Map of valid status transitions for FormTemplate */
export const FORM_TEMPLATE_TRANSITIONS: Record<FormTemplateStatus, FormTemplateStatus[]> = {
  Draft: ['Under_Review'],
  Under_Review: ['Approved', 'Draft'],
  Approved: ['Obsolete', 'Draft'],
  Obsolete: [],
};

/** Roles allowed to transition template status */
export const FORM_TEMPLATE_TRANSITION_ROLES: Record<string, UserRole[]> = {
  'Draft→Under_Review': ['admin', 'quality_manager', 'document_controller'],
  'Under_Review→Approved': ['admin', 'quality_manager'],
  'Under_Review→Draft': ['admin', 'quality_manager', 'document_controller'],
  'Approved→Obsolete': ['admin', 'quality_manager'],
  'Approved→Draft': ['admin', 'quality_manager', 'document_controller'],
};

/** Module type enum for linking templates to record modules */
export type FormTemplateModuleType =
  | 'capa' | 'ncr' | 'deviation' | 'change_control'
  | 'audit' | 'risk' | 'training' | 'supplier'
  | 'batch_record' | 'oos_oot' | 'general';

export interface FormTemplateCompliance {
  regulatoryReference: string;
  retentionPeriod: string;
  dataClassification: 'Internal' | 'Confidential' | 'Regulatory' | 'GxP Critical';
  auditTrailEnabled: boolean;
  printFriendlyLayout: boolean;
  cfrPart11Compliance: boolean;
}

export interface FormTemplate {
  id: string;
  documentId: string;
  title: string;
  version: string;
  description?: string;
  fields: FormFieldDefinition[];
  /** @deprecated Use `status` instead — isActive is kept for backward compat */
  isActive: boolean;
  /** Layer 1 status lifecycle: Draft → Under_Review → Approved → Obsolete */
  status: FormTemplateStatus;
  /** Which QMS module this template belongs to (for 10-module connection) */
  moduleType: FormTemplateModuleType;
  workflow?: FormTemplateWorkflow;
  compliance?: FormTemplateCompliance;
  /** Electronic signatures on this template (for approval/review) */
  signatures?: ElectronicSignature[];
  /** Current approval step (for sequential workflow) */
  currentApprovalStep?: number;
  /** Version history tracking */
  previousVersionId?: string;
  /** Effective date when template was approved */
  effectiveDate?: string;
  /** Review/Rejection reason */
  reviewComment?: string;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
  instances?: FormInstance[];
}

export type FormInstanceStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface FormInstance {
  id: string;
  templateId: string;
  templateVersion: string;
  referenceNumber: string;
  values: Record<string, unknown>;
  status: FormInstanceStatus;
  isLocked: boolean;
  submittedById?: string;
  submittedAt?: string;
  signatureHash?: string;
  /** Electronic signatures on this instance */
  signatures?: ElectronicSignature[];
  /** Current approval step (for sequential workflow from template) */
  currentApprovalStep?: number;
  /** Approval history tracking */
  approvalHistory?: InstanceApprovalEntry[];
  parentDocumentId?: string;
  /** Linked QMS record ID (e.g., CAPA-001, NCR-001) */
  linkedRecordId?: string;
  /** Linked QMS record type */
  linkedRecordType?: FormTemplateModuleType;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Approval entry for instance workflow history */
export interface InstanceApprovalEntry {
  id: string;
  approverId: string;
  approverName: string;
  action: 'approved' | 'rejected' | 'returned';
  comment?: string;
  signatureHash?: string;
  timestamp: string;
}

// ============================================================================
// Audit Trail
// ============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'LOGIN' | 'EXPORT';

export interface AuditTrail {
  id: string;
  auditAction: AuditAction;
  tableName: string;
  recordId?: string;
  userId?: string;
  userEmail?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
  createdAt: string;
}

// ============================================================================
// Document Prerequisite
// ============================================================================

export type PrerequisiteRecordType = 'CAPA' | 'NCR' | 'TRAINING' | 'RISK' | 'AUDIT' | 'CHANGE_CONTROL' | 'DEVIATION';

export interface DocumentPrerequisite {
  id: string;
  organizationId?: string;
  recordType: PrerequisiteRecordType;
  requiredDocType: string;
  requiredDocRef?: string;
  isMandatory: boolean;
  description?: string;
  createdAt: string;
}

// ============================================================================
// Profile
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Organization
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  settings: string; // JSON string of OrgSettings
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  invitedBy?: string;
  createdAt: string;
}

// ============================================================================
// Audit
// ============================================================================

export type AuditType = 'Internal' | 'External' | 'Supplier';
export type AuditStatus = 'Planned' | 'In Progress' | 'Completed';

export interface AuditFinding {
  id: string;
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Observation';
  referenceClause?: string;
  correctiveActionRequired: boolean;
  capaId?: string;
}

export interface Audit {
  id: string;
  auditNumber: string;
  title: string;
  type: AuditType;
  status: AuditStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  auditScope?: string;
  scheduledDate: string;
  completedDate?: string;
  leadAuditor: string;
  auditees?: string[];
  findings?: AuditFinding[];
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Training
// ============================================================================

export type TrainingType = 'Onboarding' | 'SOP' | 'Regulatory' | 'Skill' | 'Certification';
export type TrainingStatus = 'Planned' | 'In Progress' | 'Completed' | 'Overdue';

export interface Training {
  id: string;
  title: string;
  description?: string;
  type: TrainingType;
  status: TrainingStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  documentId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Risk
// ============================================================================

export type RiskCategory = 'Product' | 'Process' | 'System' | 'Supplier';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskStatus = 'Open' | 'Mitigated' | 'Accepted' | 'Closed';

export interface Risk {
  id: string;
  riskNumber: string;
  title: string;
  category?: RiskCategory;
  probability: number; // 1-5
  impact: number; // 1-5
  detectability: number; // 1-5
  rpn: number; // probability * impact * detectability
  riskLevel: RiskLevel;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  mitigation?: string;
  residualRisk?: string;
  status: RiskStatus;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Navigation
// ============================================================================

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  module?: string;
  badge?: number;
  children?: NavItem[];
}

// ============================================================================
// Change Control
// ============================================================================

export type ChangeControlType = 'Planned' | 'Unplanned' | 'Emergency';
export type ChangeControlStatus = 'Requested' | 'Under Review' | 'Approved' | 'In Implementation' | 'Completed' | 'Rejected';
export type ChangeControlPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ChangeControlCategory = 'Process' | 'Equipment' | 'Facility' | 'Document' | 'Material' | 'Computer System' | 'Organizational' | 'Manufacturing' | 'Regulatory' | 'Supply Chain' | 'Warehouse' | 'Other';

export interface ChangeControl {
  id: string;
  ccNumber: string;
  title: string;
  type: ChangeControlType;
  status: ChangeControlStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  priority: ChangeControlPriority;
  category: ChangeControlCategory;
  description: string;
  justification: string;
  proposedChange: string;
  detailedChangeDescription?: string;
  businessComplianceJustification?: string;
  riskAssessment?: string;
  impactAnalysis?: string;
  affectedAreas?: string;
  impactOnValidatedSystems?: boolean;
  implementationPlan?: string;
  implementationDate?: string;
  estimatedCostImpact?: string;
  completionDate?: string;
  regulatoryTrigger?: string;
  emergencyFlag?: boolean;
  linkedDocumentId?: string;
  linkedCapaId?: string;
  additionalReferences?: string;
  assignedTo: string;
  requestedBy: string;
  approvedBy?: string;
  approver?: string;
  dueDate: string;
  createdById?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Deviation
// ============================================================================

export type DeviationType = 'Planned' | 'Unplanned';
export type DeviationStatus = 'Open' | 'Under Investigation' | 'Pending QA Review' | 'Approved' | 'Closed';
export type DeviationSeverity = 'Critical' | 'Major' | 'Minor';
export type DeviationCategory = 'Process' | 'Equipment' | 'Material' | 'Environment' | 'Personnel' | 'Documentation';

export type DeviationProductStage = 'Raw Material' | 'In-Process' | 'Finished Product' | 'Stability' | 'Other';

export interface Deviation {
  id: string;
  devNumber: string;
  title: string;
  type: DeviationType;
  status: DeviationStatus;
  /** ID of the approved FormTemplate used to create this record */
  templateId?: string;
  /** Version of the FormTemplate at time of record creation */
  templateVersion?: string;
  severity: DeviationSeverity;
  category: DeviationCategory;
  description: string;
  deviationDetails: string;
  justification?: string;
  riskAssessment?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  sopReference?: string;
  expectedResult?: string;
  actualResult?: string;
  productStage?: DeviationProductStage;
  quarantine?: boolean;
  impactOnValidatedState?: string;
  impactOnRegulatoryFiling?: string;
  containmentAction?: string;
  detectedDate?: string;
  isPlannedDeviation?: boolean;
  lotNumber?: string;
  productCode?: string;
  quantityAffected?: number;
  linkedCapaId?: string;
  linkedDocumentId?: string;
  assignedTo: string;
  dueDate: string;
  closedDate?: string;
  createdById?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Navigation
// ============================================================================

export type ActiveSection =
  | 'dashboard'
  | 'documents' | 'document-hierarchy'
  | 'ncr' | 'capa' | 'audits' | 'risks' | 'training' | 'change-control' | 'deviations' | 'batch-records' | 'suppliers' | 'oos-oot' | 'forms'
  | 'reports' | 'compliance'
  | 'user-management';
