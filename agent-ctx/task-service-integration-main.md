# Task: Integrate batchService and formService into Views

## Task ID: service-integration

## Summary

Successfully integrated batchService into `BatchRecordView.tsx` and formService into `FormView.tsx` with full compliance error handling, visual indicators, and workflow dialogs.

## BatchRecordView.tsx Changes

### Imports
- Added `completeBatchStep`, `releaseBatch`, `rejectBatch`, `quarantineBatch`, `startBatchStep` from `@/services/batchService`
- Added `ComplianceError`, `COMPLIANCE_CODES` from `@/lib/errors`
- Added `toast` from `sonner`
- Added `AlertDialog` components for confirmation dialogs
- Added `Textarea`, `DialogFooter`, `DialogDescription` for new dialogs
- Added `ShieldAlert`, `Ban` icons

### Step Completion
- Replaced direct store update with `completeBatchStep(batchId, stepId, operatorId, actualValue)`
- Added step complete dialog for entering actual value
- Try/catch handles `BATCH_LOCKED` (toast error) and `VALIDATION_SEQUENCE_ERROR` (toast "Complete previous steps first")

### QA Release
- Replaced direct store update with `releaseBatch(batchId, qaUserId, qaUserName)`
- Try/catch for ComplianceError; success toast: "Batch released and locked"

### Reject Batch
- Added reason input dialog before rejecting
- Uses `rejectBatch(batchId, qaUserId, qaUserName, reason)`
- Reject button shown for batches in "Pending QA Review" status

### Quarantine Batch
- Added quarantine dialog with reason input
- Uses `quarantineBatch(batchId, reason)`
- Handles BATCH_LOCKED error

### Start Step
- Added `startBatchStep` integration for Pending steps
- Shows "Start" button for pending steps, "Complete" for in-progress steps

### Visual Indicators
- Lock icon 🔒 next to locked batches in the lot number column
- Amber-outlined "Locked" badge for locked batches
- Step indicator circles: completed=green, current=blue, pending=gray, failed=red
- Disabled action buttons for locked batches

## FormView.tsx Changes

### Imports
- Added `createFormTemplate`, `createFormInstance`, `submitFormInstance`, `updateFormInstanceValues`, `approveFormInstance`, `rejectFormInstance` from `@/services/formService`
- Added `ComplianceError`, `COMPLIANCE_CODES` from `@/lib/errors`
- Added `toast` from `sonner`
- Added `AlertDialog` components, `DialogFooter`, `DialogDescription`
- Added `ShieldCheck`, `ShieldX`, `AlertTriangle` icons

### Template Creation
- Uses `createFormTemplate(templateData)` instead of direct store
- Try/catch for ComplianceError (PREREQUISITE_NOT_MET → "Linked document must be an Approved Form")
- Added linked document dropdown for Approved Form documents

### Form Submission
- Creates instance via `createFormInstance`, updates values via `updateFormInstanceValues`
- Shows AlertDialog confirmation with 21 CFR Part 11 message in French
- Uses `submitFormInstance(instanceId, userId, userName)` on confirm
- Handles REQUIRED_FIELD_MISSING and FORM_LOCKED errors

### Form Editing
- Added edit dialog for Draft instances
- Uses `updateFormInstanceValues(instanceId, values)` instead of direct store update
- If FORM_LOCKED error, shows toast and disables form fields

### Approve/Reject
- Added `approveFormInstance` and `rejectFormInstance` integration
- Approve/Reject buttons shown for Submitted instances (with documents.approve permission)
- Reject requires reason input dialog

### Visual Indicators
- Lock icon next to locked instances in the instances table
- Disabled Edit button for locked instances
- Inline validation errors for required fields (red border + error message)
- Signature badge for signed instances
- Required field indicators with red asterisks

## Lint Status
- `bun run lint` passes with zero errors
- Dev server compiles successfully
