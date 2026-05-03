'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Profile, UserRole, Permission } from '@/types/qms';
import { rolePermissions } from '@/types/qms';
import { useQMSStore } from '@/lib/demo-store';

// ---------------------------------------------------------------------------
// Auth context types
// ---------------------------------------------------------------------------

interface AuthContextType {
  currentUser: Profile | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  switchUser: (userId: string) => void;
  isDemoMode: boolean;
}

const SupabaseAuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: detect demo mode
// ---------------------------------------------------------------------------

function getIsDemoMode(): boolean {
  if (typeof window === 'undefined') return true; // SSR defaults to demo
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !(url && key && !url.includes('your-project') && !url.includes('localhost'));
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const profiles = useQMSStore(state => state.profiles);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<Profile | null>(null);

  const isDemoMode = getIsDemoMode();

  // -----------------------------------------------------------------------
  // Demo mode: derive user from Zustand store
  // -----------------------------------------------------------------------
  const demoUser = useMemo(() => {
    if (loggedOut) return null;
    if (selectedUserId) {
      return profiles.find(p => p.id === selectedUserId) || null;
    }
    return profiles.find(p => p.email === 'admin@qms-demo.com') || null;
  }, [profiles, selectedUserId, loggedOut]);

  // -----------------------------------------------------------------------
  // Supabase mode: listen to auth state changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (isDemoMode) return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/browser');
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            // Fetch profile from supabase
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (data) {
              // Map snake_case to camelCase
              setSupabaseUser({
                id: data.id,
                email: data.email,
                fullName: data.full_name,
                role: data.role,
                department: data.department,
                jobTitle: data.job_title,
                phone: data.phone,
                avatarUrl: data.avatar_url,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              });
            }
          } else {
            setSupabaseUser(null);
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch {
        // Supabase not configured — fall back to demo
      }
    })();

    return () => { unsubscribe?.(); };
  }, [isDemoMode]);

  // -----------------------------------------------------------------------
  // Current user
  // -----------------------------------------------------------------------
  const currentUser = isDemoMode ? demoUser : supabaseUser;
  const isAuthenticated = currentUser !== null;

  // -----------------------------------------------------------------------
  // Login
  // -----------------------------------------------------------------------
  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    if (isDemoMode) {
      const user = profiles.find(p => p.email === email);
      if (user) {
        setSelectedUserId(user.id);
        setLoggedOut(false);
        return true;
      }
      return false;
    }

    // Supabase mode
    try {
      const { createClient } = await import('@/lib/supabase/browser');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
      return !error;
    } catch {
      return false;
    }
  }, [isDemoMode, profiles]);

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  const logout = useCallback(async () => {
    if (isDemoMode) {
      setSelectedUserId(null);
      setLoggedOut(true);
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/browser');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSupabaseUser(null);
  }, [isDemoMode]);

  // -----------------------------------------------------------------------
  // Permission & Role checks
  // -----------------------------------------------------------------------
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) return false;
    const permissions = rolePermissions[currentUser.role as UserRole] || [];
    return permissions.includes(permission);
  }, [currentUser]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!currentUser) return false;
    return currentUser.role === role;
  }, [currentUser]);

  // -----------------------------------------------------------------------
  // Switch user (demo only)
  // -----------------------------------------------------------------------
  const switchUser = useCallback((userId: string) => {
    if (!isDemoMode) return;
    const user = profiles.find(p => p.id === userId);
    if (user) {
      setSelectedUserId(user.id);
      setLoggedOut(false);
    }
  }, [isDemoMode, profiles]);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    switchUser,
    isDemoMode,
  }), [currentUser, isAuthenticated, login, logout, hasPermission, hasRole, switchUser, isDemoMode]);

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// Backward-compatible alias
export const useAuth = useSupabaseAuth;

export default SupabaseAuthProvider;
