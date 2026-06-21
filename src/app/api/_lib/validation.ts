// Zod validation schemas for all QMS entities

import { z } from 'zod';

// ============================================================================
// Document
// ============================================================================

export const documentSchema = z.object({
  documentNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical', 'Risk Analysis', 'Validation Protocol', 'Record']),
  version: z.string().default('1.0'),
  status: z.enum(['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn']).default('Draft'),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  lastReviewed: z.string().optional(),
  nextReview: z.string().optional(),
  description: z.string().optional(),
  classification: z.enum(['Internal', 'External', 'Regulatory', 'Confidential']).optional(),
  retentionPeriod: z.string().optional(),
  scope: z.string().optional(),
  references: z.string().optional(),
  typeSpecificData: z.record(z.string(), z.unknown()).optional(),
  parentDocumentId: z.string().optional(),
  documentLevel: z.number().min(1).max(4).optional(),
  validationPhase: z.enum(['IQ', 'OQ', 'PQ', 'Full']).optional(),
  parentValidationId: z.string().optional(),
  authorId: z.string().optional(),
  organizationId: z.string().optional(),
  createdById: z.string().optional(),
});

// ============================================================================
// CAPA
// ============================================================================

export const capaSchema = z.object({
  capaNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['Corrective', 'Preventive']),
  status: z.enum(['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed']).default('Open'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  source: z.enum(['Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue']).optional(),
  sourceReferenceId: z.string().optional(),
  description: z.string().min(1),
  problemStatement: z.string().optional(),
  investigationDetails: z.string().optional(),
  rootCauseAnalysis: z.string().optional(),
  rootCauseCategory: z.enum(['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management']).optional(),
  fiveWhys: z.array(z.string()).optional(),
  correctiveAction: z.string().optional(),
  effectivenessVerificationMethod: z.string().optional(),
  effectivenessCriteria: z.string().optional(),
  effectivenessResult: z.enum(['Effective', 'Not Effective', 'Pending Review']).optional(),
  linkedDocumentId: z.string().optional(),
  linkedNcrId: z.string().optional(),
  linkedAuditId: z.string().optional(),
  assignedTo: z.string().min(1),
  dueDate: z.string().min(1),
  createdDate: z.string().min(1),
  closedDate: z.string().optional(),
  createdById: z.string().optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// NCR
// ============================================================================

export const ncrSchema = z.object({
  ncrNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT']),
  status: z.enum(['Open', 'Under Investigation', 'Pending Disposition', 'Closed']).default('Open'),
  severity: z.enum(['Critical', 'Major', 'Minor']).optional(),
  source: z.string().optional(),
  description: z.string().min(1),
  lotNumber: z.string().optional(),
  quantityAffected: z.number().optional(),
  disposition: z.enum(['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending']).optional(),
  linkedCapaId: z.string().optional(),
  linkedProcedureRef: z.string().optional(),
  supplierId: z.string().optional(),
  isOosOot: z.boolean().default(false),
  analyticalMethod: z.string().optional(),
  measuredValue: z.number().optional(),
  measuredUnit: z.string().optional(),
  specLimit: z.string().optional(),
  phase1Conclusion: z.enum(['Error Found', 'No Error Found', 'Pending']).optional(),
  phase2Required: z.boolean().default(false),
  phase2Conclusion: z.enum(['Confirmed OOS', 'Invalidated', 'Pending']).optional(),
  rejectLot: z.boolean().default(false),
  assignedTo: z.string().optional(),
  createdDate: z.string().min(1),
  createdById: z.string().optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// Audit
// ============================================================================

export const auditSchema = z.object({
  auditNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['Internal', 'External', 'Supplier']).default('Internal'),
  status: z.enum(['Planned', 'In Progress', 'Completed']).default('Planned'),
  scope: z.string().optional(),
  scheduledDate: z.string().min(1),
  completedDate: z.string().optional(),
  leadAuditor: z.string().min(1),
  auditees: z.array(z.string()).optional(),
  findings: z.array(z.object({
    id: z.string(),
    description: z.string(),
    severity: z.enum(['Critical', 'Major', 'Minor', 'Observation']),
    referenceClause: z.string().optional(),
    correctiveActionRequired: z.boolean(),
    capaId: z.string().optional(),
  })).optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// Training
// ============================================================================

export const trainingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification']),
  status: z.enum(['Planned', 'In Progress', 'Completed', 'Overdue']).default('Planned'),
  assignedTo: z.string().min(1),
  dueDate: z.string().min(1),
  completedDate: z.string().optional(),
  documentId: z.string().optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// Risk
// ============================================================================

export const riskSchema = z.object({
  riskNumber: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(['Product', 'Process', 'System', 'Supplier']).optional(),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  detectability: z.number().min(1).max(5),
  rpn: z.number(),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  mitigation: z.string().optional(),
  residualRisk: z.string().optional(),
  status: z.enum(['Open', 'Mitigated', 'Accepted', 'Closed']).default('Open'),
  organizationId: z.string().optional(),
});

// ============================================================================
// Batch Record
// ============================================================================

export const batchRecordSchema = z.object({
  lotNumber: z.string().min(1),
  productName: z.string().min(1),
  productCode: z.string().optional(),
  batchSize: z.number().optional(),
  batchSizeUnit: z.string().optional(),
  masterFormulaId: z.string().optional(),
  manufacturingDate: z.string().min(1),
  expiryDate: z.string().optional(),
  status: z.enum(['In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine']).default('In Progress'),
  isLocked: z.boolean().default(false),
  qaReleaseDate: z.string().optional(),
  qaReleasedById: z.string().optional(),
  organizationId: z.string().optional(),
  createdById: z.string().optional(),
});

// ============================================================================
// Supplier
// ============================================================================

export const supplierSchema = z.object({
  supplierCode: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other']).optional(),
  status: z.enum(['Qualified', 'Conditional', 'Disqualified', 'Under Evaluation']).default('Qualified'),
  qualificationDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  qualificationDocId: z.string().optional(),
  organizationId: z.string().optional(),
  createdById: z.string().optional(),
});

// ============================================================================
// Form Template
// ============================================================================

export const formTemplateSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1),
  version: z.string().default('1.0'),
  fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'signature', 'table']),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    defaultValue: z.string().optional(),
    validation: z.object({ min: z.number().optional(), max: z.number().optional(), pattern: z.string().optional() }).optional(),
  })),
  isActive: z.boolean().default(true),
  organizationId: z.string().optional(),
  createdById: z.string().optional(),
});

// ============================================================================
// Form Instance
// ============================================================================

export const formInstanceSchema = z.object({
  templateId: z.string().min(1),
  templateVersion: z.string().min(1),
  referenceNumber: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']).default('Draft'),
  isLocked: z.boolean().default(false),
  submittedById: z.string().optional(),
  submittedAt: z.string().optional(),
  signatureHash: z.string().optional(),
  parentDocumentId: z.string().optional(),
  organizationId: z.string().optional(),
  createdById: z.string().optional(),
});

// ============================================================================
// Change Control
// ============================================================================

export const changeControlSchema = z.object({
  ccNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['Planned', 'Unplanned', 'Emergency']),
  status: z.enum(['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected']).default('Requested'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  category: z.enum(['Process', 'Equipment', 'Facility', 'Document', 'Material', 'Computer System', 'Organizational']),
  description: z.string().min(1),
  justification: z.string().min(1),
  proposedChange: z.string().min(1),
  riskAssessment: z.string().optional(),
  impactAnalysis: z.string().optional(),
  implementationPlan: z.string().optional(),
  implementationDate: z.string().optional(),
  completionDate: z.string().optional(),
  linkedDocumentId: z.string().optional(),
  linkedCapaId: z.string().optional(),
  assignedTo: z.string().min(1),
  requestedBy: z.string().min(1),
  approvedBy: z.string().optional(),
  dueDate: z.string().min(1),
  createdById: z.string().optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// Deviation
// ============================================================================

export const deviationSchema = z.object({
  devNumber: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['Planned', 'Unplanned']),
  status: z.enum(['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed']).default('Open'),
  severity: z.enum(['Critical', 'Major', 'Minor']),
  category: z.enum(['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation']),
  description: z.string().min(1),
  deviationDetails: z.string().min(1),
  justification: z.string().optional(),
  riskAssessment: z.string().optional(),
  correctiveAction: z.string().optional(),
  preventiveAction: z.string().optional(),
  lotNumber: z.string().optional(),
  productCode: z.string().optional(),
  quantityAffected: z.number().optional(),
  linkedCapaId: z.string().optional(),
  linkedDocumentId: z.string().optional(),
  assignedTo: z.string().min(1),
  dueDate: z.string().min(1),
  closedDate: z.string().optional(),
  createdById: z.string().optional(),
  organizationId: z.string().optional(),
});

// ============================================================================
// Profile
// ============================================================================

export const profileSchema = z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
  role: z.enum(['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// ============================================================================
// Organization
// ============================================================================

export const organizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  subscriptionStatus: z.enum(['trial', 'active', 'suspended', 'cancelled']).default('trial'),
  settings: z.string().optional(),
});
