# Task 8-supplier-enhance - Supplier Module Enhancement

## Summary
Enhanced the SupplierView component with qualification method, re-qualification tracking, and a richer form matching Netlify version's richness.

## Changes Made

### 1. Type Updates (`src/types/qms.ts`)
- Added `QualificationMethod` type: `'On-Site Audit' | 'Questionnaire' | 'Certificate Review' | 'Third-Party Assessment' | 'Historical Performance'`
- Extended `Supplier` interface with new optional fields:
  - `website`, `primaryContactName`, `primaryContactEmail`, `primaryContactPhone`
  - `street`, `city`, `stateProvince`, `postalCode`, `country`
  - `emergencyContactName`, `emergencyContactPhone`
  - `qualificationMethod`, `qualificationDocRef`

### 2. Mock Data Updates (`src/lib/mock-data.ts`)
- Enhanced all 4 mock suppliers with rich sample data for all new fields
- Each supplier has unique contact info, addresses, qualification methods, and document references

### 3. Component Enhancements (`src/components/modules/SupplierView.tsx`)

#### Create Dialog
- Organized form into sections with section headers and icons:
  - **Basic Information**: Supplier code (auto/manual), name, category, website, dates, certifications
  - **Primary Contact**: Name, email, phone (with icon prefixes)
  - **Address**: Street, city, state/province, postal code, country
  - **Emergency Contact**: Name, phone
  - **Qualification**: Method (select dropdown), document reference

#### Detail Dialog
- **Contact Information** section: Shows primary contact with clickable email/website, emergency contact highlighted with red icon
- **Address** section: Formatted address display with street, city/state, country
- **Qualification Details** section: Method badge with icon, document reference, next review date, qualification date
- **Re-qualification Timeline** visualization: Progress bar with color coding (green/amber/red), status indicator badge (On Track/Due Soon/Overdue), days remaining/overdue counter

#### Table Enhancement
- Added "Qual. Method" column with color-coded badges and icons per method type
- Name column now shows city/country subtitle when available
- Extended search to cover contact names, cities, and countries

#### Helper additions
- `qualificationMethodIcons`: Lucide icon per method type
- `qualificationMethodBadgeColors`: Distinct color scheme per method
- `getDaysUntilReview()`: Calculates days until/overdue
- `getRequalStatus()`: Returns 'overdue' | 'due-soon' | 'ok' | 'none'

## All Existing Features Preserved
- 5 stat cards (Qualified, Conditional, Disqualified, Under Evaluation, Avg Performance)
- Performance score with color-coded bar and inline editing
- Status flow visualization
- Re-qualification warning banner
- Status advancement buttons (Qualify, Set Conditional, Disqualify, Re-qualify)
- Certification badges
- Filters (search, status, category)
- Uses `useQMSStore()`, `useAuth()`, types from `@/types/qms`, shadcn/ui, `cn` utility
