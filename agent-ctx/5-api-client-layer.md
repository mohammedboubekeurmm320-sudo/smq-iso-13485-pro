# Task 5 - API Client Layer for Frontend

## Summary

Created an API client layer for the frontend that provides typed access to all QMS API endpoints, with automatic fallback support for graceful degradation. Also created React hooks for API state management and export handling, and updated ReportsView to use server-side export instead of client-side CSV generation.

## Files Created

### 1. `src/lib/api-client.ts`
- **Purpose**: Main API client with typed methods for all QMS entities
- **Key features**:
  - Typed `ApiResponse<T>` and `ListParams` interfaces matching the server response format
  - `buildQuery()` helper for converting params to URL search params
  - `createCrudApi<T>()` factory that generates `list`, `get`, `create`, `update`, `delete` methods for any entity
  - Entity API clients: `documentsApi`, `capasApi`, `ncrsApi`, `auditsApi`, `trainingApi`, `risksApi`, `batchRecordsApi`, `suppliersApi`, `changeControlsApi`, `deviationsApi`
  - Specialized APIs: `formsApi` (templates + instances), `auditTrailApi` (with extended filter params), `profilesApi`, `organizationsApi`
  - `exportApi` with `auditTrail()`, `entity()`, and `managementReview()` methods that trigger browser file downloads
  - `EXPORT_ENTITIES` constant listing valid export entity names

### 2. `src/hooks/useApi.ts`
- **Purpose**: Custom React hooks for API state management
- **Key features**:
  - `useApi<T>(fetcher, deps?)` - Auto-fetching hook with loading/error/data state and refetch
  - `useApiMutation<T>(mutator)` - Manual mutation hook for create/update/delete with loading/error/data state
  - Both hooks properly handle `ApiResponse<T>` type from the API client
  - Clean TypeScript typing throughout

### 3. `src/hooks/useExport.ts`
- **Purpose**: Hook for handling QMS data exports from the UI
- **Key features**:
  - `exportAuditTrail(params?)` - Downloads audit trail CSV with optional date/action/table filters
  - `exportEntity(entity)` - Downloads entity data as CSV
  - `exportManagementReview()` - Opens management review HTML report in new tab
  - Toast notifications for user feedback on each export action

## Files Modified

### 4. `src/components/modules/ReportsView.tsx`
- **Changes**:
  - Added `import { useExport } from '@/hooks/useExport'`
  - Added `const { exportEntity, exportManagementReview } = useExport()` in the component
  - Replaced the entire client-side CSV generation `handleExport` function with a server-side API approach
  - New `handleExport` maps report IDs to entity export endpoints (e.g., 'capa-summary' → 'capas')
  - Management Review report uses dedicated `exportManagementReview()` endpoint instead of CSV
  - Changed "Export CSV" button text to "Export" (since management review is HTML, not CSV)
  - Removed ~65 lines of client-side CSV generation code
  - All preview functionality preserved as-is

## Lint Results
- ✅ No errors or warnings after fixes
- Fixed: Removed unused `eslint-disable-next-line` directive in useApi.ts

## Architecture Notes
- The API client is designed to work in both demo mode and production
- In demo mode, the API routes already serve data from the in-memory `DemoStore`
- The `useApi` hook provides graceful degradation by catching network errors
- The existing Zustand store (`useQMSStore`) continues to work unchanged
- The export functionality now leverages server-side CSV generation (via `export-service.ts`) and HTML report generation (via `pdf-service.ts`)
