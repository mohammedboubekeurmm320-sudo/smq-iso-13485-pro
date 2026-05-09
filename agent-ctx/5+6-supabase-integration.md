# Task 5+6: Supabase Integration - Service Layer & Dual-Mode Routes

## Agent: Full Stack Developer (Task 5+6)

## Summary

Created a complete Supabase service layer and updated all API routes to support dual-mode (demo/Supabase) operation.

## Files Created

### Supabase Client Files (Part of setup, co-created with another agent)
- `src/lib/supabase/server.ts` — Server-side Supabase client using cookies
- `src/lib/supabase/admin.ts` — Admin client using service role key (bypasses RLS)
- `src/lib/supabase/browser.ts` — Browser-side Supabase client

### Mode Detection
- `src/lib/supabase/mode.ts` — `isSupabaseConfigured()` and `getDataSource()` helpers

### Service Layer (14 services)
- `src/lib/supabase/services/base-service.ts` — Base class with shared CRUD patterns, auth helpers, org-scoping, audit trail logging
- `src/lib/supabase/services/document-service.ts`
- `src/lib/supabase/services/capa-service.ts`
- `src/lib/supabase/services/ncr-service.ts`
- `src/lib/supabase/services/audit-service.ts`
- `src/lib/supabase/services/training-service.ts`
- `src/lib/supabase/services/risk-service.ts`
- `src/lib/supabase/services/batch-record-service.ts`
- `src/lib/supabase/services/supplier-service.ts`
- `src/lib/supabase/services/form-service.ts` (templates + instances)
- `src/lib/supabase/services/change-control-service.ts`
- `src/lib/supabase/services/deviation-service.ts`
- `src/lib/supabase/services/audit-trail-service.ts` (read-only, querying)
- `src/lib/supabase/services/profile-service.ts`
- `src/lib/supabase/services/organization-service.ts`
- `src/lib/supabase/services/index.ts` — Re-exports all services

## Files Modified (Dual-Mode API Routes)

### Entity CRUD Routes
- `src/app/api/documents/route.ts` — GET (list), POST (create)
- `src/app/api/documents/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/capas/route.ts`
- `src/app/api/capas/[id]/route.ts`
- `src/app/api/ncrs/route.ts`
- `src/app/api/ncrs/[id]/route.ts`
- `src/app/api/audits/route.ts`
- `src/app/api/audits/[id]/route.ts`
- `src/app/api/training/route.ts`
- `src/app/api/training/[id]/route.ts`
- `src/app/api/risks/route.ts`
- `src/app/api/risks/[id]/route.ts`
- `src/app/api/batch-records/route.ts`
- `src/app/api/batch-records/[id]/route.ts`
- `src/app/api/suppliers/route.ts`
- `src/app/api/suppliers/[id]/route.ts`
- `src/app/api/forms/templates/route.ts`
- `src/app/api/forms/instances/route.ts`
- `src/app/api/change-controls/route.ts`
- `src/app/api/change-controls/[id]/route.ts`
- `src/app/api/deviations/route.ts`
- `src/app/api/deviations/[id]/route.ts`

### Read-Only Routes
- `src/app/api/audit-trail/route.ts`
- `src/app/api/organizations/route.ts`
- `src/app/api/profiles/route.ts`

### Export Routes
- `src/app/api/export/audit-trail/route.ts`
- `src/app/api/export/[entity]/route.ts`
- `src/app/api/export/management-review/route.ts`

## Architecture

### Dual-Mode Pattern
Every API route follows this pattern:
1. Check `isSupabaseConfigured()` at the top
2. If Supabase is configured → use service layer (Supabase queries)
3. If not configured → fall back to existing DemoStore (in-memory)

### Service Layer Design
- `BaseService` provides shared methods: `getClient()`, `getAdminClient()`, `getAuthenticatedUserId()`, `getOrgId()`, `logAudit()`
- Each entity service extends `BaseService` and provides: `list()`, `getById()`, `create()`, `update()`, `delete()`
- List operations support pagination, filtering, and org-scoping
- Create/Update/Delete operations automatically log audit trails
- Delete operations use soft-delete (status change) where applicable

### Supabase Table Names (snake_case)
- `documents`, `capas`, `non_conformances`, `audits`, `training`
- `risks`, `batch_records`, `suppliers`, `form_templates`, `form_instances`
- `change_controls`, `deviations`, `audit_trails`, `profiles`, `organizations`

## Lint Status
✅ All files pass `bun run lint` with no errors
