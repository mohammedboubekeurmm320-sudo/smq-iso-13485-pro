'use client';

import React, { useState, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn, formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  Shield,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleDot,
  XCircle,
  MinusCircle,
  Award,
  TriangleAlert,
  ArrowRight,
  Clock,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClauseStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Assessed';

interface ComplianceClause {
  id: string;
  number: string;
  name: string;
  status: ClauseStatus;
  evidenceCount: number;
  evidence: { type: string; reference: string; title: string }[];
}

interface ComplianceGap {
  id: string;
  title: string;
  severity: 'Critical' | 'Major' | 'Minor';
  clause: string;
  description: string;
  recommendedAction: string;
}

// ---------------------------------------------------------------------------
// Circular Gauge Component
// ---------------------------------------------------------------------------

function ComplianceGauge({ score, size = 180 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  let color = 'hsl(142, 76%, 36%)'; // green
  if (score < 60) color = 'hsl(0, 84%, 60%)'; // red
  else if (score < 80) color = 'hsl(38, 92%, 50%)'; // amber

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}%</span>
        <span className="text-xs text-muted-foreground">Overall Compliance</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-metric bar
// ---------------------------------------------------------------------------

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function ClauseStatusBadge({ status }: { status: ClauseStatus }) {
  const config: Record<ClauseStatus, { icon: React.ReactNode; className: string }> = {
    'Compliant': {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    'Partially Compliant': {
      icon: <CircleDot className="h-3.5 w-3.5" />,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    'Non-Compliant': {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    'Not Assessed': {
      icon: <MinusCircle className="h-3.5 w-3.5" />,
      className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    },
  };
  const c = config[status];
  return (
    <Badge className={cn('text-xs gap-1', c.className)} variant="secondary">
      {c.icon}{status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ComplianceView() {
  const store = useQMSStore();
  const { hasPermission } = useAuth();
  const { orgSettings } = useOrganization();

  const documents = store.documents;
  const capas = store.capas;
  const ncrs = store.ncrs;
  const audits = store.audits;
  const trainingItems = store.training;
  const risks = store.risks;
  const changeControls = store.changeControls;
  const deviations = store.deviations;

  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  const toggleClause = (id: string) => {
    setExpandedClauses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Compliance calculations
  // -------------------------------------------------------------------------

  const docCompliance = documents.length > 0
    ? (documents.filter(d => d.status === 'Approved').length / documents.length) * 100
    : 0;

  const capaCompliance = capas.length > 0
    ? (capas.filter(c => c.status === 'Closed').length / capas.length) * 100
    : 100;

  const trainingCompliance = trainingItems.length > 0
    ? (trainingItems.filter(t => t.status === 'Completed').length / trainingItems.length) * 100
    : 100;

  const auditCompliance = audits.length > 0
    ? (audits.filter(a => a.status === 'Completed').length / audits.length) * 100
    : 100;

  const ncrResolutionRate = ncrs.length > 0
    ? (ncrs.filter(n => n.status === 'Closed').length / ncrs.length) * 100
    : 100;

  const overallScore = Math.round(
    docCompliance * 0.25 +
    capaCompliance * 0.25 +
    trainingCompliance * 0.2 +
    auditCompliance * 0.15 +
    ncrResolutionRate * 0.15
  );

  // -------------------------------------------------------------------------
  // ISO 13485:2016 Compliance Checklist
  // -------------------------------------------------------------------------

  const isoChecklist = useMemo<ComplianceClause[]>(() => {
    const approvedDocs = documents.filter(d => d.status === 'Approved');
    const inReviewDocs = documents.filter(d => d.status === 'In Review');
    const closedCapas = capas.filter(c => c.status === 'Closed');
    const openCapas = capas.filter(c => c.status !== 'Closed');
    const completedAudits = audits.filter(a => a.status === 'Completed');
    const completedTraining = trainingItems.filter(t => t.status === 'Completed');
    const closedNcrs = ncrs.filter(n => n.status === 'Closed');
    const openNcrs = ncrs.filter(n => n.status !== 'Closed');

    const computeStatus = (pct: number): ClauseStatus => {
      if (pct >= 80) return 'Compliant';
      if (pct >= 50) return 'Partially Compliant';
      if (pct > 0) return 'Non-Compliant';
      return 'Not Assessed';
    };

    return [
      // §4 Quality Management System
      {
        id: '4.1',
        number: '4.1',
        name: 'General Requirements',
        status: computeStatus(docCompliance),
        evidenceCount: documents.length,
        evidence: documents.slice(0, 5).map(d => ({
          type: 'Document',
          reference: d.documentNumber,
          title: d.title,
        })),
      },
      {
        id: '4.2',
        number: '4.2',
        name: 'Documentation Requirements',
        status: computeStatus(docCompliance),
        evidenceCount: approvedDocs.length,
        evidence: approvedDocs.slice(0, 5).map(d => ({
          type: 'Document',
          reference: d.documentNumber,
          title: d.title,
        })),
      },
      {
        id: '4.2.3',
        number: '4.2.3',
        name: 'Document Control',
        status: computeStatus(
          documents.length > 0
            ? ((approvedDocs.length + inReviewDocs.length) / documents.length) * 100
            : 0
        ),
        evidenceCount: approvedDocs.length + inReviewDocs.length,
        evidence: [...approvedDocs, ...inReviewDocs].slice(0, 5).map(d => ({
          type: 'Document',
          reference: d.documentNumber,
          title: `${d.title} (${d.status})`,
        })),
      },
      {
        id: '4.2.4',
        number: '4.2.4',
        name: 'Record Control',
        status: computeStatus(docCompliance),
        evidenceCount: documents.filter(d => d.type === 'Record' || d.type === 'Form').length,
        evidence: documents.filter(d => d.type === 'Record' || d.type === 'Form').slice(0, 5).map(d => ({
          type: 'Document',
          reference: d.documentNumber,
          title: d.title,
        })),
      },

      // §5 Management Responsibility
      {
        id: '5',
        number: '5',
        name: 'Management Responsibility',
        status: computeStatus(auditCompliance),
        evidenceCount: audits.length,
        evidence: audits.slice(0, 5).map(a => ({
          type: 'Audit',
          reference: a.auditNumber,
          title: a.title,
        })),
      },

      // §6 Resource Management
      {
        id: '6',
        number: '6',
        name: 'Resource Management',
        status: computeStatus(trainingCompliance),
        evidenceCount: trainingItems.length,
        evidence: trainingItems.slice(0, 5).map(t => ({
          type: 'Training',
          reference: t.type,
          title: t.title,
        })),
      },

      // §7 Product Realization
      {
        id: '7.1',
        number: '7.1',
        name: 'Planning of Product Realization',
        status: computeStatus(risks.length > 0 ? ((risks.filter(r => r.status !== 'Open').length / risks.length) * 100) : 0),
        evidenceCount: risks.length,
        evidence: risks.slice(0, 5).map(r => ({
          type: 'Risk',
          reference: r.riskNumber,
          title: r.title,
        })),
      },
      {
        id: '7.5',
        number: '7.5',
        name: 'Production and Service Provision',
        status: computeStatus(
          store.batchRecords.length > 0
            ? (store.batchRecords.filter(b => b.status === 'Released').length / store.batchRecords.length) * 100
            : 0
        ),
        evidenceCount: store.batchRecords.length,
        evidence: store.batchRecords.slice(0, 5).map(b => ({
          type: 'Batch Record',
          reference: b.lotNumber,
          title: b.productName,
        })),
      },
      {
        id: '7.5.6',
        number: '7.5.6',
        name: 'Validation of Processes',
        status: computeStatus(docCompliance),
        evidenceCount: documents.filter(d => d.type === 'Validation Protocol').length,
        evidence: documents.filter(d => d.type === 'Validation Protocol').slice(0, 5).map(d => ({
          type: 'Document',
          reference: d.documentNumber,
          title: d.title,
        })),
      },
      {
        id: '7.5.9',
        number: '7.5.9',
        name: 'Traceability',
        status: computeStatus(
          store.batchRecords.length > 0
            ? (store.batchRecords.filter(b => b.productCode).length / store.batchRecords.length) * 100
            : 0
        ),
        evidenceCount: store.batchRecords.filter(b => b.productCode).length,
        evidence: store.batchRecords.filter(b => b.productCode).slice(0, 5).map(b => ({
          type: 'Batch Record',
          reference: b.lotNumber,
          title: `${b.productName} (${b.productCode})`,
        })),
      },

      // §8 Measurement, Analysis, Improvement
      {
        id: '8.2',
        number: '8.2',
        name: 'Monitoring and Measurement',
        status: computeStatus(auditCompliance),
        evidenceCount: completedAudits.length,
        evidence: completedAudits.slice(0, 5).map(a => ({
          type: 'Audit',
          reference: a.auditNumber,
          title: a.title,
        })),
      },
      {
        id: '8.3',
        number: '8.3',
        name: 'Non-Conforming Product',
        status: computeStatus(ncrResolutionRate),
        evidenceCount: ncrs.length,
        evidence: ncrs.slice(0, 5).map(n => ({
          type: 'NCR',
          reference: n.ncrNumber,
          title: n.title,
        })),
      },
      {
        id: '8.4',
        number: '8.4',
        name: 'Analysis of Data',
        status: computeStatus(
          capas.length > 0
            ? (capas.filter(c => c.rootCauseAnalysis).length / capas.length) * 100
            : 0
        ),
        evidenceCount: capas.filter(c => c.rootCauseAnalysis).length,
        evidence: capas.filter(c => c.rootCauseAnalysis).slice(0, 5).map(c => ({
          type: 'CAPA',
          reference: c.capaNumber,
          title: c.title,
        })),
      },
      {
        id: '8.5',
        number: '8.5',
        name: 'Improvement',
        status: computeStatus(capaCompliance),
        evidenceCount: closedCapas.length,
        evidence: closedCapas.slice(0, 5).map(c => ({
          type: 'CAPA',
          reference: c.capaNumber,
          title: c.title,
        })),
      },
    ];
  }, [documents, capas, ncrs, audits, trainingItems, risks, store.batchRecords, docCompliance, capaCompliance, trainingCompliance, auditCompliance, ncrResolutionRate]);

  // -------------------------------------------------------------------------
  // Compliance Gaps
  // -------------------------------------------------------------------------

  const complianceGaps = useMemo<ComplianceGap[]>(() => {
    const gaps: ComplianceGap[] = [];

    // Document compliance gaps
    const draftDocs = documents.filter(d => d.status === 'Draft').length;
    const inReviewDocs = documents.filter(d => d.status === 'In Review').length;
    if (draftDocs > 0) {
      gaps.push({
        id: 'gap-draft-docs',
        title: 'Unapproved Documents',
        severity: draftDocs > 5 ? 'Major' : 'Minor',
        clause: '4.2.3',
        description: `${draftDocs} document(s) are in Draft status and require review and approval.`,
        recommendedAction: 'Prioritize review and approval of draft documents to meet document control requirements.',
      });
    }
    if (inReviewDocs > 0) {
      gaps.push({
        id: 'gap-inreview-docs',
        title: 'Documents Pending Review',
        severity: inReviewDocs > 3 ? 'Major' : 'Minor',
        clause: '4.2.3',
        description: `${inReviewDocs} document(s) are In Review and awaiting approval.`,
        recommendedAction: 'Complete document reviews to maintain document control compliance.',
      });
    }

    // CAPA gaps
    const openCapas = capas.filter(c => c.status !== 'Closed');
    const overdueCapas = capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date());
    if (overdueCapas.length > 0) {
      gaps.push({
        id: 'gap-overdue-capa',
        title: 'Overdue CAPAs',
        severity: 'Critical',
        clause: '8.5',
        description: `${overdueCapas.length} CAPA(s) are past their due date without closure.`,
        recommendedAction: 'Escalate overdue CAPAs and allocate additional resources for closure.',
      });
    }
    if (openCapas.length > 5) {
      gaps.push({
        id: 'gap-open-capa',
        title: 'High Open CAPA Count',
        severity: 'Major',
        clause: '8.5',
        description: `${openCapas.length} CAPAs are open, indicating potential systemic quality issues.`,
        recommendedAction: 'Conduct management review of open CAPAs and prioritize closure.',
      });
    }

    // NCR gaps
    const criticalNcrs = ncrs.filter(n => n.severity === 'Critical' && n.status !== 'Closed');
    if (criticalNcrs.length > 0) {
      gaps.push({
        id: 'gap-critical-ncr',
        title: 'Open Critical NCRs',
        severity: 'Critical',
        clause: '8.3',
        description: `${criticalNcrs.length} critical non-conformance(s) remain unresolved.`,
        recommendedAction: 'Immediately address critical NCRs and implement containment actions.',
      });
    }

    // Training gaps
    const overdueTraining = trainingItems.filter(t => t.status === 'Overdue' || (t.status !== 'Completed' && new Date(t.dueDate) < new Date()));
    if (overdueTraining.length > 0) {
      gaps.push({
        id: 'gap-overdue-training',
        title: 'Overdue Training',
        severity: overdueTraining.length > 3 ? 'Major' : 'Minor',
        clause: '6',
        description: `${overdueTraining.length} training item(s) are overdue for completion.`,
        recommendedAction: 'Schedule and complete overdue training to ensure competency compliance.',
      });
    }

    // Supplier gaps
    const disqualifiedSuppliers = store.suppliers.filter(s => s.status === 'Disqualified');
    const expiredSupplierReviews = store.suppliers.filter(s => s.nextReviewDate && new Date(s.nextReviewDate) < new Date());
    if (expiredSupplierReviews.length > 0) {
      gaps.push({
        id: 'gap-supplier-review',
        title: 'Overdue Supplier Reviews',
        severity: 'Minor',
        clause: '7.5',
        description: `${expiredSupplierReviews.length} supplier(s) have overdue qualification reviews.`,
        recommendedAction: 'Schedule and complete supplier re-evaluation activities.',
      });
    }

    // Change control gaps
    const openChangeControls = changeControls.filter(cc => cc.status !== 'Completed' && cc.status !== 'Rejected');
    if (openChangeControls.length > 3) {
      gaps.push({
        id: 'gap-open-cc',
        title: 'Pending Change Controls',
        severity: 'Minor',
        clause: '7.1',
        description: `${openChangeControls.length} change control(s) are pending completion.`,
        recommendedAction: 'Review and advance pending change controls through the approval workflow.',
      });
    }

    return gaps;
  }, [documents, capas, ncrs, trainingItems, store.suppliers, changeControls]);

  // -------------------------------------------------------------------------
  // Applicable standards
  // -------------------------------------------------------------------------

  const applicableStandards = orgSettings?.applicable_standards || ['ISO 13485:2016'];

  // -------------------------------------------------------------------------
  // Clause section grouping
  // -------------------------------------------------------------------------

  const clauseSections = [
    { section: '§4', title: 'Quality Management System', clauses: isoChecklist.filter(c => c.number.startsWith('4')) },
    { section: '§5', title: 'Management Responsibility', clauses: isoChecklist.filter(c => c.number.startsWith('5')) },
    { section: '§6', title: 'Resource Management', clauses: isoChecklist.filter(c => c.number.startsWith('6')) },
    { section: '§7', title: 'Product Realization', clauses: isoChecklist.filter(c => c.number.startsWith('7')) },
    { section: '§8', title: 'Measurement, Analysis, Improvement', clauses: isoChecklist.filter(c => c.number.startsWith('8')) },
  ];

  // -------------------------------------------------------------------------
  // Summary counts
  // -------------------------------------------------------------------------

  const statusCounts = useMemo(() => {
    const counts = { Compliant: 0, 'Partially Compliant': 0, 'Non-Compliant': 0, 'Not Assessed': 0 };
    isoChecklist.forEach(c => { counts[c.status]++; });
    return counts;
  }, [isoChecklist]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  if (!hasPermission('compliance.view')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground text-sm mt-1">You do not have permission to view compliance data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />Compliance
        </h1>
        <p className="text-muted-foreground mt-1">Regulatory compliance tracking, ISO 13485:2016 checklist, and gap analysis</p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overall Compliance Score + Sub-metrics                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Large gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Compliance Score</CardTitle>
            <CardDescription>Weighted composite of five key areas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ComplianceGauge score={overallScore} />
            <div className="w-full mt-4 space-y-2.5">
              <MetricBar label="Document Compliance (25%)" value={docCompliance} color="hsl(142, 76%, 36%)" />
              <MetricBar label="CAPA Compliance (25%)" value={capaCompliance} color="hsl(0, 84%, 60%)" />
              <MetricBar label="Training Compliance (20%)" value={trainingCompliance} color="hsl(217, 91%, 60%)" />
              <MetricBar label="Audit Compliance (15%)" value={auditCompliance} color="hsl(280, 67%, 58%)" />
              <MetricBar label="NCR Resolution Rate (15%)" value={ncrResolutionRate} color="hsl(38, 92%, 50%)" />
            </div>
          </CardContent>
        </Card>

        {/* Status overview cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts.Compliant}</p>
                    <p className="text-xs text-muted-foreground">Compliant</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <CircleDot className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts['Partially Compliant']}</p>
                    <p className="text-xs text-muted-foreground">Partial</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts['Non-Compliant']}</p>
                    <p className="text-xs text-muted-foreground">Non-Compliant</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <MinusCircle className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts['Not Assessed']}</p>
                    <p className="text-xs text-muted-foreground">Not Assessed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Approved Documents</span>
                <span className="font-medium">{documents.filter(d => d.status === 'Approved').length}/{documents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Closed CAPAs</span>
                <span className="font-medium">{capas.filter(c => c.status === 'Closed').length}/{capas.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed Training</span>
                <span className="font-medium">{trainingItems.filter(t => t.status === 'Completed').length}/{trainingItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed Audits</span>
                <span className="font-medium">{audits.filter(a => a.status === 'Completed').length}/{audits.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Closed NCRs</span>
                <span className="font-medium">{ncrs.filter(n => n.status === 'Closed').length}/{ncrs.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Compliance Gaps</span>
                <span className="font-semibold text-red-600">{complianceGaps.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              Compliance Gaps
              <Badge variant="destructive" className="ml-auto">{complianceGaps.length}</Badge>
            </CardTitle>
            <CardDescription>Identified gaps requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {complianceGaps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No compliance gaps identified.</p>
              )}
              {complianceGaps.map(gap => (
                <div
                  key={gap.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    gap.severity === 'Critical'
                      ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                      : gap.severity === 'Major'
                        ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{gap.title}</p>
                        <Badge
                          className={cn(
                            'text-xs shrink-0',
                            gap.severity === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            gap.severity === 'Major' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}
                          variant="secondary"
                        >
                          {gap.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Clause §{gap.clause}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{gap.description}</p>
                  <div className="mt-2 flex items-start gap-1.5">
                    <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <p className="text-xs">{gap.recommendedAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Applicable Standards                                              */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Applicable Standards
          </CardTitle>
          <CardDescription>
            Standards applicable to your organization ({orgSettings?.industry_type?.replace('_', ' ') || 'N/A'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {applicableStandards.map(standard => (
              <div
                key={standard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/30"
              >
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{standard}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* ISO 13485:2016 Compliance Checklist                               */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            ISO 13485:2016 Compliance Checklist
          </CardTitle>
          <CardDescription>
            Assessment of compliance by clause — status calculated from actual QMS data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clauseSections.map(section => {
              const sectionCompliant = section.clauses.filter(c => c.status === 'Compliant').length;
              const sectionTotal = section.clauses.length;
              const sectionPct = sectionTotal > 0 ? Math.round((sectionCompliant / sectionTotal) * 100) : 0;

              return (
                <div key={section.section} className="border rounded-lg overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{section.section}</span>
                      <span className="text-sm text-muted-foreground">{section.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={sectionPct} className="w-24 h-1.5" />
                      <span className="text-xs text-muted-foreground">{sectionPct}%</span>
                    </div>
                  </div>

                  {/* Clauses */}
                  <div className="divide-y">
                    {section.clauses.map(clause => (
                      <div key={clause.id}>
                        <button
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors text-left"
                          onClick={() => toggleClause(clause.id)}
                        >
                          {expandedClauses.has(clause.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">§{clause.number}</span>
                              <span className="text-sm font-medium truncate">{clause.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {clause.evidenceCount}
                            </Badge>
                            <ClauseStatusBadge status={clause.status} />
                          </div>
                        </button>

                        {/* Expanded evidence */}
                        {expandedClauses.has(clause.id) && (
                          <div className="px-4 pb-3 pl-11">
                            <div className="rounded-lg border bg-muted/10 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Supporting Evidence ({clause.evidence.length} of {clause.evidenceCount})
                              </p>
                              {clause.evidence.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No evidence records found.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {clause.evidence.map((ev, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                        {ev.type}
                                      </Badge>
                                      <span className="font-mono text-muted-foreground">{ev.reference}</span>
                                      <span className="truncate">{ev.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
