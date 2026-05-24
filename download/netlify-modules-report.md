# QMS SaaS Pro — Netlify Module UI Report

**Site:** https://qms-saas-pro.netlify.app/  
**Date:** 2025-03-04  
**Purpose:** Document each module's UI content for comparison with local code

---

## 1. CAPA Management

- **Sidebar Label:** CAPA (with badge "4")
- **Header Title:** "CAPA Management"
- **Description:** "Corrective and Preventive Actions (ISO 13485 8.5.2 / 8.5.3)"
- **Action Button:** "New CAPA"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Open | 1 |
| Investigation | 1 |
| Implementation | 1 |
| Effectiveness | 1 |
| Closed | 1 |

### Filters
- Search: "Search CAPAs..."
- Dropdowns: All Statuses, All Types, All Priorities

### Table Columns
| Column | Sample Data |
|--------|-------------|
| CAPA # | CAPA-2024-001 |
| Title | Environmental Monitoring Excursion - Cleanroom Grade A |
| Type | Corrective / Preventive |
| Priority | Critical / High / Medium |
| Status | Implementation / Investigation / Open / Closed / Effectiveness Check |
| Assigned To | Jean Martin / Pierre Bernard |
| Due Date | 15 juin 24, 01 juil. 24, etc. |
| Actions | (button) |

### Detail Dialog (CAPA-2024-001)
- **Header:** CAPA-2024-001 + Title
- **Badges:** Status (Implementation), Type (Corrective), Priority (Critical), Linked badge (Non-Conformance)
- **Workflow Stepper:** Open → Investigation → Implementation → Effectiveness Check → Closed
- **Metadata Fields:**
  - Assigned To: Jean Martin
  - Due Date: 6/15/2024
  - Created: 3/16/2024
- **Sections:**
  - Description (heading)
  - Problem Statement (heading)
  - Investigation Details (heading)
  - Root Cause Analysis (heading)
  - Category: Machine
  - **5 Whys Analysis:**
    - Why 1: CFU counts exceeded in Grade A
    - Why 2: HEPA filter degraded
    - Why 3: Filter not replaced on schedule
    - Why 4: PM schedule not updated after filter life assessment
    - Why 5: Change control for filter replacement not implemented
  - Corrective Action (heading)
  - Effectiveness Verification (heading)
    - Criteria: Zero excursions above alert limits for 3 consecutive months
    - Result: Pending Review
- **Action Buttons:** "Advance to Effectiveness Check", "Close"

---

## 2. Non-Conformities (NCR)

- **Sidebar Label:** Non-Conformities (with badge "2")
- **Header Title:** "Non-Conformances"
- **Description:** "Manage non-conformance reports and investigations (ISO 13485 8.3)"
- **Action Button:** "New NCR"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Open | 1 |
| Under Investigation | 1 |
| Pending Disposition | 1 |
| Closed | 1 |

### Filters
- Search: "Search NCRs..."
- Dropdowns: All Statuses, All Types, All Severities

### Table Columns
| Column | Sample Data |
|--------|-------------|
| NCR # | NCR-2024-001 |
| Title | Environmental Monitoring Excursion - Grade A |
| Type | Process / OOS / Product / Supplier |
| Severity | Critical / Major / Minor |
| Status | Under Investigation / Pending Disposition / Open / Closed |
| Disposition | - / Scrap / Return to Supplier |
| Assigned To | Jean Martin / Lucas Petit |
| Created | 15/03/24, 05/04/24, etc. |

### Detail Dialog (NCR-2024-001)
- **Header:** NCR-2024-001 + Title
- **Badges:** Status (Under Investigation), Type (Process), Severity (Critical)
- **Workflow Stepper:** Open → Under Investigation → Pending Disposition → Closed
- **Metadata Fields:**
  - NCR Number: NCR-2024-001
  - Type: Process
  - Severity: Critical
  - Source: Environmental Monitoring
  - Assigned To: Jean Martin
  - Created: 15 Mar 2024
  - Lot Number: BN-2024-038
  - Qty Affected: 500
  - Updated: 01 May 2024
- **Sections:**
  - Description (heading)
  - Linked CAPA (heading)
- **Action Buttons:** "Advance to Pending Disposition", "Close"

---

## 3. Audits

- **Sidebar Label:** Audits
- **Header Title:** "Audits"
- **Description:** "Plan, conduct and track quality audits (ISO 13485 8.2.4)"
- **Action Button:** "New Audit"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Planned | 1 |
| In Progress | 1 |
| Completed | 1 |

### Filters
- Search: "Search audits..."
- Dropdowns: All Statuses, All Types

### Table Columns
| Column | Sample Data |
|--------|-------------|
| Audit # | AUD-2024-001 |
| Title | Q1 2024 Internal Quality Audit |
| Type | Internal / Supplier |
| Lead Auditor | Sophie Laurent |
| Scheduled | 01/04/24 |
| Status | Completed / Planned / In Progress |
| Findings | 3 / 0 |

### Detail Dialog (AUD-2024-001)
- **Header:** AUD-2024-001 + Title
- **Badges:** Status (Completed), Type (Internal)
- **Workflow Stepper:** Planned → In Progress → Completed
- **Metadata Fields:**
  - Audit Number: AUD-2024-001
  - Type: Internal
  - Lead Auditor: Sophie Laurent
  - Scheduled Date: 01 Apr 2024
  - Completed Date: 03 Apr 2024
  - Created: 01 Mar 2024
  - Auditees: Pierre Bernard, Lucas Petit, Jean Martin
- **Sections:**
  - Scope (heading)
  - Findings (3) (heading)
- **Action Buttons:** "Close"

---

## 4. Risk Management

- **Sidebar Label:** Risks
- **Header Title:** "Risk Management"
- **Description:** "Risk assessment and management (ISO 14971)"
- **Action Button:** "New Risk"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Total Risks | 4 |
| High / Critical | 2 |
| Open | 1 |
| Mitigated | 2 |

### Tabs
- **Risk Register** (selected)
- **RPN Risk Matrix**

### Filters (Risk Register tab)
- Search: "Search risks..."
- Dropdowns: All Statuses, All Levels, All Categories

### Table Columns
| Column | Sample Data |
|--------|-------------|
| Risk # | RISK-2024-001 |
| Title | HEPA Filter Failure in Grade A |
| Category | Process / Supplier / Product / System |
| P (Probability) | 1-3 |
| I (Impact) | 4-5 |
| D (Detectability) | 2-4 |
| RPN | 10-48 |
| Risk Level | High / Medium / Low |
| Status | Mitigated / Open / Accepted |
| Actions | (button) |

### Detail Dialog (RISK-2024-001)
- **Header:** RISK-2024-001 + Title
- **Badges:** Risk Level (High), Status (Mitigated), Category (Process)
- **Workflow Stepper:** Open → Mitigated → Closed
- **Risk Scoring Display:**
  - Probability: 2 (Unlikely)
  - Impact: 5 (Catastrophic)
  - Detectability: 3 (Level 3)
  - RPN: 30 (P×I×D)
  - RPN Calculation: 2 × 5 × 3 = 30
- **Matrix Position:** 5×5 visual risk matrix showing the risk position highlighted
- **Sections:**
  - Mitigation (heading)
  - Residual Risk (heading)
  - Created: 16 Mar 2024
  - Updated: 01 May 2024
- **Action Buttons:** "Mark as Closed", "Close"

---

## 5. Training

- **Sidebar Label:** Training (with badge "1")
- **Header Title:** "Training"
- **Description:** "Training management and compliance tracking"
- **Action Button:** "New Training"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Planned | 0 |
| In Progress | 0 |
| Completed | 2 |
| Overdue | 3 |
| Training Compliance | 40% |
| Sub-text | "2 of 5 training records completed" |

### Filters
- Search: "Search training..."
- Dropdowns: All Statuses, All Types, All Users

### Table Columns
| Column | Sample Data |
|--------|-------------|
| Title | SOP-QMS-001 Document Control Training |
| Type | SOP / Certification / Regulatory / Onboarding / Skill |
| Assigned To | Lucas Petit / Jean Martin / Sophie Laurent |
| Due Date | 15/02/24 |
| Status | Completed / Overdue |
| Completed | 10/02/24 or "-" |
| Document | SOP-QMS-001 / WI-PROD-001 / "-" |
| Actions | (button) |

### Detail Dialog
- **No detail dialog observed** — clicking rows and action buttons did not open a dialog. This module may use inline actions only.

---

## 6. Change Control

- **Sidebar Label:** Change Control
- **Header Title:** "Change Control"
- **Description:** "Change management and approval workflow"
- **Action Button:** "New Change Control"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Requested | 0 |
| Under Review | 1 |
| Approved | 1 |
| In Implementation | 1 |
| Completed | 1 |
| Rejected | 0 |

### Filters
- Search: "Search Change Controls..."
- Dropdowns: All Statuses, All Types, All Priorities, All Categories

### Table Columns
| Column | Sample Data |
|--------|-------------|
| CC # | CC-2024-001 |
| Title | HEPA Filter Replacement - Grade A Cleanroom |
| Type | Planned / Emergency |
| Priority | Critical / High / Medium |
| Category | Equipment / Document / Process / Facility |
| Status | In Implementation / Completed / Under Review / Approved |
| Assigned To | Jean Martin / Pierre Bernard / Marie Dupont |
| Due Date | 15/05/24 |
| Actions | (button) |

### Detail Dialog (CC-2024-001)
- **Header:** CC-2024-001 + Title
- **Badges:** Status (In Implementation), Type (Planned), Priority (Critical), Category (Equipment)
- **Workflow Stepper:** Requested → Under Review → Approved → In Implementation → Completed
- **Metadata Fields:**
  - Assigned To: Jean Martin
  - Requested By: Marie Dupont
  - Due Date: 15 May 2024
  - Created: 20 Mar 2024
  - Updated: 20 Apr 2024
  - Approved By: Claire Moreau
  - Implementation Date: 20 Apr 2024
- **Sections:**
  - Description (heading)
  - Justification (heading)
  - Proposed Change (heading)
    - "Replace existing HEPA filter with new equivalent unit (Model: Camfil Megalam SP). Update PM schedule to reflect new filter life assessment."
  - Risk Assessment (heading)
  - Impact Analysis (heading)
  - Implementation Plan (heading)
  - Linked Document (heading)
  - Linked CAPA (heading)
- **Action Buttons:** "Advance to Completed", "Close"

---

## 7. Deviations

- **Sidebar Label:** Deviations
- **Header Title:** "Deviations"
- **Description:** "Deviation recording, investigation, and management"
- **Action Button:** "New Deviation"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Open | 1 |
| Under Investigation | 1 |
| Pending QA Review | 1 |
| Approved | 1 |
| Closed | 0 |

### Filters
- Search: "Search deviations..."
- Dropdowns: All Statuses, All Types, All Severities, All Categories

### Table Columns
| Column | Sample Data |
|--------|-------------|
| DEV # | DEV-2024-001 |
| Title | Temperature Excursion During Product Storage |
| Type | Unplanned / Planned |
| Severity | Major / Minor |
| Category | Environment / Process / Material / Personnel |
| Status | Under Investigation / Pending QA Review / Approved / Open |
| Assigned To | Jean Martin |
| Due Date | 15/05/24 |
| Actions | (button) |

### Detail Dialog (DEV-2024-001)
- **Header:** DEV-2024-001 + Title
- **Badges:** Status (Under Investigation), Type (Unplanned), Severity (Major), Category (Environment)
- **Workflow Stepper:** Open → Under Investigation → Pending QA Review → Approved → Closed
- **Metadata Fields:**
  - Assigned To: Jean Martin
  - Due Date: 15 May 2024
  - Created: 15 Apr 2024
  - Updated: 01 May 2024
  - Lot Number: BN-2024-052
  - Product Code: PROD-ALPHA-001
  - Qty Affected: 500
  - Created By: Lucas Petit
- **Sections:**
  - Description (heading)
  - Deviation Details (heading)
    - "Temperature monitoring system recorded temperatures up to 12°C in cold storage unit CS-003 between 02:00 and 05:00 on 2024-04-15. Compressor malfunction identified as root cause. Affected products: Sterile Solution Alpha Lot BN-2024-052 (500 vials), Sterile Solution Beta Lot BN-2024-042 (1000 vials)."
  - Risk Assessment (heading)
  - Linked CAPA (heading)
- **Action Buttons:** "Advance to Pending QA Review", "Close"

---

## 8. Suppliers

- **Sidebar Label:** Suppliers
- **Header Title:** "Suppliers"
- **Description:** "Supplier qualification and management"
- **Action Button:** "New Supplier"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Qualified | 2 |
| Conditional | 1 |
| Disqualified | 0 |
| Under Evaluation | 1 |
| Avg. Performance | 85 |

### Filters
- Search: "Search suppliers..."
- Dropdowns: All Statuses, All Categories

### Table Columns
| Column | Sample Data |
|--------|-------------|
| Code | MED-SUP-001 |
| Name | MedPharm Raw Materials GmbH |
| Category | Raw Material / Packaging / Equipment / Laboratory |
| Status | Qualified / Conditional / Under Evaluation |
| Performance | 92 / 88 / 75 / N/A |
| Next Review | 15/06/25, 01/08/25, 10/07/24, "-" |

### Detail Dialog (MED-SUP-001)
- **Header:** MED-SUP-001 + Name
- **Badges:** Status (Qualified), Category (Raw Material)
- **Workflow Stepper:** Under Evaluation → Conditional → Qualified
- **Metadata Fields:**
  - Code: MED-SUP-001
  - Name: MedPharm Raw Materials GmbH
  - Category: Raw Material
  - Qualified Date: 15 Jun 2023
  - Next Review: 15 Jun 2025
  - Created: 15 Jun 2023
- **Sections:**
  - Certifications: ISO 9001:2015, ISO 13485:2016, GMP Certificate
  - Performance Score: 92 (Excellent, scale to 100)
  - Next review date: 15 Jun 2025
- **Action Buttons:** "Edit", "Set Conditional", "Close"

---

## 9. OOS / OOT Investigations

- **Sidebar Label:** OOS/OOT
- **Header Title:** "OOS / OOT Investigations"
- **Description:** "Out of Specification / Out of Trend — FDA & ICH Q2(R1) Guidance"
- **Action Button:** "Create OOS/OOT"

### Stats/KPIs
| Stat | Count |
|------|-------|
| OOS Count | 1 |
| OOT Count | 0 |
| Phase 1 Pending | 0 |
| Phase 2 Confirmed | 1 |

### Filters
- Search: "Search OOS/OOT (title, NCR#, lot#)..."
- Dropdowns: All Types, All Phases, All Conclusions, All Statuses

### Table Columns
| Column | Sample Data |
|--------|-------------|
| NCR # | NCR-2024-002 |
| Title | Out of Specification Result - API Assay |
| Type | OOS |
| Lot # | BN-2024-042 |
| Analytical Method | HPLC Method QC-M-001 |
| Measured vs Spec | 92.3 % vs 95.0-105.0% |
| Phase 1 | No Error Found |
| Phase 2 | Confirmed OOS |
| Status | Pending Disposition |
| Actions | (button) |

### Detail Dialog (NCR-2024-002)
- **Header:** NCR-2024-002 + Title
- **Badges:** Status (Pending Disposition), Type (OOS), Severity (Major), Disposition (Reject Lot)
- **Basic Information:**
  - NCR Number: NCR-2024-002
  - Type: OOS
  - Lot Number: BN-2024-042
  - Assigned To: Jean Martin
  - Created: 05 Apr 2024
- **Description** (heading)
- **Specification Information:**
  - Analytical Method: HPLC Method QC-M-001
  - Specification Limit: 95.0-105.0%
  - Measured Value: 92.3 %
  - OUT OF SPEC badge
  - Phase 1: No Error Found
  - Phase 2: Confirmed OOS
- **Phase 1 Laboratory Investigation** (heading)
  - Laboratory Investigation Checklist:
    - Analyst Error? (unchecked, disabled)
    - Calculation Error? (unchecked, disabled)
    - Instrument Malfunction? (unchecked, disabled)
    - Sample Preparation Error? (unchecked, disabled)
- **Phase 2 Full-Scale Investigation** (heading)
- **Disposition Decision** (heading)
  - Buttons: "Use As Is", "Rework", "Scrap", "Return to Supplier"
  - "Apply Disposition with Electronic Signature" (disabled)
- **Lot Disposition** (heading)
- **Action Buttons:** "Close"

---

## 10. Dynamic Forms

- **Sidebar Label:** Forms
- **Header Title:** "Dynamic Forms"
- **Description:** "Form templates and electronic records management"
- **Action Button:** "New Template"

### Tabs
- **Templates** (selected)
- **Instances**

### Stats/KPIs (Templates tab)
| Stat | Count |
|------|-------|
| Active Templates | 2 |
| Total Instances | 2 |
| Draft Instances | 0 |
| Approved Instances | 1 |

### Filters
- Search: "Search templates..."

### Table Columns (Templates tab)
| Column | Sample Data |
|--------|-------------|
| Title | Cleanroom Entry Log / In-Process Control Record |
| Version | 1.0 |
| Fields | 5 fields / 7 fields |
| Linked Document | WI-PROD-001 / SOP-PROD-001 |
| Active | Active |
| Instances | 1 |
| Actions | View / Fill buttons |

### Detail Dialog (Cleanroom Entry Log v1.0)
- **Header:** Cleanroom Entry Log v1.0
- **Metadata:**
  - Version: 1.0
  - Fields: 5
  - Instances: 1
  - Created: 01 Mar 2024
  - Linked Doc: WI-PROD-001
- **Sections:**
  - Field Configurations (heading)
- **Action Buttons:** "Close"

---

## 11. Reports & Analytics

- **Sidebar Label:** Reports & Analytics
- **Header Title:** "Reports & Analytics"
- **Action Button:** None (no "New" button)

### Report Templates
Each template has "Generate" and "Export" buttons:

| Report Name | Buttons |
|-------------|---------|
| CAPA Summary Report | Generate, Export |
| NCR Trend Report | Generate, Export |
| Training Compliance Report | Generate, Export |
| Audit Findings Report | Generate, Export |
| Risk Assessment Report | Generate, Export |
| Document Status Report | Generate, Export |
| Supplier Performance Report | Generate, Export |
| Batch Release Report | Generate, Export |
| Management Review Report | Generate, Export |

### Detail Dialog
- **None** — no table rows or detail dialogs. This module is a report generator only.

---

## 12. Compliance

- **Sidebar Label:** Compliance
- **Header Title:** "Compliance"
- **Description:** (empty)

### Tabs
- **Dashboard** (selected)
- **Audit Trail**

### Dashboard Tab
- **Overall Compliance Score:** 47% (circular gauge, red color)
- **Weighted composite — Medical Device weights**
- **Score Breakdown:**
  - Document Compliance (25%): 80%
  - CAPA Compliance (20%): 20%
  - Training (15%): 40%
  - Audits (15%): 33%
  - NCR Resolution (10%): 25%
  - Risk Management (10%): 75%
- **Quick Stats:**
  - Pending Signatures: 1 (Documents awaiting approval)
  - Open CAPAs: 4 (Active corrective & preventive actions)
  - Audit Entries (7d): 0 (8 total entries)
- **Recent Audit Activity** (table):
  - Connexion / Profils / user-001 / admin@qms-demo.com / 01/06/24
  - Modification / Documents / doc-006 / dc@qms-demo.com / 15/05/24
  - Création / Dossiers de Lot / batch-001 / operator@qms-demo.com / 01/05/24
  - Signature / Dossiers de Lot / batch-002 / qm@qms-demo.com / 20/04/24
  - Création / Non-conformités / ncr-002 / qm@qms-demo.com / 05/04/24
  - Modification / CAPA / capa-001 / qm@qms-demo.com / 20/03/24
  - Création / CAPA / capa-001 / qm@qms-demo.com / 16/03/24
  - Approbation / Documents / doc-001 / dc@qms-demo.com / 15/01/24

### Audit Trail Tab
- Contains audit trail entries (same data as Recent Audit Activity section)

---

## 13. Document Hierarchy

- **Sidebar Label:** Document Hierarchy
- **Header Title:** "Document Hierarchy"
- **Description:** "Visualize and manage the document hierarchy and relationships"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Total | 10 |
| N1 Policy | 4 |
| N2 SOP | 5 |
| N3 WI | 1 |
| N4 Form/Record | 0 |
| Orphans | 5 |
| With Children | 1 |

### Filters
- Search: "Search documents by number or title..."
- Dropdowns: All Levels, All Statuses
- Buttons: "Expand All", "Collapse All"

### Document Tree
- Document Tree heading: "10 documents"
- Tree items showing document number, title, version, status, and parent/child relationships:
  - SOP-QMS-001 Document Control Procedure v3.0 Approved
  - SOP-QMS-002 CAPA Management Procedure v2.1 Approved
  - SOP-QMS-003 Non-Conformance Management v2.0 Approved
  - SOP-PROD-001 Sterile Manufacturing Process v4.2 Approved (1↓ child)
  - POL-QMS-001 Quality Policy v1.0 Approved
  - SOP-QMS-004 Internal Audit Procedure v1.2 Approved
  - VAL-PROD-001 Sterilization Process Validation - IQ v1.0 Approved
  - SPEC-QC-001 Raw Material Specification - API X-200 v2.0 Approved
  - RA-QMS-001 Product Risk Analysis - Device Alpha v1.0 Draft

### Hierarchy Flow
- N1 Policy (4 docs) → governs → N2 SOP (5 docs) → governs → N3 WI (1 docs) → governs → N4 Form/Record (0 docs)

---

## 14. User Management

- **Sidebar Label:** User Management (under SETTINGS section)
- **Header Title:** "User Management"
- **Description:** "Manage users, roles and permissions"
- **Action Button:** "Add User"

### Stats/KPIs
| Stat | Count |
|------|-------|
| Total Users | 6 |
| Active | 6 |
| Inactive | 0 |
| Administrator | 1 |
| Quality Manager | 1 |
| Auditor | 1 |
| Document Controller | 1 (clickable filter) |
| Executive | 1 (clickable filter) |
| Operator | 1 (clickable filter) |

### Filters
- Search: "Search by name or email..."
- Dropdown: All Roles

### Table Columns
| Column | Sample Data |
|--------|-------------|
| Avatar | MD (initials) |
| Full Name | Marie Dupont (Active) |
| Email | admin@qms-demo.com |
| Role | Administrator / Quality Manager / Auditor / Document Controller / Executive / Operator |
| Department | Quality Assurance / Internal Audit / Document Control / Executive / Production |
| Job Title | QA Director / Quality Manager / Lead Auditor / Document Control Specialist / VP Quality / Manufacturing Operator |
| Created Date | 15 Jan 2024 |
| Actions | (2 buttons per row: edit, more) |

### Detail Dialog (Marie Dupont)
- **Header:** Avatar + Name + Email
- **Badges:** Role (Administrator), Status (Active)
- **Profile Information:**
  - Email: admin@qms-demo.com
  - Department: Quality Assurance
  - Job Title: QA Director
  - Phone: +33 1 23 45 67 89
  - Created: 15 Jan 2024
  - Updated: 01 Jun 2024
- **Edit User** button
- **Role & Permissions:**
  - Role: Administrator
  - Description: "Full system access including user management, organization settings, and audit trail. Can create, read, update, and delete all records across all modules."
  - **Administrator Permissions: 43/43 permissions**
  - Module breakdown:
    - Documents: 5/5 (create, read, update, delete, approve)
    - CAPA: 5/5 (create, read, update, delete, approve)
    - NCR: 5/5 (create, read, update, delete, approve)
    - Audits: 4/4 (create, read, update, delete)
    - Training: 4/4 (create, read, update, delete)
    - Risk: 4/4 (create, read, update, delete)
    - Batch Records: 5/5 (create, read, update, delete, release)
    - Suppliers: 4/4 (create, read, update, delete)
    - Reports: 2/2 (view, export)
    - Compliance: 2/2 (view, manage)
    - Administration: 3/3 (users, settings, audit_trail)
  - "43 permissions granted across 11 modules"
- **Action Buttons:** "Close"

---

## Unique UI Patterns & Features

### Common Across Modules
1. **Workflow Stepper:** CAPA, NCR, Audits, Risks, Change Control, Deviations, and Suppliers all have visual workflow step indicators in their detail dialogs showing the progression of statuses.
2. **Badge System:** Color-coded badges for Status, Type, Priority/Severity, Category throughout all modules.
3. **Filter Bar Pattern:** Nearly all list views have: text search + dropdown filters + sometimes a "New" action button.
4. **Sidebar Navigation:** Grouped into sections: DOCUMENT CONTROL, RECORDS, GOVERNANCE, SETTINGS. Some items show count badges.
5. **Compact Snapshot (`-c` flag):** The accessibility tree format provides structured view of all elements.

### Module-Specific Features
- **CAPA:** 5 Whys Analysis tool built into detail dialog; linked to Non-Conformances and CAPAs
- **Risks:** Dual-view with Risk Register table and RPN Risk Matrix tab; visual 5×5 risk matrix in detail dialog; P×I×D calculation display
- **OOS/OOT:** FDA/ICH Q2(R1) Phase 1/Phase 2 investigation workflow; laboratory investigation checklist with checkboxes; disposition decision buttons (Use As Is, Rework, Scrap, Return to Supplier); electronic signature for disposition
- **Change Control:** Includes "Emergency" type variant; linked Document and CAPA sections; approval chain (Approved By, Implementation Date)
- **Suppliers:** Performance score with gauge visualization; certification badges; status progression (Under Evaluation → Conditional → Qualified)
- **Compliance:** Weighted composite score with breakdown by module; circular gauge visualization; audit trail with French-language action labels (Connexion, Création, Modification, Approbation, Signature)
- **Document Hierarchy:** Tree view with expand/collapse; visual hierarchy flow (N1→N2→N3→N4); orphan count; parent-child indicators (↓, ↑)
- **Forms:** Template/Instance tab duality; per-template "View" and "Fill" action buttons; field configuration count
- **User Management:** Detailed permissions matrix per role (43/43 for Admin); clickable role filters; avatar initials; 11 module permission categories
- **Training:** Compliance percentage KPI; overdue tracking; document linkage

### Localization
- Date formats appear in French locale (e.g., "15 juin 24", "01 juil. 24", "01 août 24")
- Compliance audit trail uses French action verbs (Connexion, Création, Modification, Approbation, Signature)
- EN language button visible in header (currently selected)

---

## Sidebar Module Summary Table

| # | Module | Badge Count | Has Table | Has Detail Dialog | Has Tabs |
|---|--------|-------------|-----------|-------------------|----------|
| 1 | CAPA | 4 | Yes | Yes (5 Whys, workflow) | No |
| 2 | Non-Conformities | 2 | Yes | Yes (workflow, linked CAPA) | No |
| 3 | Audits | — | Yes | Yes (findings, scope) | No |
| 4 | Risks | — | Yes | Yes (matrix, P/I/D) | Yes (Register/Matrix) |
| 5 | Training | 1 | Yes | No | No |
| 6 | Change Control | — | Yes | Yes (approval, links) | No |
| 7 | Deviations | — | Yes | Yes (investigation, CAPA link) | No |
| 8 | Suppliers | — | Yes | Yes (certifications, score) | No |
| 9 | OOS/OOT | — | Yes | Yes (Phase 1/2, e-signature) | No |
| 10 | Forms | — | Yes | Yes (field configs) | Yes (Templates/Instances) |
| 11 | Reports & Analytics | — | No | No | No |
| 12 | Compliance | — | No (gauge view) | No | Yes (Dashboard/Audit Trail) |
| 13 | Document Hierarchy | — | No (tree view) | No | No |
| 14 | User Management | — | Yes | Yes (permissions) | No |
