# Task 1-capa-wizard — CapaView Enhancement

## Summary

Rewrote `/home/z/my-project/src/components/modules/CapaView.tsx` with the following enhancements:

### 6-Step Wizard for Create CAPA Dialog
- **Step 1 — Change Request**: Title, Type, Priority, Source, Category, Emergency flag, Description, Regulatory Trigger
- **Step 2 — Description & Justification**: Problem Statement, Business/Compliance Justification, Regulatory Trigger detail, Root Cause Category, Source
- **Step 3 — Proposed Change**: Proposed Change text, Implementation Plan, Target Implementation Date, Estimated Cost/Impact
- **Step 4 — Risk & Impact Assessment**: FMEA-style risk assessment (Probability/Impact/Detection dropdowns 1-5), computed RPN with color-coding, Impact Analysis, Affected Areas, Impact on Validated Systems checkbox with regulatory warning
- **Step 5 — Approval & Assignment**: Requested By (auto-filled from current user), Assigned To, Approver, Due Date, Root Cause Category
- **Step 6 — Linked Records & Review**: Linked SOP, Linked CAPA, Additional References, Full review summary of all entered data

### Wizard UI Features
- Step indicators with numbered circles and icons at top
- Progress bar showing completion percentage
- Previous/Next/Submit navigation buttons
- Step validation before allowing Next
- Clickable step indicators for completed/current steps
- `max-w-4xl` dialog width
- Review summary in Step 6 with bordered sections per step

### Enhanced Detail Dialog
- All existing sections preserved
- **Proposed Change** section (purple-themed)
- **Risk & Impact Assessment** section (amber-themed, color-coded)
- **Linked CAPA reference** (clickable — navigates to linked CAPA)
- **Linked Document** section
- **Electronic Signature** required for status transitions via `ElectronicSignatureModal`

### New State Variables
- `formCategory`, `formEmergency`, `formJustification`, `formRegulatoryTrigger`
- `formProposedChange`, `formImplementationPlan`, `formImplementationDate`, `formEstimatedCost`
- `formRiskProbability`, `formRiskImpact`, `formRiskDetection` (1-5)
- `formImpactAnalysis`, `formAffectedAreas`, `formImpactOnValidatedSystems`
- `formApprover`, `formLinkedCapaId`, `formAdditionalReferences`
- `wizardStep` (0-5)

### Preserved Features
- Stat cards, filters, table, status flow visualization
- Prerequisite checks before creation
- `useQMSStore()`, `useAuth()`, type imports, shadcn/ui components
- `cn` from `@/lib/utils` instead of custom implementation
- Same export name `CapaView` with `'use client'` directive

### Lint Status
- No lint errors in CapaView.tsx
- Dev server running successfully on port 3000
