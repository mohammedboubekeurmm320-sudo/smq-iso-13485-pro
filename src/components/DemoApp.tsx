'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

/**
 * Client-side app shell that renders the full QMS application.
 * Used in demo mode when no Supabase is configured — renders
 * AppLayout + DashboardContent with mock data from the Zustand demo store.
 */
export function DemoApp() {
  return (
    <AppLayout>
      {(activeSection) => <DashboardContent activeSection={activeSection} />}
    </AppLayout>
  );
}