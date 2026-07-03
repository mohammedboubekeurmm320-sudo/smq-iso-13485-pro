'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Organization, OrgSettings, IndustryType } from '@/types/qms';
import { STANDARDS_BY_INDUSTRY } from '@/types/qms';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase/mode';

interface OrganizationContextType {
  currentOrg: Organization | null;
  orgSettings: OrgSettings | null;
  organizations: Organization[];
  loading: boolean;
  updateOrganization: (updates: Partial<Organization>) => void;
  updateSettings: (settings: Partial<OrgSettings>) => void;
  /** Fetch organizations from API (Supabase mode) */
  refreshOrganizations: () => Promise<void>;
  /** Create a new organization on-demand */
  createOrganization: (data: {
    name: string;
    slug?: string;
    industryType?: IndustryType;
  }) => Promise<Organization | null>;
  /** Switch to a different organization (multi-org support) */
  switchOrganization: (orgId: string) => Promise<void>;
  useOrgSettings: () => OrgSettings | null;
  useIndustry: () => IndustryType;
  useApplicableStandards: () => string[];
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, source } = useAuth();
  const demoOrganizations = useQMSStore((state) => state.organizations);
  const storeUpdateOrganization = useQMSStore((state) => state.updateOrganization);
  const storeUpdateOrgSettings = useQMSStore((state) => state.updateOrgSettings);

  const isLive = isSupabaseConfigured();
  const [supabaseOrgs, setSupabaseOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch organizations on mount in Supabase mode
  // -----------------------------------------------------------------------
  const refreshOrganizations = useCallback(async () => {
    if (!isLive || !currentUser) return;

    setLoading(true);
    try {
      // First check sessionStorage for org data cached by login/session
      const cachedOrg = sessionStorage.getItem('auth_org');
      if (cachedOrg && supabaseOrgs.length === 0) {
        try {
          const parsed = JSON.parse(cachedOrg) as Organization;
          setSupabaseOrgs([parsed]);
          setSelectedOrgId(parsed.id);
          setLoading(false);
          return;
        } catch {
          // Continue with API fetch
        }
      }

      // Also check memberships for multi-org
      const cachedMemberships = sessionStorage.getItem('auth_memberships');
      if (cachedMemberships) {
        try {
          const memberships = JSON.parse(cachedMemberships) as Array<{
            organization_id: string;
            role: string;
            status: string;
            organizations: { id: string; name: string; slug: string };
          }>;
          const orgs: Organization[] = memberships
            .filter((m) => m.status === 'active' && m.organizations)
            .map((m) => ({
              id: m.organizations.id,
              name: m.organizations.name,
              slug: m.organizations.slug,
              subscriptionStatus: 'trial' as const,
              settings: '{}',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
          if (orgs.length > 0) {
            setSupabaseOrgs(orgs);
            if (!selectedOrgId) {
              setSelectedOrgId(orgs[0].id);
            }
            setLoading(false);
            return;
          }
        } catch {
          // Continue with API fetch
        }
      }

      // Fallback: fetch from API
      const res = await fetch('/api/organizations');
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const mapped: Organization[] = json.data.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          name: o.name as string,
          slug: o.slug as string,
          subscriptionStatus: (o.subscriptionStatus || o.subscription_status || 'trial') as Organization['subscriptionStatus'],
          settings: typeof o.settings === 'string' ? o.settings : JSON.stringify(o.settings),
          createdAt: (o.createdAt || o.created_at || '') as string,
          updatedAt: (o.updatedAt || o.updated_at || '') as string,
        }));
        setSupabaseOrgs(mapped);
        if (mapped.length > 0 && !selectedOrgId) {
          setSelectedOrgId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error('[Org] Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [isLive, currentUser, supabaseOrgs.length, selectedOrgId]);

  useEffect(() => {
    if (isLive && currentUser) {
      refreshOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, currentUser?.id]);

  // -----------------------------------------------------------------------
  // Determine current org based on mode
  // -----------------------------------------------------------------------
  const currentOrg = useMemo(() => {
    if (!currentUser) return null;

    if (isLive) {
      if (selectedOrgId) {
        return supabaseOrgs.find((o) => o.id === selectedOrgId) || supabaseOrgs[0] || null;
      }
      return supabaseOrgs[0] || null;
    }

    // Demo mode: use store
    return demoOrganizations[0] || null;
  }, [currentUser, isLive, selectedOrgId, supabaseOrgs, demoOrganizations]);

  const orgSettings = useMemo(() => {
    if (!currentOrg) return null;
    try {
      return JSON.parse(currentOrg.settings) as OrgSettings;
    } catch {
      return null;
    }
  }, [currentOrg]);

  // -----------------------------------------------------------------------
  // Update helpers
  // -----------------------------------------------------------------------
  const updateOrganization = useCallback(
    (updates: Partial<Organization>) => {
      if (!currentOrg) return;

      if (isLive) {
        // Update via API (optimistic local update)
        setSupabaseOrgs((prev) =>
          prev.map((o) => (o.id === currentOrg.id ? { ...o, ...updates } : o)),
        );
        // Fire-and-forget API update
        fetch(`/api/organizations/${currentOrg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).catch(console.error);
      } else {
        storeUpdateOrganization(currentOrg.id, updates);
      }
    },
    [currentOrg, isLive, storeUpdateOrganization],
  );

  const updateSettings = useCallback(
    (settings: Partial<OrgSettings>) => {
      if (!currentOrg) return;

      const newSettings = { ...orgSettings, ...settings };
      const settingsStr = JSON.stringify(newSettings);

      if (isLive) {
        setSupabaseOrgs((prev) =>
          prev.map((o) => (o.id === currentOrg.id ? { ...o, settings: settingsStr } : o)),
        );
        // Fire-and-forget API update
        fetch(`/api/organizations/${currentOrg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: settingsStr }),
        }).catch(console.error);
      } else {
        storeUpdateOrgSettings(currentOrg.id, settings);
      }
    },
    [currentOrg, orgSettings, isLive, storeUpdateOrgSettings],
  );

  // -----------------------------------------------------------------------
  // On-demand organization creation
  // -----------------------------------------------------------------------
  const createOrganization = useCallback(
    async (data: {
      name: string;
      slug?: string;
      industryType?: IndustryType;
    }): Promise<Organization | null> => {
      if (!isLive) {
        // Demo mode: not applicable
        return null;
      }

      try {
        const res = await fetch('/api/organizations/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!json.success) {
          console.error('[Org] Creation failed:', json.error);
          return null;
        }

        const newOrg = json.data as Organization;
        setSupabaseOrgs((prev) => [...prev, newOrg]);
        setSelectedOrgId(newOrg.id);

        // Update cache
        sessionStorage.setItem('auth_org', JSON.stringify(newOrg));

        return newOrg;
      } catch (err) {
        console.error('[Org] Creation error:', err);
        return null;
      }
    },
    [isLive],
  );

  // -----------------------------------------------------------------------
  // Organization switching
  // -----------------------------------------------------------------------
  const switchOrganization = useCallback(async (orgId: string) => {
    if (!isLive) {
      // Demo mode — just update local state
      setSelectedOrgId(orgId);
      const org = supabaseOrgs.find(o => o.id === orgId);
      if (org) {
        sessionStorage.setItem('auth_org', JSON.stringify(org));
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to switch organization');
      }

      // Update local state
      setSelectedOrgId(orgId);
      const org = supabaseOrgs.find(o => o.id === orgId);
      if (org) {
        sessionStorage.setItem('auth_org', JSON.stringify(org));
      }

      // Reload the page to refresh all data in the new org context
      window.location.reload();
    } catch (err) {
      console.error('[OrganizationContext] switchOrganization failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLive, supabaseOrgs]);

  // -----------------------------------------------------------------------
  // Hooks
  // -----------------------------------------------------------------------
  const useOrgSettingsHook = useCallback(() => orgSettings, [orgSettings]);

  const useIndustry = useCallback((): IndustryType => {
    return orgSettings?.industry_type || 'medical_device';
  }, [orgSettings]);

  const useApplicableStandards = useCallback((): string[] => {
    const industry = orgSettings?.industry_type || 'medical_device';
    return orgSettings?.applicable_standards || STANDARDS_BY_INDUSTRY[industry] || [];
  }, [orgSettings]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        orgSettings,
        organizations: isLive ? supabaseOrgs : demoOrganizations,
        loading,
        updateOrganization,
        updateSettings,
        refreshOrganizations,
        createOrganization,
        switchOrganization,
        useOrgSettings: useOrgSettingsHook,
        useIndustry,
        useApplicableStandards,
      }}
    >
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