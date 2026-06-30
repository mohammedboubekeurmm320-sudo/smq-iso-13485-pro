-- ============================================================================
-- SMQ ISO 13485 PRO - Production Seeding Script
-- ============================================================================
-- Corrective action per Security Re-Audit #REAUDIT-2026-0627
-- Recommendation: Create initial Auth accounts for production launch
--
-- WHAT THIS SCRIPT DOES:
--   1. Creates the first production organization with ISO 13485 settings
--   2. Creates 6 Auth users (admin, quality_manager, auditor, document_controller,
--      executive, operator)
--   3. Creates profiles linked to auth.users
--   4. Creates organization_members for org access
--   5. Seeds 13 system record_type_definitions
--   6. Seeds document_prerequisites (ISO 13485 section 4.2.3)
--   7. Seeds initial departments
--   8. Verifies all data integrity
--
-- PREREQUISITES:
--   - Migrations 001, 002, 003 must be applied first
--   - Execute in Supabase SQL Editor with service_role key
--
-- SECURITY WARNING:
--   The emails and passwords below are PLACEHOLDERS.
--   You MUST change them before running in production.
--   After first login, enforce password change via:
--   Supabase Dashboard -> Authentication -> Settings
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE THE PRODUCTION ORGANIZATION
-- ============================================================================

INSERT INTO organizations (name, slug, subscription_status, settings)
VALUES (
  'QMS Production',
  'qms-production',
  'active',
  '{"setup_completed": true, "industry_type": "medical_device", "applicable_standards": ["ISO 13485:2016", "ISO 14971:2019", "FDA 21 CFR Part 11", "FDA 21 CFR 820"], "active_modules": ["documents", "capa", "ncr", "audits", "training", "reports", "compliance", "risks", "hierarchy", "batch_records", "suppliers", "forms", "change_control", "deviations", "oos_oot"], "company_name": "QMS Production", "require_electronic_signatures": true, "require_prerequisite_docs": true, "audit_trail_enabled": true, "notification_settings": {"capa_overdue": true, "ncr_overdue": true, "document_expiry": true, "training_overdue": true, "audit_due": true}}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 2: CREATE AUTH USERS (auth.users)
-- ============================================================================

-- Notes:
--   - instance_id: REPLACE '00000000-...' with your Supabase project UUID
--   - encrypted_password uses bcrypt via crypt()
--   - email_confirmed_at = now() skips email verification for initial setup
--   - Replace ALL emails and passwords before running

-- [1/6] admin: Administrateur Systeme
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Administrateur Systeme", "role": "admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- [2/6] quality_manager: Responsable Qualite
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'responsable-qualite@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Responsable Qualite", "role": "quality_manager"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- [3/6] auditor: Auditeur Interne
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'auditeur@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Auditeur Interne", "role": "auditor"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- [4/6] document_controller: Controleur Documents
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'controleur-docs@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Controleur Documents", "role": "document_controller"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- [5/6] executive: Approbateur Executive
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'approbateur@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Approbateur Executive", "role": "executive"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- [6/6] operator: Operateur Production
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, last_sign_in_at, invited_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'operateur@votre-entreprise.com',
  crypt('Ch@ngerM0i!2026', gen_salt('bf')),
  now(),
  '{"full_name": "Operateur Production", "role": "operator"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  NULL,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SECTION 3: CREATE PROFILES (linked to auth.users)
-- ============================================================================

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Administrateur Systeme', 'admin', 'Quality Assurance', 'QA Director', '+33 1 00 00 00 01', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'admin@votre-entreprise.com';

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Responsable Qualite', 'quality_manager', 'Quality Assurance', 'Quality Manager', '+33 1 00 00 00 02', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'responsable-qualite@votre-entreprise.com';

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Auditeur Interne', 'auditor', 'Internal Audit', 'Lead Auditor', '+33 1 00 00 00 03', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'auditeur@votre-entreprise.com';

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Controleur Documents', 'document_controller', 'Document Control', 'Document Control Specialist', '+33 1 00 00 00 04', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'controleur-docs@votre-entreprise.com';

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Approbateur Executive', 'executive', 'Executive', 'VP Quality', '+33 1 00 00 00 05', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'approbateur@votre-entreprise.com';

INSERT INTO profiles (id, email, full_name, role, department, job_title, phone, organization_id)
SELECT u.id, u.email, 'Operateur Production', 'operator', 'Production', 'Manufacturing Operator', '+33 1 00 00 00 06', o.id
FROM auth.users u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'qms-production') o
WHERE u.email = 'operateur@votre-entreprise.com';

-- ============================================================================
-- SECTION 4: CREATE ORGANIZATION MEMBERSHIPS
-- ============================================================================

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'owner', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'admin@votre-entreprise.com';

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'admin', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'responsable-qualite@votre-entreprise.com';

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'member', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'auditeur@votre-entreprise.com';

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'member', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'controleur-docs@votre-entreprise.com';

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'admin', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'approbateur@votre-entreprise.com';

INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT o.id, p.id, 'member', 'active', NULL
FROM organizations o
CROSS JOIN profiles p
WHERE o.slug = 'qms-production' AND p.email = 'operateur@votre-entreprise.com';

-- ============================================================================
-- SECTION 5: SEED SYSTEM RECORD TYPE DEFINITIONS (13 modules)
-- ============================================================================

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('capa', 'CAPA', 'CAPA', 'ShieldCheck', 'Corrective and Preventive Actions', '{"linear":["Open","Investigation","Implementation","Effectiveness Check","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}'::jsonb, 'CAPA', true, true, true, 1, '[{"clause":"8.5.2","standard":"ISO 13485","description":"Corrective action"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('ncr', 'Non-Conformite', 'Non-Conformance', 'AlertTriangle', 'Non-Conformance Reports', '{"linear":["Open","Under Investigation","Pending Disposition","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}'::jsonb, 'NCR', true, true, true, 1, '[{"clause":"8.3","standard":"ISO 13485","description":"Control of nonconforming product"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('deviation', 'Deviation', 'Deviation', 'GitBranch', 'Deviations', '{"linear":["Open","Under Investigation","Pending QA Review","Approved","Closed"],"eSigRequired":["Approved","Closed"],"terminal":["Closed"]}'::jsonb, 'DEV', true, true, true, 1, '[{"clause":"7.1","standard":"ISO 13485","description":"Planning of product realization"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('change_control', 'Maitrise des Changements', 'Change Control', 'RefreshCw', 'Change Control', '{"linear":["Requested","Under Review","Approved","In Implementation","Completed"],"branches":{"Rejected":["Requested"]},"eSigRequired":["Approved","Rejected","Completed"],"terminal":["Completed","Rejected"]}'::jsonb, 'CC', true, true, true, 1, '[{"clause":"7.3.7","standard":"ISO 13485","description":"Design changes"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('audit', 'Audit', 'Audit', 'Search', 'Internal/External/Supplier Audits', '{"linear":["Planned","In Progress","Completed"],"eSigRequired":["Completed"],"terminal":["Completed"]}'::jsonb, 'AUD', true, true, true, 1, '[{"clause":"8.2.4","standard":"ISO 13485","description":"Internal audit"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('risk', 'Risque', 'Risk Management', 'TrendingUp', 'Risk Management', '{"linear":["Open","Mitigated","Closed"],"branches":{"Accepted":["Closed"]},"eSigRequired":["Closed"],"terminal":["Closed"]}'::jsonb, 'RSK', true, true, true, 1, '[{"clause":"7.1","standard":"ISO 13485","description":"Risk management"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('training', 'Formation', 'Training', 'GraduationCap', 'Training Records', '{"linear":["Planned","In Progress","Completed"],"eSigRequired":["Completed"],"terminal":["Completed"]}'::jsonb, 'TRN', true, true, true, 1, '[{"clause":"6.2","standard":"ISO 13485","description":"Competence, awareness and training"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('supplier', 'Fournisseur', 'Supplier', 'Truck', 'Supplier Management', '{"linear":["Under Evaluation","Conditional","Qualified"],"branches":{"Disqualified":[]},"eSigRequired":["Qualified","Disqualified"],"terminal":["Disqualified"]}'::jsonb, 'SUP', true, true, true, 1, '[{"clause":"7.4","standard":"ISO 13485","description":"Purchasing"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('batch_record', 'Enregistrement de Lot', 'Batch Record', 'Package', 'Batch Records', '{"linear":["In Progress","Pending QA Review","Released"],"branches":{"Rejected":[],"Quarantine":["Pending QA Review"]},"eSigRequired":["Released","Rejected"],"terminal":["Released","Rejected"]}'::jsonb, 'BR', true, true, true, 1, '[{"clause":"7.5.1","standard":"ISO 13485","description":"Control of production"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('oos_oot', 'HSP/HOT', 'OOS/OOT', 'FlaskConical', 'Out of Specification / Out of Trend', '{"linear":["Open","Under Investigation","Pending Disposition","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}'::jsonb, 'OOS', true, true, true, 1, '[{"clause":"8.2.6","standard":"ISO 13485","description":"Monitoring and measurement of product"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('general', 'General', 'General', 'FileText', 'General purpose records', '{"linear":["Open","Under Review","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}'::jsonb, 'GEN', true, true, true, 1, '[]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('document_review', 'Revue Document', 'Document Review', 'ClipboardCheck', 'Document review and approval workflow', '{"linear":["Draft","Under Review","Approved"],"eSigRequired":["Approved"],"terminal":["Approved"]}'::jsonb, 'DR', true, true, true, 1, '[{"clause":"4.2.3","standard":"ISO 13485","description":"Control of documents"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
VALUES ('equipment', 'Equipement', 'Equipment', 'Wrench', 'Equipment calibration and maintenance', '{"linear":["Active","Under Calibration","Calibrated"],"eSigRequired":["Calibrated"],"terminal":["Calibrated"]}'::jsonb, 'EQ', true, true, true, 1, '[{"clause":"7.6","standard":"ISO 13485","description":"Control of monitoring and measuring equipment"}]'::jsonb, (SELECT id FROM organizations WHERE slug = 'qms-production'))
ON CONFLICT (slug, organization_id) DO NOTHING;

-- ============================================================================
-- SECTION 6: SEED DOCUMENT PREREQUISITES (ISO 13485 section 4.2.3)
-- ============================================================================

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'CAPA', 'SOP', 'SOP-QMS-002', true, 'CAPA Management SOP must be approved before creating CAPA records');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'NCR', 'SOP', 'SOP-QMS-003', true, 'Non-Conformance Management SOP must be approved before creating NCR records');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'AUDIT', 'SOP', 'SOP-QMS-004', true, 'Internal Audit Procedure must be approved before scheduling audits');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'CHANGE_CONTROL', 'SOP', '', true, 'Change Control SOP must be in place');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'DEVIATION', 'SOP', '', false, 'Deviation handling SOP recommended');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'BATCH_RECORD', 'SOP', 'SOP-QMS-005', true, 'Batch Record SOP must be approved before batch record creation');

INSERT INTO document_prerequisites (organization_id, record_type, required_doc_type, required_doc_ref, is_mandatory, description)
VALUES ((SELECT id FROM organizations WHERE slug = 'qms-production'), 'SUPPLIER', 'SOP', 'SOP-QMS-006', true, 'Supplier Qualification SOP must be approved before supplier evaluation');

-- ============================================================================
-- SECTION 7: SEED INITIAL DEPARTMENTS
-- ============================================================================

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('QA', 'Quality Assurance', 'Quality Assurance', 'quality', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('PROD', 'Production', 'Production', 'operations', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('RA', 'Regulatory Affairs', 'Regulatory Affairs', 'compliance', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('RD', 'Recherche et Developpement', 'Research and Development', 'engineering', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('LOG', 'Logistique', 'Logistics', 'operations', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('ACHAT', 'Achats', 'Purchasing', 'supply_chain', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('MAINT', 'Maintenance', 'Maintenance', 'engineering', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO departments (code, name, name_en, category, organization_id)
VALUES ('AUDIT', 'Audit Interne', 'Internal Audit', 'quality', (SELECT id FROM organizations WHERE slug = 'qms-production')) ON CONFLICT (code, organization_id) DO NOTHING;

-- ============================================================================
-- SECTION 8: VERIFICATION QUERIES
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '=== PRODUCTION SEEDING VERIFICATION ===';
  RAISE NOTICE 'Organization: % (%)', (SELECT name FROM organizations WHERE slug = 'qms-production'), (SELECT subscription_status FROM organizations WHERE slug = 'qms-production');
END $$;

DO $$ DECLARE v_count int; BEGIN
  SELECT count(*) INTO v_count FROM profiles p JOIN organization_members om ON om.user_id = p.id JOIN organizations o ON o.id = om.organization_id AND o.slug = 'qms-production';
  RAISE NOTICE 'Profiles with org membership: %', v_count;
END $$;

DO $$ DECLARE v_count int; BEGIN
  SELECT count(*) INTO v_count FROM record_type_definitions WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'qms-production') AND is_system = true;
  RAISE NOTICE 'System record types: %', v_count;
END $$;

DO $$ DECLARE v_count int; BEGIN
  SELECT count(*) INTO v_count FROM document_prerequisites WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'qms-production');
  RAISE NOTICE 'Document prerequisites: %', v_count;
END $$;

DO $$ DECLARE v_count int; BEGIN
  SELECT count(*) INTO v_count FROM departments WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'qms-production');
  RAISE NOTICE 'Departments: %', v_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-SEEDING CHECKLIST (manual steps)
-- ============================================================================
-- [ ] 1. Verify all 6 users can log in with their temporary passwords
-- [ ] 2. Each user MUST change their password on first login
-- [ ] 3. Admin uploads initial SOP documents via the UI
-- [ ] 4. Enable email confirmation for future sign-ups:
--        Supabase Dashboard -> Authentication -> Settings -> Enable Confirm email
-- [ ] 5. Set up email templates for password reset / invitations
-- [ ] 6. Configure 2FA for admin and quality_manager accounts
-- [ ] 7. Verify RLS policies from migration 003 are active:
--        SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- [ ] 8. DELETE or DISABLE this script after first successful run
-- ============================================================================