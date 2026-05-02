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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { INDUSTRY_CONFIG } from '@/types/qms';
import type { IndustryType } from '@/types/qms';
import {
  getChecklistById,
  getChecklistForIndustry,
  buildComplianceData,
  COMPLIANCE_CHECKLISTS,
} from '@/lib/compliance-checklists';
import type { ComplianceClause as ChecklistClause, ClauseCategory } from '@/lib/compliance-checklists';

// ---------------------------------------------------------------------------
// Types (for rendering)
// ---------------------------------------------------------------------------

type ClauseStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Assessed';

interface ComplianceClause {
  id: string;
  number: string;
  name: string;
  description: string;
  category: ClauseCategory;
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
// Category section labels
// ---------------------------------------------------------------------------

const CATEGORY_SECTIONS: { key: ClauseCategory; label: string }[] = [
  { key: 'quality_system', label: 'Quality System' },
  { key: 'management', label: 'Management Responsibility' },
  { key: 'resources', label: 'Resource Management' },
  { key: 'realization', label: 'Product Realization' },
  { key: 'measurement', label: 'Measurement & Analysis' },
  { key: 'improvement', label: 'Improvement' },
];

// ---------------------------------------------------------------------------
// Standard → checklist ID mapping
// ---------------------------------------------------------------------------

function standardToChecklistId(standard: string): string {
  if (standard.includes('IVDR') || standard.includes('2017/746')) return 'ivdr';
  if (standard.includes('ICH Q10')) return 'ichq10';
  if (standard.includes('ISO 13485')) return 'iso13485';
  // Default fallback
  return 'iso13485';
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
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Overall compliance score: ${score}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
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
  const batchRecords = store.batchRecords;
  const suppliers = store.suppliers;

  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Industry config
  // -------------------------------------------------------------------------

  const industryType = orgSettings?.industry_type || 'medical_device';
  const industryConfig = INDUSTRY_CONFIG[industryType as IndustryType] || INDUSTRY_CONFIG.medical_device;
  const applicableStandards = orgSettings?.applicable_standards || [industryConfig.primaryStandard];

  // -------------------------------------------------------------------------
  // Checklist selection state — dropdown for applicable standards
  // -------------------------------------------------------------------------

  const defaultChecklistId = industryConfig.checklistId;
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(defaultChecklistId);

  // Available checklists based on applicable standards
  const availableChecklists = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; standard: string }[] = [];
    for (const standard of applicableStandards) {
      const checklistId = standardToChecklistId(standard);
      const checklist = COMPLIANCE_CHECKLISTS[checklistId];
      if (checklist && !seen.has(checklistId)) {
        seen.add(checklistId);
        result.push({ id: checklistId, name: checklist.name, standard: checklist.standard });
      }
    }
    return result;
  }, [applicableStandards]);

  // If the selected checklist is no longer available (industry changed), reset
  const activeChecklist = useMemo(() => {
    if (availableChecklists.some(c => c.id === selectedChecklistId)) {
      return COMPLIANCE_CHECKLISTS[selectedChecklistId];
    }
    return COMPLIANCE_CHECKLISTS[defaultChecklistId] || COMPLIANCE_CHECKLISTS.iso13485;
  }, [selectedChecklistId, availableChecklists, defaultChecklistId]);

  // -------------------------------------------------------------------------
  // Build ComplianceData from store
  // -------------------------------------------------------------------------

  const complianceData = useMemo(() => buildComplianceData({
    documents: documents.map(d => ({ status: d.status, type: d.type })),
    capas: capas.map(c => ({ status: c.status, rootCauseAnalysis: c.rootCauseAnalysis })),
    trainingItems: trainingItems.map(t => ({ status: t.status })),
    audits: audits.map(a => ({ status: a.status })),
    ncrs: ncrs.map(n => ({ status: n.status })),
    risks: risks.map(r => ({ status: r.status })),
    batchRecords: batchRecords.map(b => ({ status: b.status, productCode: b.productCode })),
    suppliers: suppliers.map(s => ({ status: s.status })),
    changeControls: changeControls.map(cc => ({ status: cc.status })),
    deviations: deviations.map(d => ({ status: d.status })),
  }), [documents, capas, trainingItems, audits, ncrs, risks, batchRecords, suppliers, changeControls, deviations]);

  // -------------------------------------------------------------------------
  // Toggle clause expansion
  // -------------------------------------------------------------------------

  const toggleClause = (id: string) => {
    setExpandedClauses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Compliance calculations — use industry-specific weights
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

  const riskCompliance = risks.length > 0
    ? (risks.filter(r => r.status !== 'Open').length / risks.length) * 100
    : 100;

  const batchCompliance = batchRecords.length > 0
    ? (batchRecords.filter(b => b.status === 'Released').length / batchRecords.length) * 100
    : 100;

  const supplierCompliance = suppliers.length > 0
    ? (suppliers.filter(s => s.status === 'Qualified').length / suppliers.length) * 100
    : 100;

  const w = industryConfig.complianceWeights;
  const overallScore = Math.round(
    docCompliance * w.documents +
    capaCompliance * w.capas +
    trainingCompliance * w.training +
    auditCompliance * w.audits +
    ncrResolutionRate * w.ncrs +
    riskCompliance * w.risks +
    batchCompliance * w.batchRecords +
    supplierCompliance * w.suppliers
  );

  // -------------------------------------------------------------------------
  // Build clause list from checklist + compute status
  // -------------------------------------------------------------------------

  const complianceClauses = useMemo<ComplianceClause[]>(() => {
    if (!activeChecklist) return [];

    const approvedDocs = documents.filter(d => d.status === 'Approved');
    const inReviewDocs = documents.filter(d => d.status === 'In Review');
    const closedCapas = capas.filter(c => c.status === 'Closed');
    const completedAudits = audits.filter(a => a.status === 'Completed');
    const completedTraining = trainingItems.filter(t => t.status === 'Completed');
    const closedNcrs = ncrs.filter(n => n.status === 'Closed');

    // Map checklist status to display status
    const mapStatus = (s: string): ClauseStatus => {
      switch (s) {
        case 'compliant': return 'Compliant';
        case 'partially': return 'Partially Compliant';
        case 'non_compliant': return 'Non-Compliant';
        default: return 'Not Assessed';
      }
    };

    // Build evidence for a clause based on category
    const buildEvidence = (clause: ChecklistClause): { type: string; reference: string; title: string }[] => {
      const evidence: { type: string; reference: string; title: string }[] = [];
      switch (clause.category) {
        case 'quality_system':
          evidence.push(...approvedDocs.slice(0, 3).map(d => ({
            type: 'Document', reference: d.documentNumber, title: d.title,
          })));
          evidence.push(...inReviewDocs.slice(0, 2).map(d => ({
            type: 'Document', reference: d.documentNumber, title: `${d.title} (${d.status})`,
          })));
          break;
        case 'management':
          evidence.push(...audits.slice(0, 5).map(a => ({
            type: 'Audit', reference: a.auditNumber, title: a.title,
          })));
          break;
        case 'resources':
          evidence.push(...trainingItems.slice(0, 5).map(t => ({
            type: 'Training', reference: t.type, title: t.title,
          })));
          break;
        case 'realization':
          evidence.push(...risks.slice(0, 3).map(r => ({
            type: 'Risk', reference: r.riskNumber, title: r.title,
          })));
          evidence.push(...batchRecords.slice(0, 2).map(b => ({
            type: 'Batch Record', reference: b.lotNumber, title: b.productName,
          })));
          break;
        case 'measurement':
          evidence.push(...completedAudits.slice(0, 3).map(a => ({
            type: 'Audit', reference: a.auditNumber, title: a.title,
          })));
          evidence.push(...ncrs.slice(0, 2).map(n => ({
            type: 'NCR', reference: n.ncrNumber, title: n.title,
          })));
          break;
        case 'improvement':
          evidence.push(...closedCapas.slice(0, 5).map(c => ({
            type: 'CAPA', reference: c.capaNumber, title: c.title,
          })));
          break;
      }
      return evidence;
    };

    return activeChecklist.clauses.map(clause => {
      const rawStatus = clause.computeStatus(complianceData);
      return {
        id: clause.id,
        number: clause.clause,
        name: clause.title,
        description: clause.description,
        category: clause.category,
        status: mapStatus(rawStatus),
        evidenceCount: buildEvidence(clause).length,
        evidence: buildEvidence(clause),
      };
    });
  }, [activeChecklist, documents, capas, audits, trainingItems, ncrs, risks, batchRecords, complianceData]);

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
    const openCapasList = capas.filter(c => c.status !== 'Closed');
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
    if (openCapasList.length > 5) {
      gaps.push({
        id: 'gap-open-capa',
        title: 'High Open CAPA Count',
        severity: 'Major',
        clause: '8.5',
        description: `${openCapasList.length} CAPAs are open, indicating potential systemic quality issues.`,
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
    const expiredSupplierReviews = suppliers.filter(s => s.nextReviewDate && new Date(s.nextReviewDate) < new Date());
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
  }, [documents, capas, ncrs, trainingItems, suppliers, changeControls]);

  // -------------------------------------------------------------------------
  // Clause section grouping (by category, works for all checklists)
  // -------------------------------------------------------------------------

  const clauseSections = useMemo(() => {
    return CATEGORY_SECTIONS
      .map(section => ({
        ...section,
        clauses: complianceClauses.filter(c => c.category === section.key),
      }))
      .filter(section => section.clauses.length > 0);
  }, [complianceClauses]);

  // -------------------------------------------------------------------------
  // Summary counts
  // -------------------------------------------------------------------------

  const statusCounts = useMemo(() => {
    const counts = { Compliant: 0, 'Partially Compliant': 0, 'Non-Compliant': 0, 'Not Assessed': 0 };
    complianceClauses.forEach(c => { counts[c.status]++; });
    return counts;
  }, [complianceClauses]);

  // -------------------------------------------------------------------------
  // Sub-metrics for the weighted score display
  // -------------------------------------------------------------------------

  const subMetrics = useMemo(() => [
    { label: `Document Compliance (${Math.round(w.documents * 100)}%)`, value: docCompliance, color: 'hsl(142, 76%, 36%)' },
    { label: `CAPA Compliance (${Math.round(w.capas * 100)}%)`, value: capaCompliance, color: 'hsl(0, 84%, 60%)' },
    { label: `Training (${Math.round(w.training * 100)}%)`, value: trainingCompliance, color: 'hsl(217, 91%, 60%)' },
    { label: `Audits (${Math.round(w.audits * 100)}%)`, value: auditCompliance, color: 'hsl(280, 67%, 58%)' },
    { label: `NCR Resolution (${Math.round(w.ncrs * 100)}%)`, value: ncrResolutionRate, color: 'hsl(38, 92%, 50%)' },
    { label: `Risk Management (${Math.round(w.risks * 100)}%)`, value: riskCompliance, color: 'hsl(200, 80%, 50%)' },
  ], [w, docCompliance, capaCompliance, trainingCompliance, auditCompliance, ncrResolutionRate, riskCompliance]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" aria-hidden="true" />Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Regulatory compliance tracking for {industryConfig.label} — {industryConfig.primaryStandard}
          </p>
        </div>
        {/* Checklist selector dropdown */}
        {availableChecklists.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Checklist:</span>
            <Select value={selectedChecklistId} onValueChange={setSelectedChecklistId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableChecklists.map(checklist => (
                  <SelectItem key={checklist.id} value={checklist.id}>
                    {checklist.standard}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overall Compliance Score + Sub-metrics                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Large gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Compliance Score</CardTitle>
            <CardDescription>Weighted composite — {industryConfig.label} weights</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-full max-w-[200px]">
              <ComplianceGauge score={overallScore} />
            </div>
            <div className="w-full mt-4 space-y-2.5" aria-live="polite" aria-label="Compliance score details">
              {subMetrics.map(m => (
                <MetricBar key={m.label} label={m.label} value={m.value} color={m.color} />
              ))}
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
            Standards applicable to your organization ({industryConfig.label})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {applicableStandards.map(standard => {
              const checklistId = standardToChecklistId(standard);
              const isActive = checklistId === (activeChecklist?.id || '');
              return (
                <button
                  key={standard}
                  onClick={() => {
                    const cid = standardToChecklistId(standard);
                    if (COMPLIANCE_CHECKLISTS[cid]) {
                      setSelectedChecklistId(cid);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <Shield className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{standard}</span>
                  {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Compliance Checklist (industry-specific)                          */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            {activeChecklist?.name || 'Compliance Checklist'}
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
                <div key={section.key} className="border rounded-lg overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{section.label}</span>
                      <Badge variant="outline" className="text-xs">{section.clauses.length} clauses</Badge>
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

                        {/* Expanded evidence + description */}
                        {expandedClauses.has(clause.id) && (
                          <div className="px-4 pb-3 pl-11">
                            {clause.description && (
                              <p className="text-xs text-muted-foreground mb-2">{clause.description}</p>
                            )}
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
