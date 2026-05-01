# Task 5-a: Rewrite ComplianceView and ReportsView

## Summary
Rewrote both ComplianceView.tsx and ReportsView.tsx with full functionality as specified.

## ComplianceView.tsx (~560 lines)
- Overall Compliance Score with circular gauge (5 weighted components: Document 25%, CAPA 25%, Training 20%, Audit 15%, NCR 15%)
- Status overview cards (Compliant/Partially Compliant/Non-Compliant/Not Assessed)
- Quick Stats card with key ratios
- Compliance Gaps section with severity-coded cards auto-calculated from actual data
- Applicable Standards from orgSettings via useOrganization()
- ISO 13485:2016 Compliance Checklist with 14 clauses across 5 sections, expandable evidence, status indicators
- Permission check (compliance.view)
- Uses cn and formatDate from @/lib/utils, useOrganization for orgSettings

## ReportsView.tsx (~730 lines)
- Dashboard Metrics Summary (4 KPI cards: Total Records, Overdue Items, Compliance %, Open/Closed)
- 9 Report Template cards with Generate and Export buttons
- Report Preview Dialog with recharts charts (PieChart, BarChart) and data tables
- Each report type has unique visualizations: CAPA (pie+bar+aging), NCR (pie+bar), Training (pie+bar+table), Audit (bar+table), Risk (pie+bar), Document (pie+bar), Supplier (pie+horizontal bar), Batch (bar+table), Management Review (4 charts+KPI table)
- CSV export functionality for all report types
- Permission checks (reports.view, reports.export)
- Uses cn and formatDate from @/lib/utils

## Lint & Build
- Lint passes cleanly with no errors
- Dev server compiles successfully
