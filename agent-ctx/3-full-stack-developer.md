# Task 3: SetupWizard & Polish — Work Record

**Agent**: full-stack-developer  
**Date**: 2026-04-27  
**Status**: ✅ Complete

## Summary

Built the SetupWizard component and polished the Dashboard, completing the QMS SaaS Pro application.

## Deliverables

### 1. SetupWizard Component (`src/components/setup/SetupWizard.tsx`)
- Full 6-step blocking wizard with professional SaaS onboarding design
- **Step 1 — Organisation**: orgName (required), country (select with 12 countries), city, orgSize (4 size options as clickable cards)
- **Step 2 — Secteur d'Activité**: 4 industry cards (Dispositif Médical, Pharmaceutique, Les Deux, Cosmétique/IVD) with icons, descriptions, and highlighted selection state
- **Step 3 — Normes Applicables**: Checkboxes populated from STANDARDS_BY_INDUSTRY[industry], with select all/deselect all toggle
- **Step 4 — Modules**: CORE_MODULES shown as locked cards with checkmarks, OPTIONAL_MODULES shown as toggleable cards with checkboxes, pre-selected based on industry via getRecommendedModules()
- **Step 5 — Équipe**: Table to add team members with email + role dropdown, add/remove rows, optional step
- **Step 6 — Récapitulatif**: Clean summary cards of all choices, "Lancer" button to complete setup
- Full-screen modal overlay with step indicator (completed/current/upcoming states), progress bar, and Next/Back/Cancel navigation
- All text in French, using Lucide React icons and shadcn/ui components

### 2. AppLayout Integration (`src/components/layout/AppLayout.tsx`)
- Imported SetupWizard and OrgSettings type
- Added `showSetupWizard` check via `orgSettings?.setup_completed === false`
- When setup not completed, SetupWizard renders instead of main app
- `handleSetupComplete` updates both org settings and org name in the demo store

### 3. Demo Store (`src/lib/demo-store.ts`)
- Already had `updateOrgSettings(orgId, settings)` method — no changes needed
- Mock organization starts with `setup_completed: true` (existing users see the app)
- "Reset Setup" button in UserManagementView sets it back to false for testing

### 4. Reset Setup Button (`src/components/modules/UserManagementView.tsx`)
- Added "Reset Setup" button with RotateCcw icon in the action bar (admin users only)
- Calls `updateSettings({ setup_completed: false })` to trigger the wizard

### 5. Dashboard Polish (`src/components/dashboard/DashboardView.tsx`)
- Added **Quick Actions** section: 4 action cards (Créer CAPA, Créer NCR, Télécharger Doc, Planifier Audit) with icons and descriptions
- Added **Compliance Score** circular gauge with SVG-based rendering (color-coded: red <60%, amber <80%, green ≥80%)
- Score calculated from weighted average: Documents (30%), CAPAs (30%), Training (20%), Audits (20%)
- Breakdown progress bars for each compliance component
- Changed chart colors for better distinction (Audits line now green instead of blue)
- All text translated to French (Bienvenue, Tableau de Bord Qualité, CAPAs Ouverts, etc.)
- Changed blue supplier card to teal to avoid blue color restriction

### 6. Final Verification
- `bun run lint` passes with zero errors
- All imports verified correct
- Dev server compiles successfully
- All module views render properly in the DashboardContent router

## Design Decisions
- Industry types mapped: `both` → `combination_product`, `cosmetic_ivd` → `ivd` to align with existing IndustryType and STANDARDS_BY_INDUSTRY
- SetupWizard uses a full-screen overlay (not a dialog) for immersive onboarding experience
- Compliance score uses SVG circular gauge for a professional dashboard look
- All French text throughout the SetupWizard and Dashboard
