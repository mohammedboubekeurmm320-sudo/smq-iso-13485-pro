# Task 5: Change Control Wizard Enhancement

## Summary
Rewrote the Change Control module with a 6-step wizard form and enhanced detail dialog.

## Changes Made

### 1. `src/types/qms.ts` — Type Updates
- Added `changecontrol.create`, `changecontrol.read`, `changecontrol.update`, `changecontrol.delete`, `changecontrol.approve` to `Permission` type
- Added these permissions to all relevant roles: admin (full), quality_manager (full minus delete), document_controller (create/read/update), executive (read), auditor (read)
- Extended `ChangeControlCategory` with 5 new categories: `Manufacturing`, `Regulatory`, `Supply Chain`, `Warehouse`, `Other`
- Extended `ChangeControl` interface with new fields:
  - `detailedChangeDescription`, `businessComplianceJustification` (Step 2)
  - `estimatedCostImpact` (Step 3)
  - `affectedAreas`, `impactOnValidatedSystems` (Step 4)
  - `approver` (Step 5)
  - `regulatoryTrigger`, `emergencyFlag` (Step 1)
  - `additionalReferences` (Step 6)

### 2. `src/components/modules/ChangeControlView.tsx` — Complete Rewrite

**Bug Fix**: Changed `ncr.create`/`ncr.update` permissions to `changecontrol.create`/`changecontrol.update`

**6-Step Wizard (max-w-4xl Dialog)**:
- Step 1 — Change Request: Title, Type, Priority, Category, Emergency flag (conditional), Description, Justification, Regulatory Trigger
- Step 2 — Description & Justification: Detailed Change Description, Business/Compliance Justification
- Step 3 — Proposed Change: Proposed Change, Implementation Plan, Implementation Date, Estimated Cost/Impact
- Step 4 — Risk & Impact Assessment: Risk Assessment, Impact Analysis, Affected Areas, Impact on Validated Systems checkbox
- Step 5 — Approval & Assignment: Requested By (auto-filled), Assigned To (select), Approver (select), Due Date
- Step 6 — Linked Records & Review: Linked Document, Linked CAPA, Additional References, Full summary review panel

Wizard features: step indicator with icons, completed step indicators (clickable), validation per step, previous/next navigation, step counter.

**Enhanced Detail Dialog (max-w-4xl)**:
- All existing sections preserved (status badges, flow visualization, metadata, description, justification, proposed change, linked records)
- New: Detailed Change Description section (blue-themed)
- New: Business/Compliance Justification section (purple-themed)
- New: Implementation Plan section (cyan-themed)
- New: Risk & Impact Assessment section with color-coded borders (red/amber/green based on risk keywords)
- New: Affected Areas section
- New: Impact on Validated Systems warning banner (GAMP 5 / 21 CFR Part 11)
- New: Additional References section
- New: Approver metadata display
- New: Estimated Cost/Impact metadata display
- New: Regulatory Trigger metadata display
- New: Emergency flag badge in header and table rows (Zap icon)
- Electronic Signature for approval (existing)
- Electronic Signature for rejection (new — separate signature modal with `rejection` type)
- Reject action at Under Review stage (with e-signature)

**Preserved Features**: 6 stat cards, all filters, table with sorting, status flow.
