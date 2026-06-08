-- ============================================================================
-- P0 Migration: Document Hierarchy, Triggers & Department Taxonomy
-- Target: Supabase (PostgreSQL)
-- Application: SMQ ISO 13485 Pro
-- ============================================================================
-- This migration adds the structured document hierarchy, trigger system,
-- and department taxonomy required by the Qwen specification (369 documents,
-- 4-level hierarchy, 13 document types, 91 departments).
--
-- Principle: The system provides TOOLS for users to create/manage documents;
-- it does NOT pre-populate them.
-- ============================================================================

-- ============================================================================
-- 1. Departments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_code TEXT REFERENCES departments(code),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_departments_code ON departments(code);
CREATE INDEX idx_departments_category ON departments(category);
CREATE INDEX idx_departments_organization ON departments(organization_id);

-- ============================================================================
-- 2. Extend Documents Table — add Qwen-aligned columns
-- ============================================================================

-- Document code (structured code like MQ-001, PR-4.2.4)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS iso_clause TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS triggers TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS child_codes TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_prerequisite BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_cycle_months INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS department_code TEXT REFERENCES departments(code);

-- Add unique constraint on code within an organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_code_org 
  ON documents(code, organization_id) WHERE code IS NOT NULL;

-- Add document level if not exists
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_level SMALLINT CHECK (document_level BETWEEN 1 AND 4);

-- Add status enum update — need to alter the check constraint
-- New statuses: Draft, Under Review, Approved, Effective, Obsolete, Withdrawn
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn'));

-- Add document type constraint update for new French types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check 
  CHECK (type IN (
    'MANUEL', 'POLITIQUE', 'INDICATEUR', 'PROCESS_MAP', 'ORGANIGRAMME',
    'REGLEMENTAIRE', 'MAPPING',
    'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT', 'MASTER_BATCH',
    'SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical',
    'Risk Analysis', 'Validation Protocol', 'Record', 'Manual', 'Instruction',
    'Register', 'Master Batch', 'Procedure', 'Process Map', 'Organigram'
  ));

-- ============================================================================
-- 3. Document Triggers (Déclencheurs) Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'prerequisite'
    CHECK (trigger_type IN ('prerequisite', 'references', 'activates', 'output', 'escalation')),
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT no_self_trigger CHECK (source_document_id != target_document_id),
  CONSTRAINT unique_trigger_pair UNIQUE (source_document_id, target_document_id, trigger_type)
);

CREATE INDEX idx_triggers_source ON document_triggers(source_document_id);
CREATE INDEX idx_triggers_target ON document_triggers(target_document_id);
CREATE INDEX idx_triggers_type ON document_triggers(trigger_type);
CREATE INDEX idx_triggers_organization ON document_triggers(organization_id);

-- ============================================================================
-- 4. Document Relationships (general parent/child)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  child_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'parent_child'
    CHECK (relationship_type IN ('parent_child', 'references', 'supersedes', 'obsoletes', 'amends')),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT no_self_relationship CHECK (parent_document_id != child_document_id),
  CONSTRAINT unique_relationship UNIQUE (parent_document_id, child_document_id, relationship_type)
);

CREATE INDEX idx_relationships_parent ON document_relationships(parent_document_id);
CREATE INDEX idx_relationships_child ON document_relationships(child_document_id);

-- ============================================================================
-- 5. Document Code Sequence Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL,
  department_suffix TEXT NOT NULL DEFAULT '',
  last_sequence INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  
  CONSTRAINT unique_code_sequence UNIQUE (prefix, department_suffix, organization_id)
);

-- ============================================================================
-- 6. Audit trigger for document_triggers table
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_document_triggers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (action, table_name, record_id, new_values, organization_id)
    VALUES ('CREATE', 'document_triggers', NEW.id::text, to_jsonb(NEW), NEW.organization_id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (action, table_name, record_id, old_values, new_values, organization_id)
    VALUES ('UPDATE', 'document_triggers', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), NEW.organization_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (action, table_name, record_id, old_values, organization_id)
    VALUES ('DELETE', 'document_triggers', OLD.id::text, to_jsonb(OLD), OLD.organization_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS document_triggers_audit ON document_triggers;
CREATE TRIGGER document_triggers_audit
  AFTER INSERT OR UPDATE OR DELETE ON document_triggers
  FOR EACH ROW EXECUTE FUNCTION audit_document_triggers();

-- ============================================================================
-- 7. RLS Policies (Row-Level Security)
-- ============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_code_sequences ENABLE ROW LEVEL SECURITY;

-- Organization-scoped access
CREATE POLICY departments_org_access ON departments
  USING (organization_id IS NULL OR organization_id = auth.jwt()->>'org_id');

CREATE POLICY triggers_org_access ON document_triggers
  USING (organization_id IS NULL OR organization_id = auth.jwt()->>'org_id');

CREATE POLICY relationships_org_access ON document_relationships
  USING (organization_id IS NULL OR organization_id = auth.jwt()->>'org_id');

CREATE POLICY code_sequences_org_access ON document_code_sequences
  USING (organization_id IS NULL OR organization_id = auth.jwt()->>'org_id');

-- ============================================================================
-- 8. Views for common queries
-- ============================================================================

-- Document hierarchy with level labels
CREATE OR REPLACE VIEW document_hierarchy AS
SELECT 
  d.id,
  d.code,
  d.title,
  d.type,
  d.status,
  d.document_level,
  d.department_code,
  dep.label_fr AS department_label_fr,
  dep.label_en AS department_label_en,
  d.parent_document_id,
  parent.code AS parent_code,
  parent.title AS parent_title,
  d.triggers,
  d.child_codes,
  d.iso_clause,
  CASE d.document_level
    WHEN 1 THEN 'Stratégique'
    WHEN 2 THEN 'Transversal'
    WHEN 3 THEN 'Métier / Technique'
    WHEN 4 THEN 'Enregistrement / Formulaire'
  END AS level_label_fr,
  CASE d.document_level
    WHEN 1 THEN 'Strategic'
    WHEN 2 THEN 'Cross-Functional'
    WHEN 3 THEN 'Operational / Technical'
    WHEN 4 THEN 'Record / Form'
  END AS level_label_en,
  d.created_at,
  d.updated_at
FROM documents d
LEFT JOIN departments dep ON d.department_code = dep.code
LEFT JOIN documents parent ON d.parent_document_id = parent.id
WHERE d.organization_id = auth.jwt()->>'org_id'
   OR d.organization_id IS NULL;

-- Document trigger graph
CREATE OR REPLACE VIEW document_trigger_graph AS
SELECT 
  t.id,
  s.code AS source_code,
  s.title AS source_title,
  tgt.code AS target_code,
  tgt.title AS target_title,
  t.trigger_type,
  t.is_mandatory,
  t.description
FROM document_triggers t
JOIN documents s ON t.source_document_id = s.id
JOIN documents tgt ON t.target_document_id = tgt.id;
