'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Deviation, DeviationStatus, DeviationType,
  DeviationSeverity, DeviationCategory, DeviationProductStage,
  SignatureType,
} from '@/types/qms';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import {
  AlertTriangle, Plus, Search, Eye, ArrowRight, CheckCircle2,
  Clock, XCircle, ShieldCheck, FileText, Link2,
  ClipboardList, BarChart3, Wrench, Shield, UserCheck,
  ChevronLeft, ChevronRight, FlaskConical, PackageCheck,
  AlertOctagon, Scale, Beaker,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

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

const allCategories: DeviationCategory[] = [
  'Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation',
];

const allProductStages: DeviationProductStage[] = [
  'Raw Material', 'In-Process', 'Finished Product', 'Stability', 'Other',
];

const wizardSteps = [
  { id: 'identification', title: 'Identification', description: 'Basic deviation identification and classification' },
  { id: 'details', title: 'Deviation Details', description: 'Detailed description, SOP reference, and expected vs actual results' },
  { id: 'product', title: 'Product & Lot Info', description: 'Product code, lot number, product stage, and quarantine status' },
  { id: 'risk', title: 'Risk & Assessment', description: 'Impact assessment, containment, corrective & preventive actions' },
  { id: 'review', title: 'Review & Submit', description: 'Review all entered data before submission' },
];

function getNextStatus(current: DeviationStatus): DeviationStatus | null {
  const idx = statusFlow.indexOf(current);
  return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
}

// ──────────────────────────────────────────────
// Form state type
// ──────────────────────────────────────────────

interface DeviationFormState {
  title: string;
  type: DeviationType;
  severity: DeviationSeverity;
  category: DeviationCategory;
  detectedDate: string;
  isPlannedDeviation: boolean;
  description: string;
  deviationDetails: string;
  sopReference: string;
  expectedResult: string;
  actualResult: string;
  productCode: string;
  lotNumber: string;
  quantityAffected: string;
  productStage: DeviationProductStage | '';
  quarantine: boolean;
  justification: string;
  impactOnValidatedState: string;
  impactOnRegulatoryFiling: string;
  containmentAction: string;
  correctiveAction: string;
  preventiveAction: string;
  linkedCapaId: string;
  linkedDocumentId: string;
  assignedTo: string;
  dueDate: string;
}

const emptyForm: DeviationFormState = {
  title: '',
  type: 'Unplanned',
  severity: 'Minor',
  category: 'Process',
  detectedDate: '',
  isPlannedDeviation: false,
  description: '',
  deviationDetails: '',
  sopReference: '',
  expectedResult: '',
  actualResult: '',
  productCode: '',
  lotNumber: '',
  quantityAffected: '',
  productStage: '',
  quarantine: false,
  justification: '',
  impactOnValidatedState: '',
  impactOnRegulatoryFiling: '',
  containmentAction: '',
  correctiveAction: '',
  preventiveAction: '',
  linkedCapaId: '',
  linkedDocumentId: '',
  assignedTo: '',
  dueDate: '',
};

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function DeviationView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const deviations = store.deviations;
  const profiles = store.profiles;
  const capas = store.capas;
  const documents = store.documents;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDev, setSelectedDev] = useState<Deviation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingStatusAdvance, setPendingStatusAdvance] = useState<Deviation | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState<DeviationFormState>({ ...emptyForm });

  const updateForm = <K extends keyof DeviationFormState>(key: K, value: DeviationFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const approvedDocuments = documents.filter(d => d.status === 'Approved');

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

  const getLinkedDocument = (docId?: string) => {
    if (!docId) return null;
    return documents.find(d => d.id === docId) || null;
  };

  const getLinkedCapa = (capaId?: string) => {
    if (!capaId) return null;
    return capas.find(c => c.id === capaId) || null;
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setWizardStep(0);
  };

  const handleCreate = () => {
    const newDev: Deviation = {
      id: `dev-${Date.now()}`,
      devNumber: `DEV-2024-${String(deviations.length + 1).padStart(3, '0')}`,
      title: form.title,
      type: form.type,
      status: 'Open',
      severity: form.severity,
      category: form.category,
      description: form.description,
      deviationDetails: form.deviationDetails,
      justification: form.justification || undefined,
      riskAssessment: [form.impactOnValidatedState, form.impactOnRegulatoryFiling].filter(Boolean).join('\n\n') || undefined,
      correctiveAction: form.correctiveAction || undefined,
      preventiveAction: form.preventiveAction || undefined,
      sopReference: form.sopReference || undefined,
      expectedResult: form.expectedResult || undefined,
      actualResult: form.actualResult || undefined,
      productStage: form.productStage || undefined,
      quarantine: form.quarantine || undefined,
      impactOnValidatedState: form.impactOnValidatedState || undefined,
      impactOnRegulatoryFiling: form.impactOnRegulatoryFiling || undefined,
      containmentAction: form.containmentAction || undefined,
      detectedDate: form.detectedDate || undefined,
      isPlannedDeviation: form.isPlannedDeviation || undefined,
      lotNumber: form.lotNumber || undefined,
      productCode: form.productCode || undefined,
      quantityAffected: form.quantityAffected ? parseInt(form.quantityAffected) : undefined,
      linkedCapaId: form.linkedCapaId && form.linkedCapaId !== 'none' ? form.linkedCapaId : undefined,
      linkedDocumentId: form.linkedDocumentId && form.linkedDocumentId !== 'none' ? form.linkedDocumentId : undefined,
      assignedTo: form.assignedTo,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : new Date().toISOString(),
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addDeviation(newDev);
    resetForm();
    setShowCreateDialog(false);
  };

  const openDetail = (dev: Deviation) => {
    setSelectedDev(dev);
    setShowDetailDialog(true);
  };

  // Status advancement — QA approval (Pending QA Review → Approved) requires e-signature
  const handleAdvanceStatus = (dev: Deviation) => {
    const next = getNextStatus(dev.status);
    if (!next) return;

    if (next === 'Approved') {
      setPendingStatusAdvance(dev);
      setShowSignatureModal(true);
      return;
    }

    const updates: Partial<Deviation> = { status: next };
    if (next === 'Closed') {
      updates.closedDate = new Date().toISOString();
    }
    store.updateDeviation(dev.id, updates);
    if (selectedDev?.id === dev.id) {
      setSelectedDev({ ...dev, ...updates });
    }
  };

  // E-signature callback for QA approval
  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingStatusAdvance) return;
    const dev = pendingStatusAdvance;
    store.updateDeviation(dev.id, { status: 'Approved' });
    if (selectedDev?.id === dev.id) {
      setSelectedDev({ ...dev, status: 'Approved' });
    }
    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  // ──────────────────────────────────────────────
  // Wizard step validation
  // ──────────────────────────────────────────────

  const isStep1Valid = form.title.trim() !== '' && form.description.trim() !== '';
  const isStep2Valid = form.deviationDetails.trim() !== '';
  const isStep3Valid = form.type !== 'Planned' || form.justification.trim() !== '';
  const isStep4Valid = true; // Risk & assessment fields are optional
  const isStep5Valid = form.assignedTo.trim() !== '';

  const stepValidations = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid, isStep5Valid];
  const canAdvance = stepValidations[wizardStep];
  const canSubmit = wizardStep === wizardSteps.length - 1 && isStep1Valid && isStep2Valid && isStep3Valid && isStep5Valid;

  // ──────────────────────────────────────────────
  // Render: Summary Cards
  // ──────────────────────────────────────────────

  const renderSummaryCards = () => (
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
            <ShieldCheck className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Pending QA Review</span>
          </div>
          <span className="text-2xl font-bold">{summaryCounts.pendingQA}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
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
  );

  // ──────────────────────────────────────────────
  // Render: Filters
  // ──────────────────────────────────────────────

  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search deviations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
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
  );

  // ──────────────────────────────────────────────
  // Render: Table
  // ──────────────────────────────────────────────

  const renderTable = () => (
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
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-xs">{dev.title}</p>
                      {(dev.lotNumber || dev.productCode) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {dev.lotNumber && <span className="text-xs text-muted-foreground font-mono">Lot: {dev.lotNumber}</span>}
                          {dev.productCode && <span className="text-xs text-muted-foreground font-mono">Prod: {dev.productCode}</span>}
                        </div>
                      )}
                    </div>
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
                    No deviations found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  // ──────────────────────────────────────────────
  // Render: Wizard Step Indicator
  // ──────────────────────────────────────────────

  const renderWizardSteps = () => {
    const progress = ((wizardStep + 1) / wizardSteps.length) * 100;
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {wizardSteps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => idx < wizardStep && setWizardStep(idx)}
                disabled={idx > wizardStep}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  idx < wizardStep && 'text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20',
                  idx === wizardStep && 'text-primary bg-primary/10',
                  idx > wizardStep && 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                )}
              >
                {idx < wizardStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className={cn(
                    'flex items-center justify-center h-5 w-5 rounded-full text-xs border',
                    idx === wizardStep
                      ? 'border-primary text-primary'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400',
                  )}>
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {idx < wizardSteps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2',
                  idx < wizardStep ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {wizardSteps[wizardStep]?.description && (
          <p className="mt-2 text-sm text-muted-foreground">{wizardSteps[wizardStep].description}</p>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // Render: Step 1 – Identification
  // ──────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="dev-title">Title *</Label>
        <Input id="dev-title" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="Deviation title" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-type">Type *</Label>
          <Select value={form.type} onValueChange={(v) => {
            updateForm('type', v as DeviationType);
            if (v === 'Planned') updateForm('isPlannedDeviation', true);
            else updateForm('isPlannedDeviation', false);
          }}>
            <SelectTrigger id="dev-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Planned">Planned</SelectItem>
              <SelectItem value="Unplanned">Unplanned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-severity">Severity *</Label>
          <Select value={form.severity} onValueChange={(v) => updateForm('severity', v as DeviationSeverity)}>
            <SelectTrigger id="dev-severity"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="Major">Major</SelectItem>
              <SelectItem value="Minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-category">Category *</Label>
          <Select value={form.category} onValueChange={(v) => updateForm('category', v as DeviationCategory)}>
            <SelectTrigger id="dev-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {allCategories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-detected-date">Deviation Detected Date</Label>
          <Input id="dev-detected-date" type="date" value={form.detectedDate} onChange={(e) => updateForm('detectedDate', e.target.value)} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Checkbox
            id="dev-planned-flag"
            checked={form.isPlannedDeviation}
            onCheckedChange={(checked) => {
              updateForm('isPlannedDeviation', checked === true);
              if (checked) updateForm('type', 'Planned');
            }}
          />
          <Label htmlFor="dev-planned-flag" className="cursor-pointer">
            Planned Deviation
          </Label>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dev-description">Description *</Label>
        <Textarea id="dev-description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Describe the deviation..." rows={4} />
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render: Step 2 – Deviation Details
  // ──────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="dev-details">Detailed Description *</Label>
        <Textarea id="dev-details" value={form.deviationDetails} onChange={(e) => updateForm('deviationDetails', e.target.value)} placeholder="Provide a detailed description of the deviation, including what happened and how it was discovered..." rows={5} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dev-sop-ref">SOP Reference</Label>
        <Input id="dev-sop-ref" value={form.sopReference} onChange={(e) => updateForm('sopReference', e.target.value)} placeholder="e.g., SOP-MFG-001 Rev. 3" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-expected">Expected Result</Label>
          <Textarea id="dev-expected" value={form.expectedResult} onChange={(e) => updateForm('expectedResult', e.target.value)} placeholder="What was the expected outcome per SOP?" rows={4} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-actual">Actual Result</Label>
          <Textarea id="dev-actual" value={form.actualResult} onChange={(e) => updateForm('actualResult', e.target.value)} placeholder="What actually happened?" rows={4} />
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render: Step 3 – Product & Lot Info
  // ──────────────────────────────────────────────

  const renderStep3 = () => (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-product-code">Product Code</Label>
          <Input id="dev-product-code" value={form.productCode} onChange={(e) => updateForm('productCode', e.target.value)} placeholder="PROD-XXX" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-lot-number">Lot Number</Label>
          <Input id="dev-lot-number" value={form.lotNumber} onChange={(e) => updateForm('lotNumber', e.target.value)} placeholder="BN-XXXX" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-qty-affected">Quantity Affected</Label>
          <Input id="dev-qty-affected" type="number" value={form.quantityAffected} onChange={(e) => updateForm('quantityAffected', e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-product-stage">Product Stage</Label>
          <Select value={form.productStage} onValueChange={(v) => updateForm('productStage', v as DeviationProductStage)}>
            <SelectTrigger id="dev-product-stage"><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>
              {allProductStages.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Checkbox
            id="dev-quarantine"
            checked={form.quarantine}
            onCheckedChange={(checked) => updateForm('quarantine', checked === true)}
          />
          <Label htmlFor="dev-quarantine" className="cursor-pointer">
            Product Quarantined
          </Label>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="dev-justification">Justification</Label>
          {form.type === 'Planned' && (
            <Badge variant="outline" className="text-xs border-red-300 text-red-700">Required for Planned (ISO 13485 §8.7)</Badge>
          )}
        </div>
        <Textarea
          id="dev-justification"
          value={form.justification}
          onChange={(e) => updateForm('justification', e.target.value)}
          placeholder={form.type === 'Planned' ? 'Justification is required for planned deviations per ISO 13485 §8.7...' : 'Optional justification...'}
          rows={3}
        />
        {form.type === 'Planned' && !form.justification.trim() && (
          <p className="text-xs text-red-500 mt-1">Justification is required for Planned deviations per ISO 13485 §8.7</p>
        )}
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render: Step 4 – Risk & Assessment
  // ──────────────────────────────────────────────

  const renderStep4 = () => (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-impact-validated">Impact on Validated State</Label>
          <Textarea id="dev-impact-validated" value={form.impactOnValidatedState} onChange={(e) => updateForm('impactOnValidatedState', e.target.value)} placeholder="Describe impact on validated state..." rows={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-impact-regulatory">Impact on Regulatory Filing</Label>
          <Textarea id="dev-impact-regulatory" value={form.impactOnRegulatoryFiling} onChange={(e) => updateForm('impactOnRegulatoryFiling', e.target.value)} placeholder="Describe impact on regulatory filings..." rows={3} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dev-containment">Immediate Containment Action</Label>
        <Textarea id="dev-containment" value={form.containmentAction} onChange={(e) => updateForm('containmentAction', e.target.value)} placeholder="Describe immediate containment actions taken..." rows={3} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-corrective">Corrective Action</Label>
          <Textarea id="dev-corrective" value={form.correctiveAction} onChange={(e) => updateForm('correctiveAction', e.target.value)} placeholder="Corrective action to address root cause..." rows={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-preventive">Preventive Action</Label>
          <Textarea id="dev-preventive" value={form.preventiveAction} onChange={(e) => updateForm('preventiveAction', e.target.value)} placeholder="Preventive action to avoid recurrence..." rows={3} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dev-linked-capa">Linked CAPA</Label>
          <Select value={form.linkedCapaId} onValueChange={setFormLinkedCapaId => updateForm('linkedCapaId', setFormLinkedCapaId)}>
            <SelectTrigger id="dev-linked-capa"><SelectValue placeholder="Select CAPA" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {capas.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.capaNumber} - {c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dev-linked-doc">Linked Document</Label>
          <Select value={form.linkedDocumentId} onValueChange={(v) => updateForm('linkedDocumentId', v)}>
            <SelectTrigger id="dev-linked-doc"><SelectValue placeholder="Select document" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {approvedDocuments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.documentNumber} - {d.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render: Step 5 – Review & Submit
  // ──────────────────────────────────────────────

  const renderStep5 = () => (
    <div className="space-y-5">
      {/* Identification Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Step 1 — Identification
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{form.title}</span></div>
          <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className={cn('ml-1', form.type === 'Unplanned' ? 'border-amber-300 text-amber-700' : 'border-green-300 text-green-700')}>{form.type}</Badge></div>
          <div><span className="text-muted-foreground">Severity:</span> <Badge className={cn('ml-1 text-xs', severityColors[form.severity])} variant="secondary">{form.severity}</Badge></div>
          <div><span className="text-muted-foreground">Category:</span> <Badge variant="outline" className="ml-1 text-xs">{form.category}</Badge></div>
          {form.detectedDate && <div><span className="text-muted-foreground">Detected Date:</span> <span className="font-medium">{form.detectedDate}</span></div>}
          <div><span className="text-muted-foreground">Planned Deviation:</span> <span className="font-medium">{form.isPlannedDeviation ? 'Yes' : 'No'}</span></div>
        </div>
        {form.description && (
          <div className="mt-2 text-sm"><span className="text-muted-foreground">Description:</span> <span>{form.description}</span></div>
        )}
      </div>

      {/* Details Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Step 2 — Deviation Details
        </h4>
        <div className="grid gap-2 text-sm">
          {form.deviationDetails && <div><span className="text-muted-foreground">Details:</span> <span>{form.deviationDetails}</span></div>}
          {form.sopReference && <div><span className="text-muted-foreground">SOP Reference:</span> <span className="font-mono">{form.sopReference}</span></div>}
          {form.expectedResult && <div><span className="text-muted-foreground">Expected Result:</span> <span>{form.expectedResult}</span></div>}
          {form.actualResult && <div><span className="text-muted-foreground">Actual Result:</span> <span>{form.actualResult}</span></div>}
        </div>
      </div>

      {/* Product & Lot Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-cyan-600" />
          Step 3 — Product & Lot Info
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {form.productCode && <div><span className="text-muted-foreground">Product Code:</span> <span className="font-mono font-medium">{form.productCode}</span></div>}
          {form.lotNumber && <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-mono font-medium">{form.lotNumber}</span></div>}
          {form.quantityAffected && <div><span className="text-muted-foreground">Qty Affected:</span> <span className="font-medium">{form.quantityAffected}</span></div>}
          {form.productStage && <div><span className="text-muted-foreground">Product Stage:</span> <span className="font-medium">{form.productStage}</span></div>}
          <div><span className="text-muted-foreground">Quarantined:</span> <span className="font-medium">{form.quarantine ? 'Yes' : 'No'}</span></div>
        </div>
        {form.justification && (
          <div className="mt-2 text-sm"><span className="text-muted-foreground">Justification:</span> <span>{form.justification}</span></div>
        )}
      </div>

      {/* Risk & Assessment Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-orange-500" />
          Step 4 — Risk & Assessment
        </h4>
        <div className="grid gap-2 text-sm">
          {form.impactOnValidatedState && <div><span className="text-muted-foreground">Impact on Validated State:</span> <span>{form.impactOnValidatedState}</span></div>}
          {form.impactOnRegulatoryFiling && <div><span className="text-muted-foreground">Impact on Regulatory Filing:</span> <span>{form.impactOnRegulatoryFiling}</span></div>}
          {form.containmentAction && <div><span className="text-muted-foreground">Containment Action:</span> <span>{form.containmentAction}</span></div>}
          {form.correctiveAction && <div><span className="text-muted-foreground">Corrective Action:</span> <span>{form.correctiveAction}</span></div>}
          {form.preventiveAction && <div><span className="text-muted-foreground">Preventive Action:</span> <span>{form.preventiveAction}</span></div>}
          {form.linkedCapaId && form.linkedCapaId !== 'none' && (() => {
            const capa = capas.find(c => c.id === form.linkedCapaId);
            return capa ? <div><span className="text-muted-foreground">Linked CAPA:</span> <span className="font-mono">{capa.capaNumber}</span> — <span>{capa.title}</span></div> : null;
          })()}
          {form.linkedDocumentId && form.linkedDocumentId !== 'none' && (() => {
            const doc = approvedDocuments.find(d => d.id === form.linkedDocumentId);
            return doc ? <div><span className="text-muted-foreground">Linked Document:</span> <span className="font-mono">{doc.documentNumber}</span> — <span>{doc.title}</span></div> : null;
          })()}
        </div>
      </div>

      {/* Assignment & Due Date */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Assignment
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dev-assigned">Assigned To *</Label>
            <Select value={form.assignedTo} onValueChange={(v) => updateForm('assignedTo', v)}>
              <SelectTrigger id="dev-assigned"><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dev-due-date">Due Date *</Label>
            <Input id="dev-due-date" type="date" value={form.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Regulatory Compliance Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Scale className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Regulatory Compliance — ISO 13485 §8.3</p>
            <p className="mt-1">
              This deviation record is created in accordance with ISO 13485:2016 §8.3 — Control of nonconforming product.
              All deviations must be documented, investigated, and dispositioned. Planned deviations require justification
              per §8.7. Electronic signatures for QA approval comply with 21 CFR Part 11 requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render: Create Deviation Dialog (Wizard)
  // ──────────────────────────────────────────────

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { resetForm(); } setShowCreateDialog(open); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Create New Deviation
          </DialogTitle>
        </DialogHeader>

        {/* Wizard Step Indicator */}
        {renderWizardSteps()}

        {/* Step Content */}
        {wizardStep === 0 && renderStep1()}
        {wizardStep === 1 && renderStep2()}
        {wizardStep === 2 && renderStep3()}
        {wizardStep === 3 && renderStep4()}
        {wizardStep === 4 && renderStep5()}

        {/* Wizard Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {wizardStep > 0 && (
              <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            {wizardStep < wizardSteps.length - 1 ? (
              <Button
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={!canAdvance}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canSubmit}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Deviation
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ──────────────────────────────────────────────
  // Render: Detail Dialog (Enhanced)
  // ──────────────────────────────────────────────

  const renderDetailDialog = () => (
    <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
                {selectedDev.isPlannedDeviation && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700">Planned Deviation</Badge>
                )}
                {selectedDev.quarantine && (
                  <Badge variant="outline" className="border-red-300 text-red-700">Quarantined</Badge>
                )}
              </div>

              {/* Status Flow Visualization */}
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

              {/* Full Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Assigned To:</span>{' '}
                  <span className="font-medium">{getUserName(selectedDev.assignedTo)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>{' '}
                  <span className="font-medium">{formatDate(selectedDev.dueDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span className="font-medium">{formatDate(selectedDev.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>{' '}
                  <span className="font-medium">{formatDate(selectedDev.updatedAt)}</span>
                </div>
                {selectedDev.detectedDate && (
                  <div>
                    <span className="text-muted-foreground">Detected Date:</span>{' '}
                    <span className="font-medium">{formatDate(selectedDev.detectedDate)}</span>
                  </div>
                )}
                {selectedDev.closedDate && (
                  <div>
                    <span className="text-muted-foreground">Closed Date:</span>{' '}
                    <span className="font-medium">{formatDate(selectedDev.closedDate)}</span>
                  </div>
                )}
                {selectedDev.createdById && (
                  <div>
                    <span className="text-muted-foreground">Created By:</span>{' '}
                    <span className="font-medium">{getUserName(selectedDev.createdById)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Description
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDev.description}</p>
              </div>

              {/* Deviation Details */}
              <div>
                <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Deviation Details
                </h4>
                <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-900/10 p-3 rounded-md border border-amber-200 dark:border-amber-800">{selectedDev.deviationDetails}</p>
              </div>

              {/* SOP Reference & Expected vs Actual */}
              {(selectedDev.sopReference || selectedDev.expectedResult || selectedDev.actualResult) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    SOP Reference & Result Comparison
                  </h4>
                  <div className="space-y-2">
                    {selectedDev.sopReference && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">SOP Reference</span>
                        <p className="text-sm font-mono mt-0.5">{selectedDev.sopReference}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDev.expectedResult && (
                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md border border-green-200 dark:border-green-800">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Expected Result</span>
                          <p className="text-sm mt-0.5">{selectedDev.expectedResult}</p>
                        </div>
                      )}
                      {selectedDev.actualResult && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">Actual Result</span>
                          <p className="text-sm mt-0.5">{selectedDev.actualResult}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Product & Lot Information */}
              {(selectedDev.lotNumber || selectedDev.productCode || selectedDev.quantityAffected !== undefined || selectedDev.productStage || selectedDev.quarantine) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <PackageCheck className="h-4 w-4 text-cyan-600" />
                    Product & Lot Information
                  </h4>
                  <div className="bg-cyan-50 dark:bg-cyan-900/10 p-3 rounded-md border border-cyan-200 dark:border-cyan-800">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {selectedDev.productCode && (
                        <div><span className="text-muted-foreground">Product Code:</span> <span className="font-medium font-mono">{selectedDev.productCode}</span></div>
                      )}
                      {selectedDev.lotNumber && (
                        <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-medium font-mono">{selectedDev.lotNumber}</span></div>
                      )}
                      {selectedDev.quantityAffected !== undefined && (
                        <div><span className="text-muted-foreground">Qty Affected:</span> <span className="font-medium">{selectedDev.quantityAffected}</span></div>
                      )}
                      {selectedDev.productStage && (
                        <div><span className="text-muted-foreground">Product Stage:</span> <span className="font-medium">{selectedDev.productStage}</span></div>
                      )}
                      {selectedDev.quarantine !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Quarantined:</span>{' '}
                          <Badge variant={selectedDev.quarantine ? 'destructive' : 'secondary'} className="text-xs">
                            {selectedDev.quarantine ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Justification */}
              {selectedDev.justification && (
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Justification
                    {selectedDev.type === 'Planned' && (
                      <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">Required for Planned</Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-200 dark:border-blue-800">{selectedDev.justification}</p>
                </div>
              )}

              <Separator />

              {/* Impact Assessment */}
              {(selectedDev.impactOnValidatedState || selectedDev.impactOnRegulatoryFiling) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    Impact Assessment
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDev.impactOnValidatedState && (
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Impact on Validated State</span>
                        <p className="text-sm mt-0.5">{selectedDev.impactOnValidatedState}</p>
                      </div>
                    )}
                    {selectedDev.impactOnRegulatoryFiling && (
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Impact on Regulatory Filing</span>
                        <p className="text-sm mt-0.5">{selectedDev.impactOnRegulatoryFiling}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Containment / Corrective / Preventive Actions — Color-coded */}
              {(selectedDev.containmentAction || selectedDev.correctiveAction || selectedDev.preventiveAction) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    Actions
                  </h4>
                  <div className="space-y-3">
                    {/* Containment Action — Orange for risk */}
                    {selectedDev.containmentAction && (
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-md border-l-4 border-orange-500">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertOctagon className="h-4 w-4 text-orange-500" />
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Immediate Containment Action</span>
                        </div>
                        <p className="text-sm">{selectedDev.containmentAction}</p>
                      </div>
                    )}
                    {/* Corrective Action — Red */}
                    {selectedDev.correctiveAction && (
                      <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border-l-4 border-red-500">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Corrective Action</span>
                        </div>
                        <p className="text-sm">{selectedDev.correctiveAction}</p>
                      </div>
                    )}
                    {/* Preventive Action — Green */}
                    {selectedDev.preventiveAction && (
                      <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Preventive Action</span>
                        </div>
                        <p className="text-sm">{selectedDev.preventiveAction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legacy Risk Assessment (for backward compatibility) */}
              {selectedDev.riskAssessment && !selectedDev.impactOnValidatedState && !selectedDev.impactOnRegulatoryFiling && (
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    Risk Assessment
                  </h4>
                  <p className="text-sm text-muted-foreground bg-orange-50 dark:bg-orange-900/10 p-3 rounded-md border border-orange-200 dark:border-orange-800">{selectedDev.riskAssessment}</p>
                </div>
              )}

              <Separator />

              {/* Linked CAPA */}
              {(() => {
                const linkedCapa = getLinkedCapa(selectedDev.linkedCapaId);
                return linkedCapa ? (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      Linked CAPA
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium font-mono">{linkedCapa.capaNumber}</p>
                        <p className="text-xs text-muted-foreground">{linkedCapa.title}</p>
                      </div>
                      <Badge className={cn('text-xs ml-auto',
                        linkedCapa.status === 'Closed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        linkedCapa.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )} variant="secondary">
                        {linkedCapa.status}
                      </Badge>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Linked Document */}
              {(() => {
                const linkedDoc = getLinkedDocument(selectedDev.linkedDocumentId);
                return linkedDoc ? (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Linked Document
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium font-mono">{linkedDoc.documentNumber}</p>
                        <p className="text-xs text-muted-foreground">{linkedDoc.title}</p>
                      </div>
                      <Badge className={cn('text-xs ml-auto',
                        linkedDoc.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        linkedDoc.status === 'Draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )} variant="secondary">
                        {linkedDoc.status}
                      </Badge>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* ISO 13485 §8.3 Compliance Note */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                <Scale className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium">ISO 13485:2016 §8.3 — Control of Nonconforming Product</p>
                  <p className="mt-1">
                    This deviation is managed per §8.3 requirements. All nonconformities must be documented,
                    reviewed, and dispositioned. QA approval requires electronic signature per 21 CFR Part 11.
                  </p>
                </div>
              </div>

              {/* Electronic Signature for QA Approval */}
              {selectedDev.status === 'Approved' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">QA Approved — Electronic Signature Applied</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    This deviation has been approved with a valid electronic signature complying with 21 CFR Part 11.
                  </p>
                </div>
              )}

              {/* Action Buttons — BUG FIX: deviation.update instead of ncr.update */}
              {hasPermission('deviation.update') && selectedDev.status !== 'Closed' && (
                <Button className="w-full" onClick={() => handleAdvanceStatus(selectedDev)}>
                  {getNextStatus(selectedDev.status) === 'Approved' ? (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Approve with Electronic Signature
                    </>
                  ) : (
                    <>
                      Advance to {getNextStatus(selectedDev.status)}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // ──────────────────────────────────────────────
  // Main Render
  // ──────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header — BUG FIX: deviation.create instead of ncr.create */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Deviations
          </h1>
          <p className="text-muted-foreground mt-1">Deviation recording, investigation, and management (ISO 13485 §8.3)</p>
        </div>
        {hasPermission('deviation.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Deviation
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Table */}
      {renderTable()}

      {/* Create Deviation Wizard Dialog */}
      {renderCreateDialog()}

      {/* Detail Dialog */}
      {renderDetailDialog()}

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingStatusAdvance ? `${pendingStatusAdvance.devNumber} — ${pendingStatusAdvance.title}` : ''}
        recordId={pendingStatusAdvance?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
