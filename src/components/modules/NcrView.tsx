'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { NonConformance, NcrStatus, NcrType, NcrSeverity, NcrDisposition } from '@/types/qms';
import {
  AlertTriangle, Plus, Search, Eye, ArrowRight, AlertCircle,
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

const statusColors: Record<NcrStatus, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending Disposition': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Closed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const severityColors: Record<NcrSeverity, string> = {
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Major': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Minor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const ncrStatusFlow: NcrStatus[] = ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'];

function getNextNcrStatus(current: NcrStatus): NcrStatus | null {
  const idx = ncrStatusFlow.indexOf(current);
  return idx < ncrStatusFlow.length - 1 ? ncrStatusFlow[idx + 1] : null;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function NcrView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const ncrs = store.ncrs;
  const profiles = store.profiles;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState<NonConformance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<NcrType>('Process');
  const [formSeverity, setFormSeverity] = useState<NcrSeverity>('Major');
  const [formDescription, setFormDescription] = useState('');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formQtyAffected, setFormQtyAffected] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  // OOS/OOT fields
  const [formAnalyticalMethod, setFormAnalyticalMethod] = useState('');
  const [formMeasuredValue, setFormMeasuredValue] = useState('');
  const [formMeasuredUnit, setFormMeasuredUnit] = useState('');
  const [formSpecLimit, setFormSpecLimit] = useState('');
  const [formIsOosOot, setFormIsOosOot] = useState(false);

  const filteredNcrs = ncrs.filter(n => {
    const matchesSearch = searchTerm === '' ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || n.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesSeverity;
  });

  const summaryCounts = {
    open: ncrs.filter(n => n.status === 'Open').length,
    investigation: ncrs.filter(n => n.status === 'Under Investigation').length,
    pending: ncrs.filter(n => n.status === 'Pending Disposition').length,
    closed: ncrs.filter(n => n.status === 'Closed').length,
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const resetForm = () => {
    setFormTitle(''); setFormType('Process'); setFormSeverity('Major');
    setFormDescription(''); setFormLotNumber(''); setFormQtyAffected('');
    setFormAssignedTo(''); setFormAnalyticalMethod(''); setFormMeasuredValue('');
    setFormMeasuredUnit(''); setFormSpecLimit(''); setFormIsOosOot(false);
  };

  const handleCreate = () => {
    const newNcr: NonConformance = {
      id: `ncr-${Date.now()}`,
      ncrNumber: `NCR-2024-${String(ncrs.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Open',
      severity: formSeverity,
      description: formDescription,
      lotNumber: formLotNumber || undefined,
      quantityAffected: formQtyAffected ? parseInt(formQtyAffected) : undefined,
      assignedTo: formAssignedTo || undefined,
      disposition: 'Pending',
      isOosOot: formIsOosOot,
      analyticalMethod: formIsOosOot ? formAnalyticalMethod || undefined : undefined,
      measuredValue: formIsOosOot && formMeasuredValue ? parseFloat(formMeasuredValue) : undefined,
      measuredUnit: formIsOosOot ? formMeasuredUnit || undefined : undefined,
      specLimit: formIsOosOot ? formSpecLimit || undefined : undefined,
      phase2Required: formIsOosOot,
      rejectLot: false,
      createdDate: new Date().toISOString(),
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addNCR(newNcr);
    resetForm();
    setShowCreateDialog(false);
  };

  const handleAdvanceStatus = (ncr: NonConformance) => {
    const next = getNextNcrStatus(ncr.status);
    if (!next) return;
    store.updateNCR(ncr.id, { status: next });
    if (selectedNcr?.id === ncr.id) {
      setSelectedNcr({ ...ncr, status: next });
    }
  };

  const openDetail = (ncr: NonConformance) => {
    setSelectedNcr(ncr);
    setShowDetailDialog(true);
  };

  const ncrTypes: NcrType[] = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Non-Conformances
          </h1>
          <p className="text-muted-foreground mt-1">Manage non-conformance reports and investigations</p>
        </div>
        {hasPermission('ncr.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New NCR
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Open</span></div>
            <span className="text-2xl font-bold">{summaryCounts.open}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Search className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">Under Investigation</span></div>
            <span className="text-2xl font-bold">{summaryCounts.investigation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-purple-500" /><span className="text-sm text-muted-foreground">Pending Disposition</span></div>
            <span className="text-2xl font-bold">{summaryCounts.pending}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Closed</span></div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.closed}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search NCRs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ncrStatusFlow.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ncrTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="Major">Major</SelectItem>
            <SelectItem value="Minor">Minor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">NCR #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[120px]">Disposition</TableHead>
                  <TableHead className="w-[130px]">Assigned To</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNcrs.map(ncr => (
                  <TableRow key={ncr.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(ncr)}>
                    <TableCell className="font-mono text-xs">{ncr.ncrNumber}</TableCell>
                    <TableCell><p className="font-medium truncate max-w-xs">{ncr.title}</p></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(ncr.isOosOot ? 'border-red-300 text-red-700' : '')}>{ncr.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {ncr.severity && <Badge className={cn('text-xs', severityColors[ncr.severity])} variant="secondary">{ncr.severity}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[ncr.status])} variant="secondary">{ncr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ncr.disposition || '-'}</TableCell>
                    <TableCell className="text-sm">{getUserName(ncr.assignedTo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ncr.createdDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNcrs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No NCRs found matching filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create NCR Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New NCR</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="NCR title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => { setFormType(v as NcrType); setFormIsOosOot(v === 'OOS' || v === 'OOT'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ncrTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severity *</Label>
                <Select value={formSeverity} onValueChange={(v) => setFormSeverity(v as NcrSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description *</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the non-conformance..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lot Number</Label>
                <Input value={formLotNumber} onChange={(e) => setFormLotNumber(e.target.value)} placeholder="BN-2024-XXX" />
              </div>
              <div className="grid gap-2">
                <Label>Quantity Affected</Label>
                <Input type="number" value={formQtyAffected} onChange={(e) => setFormQtyAffected(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assigned To</Label>
              <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* OOS/OOT Fields */}
            {formIsOosOot && (
              <div className="border rounded-md p-4 space-y-3 bg-red-50/50 dark:bg-red-900/10">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> OOS/OOT Investigation Fields
                </h4>
                <div className="grid gap-2">
                  <Label>Analytical Method</Label>
                  <Input value={formAnalyticalMethod} onChange={(e) => setFormAnalyticalMethod(e.target.value)} placeholder="HPLC Method QC-M-XXX" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Measured Value</Label>
                    <Input type="number" value={formMeasuredValue} onChange={(e) => setFormMeasuredValue(e.target.value)} placeholder="0.0" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit</Label>
                    <Input value={formMeasuredUnit} onChange={(e) => setFormMeasuredUnit(e.target.value)} placeholder="%" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Spec Limit</Label>
                    <Input value={formSpecLimit} onChange={(e) => setFormSpecLimit(e.target.value)} placeholder="95.0-105.0%" />
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleCreate} disabled={!formTitle || !formDescription}>
              Create NCR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedNcr && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedNcr.ncrNumber}</span>
                  {selectedNcr.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedNcr.status])} variant="secondary">{selectedNcr.status}</Badge>
                  <Badge variant="outline">{selectedNcr.type}</Badge>
                  {selectedNcr.severity && <Badge className={cn(severityColors[selectedNcr.severity])} variant="secondary">{selectedNcr.severity}</Badge>}
                  {selectedNcr.disposition && <Badge variant="outline">Disposition: {selectedNcr.disposition}</Badge>}
                </div>

                {/* Status Flow */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {ncrStatusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedNcr.status ? 'bg-primary text-primary-foreground' :
                        ncrStatusFlow.indexOf(s) < ncrStatusFlow.indexOf(selectedNcr.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>{s}</div>
                      {i < ncrStatusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{getUserName(selectedNcr.assignedTo)}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{new Date(selectedNcr.createdDate).toLocaleDateString()}</span></div>
                  {selectedNcr.lotNumber && <div><span className="text-muted-foreground">Lot:</span> <span className="font-mono font-medium ml-1">{selectedNcr.lotNumber}</span></div>}
                  {selectedNcr.quantityAffected && <div><span className="text-muted-foreground">Qty Affected:</span> <span className="font-medium ml-1">{selectedNcr.quantityAffected}</span></div>}
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedNcr.description}</p>
                </div>

                {/* OOS/OOT Section */}
                {selectedNcr.isOosOot && (
                  <div className="border border-red-200 dark:border-red-800 rounded-md p-4 space-y-2 bg-red-50/50 dark:bg-red-900/10">
                    <h4 className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> OOS/OOT Investigation</h4>
                    {selectedNcr.analyticalMethod && <p className="text-sm"><span className="text-muted-foreground">Method:</span> {selectedNcr.analyticalMethod}</p>}
                    {selectedNcr.measuredValue !== undefined && <p className="text-sm"><span className="text-muted-foreground">Measured:</span> {selectedNcr.measuredValue} {selectedNcr.measuredUnit}</p>}
                    {selectedNcr.specLimit && <p className="text-sm"><span className="text-muted-foreground">Spec Limit:</span> {selectedNcr.specLimit}</p>}
                    {selectedNcr.phase1Conclusion && <p className="text-sm"><span className="text-muted-foreground">Phase 1:</span> {selectedNcr.phase1Conclusion}</p>}
                    {selectedNcr.phase2Required && <p className="text-sm"><span className="text-muted-foreground">Phase 2 Required:</span> Yes</p>}
                    {selectedNcr.phase2Conclusion && <p className="text-sm"><span className="text-muted-foreground">Phase 2:</span> {selectedNcr.phase2Conclusion}</p>}
                    <p className="text-sm"><span className="text-muted-foreground">Reject Lot:</span> {selectedNcr.rejectLot ? 'Yes' : 'No'}</p>
                  </div>
                )}

                {/* Disposition Selection */}
                {hasPermission('ncr.update') && selectedNcr.status === 'Pending Disposition' && (
                  <div className="grid gap-2">
                    <Label>Set Disposition</Label>
                    <Select onValueChange={(v) => {
                      store.updateNCR(selectedNcr.id, { disposition: v as NcrDisposition });
                      setSelectedNcr({ ...selectedNcr, disposition: v as NcrDisposition });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Use As Is">Use As Is</SelectItem>
                        <SelectItem value="Rework">Rework</SelectItem>
                        <SelectItem value="Scrap">Scrap</SelectItem>
                        <SelectItem value="Return to Supplier">Return to Supplier</SelectItem>
                        <SelectItem value="Concession">Concession</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasPermission('ncr.update') && selectedNcr.status !== 'Closed' && (
                  <Button className="w-full" onClick={() => handleAdvanceStatus(selectedNcr)}>
                    Advance to {getNextNcrStatus(selectedNcr.status)}
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
