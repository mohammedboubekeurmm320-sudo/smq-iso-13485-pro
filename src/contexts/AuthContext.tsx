'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Profile, UserRole, Permission, Organization } from '@/types/qms';
import { rolePermissions } from '@/types/qms';
import { useQMSStore } from '@/lib/demo-store';
import { isSupabaseConfigured } from '@/lib/supabase/mode';
import { createClient } from '@/lib/supabase/browser';

// ---------------------------------------------------------------------------
// Extended profile that includes organization info (matches DB schema)
// ---------------------------------------------------------------------------
export interface AuthUserProfile extends Profile {
  organizationId?: string;
}

interface AuthContextType {
  currentUser: AuthUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  source: 'demo' | 'supabase';
  /** Demo mode: login by email lookup in mock store */
  login: (email: string) => boolean;
  /** Supabase mode: login with email + password */
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  /** Supabase mode: signup new user */
  signUp: (data: {
    email: string;
    password: string;
    fullName?: string;
    organizationName?: string;
  }) => Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  switchUser: (userId: string) => void;
  /** Supabase mode: fetch current session and restore state */
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser(profiles: Profile[]): AuthUserProfile | null {
  return (profiles[0] as AuthUserProfile) || null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const profiles = useQMSStore((state) => state.profiles);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'demo' | 'supabase'>(
    isSupabaseConfigured() ? 'supabase' : 'demo',
  );

  // For Supabase mode: store the real authenticated profile
  const [supabaseUser, setSupabaseUser] = useState<AuthUserProfile | null>(null);

  const isLive = isSupabaseConfigured();

  // -----------------------------------------------------------------------
  // Restore Supabase session on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isLive) {
      setLoading(false);
      return;
    }

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  const restoreSession = useCallback(async () => {
    if (!isLive) return;
    try {
      const supabase = createClient();
      if (!supabase) {
        console.warn('[Auth] Supabase client unavailable — falling back to demo');
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile from API
        const res = await fetch('/api/auth/session');
        const json = await res.json();

        if (json.success && json.data?.user?.profile) {
          const p = json.data.user.profile;
          const mappedProfile: AuthUserProfile = {
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            role: p.role,
            department: p.department,
            jobTitle: p.job_title,
            phone: p.phone,
            avatarUrl: p.avatar_url,
            organizationId: p.organization_id,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          };
          setSupabaseUser(mappedProfile);

          // Store org info for OrganizationContext
          if (json.data.user.organization) {
            sessionStorage.setItem('auth_org', JSON.stringify(json.data.user.organization));
          }
          if (json.data.user.memberships) {
            sessionStorage.setItem('auth_memberships', JSON.stringify(json.data.user.memberships));
          }
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to restore session:', err);
    } finally {
      setLoading(false);
    }
  }, [isLive]);

  // -----------------------------------------------------------------------
  // Compute current user
  // -----------------------------------------------------------------------
  const currentUser = useMemo(() => {
    if (loggedOut) return null;

    // Supabase mode: use the real authenticated user
    if (isLive && supabaseUser) {
      return supabaseUser;
    }

    // Demo mode: use the mock store
    if (selectedUserId) {
      return profiles.find((p) => p.id === selectedUserId) as AuthUserProfile || null;
    }
    return getInitialUser(profiles);
  }, [profiles, selectedUserId, loggedOut, isLive, supabaseUser]);

  const isAuthenticated = currentUser !== null;

  // -----------------------------------------------------------------------
  // Demo login (email-only, matches mock store)
  // -----------------------------------------------------------------------
  const login = useCallback(
    (email: string) => {
      const user = profiles.find((p) => p.email === email);
      if (user) {
        setSelectedUserId(user.id);
        setLoggedOut(false);
        return true;
      }
      return false;
    },
    [profiles],
  );

  // -----------------------------------------------------------------------
  // Supabase login with password
  // -----------------------------------------------------------------------
  const loginWithPassword = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!isLive) return false;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const json = await res.json();

        if (!json.success) {
          console.error('[Auth] Login error:', json.error);
          return false;
        }

        const userData = json.data.user;
        const p = userData.profile;
        const mappedProfile: AuthUserProfile = {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.role,
          department: p.department,
          jobTitle: p.job_title,
          phone: p.phone,
          avatarUrl: p.avatar_url,
          organizationId: p.organization_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };

        setSupabaseUser(mappedProfile);
        setLoggedOut(false);

        // Store org info
        if (userData.organization) {
          sessionStorage.setItem('auth_org', JSON.stringify(userData.organization));
        }
        if (userData.memberships) {
          sessionStorage.setItem('auth_memberships', JSON.stringify(userData.memberships));
        }

        return true;
      } catch (err) {
        console.error('[Auth] Login network error:', err);
        return false;
      }
    },
    [isLive],
  );

  // -----------------------------------------------------------------------
  // Supabase signup
  // -----------------------------------------------------------------------
  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      fullName?: string;
      organizationName?: string;
    }): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> => {
      if (!isLive) return { success: false, error: 'Not in live mode' };

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            fullName: data.fullName,
            createOrganization: !!data.organizationName,
            organizationName: data.organizationName,
          }),
        });

        const json = await res.json();

        if (!json.success) {
          return { success: false, error: json.error || 'Signup failed' };
        }

        return {
          success: true,
          requiresConfirmation: json.data.user?.requiresConfirmation || false,
        };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    },
    [isLive],
  );

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  const logout = useCallback(async () => {
    setSelectedUserId(null);
    setLoggedOut(true);
    setSupabaseUser(null);
    sessionStorage.removeItem('auth_org');
    sessionStorage.removeItem('auth_memberships');

    // Also call Supabase signout to clear cookies
    if (isLive) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Best-effort
      }
    }
  }, [isLive]);

  // -----------------------------------------------------------------------
  // Permissions
  // -----------------------------------------------------------------------
  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!currentUser) return false;
      const permissions = rolePermissions[currentUser.role as UserRole] || [];
      return permissions.includes(permission);
    },
    [currentUser],
  );

  const hasRole = useCallback(
    (role: UserRole) => {
      if (!currentUser) return false;
      return currentUser.role === role;
    },
    [currentUser],
  );

  const switchUser = useCallback(
    (userId: string) => {
      const user = profiles.find((p) => p.id === userId);
      if (user) {
        setSelectedUserId(user.id);
        setLoggedOut(false);
      }
    },
    [profiles],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loading,
        source,
        login,
        loginWithPassword,
        signUp,
        logout,
        hasPermission,
        hasRole,
        switchUser,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}