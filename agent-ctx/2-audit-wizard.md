# Task 2-audit-wizard: Enhanced Audit Module Rewrite

## Summary
Completely rewrote `/home/z/my-project/src/components/modules/AuditView.tsx` to add a comprehensive multi-step wizard for creating audits and an enhanced detail dialog.

## Changes Made

### Multi-Step Create Wizard (Dialog, max-w-5xl)
The create form is now a 5-step wizard with a visual stepper:

**Step 1 - Audit Planning:**
- Audit Number (auto-generated AUD-2024-XXX, read-only)
- Audit Title
- Audit Type (Internal / External Customer / External Regulatory / Supplier)
- Audit Scope (textarea with guidance text)
- Audit Criteria (multi-select checkboxes: ISO 13485:2016, FDA 21 CFR 820, EU MDR, EU IVDR, MDSAP, Internal SOPs, Customer requirements)
- Audit Objectives (textarea)

**Step 2 - Schedule & Team:**
- Scheduled Start/End Date
- Lead Auditor (select from profiles, with independence note)
- Audit Team Members - dynamic table: Member, Role (Co-Auditor/Technical Expert/Observer/Trainee), Assigned Scope
- Auditees - dynamic table: Name, Department, Role/Function

**Step 3 - Checklist & Documents:**
- Audit Checklist Items - dynamic table: Clause Reference, Requirement, Evidence Expected
- Previous Audit Reference

**Step 4 - Execution & Findings:**
- Opening/Closing Meeting Date, Attendees
- Documents Reviewed - dynamic table: Doc Number, Revision, Compliance (Compliant/Minor Gap/Major Gap/N/A)
- Interviews Conducted - dynamic table: Person, Topics, Key Points
- General Observations textarea
- Findings Summary - dynamic table: #, Severity, Ref Clause, Description, Objective Evidence, CAR Required, CAPA Reference

**Step 5 - Response & Closure:**
- Corrective Action Plan - dynamic table: Action, Responsible, Due Date, Required Evidence
- Document Updates Required - dynamic table: Document, Required Change, Change Control Ref
- Training/Awareness Required - dynamic table: Scope, Target Personnel, Planned Date
- Follow-Up Verification Date
- Executive Summary textarea
- Overall Compliance Rating (5-level select)
- Risk Assessment Summary textarea
- Management Review Required (checkbox)
- Recommended Next Audit Date

### Enhanced Detail Dialog
- Color-coded severity badges (Critical=red, Major=orange, Minor=amber, Observation=blue)
- Findings with left-border color indicators
- Findings summary with counts per severity
- Electronic signature confirmation for completed audits
- Status workflow: Planned → In Progress → Completed

### Preserved Features
- Summary stat cards (Planned, In Progress, Completed)
- Search and filter controls
- Audit table with all columns
- Status flow visualization
- All existing handlers and store interactions

### Technical Details
- Uses `useQMSStore()`, `useAuth()`, type imports, `cn`, shadcn/ui components
- 15+ dynamic table state arrays with add/remove/update helpers
- Step validation (Step 1 and Step 2 required)
- Wizard navigation with Previous/Next buttons
- Extended audit types mapped to base AuditType enum

## Lint Status
- No lint errors in the file (only pre-existing errors in serve.js)
- Dev server running without compilation errors
