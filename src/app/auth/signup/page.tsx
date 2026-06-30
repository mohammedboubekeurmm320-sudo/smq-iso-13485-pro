'use client';

import React, { useState } from 'react';
import { Shield, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase/mode';

/**
 * Signup page — real Supabase auth + optional org creation.
 * Only rendered when Supabase env vars are configured (live mode).
 */
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: fullName || undefined,
          createOrganization: true,
          organizationName: organizationName || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Registration failed');
        return;
      }

      const user = data.data.user;
      if (user?.requiresConfirmation) {
        setSent(true);
      } else {
        // Auto-confirmed — redirect to app
        if (user?.organization) {
          sessionStorage.setItem('auth_org', JSON.stringify(user.organization));
        }
        window.location.href = '/';
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Vérifiez votre email</h1>
          <p className="text-muted-foreground">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>
        </div>
        <a href="/auth/login" className="text-sm text-primary hover:underline">
          Retour à la connexion
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">QMS SaaS Pro</h1>
        <p className="text-muted-foreground">Creer votre compte organisation</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <input
          type="text"
          className="w-full h-12 px-4 border rounded-lg text-base"
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
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
          placeholder="Mot de passe (min. 8 caractères)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
        />
        <input
          type="text"
          className="w-full h-12 px-4 border rounded-lg text-base"
          placeholder="Nom de l'organisation"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
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
              Creer le compte
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-2">
          21 CFR Part 11 / ISO 13485 Conforme
        </p>

        <div className="text-center pt-2">
          <a
            href="/auth/login"
            className="text-sm text-primary hover:underline"
          >
            Déjà un compte ? Se connecter
          </a>
        </div>
      </form>
    </div>
  );
}