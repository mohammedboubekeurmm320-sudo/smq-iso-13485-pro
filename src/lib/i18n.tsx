'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// i18n provider — provides a `t` translations object + a `tf()` translate
// function for interpolation.  All keys have sensible English defaults so
// the UI is fully functional even without a real translation file.
// ---------------------------------------------------------------------------

type Locale = 'en' | 'fr' | 'es' | 'de';

// ── Translation maps ──────────────────────────────────────────────────────

const sections: Record<string, string> = {
  dashboard: 'Dashboard',
  documents: 'Document Control',
  'document-hierarchy': 'Document Hierarchy',
  ncr: 'Non-Conformances',
  capa: 'CAPA',
  audits: 'Audits',
  risks: 'Risk Management',
  training: 'Training',
  'change-control': 'Change Control',
  deviations: 'Deviations',
  'batch-records': 'Batch Records',
  suppliers: 'Suppliers',
  'oos-oot': 'OOS / OOT',
  forms: 'Forms',
  reports: 'Reports',
  compliance: 'Compliance',
  'scheduled-reports': 'Scheduled Reports',
  'user-management': 'User Management',
  settings: 'Settings',
};

const auth = {
  login: 'Login',
  logout: 'Logout',
  signup: 'Sign Up',
  email: 'Email',
  password: 'Password',
  switchUser: 'Switch User',
  demoMode: 'Demo Mode',
};

const nav = {
  settings: 'Settings',
  changeControl: 'Change Control',
  forms: 'Forms',
  oosOot: 'OOS / OOT',
};

const common = {
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  viewDetails: 'View Details',
  status: 'Status',
  title: 'Title',
  description: 'Description',
  type: 'Type',
  owner: 'Owner',
  department: 'Department',
  createdAt: 'Created',
  updatedAt: 'Updated',
  version: 'Version',
  scope: 'Scope',
  total: 'Total',
  noData: 'No data found',
  next: 'Next',
  previous: 'Previous',
  allStatuses: 'All Statuses',
  allTypes: 'All Types',
  advanceTo: 'Advance To',
};

const dashboard = {
  welcome: 'Welcome',
  qualityDashboard: 'Quality Dashboard',
  openCapas: 'Open CAPAs',
  capaStatus: 'CAPA Status',
  complianceScore: 'Compliance Score',
  riskProfile: 'Risk Profile',
  activeRisks: 'Active Risks',
  quickActions: 'Quick Actions',
  createCapa: 'Create CAPA',
  createNcr: 'Create NCR',
  uploadDoc: 'Upload Document',
  scheduleAudit: 'Schedule Audit',
  batchRecords: 'Batch Records',
  suppliers: 'Suppliers',
  recentActivity: 'Recent Activity',
  qualityMetricsTrend: 'Quality Metrics Trend',
  overdue: 'Overdue',
  critical: 'Critical',
  drafts: 'Drafts',
  inReview: 'In Review',
  inImplementation: 'In Implementation',
  pendingQA: 'Pending QA',
  openDeviations: 'Open Deviations',
  openChangeControls: 'Open Change Controls',
  deviationStatus: 'Deviation Status',
  changeControlStatus: 'Change Control Status',
  closureRate: 'Closure Rate',
  approved: 'Approved',
  released: 'Released',
  requested: 'Requested',
  qualified: 'Qualified',
};

const modules: Record<string, string> = {
  documents: 'Documents',
  capa: 'CAPA',
  ncr: 'NCR',
  audit: 'Audit',
  risk: 'Risk',
  training: 'Training',
  supplier: 'Suppliers',
  compliance: 'Compliance',
  deviation: 'Deviations',
  batch: 'Batch Records',
  reports: 'Reports',
};

const statuses = {
  draft: 'Draft',
  inProgress: 'In Progress',
  inReview: 'In Review',
  approved: 'Approved',
  completed: 'Completed',
  obsolete: 'Obsolete',
};

const setup = {
  organization: 'Organization',
  industry: 'Industry',
  team: 'Team',
  modules: 'Modules',
  standards: 'Standards',
  summary: 'Summary',
  companyName: 'Company Name',
  companySize: 'Company Size',
  selectCountry: 'Select Country',
  applicableStandards: 'Applicable Standards',
  coreModules: 'Core Modules',
  optionalModules: 'Optional Modules',
  optionalStep: 'Optional',
  selected: 'Selected',
  launch: 'Launch',
  cancel: 'Cancel',
  next: 'Next',
  previous: 'Previous',
};

const industries = {
  medicalDevice: 'Medical Device',
  pharmaceutical: 'Pharmaceutical',
  ivd: 'IVD',
  combinationProduct: 'Combination Product',
};

const status_flow = {
  statuses: 'Statuses',
  transitions: 'Transitions',
};

// ── Build the top-level `t` object ─────────────────────────────────────────

function buildTranslations() {
  return {
    sections,
    auth,
    nav,
    common,
    dashboard,
    modules,
    statuses,
    setup,
    industries,
    status_flow,
  };
}

type Translations = ReturnType<typeof buildTranslations>;

// ── Context ───────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translations object (t.sections.dashboard, t.auth.login, etc.) */
  t: Translations;
  /** Translate function for key-based lookups with interpolation */
  tf: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: buildTranslations(),
      tf: (key: string, vars?: Record<string, string | number>) => {
        const keys = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any = buildTranslations();
        for (const k of keys) {
          result = result?.[k];
        }
        if (typeof result !== 'string') return key;
        if (vars) {
          Object.entries(vars).forEach(([k, v]) => {
            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          });
        }
        return result;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook for components that use `t.sections.xxx` object access */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return { t: ctx.t, locale: ctx.locale, tf: ctx.tf };
}

/** Hook for components that need locale switching too */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return { t: ctx.t, locale: ctx.locale, setLocale: ctx.setLocale, tf: ctx.tf };
}