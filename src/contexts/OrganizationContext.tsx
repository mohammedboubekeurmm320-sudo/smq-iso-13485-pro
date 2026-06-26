'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Organization, OrgSettings, IndustryType } from '@/types/qms';
import { STANDARDS_BY_INDUSTRY } from '@/types/qms';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  currentOrg: Organization | null;
  orgSettings: OrgSettings | null;
  updateOrganization: (updates: Partial<Organization>) => void;
  updateSettings: (settings: Partial<OrgSettings>) => void;
  useOrgSettings: () => OrgSettings | null;
  useIndustry: () => IndustryType;
  useApplicableStandards: () => string[];
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const organizations = useQMSStore(state => state.organizations);
  const storeUpdateOrganization = useQMSStore(state => state.updateOrganization);
  const storeUpdateOrgSettings = useQMSStore(state => state.updateOrgSettings);

  // Get the first organization for demo mode
  const currentOrg = useMemo(() => {
    if (!currentUser) return null;
    return organizations[0] || null;
  }, [currentUser, organizations]);

  const orgSettings = useMemo(() => {
    if (!currentOrg) return null;
    try {
      return JSON.parse(currentOrg.settings) as OrgSettings;
    } catch {
      return null;
    }
  }, [currentOrg]);

  const updateOrganization = useCallback((updates: Partial<Organization>) => {
    if (currentOrg) {
      storeUpdateOrganization(currentOrg.id, updates);
    }
  }, [currentOrg, storeUpdateOrganization]);

  const updateSettings = useCallback((settings: Partial<OrgSettings>) => {
    if (currentOrg) {
      storeUpdateOrgSettings(currentOrg.id, settings);
    }
  }, [currentOrg, storeUpdateOrgSettings]);

  const useOrgSettingsHook = useCallback(() => orgSettings, [orgSettings]);

  const useIndustry = useCallback((): IndustryType => {
    return orgSettings?.industry_type || 'medical_device';
  }, [orgSettings]);

  const useApplicableStandards = useCallback((): string[] => {
    const industry = orgSettings?.industry_type || 'medical_device';
    return orgSettings?.applicable_standards || STANDARDS_BY_INDUSTRY[industry] || [];
  }, [orgSettings]);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      orgSettings,
      updateOrganization,
      updateSettings,
      useOrgSettings: useOrgSettingsHook,
      useIndustry,
      useApplicableStandards,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
