'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { cn, formatDate } from '@/lib/utils';
import type {
  ScheduledReport,
  ReportFrequency,
  ReportType,
  ReportFormat,
  ScheduledReportStatus,
} from '@/types/qms';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  MoreHorizontal,
  Mail,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'management-review', label: 'Management Review' },
  { value: 'capa-summary', label: 'CAPA Summary' },
  { value: 'audit-summary', label: 'Audit Summary' },
  { value: 'compliance-overview', label: 'Compliance Overview' },
  { value: 'training-status', label: 'Training Status' },
  { value: 'risk-profile', label: 'Risk Profile' },
];

const FREQUENCY_OPTIONS: { value: ReportFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'html', label: 'HTML' },
  { value: 'pdf', label: 'PDF' },
];

const STATUS_COLORS: Record<ScheduledReportStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_ICONS: Record<ScheduledReportStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-3 w-3" />,
  paused: <Clock className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReportTypeLabel(type: ReportType): string {
  return REPORT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
}

function getFrequencyLabel(freq: ReportFrequency): string {
  return FREQUENCY_OPTIONS.find(o => o.value === freq)?.label || freq;
}

// ---------------------------------------------------------------------------
// Create/Edit Dialog
// ---------------------------------------------------------------------------

interface ReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: ScheduledReport | null;
  onSave: (data: Partial<ScheduledReport>) => void;
}

function ReportFormDialog({ open, onOpenChange, report, onSave }: ReportFormDialogProps) {
  const isEditing = !!report;

  const [name, setName] = useState(report?.name || '');
  const [reportType, setReportType] = useState<ReportType>(report?.reportType || 'capa-summary');
  const [format, setFormat] = useState<ReportFormat>(report?.format || 'csv');
  const [frequency, setFrequency] = useState<ReportFrequency>(report?.frequency || 'monthly');
  const [recipients, setRecipients] = useState(report?.recipients?.join(', ') || '');
  const [filterKey, setFilterKey] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(report?.filters || {});
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !recipients.trim()) return;

    setSaving(true);
    const emailList = recipients.split(',').map(e => e.trim()).filter(e => e.length > 0);

    onSave({
      name: name.trim(),
      reportType,
      format,
      frequency,
      recipients: emailList,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    setSaving(false);
    onOpenChange(false);
  }, [name, reportType, format, frequency, recipients, filters, onSave, onOpenChange]);

  const addFilter = useCallback(() => {
    if (filterKey.trim() && filterValue.trim()) {
      setFilters(prev => ({ ...prev, [filterKey.trim()]: filterValue.trim() }));
      setFilterKey('');
      setFilterValue('');
    }
  }, [filterKey, filterValue]);

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Monthly CAPA Summary"
            />
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format & Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ReportFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients (comma-separated emails)</Label>
            <Input
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
            />
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filters (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                value={filterKey}
                onChange={e => setFilterKey(e.target.value)}
                placeholder="Key (e.g., department)"
                className="flex-1"
              />
              <Input
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                placeholder="Value (e.g., Quality)"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addFilter} className="px-3">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {Object.keys(filters).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(filters).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="gap-1 text-xs">
                    {key}: {value}
                    <button onClick={() => removeFilter(key)} className="ml-1 hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !recipients.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ScheduledReportsView() {
  const store = useQMSStore();
  const scheduledReports = store.scheduledReports;

  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter reports
  const filteredReports = useMemo(() => {
    let reports = [...scheduledReports];
    if (statusFilter !== 'all') {
      reports = reports.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      reports = reports.filter(r => r.reportType === typeFilter);
    }
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [scheduledReports, statusFilter, typeFilter]);

  // Create report
  const handleCreate = useCallback(async (data: Partial<ScheduledReport>) => {
    try {
      const response = await fetch('/api/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        store.addScheduledReport(result.data);
      }
    } catch (err) {
      console.error('Failed to create scheduled report:', err);
    }
  }, [store]);

  // Update report
  const handleUpdate = useCallback(async (data: Partial<ScheduledReport>) => {
    if (!editingReport) return;
    try {
      const response = await fetch(`/api/scheduled-reports/${editingReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        store.updateScheduledReport(editingReport.id, result.data);
      }
    } catch (err) {
      console.error('Failed to update scheduled report:', err);
    }
    setEditingReport(null);
  }, [editingReport, store]);

  // Toggle active/paused
  const handleToggle = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/scheduled-reports/${id}/toggle`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        store.updateScheduledReport(id, result.data);
      }
    } catch (err) {
      console.error('Failed to toggle scheduled report:', err);
    }
  }, [store]);

  // Run now
  const handleRunNow = useCallback(async (id: string) => {
    setRunningId(id);
    try {
      const response = await fetch(`/api/scheduled-reports/${id}/execute`, {
        method: 'POST',
      });

      // If CSV format, download the file
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/csv')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        if (result.success && result.data) {
          // Update the report in store with new lastRunAt
          store.updateScheduledReport(id, {
            lastRunAt: result.data.lastRunAt,
            lastResult: result.data.lastResult || { success: true, recordCount: result.data.recordCount || 0 },
          });
        }
      }
    } catch (err) {
      console.error('Failed to execute scheduled report:', err);
    } finally {
      setRunningId(null);
    }
  }, [store]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/scheduled-reports/${deleteId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        store.deleteScheduledReport(deleteId);
      }
    } catch (err) {
      console.error('Failed to delete scheduled report:', err);
    }
    setDeleteId(null);
  }, [deleteId, store]);

  // Stats
  const activeCount = scheduledReports.filter(r => r.status === 'active').length;
  const pausedCount = scheduledReports.filter(r => r.status === 'paused').length;
  const errorCount = scheduledReports.filter(r => r.status === 'error').length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Scheduled Reports
          </h1>
          <p className="text-muted-foreground mt-1">Configure recurring report generation and delivery</p>
        </div>
        <Button onClick={() => { setEditingReport(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{scheduledReports.length}</p>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pausedCount}</p>
            <p className="text-xs text-muted-foreground">Paused</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Report Types</SelectItem>
            {REPORT_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== 'all' || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Reports Table */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No Scheduled Reports</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {scheduledReports.length === 0
                ? 'Create your first scheduled report to automate report generation.'
                : 'No reports match the current filters.'}
            </p>
            {scheduledReports.length === 0 && (
              <Button
                onClick={() => { setEditingReport(null); setFormOpen(true); }}
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Report
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium text-sm">{report.name}</TableCell>
                      <TableCell className="text-xs">{getReportTypeLabel(report.reportType)}</TableCell>
                      <TableCell className="text-xs">{getFrequencyLabel(report.frequency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs uppercase">{report.format}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('gap-1 text-xs', STATUS_COLORS[report.status])}
                        >
                          {STATUS_ICONS[report.status]}
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(report.nextRunAt, true)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {report.lastRunAt ? formatDate(report.lastRunAt, true) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {report.recipients.length}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRunNow(report.id)}
                              disabled={runningId === report.id}
                            >
                              {runningId === report.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(report.id)}>
                              {report.status === 'active' ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setEditingReport(report); setFormOpen(true); }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(report.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Last Result Info */}
      {filteredReports.some(r => r.lastResult) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Last Run Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReports.filter(r => r.lastResult).map(report => (
              <Card key={report.id} className="overflow-hidden">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate mr-2">{report.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs flex-shrink-0',
                        report.lastResult!.success
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                      )}
                    >
                      {report.lastResult!.success ? 'Success' : 'Error'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.lastResult!.success
                      ? `${report.lastResult!.recordCount} records generated`
                      : report.lastResult!.error || 'Unknown error'}
                  </p>
                  {report.lastRunAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Run at: {formatDate(report.lastRunAt, true)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ReportFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        report={editingReport}
        onSave={editingReport ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
