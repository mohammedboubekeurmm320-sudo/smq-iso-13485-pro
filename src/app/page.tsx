import { DemoApp } from '@/components/DemoApp';

/**
 * Root page — renders the full QMS application.
 *
 * In demo mode (no Supabase env vars): renders AppLayout + DashboardContent
 * directly with mock data from the Zustand demo store.
 *
 * In live mode (Supabase configured): the middleware ensures only authenticated
 * users reach this page, and the AuthContext + OrganizationContext provide real data.
 */
export const dynamic = 'force-dynamic';

export default function RootPage() {
  return <DemoApp />;
}