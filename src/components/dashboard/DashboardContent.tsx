'use client';

import React from 'react';
import type { ActiveSection } from '@/types/qms';
import { DashboardView } from './DashboardView';
import { DocumentControlView } from './DocumentControlView';
import { PlaceholderView } from './PlaceholderView';
import { CapaView } from '@/components/modules/CapaView';
import { NcrView } from '@/components/modules/NcrView';
import { AuditView } from '@/components/modules/AuditView';
import { TrainingView } from '@/components/modules/TrainingView';
import { RiskView } from '@/components/modules/RiskView';
import { BatchRecordView } from '@/components/modules/BatchRecordView';
import { SupplierView } from '@/components/modules/SupplierView';
import { FormView } from '@/components/modules/FormView';
import { DocumentHierarchyView } from '@/components/modules/DocumentHierarchyView';
import { ComplianceView } from '@/components/modules/ComplianceView';
import { ReportsView } from '@/components/modules/ReportsView';
import { UserManagementView } from '@/components/modules/UserManagementView';

interface DashboardContentProps {
  activeSection: ActiveSection;
}

export function DashboardContent({ activeSection }: DashboardContentProps) {
  switch (activeSection) {
    case 'dashboard':
      return <DashboardView />;
    case 'documents':
      return <DocumentControlView />;
    case 'document-hierarchy':
      return <DocumentHierarchyView />;
    case 'ncr':
      return <NcrView />;
    case 'capa':
      return <CapaView />;
    case 'audits':
      return <AuditView />;
    case 'risks':
      return <RiskView />;
    case 'training':
      return <TrainingView />;
    case 'change-control':
      return <PlaceholderView title="Change Control" description="Manage change requests and approvals" icon="ArrowLeftRight" />;
    case 'deviations':
      return <PlaceholderView title="Déviations" description="Record and manage process deviations" icon="AlertOctagon" />;
    case 'batch-records':
      return <BatchRecordView />;
    case 'suppliers':
      return <SupplierView />;
    case 'oos-oot':
      return <PlaceholderView title="OOS/OOT" description="Out of Specification / Out of Trend investigations" icon="FlaskConical" />;
    case 'forms':
      return <FormView />;
    case 'reports':
      return <ReportsView />;
    case 'compliance':
      return <ComplianceView />;
    case 'user-management':
      return <UserManagementView />;
    default:
      return <DashboardView />;
  }
}
