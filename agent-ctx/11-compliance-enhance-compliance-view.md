# Task 11-compliance-enhance: ComplianceView Enhancement

## Summary
Enhanced `/home/z/my-project/src/components/modules/ComplianceView.tsx` with 4 major new sections plus improved category cards.

## Changes Made

### 1. Audit Trail Table Section
- **Filter bar** with 5 controls:
  - Action type filter (Select: All / CREATE / UPDATE / DELETE / APPROVE / REJECT / SIGN / LOGIN / EXPORT)
  - Table/Module filter (Select: All / Documents / CAPA / NCR / Audits / Risks / Training / etc.)
  - Date range filter (From / To date inputs)
  - Search input with search icon
- **Audit trail table** with columns: Timestamp, Action, Table/Module, Record ID, User, Details
- Data sourced from `store.auditTrails`
- **Export CSV** button - implements CSV download using Blob + URL.createObjectURL
- **Pagination** (20 entries per page with Previous/Next buttons, page counter)

### 2. Pending Signatures Section
- 3 stat cards with colored backgrounds and icons:
  - Documents Awaiting Approval (amber)
  - Open CAPAs (red)
  - Pending Signatures (purple)
- Quick action links: Review Documents, Review CAPAs, View All Pending

### 3. Report Templates Section
- 8 report template cards in a responsive 4-column grid:
  - CAPA Summary, NCR Trend, Training Compliance, Audit Findings, Risk Assessment, Document Status, Supplier Performance, Batch Release
- Each card: icon, title, description, Generate + Export buttons

### 4. Enhanced Compliance Category Cards
- 8 category cards with percentage bars and color coding (green/amber/red based on score)
- Click to expand/collapse showing detailed status breakdown
- Categories: Document Control, CAPA Management, Training Compliance, Audit Management, NCR Resolution, Risk Management, Batch Records, Supplier Qualification

### All Existing Features Preserved
- Overall compliance score gauge
- Status overview cards (Compliant/Partial/Non-Compliant/Not Assessed)
- Quick stats
- Compliance gaps
- Applicable standards
- Compliance checklist with expandable clauses
- Industry-specific weighting
- Permission check

## New Imports Added
- `Input` from shadcn/ui
- `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` from shadcn/ui
- Lucide icons: Download, Search, ChevronLeftIcon, ChevronRightIcon, BarChart3, TrendingUp, GraduationCap, ClipboardCheck, ShieldAlert, Package, PenLine, Users, Eye
- `AuditAction` type from `@/types/qms`

## Lint & Runtime
- Zero lint errors on the file
- Dev server running cleanly with no compilation errors
