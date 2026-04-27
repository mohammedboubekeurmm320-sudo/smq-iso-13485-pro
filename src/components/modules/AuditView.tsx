'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Audit, AuditStatus, AuditType, AuditFinding } from '@/types/qms';
import {
  ClipboardCheck, Plus, Search, Eye, ArrowRight, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const statusColors: Record<AuditStatus, string> = {
  'Planned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const findingSeverityColors: Record<string, string> = {
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Major': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Minor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Observation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const auditStatusFlow: AuditStatus[] = ['Planned', 'In Progress', 'Completed'];

function getNextAuditStatus(current: AuditStatus): AuditStatus | null {
  const idx = auditStatusFlow.indexOf(current);
  return idx < auditStatusFlow.length - 1 ? auditStatusFlow[idx + 1] : null;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function AuditView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const audits = store.audits;
  const profiles = store.profiles;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<AuditType>('Internal');
  const [formScope, setFormScope] = useState('');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formLeadAuditor, setFormLeadAuditor] = useState('');

  const filteredAudits = audits.filter(a => {
    const matchesSearch = searchTerm === '' ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.auditNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const summaryCounts = {
    planned: audits.filter(a => a.status === 'Planned').length,
    inProgress: audits.filter(a => a.status === 'In Progress').length,
    completed: audits.filter(a => a.status === 'Completed').length,
  };

  const getUserName = (name: string) => {
    const profile = profiles.find(p => p.fullName === name || p.id === name);
    return profile?.fullName || name;
  };

  const resetForm = () => {
    setFormTitle(''); setFormType('Internal'); setFormScope('');
    setFormScheduledDate(''); setFormLeadAuditor('');
  };

  const handleCreate = () => {
    const newAudit: Audit = {
      id: `audit-${Date.now()}`,
      auditNumber: `AUD-2024-${String(audits.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Planned',
      scope: formScope || undefined,
      scheduledDate: formScheduledDate ? new Date(formScheduledDate).toISOString() : new Date().toISOString(),
      leadAuditor: formLeadAuditor,
      findings: [],
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addAudit(newAudit);
    resetForm();
    setShowCreateDialog(false);
  };

  const handleAdvanceStatus = (audit: Audit) => {
    const next = getNextAuditStatus(audit.status);
    if (!next) return;
    store.updateAudit(audit.id, {
      status: next,
      completedDate: next === 'Completed' ? new Date().toISOString() : undefined,
    });
    if (selectedAudit?.id === audit.id) {
      setSelectedAudit({ ...audit, status: next });
    }
  };

  const openDetail = (audit: Audit) => {
    setSelectedAudit(audit);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />Audits
          </h1>
          <p className="text-muted-foreground mt-1">Plan, conduct and track quality audits</p>
        </div>
        {hasPermission('audit.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Audit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Planned</span></div>
            <span className="text-2xl font-bold">{summaryCounts.planned}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Search className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">In Progress</span></div>
            <span className="text-2xl font-bold">{summaryCounts.inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Completed</span></div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.completed}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search audits..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {auditStatusFlow.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="External">External</SelectItem>
            <SelectItem value="Supplier">Supplier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Audit #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[140px]">Lead Auditor</TableHead>
                  <TableHead className="w-[120px]">Scheduled</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px]">Findings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map(audit => (
                  <TableRow key={audit.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(audit)}>
                    <TableCell className="font-mono text-xs">{audit.auditNumber}</TableCell>
                    <TableCell><p className="font-medium truncate max-w-xs">{audit.title}</p></TableCell>
                    <TableCell><Badge variant="outline">{audit.type}</Badge></TableCell>
                    <TableCell className="text-sm">{audit.leadAuditor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(audit.scheduledDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[audit.status])} variant="secondary">{audit.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{audit.findings?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {filteredAudits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audits found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create New Audit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Title *</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Audit title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as AuditType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="External">External</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Scheduled Date *</Label>
                <Input type="date" value={formScheduledDate} onChange={(e) => setFormScheduledDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2"><Label>Scope</Label><Textarea value={formScope} onChange={(e) => setFormScope(e.target.value)} placeholder="Audit scope..." rows={3} /></div>
            <div className="grid gap-2">
              <Label>Lead Auditor *</Label>
              <Select value={formLeadAuditor} onValueChange={setFormLeadAuditor}>
                <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.fullName || p.email}>{p.fullName || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!formTitle || !formScheduledDate || !formLeadAuditor}>Create Audit</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedAudit.auditNumber}</span>
                  {selectedAudit.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedAudit.status])} variant="secondary">{selectedAudit.status}</Badge>
                  <Badge variant="outline">{selectedAudit.type}</Badge>
                </div>

                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {auditStatusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedAudit.status ? 'bg-primary text-primary-foreground' :
                        auditStatusFlow.indexOf(s) < auditStatusFlow.indexOf(selectedAudit.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>{s}</div>
                      {i < auditStatusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Lead Auditor:</span> <span className="font-medium ml-1">{selectedAudit.leadAuditor}</span></div>
                  <div><span className="text-muted-foreground">Scheduled:</span> <span className="font-medium ml-1">{new Date(selectedAudit.scheduledDate).toLocaleDateString()}</span></div>
                  {selectedAudit.completedDate && <div><span className="text-muted-foreground">Completed:</span> <span className="font-medium ml-1">{new Date(selectedAudit.completedDate).toLocaleDateString()}</span></div>}
                </div>

                {selectedAudit.scope && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Scope</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedAudit.scope}</p>
                  </div>
                )}

                {/* Findings */}
                {selectedAudit.findings && selectedAudit.findings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Findings ({selectedAudit.findings.length})</h4>
                    <div className="space-y-2">
                      {selectedAudit.findings.map(f => (
                        <div key={f.id} className="border rounded-md p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-xs', findingSeverityColors[f.severity])} variant="secondary">{f.severity}</Badge>
                            {f.correctiveActionRequired && <Badge variant="outline" className="text-xs border-red-300 text-red-700">CAR Required</Badge>}
                            {f.referenceClause && <span className="text-xs text-muted-foreground">{f.referenceClause}</span>}
                          </div>
                          <p className="text-sm">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasPermission('audit.update') && selectedAudit.status !== 'Completed' && (
                  <Button className="w-full" onClick={() => handleAdvanceStatus(selectedAudit)}>
                    Advance to {getNextAuditStatus(selectedAudit.status)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
