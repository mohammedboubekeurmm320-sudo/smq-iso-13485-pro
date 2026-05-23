# Task 7-batch-record-enhance — Agent Work Record

## Summary
Enhanced the Batch Record module with raw materials sub-table, step templates, and table indicators as requested.

## Changes Made

### 1. `src/types/qms.ts` — Type Definitions
- Added `StepType` union type: `'Weighing' | 'Mixing' | 'Filtration' | 'Filling' | 'Inspection' | 'Labeling' | 'Packaging' | 'QC Testing' | 'Other'`
- Added `RawMaterialStatus` union type: `'Verified' | 'Pending' | 'Rejected'`
- Added `RawMaterial` interface: `{ id, material, lotNumber, supplier, status }`
- Added `stepType?: StepType` to `BatchStep` interface
- Added `sopReference?: string` and `rawMaterials?: RawMaterial[]` to `BatchRecord` interface

### 2. `src/lib/mock-data.ts` — Mock Data
- Added `stepType` to all 6 mock batch steps (Weighing, Mixing, QC Testing, Filling, Other, Inspection)
- Added `sopReference` to all 3 mock batch records
- Added `rawMaterials` arrays to all 3 mock batch records:
  - batch-001: 4 materials (3 Verified, 1 Pending)
  - batch-002: 2 materials (both Verified)
  - batch-003: 3 materials (1 Rejected, 1 Verified, 1 Pending)

### 3. `src/components/modules/BatchRecordView.tsx` — Complete Rewrite

#### New imports:
- `RawMaterial`, `RawMaterialStatus`, `StepType` types
- `Trash2`, `Beaker`, `ClipboardList`, `FlaskConical` icons
- `Textarea` component

#### New constants:
- `rawMaterialStatusColors` — badge color mapping for Verified/Pending/Rejected
- `stepTypeIcons` — emoji icons for each step type
- `stepTypeOptions` — all StepType values for selects
- `rawMaterialStatusOptions` — all RawMaterialStatus values
- `FormRawMaterial` and `FormStepTemplate` interfaces for form state

#### Create Dialog Enhancements:
- Wider dialog (720px) with sectioned layout
- **Basic Information** section: existing fields + SOP Reference field
- **Raw Materials & Components** sub-table:
  - Dynamic add/remove rows
  - Columns: Material (text), Lot Number (text), Supplier (text), Status (select: Verified/Pending/Rejected)
  - Empty state message when no materials added
- **Batch Step Templates** section:
  - Dynamic card-based add/remove
  - Fields: Step Name, Step Type (select with emoji icons), Instructions (textarea), Expected Value
  - Auto-numbered steps
  - Empty state message when no steps added
- `handleCreate` now builds `rawMaterials` and `steps` arrays from form data
- Success toast includes material and step counts

#### Detail Dialog Enhancements:
- **Raw Materials table** with:
  - FlaskConical icon per material
  - Verification status badges with icons (CheckCircle2 for Verified, Clock for Pending, AlertCircle for Rejected)
  - Verified/total count in section header
  - Empty state when no materials
- **SOP Reference** badge in header area
- **Step Type** column added to steps table with emoji + type badge
- Step indicator circles now show `stepType` on hover via title

#### Table Enhancements:
- New "Materials" column with Beaker icon + count indicator
- ColSpan updated to 8 for empty state

#### Existing features preserved:
- 4 stat cards (In Progress, Pending QA Review, Released, Quarantine/Rejected)
- Filters (search, status, date range)
- Step-based workflow with sequencing enforcement
- Progress tracking
- QA release with e-signature
- Record locking
- Advance batch status button

## Verification
- Lint: All modified files pass ESLint
- Dev server: Running without errors (HTTP 200)
- No TypeScript compilation errors
