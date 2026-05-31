'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import {
  BarChart3,
  Shield,
  AlertTriangle,
  GraduationCap,
  ClipboardCheck,
  Target,
  FileText,
  Truck,
  Package,
  LayoutDashboard,
  Download,
  Eye,
  X,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Calendar,
  Activity,
  PieChart as PieChartIcon,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { DataImportDialog } from '@/components/shared/DataImportDialog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(217, 91%, 60%)',
  'hsl(280, 67%, 58%)',
  'hsl(173, 58%, 39%)',
  'hsl(45, 93%, 47%)',
  'hsl(340, 75%, 55%)',
];

const CHART_COLORS = {
  green: 'hsl(142, 76%, 36%)',
  amber: 'hsl(38, 92%, 50%)',
  red: 'hsl(0, 84%, 60%)',
  blue: 'hsl(217, 91%, 60%)',
  purple: 'hsl(280, 67%, 58%)',
  teal: 'hsl(173, 58%, 39%)',
  cyan: 'hsl(187, 85%, 43%)',
  orange: 'hsl(25, 95%, 53%)',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: CHART_COLORS.red,
  High: CHART_COLORS.orange,
  Medium: CHART_COLORS.amber,
  Low: CHART_COLORS.green,
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: CHART_COLORS.red,
  Major: CHART_COLORS.orange,
  Minor: CHART_COLORS.amber,
  Observation: CHART_COLORS.green,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodCutoff(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '12m': return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    case 'all': return null;
    default: return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
  }
}

function filterByPeriod<T extends { createdAt: string }>(items: T[], period: string): T[] {
  const cutoff = getPeriodCutoff(period);
  if (!cutoff) return items;
  return items.filter(item => new Date(item.createdAt) >= cutoff);
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Template type
// ---------------------------------------------------------------------------

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  recordCount?: number;
}

// ---------------------------------------------------------------------------
// Sub-components (declared outside render to avoid re-creation)
// ---------------------------------------------------------------------------

function MetricCard({ icon, label, value, subValue, colorClass, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  colorClass: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', colorClass)}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {subValue && <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>}
            </div>
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-muted-foreground',
            )}>
              {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h4 className="text-sm font-semibold">{children}</h4>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 text-center border">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ReportsView() {
  const store = useQMSStore();
  const { hasPermission } = useAuth();

  const allDocuments = store.documents;
  const allCapas = store.capas;
  const allNcrs = store.ncrs;
  const allAudits = store.audits;
  const allTrainingItems = store.training;
  const allRisks = store.risks;
  const allBatchRecords = store.batchRecords;
  const allSuppliers = store.suppliers;

  const [previewReport, setPreviewReport] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string>('12m');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Period-filtered data
  const documents = useMemo(() => filterByPeriod(allDocuments, periodFilter), [allDocuments, periodFilter]);
  const capas = useMemo(() => filterByPeriod(allCapas, periodFilter), [allCapas, periodFilter]);
  const ncrs = useMemo(() => filterByPeriod(allNcrs, periodFilter), [allNcrs, periodFilter]);
  const audits = useMemo(() => filterByPeriod(allAudits, periodFilter), [allAudits, periodFilter]);
  const trainingItems = useMemo(() => filterByPeriod(allTrainingItems, periodFilter), [allTrainingItems, periodFilter]);
  const risks = useMemo(() => filterByPeriod(allRisks, periodFilter), [allRisks, periodFilter]);
  const batchRecords = useMemo(() => filterByPeriod(allBatchRecords, periodFilter), [allBatchRecords, periodFilter]);
  const suppliers = useMemo(() => filterByPeriod(allSuppliers, periodFilter), [allSuppliers, periodFilter]);

  // Report templates with dynamic counts
  const REPORT_TEMPLATES: ReportTemplate[] = useMemo(() => [
    {
      id: 'capa-summary',
      title: 'CAPA Summary Report',
      description: 'CAPA statistics, aging analysis, and closure rates',
      icon: <Shield className="h-6 w-6" />,
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      category: 'CAPA',
      recordCount: allCapas.length,
    },
    {
      id: 'ncr-trend',
      title: 'NCR Trend Report',
      description: 'NCR trends by type, severity, and resolution time',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      category: 'NCR',
      recordCount: allNcrs.length,
    },
    {
      id: 'training-compliance',
      title: 'Training Compliance Report',
      description: 'Training completion rates and overdue training items',
      icon: <GraduationCap className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      category: 'Training',
      recordCount: allTrainingItems.length,
    },
    {
      id: 'audit-findings',
      title: 'Audit Findings Report',
      description: 'Audit findings summary and open findings tracking',
      icon: <ClipboardCheck className="h-6 w-6" />,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      category: 'Audit',
      recordCount: allAudits.length,
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment Report',
      description: 'Risk profile overview and RPN distribution analysis',
      icon: <Target className="h-6 w-6" />,
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      category: 'Risk',
      recordCount: allRisks.length,
    },
    {
      id: 'document-status',
      title: 'Document Status Report',
      description: 'Document lifecycle status and approval metrics',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      category: 'Documents',
      recordCount: allDocuments.length,
    },
    {
      id: 'supplier-performance',
      title: 'Supplier Performance Report',
      description: 'Supplier scores, qualification status, and review metrics',
      icon: <Truck className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      category: 'Supplier',
      recordCount: allSuppliers.length,
    },
    {
      id: 'batch-release',
      title: 'Batch Release Report',
      description: 'Batch status overview and release metrics',
      icon: <Package className="h-6 w-6" />,
      color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      category: 'Batch',
      recordCount: allBatchRecords.length,
    },
    {
      id: 'management-review',
      title: 'Management Review Report',
      description: 'Comprehensive QMS overview for management review',
      icon: <LayoutDashboard className="h-6 w-6" />,
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      category: 'Management',
    },
  ], [allCapas.length, allNcrs.length, allTrainingItems.length, allAudits.length, allRisks.length, allDocuments.length, allSuppliers.length, allBatchRecords.length]);

  // -------------------------------------------------------------------------
  // Dashboard Metrics Summary
  // -------------------------------------------------------------------------

  const totalRecords = documents.length + capas.length + ncrs.length + audits.length + trainingItems.length + risks.length + batchRecords.length + suppliers.length;
  const overdueItems = useMemo(() => {
    const overdueCapas = capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date()).length;
    const overdueTraining = trainingItems.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < new Date()).length;
    const overdueAudits = audits.filter(a => a.status !== 'Completed' && new Date(a.scheduledDate) < new Date()).length;
    return overdueCapas + overdueTraining + overdueAudits;
  }, [capas, trainingItems, audits]);

  const compliancePct = useMemo(() => {
    const completed = documents.filter(d => d.status === 'Approved').length +
      capas.filter(c => c.status === 'Closed').length +
      ncrs.filter(n => n.status === 'Closed').length +
      audits.filter(a => a.status === 'Completed').length +
      trainingItems.filter(t => t.status === 'Completed').length;
    return pct(completed, Math.max(totalRecords, 1));
  }, [documents, capas, ncrs, audits, trainingItems, totalRecords]);

  const openItems = capas.filter(c => c.status !== 'Closed').length +
    ncrs.filter(n => n.status !== 'Closed').length +
    audits.filter(a => a.status !== 'Completed').length +
    trainingItems.filter(t => t.status !== 'Completed').length;

  const closedItems = capas.filter(c => c.status === 'Closed').length +
    ncrs.filter(n => n.status === 'Closed').length +
    audits.filter(a => a.status === 'Completed').length +
    trainingItems.filter(t => t.status === 'Completed').length;

  const closedOpenRatio = openItems > 0 ? (closedItems / openItems).toFixed(1) : 'N/A';

  // -------------------------------------------------------------------------
  // Report-specific data computations
  // -------------------------------------------------------------------------

  // CAPA data
  const capaByStatus = useMemo(() => [
    { name: 'Open', value: capas.filter(c => c.status === 'Open').length },
    { name: 'Investigation', value: capas.filter(c => c.status === 'Investigation').length },
    { name: 'Implementation', value: capas.filter(c => c.status === 'Implementation').length },
    { name: 'Effectiveness', value: capas.filter(c => c.status === 'Effectiveness Check').length },
    { name: 'Closed', value: capas.filter(c => c.status === 'Closed').length },
  ].filter(d => d.value > 0), [capas]);

  const capaByPriority = useMemo(() => [
    { name: 'Critical', count: capas.filter(c => c.priority === 'Critical').length, fill: PRIORITY_COLORS.Critical },
    { name: 'High', count: capas.filter(c => c.priority === 'High').length, fill: PRIORITY_COLORS.High },
    { name: 'Medium', count: capas.filter(c => c.priority === 'Medium').length, fill: PRIORITY_COLORS.Medium },
    { name: 'Low', count: capas.filter(c => c.priority === 'Low').length, fill: PRIORITY_COLORS.Low },
  ].filter(d => d.count > 0), [capas]);

  const capaAging = useMemo(() => {
    const now = new Date();
    const ranges = [
      { name: '< 30d', min: 0, max: 30 },
      { name: '30-60d', min: 30, max: 60 },
      { name: '60-90d', min: 60, max: 90 },
      { name: '> 90d', min: 90, max: Infinity },
    ];
    return ranges.map(r => ({
      name: r.name,
      count: capas.filter(c => {
        if (c.status === 'Closed') return false;
        const days = Math.floor((now.getTime() - new Date(c.createdDate).getTime()) / (1000 * 60 * 60 * 24));
        return days >= r.min && days < r.max;
      }).length,
    }));
  }, [capas]);

  const capaClosureRate = useMemo(() => pct(capas.filter(c => c.status === 'Closed').length, capas.length), [capas]);

  const capaByType = useMemo(() => [
    { name: 'Corrective', count: capas.filter(c => c.type === 'Corrective').length, fill: CHART_COLORS.red },
    { name: 'Preventive', count: capas.filter(c => c.type === 'Preventive').length, fill: CHART_COLORS.blue },
  ].filter(d => d.count > 0), [capas]);

  // NCR data
  const ncrByType = useMemo(() => [
    { name: 'Product', count: ncrs.filter(n => n.type === 'Product').length, fill: CHART_COLORS.red },
    { name: 'Process', count: ncrs.filter(n => n.type === 'Process').length, fill: CHART_COLORS.amber },
    { name: 'System', count: ncrs.filter(n => n.type === 'System').length, fill: CHART_COLORS.blue },
    { name: 'Supplier', count: ncrs.filter(n => n.type === 'Supplier').length, fill: CHART_COLORS.purple },
    { name: 'OOS', count: ncrs.filter(n => n.type === 'OOS').length, fill: CHART_COLORS.orange },
    { name: 'OOT', count: ncrs.filter(n => n.type === 'OOT').length, fill: CHART_COLORS.teal },
  ].filter(d => d.count > 0), [ncrs]);

  const ncrBySeverity = useMemo(() => [
    { name: 'Critical', value: ncrs.filter(n => n.severity === 'Critical').length, color: SEVERITY_COLORS.Critical },
    { name: 'Major', value: ncrs.filter(n => n.severity === 'Major').length, color: SEVERITY_COLORS.Major },
    { name: 'Minor', value: ncrs.filter(n => n.severity === 'Minor').length, color: SEVERITY_COLORS.Minor },
  ].filter(d => d.value > 0), [ncrs]);

  const ncrByStatus = useMemo(() => [
    { name: 'Open', count: ncrs.filter(n => n.status === 'Open').length },
    { name: 'Under Investigation', count: ncrs.filter(n => n.status === 'Under Investigation').length },
    { name: 'Pending Disposition', count: ncrs.filter(n => n.status === 'Pending Disposition').length },
    { name: 'Closed', count: ncrs.filter(n => n.status === 'Closed').length },
  ], [ncrs]);

  const ncrMonthlyTrend = useMemo(() => {
    const monthMap = new Map<string, { total: number; closed: number }>();
    ncrs.forEach(n => {
      const key = getMonthKey(n.createdDate);
      const entry = monthMap.get(key) || { total: 0, closed: 0 };
      entry.total++;
      if (n.status === 'Closed') entry.closed++;
      monthMap.set(key, entry);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: formatMonthLabel(key),
        Total: data.total,
        Closed: data.closed,
      }));
  }, [ncrs]);

  // Training data
  const trainingByStatus = useMemo(() => [
    { name: 'Planned', value: trainingItems.filter(t => t.status === 'Planned').length },
    { name: 'In Progress', value: trainingItems.filter(t => t.status === 'In Progress').length },
    { name: 'Completed', value: trainingItems.filter(t => t.status === 'Completed').length },
    { name: 'Overdue', value: trainingItems.filter(t => t.status === 'Overdue' || (t.status !== 'Completed' && new Date(t.dueDate) < new Date())).length },
  ].filter(d => d.value > 0), [trainingItems]);

  const trainingByType = useMemo(() => [
    { name: 'Onboarding', count: trainingItems.filter(t => t.type === 'Onboarding').length, fill: CHART_COLORS.blue },
    { name: 'SOP', count: trainingItems.filter(t => t.type === 'SOP').length, fill: CHART_COLORS.green },
    { name: 'Regulatory', count: trainingItems.filter(t => t.type === 'Regulatory').length, fill: CHART_COLORS.amber },
    { name: 'Skill', count: trainingItems.filter(t => t.type === 'Skill').length, fill: CHART_COLORS.purple },
    { name: 'Certification', count: trainingItems.filter(t => t.type === 'Certification').length, fill: CHART_COLORS.teal },
  ].filter(d => d.count > 0), [trainingItems]);

  const overdueTrainingItems = useMemo(() =>
    trainingItems.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < new Date()),
  [trainingItems]);

  const trainingCompletionRate = useMemo(() => pct(trainingItems.filter(t => t.status === 'Completed').length, trainingItems.length), [trainingItems]);

  // Audit data
  const auditFindingsBySeverity = useMemo(() => {
    const allFindings = audits.flatMap(a => a.findings || []);
    return [
      { name: 'Critical', count: allFindings.filter(f => f.severity === 'Critical').length, fill: SEVERITY_COLORS.Critical },
      { name: 'Major', count: allFindings.filter(f => f.severity === 'Major').length, fill: SEVERITY_COLORS.Major },
      { name: 'Minor', count: allFindings.filter(f => f.severity === 'Minor').length, fill: SEVERITY_COLORS.Minor },
      { name: 'Observation', count: allFindings.filter(f => f.severity === 'Observation').length, fill: SEVERITY_COLORS.Observation },
    ].filter(d => d.count > 0);
  }, [audits]);

  const auditByType = useMemo(() => [
    { name: 'Internal', value: audits.filter(a => a.type === 'Internal').length },
    { name: 'External', value: audits.filter(a => a.type === 'External').length },
    { name: 'Supplier', value: audits.filter(a => a.type === 'Supplier').length },
  ].filter(d => d.value > 0), [audits]);

  const totalAuditFindings = useMemo(() => audits.flatMap(a => a.findings || []).length, [audits]);
  const carRequiredCount = useMemo(() => audits.flatMap(a => a.findings || []).filter(f => f.correctiveActionRequired).length, [audits]);

  // Risk data
  const riskByLevel = useMemo(() => [
    { name: 'Low', value: risks.filter(r => r.riskLevel === 'Low').length, color: CHART_COLORS.green },
    { name: 'Medium', value: risks.filter(r => r.riskLevel === 'Medium').length, color: CHART_COLORS.amber },
    { name: 'High', value: risks.filter(r => r.riskLevel === 'High').length, color: CHART_COLORS.red },
    { name: 'Critical', value: risks.filter(r => r.riskLevel === 'Critical').length, color: CHART_COLORS.purple },
  ].filter(d => d.value > 0), [risks]);

  const rpnDistribution = useMemo(() => {
    const ranges = [
      { name: '1-10', min: 1, max: 11, fill: CHART_COLORS.green },
      { name: '11-30', min: 11, max: 31, fill: CHART_COLORS.teal },
      { name: '31-60', min: 31, max: 61, fill: CHART_COLORS.amber },
      { name: '61-125', min: 61, max: 126, fill: CHART_COLORS.red },
    ];
    return ranges.map(r => ({
      name: r.name,
      count: risks.filter(risk => risk.rpn >= r.min && risk.rpn < r.max).length,
      fill: r.fill,
    }));
  }, [risks]);

  const riskMitigatedClosedRate = useMemo(() =>
    pct(risks.filter(r => r.status === 'Closed' || r.status === 'Mitigated').length, risks.length),
  [risks]);

  const riskByCategory = useMemo(() => [
    { name: 'Product', count: risks.filter(r => r.category === 'Product').length },
    { name: 'Process', count: risks.filter(r => r.category === 'Process').length },
    { name: 'System', count: risks.filter(r => r.category === 'System').length },
    { name: 'Supplier', count: risks.filter(r => r.category === 'Supplier').length },
  ].filter(d => d.count > 0), [risks]);

  // Document data
  const docByStatus = useMemo(() => [
    { name: 'Draft', value: documents.filter(d => d.status === 'Draft').length, color: CHART_COLORS.amber },
    { name: 'In Review', value: documents.filter(d => d.status === 'In Review').length, color: CHART_COLORS.blue },
    { name: 'Approved', value: documents.filter(d => d.status === 'Approved').length, color: CHART_COLORS.green },
    { name: 'Obsolete', value: documents.filter(d => d.status === 'Obsolete').length, color: CHART_COLORS.red },
  ].filter(d => d.value > 0), [documents]);

  const docByType = useMemo(() => {
    const types = new Set(documents.map(d => d.type));
    return Array.from(types).map(t => ({
      name: t,
      count: documents.filter(d => d.type === t).length,
    })).sort((a, b) => b.count - a.count);
  }, [documents]);

  const docApprovalRate = useMemo(() => pct(documents.filter(d => d.status === 'Approved').length, documents.length), [documents]);

  // Supplier data
  const supplierByStatus = useMemo(() => [
    { name: 'Qualified', value: suppliers.filter(s => s.status === 'Qualified').length, color: CHART_COLORS.green },
    { name: 'Conditional', value: suppliers.filter(s => s.status === 'Conditional').length, color: CHART_COLORS.amber },
    { name: 'Disqualified', value: suppliers.filter(s => s.status === 'Disqualified').length, color: CHART_COLORS.red },
    { name: 'Under Evaluation', value: suppliers.filter(s => s.status === 'Under Evaluation').length, color: CHART_COLORS.blue },
  ].filter(d => d.value > 0), [suppliers]);

  const supplierPerformance = useMemo(() =>
    suppliers.filter(s => s.performanceScore !== undefined && s.performanceScore !== null).map(s => ({
      name: s.name.length > 15 ? s.name.substring(0, 15) + '…' : s.name,
      score: s.performanceScore || 0,
    })).sort((a, b) => b.score - a.score),
  [suppliers]);

  const avgSupplierScore = useMemo(() => {
    const scored = suppliers.filter(s => s.performanceScore && s.performanceScore > 0);
    return scored.length > 0 ? Math.round(scored.reduce((a, s) => a + (s.performanceScore || 0), 0) / scored.length) : 0;
  }, [suppliers]);

  // Batch data
  const batchByStatus = useMemo(() => [
    { name: 'In Progress', value: batchRecords.filter(b => b.status === 'In Progress').length, color: CHART_COLORS.blue },
    { name: 'Pending QA', value: batchRecords.filter(b => b.status === 'Pending QA Review').length, color: CHART_COLORS.amber },
    { name: 'Released', value: batchRecords.filter(b => b.status === 'Released').length, color: CHART_COLORS.green },
    { name: 'Rejected', value: batchRecords.filter(b => b.status === 'Rejected').length, color: CHART_COLORS.red },
    { name: 'Quarantine', value: batchRecords.filter(b => b.status === 'Quarantine').length, color: CHART_COLORS.purple },
  ].filter(d => d.value > 0), [batchRecords]);

  const batchByStatusBar = useMemo(() => [
    { name: 'In Progress', count: batchRecords.filter(b => b.status === 'In Progress').length },
    { name: 'Pending QA', count: batchRecords.filter(b => b.status === 'Pending QA Review').length },
    { name: 'Released', count: batchRecords.filter(b => b.status === 'Released').length },
    { name: 'Rejected', count: batchRecords.filter(b => b.status === 'Rejected').length },
    { name: 'Quarantine', count: batchRecords.filter(b => b.status === 'Quarantine').length },
  ], [batchRecords]);

  const batchReleaseRate = useMemo(() => pct(batchRecords.filter(b => b.status === 'Released').length, batchRecords.length), [batchRecords]);

  // Management Review - combined trend data
  const managementTrendData = useMemo(() => {
    const monthMap = new Map<string, { capasClosed: number; ncrsClosed: number; docsApproved: number }>();

    // CAPAs closed over time
    allCapas.filter(c => c.status === 'Closed' && c.closedDate).forEach(c => {
      const key = getMonthKey(c.closedDate!);
      const entry = monthMap.get(key) || { capasClosed: 0, ncrsClosed: 0, docsApproved: 0 };
      entry.capasClosed++;
      monthMap.set(key, entry);
    });

    // NCRs closed over time
    allNcrs.filter(n => n.status === 'Closed').forEach(n => {
      const key = getMonthKey(n.updatedAt);
      const entry = monthMap.get(key) || { capasClosed: 0, ncrsClosed: 0, docsApproved: 0 };
      entry.ncrsClosed++;
      monthMap.set(key, entry);
    });

    // Documents approved over time
    allDocuments.filter(d => d.status === 'Approved' && d.effectiveDate).forEach(d => {
      const key = getMonthKey(d.effectiveDate!);
      const entry = monthMap.get(key) || { capasClosed: 0, ncrsClosed: 0, docsApproved: 0 };
      entry.docsApproved++;
      monthMap.set(key, entry);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, data]) => ({
        month: formatMonthLabel(key),
        'CAPAs Closed': data.capasClosed,
        'NCRs Closed': data.ncrsClosed,
        'Docs Approved': data.docsApproved,
      }));
  }, [allCapas, allNcrs, allDocuments]);

  // Management Review KPI table
  const managementKpiRows = useMemo(() => [
    {
      area: 'Documents',
      total: documents.length,
      completed: documents.filter(d => d.status === 'Approved').length,
      rate: docApprovalRate,
      overdue: documents.filter(d => d.status === 'Draft').length,
    },
    {
      area: 'CAPAs',
      total: capas.length,
      completed: capas.filter(c => c.status === 'Closed').length,
      rate: capaClosureRate,
      overdue: capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date()).length,
    },
    {
      area: 'NCRs',
      total: ncrs.length,
      completed: ncrs.filter(n => n.status === 'Closed').length,
      rate: pct(ncrs.filter(n => n.status === 'Closed').length, ncrs.length),
      overdue: 0,
    },
    {
      area: 'Audits',
      total: audits.length,
      completed: audits.filter(a => a.status === 'Completed').length,
      rate: pct(audits.filter(a => a.status === 'Completed').length, audits.length),
      overdue: audits.filter(a => a.status !== 'Completed' && new Date(a.scheduledDate) < new Date()).length,
    },
    {
      area: 'Training',
      total: trainingItems.length,
      completed: trainingItems.filter(t => t.status === 'Completed').length,
      rate: trainingCompletionRate,
      overdue: overdueTrainingItems.length,
    },
    {
      area: 'Risks',
      total: risks.length,
      completed: risks.filter(r => r.status === 'Closed' || r.status === 'Mitigated').length,
      rate: riskMitigatedClosedRate,
      overdue: risks.filter(r => r.status === 'Open' && (r.riskLevel === 'High' || r.riskLevel === 'Critical')).length,
    },
    {
      area: 'Batches',
      total: batchRecords.length,
      completed: batchRecords.filter(b => b.status === 'Released').length,
      rate: batchReleaseRate,
      overdue: 0,
    },
    {
      area: 'Suppliers',
      total: suppliers.length,
      completed: suppliers.filter(s => s.status === 'Qualified').length,
      rate: pct(suppliers.filter(s => s.status === 'Qualified').length, suppliers.length),
      overdue: 0,
    },
  ], [documents, capas, ncrs, audits, trainingItems, risks, batchRecords, suppliers, capaClosureRate, docApprovalRate, trainingCompletionRate, riskMitigatedClosedRate, batchReleaseRate, overdueTrainingItems.length]);

  // -------------------------------------------------------------------------
  // Export handler
  // -------------------------------------------------------------------------

  const handleExport = useCallback((reportId: string) => {
    let csvContent = '';
    switch (reportId) {
      case 'capa-summary':
        csvContent = [
          ['CAPA #', 'Title', 'Type', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Created', 'Root Cause'].join(','),
          ...capas.map(c => [c.capaNumber, `"${c.title}"`, c.type, c.status, c.priority || '', c.assignedTo, formatDate(c.dueDate, true), formatDate(c.createdDate, true), c.rootCauseCategory || ''].join(','))
        ].join('\n');
        break;
      case 'ncr-trend':
        csvContent = [
          ['NCR #', 'Title', 'Type', 'Severity', 'Status', 'Disposition', 'Is OOS/OOT', 'Created'].join(','),
          ...ncrs.map(n => [n.ncrNumber, `"${n.title}"`, n.type, n.severity || '', n.status, n.disposition || '', n.isOosOot ? 'Yes' : 'No', formatDate(n.createdDate, true)].join(','))
        ].join('\n');
        break;
      case 'training-compliance':
        csvContent = [
          ['Title', 'Type', 'Assigned To', 'Status', 'Due Date', 'Completed', 'Days Overdue'].join(','),
          ...trainingItems.map(t => {
            const isOverdue = t.status !== 'Completed' && new Date(t.dueDate) < new Date();
            const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            return [`"${t.title}"`, t.type, t.assignedTo, t.status, formatDate(t.dueDate, true), t.completedDate ? formatDate(t.completedDate, true) : '', String(daysOverdue)].join(',');
          })
        ].join('\n');
        break;
      case 'audit-findings':
        csvContent = [
          ['Audit #', 'Title', 'Type', 'Status', 'Findings', 'Critical', 'Major', 'CAR Required', 'Scheduled'].join(','),
          ...audits.map(a => [a.auditNumber, `"${a.title}"`, a.type, a.status, String(a.findings?.length || 0), String(a.findings?.filter(f => f.severity === 'Critical').length || 0), String(a.findings?.filter(f => f.severity === 'Major').length || 0), String(a.findings?.filter(f => f.correctiveActionRequired).length || 0), formatDate(a.scheduledDate, true)].join(','))
        ].join('\n');
        break;
      case 'risk-assessment':
        csvContent = [
          ['Risk #', 'Title', 'Category', 'P', 'I', 'D', 'RPN', 'Level', 'Status', 'Mitigation'].join(','),
          ...risks.map(r => [r.riskNumber, `"${r.title}"`, r.category || '', r.probability, r.impact, r.detectability, r.rpn, r.riskLevel, r.status, `"${r.mitigation || ''}"`].join(','))
        ].join('\n');
        break;
      case 'document-status':
        csvContent = [
          ['Doc #', 'Title', 'Type', 'Status', 'Version', 'Owner', 'Effective Date', 'Review Date'].join(','),
          ...documents.map(d => [d.documentNumber, `"${d.title}"`, d.type, d.status, d.version, d.owner || '', d.effectiveDate ? formatDate(d.effectiveDate, true) : '', d.nextReview ? formatDate(d.nextReview, true) : ''].join(','))
        ].join('\n');
        break;
      case 'supplier-performance':
        csvContent = [
          ['Code', 'Name', 'Category', 'Status', 'Score', 'Qualification Method', 'Next Review'].join(','),
          ...suppliers.map(s => [s.supplierCode, `"${s.name}"`, s.category || '', s.status, String(s.performanceScore || 0), s.qualificationMethod || '', s.nextReviewDate ? formatDate(s.nextReviewDate, true) : ''].join(','))
        ].join('\n');
        break;
      case 'batch-release':
        csvContent = [
          ['Lot #', 'Product', 'Status', 'Mfg Date', 'Expiry', 'QA Release Date', 'Batch Size'].join(','),
          ...batchRecords.map(b => [b.lotNumber, `"${b.productName}"`, b.status, formatDate(b.manufacturingDate, true), b.expiryDate ? formatDate(b.expiryDate, true) : '', b.qaReleaseDate ? formatDate(b.qaReleaseDate, true) : '', b.batchSize ? String(b.batchSize) : ''].join(','))
        ].join('\n');
        break;
      case 'management-review':
        csvContent = [
          ['Area', 'Total', 'Completed/Closed', 'Rate %', 'Overdue/At Risk'].join(','),
          ...managementKpiRows.map(r => [r.area, String(r.total), String(r.completed), String(r.rate), String(r.overdue)].join(','))
        ].join('\n');
        break;
      default:
        csvContent = 'Report export not available';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [capas, ncrs, trainingItems, audits, risks, documents, suppliers, batchRecords, managementKpiRows]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  if (!hasPermission('reports.view')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground text-sm mt-1">You do not have permission to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }



  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Reports &amp; Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Quality metrics, dashboards, and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          {hasPermission('reports.export') && (
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => handleExport('management-review')}>
              <FileSpreadsheet className="h-3 w-3 mr-1" />Export All
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-3 w-3 mr-1" />Import
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Dashboard Metrics Summary - Enhanced KPI Cards                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          icon={<FileText className="h-4 w-4 text-primary" />}
          label="Total Records"
          value={totalRecords}
          colorClass="bg-primary/10"
          trend="neutral"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4 text-red-600" />}
          label="Overdue Items"
          value={overdueItems}
          colorClass="bg-red-100 dark:bg-red-900/30"
          trend={overdueItems > 0 ? 'down' : 'up'}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          label="Compliance %"
          value={`${compliancePct}%`}
          subValue={compliancePct >= 90 ? 'On target' : 'Needs attention'}
          colorClass="bg-green-100 dark:bg-green-900/30"
          trend={compliancePct >= 90 ? 'up' : 'down'}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4 text-amber-600" />}
          label="Closed/Open"
          value={closedOpenRatio}
          subValue={`${closedItems} / ${openItems}`}
          colorClass="bg-amber-100 dark:bg-amber-900/30"
          trend={closedItems > openItems ? 'up' : 'down'}
        />
        <MetricCard
          icon={<Shield className="h-4 w-4 text-red-600" />}
          label="CAPAs"
          value={capas.length}
          subValue={`${capas.filter(c => c.status === 'Open').length} open`}
          colorClass="bg-red-50 dark:bg-red-900/20"
          trend="neutral"
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="NCRs"
          value={ncrs.length}
          subValue={`${ncrs.filter(n => n.severity === 'Critical').length} critical`}
          colorClass="bg-amber-50 dark:bg-amber-900/20"
          trend="neutral"
        />
        <MetricCard
          icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
          label="Training"
          value={`${trainingCompletionRate}%`}
          subValue={`${overdueTrainingItems.length} overdue`}
          colorClass="bg-blue-50 dark:bg-blue-900/20"
          trend={trainingCompletionRate >= 85 ? 'up' : 'down'}
        />
        <MetricCard
          icon={<Target className="h-4 w-4 text-orange-600" />}
          label="High Risks"
          value={risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length}
          subValue={`${riskMitigatedClosedRate}% mitigated`}
          colorClass="bg-orange-50 dark:bg-orange-900/20"
          trend={riskMitigatedClosedRate >= 70 ? 'up' : 'down'}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Compliance Overview Chart                                         */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Quality Metrics Overview</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {periodFilter === 'all' ? 'All Time' : `Last ${periodFilter.replace('m', ' Months')}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Documents', Total: documents.length, Approved: documents.filter(d => d.status === 'Approved').length },
                { name: 'CAPAs', Total: capas.length, Closed: capas.filter(c => c.status === 'Closed').length },
                { name: 'NCRs', Total: ncrs.length, Closed: ncrs.filter(n => n.status === 'Closed').length },
                { name: 'Audits', Total: audits.length, Completed: audits.filter(a => a.status === 'Completed').length },
                { name: 'Training', Total: trainingItems.length, Completed: trainingItems.filter(t => t.status === 'Completed').length },
                { name: 'Risks', Total: risks.length, Mitigated: risks.filter(r => r.status === 'Closed' || r.status === 'Mitigated').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend className="text-xs" />
                <Bar dataKey="Total" fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} name="Total" />
                <Bar dataKey="Approved" fill={CHART_COLORS.green} radius={[2, 2, 0, 0]} name="Approved/Closed" />
                <Bar dataKey="Closed" fill={CHART_COLORS.green} radius={[2, 2, 0, 0]} name="Closed" />
                <Bar dataKey="Completed" fill={CHART_COLORS.green} radius={[2, 2, 0, 0]} name="Completed" />
                <Bar dataKey="Mitigated" fill={CHART_COLORS.teal} radius={[2, 2, 0, 0]} name="Mitigated" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Report Templates                                                  */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Report Templates</h2>
          <Badge variant="secondary" className="text-xs">{REPORT_TEMPLATES.length} reports</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TEMPLATES.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setPreviewReport(template.id)}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform', template.color)}>
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{template.title}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">{template.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                    {template.recordCount !== undefined && (
                      <p className="text-[10px] text-muted-foreground mt-1">{template.recordCount} records</p>
                    )}
                    <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => setPreviewReport(template.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />Generate
                      </Button>
                      {hasPermission('reports.export') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleExport(template.id)}
                        >
                          <Download className="h-3 w-3 mr-1" />Export
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Report Preview Dialog                                             */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="flex items-center gap-2">
                {REPORT_TEMPLATES.find(t => t.id === previewReport)?.icon}
                {REPORT_TEMPLATES.find(t => t.id === previewReport)?.title || 'Report'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3m">Last 3 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="12m">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
                {hasPermission('reports.export') && previewReport && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(previewReport)}>
                    <Download className="h-3 w-3 mr-1" />Export CSV
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generated on {formatDate(new Date().toISOString())} &middot; Data period: {periodFilter === 'all' ? 'All Time' : `Last ${periodFilter.replace('m', ' Months')}`}
            </p>
          </DialogHeader>

          <Separator />

          {/* ================================================================= */}
          {/* CAPA Summary Report                                               */}
          {/* ================================================================= */}
          {previewReport === 'capa-summary' && (
            <div className="space-y-6">
              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total CAPAs" value={capas.length} />
                <MiniStat label="Closure Rate" value={`${capaClosureRate}%`} color={capaClosureRate >= 80 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="Closed" value={capas.filter(c => c.status === 'Closed').length} color="text-green-600" />
                <MiniStat label="Overdue" value={capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date()).length} color="text-red-600" />
              </div>

              {/* Type breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {capaByType.map(t => (
                  <div key={t.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.fill }} />
                    <span className="text-xs font-medium">{t.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{t.count}</Badge>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Distribution across workflow stages">CAPA by Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={capaByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {capaByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Priority classification breakdown">CAPA by Priority</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capaByPriority}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                            {capaByPriority.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aging chart */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Open CAPAs grouped by age since creation">CAPA Aging Analysis (Open Items)</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={capaAging}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Open CAPAs">
                          {capaAging.map((entry, i) => (
                            <Cell key={i} fill={i === capaAging.length - 1 ? CHART_COLORS.red : CHART_COLORS.amber} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* CAPA Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all CAPAs">CAPA Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">CAPA #</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Priority</TableHead>
                          <TableHead className="text-xs">Assigned To</TableHead>
                          <TableHead className="text-xs">Due</TableHead>
                          <TableHead className="text-xs">Root Cause</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {capas.slice(0, 15).map(c => {
                          const isOverdue = c.status !== 'Closed' && new Date(c.dueDate) < new Date();
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.capaNumber}</TableCell>
                              <TableCell className="text-xs max-w-[180px] truncate">{c.title}</TableCell>
                              <TableCell className="text-xs">{c.type}</TableCell>
                              <TableCell className="text-xs">
                                <Badge variant={c.status === 'Closed' ? 'default' : 'secondary'} className="text-[10px]">{c.status}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {c.priority && (
                                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: PRIORITY_COLORS[c.priority], color: PRIORITY_COLORS[c.priority] }}>
                                    {c.priority}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{c.assignedTo}</TableCell>
                              <TableCell className={cn('text-xs', isOverdue && 'text-red-600 font-medium')}>
                                {formatDate(c.dueDate, true)}
                              </TableCell>
                              <TableCell className="text-xs">{c.rootCauseCategory || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* NCR Trend Report                                                  */}
          {/* ================================================================= */}
          {previewReport === 'ncr-trend' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total NCRs" value={ncrs.length} />
                <MiniStat label="Resolution Rate" value={`${pct(ncrs.filter(n => n.status === 'Closed').length, ncrs.length)}%`} color="text-green-600" />
                <MiniStat label="Closed" value={ncrs.filter(n => n.status === 'Closed').length} color="text-green-600" />
                <MiniStat label="Critical" value={ncrs.filter(n => n.severity === 'Critical').length} color="text-red-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="NCR classification by type">NCR by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ncrByType}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                            {ncrByType.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Severity distribution of all NCRs">NCR by Severity</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={ncrBySeverity} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {ncrBySeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend LineChart */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Monthly NCR creation and closure trend">Monthly Trend</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-56">
                    {ncrMonthlyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ncrMonthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                          <Line type="monotone" dataKey="Total" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ fill: CHART_COLORS.amber, r: 3 }} name="Opened" />
                          <Line type="monotone" dataKey="Closed" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ fill: CHART_COLORS.green, r: 3 }} name="Closed" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No trend data available for selected period</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* NCR by Status */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Current status distribution">NCR by Status</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ncrByStatus}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} name="NCRs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* NCR Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all NCRs">NCR Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">NCR #</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Severity</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Disposition</TableHead>
                          <TableHead className="text-xs">OOS/OOT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ncrs.slice(0, 15).map(n => (
                          <TableRow key={n.id}>
                            <TableCell className="font-mono text-xs">{n.ncrNumber}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{n.title}</TableCell>
                            <TableCell className="text-xs">{n.type}</TableCell>
                            <TableCell className="text-xs">
                              {n.severity && (
                                <Badge variant="outline" className="text-[10px]" style={{ borderColor: SEVERITY_COLORS[n.severity], color: SEVERITY_COLORS[n.severity] }}>
                                  {n.severity}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={n.status === 'Closed' ? 'default' : 'secondary'} className="text-[10px]">{n.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{n.disposition || '-'}</TableCell>
                            <TableCell className="text-xs">{n.isOosOot ? <Badge variant="destructive" className="text-[10px]">Yes</Badge> : 'No'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Training Compliance Report                                        */}
          {/* ================================================================= */}
          {previewReport === 'training-compliance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Items" value={trainingItems.length} />
                <MiniStat label="Completion Rate" value={`${trainingCompletionRate}%`} color={trainingCompletionRate >= 85 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="Completed" value={trainingItems.filter(t => t.status === 'Completed').length} color="text-green-600" />
                <MiniStat label="Overdue" value={overdueTrainingItems.length} color={overdueTrainingItems.length > 0 ? 'text-red-600' : 'text-green-600'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Training items by current status">Training by Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={trainingByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {trainingByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Training items by type category">Training by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trainingByType}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                            {trainingByType.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Training List */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle={`${overdueTrainingItems.length} training items past due date`}>Overdue Training</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    {overdueTrainingItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Title</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Assigned To</TableHead>
                            <TableHead className="text-xs">Due Date</TableHead>
                            <TableHead className="text-xs">Days Overdue</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overdueTrainingItems.slice(0, 15).map(t => {
                            const daysOverdue = Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <TableRow key={t.id}>
                                <TableCell className="text-xs font-medium">{t.title}</TableCell>
                                <TableCell className="text-xs">{t.type}</TableCell>
                                <TableCell className="text-xs">{t.assignedTo}</TableCell>
                                <TableCell className="text-xs text-red-600">{formatDate(t.dueDate, true)}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="destructive" className="text-[10px]">{daysOverdue}d</Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />No overdue training items
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Audit Findings Report                                             */}
          {/* ================================================================= */}
          {previewReport === 'audit-findings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Audits" value={audits.length} />
                <MiniStat label="Total Findings" value={totalAuditFindings} />
                <MiniStat label="Completed" value={audits.filter(a => a.status === 'Completed').length} color="text-green-600" />
                <MiniStat label="CAR Required" value={carRequiredCount} color={carRequiredCount > 0 ? 'text-red-600' : 'text-green-600'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Severity breakdown of all findings">Findings by Severity</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={auditFindingsBySeverity}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Findings">
                            {auditFindingsBySeverity.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Audit type distribution">Audit by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={auditByType} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {auditByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Audit Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all audits">Audit Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Audit #</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Findings</TableHead>
                          <TableHead className="text-xs">Critical</TableHead>
                          <TableHead className="text-xs">CAR Req.</TableHead>
                          <TableHead className="text-xs">Scheduled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audits.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">{a.auditNumber}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{a.title}</TableCell>
                            <TableCell className="text-xs">{a.type}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={a.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px]">{a.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{a.findings?.length || 0}</TableCell>
                            <TableCell className="text-xs text-red-600">{a.findings?.filter(f => f.severity === 'Critical').length || 0}</TableCell>
                            <TableCell className="text-xs">{a.findings?.filter(f => f.correctiveActionRequired).length || 0}</TableCell>
                            <TableCell className="text-xs">{formatDate(a.scheduledDate, true)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Risk Assessment Report                                            */}
          {/* ================================================================= */}
          {previewReport === 'risk-assessment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Risks" value={risks.length} />
                <MiniStat label="High / Critical" value={risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length} color="text-red-600" />
                <MiniStat label="Avg RPN" value={risks.length > 0 ? Math.round(risks.reduce((a, r) => a + r.rpn, 0) / risks.length) : 0} />
                <MiniStat label="Mitigated/Closed" value={`${riskMitigatedClosedRate}%`} color={riskMitigatedClosedRate >= 70 ? 'text-green-600' : 'text-amber-600'} />
              </div>

              {/* Risk status breakdown */}
              <div className="grid grid-cols-4 gap-3">
                {(['Open', 'Mitigated', 'Accepted', 'Closed'] as const).map(status => {
                  const count = risks.filter(r => r.status === status).length;
                  const colors: Record<string, string> = { Open: 'text-red-600', Mitigated: 'text-green-600', Accepted: 'text-amber-600', Closed: 'text-blue-600' };
                  return (
                    <div key={status} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border">
                      <span className={cn('text-lg font-bold', colors[status])}>{count}</span>
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Distribution by risk level">Risk by Level</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={riskByLevel} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {riskByLevel.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Risk Priority Number distribution">RPN Distribution</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rpnDistribution}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Risks">
                            {rpnDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk by Category */}
              {riskByCategory.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Risk distribution by category">Risk by Category</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={riskByCategory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} name="Risks" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all risk assessments">Risk Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Risk #</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">P/I/D</TableHead>
                          <TableHead className="text-xs">RPN</TableHead>
                          <TableHead className="text-xs">Level</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {risks.sort((a, b) => b.rpn - a.rpn).slice(0, 15).map(r => {
                          const levelColors: Record<string, string> = { Low: 'text-green-600', Medium: 'text-amber-600', High: 'text-red-600', Critical: 'text-purple-600' };
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">{r.riskNumber}</TableCell>
                              <TableCell className="text-xs max-w-[180px] truncate">{r.title}</TableCell>
                              <TableCell className="text-xs">{r.category || '-'}</TableCell>
                              <TableCell className="text-xs font-mono">{r.probability}/{r.impact}/{r.detectability}</TableCell>
                              <TableCell className="text-xs font-bold">{r.rpn}</TableCell>
                              <TableCell className="text-xs">
                                <span className={cn('font-medium', levelColors[r.riskLevel])}>{r.riskLevel}</span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant={r.status === 'Closed' || r.status === 'Mitigated' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Document Status Report                                            */}
          {/* ================================================================= */}
          {previewReport === 'document-status' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Documents" value={documents.length} />
                <MiniStat label="Approval Rate" value={`${docApprovalRate}%`} color={docApprovalRate >= 80 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="Approved" value={documents.filter(d => d.status === 'Approved').length} color="text-green-600" />
                <MiniStat label="Obsolete" value={documents.filter(d => d.status === 'Obsolete').length} color="text-red-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Current lifecycle status">Document by Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={docByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {docByStatus.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Document count by type classification">Document by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={docByType}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={50} />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} name="Documents" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all documents">Document Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Doc #</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Version</TableHead>
                          <TableHead className="text-xs">Owner</TableHead>
                          <TableHead className="text-xs">Effective</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.slice(0, 15).map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs">{d.documentNumber}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{d.title}</TableCell>
                            <TableCell className="text-xs">{d.type}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={d.status === 'Approved' ? 'default' : d.status === 'Obsolete' ? 'destructive' : 'secondary'} className="text-[10px]">{d.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{d.version}</TableCell>
                            <TableCell className="text-xs">{d.owner || '-'}</TableCell>
                            <TableCell className="text-xs">{d.effectiveDate ? formatDate(d.effectiveDate, true) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Supplier Performance Report                                       */}
          {/* ================================================================= */}
          {previewReport === 'supplier-performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Suppliers" value={suppliers.length} />
                <MiniStat label="Avg Score" value={`${avgSupplierScore}%`} color={avgSupplierScore >= 80 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="Qualified" value={suppliers.filter(s => s.status === 'Qualified').length} color="text-green-600" />
                <MiniStat label="Disqualified" value={suppliers.filter(s => s.status === 'Disqualified').length} color="text-red-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Supplier qualification status distribution">Supplier by Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={supplierByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {supplierByStatus.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Performance scores by supplier">Performance Scores</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierPerformance} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" domain={[0, 100]} className="text-xs" />
                          <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score">
                            {supplierPerformance.map((entry, i) => (
                              <Cell key={i} fill={entry.score >= 80 ? CHART_COLORS.green : entry.score >= 60 ? CHART_COLORS.amber : CHART_COLORS.red} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Supplier Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all suppliers">Supplier Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Score</TableHead>
                          <TableHead className="text-xs">Next Review</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">{s.supplierCode}</TableCell>
                            <TableCell className="text-xs font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs">{s.category || '-'}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={s.status === 'Qualified' ? 'default' : s.status === 'Disqualified' ? 'destructive' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className={cn('font-medium', (s.performanceScore || 0) >= 80 ? 'text-green-600' : (s.performanceScore || 0) >= 60 ? 'text-amber-600' : 'text-red-600')}>
                                {s.performanceScore || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">{s.nextReviewDate ? formatDate(s.nextReviewDate, true) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Batch Release Report                                              */}
          {/* ================================================================= */}
          {previewReport === 'batch-release' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total Batches" value={batchRecords.length} />
                <MiniStat label="Release Rate" value={`${batchReleaseRate}%`} color={batchReleaseRate >= 80 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="Released" value={batchRecords.filter(b => b.status === 'Released').length} color="text-green-600" />
                <MiniStat label="Rejected" value={batchRecords.filter(b => b.status === 'Rejected').length} color="text-red-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Batch status distribution">Batch by Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={batchByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {batchByStatus.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle subtitle="Batch counts by current status">Batch Status Counts</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={batchByStatusBar}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} name="Batches" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Batch Details Table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Detailed list of all batch records">Batch Details</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Lot #</TableHead>
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Batch Size</TableHead>
                          <TableHead className="text-xs">Mfg Date</TableHead>
                          <TableHead className="text-xs">Expiry</TableHead>
                          <TableHead className="text-xs">QA Release</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchRecords.map(b => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs">{b.lotNumber}</TableCell>
                            <TableCell className="text-xs">{b.productName}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={b.status === 'Released' ? 'default' : b.status === 'Rejected' ? 'destructive' : 'secondary'} className="text-[10px]">{b.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{b.batchSize ? `${b.batchSize} ${b.batchSizeUnit || ''}` : '-'}</TableCell>
                            <TableCell className="text-xs">{formatDate(b.manufacturingDate, true)}</TableCell>
                            <TableCell className="text-xs">{b.expiryDate ? formatDate(b.expiryDate, true) : '-'}</TableCell>
                            <TableCell className="text-xs">{b.qaReleaseDate ? formatDate(b.qaReleaseDate, true) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* Management Review Report                                          */}
          {/* ================================================================= */}
          {previewReport === 'management-review' && (
            <div className="space-y-6">
              {/* ISO reference */}
              <div className="p-4 rounded-lg border bg-muted/10">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Management Review Summary</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  This comprehensive QMS overview aggregates key quality indicators for management review
                  as required by ISO 13485:2016 §5.6 and ICH Q10. Data covers the period:{' '}
                  {periodFilter === 'all' ? 'All Time' : `Last ${periodFilter.replace('m', ' Months')}`}.
                </p>
              </div>

              {/* Top-level KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Docs Approved" value={`${documents.filter(d => d.status === 'Approved').length}/${documents.length}`} />
                <MiniStat label="CAPAs Closed" value={`${capas.filter(c => c.status === 'Closed').length}/${capas.length}`} color={capaClosureRate >= 80 ? 'text-green-600' : 'text-amber-600'} />
                <MiniStat label="NCRs Closed" value={`${ncrs.filter(n => n.status === 'Closed').length}/${ncrs.length}`} />
                <MiniStat label="Overdue Items" value={overdueItems} color={overdueItems > 0 ? 'text-red-600' : 'text-green-600'} />
              </div>

              {/* Combined trend chart */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="CAPAs closed, NCRs closed, and Documents approved over time">Combined Quality Trend</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-64">
                    {managementTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={managementTrendData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                          <Area type="monotone" dataKey="CAPAs Closed" stackId="1" stroke={CHART_COLORS.red} fill={CHART_COLORS.red} fillOpacity={0.3} />
                          <Area type="monotone" dataKey="NCRs Closed" stackId="1" stroke={CHART_COLORS.amber} fill={CHART_COLORS.amber} fillOpacity={0.3} />
                          <Area type="monotone" dataKey="Docs Approved" stackId="1" stroke={CHART_COLORS.green} fill={CHART_COLORS.green} fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No trend data available for selected period</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mini charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle>CAPA Status</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={capaByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                            {capaByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle>Risk Level Distribution</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={riskByLevel} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                            {riskByLevel.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend className="text-xs" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle>Training by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trainingByType}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                            {trainingByType.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <SectionTitle>Document by Type</SectionTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={docByType.slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={50} />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} name="Documents" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KPI Summary table */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <SectionTitle subtitle="Key performance indicators across all QMS areas">Key Performance Indicators</SectionTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Area</TableHead>
                          <TableHead className="text-xs text-center">Total</TableHead>
                          <TableHead className="text-xs text-center">Completed/Closed</TableHead>
                          <TableHead className="text-xs text-center">Rate</TableHead>
                          <TableHead className="text-xs text-center">Overdue/At Risk</TableHead>
                          <TableHead className="text-xs text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managementKpiRows.map(row => {
                          const statusColor = row.rate >= 80 ? 'text-green-600' : row.rate >= 60 ? 'text-amber-600' : 'text-red-600';
                          const statusIcon = row.rate >= 80 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : row.rate >= 60 ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : <XCircle className="h-3 w-3 text-red-600" />;
                          return (
                            <TableRow key={row.area}>
                              <TableCell className="text-xs font-medium">{row.area}</TableCell>
                              <TableCell className="text-xs text-center">{row.total}</TableCell>
                              <TableCell className="text-xs text-center">{row.completed}</TableCell>
                              <TableCell className="text-xs text-center">
                                <span className={cn('font-medium', statusColor)}>{row.rate}%</span>
                              </TableCell>
                              <TableCell className="text-xs text-center">
                                {row.overdue > 0 ? (
                                  <Badge variant="destructive" className="text-[10px]">{row.overdue}</Badge>
                                ) : (
                                  <span className="text-green-600">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-center">{statusIcon}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Data Import Dialog */}
      <DataImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
