# Task 8 - Supabase Migration Files

## Agent: Database Migration Specialist
## Task ID: 8
## Status: COMPLETED

## Summary

Created complete Supabase SQL migration files for the QMS SaaS Pro project with multi-tenant RLS policies and seed data.

## Files Created

### 1. `supabase/migrations/20240101000000_initial_schema.sql` (581 lines)
- **19 tables** matching the Prisma schema:
  - `profiles`, `organizations`, `organization_members`
  - `documents`, `electronic_signatures`, `document_prerequisites`
  - `capas`, `non_conformances`
  - `batch_records`, `batch_steps`
  - `suppliers`, `form_templates`, `form_instances`
  - `audit_trails`, `audits`, `training`, `risks`
  - `change_controls`, `deviations`
- UUID primary keys with `uuid_generate_v4()` (except `profiles` which references `auth.users(id)`)
- JSONB columns for: `settings`, `five_whys`, `certifications`, `fields`, `values`, `findings`, `auditees`, `old_values`, `new_values`, `type_specific_data`
- 68 indexes on commonly queried columns (organization_id, status, type, etc.)
- `updated_at` auto-update triggers on 10 tables
- Helper function `update_updated_at_column()`

### 2. `supabase/migrations/20240101000001_rls_policies.sql` (541 lines)
- RLS enabled on all 19 tables
- **4 helper functions**:
  - `is_org_member(org_id)` - check org membership
  - `get_org_role(org_id)` - get user's role in org
  - `is_org_admin(org_id)` - check admin-level access
  - `can_modify_records(org_id)` - check modify access (owner/admin/quality_manager)
- **70 RLS policies** covering SELECT/INSERT/UPDATE/DELETE for all tables
- Access levels:
  - SELECT: Any active org member
  - INSERT: Any active org member
  - UPDATE: Any active org member
  - DELETE: Only owner, admin, or quality_manager roles
- Special cases:
  - Profiles: Users can only update their own profile
  - Organizations: Only admins can update
  - Organization Members: Only admins can manage
  - Audit Trails: Read-only for users; insert via service role; no update/delete
  - Electronic Signatures: Revocation restricted to admin/QM roles
  - Batch Steps: Access derived from parent batch_record's org

### 3. `supabase/migrations/20240101000002_seed_data.sql` (363 lines)
- **18 INSERT statements** with multi-row values
- Seed data matching `src/lib/mock-data.ts`:
  - 1 organization (PharmaQMS Demo)
  - 6 profiles (admin, QM, auditor, doc controller, executive, operator)
  - 6 organization members
  - 10 documents (SOPs, WIs, policies, specs, validations)
  - 5 CAPAs
  - 4 NCRs (including OOS)
  - 3 batch records with 6 batch steps
  - 4 suppliers
  - 2 form templates with 2 form instances
  - 3 audits (with findings JSONB)
  - 5 training items
  - 4 risks (with RPN calculations)
  - 4 change controls
  - 3 deviations
  - 5 document prerequisites
  - 10 audit trail entries
- Hardcoded UUIDs for cross-table referential integrity

### 4. `supabase/README.md`
- Instructions for applying migrations via:
  - Supabase CLI (`supabase db push`)
  - Supabase Dashboard (SQL Editor)
  - Direct psql connection
- Environment variable documentation
- UUID mapping reference table
- Column name mapping notes (camelCase → snake_case)
- Database reset instructions

## Column Mapping Applied

All camelCase column names from Prisma/TypeScript were converted to snake_case for PostgreSQL:
- `documentNumber` → `document_number`
- `organizationId` → `organization_id`
- `createdById` → `created_by_id`
- `fiveWhys` → `five_whys`
- And 100+ more mappings

## SQL Validation

- All files have balanced parentheses (verified programmatically)
- All 19 tables created with proper foreign key references
- All 19 tables have RLS enabled with appropriate policies
- Seed data uses consistent UUID references across all tables
