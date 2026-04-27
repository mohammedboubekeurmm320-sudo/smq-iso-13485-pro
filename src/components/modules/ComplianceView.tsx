'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { AuditAction } from '@/types/qms';
import {
  CheckCircle2, Shield, FileText, AlertTriangle, Download, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const actionColors: Record<AuditAction, string> = {
  'CREATE': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'UPDATE': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'DELETE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'APPROVE': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'REJECT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'SIGN': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'LOGIN': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'EXPORT': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ComplianceView() {
  const store = useQMSStore();
  const { hasPermission } = useAuth();
  const auditTrails = store.auditTrails;
  const capas = store.capas;
  const documents = store.documents;

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

  // Compute compliance score
  const totalDocs = documents.length;
  const approvedDocs = documents.filter(d => d.status === 'Approved').length;
  const complianceScore = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

  // Pending signatures
  const pendingSigs = documents.filter(d => d.status === 'In Review').length;

  // Open CAPAs
  const openCapas = capas.filter(c => c.status !== 'Closed').length;

  // Audit trail last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentAuditTrails = auditTrails.filter(at =>
    new Date(at.createdAt) >= sevenDaysAgo
  );

  // Activity by day
  const activityByDay: Record<string, number> = {};
  recentAuditTrails.forEach(at => {
    const day = new Date(at.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    activityByDay[day] = (activityByDay[day] || 0) + 1;
  });

  // Filtered audit trails
  const filteredTrails = auditTrails.filter(at => {
    const matchesAction = actionFilter === 'all' || at.action === actionFilter;
    const matchesTable = tableFilter === 'all' || at.tableName === tableFilter;
    return matchesAction && matchesTable;
  });

  const tableNames = [...new Set(auditTrails.map(at => at.tableName))];
  const actions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'LOGIN', 'EXPORT'];

  const handleExportCSV = () => {
    const headers = ['Date', 'Action', 'Table', 'Record ID', 'User', 'Details'];
    const rows = filteredTrails.map(at => [
      new Date(at.createdAt).toLocaleString(),
      at.action,
      at.tableName,
      at.recordId || '',
      at.userEmail || '',
      at.newValues ? JSON.stringify(at.newValues) : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compliance score gauge
  const scoreColor = complianceScore >= 85 ? '#22c55e' : complianceScore >= 70 ? '#f59e0b' : '#ef4444';
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (complianceScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" />Compliance
        </h1>
        <p className="text-muted-foreground mt-1">Regulatory compliance tracking and audit trail</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
          <TabsTrigger value="audit-trail">Journal d&apos;Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Compliance Score */}
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
                    <circle cx="60" cy="60" r={radius} fill="none" stroke={scoreColor} strokeWidth="8"
                      strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-2xl font-bold" style={{ color: scoreColor }}>{complianceScore}%</span>
                </div>
                <p className="font-medium text-sm">Compliance Score</p>
                <p className="text-xs text-muted-foreground">{approvedDocs}/{totalDocs} docs approved</p>
              </CardContent>
            </Card>

            {/* Pending Signatures */}
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <FileText className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{pendingSigs}</p>
                    <p className="text-sm text-muted-foreground">Pending Signatures</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open CAPAs */}
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{openCapas}</p>
                    <p className="text-sm text-muted-foreground">Open CAPAs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Activity */}
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{recentAuditTrails.length}</p>
                    <p className="text-sm text-muted-foreground">Audit Events (7d)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Audit Trail Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {Object.entries(activityByDay).map(([day, count]) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{count}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t-md transition-all"
                      style={{ height: `${Math.max((count / Math.max(...Object.values(activityByDay), 1)) * 100, 4)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{day}</span>
                  </div>
                ))}
                {Object.keys(activityByDay).length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    No activity in the last 7 days
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Table" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {tableNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="ml-auto" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead className="w-[130px]">Table</TableHead>
                      <TableHead className="w-[100px]">Record ID</TableHead>
                      <TableHead className="w-[150px]">User</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrails.map(at => (
                      <TableRow key={at.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(at.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', actionColors[at.action])} variant="secondary">{at.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{at.tableName}</TableCell>
                        <TableCell className="font-mono text-xs">{at.recordId || '-'}</TableCell>
                        <TableCell className="text-sm">{at.userEmail || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {at.newValues ? JSON.stringify(at.newValues) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTrails.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit trail entries found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
