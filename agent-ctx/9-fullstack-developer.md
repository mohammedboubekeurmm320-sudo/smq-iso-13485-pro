# Task 9: Supabase Integration - React Query Provider & Hooks

## Agent: fullstack-developer
## Status: Completed

## Summary
Implemented React Query (TanStack Query v5) integration for the QMS SaaS Pro application, creating a provider, comprehensive typed hooks for all QMS entities, and a dashboard stats hook.

## Files Created

### 1. `src/providers/QueryProvider.tsx`
- Client component wrapping `QueryClientProvider`
- Configured `QueryClient` with sensible defaults:
  - `staleTime: 30s` — avoids excessive refetching
  - `refetchOnWindowFocus: false` — prevents jarring refetches
  - `retry: 1` — limited retries for failed requests
- Uses `useState` to ensure `QueryClient` is created once per client lifecycle

### 2. `src/hooks/useQmsQueries.ts`
- Complete query key factory (`qmsKeys`) with structured keys for cache management
- Typed React Query hooks for **all 15 QMS entity types**:
  - **Documents**: `useDocuments`, `useDocument`, `useCreateDocument`, `useUpdateDocument`, `useDeleteDocument`
  - **CAPAs**: `useCapas`, `useCapa`, `useCreateCapa`, `useUpdateCapa`, `useDeleteCapa`
  - **NCRs**: `useNcrs`, `useNcr`, `useCreateNcr`, `useUpdateNcr`, `useDeleteNcr`
  - **Audits**: `useAudits`, `useAudit`, `useCreateAudit`, `useUpdateAudit`, `useDeleteAudit`
  - **Training**: `useTrainingItems`, `useTrainingItem`, `useCreateTraining`, `useUpdateTraining`, `useDeleteTraining`
  - **Risks**: `useRisks`, `useRisk`, `useCreateRisk`, `useUpdateRisk`, `useDeleteRisk`
  - **Batch Records**: `useBatchRecords`, `useBatchRecord`, `useCreateBatchRecord`, `useUpdateBatchRecord`, `useDeleteBatchRecord`
  - **Suppliers**: `useSuppliers`, `useSupplier`, `useCreateSupplier`, `useUpdateSupplier`, `useDeleteSupplier`
  - **Change Controls**: `useChangeControls`, `useChangeControl`, `useCreateChangeControl`, `useUpdateChangeControl`, `useDeleteChangeControl`
  - **Deviations**: `useDeviations`, `useDeviation`, `useCreateDeviation`, `useUpdateDeviation`, `useDeleteDeviation`
  - **Form Templates**: `useFormTemplates`, `useCreateFormTemplate`
  - **Form Instances**: `useFormInstances`, `useCreateFormInstance`, `useUpdateFormInstance`
  - **Audit Trail**: `useAuditTrail` (read-only with extended filter params)
  - **Profiles**: `useProfiles`, `useCreateProfile`
  - **Organizations**: `useOrganizations`, `useCreateOrganization`
- All mutation hooks invalidate relevant query caches on success
- Detail queries are disabled when ID is falsy (`enabled: !!id`)
- Uses existing `api-client.ts` methods — works transparently in both demo and Supabase modes

### 3. `src/hooks/useDashboardStats.ts`
- `DashboardStats` interface with computed metrics
- `useDashboardStats()` hook computes stats from Zustand store:
  - `totalRecords` across all entity types
  - `overdueItems` (overdue CAPAs + overdue training)
  - `compliancePct` (approved docs / total docs)
  - `openItems` / `closedItems`
  - Breakdown maps: `documentsByStatus`, `capasByStatus`, `ncrsBySeverity`, `trainingByStatus`
  - `recentAuditTrails` (last 7 days)
- 60-second stale time for stats (less frequent refresh needed)
- Ready to swap store computation for API call in Supabase mode

## Files Modified

### 4. `src/app/layout.tsx`
- Added `import { QueryProvider } from "@/providers/QueryProvider"`
- Wrapped `{children}` with `<QueryProvider>` as outermost provider (inside `<body>`)

## Design Decisions
- **OPT-IN migration**: Existing components using `useQMSStore()` continue to work unchanged
- **No breaking changes**: `useApi.ts` and `useExport.ts` hooks remain functional
- **Query key factory**: Structured key pattern enables targeted cache invalidation
- **Entity key helper**: `entityKeys()` factory reduces boilerplate for the 15 entity types
- **Form instances update**: Uses direct fetch since `formsApi` doesn't expose an update method

## Lint Result
- `bun run lint` passes cleanly with no errors
