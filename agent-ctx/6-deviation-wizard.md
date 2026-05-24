# Task 6-deviation-wizard — DeviationView Enhancement

## Summary
Successfully rewrote the Deviation module at `/home/z/my-project/src/components/modules/DeviationView.tsx` with a comprehensive 5-step wizard form and enhanced detail dialog.

## Changes Made

### 1. Type Updates (`/home/z/my-project/src/types/qms.ts`)
- Added `deviation.create`, `deviation.read`, `deviation.update`, `deviation.delete`, `deviation.approve` permissions to the `Permission` type union
- Added deviation permissions to all role permission arrays (admin, quality_manager, auditor, document_controller, executive, operator)
- Added `DeviationProductStage` type: `'Raw Material' | 'In-Process' | 'Finished Product' | 'Stability' | 'Other'`
- Extended `Deviation` interface with new fields:
  - `sopReference`, `expectedResult`, `actualResult`
  - `productStage`, `quarantine`
  - `impactOnValidatedState`, `impactOnRegulatoryFiling`
  - `containmentAction`, `detectedDate`, `isPlannedDeviation`

### 2. DeviationView Component Rewrite
**5-Step Wizard (inside Dialog, max-w-4xl):**
- **Step 1 — Identification**: Title, Type (Planned/Unplanned), Severity, Category, Detected Date, Planned Deviation checkbox, Description
- **Step 2 — Deviation Details**: Detailed Description, SOP Reference, Expected Result, Actual Result
- **Step 3 — Product & Lot Info**: Product Code, Lot Number, Quantity Affected, Product Stage, Quarantine checkbox, Justification (required for Planned per ISO 13485 §8.7)
- **Step 4 — Risk & Assessment**: Impact on Validated State, Impact on Regulatory Filing, Containment Action, Corrective Action, Preventive Action, Linked CAPA, Linked Document
- **Step 5 — Review & Submit**: Full summary of all data, Assignment (Assigned To + Due Date), Regulatory Compliance note (ISO 13485 §8.3 reference)

**Enhanced Detail Dialog:**
- All existing sections preserved
- New Product & Lot Information section (cyan themed)
- SOP Reference / Expected vs Actual result comparison (green/red side-by-side)
- Impact Assessment section (orange themed)
- Color-coded Actions: orange for containment/risk, red for corrective, green for preventive (with left border accent)
- Linked CAPA & Document references
- ISO 13485 §8.3 compliance note
- Electronic Signature confirmation section for QA-approved deviations

**Bug Fixes:**
- Changed `ncr.create` → `deviation.create` (Create New Deviation button visibility)
- Changed `ncr.update` → `deviation.update` (Advance Status button visibility)

**Preserved Features:**
- 5 stat cards (Open, Under Investigation, Pending QA Review, Approved, Closed)
- All filters (search, status, type, severity, category)
- Full table with lot/product info sub-text
- Status flow visualization (Open → Under Investigation → Pending QA Review → Approved → Closed)
- Electronic signature modal for QA approval
- All existing imports (useQMSStore, useAuth, types, shadcn/ui, cn, formatDate)

## Verification
- ESLint: No errors in modified files
- TypeScript: No compilation errors in modified files
- Dev server: Running without errors
