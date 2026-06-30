'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { ActiveSection } from '@/types/qms';
import { Shield, ArrowRight, AlertCircle, Loader2, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase/mode';
import { CreateOrganizationDialog } from '@/components/setup/CreateOrganizationDialog';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Loading spinner for Suspense boundary
// ---------------------------------------------------------------------------
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Chargement...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo login screen (existing behavior)
// ---------------------------------------------------------------------------
function DemoLoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">QMS SaaS Pro</h1>
        <p className="text-muted-foreground">ISO 13485:2016 Quality Management System</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Mode démonstration
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="email"
          className="w-full h-12 px-4 border rounded-lg text-base"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login(email)}
        />
        <Button
          size="lg"
          className="w-full h-12 text-base"
          onClick={() => login(email)}
        >
          Connexion (Démo)
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          21 CFR Part 11 / ISO 13485 Conforme
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supabase login form (inline, for the root page redirect)
// ---------------------------------------------------------------------------
function SupabaseLoginForm() {
  const { loginWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await loginWithPassword(email, password);
    if (!ok) {
      setError('Email ou mot de passe invalide');
    }
    setLoading(false);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
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
          minLength={8}
        />
        <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connexion'}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          21 CFR Part 11 / ISO 13485 Conforme
        </p>
        <div className="flex justify-center gap-4 pt-2 text-sm">
          <Link href="/auth/signup" className="text-primary hover:underline">
            Creer un compte
          </Link>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-demand organization creation screen
// (Shown when user is authenticated but has no organization)
// ---------------------------------------------------------------------------
function OnboardScreen() {
  const { createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industryType, setIndustryType] = useState('medical_device');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const org = await createOrganization({
      name: name.trim(),
      industryType: industryType as import('@/types/qms').IndustryType,
    });
    if (!org) {
      setError('Échec de la création. Vérifiez le nom et réessayez.');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">Bienvenue sur QMS SaaS Pro</h1>
          <p className="text-muted-foreground">
            Pour commencer, créez votre organisation. Vous serez automatiquement
            désigné propriétaire (owner) de l&apos;organisation.
          </p>
        </div>

        <form onSubmit={handleQuickCreate} className="flex flex-col gap-3 w-full max-w-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom de l&apos;organisation *</label>
            <input
              type="text"
              className="w-full h-12 px-4 border rounded-lg text-base"
              placeholder="Ex: MedTech Solutions SARL"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(
                  e.target.value
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                    .slice(0, 60),
                );
              }}
              required
              minLength={2}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Identifiant (slug)</label>
            <input
              type="text"
              className="w-full h-12 px-4 border rounded-lg text-base font-mono"
              placeholder="medtech-solutions"
              value={slug}
              readOnly
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Secteur d&apos;activité</label>
            <select
              className="w-full h-12 px-4 border rounded-lg text-base bg-background"
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
            >
              <option value="medical_device">Dispositif Medical</option>
              <option value="pharmaceutical">Pharmaceutique</option>
              <option value="biotech">Biotechnologie</option>
              <option value="ivd">Diagnostic In Vitro (IVD)</option>
              <option value="combination_product">Produit Combiné</option>
            </select>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base mt-2"
            disabled={loading || name.trim().length < 2}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Creer l&apos;organisation
              </>
            )}
          </Button>
        </form>
      </div>

      <CreateOrganizationDialog
        open={orgDialogOpen}
        onClose={() => setOrgDialogOpen(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function Home() {
  const { isAuthenticated, loading: authLoading, source } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrganization();
  const isLive = isSupabaseConfigured();

  // Loading state (Supabase session restore)
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Unauthenticated — show login
  if (!isAuthenticated) {
    if (isLive) {
      return <SupabaseLoginForm />;
    }
    return <DemoLoginScreen />;
  }

  // Authenticated but no organization — show onboarding
  if (!currentOrg && !orgLoading) {
    return <OnboardScreen />;
  }

  // Loading organization
  if (orgLoading) {
    return <LoadingScreen />;
  }

  // Fully authenticated with organization — render the app
  return (
    <AppLayout>
      {(activeSection: ActiveSection) => (
        <DashboardContent activeSection={activeSection} />
      )}
    </AppLayout>
  );
}