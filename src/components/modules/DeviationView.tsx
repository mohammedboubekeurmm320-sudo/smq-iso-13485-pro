'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Deviation, DeviationStatus, DeviationType,
  DeviationSeverity, DeviationCategory,
} from '@/types/qms';
import {
  AlertTriangle, Plus, Search, Eye, ArrowRight, CheckCircle2,
  Clock, XCircle,
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
import { cn, formatDate } from '@/lib/utils';

const statusColors: Record<DeviationStatus, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending QA Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Approved': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Closed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const severityColors: Record<DeviationSeverity, string> = {
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Major': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Minor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusFlow: DeviationStatus[] = [
  'Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed',
];

function getNextStatus(current: DeviationStatus): DeviationStatus | null {
  const idx = statusFlow.indexOf(current);
  return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
}

const allCategories: DeviationCategory[] = [
  'Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation',
];

export function DeviationView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const deviations = store.deviations;
  const profiles = store.profiles;
  const capas = store.capas;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDev, setSelectedDev] = useState<Deviation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DeviationType>('Unplanned');
  const [formSeverity, setFormSeverity] = useState<DeviationSeverity>('Minor');
  const [formCategory, setFormCategory] = useState<DeviationCategory>('Process');
  const [formDescription, setFormDescription] = useState('');
  const [formDeviationDetails, setFormDeviationDetails] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formRiskAssessment, setFormRiskAssessment] = useState('');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState('');
  const [formPreventiveAction, setFormPreventiveAction] = useState('');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formProductCode, setFormProductCode] = useState('');
  const [formQuantityAffected, setFormQuantityAffected] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formLinkedCapaId, setFormLinkedCapaId] = useState('');
  const [formLinkedDocId, setFormLinkedDocId] = useState('');

  const filteredDeviations = deviations.filter(dev => {
    const matchesSearch = searchTerm === '' ||
      dev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.devNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dev.status === statusFilter;
    const matchesType = typeFilter === 'all' || dev.type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || dev.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || dev.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesType && matchesSeverity && matchesCategory;
  });

  const summaryCounts = {
    open: deviations.filter(d => d.status === 'Open').length,
    underInvestigation: deviations.filter(d => d.status === 'Under Investigation').length,
    pendingQA: deviations.filter(d => d.status === 'Pending QA Review').length,
    approved: deviations.filter(d => d.status === 'Approved').length,
    closed: deviations.filter(d => d.status === 'Closed').length,
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const handleCreate = () => {
    const newDev: Deviation = {
      id: `dev-${Date.now()}`,
      devNumber: `DEV-2024-${String(deviations.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Open',
      severity: formSeverity,
      category: formCategory,
      description: formDescription,
      deviationDetails: formDeviationDetails,
      justification: formJustification || undefined,
      riskAssessment: formRiskAssessment || undefined,
      correctiveAction: formCorrectiveAction || undefined,
      preventiveAction: formPreventiveAction || undefined,
      lotNumber: formLotNumber || undefined,
      productCode: formProductCode || undefined,
      quantityAffected: formQuantityAffected ? parseInt(formQuantityAffected) : undefined,
      linkedCapaId: formLinkedCapaId || undefined,
      linkedDocumentId: formLinkedDocId || undefined,
      assignedTo: formAssignedTo,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : new Date().toISOString(),
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addDeviation(newDev);
    resetForm();
    setShowCreateDialog(false);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormType('Unplanned');
    setFormSeverity('Minor');
    setFormCategory('Process');
    setFormDescription('');
    setFormDeviationDetails('');
    setFormJustification('');
    setFormRiskAssessment('');
    setFormCorrectiveAction('');
    setFormPreventiveAction('');
    setFormLotNumber('');
    setFormProductCode('');
    setFormQuantityAffected('');
    setFormAssignedTo('');
    setFormDueDate('');
    setFormLinkedCapaId('');
    setFormLinkedDocId('');
  };

  const handleAdvanceStatus = (dev: Deviation) => {
    const next = getNextStatus(dev.status);
    if (!next) return;
    store.updateDeviation(dev.id, {
      status: next,
      closedDate: next === 'Closed' ? new Date().toISOString() : undefined,
    });
    if (selectedDev?.id === dev.id) {
      setSelectedDev({ ...dev, status: next });
    }
  };

  const openDetail = (dev: Deviation) => {
    setSelectedDev(dev);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Déviations
          </h1>
          <p className="text-muted-foreground mt-1">Enregistrement et gestion des déviations</p>
        </div>
        {hasPermission('ncr.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Déviation
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.open}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Under Investigation</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.underInvestigation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Pending QA Review</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.pendingQA}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.approved}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Closed</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.closed}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher déviations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusFlow.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(['Planned', 'Unplanned'] as DeviationType[]).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {(['Critical', 'Major', 'Minor'] as DeviationSeverity[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
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
                  <TableHead className="w-[130px]">DEV #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[140px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeviations.map(dev => (
                  <TableRow key={dev.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(dev)}>
                    <TableCell className="font-mono text-xs">{dev.devNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-xs">{dev.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        dev.type === 'Unplanned' ? 'border-amber-300 text-amber-700' : 'border-green-300 text-green-700'
                      )}>
                        {dev.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', severityColors[dev.severity])} variant="secondary">{dev.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{dev.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[dev.status])} variant="secondary">{dev.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getUserName(dev.assignedTo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dev.dueDate, true)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(dev); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDeviations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucune déviation trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Deviation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Déviation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Deviation title" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as DeviationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Unplanned">Unplanned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severity *</Label>
                <Select value={formSeverity} onValueChange={(v) => setFormSeverity(v as DeviationSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as DeviationCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description *</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the deviation..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Deviation Details *</Label>
              <Textarea value={formDeviationDetails} onChange={(e) => setFormDeviationDetails(e.target.value)} placeholder="Detailed description of the deviation..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Justification</Label>
                <Textarea value={formJustification} onChange={(e) => setFormJustification(e.target.value)} placeholder="Justification..." rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Risk Assessment</Label>
                <Textarea value={formRiskAssessment} onChange={(e) => setFormRiskAssessment(e.target.value)} placeholder="Risk assessment..." rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Corrective Action</Label>
                <Textarea value={formCorrectiveAction} onChange={(e) => setFormCorrectiveAction(e.target.value)} placeholder="Corrective action..." rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Preventive Action</Label>
                <Textarea value={formPreventiveAction} onChange={(e) => setFormPreventiveAction(e.target.value)} placeholder="Preventive action..." rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Lot Number</Label>
                <Input value={formLotNumber} onChange={(e) => setFormLotNumber(e.target.value)} placeholder="BN-XXXX" />
              </div>
              <div className="grid gap-2">
                <Label>Product Code</Label>
                <Input value={formProductCode} onChange={(e) => setFormProductCode(e.target.value)} placeholder="PROD-XXX" />
              </div>
              <div className="grid gap-2">
                <Label>Quantity Affected</Label>
                <Input type="number" value={formQuantityAffected} onChange={(e) => setFormQuantityAffected(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assigned To *</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date *</Label>
                <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Linked CAPA</Label>
                <Select value={formLinkedCapaId} onValueChange={setFormLinkedCapaId}>
                  <SelectTrigger><SelectValue placeholder="Select CAPA" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {capas.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.capaNumber} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Linked Document</Label>
                <Input value={formLinkedDocId} onChange={(e) => setFormLinkedDocId(e.target.value)} placeholder="Document ID" />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!formTitle || !formDescription || !formDeviationDetails || !formAssignedTo}>
              Créer Déviation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedDev && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedDev.devNumber}</span>
                  {selectedDev.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status & Severity Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedDev.status])} variant="secondary">{selectedDev.status}</Badge>
                  <Badge variant="outline" className={cn(
                    selectedDev.type === 'Unplanned' ? 'border-amber-300 text-amber-700' : 'border-green-300 text-green-700'
                  )}>{selectedDev.type}</Badge>
                  <Badge className={cn(severityColors[selectedDev.severity])} variant="secondary">{selectedDev.severity}</Badge>
                  <Badge variant="outline">{selectedDev.category}</Badge>
                </div>

                {/* Status Flow */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {statusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedDev.status ? 'bg-primary text-primary-foreground' :
                        statusFlow.indexOf(s) < statusFlow.indexOf(selectedDev.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{getUserName(selectedDev.assignedTo)}</span></div>
                  <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium ml-1">{formatDate(selectedDev.dueDate)}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedDev.createdAt)}</span></div>
                  {selectedDev.closedDate && <div><span className="text-muted-foreground">Closed:</span> <span className="font-medium ml-1">{formatDate(selectedDev.closedDate)}</span></div>}
                  {selectedDev.lotNumber && <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedDev.lotNumber}</span></div>}
                  {selectedDev.productCode && <div><span className="text-muted-foreground">Product Code:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedDev.productCode}</span></div>}
                  {selectedDev.quantityAffected !== undefined && <div><span className="text-muted-foreground">Qty Affected:</span> <span className="font-medium ml-1">{selectedDev.quantityAffected}</span></div>}
                  {selectedDev.linkedCapaId && <div><span className="text-muted-foreground">Linked CAPA:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedDev.linkedCapaId}</span></div>}
                  {selectedDev.linkedDocumentId && <div><span className="text-muted-foreground">Linked Document:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedDev.linkedDocumentId}</span></div>}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Deviation Details</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.deviationDetails}</p>
                  </div>
                  {selectedDev.justification && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Justification</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.justification}</p>
                    </div>
                  )}
                  {selectedDev.riskAssessment && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Risk Assessment</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.riskAssessment}</p>
                    </div>
                  )}
                  {selectedDev.correctiveAction && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Corrective Action</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.correctiveAction}</p>
                    </div>
                  )}
                  {selectedDev.preventiveAction && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Preventive Action</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.preventiveAction}</p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {hasPermission('ncr.update') && selectedDev.status !== 'Closed' && (
                  <Button className="w-full" onClick={() => handleAdvanceStatus(selectedDev)}>
                    Advance to {getNextStatus(selectedDev.status)}
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
