'use client';

import React, { useState } from 'react';
import { Shield, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase/mode';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Login page — real Supabase auth.
 * Only rendered when Supabase env vars are configured (live mode).
 * In demo mode, the root page.tsx handles login via AuthContext.
 */
export default function LoginPage() {
  const { loginWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If loaded in demo mode, show a message instead of redirecting
  // (redirecting here causes infinite loop with middleware auth enforcement)
  const [demoMode, setDemoMode] = React.useState(false);
  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDemoMode(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Login] handleSubmit fired — email:', email, 'isLive:', isSupabaseConfigured());
    setError('');
    setLoading(true);

    if (!email.trim() || !password) {
      setError('Veuillez saisir email et mot de passe');
      setLoading(false);
      return;
    }

    try {
      const ok = await loginWithPassword(email, password);
      console.log('[Login] loginWithPassword returned:', ok);
      if (!ok) {
        setError('Email ou mot de passe incorrect');
        return;
      }
      // Full page reload — guarantees the browser sends the new session
      // cookies that were just set by the login API response.
      window.location.href = '/';
    } catch (err) {
      console.error('[Login] Exception:', err);
      setError('Erreur reseau. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">QMS SaaS Pro</h1>
        <p className="text-muted-foreground">ISO 13485:2016 Quality Management System</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <input
          type="email"
          className="w-full h-12 px-4 border rounded-lg text-base"
          placeholder="Email professionnel"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          className="w-full h-12 px-4 border rounded-lg text-base"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button
          type="submit"
          size="lg"
          className="w-full h-12 text-base"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Connexion
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-2">
          21 CFR Part 11 / ISO 13485 Conforme
        </p>

        <div className="text-center pt-2">
          <a
            href="/auth/signup"
            className="text-sm text-primary hover:underline"
          >
            Pas de compte ? Creer un compte
          </a>
        </div>
      </form>
    </div>
  );
}