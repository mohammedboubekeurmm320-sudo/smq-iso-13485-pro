# Task 4-b — Module Enhancer

## Task
Rewrite ChangeControlView and DeviationView with full CRUD functionality

## Summary
Both modules were rewritten with comprehensive detail dialogs, electronic signature integration, color-coded section styling, linked reference displays, and proper workflow management.

## Key Changes

### ChangeControlView.tsx
- Added `ElectronicSignatureModal` integration (approval step requires e-signature)
- Added `Separator` for section dividers
- Create dialog: Select dropdowns for linked doc/capa (populated from store)
- Create dialog: `requestedBy` auto-set to `currentUser?.id`
- Detail dialog: Status flow with Rejected branch (dashed at Under Review, solid when Rejected)
- Detail dialog: Full metadata grid with approver info (approvedBy + ShieldCheck icon)
- Detail dialog: Color-coded sections (Proposed Change=primary, Risk=amber, Impact=blue, Implementation=cyan)
- Detail dialog: Linked Document/CAPA references with doc number, title, status badge
- Rejection only available at Under Review stage
- Implementation/completion dates set on status advancement
- All dates use `formatDate()` from `@/lib/utils`

### DeviationView.tsx
- Added `ElectronicSignatureModal` integration (QA approval requires e-signature)
- Added `Separator` for section dividers
- Create dialog: Select dropdowns for linked doc/capa
- Create dialog: Justification required for Planned deviations (conditional validation)
- Table: Shows lot number and product code under title
- Detail dialog: Full status flow visualization
- Detail dialog: Full metadata grid with lot/product/qty/closed date/created by
- Detail dialog: Color-coded sections (Details=amber, Justification=blue, Risk=orange, Corrective=red, Preventive=green)
- Detail dialog: "Required for Planned" badge on Justification section
- Detail dialog: Linked Document/CAPA references with details
- All dates use `formatDate()` from `@/lib/utils`

## Verification
- `bun run lint` passes cleanly
- Dev server compiles successfully (no errors in dev.log)
