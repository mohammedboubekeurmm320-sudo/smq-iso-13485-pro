# Task 4 - Training Wizard Enhancement

## Task ID: 4-training-wizard

## Summary
Rewrote `/home/z/my-project/src/components/modules/TrainingView.tsx` to add a comprehensive 6-step wizard form for creating training items, matching the Netlify version's richness.

## Changes Made

### 6-Step Wizard (inside Dialog, max-w-4xl)
1. **Step 1 - Training Details**: Title, Type (Onboarding/SOP/Regulatory/Skill/Certification), Regulatory Reference (text input), Description (textarea)
2. **Step 2 - Content & Materials**: Linked Document (select from approved docs), Materials Description (textarea), Duration (text), Delivery Method (Classroom/Online/OJT/Webinar/Blended)
3. **Step 3 - Assignment & Schedule**: Assigned To (select profiles), Trainer (select profiles), Due Date (date input), Priority (Low/Medium/High/Critical)
4. **Step 4 - Competency Assessment**: Assessment Required (switch toggle), Assessment Method (conditionally shown), Passing Score % with progress bar (conditionally shown), Retraining Interval (None/6M/12M/24M/36M)
5. **Step 5 - Compliance & Certification**: Certification Required (switch), Certification Validity (conditionally shown), Applicable Standards (text), Category (GMP/GLP/GCP/Safety/Quality/Other)
6. **Step 6 - Review & Submit**: Full summary of all entered data organized by section, ISO 13485 §6.2 verification note

### Enhanced Detail Dialog
- Training progress tracking with Progress bar
- Competency assessment details section (conditionally shown)
- Compliance & certification info section (conditionally shown)
- Overdue notification with specific date and ISO reference
- Start Training / Mark as Completed actions
- Electronic Signature for completion (imported from ElectronicSignatureModal)
- Priority badge display
- Trainer, Duration, Delivery Method, Regulatory Reference display

### Extended Metadata
- Created `TrainingExtendedMeta` interface to store additional fields not in the `Training` type
- Extended metadata stored locally in component state keyed by training ID
- All existing features preserved: stat cards, compliance bar, filters, table

### Step Navigation
- Visual step indicator with icons and labels
- Step completion tracking
- Back/Next navigation with validation
- Click to revisit completed steps

## Files Modified
- `/home/z/my-project/src/components/modules/TrainingView.tsx`

## Validation
- TypeScript: No errors in TrainingView.tsx
- ESLint: No new errors introduced
- Dev server: Running without issues
