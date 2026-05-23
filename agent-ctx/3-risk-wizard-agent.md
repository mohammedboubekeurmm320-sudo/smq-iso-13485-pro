# Task 3-risk-wizard: Risk Module 6-Step Wizard Enhancement

## Summary
Rewrote `/home/z/my-project/src/components/modules/RiskView.tsx` to add a comprehensive 6-step wizard form for creating risks, matching the Netlify version's richness.

## Changes Made

### New 6-Step Wizard (Create Risk Dialog, max-w-4xl)

1. **Step 1 - Risk Identification:**
   - Title field (required)
   - Category select (9 categories: Process, Product, Equipment, Facility, Personnel, Regulatory, Supply Chain, Software, Environmental)
   - Hazard Description textarea with ISO 14971 guidance

2. **Step 2 - Risk Assessment (P × I × D):**
   - Probability select (1-5: Rare through Almost Certain) with descriptions
   - Impact select (1-5: Negligible through Catastrophic) with descriptions
   - Detectability select (1-5: Very Detectable through Undetectable) with descriptions
   - Auto-calculated RPN display with color badge
   - 5×5 Probability × Impact Matrix visualization with highlighted current position (using MapPin marker)

3. **Step 3 - Risk Evaluation:**
   - Auto-calculated risk level with color badge
   - RPN Thresholds display (Low/Medium/High/Critical)
   - Risk Acceptability select (Acceptable/ALARP/Unacceptable) with explanatory descriptions
   - Regulatory Reference input (default: ISO 14971:2019)

4. **Step 4 - Mitigation Plan:**
   - Mitigation Measures textarea
   - Control Type select (Hierarchy of Controls: Elimination → PPE)
   - Verification Method input
   - Residual Risk assessment (P/I/D selects) with RPN comparison display

5. **Step 5 - Assignment & Links:**
   - Risk Owner select from profiles (required)
   - Linked Document select from approved documents
   - Linked CAPA select from existing CAPAs
   - Priority Notes textarea

6. **Step 6 - Review & Submit:**
   - Full review summary in card layout for all sections
   - RPN reduction comparison
   - ISO 14971:2019 compliance verification note

### Enhanced Detail Dialog
- Risk matrix position visualization (reused RiskMatrixVisualization component)
- Mitigation plan section
- Residual risk comparison with before/after display
- Status workflow transitions now require electronic signature (ElectronicSignatureModal)
- 21 CFR Part 11 compliance note

### New Components
- `RiskMatrixVisualization` — reusable 5×5 grid with current position marker, supports `sm` and `lg` sizes
- Wizard step indicator with clickable completed steps and icons

### Preserved Features
- Summary stat cards (Total, High/Critical, Open, Mitigated)
- Risk Register tab with table
- RPN Risk Matrix tab with population counts
- All filters (search, status, level, category)
- All existing type imports and store usage

## Lint Status
- RiskView.tsx passes ESLint with zero errors
- Dev server running successfully on port 3000
