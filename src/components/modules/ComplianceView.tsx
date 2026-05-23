'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  Download,
  Search,
  ChevronLeftIcon,
  ChevronRightIcon,
  BarChart3,
  TrendingUp,
  GraduationCap,
  ClipboardCheck,
  ShieldAlert,
  FolderOpen,
  Truck,
  Package,
  PenLine,
  Users,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { INDUSTRY_CONFIG } from '@/types/qms';
import type { IndustryType, AuditAction } from '@/types/qms';
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
// Audit trail filter constants
// ---------------------------------------------------------------------------

const AUDIT_ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'LOGIN', 'EXPORT'];

const TABLE_MODULES = [
  { value: 'all', label: 'All Modules' },
  { value: 'Document', label: 'Documents' },
  { value: 'Capa', label: 'CAPA' },
  { value: 'NonConformance', label: 'NCR' },
  { value: 'Audit', label: 'Audits' },
  { value: 'Risk', label: 'Risks' },
  { value: 'Training', label: 'Training' },
  { value: 'BatchRecord', label: 'Batch Records' },
  { value: 'Supplier', label: 'Suppliers' },
  { value: 'ChangeControl', label: 'Change Controls' },
  { value: 'Deviation', label: 'Deviations' },
  { value: 'FormTemplate', label: 'Form Templates' },
  { value: 'FormInstance', label: 'Form Instances' },
  { value: 'Profile', label: 'Profiles' },
];

const ITEMS_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// Report templates
// ---------------------------------------------------------------------------

const REPORT_TEMPLATES = [
  {
    id: 'rt-capa',
    title: 'CAPA Summary',
    description: 'Overview of all CAPAs with status breakdown, aging analysis, and effectiveness metrics.',
    icon: ClipboardCheck,
    color: 'text-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'rt-ncr',
    title: 'NCR Trend',
    description: 'Trend analysis of non-conformances by type, severity, and source over time.',
    icon: TrendingUp,
    color: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'rt-training',
    title: 'Training Compliance',
    description: 'Training completion rates, overdue items, and competency gap analysis.',
    icon: GraduationCap,
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'rt-audit',
    title: 'Audit Findings',
    description: 'Summary of audit findings, classification, and corrective action status.',
    icon: ShieldAlert,
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'rt-risk',
    title: 'Risk Assessment',
    description: 'Risk matrix, RPN distribution, and mitigation effectiveness report.',
    icon: BarChart3,
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'rt-docs',
    title: 'Document Status',
    description: 'Document lifecycle status, review cycle tracking, and approval metrics.',
    icon: FolderOpen,
    color: 'text-teal-500',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
  {
    id: 'rt-supplier',
    title: 'Supplier Performance',
    description: 'Supplier qualification status, performance scores, and review schedule.',
    icon: Truck,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  {
    id: 'rt-batch',
    title: 'Batch Release',
    description: 'Batch record status, QA release metrics, and manufacturing compliance.',
    icon: Package,
    color: 'text-cyan-500',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

// ---------------------------------------------------------------------------
// Standard -> checklist ID mapping
// ---------------------------------------------------------------------------

function standardToChecklistId(standard: string): string {
  if (standard.includes('IVDR') || standard.includes('2017/746')) return 'ivdr';
  if (standard.includes('ICH Q10')) return 'ichq10';
  if (standard.includes('ISO 13485')) return 'iso13485';
  // Default fallback
  return 'iso13485';
}

// ---------------------------------------------------------------------------
// CSV Export utility
// ---------------------------------------------------------------------------

function exportAuditTrailCSV(data: { timestamp: string; action: string; tableName: string; recordId: string; user: string; details: string }[]) {
  const headers = ['Timestamp', 'Action', 'Table/Module', 'Record ID', 'User', 'Details'];
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      [row.timestamp, row.action, row.tableName, row.recordId, `"${row.user}"`, `"${row.details.replace(/"/g, '""')}"`].join(',')
    ),
  ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
// Action badge for audit trail
// ---------------------------------------------------------------------------

function AuditActionBadge({ action }: { action: AuditAction }) {
  const config: Record<AuditAction, { className: string }> = {
    'CREATE': { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    'UPDATE': { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    'DELETE': { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    'APPROVE': { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    'REJECT': { className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    'SIGN': { className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    'LOGIN': { className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    'EXPORT': { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  const c = config[action];
  return (
    <Badge className={cn('text-xs font-mono', c.className)} variant="secondary">
      {action}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Compliance Category Card (enhanced with percentage bar & expand)
// ---------------------------------------------------------------------------

interface CategoryCardData {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  numerator: number;
  denominator: number;
  color: string;
  details: string[];
}

function ComplianceCategoryCard({ card, expanded, onToggle }: { card: CategoryCardData; expanded: boolean; onToggle: () => void }) {
  const barColor = card.value >= 80 ? 'hsl(142, 76%, 36%)' : card.value >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full p-4 hover:bg-muted/20 transition-colors text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('p-2 rounded-lg', card.color)}>
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{card.label}</span>
              <span className="text-sm font-bold" style={{ color: barColor }}>{Math.round(card.value)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${card.value}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
          <div className="shrink-0 ml-1">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{card.numerator}/{card.denominator} compliant</p>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-3" />
          <ul className="space-y-1.5">
            {card.details.map((detail, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
  const auditTrails = store.auditTrails;

  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Audit trail filter state
  // -------------------------------------------------------------------------

  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditTableFilter, setAuditTableFilter] = useState<string>('all');
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditPage, setAuditPage] = useState(1);

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

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
  // Compliance category cards (enhanced)
  // -------------------------------------------------------------------------

  const categoryCards = useMemo<CategoryCardData[]>(() => [
    {
      key: 'documents',
      label: 'Document Control',
      icon: <FileText className="h-4 w-4 text-green-600" />,
      value: docCompliance,
      numerator: documents.filter(d => d.status === 'Approved').length,
      denominator: documents.length,
      color: 'bg-green-100 dark:bg-green-900/30',
      details: [
        `${documents.filter(d => d.status === 'Approved').length} Approved`,
        `${documents.filter(d => d.status === 'In Review').length} In Review`,
        `${documents.filter(d => d.status === 'Draft').length} Draft`,
        `${documents.filter(d => d.status === 'Obsolete').length} Obsolete`,
      ],
    },
    {
      key: 'capas',
      label: 'CAPA Management',
      icon: <ClipboardCheck className="h-4 w-4 text-red-600" />,
      value: capaCompliance,
      numerator: capas.filter(c => c.status === 'Closed').length,
      denominator: capas.length,
      color: 'bg-red-100 dark:bg-red-900/30',
      details: [
        `${capas.filter(c => c.status === 'Open').length} Open`,
        `${capas.filter(c => c.status === 'Investigation').length} Investigation`,
        `${capas.filter(c => c.status === 'Implementation').length} Implementation`,
        `${capas.filter(c => c.status === 'Effectiveness Check').length} Effectiveness Check`,
        `${capas.filter(c => c.status === 'Closed').length} Closed`,
      ],
    },
    {
      key: 'training',
      label: 'Training Compliance',
      icon: <GraduationCap className="h-4 w-4 text-blue-600" />,
      value: trainingCompliance,
      numerator: trainingItems.filter(t => t.status === 'Completed').length,
      denominator: trainingItems.length,
      color: 'bg-blue-100 dark:bg-blue-900/30',
      details: [
        `${trainingItems.filter(t => t.status === 'Completed').length} Completed`,
        `${trainingItems.filter(t => t.status === 'In Progress').length} In Progress`,
        `${trainingItems.filter(t => t.status === 'Planned').length} Planned`,
        `${trainingItems.filter(t => t.status === 'Overdue').length} Overdue`,
      ],
    },
    {
      key: 'audits',
      label: 'Audit Management',
      icon: <ShieldAlert className="h-4 w-4 text-purple-600" />,
      value: auditCompliance,
      numerator: audits.filter(a => a.status === 'Completed').length,
      denominator: audits.length,
      color: 'bg-purple-100 dark:bg-purple-900/30',
      details: [
        `${audits.filter(a => a.status === 'Planned').length} Planned`,
        `${audits.filter(a => a.status === 'In Progress').length} In Progress`,
        `${audits.filter(a => a.status === 'Completed').length} Completed`,
      ],
    },
    {
      key: 'ncrs',
      label: 'NCR Resolution',
      icon: <TriangleAlert className="h-4 w-4 text-amber-600" />,
      value: ncrResolutionRate,
      numerator: ncrs.filter(n => n.status === 'Closed').length,
      denominator: ncrs.length,
      color: 'bg-amber-100 dark:bg-amber-900/30',
      details: [
        `${ncrs.filter(n => n.status === 'Open').length} Open`,
        `${ncrs.filter(n => n.status === 'Under Investigation').length} Under Investigation`,
        `${ncrs.filter(n => n.status === 'Pending Disposition').length} Pending Disposition`,
        `${ncrs.filter(n => n.status === 'Closed').length} Closed`,
      ],
    },
    {
      key: 'risks',
      label: 'Risk Management',
      icon: <BarChart3 className="h-4 w-4 text-orange-600" />,
      value: riskCompliance,
      numerator: risks.filter(r => r.status !== 'Open').length,
      denominator: risks.length,
      color: 'bg-orange-100 dark:bg-orange-900/30',
      details: [
        `${risks.filter(r => r.status === 'Open').length} Open`,
        `${risks.filter(r => r.status === 'Mitigated').length} Mitigated`,
        `${risks.filter(r => r.status === 'Accepted').length} Accepted`,
        `${risks.filter(r => r.status === 'Closed').length} Closed`,
      ],
    },
    {
      key: 'batch',
      label: 'Batch Records',
      icon: <Package className="h-4 w-4 text-cyan-600" />,
      value: batchCompliance,
      numerator: batchRecords.filter(b => b.status === 'Released').length,
      denominator: batchRecords.length,
      color: 'bg-cyan-100 dark:bg-cyan-900/30',
      details: [
        `${batchRecords.filter(b => b.status === 'In Progress').length} In Progress`,
        `${batchRecords.filter(b => b.status === 'Pending QA Review').length} Pending QA Review`,
        `${batchRecords.filter(b => b.status === 'Released').length} Released`,
        `${batchRecords.filter(b => b.status === 'Rejected').length} Rejected`,
      ],
    },
    {
      key: 'suppliers',
      label: 'Supplier Qualification',
      icon: <Truck className="h-4 w-4 text-indigo-600" />,
      value: supplierCompliance,
      numerator: suppliers.filter(s => s.status === 'Qualified').length,
      denominator: suppliers.length,
      color: 'bg-indigo-100 dark:bg-indigo-900/30',
      details: [
        `${suppliers.filter(s => s.status === 'Qualified').length} Qualified`,
        `${suppliers.filter(s => s.status === 'Conditional').length} Conditional`,
        `${suppliers.filter(s => s.status === 'Under Evaluation').length} Under Evaluation`,
        `${suppliers.filter(s => s.status === 'Disqualified').length} Disqualified`,
      ],
    },
  ], [docCompliance, capaCompliance, trainingCompliance, auditCompliance, ncrResolutionRate, riskCompliance, batchCompliance, supplierCompliance, documents, capas, trainingItems, audits, ncrs, risks, batchRecords, suppliers]);

  // -------------------------------------------------------------------------
  // Pending Signatures counts
  // -------------------------------------------------------------------------

  const pendingSignatures = useMemo(() => {
    const docsAwaitingApproval = documents.filter(d => d.status === 'In Review').length;
    const openCapasCount = capas.filter(c => c.status !== 'Closed').length;
    // Pending signatures = documents in review + change controls pending approval
    const pendingSigs = documents.filter(d => d.status === 'In Review').length +
      changeControls.filter(cc => cc.status === 'Under Review' || cc.status === 'Requested').length;
    return { docsAwaitingApproval, openCapasCount, pendingSigs };
  }, [documents, capas, changeControls]);

  // -------------------------------------------------------------------------
  // Audit trail: filtered data
  // -------------------------------------------------------------------------

  const filteredAuditTrail = useMemo(() => {
    let data = [...auditTrails];

    // Action filter
    if (auditActionFilter !== 'all') {
      data = data.filter(entry => entry.action === auditActionFilter);
    }

    // Table/module filter
    if (auditTableFilter !== 'all') {
      data = data.filter(entry => entry.tableName === auditTableFilter);
    }

    // Date range filter
    if (auditDateFrom) {
      const from = new Date(auditDateFrom);
      data = data.filter(entry => new Date(entry.createdAt) >= from);
    }
    if (auditDateTo) {
      const to = new Date(auditDateTo);
      to.setHours(23, 59, 59, 999);
      data = data.filter(entry => new Date(entry.createdAt) <= to);
    }

    // Search filter
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      data = data.filter(entry =>
        (entry.action || '').toLowerCase().includes(q) ||
        (entry.tableName || '').toLowerCase().includes(q) ||
        (entry.recordId || '').toLowerCase().includes(q) ||
        (entry.userEmail || '').toLowerCase().includes(q) ||
        JSON.stringify(entry.newValues || {}).toLowerCase().includes(q) ||
        JSON.stringify(entry.oldValues || {}).toLowerCase().includes(q)
      );
    }

    // Sort by most recent first
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return data;
  }, [auditTrails, auditActionFilter, auditTableFilter, auditDateFrom, auditDateTo, auditSearch]);

  // -------------------------------------------------------------------------
  // Audit trail: pagination
  // -------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(filteredAuditTrail.length / ITEMS_PER_PAGE));
  const paginatedAuditTrail = useMemo(() => {
    const start = (auditPage - 1) * ITEMS_PER_PAGE;
    return filteredAuditTrail.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuditTrail, auditPage]);

  // Reset page when filters change
  const handleFilterChange = useCallback(() => {
    setAuditPage(1);
  }, []);

  // -------------------------------------------------------------------------
  // Audit trail: format details for display
  // -------------------------------------------------------------------------

  const formatAuditDetails = useCallback((entry: typeof auditTrails[0]) => {
    const parts: string[] = [];
    if (entry.oldValues) {
      const keys = Object.keys(entry.oldValues);
      if (keys.length > 0) {
        parts.push(`From: ${keys.map(k => `${k}=${entry.oldValues![k]}`).join(', ')}`);
      }
    }
    if (entry.newValues) {
      const keys = Object.keys(entry.newValues);
      if (keys.length > 0) {
        parts.push(`To: ${keys.map(k => `${k}=${entry.newValues![k]}`).join(', ')}`);
      }
    }
    return parts.length > 0 ? parts.join(' | ') : '—';
  }, []);

  // -------------------------------------------------------------------------
  // CSV export handler
  // -------------------------------------------------------------------------

  const handleExportCSV = useCallback(() => {
    const exportData = filteredAuditTrail.map(entry => ({
      timestamp: formatDate(entry.createdAt),
      action: entry.action,
      tableName: entry.tableName,
      recordId: entry.recordId || '—',
      user: entry.userEmail || entry.userId || '—',
      details: formatAuditDetails(entry),
    }));
    exportAuditTrailCSV(exportData);
  }, [filteredAuditTrail, formatAuditDetails]);

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
      {/* Enhanced Compliance Category Cards                                */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Compliance by Category
          </CardTitle>
          <CardDescription>Click any card to expand status breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryCards.map(card => (
              <ComplianceCategoryCard
                key={card.key}
                card={card}
                expanded={expandedCategories.has(card.key)}
                onToggle={() => toggleCategory(card.key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Pending Signatures Section                                        */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Pending Signatures & Approvals
          </CardTitle>
          <CardDescription>Items requiring your attention and approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{pendingSignatures.docsAwaitingApproval}</p>
                <p className="text-sm text-muted-foreground">Documents Awaiting Approval</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <ClipboardCheck className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">{pendingSignatures.openCapasCount}</p>
                <p className="text-sm text-muted-foreground">Open CAPAs</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <PenLine className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{pendingSignatures.pendingSigs}</p>
                <p className="text-sm text-muted-foreground">Pending Signatures</p>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Review Documents
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Review CAPAs
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              View All Pending
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Report Templates Section                                          */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Report Templates
          </CardTitle>
          <CardDescription>Generate compliance reports from QMS data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_TEMPLATES.map(template => {
              const Icon = template.icon;
              return (
                <div key={template.id} className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('p-2 rounded-lg', template.bg)}>
                      <Icon className={cn('h-5 w-5', template.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                      <Eye className="h-3 w-3" />
                      Generate
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

      {/* ----------------------------------------------------------------- */}
      {/* Audit Trail Table                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Audit Trail
            <Badge variant="outline" className="ml-auto">{filteredAuditTrail.length} entries</Badge>
          </CardTitle>
          <CardDescription>Complete record of all system actions for regulatory compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <Select
              value={auditActionFilter}
              onValueChange={(v) => { setAuditActionFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {AUDIT_ACTIONS.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={auditTableFilter}
              onValueChange={(v) => { setAuditTableFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Table/Module" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_MODULES.map(mod => (
                  <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={auditDateFrom}
              onChange={(e) => { setAuditDateFrom(e.target.value); handleFilterChange(); }}
              placeholder="From date"
              className="text-sm"
            />

            <Input
              type="date"
              value={auditDateTo}
              onChange={(e) => { setAuditDateTo(e.target.value); handleFilterChange(); }}
              placeholder="To date"
              className="text-sm"
            />

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); handleFilterChange(); }}
                placeholder="Search audit trail..."
                className="pl-8 text-sm"
              />
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              Showing {((auditPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(auditPage * ITEMS_PER_PAGE, filteredAuditTrail.length)} of {filteredAuditTrail.length} entries
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[130px]">Table/Module</TableHead>
                  <TableHead className="w-[100px]">Record ID</TableHead>
                  <TableHead className="w-[160px]">User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAuditTrail.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit trail entries match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAuditTrail.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <AuditActionBadge action={entry.action} />
                      </TableCell>
                      <TableCell className="text-xs">{entry.tableName}</TableCell>
                      <TableCell className="text-xs font-mono">{entry.recordId || '—'}</TableCell>
                      <TableCell className="text-xs">{entry.userEmail || entry.userId || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate" title={formatAuditDetails(entry)}>
                        {formatAuditDetails(entry)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {auditPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage >= totalPages}
                onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))}
                className="gap-1"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
