-- ============================================================================
-- SMQ ISO 13485 PRO — Initial Database Schema
-- ============================================================================
-- Generated from TypeScript types in src/types/qms.ts
-- Target: PostgreSQL 15+ (Supabase)
--
-- Architecture: Hybrid 2-Layer Supervision
--   Layer 1: form_templates (Template Approval — ISO 13485 §4.2.3)
--   Layer 2: form_instances (Execution — ISO 13485 §4.2.4)
--
-- 10 Record Modules: CAPA, NCR, Deviation, Change Control, Audit,
--                    Risk, Training, Supplier, Batch Record, OOS/OOT
--
-- Execution order: organizations → profiles → ... → circular FKs at end
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES (for data integrity & ISO 13485 compliance)
-- ============================================================================

-- User roles & permissions
CREATE TYPE user_role AS ENUM (
  'admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'
);

-- Organization
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE org_member_status AS ENUM ('active', 'inactive', 'pending');

-- Document
CREATE TYPE document_type AS ENUM (
  -- Qwen-aligned (French taxonomy)
  'MANUEL', 'POLITIQUE', 'INDICATEUR', 'PROCESS_MAP', 'ORGANIGRAMME',
  'REGLEMENTAIRE', 'MAPPING',
  'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT', 'MASTER_BATCH',
  -- Legacy English types
  'SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical',
  'Risk Analysis', 'Validation Protocol', 'Record', 'Manual', 'Instruction',
  'Register', 'Master Batch', 'Procedure', 'Process Map', 'Organigram'
);

CREATE TYPE document_status AS ENUM ('Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn');
CREATE TYPE document_classification AS ENUM ('Internal', 'External', 'Regulatory', 'Confidential');
CREATE TYPE validation_phase AS ENUM ('IQ', 'OQ', 'PQ', 'Full');

-- Electronic Signature
CREATE TYPE signature_type AS ENUM ('approval', 'rejection', 'review', 'verification');

-- CAPA
CREATE TYPE capa_type AS ENUM ('Corrective', 'Preventive');
CREATE TYPE capa_status AS ENUM ('Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed');
CREATE TYPE capa_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE capa_source AS ENUM ('Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue');
CREATE TYPE root_cause_category AS ENUM ('Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management');

-- NCR
CREATE TYPE ncr_type AS ENUM ('Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT');
CREATE TYPE ncr_status AS ENUM ('Open', 'Under Investigation', 'Pending Disposition', 'Closed');
CREATE TYPE ncr_severity AS ENUM ('Critical', 'Major', 'Minor');
CREATE TYPE ncr_disposition AS ENUM ('Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending');

-- Deviation
CREATE TYPE deviation_type AS ENUM ('Planned', 'Unplanned');
CREATE TYPE deviation_status AS ENUM ('Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed');
CREATE TYPE deviation_severity AS ENUM ('Critical', 'Major', 'Minor');
CREATE TYPE deviation_category AS ENUM ('Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation');
CREATE TYPE deviation_product_stage AS ENUM ('Raw Material', 'In-Process', 'Finished Product', 'Stability', 'Other');

-- Change Control
CREATE TYPE cc_type AS ENUM ('Planned', 'Unplanned', 'Emergency');
CREATE TYPE cc_status AS ENUM ('Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected');
CREATE TYPE cc_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE cc_category AS ENUM (
  'Process', 'Equipment', 'Facility', 'Document', 'Material',
  'Computer System', 'Organizational', 'Manufacturing', 'Regulatory',
  'Supply Chain', 'Warehouse', 'Other'
);

-- Audit
CREATE TYPE audit_type AS ENUM ('Internal', 'External', 'Supplier');
CREATE TYPE audit_status AS ENUM ('Planned', 'In Progress', 'Completed');

-- Training
CREATE TYPE training_type AS ENUM ('Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification');
CREATE TYPE training_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Overdue');

-- Risk
CREATE TYPE risk_category AS ENUM ('Product', 'Process', 'System', 'Supplier');
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE risk_status AS ENUM ('Open', 'Mitigated', 'Accepted', 'Closed');

-- Batch Record
CREATE TYPE batch_status AS ENUM ('In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine');
CREATE TYPE batch_step_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Failed');
CREATE TYPE step_type AS ENUM ('Weighing', 'Mixing', 'Filtration', 'Filling', 'Inspection', 'Labeling', 'Packaging', 'QC Testing', 'Other');
CREATE TYPE raw_material_status AS ENUM ('Verified', 'Pending', 'Rejected');

-- Supplier
CREATE TYPE supplier_category AS ENUM ('Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other');
CREATE TYPE supplier_status AS ENUM ('Qualified', 'Conditional', 'Disqualified', 'Under Evaluation');
CREATE TYPE qualification_method AS ENUM ('On-Site Audit', 'Questionnaire', 'Certificate Review', 'Third-Party Assessment', 'Historical Performance');

-- Form Template (Layer 1)
CREATE TYPE form_template_status AS ENUM ('Draft', 'Under_Review', 'Approved', 'Obsolete');
CREATE TYPE form_template_module_type AS ENUM (
  'capa', 'ncr', 'deviation', 'change_control',
  'audit', 'risk', 'training', 'supplier',
  'batch_record', 'oos_oot', 'general'
);

-- Form Instance (Layer 2)
CREATE TYPE form_instance_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');

-- Audit Trail
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'LOGIN', 'EXPORT');

-- Document Prerequisite
CREATE TYPE prerequisite_record_type AS ENUM ('CAPA', 'NCR', 'TRAINING', 'RISK', 'AUDIT', 'CHANGE_CONTROL', 'DEVIATION');


-- ============================================================================
-- TABLE 1: organizations
-- ============================================================================

CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  settings      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations — each org isolates its QMS data';
COMMENT ON COLUMN organizations.settings IS 'JSON-serialized OrgSettings (industry_type, active_modules, etc.)';


-- ============================================================================
-- TABLE 2: profiles
-- ============================================================================

CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  role          user_role NOT NULL DEFAULT 'operator',
  department    text,
  job_title     text,
  phone         text,
  avatar_url    text,
  organization_id uuid REFERENCES organizations(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profiles linked to Supabase auth.users — stores QMS roles and org membership';


-- ============================================================================
-- TABLE 3: organization_members
-- ============================================================================

CREATE TABLE organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            org_member_role NOT NULL DEFAULT 'member',
  status          org_member_status NOT NULL DEFAULT 'active',
  invited_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

COMMENT ON TABLE organization_members IS 'Organization membership with role-based access';


-- ============================================================================
-- TABLE 4: documents
-- ============================================================================

CREATE TABLE documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number       text NOT NULL,
  title                 text NOT NULL,
  type                  document_type NOT NULL,
  version               text NOT NULL,
  status                document_status NOT NULL DEFAULT 'Draft',
  effective_date        timestamptz,
  expiration_date       timestamptz,
  owner                 text,
  department            text,
  last_reviewed         timestamptz,
  next_review           timestamptz,
  description           text,
  classification        document_classification,
  retention_period      text,
  scope                 text,
  references            text,
  type_specific_data    jsonb,
  parent_document_id    uuid REFERENCES documents(id),
  document_level        smallint CHECK (document_level BETWEEN 1 AND 4),
  validation_phase      validation_phase,
  parent_validation_id  uuid,
  author_id             uuid REFERENCES profiles(id),
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- P0: Qwen-aligned fields
  code                  text,
  iso_clause            text,
  triggers              jsonb DEFAULT '[]',
  child_codes           jsonb DEFAULT '[]',
  is_prerequisite       boolean DEFAULT false,
  review_cycle_months   integer
);

COMMENT ON TABLE documents IS 'ISO 13485 §4.2.3 — Controlled documents with 4-level hierarchy (Strategique→Enregistrement)';
COMMENT ON COLUMN documents.document_level IS '1=Strategique, 2=Transversal, 3=Metier/Technique, 4=Enregistrement/Formulaire';
COMMENT ON COLUMN documents.code IS 'Qwen document code (e.g. MQ-001, PR-4.2.4, FORM-DOC-001)';
COMMENT ON COLUMN documents.triggers IS 'JSON array of document codes that trigger/are triggered by this document';


-- ============================================================================
-- TABLE 5: electronic_signatures
-- ============================================================================

CREATE TABLE electronic_signatures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signed_by_id      uuid NOT NULL REFERENCES profiles(id),
  signer_name       text NOT NULL,
  signer_role       text NOT NULL,
  signature_type    signature_type NOT NULL,
  signature_hash    text NOT NULL,
  user_agent        text,
  revoked           boolean NOT NULL DEFAULT false,
  revocation_reason text,
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE electronic_signatures IS '21 CFR Part 11 compliant electronic signatures — linked to documents, templates, and instances';


-- ============================================================================
-- TABLE 6: document_prerequisites
-- ============================================================================

CREATE TABLE document_prerequisites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id),
  record_type       prerequisite_record_type NOT NULL,
  required_doc_type text NOT NULL,
  required_doc_ref  text,
  is_mandatory      boolean NOT NULL DEFAULT true,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE document_prerequisites IS 'Mandatory document prerequisites before record creation — ISO 13485 §4.2.3';


-- ============================================================================
-- TABLE 7: form_templates  (LAYER 1 — Template Approval)
-- ============================================================================

CREATE TABLE form_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           text,
  title                 text NOT NULL,
  version               text NOT NULL DEFAULT '1.0',
  description           text,
  fields                jsonb NOT NULL DEFAULT '[]',
  is_active             boolean NOT NULL DEFAULT true,
  status                form_template_status NOT NULL DEFAULT 'Draft',
  module_type           form_template_module_type NOT NULL DEFAULT 'general',
  workflow              jsonb,
  compliance            jsonb,
  signatures            jsonb DEFAULT '[]',
  current_approval_step integer DEFAULT 0,
  previous_version_id   uuid REFERENCES form_templates(id),
  effective_date        timestamptz,
  review_comment        text,
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_templates IS 'LAYER 1 — Form template approval lifecycle (ISO 13485 §4.2.3). Draft→Under_Review→Approved→Obsolete';
COMMENT ON COLUMN form_templates.status IS 'Template status governs whether instances can be created from it';
COMMENT ON COLUMN form_templates.module_type IS 'Which QMS module this template belongs to (connects to 10 record modules)';
COMMENT ON COLUMN form_templates.workflow IS 'JSON: FormTemplateWorkflow {requiresApproval, workflowType, approvers[], eSignatureRequired, etc.}';
COMMENT ON COLUMN form_templates.fields IS 'JSON array of FormFieldDefinition objects';
COMMENT ON COLUMN form_templates.compliance IS 'JSON: FormTemplateCompliance {regulatoryReference, retentionPeriod, cfrPart11Compliance, etc.}';


-- ============================================================================
-- TABLE 8: form_instances  (LAYER 2 — Execution)
-- ============================================================================

CREATE TABLE form_instances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES form_templates(id),
  template_version      text NOT NULL,
  reference_number      text NOT NULL,
  values                jsonb NOT NULL DEFAULT '{}',
  status                form_instance_status NOT NULL DEFAULT 'Draft',
  is_locked             boolean NOT NULL DEFAULT false,
  submitted_by_id       uuid REFERENCES profiles(id),
  submitted_at          timestamptz,
  signature_hash        text,
  signatures            jsonb DEFAULT '[]',
  current_approval_step integer DEFAULT 0,
  approval_history      jsonb DEFAULT '[]',
  parent_document_id    uuid REFERENCES documents(id),
  linked_record_id      text,
  linked_record_type    form_template_module_type,
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_instances IS 'LAYER 2 — Form instance execution (ISO 13485 §4.2.4). Draft→Submitted→Approved/Rejected';
COMMENT ON COLUMN form_instances.linked_record_id IS 'FK-like reference to the QMS record (e.g. CAPA-001, NCR-001)';
COMMENT ON COLUMN form_instances.linked_record_type IS 'Which QMS module this instance belongs to';
COMMENT ON COLUMN form_instances.approval_history IS 'JSON array of InstanceApprovalEntry objects';


-- ============================================================================
-- TABLE 9: capas
-- ============================================================================

CREATE TABLE capas (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number                   text NOT NULL,
  title                         text NOT NULL,
  type                          capa_type NOT NULL,
  status                        capa_status NOT NULL DEFAULT 'Open',
  template_id                   uuid REFERENCES form_templates(id),
  template_version              text,
  priority                      capa_priority,
  source                        capa_source,
  source_reference_id           uuid,
  description                   text NOT NULL,
  problem_statement             text,
  investigation_details         text,
  root_cause_analysis           text,
  root_cause_category           root_cause_category,
  five_whys                     jsonb DEFAULT '[]',
  corrective_action             text,
  effectiveness_verification_method text,
  effectiveness_criteria        text,
  effectiveness_result          text CHECK (effectiveness_result IN ('Effective', 'Not Effective', 'Pending Review')),
  linked_document_id            uuid REFERENCES documents(id),
  linked_ncr_id                 uuid,  -- FK added after non_conformances
  linked_audit_id               uuid,  -- FK added after audits
  assigned_to                   text NOT NULL,
  due_date                      timestamptz NOT NULL,
  created_date                  timestamptz NOT NULL,
  closed_date                   timestamptz,
  created_by_id                 uuid REFERENCES profiles(id),
  organization_id               uuid REFERENCES organizations(id),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE capas IS 'CAPA records — Corrective and Preventive Actions (ISO 13485 §8.5.2/§8.5.3)';
COMMENT ON COLUMN capas.template_id IS 'FK to form_templates — Layer 1 connection. Only Approved templates can be used';
COMMENT ON COLUMN capas.template_version IS 'Snapshot of template version at record creation time';


-- ============================================================================
-- TABLE 10: non_conformances
-- ============================================================================

CREATE TABLE non_conformances (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number              text NOT NULL,
  title                   text NOT NULL,
  type                    ncr_type NOT NULL,
  status                  ncr_status NOT NULL DEFAULT 'Open',
  template_id             uuid REFERENCES form_templates(id),
  template_version        text,
  severity                ncr_severity,
  source                  text,
  description             text NOT NULL,
  lot_number              text,
  quantity_affected       integer,
  disposition             ncr_disposition,
  linked_capa_id          uuid REFERENCES capas(id),
  linked_procedure_ref    text,
  supplier_id             uuid,  -- FK added after suppliers
  is_oos_oot              boolean NOT NULL DEFAULT false,
  analytical_method       text,
  measured_value          numeric,
  measured_unit           text,
  spec_limit              text,
  phase1_conclusion       text CHECK (phase1_conclusion IN ('Error Found', 'No Error Found', 'Pending')),
  phase2_required         boolean NOT NULL DEFAULT false,
  phase2_conclusion       text CHECK (phase2_conclusion IN ('Confirmed OOS', 'Invalidated', 'Pending')),
  reject_lot              boolean NOT NULL DEFAULT false,
  impact_assessment       text,
  containment_actions     text,
  affected_product        text,
  assigned_to             text,
  due_date                timestamptz,
  created_date            timestamptz NOT NULL,
  created_by_id           uuid REFERENCES profiles(id),
  organization_id         uuid REFERENCES organizations(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE non_conformances IS 'Non-Conformance Reports including OOS/OOT (ISO 13485 §8.3)';
COMMENT ON COLUMN non_conformances.is_oos_oot IS 'Whether this NCR is an Out-of-Specification or Out-of-Trend result';
COMMENT ON COLUMN non_conformances.supplier_id IS 'FK to suppliers table — added after suppliers table creation';


-- ============================================================================
-- TABLE 11: deviations
-- ============================================================================

CREATE TABLE deviations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_number                  text NOT NULL,
  title                       text NOT NULL,
  type                        deviation_type NOT NULL,
  status                      deviation_status NOT NULL DEFAULT 'Open',
  template_id                 uuid REFERENCES form_templates(id),
  template_version            text,
  severity                    deviation_severity NOT NULL,
  category                    deviation_category NOT NULL,
  description                 text NOT NULL,
  deviation_details           text NOT NULL,
  justification               text,
  risk_assessment             text,
  corrective_action           text,
  preventive_action           text,
  sop_reference               text,
  expected_result             text,
  actual_result               text,
  product_stage               deviation_product_stage,
  quarantine                  boolean DEFAULT false,
  impact_on_validated_state   text,
  impact_on_regulatory_filing text,
  containment_action          text,
  detected_date               timestamptz,
  is_planned_deviation        boolean DEFAULT false,
  lot_number                  text,
  product_code                text,
  quantity_affected           integer,
  linked_capa_id              uuid REFERENCES capas(id),
  linked_document_id          uuid REFERENCES documents(id),
  assigned_to                 text NOT NULL,
  due_date                    timestamptz NOT NULL,
  closed_date                 timestamptz,
  created_by_id               uuid REFERENCES profiles(id),
  organization_id             uuid REFERENCES organizations(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE deviations IS 'Deviation records — Planned and Unplanned deviations (ISO 13485 §8.3)';


-- ============================================================================
-- TABLE 12: change_controls
-- ============================================================================

CREATE TABLE change_controls (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cc_number                       text NOT NULL,
  title                           text NOT NULL,
  type                            cc_type NOT NULL,
  status                          cc_status NOT NULL DEFAULT 'Requested',
  template_id                     uuid REFERENCES form_templates(id),
  template_version                text,
  priority                        cc_priority NOT NULL,
  category                        cc_category NOT NULL,
  description                     text NOT NULL,
  justification                   text NOT NULL,
  proposed_change                 text NOT NULL,
  detailed_change_description     text,
  business_compliance_justification text,
  risk_assessment                 text,
  impact_analysis                 text,
  affected_areas                  text,
  impact_on_validated_systems     boolean DEFAULT false,
  implementation_plan             text,
  implementation_date             timestamptz,
  estimated_cost_impact           text,
  completion_date                 timestamptz,
  regulatory_trigger              text,
  emergency_flag                  boolean DEFAULT false,
  linked_document_id              uuid REFERENCES documents(id),
  linked_capa_id                  uuid REFERENCES capas(id),
  additional_references           text,
  assigned_to                     text NOT NULL,
  requested_by                    text NOT NULL,
  approved_by                     text,
  approver                        text,
  due_date                        timestamptz NOT NULL,
  created_by_id                   uuid REFERENCES profiles(id),
  organization_id                 uuid REFERENCES organizations(id),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE change_controls IS 'Change Control records (ISO 13485 §7.3.9 / §8.5.1)';


-- ============================================================================
-- TABLE 13: audits
-- ============================================================================

CREATE TABLE audits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number      text NOT NULL,
  title             text NOT NULL,
  type              audit_type NOT NULL,
  status            audit_status NOT NULL DEFAULT 'Planned',
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  scope             text,
  scheduled_date    timestamptz NOT NULL,
  completed_date    timestamptz,
  lead_auditor      text NOT NULL,
  auditees          jsonb DEFAULT '[]',
  findings          jsonb DEFAULT '[]',
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audits IS 'Audit records — Internal, External, Supplier audits (ISO 13485 §8.2.4)';
COMMENT ON COLUMN audits.findings IS 'JSON array of AuditFinding objects {id, description, severity, referenceClause, correctiveActionRequired, capaId}';


-- ============================================================================
-- TABLE 14: training
-- ============================================================================

CREATE TABLE training (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  type              training_type NOT NULL,
  status            training_status NOT NULL DEFAULT 'Planned',
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  assigned_to       text NOT NULL,
  due_date          timestamptz NOT NULL,
  completed_date    timestamptz,
  document_id       uuid REFERENCES documents(id),
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE training IS 'Training records — SOP/Regulatory/Skill/Certification (ISO 13485 §6.2)';


-- ============================================================================
-- TABLE 15: risks
-- ============================================================================

CREATE TABLE risks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_number       text NOT NULL,
  title             text NOT NULL,
  category          risk_category,
  probability       smallint NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact            smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  detectability     smallint NOT NULL CHECK (detectability BETWEEN 1 AND 5),
  rpn               integer NOT NULL,
  risk_level        risk_level NOT NULL,
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  mitigation        text,
  residual_risk     text,
  status            risk_status NOT NULL DEFAULT 'Open',
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE risks IS 'Risk analysis records — FMEA/RPN methodology (ISO 14971 / ISO 13485 §7.1)';
COMMENT ON COLUMN risks.rpn IS 'Risk Priority Number = probability * impact * detectability';


-- ============================================================================
-- TABLE 16: batch_records
-- ============================================================================

CREATE TABLE batch_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number          text NOT NULL,
  product_name        text NOT NULL,
  product_code        text,
  batch_size          integer,
  batch_size_unit     text,
  master_formula_id   text,
  sop_reference       text,
  manufacturing_date  timestamptz NOT NULL,
  expiry_date         timestamptz,
  status              batch_status NOT NULL DEFAULT 'In Progress',
  is_locked           boolean NOT NULL DEFAULT false,
  template_id         uuid REFERENCES form_templates(id),
  template_version    text,
  qa_release_date     timestamptz,
  qa_released_by_id   uuid REFERENCES profiles(id),
  organization_id     uuid REFERENCES organizations(id),
  created_by_id       uuid REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  steps               jsonb DEFAULT '[]',
  raw_materials       jsonb DEFAULT '[]'
);

COMMENT ON TABLE batch_records IS 'Batch/Production records (ISO 13485 §7.5.1)';
COMMENT ON COLUMN batch_records.steps IS 'JSON array of BatchStep objects';
COMMENT ON COLUMN batch_records.raw_materials IS 'JSON array of RawMaterial objects';


-- ============================================================================
-- TABLE 17: suppliers
-- ============================================================================

CREATE TABLE suppliers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code           text NOT NULL,
  name                    text NOT NULL,
  category                supplier_category,
  status                  supplier_status NOT NULL DEFAULT 'Under Evaluation',
  template_id             uuid REFERENCES form_templates(id),
  template_version        text,
  qualification_date      timestamptz,
  next_review_date        timestamptz,
  certifications          jsonb DEFAULT '[]',
  performance_score       numeric(3,1) CHECK (performance_score BETWEEN 0 AND 100),
  qualification_doc_id    uuid REFERENCES documents(id),
  website                 text,
  primary_contact_name    text,
  primary_contact_email   text,
  primary_contact_phone   text,
  street                  text,
  city                    text,
  state_province          text,
  postal_code             text,
  country                 text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  qualification_method    qualification_method,
  qualification_doc_ref   text,
  organization_id         uuid REFERENCES organizations(id),
  created_by_id           uuid REFERENCES profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS 'Supplier qualification records (ISO 13485 §7.4.1)';


-- ============================================================================
-- TABLE 18: audit_trails
-- ============================================================================

CREATE TABLE audit_trails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action          audit_action NOT NULL,
  table_name      text NOT NULL,
  record_id       uuid,
  user_id         uuid REFERENCES profiles(id),
  user_email      text,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  organization_id uuid REFERENCES organizations(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_trails IS 'Immutable audit trail — 21 CFR Part 11 compliant (ISO 13485 §4.2.4)';


-- ============================================================================
-- CIRCULAR FOREIGN KEY CONSTRAINTS (added after all tables exist)
-- ============================================================================

-- CAPA → Non-Conformance
ALTER TABLE capas
  ADD CONSTRAINT fk_capas_linked_ncr
  FOREIGN KEY (linked_ncr_id) REFERENCES non_conformances(id);

-- CAPA → Audit
ALTER TABLE capas
  ADD CONSTRAINT fk_capas_linked_audit
  FOREIGN KEY (linked_audit_id) REFERENCES audits(id);

-- Non-Conformance → Supplier
ALTER TABLE non_conformances
  ADD CONSTRAINT fk_ncr_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);


-- ============================================================================
-- INDEXES — Performance optimization for common queries
-- ============================================================================

-- Organization scoping (most queries filter by organization_id)
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_capas_org ON capas(organization_id);
CREATE INDEX idx_non_conformances_org ON non_conformances(organization_id);
CREATE INDEX idx_deviations_org ON deviations(organization_id);
CREATE INDEX idx_change_controls_org ON change_controls(organization_id);
CREATE INDEX idx_audits_org ON audits(organization_id);
CREATE INDEX idx_training_org ON training(organization_id);
CREATE INDEX idx_risks_org ON risks(organization_id);
CREATE INDEX idx_batch_records_org ON batch_records(organization_id);
CREATE INDEX idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX idx_form_templates_org ON form_templates(organization_id);
CREATE INDEX idx_form_instances_org ON form_instances(organization_id);
CREATE INDEX idx_audit_trails_org ON audit_trails(organization_id);
CREATE INDEX idx_electronic_signatures_org ON electronic_signatures(organization_id);
CREATE INDEX idx_document_prerequisites_org ON document_prerequisites(organization_id);

-- Status filters (most list views filter by status)
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_capas_status ON capas(status);
CREATE INDEX idx_non_conformances_status ON non_conformances(status);
CREATE INDEX idx_deviations_status ON deviations(status);
CREATE INDEX idx_change_controls_status ON change_controls(status);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_training_status ON training(status);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_batch_records_status ON batch_records(status);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_form_templates_status ON form_templates(status);
CREATE INDEX idx_form_instances_status ON form_instances(status);

-- Template connection (Layer 1 → Layer 2 bridge)
CREATE INDEX idx_form_instances_template ON form_instances(template_id);
CREATE INDEX idx_capas_template ON capas(template_id);
CREATE INDEX idx_non_conformances_template ON non_conformances(template_id);
CREATE INDEX idx_deviations_template ON deviations(template_id);
CREATE INDEX idx_change_controls_template ON change_controls(template_id);
CREATE INDEX idx_audits_template ON audits(template_id);
CREATE INDEX idx_training_template ON training(template_id);
CREATE INDEX idx_risks_template ON risks(risk_level);
CREATE INDEX idx_batch_records_template ON batch_records(template_id);
CREATE INDEX idx_suppliers_template ON suppliers(template_id);

-- Template module type (filtering templates by QMS module)
CREATE INDEX idx_form_templates_module_type ON form_templates(module_type);

-- Document hierarchy
CREATE INDEX idx_documents_parent ON documents(parent_document_id);
CREATE INDEX idx_documents_level ON documents(document_level);

-- Number-based search (capa_number, ncr_number, etc.)
CREATE INDEX idx_capas_number ON capas(capa_number);
CREATE INDEX idx_non_conformances_number ON non_conformances(ncr_number);
CREATE INDEX idx_deviations_number ON deviations(dev_number);
CREATE INDEX idx_change_controls_number ON change_controls(cc_number);
CREATE INDEX idx_audits_number ON audits(audit_number);
CREATE INDEX idx_risks_number ON risks(risk_number);
CREATE INDEX idx_batch_records_lot ON batch_records(lot_number);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);

-- Audit trail queries (time-range + table filters)
CREATE INDEX idx_audit_trails_action ON audit_trails(action);
CREATE INDEX idx_audit_trails_table ON audit_trails(table_name);
CREATE INDEX idx_audit_trails_created ON audit_trails(created_at);
CREATE INDEX idx_audit_trails_user ON audit_trails(user_id);

-- Due date tracking (overdue monitoring)
CREATE INDEX idx_capas_due_date ON capas(due_date);
CREATE INDEX idx_training_due_date ON training(due_date);
CREATE INDEX idx_change_controls_due_date ON change_controls(due_date);

-- Electronic signature lookups
CREATE INDEX idx_electronic_signatures_document ON electronic_signatures(document_id);
CREATE INDEX idx_electronic_signatures_user ON electronic_signatures(signed_by_id);

-- Profiles
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Form instance linked records
CREATE INDEX idx_form_instances_linked_record ON form_instances(linked_record_id);
CREATE INDEX idx_form_instances_linked_type ON form_instances(linked_record_type);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Multi-tenant isolation
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE training ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see data from their own organization
-- (Service role bypasses RLS for admin operations)

-- Organizations: members can read their own org
CREATE POLICY org_read ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY org_member_insert ON organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = invited_by);

CREATE POLICY org_member_read ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Profiles: users can read their own profile
CREATE POLICY profiles_read ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Generic org-scoped read policy (applied to all org-scoped tables)
-- Helper function to check org membership
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply org-scoped read policies
CREATE POLICY documents_read ON documents FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY capas_read ON capas FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY ncr_read ON non_conformances FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY deviations_read ON deviations FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY change_controls_read ON change_controls FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY audits_read ON audits FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY training_read ON training FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY risks_read ON risks FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY batch_records_read ON batch_records FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY suppliers_read ON suppliers FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY form_templates_read ON form_templates FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY form_instances_read ON form_instances FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY audit_trails_read ON audit_trails FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY electronic_signatures_read ON electronic_signatures FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY document_prerequisites_read ON document_prerequisites FOR SELECT USING (is_org_member(organization_id));

-- Apply org-scoped write policies (insert/update/delete)
CREATE POLICY documents_write ON documents FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY capas_write ON capas FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY ncr_write ON non_conformances FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY deviations_write ON deviations FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY change_controls_write ON change_controls FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY audits_write ON audits FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY training_write ON training FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY risks_write ON risks FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY batch_records_write ON batch_records FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY suppliers_write ON suppliers FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY form_templates_write ON form_templates FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY form_instances_write ON form_instances FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY electronic_signatures_write ON electronic_signatures FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY document_prerequisites_write ON document_prerequisites FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));


-- ============================================================================
-- TRIGGERS — Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON form_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_form_instances_updated BEFORE UPDATE ON form_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_capas_updated BEFORE UPDATE ON capas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_non_conformances_updated BEFORE UPDATE ON non_conformances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_deviations_updated BEFORE UPDATE ON deviations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_change_controls_updated BEFORE UPDATE ON change_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_audits_updated BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_training_updated BEFORE UPDATE ON training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TRIGGER — Audit trail auto-logging for critical tables
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_org_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
    v_org_id := COALESCE(NEW.organization_id);
    INSERT INTO audit_trails (action, table_name, record_id, new_values, organization_id)
    VALUES (v_action, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_org_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_org_id := COALESCE(NEW.organization_id);
    INSERT INTO audit_trails (action, table_name, record_id, old_values, new_values, organization_id)
    VALUES (v_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_org_id);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_org_id := COALESCE(OLD.organization_id);
    INSERT INTO audit_trails (action, table_name, record_id, old_values, organization_id)
    VALUES (v_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_org_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trail triggers to all QMS record tables
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_capas AFTER INSERT OR UPDATE OR DELETE ON capas FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_non_conformances AFTER INSERT OR UPDATE OR DELETE ON non_conformances FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_deviations AFTER INSERT OR UPDATE OR DELETE ON deviations FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_change_controls AFTER INSERT OR UPDATE OR DELETE ON change_controls FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_audits AFTER INSERT OR UPDATE OR DELETE ON audits FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_training AFTER INSERT OR UPDATE OR DELETE ON training FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_risks AFTER INSERT OR UPDATE OR DELETE ON risks FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_batch_records AFTER INSERT OR UPDATE OR DELETE ON batch_records FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_form_templates AFTER INSERT OR UPDATE OR DELETE ON form_templates FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER trg_audit_form_instances AFTER INSERT OR UPDATE OR DELETE ON form_instances FOR EACH ROW EXECUTE FUNCTION log_audit_trail();


COMMIT;

-- ============================================================================
-- END OF MIGRATION 001_initial_schema.sql
-- ============================================================================
-- Tables created: 18
--   Core:       organizations, profiles, organization_members
--   Documents:  documents, electronic_signatures, document_prerequisites
--   Layer 1:    form_templates
--   Layer 2:    form_instances
--   Records:    capas, non_conformances, deviations, change_controls,
--               audits, training, risks, batch_records, suppliers
--   Audit:      audit_trails
--
-- FK circular deps resolved: capas↔non_conformances, capas↔audits,
--                             non_conformances↔suppliers
--
-- Indexes:     55+ indexes for query performance
-- RLS:         18 tables with org-scoped policies
-- Triggers:    12 updated_at + 12 audit_trail auto-loggers
-- ============================================================================
