# Task 10-forms-wizard: Enhanced FormView with 6-Step Wizard

## Summary
Enhanced the Dynamic Forms module (`FormView.tsx`) with a comprehensive 6-step template builder wizard, workflow/compliance settings, and enhanced detail/fill dialogs.

## Changes Made

### 1. Type Updates (`src/types/qms.ts`)
- Added `rating`, `file`, `repeater` to `FormFieldDefinition.type` union
- Added `FormTemplateWorkflow` interface with: `requiresApproval`, `workflowType` (single/sequential/parallel), `allowDraftSaves`, `lockAfterSubmission`, `eSignatureRequired`
- Added `FormTemplateCompliance` interface with: `regulatoryReference`, `retentionPeriod`, `dataClassification` (Internal/Confidential/Regulatory/GxP Critical), `auditTrailEnabled`, `printFriendlyLayout`, `cfrPart11Compliance`
- Added `description`, `workflow?`, `compliance?` fields to `FormTemplate`

### 2. FormView.tsx - Complete Rewrite

#### 6-Step Wizard (Dialog, max-w-4xl)
- **Step 1 - Template Info**: Title, Version, Linked Document, Description
- **Step 2 - Field Builder**: Dynamic field list with add/remove, up/down reorder, visual field order numbers, select/highlight for config
- **Step 3 - Field Configuration**: Per-field config panel for selected field (Placeholder, Default Value, Required, Options for select type, Validation Min/Max/Pattern for number/text types)
- **Step 4 - Workflow & Rules**: Requires Approval, Workflow Type (Single/Sequential/Parallel), Allow Draft Saves, Lock After Submission, E-Signature Required
- **Step 5 - Compliance**: Regulatory Reference, Retention Period (6 options), Data Classification (4 levels), Audit Trail Enabled (default true), Print-Friendly Layout, 21 CFR Part 11 Compliance
- **Step 6 - Review & Submit**: Full summary with field preview, workflow rules, compliance settings

Step indicator with clickable completed steps, validation on Step 1 (title+version required) and Step 2 (at least 1 field).

#### Enhanced Template Detail Dialog
- Field list with types and required indicators
- Workflow rules display section
- Compliance settings display section
- Template statistics (total fields, required fields, instances, signature fields)
- 21 CFR Part 11 badge in header

#### Enhanced Fill Form Dialog
- Compliance classification badge
- 21 CFR Part 11 indicator if applicable
- Audit trail badge
- Support for new field types (rating, file, repeater)

#### Preserved Features
- Tabs (Templates/Instances)
- Stat cards
- Template/instance tables with search and filters
- E-signature for approve/reject
- Instance locking
- All original shadcn/ui components and styling
