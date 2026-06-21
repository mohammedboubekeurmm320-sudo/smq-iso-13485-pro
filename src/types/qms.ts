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
  | 'recordtypes.create' | 'recordtypes.read' | 'recordtypes.update' | 'recordtypes.delete'
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
  scope?: string;
  references?: string;
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
  /** Custom field values */
  customFields?: CustomFieldValue[];
  /** Whether this document is a template that other documents can reference for creation.
   *  Templates must be Approved/Effective before they can be used as references. */
  isTemplate?: boolean;
  /** ID of the approved template document this document was created from.
   *  Provides traceability from document back to its source template. */
  templateReferenceId?: string;
  /** Version of the template at the time this document was created from it. */
  templateReferenceVersion?: string;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  capaNumber: string;
  title: string;
  type: CapaType;
  status: CapaStatus;
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
  /** Linked CAPA (for parent/child CAPA chains) — ISO 13485 §8.5.2 */
  linkedCapaId?: string;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  ncrNumber: string;
  title: string;
  type: NcrType;
  status: NcrStatus;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  supplierCode: string;
  name: string;
  category?: SupplierCategory;
  status: SupplierStatus;
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
// Form Template & Instance
// ============================================================================

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
  /** Approvers chain for sequential/parallel workflows — agent-ctx/worklog.md (Layer 1) */
  approvers?: WorkflowApprover[];
}

/** Approver entry in a form template workflow chain */
export interface WorkflowApprover {
  id: string;
  /** User ID of the approver (Profile.id) */
  userId: string;
  /** Display name of the approver (denormalized for history display) */
  userName?: string;
  role: UserRole;
  /** Order in the chain (1-based) for sequential workflows */
  order?: number;
  /** Whether this approver has signed (for instance-level tracking) */
  status?: 'pending' | 'approved' | 'rejected';
  comment?: string;
  signatureHash?: string;
  timestamp?: string;
}

export interface FormTemplateCompliance {
  regulatoryReference: string;
  retentionPeriod: string;
  dataClassification: 'Internal' | 'Confidential' | 'Regulatory' | 'GxP Critical';
  auditTrailEnabled: boolean;
  printFriendlyLayout: boolean;
  cfrPart11Compliance: boolean;
}

export type FormTemplateStatus = 'Draft' | 'Under_Review' | 'Approved' | 'Obsolete';

export type FormTemplateModuleType = 'capa' | 'ncr' | 'deviation' | 'change_control' | 'audit' | 'risk' | 'training' | 'supplier' | 'batch_record' | 'oos_oot' | 'general';

/** @deprecated Use FormTemplateModuleType instead */
export type FormTemplateModule = FormTemplateModuleType;

export interface FormTemplate {
  id: string;
  documentId: string;
  title: string;
  version: string;
  description?: string;
  fields: FormFieldDefinition[];
  isActive: boolean;
  status?: FormTemplateStatus;
  moduleType?: FormTemplateModuleType;
  workflow?: FormTemplateWorkflow;
  compliance?: FormTemplateCompliance;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
  effectiveDate?: string;
  reviewComment?: string;
  signatures?: ElectronicSignature[];
  instances?: FormInstance[];
}

/** Allowed status transitions for form templates (state machine) */
export const FORM_TEMPLATE_TRANSITIONS: Record<FormTemplateStatus, FormTemplateStatus[]> = {
  Draft: ['Under_Review'],
  Under_Review: ['Approved', 'Draft'],
  Approved: ['Obsolete', 'Draft'],
  Obsolete: [],
};

/** Role-based access control for template status transitions */
export const FORM_TEMPLATE_TRANSITION_ROLES: Record<string, UserRole[]> = {
  'Draft→Under_Review': ['admin', 'quality_manager', 'document_controller'],
  'Under_Review→Approved': ['admin', 'quality_manager'],
  'Under_Review→Draft': ['admin', 'quality_manager', 'document_controller'],
  'Approved→Obsolete': ['admin', 'quality_manager'],
  'Approved→Draft': ['admin', 'quality_manager'],
};

export type FormInstanceStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface FormInstanceApprovalEntry {
  id: string;
  action: 'approved' | 'rejected' | 'returned';
  approverName: string;
  approverId: string;
  timestamp: string;
  comment?: string;
  signatureHash?: string;
}

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
  parentDocumentId?: string;
  /** Slug of the record type this instance belongs to — used by /api/records/[type] */
  recordTypeSlug?: string;
  /** ID of the linked module record (CAPA, NCR, etc.) — ISO 13485 §7.5.9 */
  linkedRecordId?: string;
  /** Slug of the linked module record type */
  linkedRecordType?: string;
  organizationId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
  /** Current step in a sequential/parallel approval chain — 1-based, 0 = not started */
  currentApprovalStep?: number;
  signatures?: ElectronicSignature[];
  approvalHistory?: FormInstanceApprovalEntry[];
}

// ============================================================================
// Audit Trail
// ============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'LOGIN' | 'EXPORT';

export interface AuditTrail {
  id: string;
  action: AuditAction;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  auditNumber: string;
  title: string;
  type: AuditType;
  status: AuditStatus;
  scope?: string;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  title: string;
  description?: string;
  type: TrainingType;
  status: TrainingStatus;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  riskNumber: string;
  title: string;
  category?: RiskCategory;
  /** Description of the hazard — ISO 14971 §5.4 */
  hazardDescription?: string;
  /** Person responsible for the risk — ISO 14971 §5.5 */
  riskOwner?: string;
  /** Regulatory clause reference (e.g., 'ISO 14971 §5.5') */
  regulatoryReference?: string;
  /** Type of risk control — ISO 14971 §6.2 (e.g., 'inherent_safe_design', 'protective_measures', 'information_for_safety') */
  controlType?: string;
  /** Method used to verify risk control effectiveness — ISO 14971 §8 */
  verificationMethod?: string;
  /** Acceptability decision (e.g., 'acceptable', 'ALARP', 'unacceptable') */
  riskAcceptability?: string;
  /** Notes on risk priority and justification */
  priorityNotes?: string;
  probability: number; // 1-5
  impact: number; // 1-5
  detectability: number; // 1-5
  rpn: number; // probability * impact * detectability
  riskLevel: RiskLevel;
  mitigation?: string;
  residualRisk?: string;
  /** Residual risk factors after mitigation — ISO 14971 §6.3 */
  residualProbability?: number;
  residualImpact?: number;
  residualDetectability?: number;
  residualRpn?: number;
  /** Linked document (e.g., risk assessment form) — ISO 13485 §4.2.4 */
  linkedDocumentId?: string;
  /** Linked CAPA (for risk mitigation action) — ISO 13485 §8.5.2 */
  linkedCapaId?: string;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  ccNumber: string;
  title: string;
  type: ChangeControlType;
  status: ChangeControlStatus;
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
  /** Form template reference — ISO 13485 §4.2.4 (record must be created from an approved template) */
  templateId?: string;
  templateVersion?: string;
  devNumber: string;
  title: string;
  type: DeviationType;
  status: DeviationStatus;
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
// Scheduled Report
// ============================================================================

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportType = 'management-review' | 'capa-summary' | 'audit-summary' | 'compliance-overview' | 'training-status' | 'risk-profile';
export type ReportFormat = 'csv' | 'html' | 'pdf';
export type ScheduledReportStatus = 'active' | 'paused' | 'completed' | 'error';

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  status: ScheduledReportStatus;
  recipients: string[]; // email addresses
  filters?: Record<string, string>; // e.g., { department: 'Quality', priority: 'Critical' }
  lastRunAt?: string;
  nextRunAt: string;
  lastResult?: { success: boolean; recordCount: number; error?: string };
  organizationId?: string;
  createdById?: string;
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
  | 'reports' | 'compliance' | 'scheduled-reports'
  | 'user-management' | 'settings';

// ============================================================================
// Extensible Record Type System (ISO 13485 §4.2.3 / §4.2.4)
// ============================================================================

export type RecordLinkType =
  | 'parent_of' | 'child_of'
  | 'caused_by' | 'corrected_by'
  | 'related_to' | 'derived_from';

export interface StatusFlowTransition {
  from: string;
  to: string;
  required_role: UserRole[];
}

export interface StatusFlowConfig {
  statuses: string[];
  transitions: StatusFlowTransition[];
  initial_status: string;
}

/**
 * Compliance reference — links a record type to a specific clause of a
 * regulatory standard (ISO 13485, ISO 14971, 21 CFR Part 11, ...).
 *
 * Stored as JSONB in `record_type_definitions.compliance_refs`.
 */
export interface ComplianceRef {
  /** Clause identifier, e.g., '8.5.2' or '§7.5.6' */
  clause: string;
  /** Standard family, e.g., 'ISO 13485', 'ISO 14971', '21 CFR Part 11' */
  standard: string;
  /** Human-readable description of what this clause requires */
  description?: string;
}

/**
 * Status flow step definition — the original (camelCase) shape used by the
 * demo store and the standalone `RecordTypeManager` component. Stored as
 * JSONB in `record_type_definitions.status_flow`.
 */
export interface StatusFlowStep {
  /** Linear progression steps */
  linear: string[];
  /** Branch states (e.g., Rejected, Disqualified) with return paths */
  branches?: Record<string, string[]>;
  /** States that require e-signature to transition to */
  eSigRequired?: string[];
  /** States that are terminal (no further transitions) */
  terminal?: string[];
}

/**
 * `RecordTypeDefinition` (snake_case) — the row shape returned by the
 * Supabase `record_type_definitions` table. Used by `SettingsView.tsx`
 * and the SQL migration layer.
 */
export interface RecordTypeDefinition {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  code_prefix: string;
  status_flow: StatusFlowConfig;
  json_schema: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * `RecordTypeDefinitionLegacy` (camelCase) — the application-side shape used
 * by the demo store (`src/lib/demo-store.ts`), the standalone
 * `RecordTypeManager` component, and the Supabase `RecordTypeService` which
 * maps SQL snake_case rows to this camelCase shape via `mapToCamel()`.
 *
 * Kept for backward compatibility with the agent-ctx architecture
 * (see agent-ctx/3-a-module-enhancer.md and the original commit 0ac9066).
 */
export interface RecordTypeDefinitionLegacy {
  id: string;
  /** URL-safe slug — unique per organization */
  slug: string;
  /** Display name (French) */
  name: string;
  /** Display name (English) */
  nameEn?: string;
  /** Lucide icon name for navigation/UI */
  icon: string;
  description?: string;
  /** Configurable status flow — replaces hardcoded MODULE_STATUS_FLOWS */
  statusFlow: StatusFlowStep[];
  /** Default form fields inherited by templates created for this type */
  defaultFields: FormFieldDefinition[];
  /** ISO 13485 / regulatory clause references for compliance mapping */
  complianceRefs: ComplianceRef[];
  /** Code prefix for auto-numbering (e.g., 'ETL' → ETL-2025-001) */
  codePrefix?: string;
  /** System types (true) cannot be deleted/deactivated — ISO 13485 §4.1 */
  isSystem: boolean;
  isActive: boolean;
  /** Whether all transitions require e-signature */
  requiresEsig: boolean;
  /** Minimum number of approvers for Layer 1 template approval */
  minApproverCount: number;
  effectiveDate?: string;
  previousVersionId?: string;
  version: string;
  changeReason?: string;
  organizationId: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordLink {
  id: string;
  org_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  link_type: RecordLinkType;
  created_by: string | null;
  created_at: string;
}

/**
 * `RecordLinkLegacy` (camelCase) — the application-side shape used by the
 * demo store and the `/api/record-links` route. The Supabase
 * `RecordLinkService` maps SQL snake_case rows to this camelCase shape via
 * `mapToCamel()`.
 */
export interface RecordLinkLegacy {
  id: string;
  sourceRecordId: string;
  sourceRecordType: string;
  targetRecordId: string;
  targetRecordType: string;
  linkType: string;
  description?: string;
  organizationId: string;
  createdById?: string;
  createdAt: string;
}

export interface CreateRecordTypeDefinitionDTO {
  name: string;
  description?: string;
  code_prefix: string;
  status_flow: StatusFlowConfig;
  json_schema?: Record<string, unknown> | null;
}

/** 10 system module slugs — protected from modification/deletion */
export const SYSTEM_RECORD_TYPE_SLUGS = [
  'capa', 'ncr', 'deviation', 'change-control', 'audit',
  'risk', 'training', 'supplier', 'batch-record', 'oos-oot',
] as const;

export type SystemRecordTypeSlug = typeof SYSTEM_RECORD_TYPE_SLUGS[number];

// ============================================================================
// Custom Fields
// ============================================================================

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'url';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // for select type
  placeholder?: string;
  defaultValue?: string;
  applicableTo: string[]; // document types this field applies to, or ['*'] for all
  organizationId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  definitionId: string;
  value: string;
}
