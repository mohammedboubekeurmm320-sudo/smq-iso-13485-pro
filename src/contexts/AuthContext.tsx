// src/contexts/AuthContext.tsx
// ============================================================================
// AuthContext — provides authentication state to the entire app.
//
// Features:
//   - login(email, password) → calls /api/auth/login
//   - logout() → calls /api/auth/logout, clears state
//   - refreshSession() → calls /api/auth/session
//   - switchOrganization(orgId) → calls /api/auth/switch-org
//   - Error state visible to UI (no more "nothing happens")
//   - Multi-tab sync (logout in one tab → logout in all)
// ============================================================================

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { rolePermissions, type Permission, type UserRole as QmsUserRole } from '@/types/qms';
import { isSupabaseConfigured } from '@/lib/supabase/mode';

// ============================================================================
// Types
// ============================================================================

type UserRole =
  | 'admin'
  | 'quality_manager'
  | 'auditor'
  | 'document_controller'
  | 'executive'
  | 'operator';

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  department: string | null;
  organizationId: string | null;
}

interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  settings: Record<string, unknown> | null;
}

interface AuthMembership {
  organizationId: string;
  role: string;
  status: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/** Backward-compatible user object (used by ~15 components) */
interface LegacyCurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  department: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  organizationId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AuthState {
  user: AuthUser | null;
  profile: AuthProfile | null;
  organization: AuthOrganization | null;
  memberships: AuthMembership[];
  loading: boolean;
  error: string | null;
  requiresOnboarding: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresOnboarding?: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  // --- Backward-compat shims (used by 27 consumer components) ---
  /** @deprecated Use `!!user` instead */
  isAuthenticated: boolean;
  /** @deprecated Use `user` + `profile` instead */
  currentUser: LegacyCurrentUser | null;
  /** @deprecated Supabase-only mode now */
  source: 'demo' | 'supabase';
  /** @deprecated Use `login()` instead */
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  /** @deprecated Signup is handled by /auth/signup page */
  signUp: (data: { email: string; password: string; fullName?: string; organizationName?: string }) => Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }>;
  /** @deprecated Demo-only — no-op in live mode */
  switchUser: (userId: string) => void;
  /** @deprecated Use `refreshSession()` instead */
  restoreSession: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: QmsUserRole) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    organization: null,
    memberships: [],
    loading: true,
    error: null,
    requiresOnboarding: false,
  });

  // --------------------------------------------------------------------------
  // refreshSession — fetch the current session from /api/auth/session
  // --------------------------------------------------------------------------
  const refreshSession = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!res.ok) {
        setState({
          user: null,
          profile: null,
          organization: null,
          memberships: [],
          loading: false,
          error: null,
          requiresOnboarding: false,
        });
        return;
      }

      const data = await res.json();

      if (!data.user) {
        setState({
          user: null,
          profile: null,
          organization: null,
          memberships: [],
          loading: false,
          error: null,
          requiresOnboarding: false,
        });
        return;
      }

      setState({
        user: data.user,
        profile: data.profile,
        organization: data.organization,
        memberships: data.memberships || [],
        loading: false,
        error: null,
        requiresOnboarding: data.requiresOnboarding || false,
      });
    } catch (err) {
      console.error('[AuthContext] refreshSession error:', err);
      setState({
        user: null,
        profile: null,
        organization: null,
        memberships: [],
        loading: false,
        error: 'Failed to load session. Please refresh the page.',
        requiresOnboarding: false,
      });
    }
  }, []);

  // --------------------------------------------------------------------------
  // login — POST to /api/auth/login
  // --------------------------------------------------------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const errorMsg = data.error || 'Login failed';
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          return { success: false, error: errorMsg };
        }

        // Update state from the login response
        setState({
          user: data.user,
          profile: data.profile,
          organization: data.organization,
          memberships: [],
          loading: false,
          error: null,
          requiresOnboarding: data.requiresOnboarding || false,
        });

        return {
          success: true,
          requiresOnboarding: data.requiresOnboarding,
        };
      } catch (err) {
        console.error('[AuthContext] login error:', err);
        const errorMsg = 'Network error. Please check your connection and try again.';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  // --------------------------------------------------------------------------
  // logout — POST to /api/auth/logout, then clear state
  // --------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[AuthContext] logout error (non-fatal):', err);
    } finally {
      setState({
        user: null,
        profile: null,
        organization: null,
        memberships: [],
        loading: false,
        error: null,
        requiresOnboarding: false,
      });
      try {
        sessionStorage.removeItem('auth_org');
        sessionStorage.removeItem('auth_memberships');
      } catch {
        // ignore
      }
    }
  }, []);

  // --------------------------------------------------------------------------
  // switchOrganization — POST to /api/auth/switch-org, then refresh
  // --------------------------------------------------------------------------
  const switchOrganization = useCallback(
    async (organizationId: string) => {
      try {
        const res = await fetch('/api/auth/switch-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ organizationId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to switch organization' };
        }

        // Refresh the full session to get updated profile + memberships
        await refreshSession();

        return { success: true };
      } catch (err) {
        console.error('[AuthContext] switchOrganization error:', err);
        return { success: false, error: 'Network error' };
      }
    },
    [refreshSession]
  );

  // --------------------------------------------------------------------------
  // clearError
  // --------------------------------------------------------------------------
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // --------------------------------------------------------------------------
  // On mount: fetch session
  // --------------------------------------------------------------------------
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // --------------------------------------------------------------------------
  // Sync across tabs (logout in one tab → logout in all)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'logout-event') {
        refreshSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshSession]);

  // --------------------------------------------------------------------------
  // Backward-compat: build LegacyCurrentUser from state
  // --------------------------------------------------------------------------
  const currentUser: LegacyCurrentUser | null = useMemo(() => {
    if (!state.user || !state.profile) return null;
    return {
      id: state.profile.id,
      email: state.profile.email || state.user.email || '',
      fullName: state.profile.fullName,
      role: state.profile.role,
      department: state.profile.department,
      jobTitle: null,
      phone: null,
      avatarUrl: null,
      organizationId: state.profile.organizationId,
      createdAt: null,
      updatedAt: null,
    };
  }, [state.user, state.profile]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshSession,
    switchOrganization,
    clearError,
    // --- Backward-compat shims ---
    isAuthenticated: !!state.user,
    currentUser,
    source: isSupabaseConfigured() ? 'supabase' as const : 'demo' as const,
    loginWithPassword: async (email: string, password: string) => {
      const result = await login(email, password);
      return result.success;
    },
    signUp: async () => ({ success: false, error: 'Use /auth/signup page' }),
    switchUser: () => {},
    restoreSession: refreshSession,
    hasPermission: (permission: Permission) => {
      if (!state.profile) return false;
      const perms = rolePermissions[state.profile.role as QmsUserRole] || [];
      return perms.includes(permission);
    },
    hasRole: (role: QmsUserRole) => {
      return state.profile?.role === role;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}