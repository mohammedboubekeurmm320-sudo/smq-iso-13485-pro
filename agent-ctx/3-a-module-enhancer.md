# Task 3-a — Module Enhancer Agent Work Record

## Task
Rewrite NcrView.tsx and AuditView.tsx with full CRUD functionality, workflow management, and rich detail views.

## Work Completed

### NcrView.tsx
- Replaced local `cn()` with `cn` from `@/lib/utils`
- Replaced `toLocaleDateString` with `formatDate` from `@/lib/utils`
- Added ElectronicSignatureModal: closing an NCR requires e-signature (21 CFR Part 11)
- Added Separator component for visual separation
- Added source field and dueDate field to create dialog
- Added linked CAPA display in detail (shows CAPA number, title, status)
- Added disposition color-coded badges in table view
- Added editable disposition section in detail (editable when Pending Disposition, read-only when Closed)
- Added full OOS/OOT investigation section: analyticalMethod, measuredValue, measuredUnit, specLimit, phase1Conclusion, phase2Required, phase2Conclusion, rejectLot
- Added Beaker icon for OOS/OOT indicator
- Permission checks: hasPermission('ncr.create'), hasPermission('ncr.update')
- Status flow: Open → Under Investigation → Pending Disposition → Closed (e-sig on Close)

### AuditView.tsx
- Replaced local `cn()` with `cn` from `@/lib/utils`
- Replaced `toLocaleDateString` with `formatDate` from `@/lib/utils`
- Added ElectronicSignatureModal: completing an audit requires e-signature
- Added Separator component
- Added auditees field to create dialog (comma-separated text input)
- Added auditees display in detail metadata
- Added complete Findings management in detail:
  - List with severity badges, CAR Required badges, reference clause, linked CAPA
  - "Add Finding" inline form with severity, reference clause, description, CAR checkbox
  - Findings persist via store.updateAudit()
- Added scope text under title in table
- Permission checks: hasPermission('audit.create'), hasPermission('audit.update')
- Status flow: Planned → In Progress → Completed (e-sig on Complete)

## Verification
- ESLint passes cleanly (0 errors)
- Dev server compiles successfully
- No hydration issues (all dates use UTC-based formatDate)
