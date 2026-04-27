'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import {
  PieChart, Download, BarChart3, TrendingUp, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ReportsView() {
  const store = useQMSStore();
  const { hasPermission } = useAuth();
  const capas = store.capas;
  const ncrs = store.ncrs;
  const audits = store.audits;
  const trainings = store.training;
  const risks = store.risks;
  const documents = store.documents;

  const [reportType, setReportType] = useState<string>('capa');

  // CAPA Metrics
  const capaClosed = capas.filter(c => c.status === 'Closed').length;
  const capaTotal = capas.length;
  const capaClosureRate = capaTotal > 0 ? Math.round((capaClosed / capaTotal) * 100) : 0;

  const capaByStatus = {
    Open: capas.filter(c => c.status === 'Open').length,
    Investigation: capas.filter(c => c.status === 'Investigation').length,
    Implementation: capas.filter(c => c.status === 'Implementation').length,
    'Effectiveness Check': capas.filter(c => c.status === 'Effectiveness Check').length,
    Closed: capaClosed,
  };

  // NCR Metrics
  const ncrByType = {
    Product: ncrs.filter(n => n.type === 'Product').length,
    Process: ncrs.filter(n => n.type === 'Process').length,
    System: ncrs.filter(n => n.type === 'System').length,
    Supplier: ncrs.filter(n => n.type === 'Supplier').length,
    OOS: ncrs.filter(n => n.type === 'OOS').length,
    OOT: ncrs.filter(n => n.type === 'OOT').length,
  };

  const ncrByStatus = {
    Open: ncrs.filter(n => n.status === 'Open').length,
    'Under Investigation': ncrs.filter(n => n.status === 'Under Investigation').length,
    'Pending Disposition': ncrs.filter(n => n.status === 'Pending Disposition').length,
    Closed: ncrs.filter(n => n.status === 'Closed').length,
  };

  // Audit Metrics
  const auditCompletionRate = audits.length > 0 ? Math.round((audits.filter(a => a.status === 'Completed').length / audits.length) * 100) : 0;

  // Training Metrics
  const trainingCompletionRate = trainings.length > 0 ? Math.round((trainings.filter(t => t.status === 'Completed').length / trainings.length) * 100) : 0;

  // Risk distribution
  const riskByLevel = {
    Low: risks.filter(r => r.riskLevel === 'Low').length,
    Medium: risks.filter(r => r.riskLevel === 'Medium').length,
    High: risks.filter(r => r.riskLevel === 'High').length,
    Critical: risks.filter(r => r.riskLevel === 'Critical').length,
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'capa':
        headers = ['CAPA #', 'Title', 'Type', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Created'];
        rows = capas.map(c => [c.capaNumber, c.title, c.type, c.status, c.priority || '', c.assignedTo, c.dueDate, c.createdDate]);
        break;
      case 'ncr':
        headers = ['NCR #', 'Title', 'Type', 'Severity', 'Status', 'Disposition', 'Created'];
        rows = ncrs.map(n => [n.ncrNumber, n.title, n.type, n.severity || '', n.status, n.disposition || '', n.createdDate]);
        break;
      case 'audit':
        headers = ['Audit #', 'Title', 'Type', 'Status', 'Lead Auditor', 'Scheduled', 'Findings'];
        rows = audits.map(a => [a.auditNumber, a.title, a.type, a.status, a.leadAuditor, a.scheduledDate, String(a.findings?.length || 0)]);
        break;
      case 'training':
        headers = ['Title', 'Type', 'Assigned To', 'Status', 'Due Date', 'Completed'];
        rows = trainings.map(t => [t.title, t.type, t.assignedTo, t.status, t.dueDate, t.completedDate || '']);
        break;
      case 'risk':
        headers = ['Risk #', 'Title', 'Category', 'P', 'I', 'D', 'RPN', 'Level', 'Status'];
        rows = risks.map(r => [r.riskNumber, r.title, r.category || '', String(r.probability), String(r.impact), String(r.detectability), String(r.rpn), r.riskLevel, r.status]);
        break;
      default:
        return;
    }

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const barColor = 'bg-primary/80';
  const maxCapaStatus = Math.max(...Object.values(capaByStatus), 1);
  const maxNcrType = Math.max(...Object.values(ncrByType), 1);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Quality metrics, dashboards and analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="capa">CAPA</SelectItem>
              <SelectItem value="ncr">NCR</SelectItem>
              <SelectItem value="audit">Audits</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
            </SelectContent>
          </Select>
          {hasPermission('reports.export') && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">CAPA Closure Rate</span>
            <div className="text-2xl font-bold">{capaClosureRate}%</div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-green-500 rounded-full" style={{ width: `${capaClosureRate}%` }} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Open NCRs</span>
            <div className="text-2xl font-bold text-amber-600">{ncrs.filter(n => n.status !== 'Closed').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Audit Completion</span>
            <div className="text-2xl font-bold">{auditCompletionRate}%</div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-primary rounded-full" style={{ width: `${auditCompletionRate}%` }} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Training Compliance</span>
            <div className="text-2xl font-bold">{trainingCompletionRate}%</div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${trainingCompletionRate}%` }} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAPA Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />CAPA by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(capaByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-[130px] truncate">{status}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', barColor)} style={{ width: `${(count / maxCapaStatus) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NCR Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />NCR by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(ncrByType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-[130px] truncate">{type}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${(count / maxNcrType) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NCR Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />NCR by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(ncrByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-[150px] truncate">{status}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-500/70" style={{ width: `${(count / Math.max(...Object.values(ncrByStatus), 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Risk by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(riskByLevel).map(([level, count]) => {
                const color = level === 'Low' ? 'bg-green-500/80' : level === 'Medium' ? 'bg-amber-500/80' : level === 'High' ? 'bg-orange-500/80' : 'bg-red-500/80';
                return (
                  <div key={level} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-[80px]">{level}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', color)} style={{ width: `${(count / Math.max(...Object.values(riskByLevel), 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Document Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{documents.filter(d => d.status === 'Approved').length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{documents.filter(d => d.status === 'In Review').length}</p>
              <p className="text-xs text-muted-foreground">In Review</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{documents.filter(d => d.status === 'Obsolete').length}</p>
              <p className="text-xs text-muted-foreground">Obsolete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
