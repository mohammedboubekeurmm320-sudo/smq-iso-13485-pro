'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function Home() {
  return (
    <AppLayout>
      {(activeSection) => <DashboardContent activeSection={activeSection} />}
    </AppLayout>
  );
}
