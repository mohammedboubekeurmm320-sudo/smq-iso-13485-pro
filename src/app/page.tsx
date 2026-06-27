'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveSection } from '@/types/qms';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = React.useState('');

  // Show landing/login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">QMS SaaS Pro</h1>
          <p className="text-muted-foreground">ISO 13485:2016 Quality Management System</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            className="w-full h-12 px-4 border rounded-lg text-base"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={() => login(email)}
          >
            Connexion
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            21 CFR Part 11 / ISO 13485 Conforme
          </p>
        </div>
      </div>
    );
  }

  // Authenticated: render the full QMS app
  return (
    <AppLayout>
      {(activeSection: ActiveSection) => (
        <DashboardContent activeSection={activeSection} />
      )}
    </AppLayout>
  );
}
