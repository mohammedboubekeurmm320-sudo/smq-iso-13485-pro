'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { TemplateSelector } from '@/components/shared/TemplateSelector';
import { cn, formatDate } from '@/lib/utils';
import type { NonConformance, NcrStatus, NcrType, NcrSeverity, NcrDisposition, SignatureType, FormTemplateModule } from '@/types/qms';
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow';
import {
  AlertTriangle, Plus, Search, ArrowRight, AlertCircle,
  CheckCircle2, Clock, ShieldCheck, Link2, Beaker,
  ChevronLeft, ChevronRight, FileText, ClipboardList, FlaskConical,
  Scale, ListChecks,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ─── Constants ───────────────────────────────────────────────────────────────

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

const dispositionColors: Record<NcrDisposition, string> = {
  'Use As Is': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rework': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Scrap': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Return to Supplier': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Concession': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const ncrStatusFlow: NcrStatus[] = ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'];

const ncrTypes: NcrType[] = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'];
const ncrSeverities: NcrSeverity[] = ['Critical', 'Major', 'Minor'];
const ncrDispositions: NcrDisposition[] = ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending'];

const WIZARD_STEPS = [
  { id: 0, label: 'NCR Identification', icon: FileText },
  { id: 1, label: 'Description & Details', icon: ClipboardList },
  { id: 2, label: 'OOS/OOT Investigation', icon: FlaskConical },
  { id: 3, label: 'Disposition & Impact', icon: Scale },
  { id: 4, label: 'Summary & Submit', icon: ListChecks },
];

function getNextNcrStatus(current: NcrStatus): NcrStatus | null {
  const idx = ncrStatusFlow.indexOf(current);
  return idx < ncrStatusFlow.length - 1 ? ncrStatusFlow[idx + 1] : null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NcrView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const ncrs = store.ncrs;
  const profiles = store.profiles;
  const capas = store.capas;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState<NonConformance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Electronic signature
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingCloseNcr, setPendingCloseNcr] = useState<NonConformance | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);

  // Create form state — Step 1: NCR Identification
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<NcrType>('Process');
  const [formSeverity, setFormSeverity] = useState<NcrSeverity>('Major');
  const [formSource, setFormSource] = useState('');

  // Step 2: Description & Details
  const [formDescription, setFormDescription] = useState('');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formQtyAffected, setFormQtyAffected] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // Step 3: OOS/OOT Investigation
  const [formAnalyticalMethod, setFormAnalyticalMethod] = useState('');
  const [formMeasuredValue, setFormMeasuredValue] = useState('');
  const [formMeasuredUnit, setFormMeasuredUnit] = useState('');
  const [formSpecLimit, setFormSpecLimit] = useState('');
  const [formIsOosOot, setFormIsOosOot] = useState(false);
  const [formPhase1Conclusion, setFormPhase1Conclusion] = useState<'Pending' | 'No Error Found' | 'Error Found'>('Pending');

  // Step 4: Disposition & Impact
  const [formPreliminaryDisposition, setFormPreliminaryDisposition] = useState<NcrDisposition>('Pending');
  const [formImpactAssessment, setFormImpactAssessment] = useState('');
  const [formContainmentActions, setFormContainmentActions] = useState('');
  const [formAffectedProduct, setFormAffectedProduct] = useState('');

  // Template
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newTemplateVersion, setNewTemplateVersion] = useState('');

  // Detail dialog disposition edit
  const [detailDisposition, setDetailDisposition] = useState<string>('');

  // ── Template selection (Layer 2) ──
  const [formTemplateId, setFormTemplateId] = useState('');

  // ── Template workflow (Layer 1 & 2) ──
  const { getApprovedTemplates, hasApprovedTemplate, moduleTypeLabels } = useRecordWorkflow();
  const ncrModuleType: FormTemplateModule = 'ncr';
  const approvedNcrTemplates = getApprovedTemplates(ncrModuleType);

  const filteredNcrs = ncrs.filter(n => {
    const matchesSearch = searchTerm === '' ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.description && n.description.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const getLinkedCapa = (capaId?: string) => {
    if (!capaId) return null;
    return capas.find(c => c.id === capaId) || null;
  };

  // ── Step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formTitle.trim() !== '' && formSeverity.trim() !== '';
      case 1:
        return formDescription.trim() !== '';
      case 2:
        // If OOS/OOT, analytical method is required; otherwise always valid (skip step)
        return formIsOosOot ? formAnalyticalMethod.trim() !== '' : true;
      case 3:
        return formImpactAssessment.trim() !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ── Navigation ──
  const goToStep = (step: number) => {
    if (step >= 0 && step < WIZARD_STEPS.length) {
      setWizardStep(step);
    }
  };

  const goNext = () => {
    if (wizardStep < WIZARD_STEPS.length - 1 && isStepValid(wizardStep)) {
      setWizardStep(wizardStep + 1);
    }
  };

  const goPrev = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  const resetForm = () => {
    setWizardStep(0);
    setFormTitle(''); setFormType('Process'); setFormSeverity('Major');
    setFormSource(''); setFormDescription(''); setFormLotNumber('');
    setFormQtyAffected(''); setFormAssignedTo(''); setFormDueDate('');
    setFormAnalyticalMethod(''); setFormMeasuredValue('');
    setFormMeasuredUnit(''); setFormSpecLimit(''); setFormIsOosOot(false);
    setFormPhase1Conclusion('Pending');
    setFormPreliminaryDisposition('Pending');
    setFormImpactAssessment(''); setFormContainmentActions(''); setFormAffectedProduct('');
    setNewTemplateId('');
    setNewTemplateVersion('');
  };

  const handleCreate = () => {
    const newNcr: NonConformance = {
      id: `ncr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ncrNumber: `NCR-2024-${String(ncrs.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Open',
      severity: formSeverity,
      source: formSource || undefined,
      description: formDescription,
      lotNumber: formLotNumber || undefined,
      quantityAffected: formQtyAffected ? parseInt(formQtyAffected) : undefined,
      assignedTo: formAssignedTo || undefined,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined,
      disposition: formPreliminaryDisposition,
      isOosOot: formIsOosOot,
      analyticalMethod: formIsOosOot ? formAnalyticalMethod || undefined : undefined,
      measuredValue: formIsOosOot && formMeasuredValue ? parseFloat(formMeasuredValue) : undefined,
      measuredUnit: formIsOosOot ? formMeasuredUnit || undefined : undefined,
      specLimit: formIsOosOot ? formSpecLimit || undefined : undefined,
      phase1Conclusion: formIsOosOot ? formPhase1Conclusion : undefined,
      phase2Required: formIsOosOot,
      rejectLot: false,
      impactAssessment: formImpactAssessment || undefined,
      containmentActions: formContainmentActions || undefined,
      affectedProduct: formAffectedProduct || undefined,
      createdDate: new Date().toISOString(),
      templateId: formTemplateId || undefined,
      templateVersion: formTemplateId ? approvedNcrTemplates.find(t => t.id === formTemplateId)?.version : undefined,
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

    // When advancing to Closed, require electronic signature
    if (next === 'Closed') {
      setPendingCloseNcr(ncr);
      setShowSignatureModal(true);
      return;
    }

    store.updateNCR(ncr.id, { status: next });
    if (selectedNcr?.id === ncr.id) {
      setSelectedNcr({ ...ncr, status: next });
    }
  };

  // Electronic signature callback for closing NCR
  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType; reason?: string }) => {
    if (!pendingCloseNcr) return;

    store.updateNCR(pendingCloseNcr.id, {
      status: 'Closed',
      closedSignatureHash: signatureData.signatureHash,
      closedSignedAt: signatureData.signedAt,
      closedById: currentUser?.id,
      closedReason: signatureData.reason,
    });

    if (selectedNcr?.id === pendingCloseNcr.id) {
      setSelectedNcr({ ...pendingCloseNcr, status: 'Closed' });
    }

    setPendingCloseNcr(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingCloseNcr(null);
    setShowSignatureModal(false);
  };

  const openDetail = (ncr: NonConformance) => {
    setSelectedNcr(ncr);
    setDetailDisposition(ncr.disposition || '');
    setShowDetailDialog(true);
  };

  const handleSetDisposition = () => {
    if (!selectedNcr || !detailDisposition) return;
    store.updateNCR(selectedNcr.id, { disposition: detailDisposition as NcrDisposition });
    setSelectedNcr({ ...selectedNcr, disposition: detailDisposition as NcrDisposition });
  };

  // ── Render: Wizard Step Content ──
  const renderStepContent = () => {
    switch (wizardStep) {
      // ── Step 1: NCR Identification ──
      case 0:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ncr-title">Title *</Label>
              <Input id="ncr-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Enter NCR title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => {
                  setFormType(v as NcrType);
                  setFormIsOosOot(v === 'OOS' || v === 'OOT');
                }}>
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
                    {ncrSeverities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncr-source">Source</Label>
              <Input id="ncr-source" value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="e.g., Customer Complaint, Internal Audit..." />
            </div>
            {/* Template Selection (Layer 2) */}
            <div className="grid gap-2">
              <Label>Template</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select an approved template (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {approvedNcrTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {approvedNcrTemplates.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">No approved NCR templates found. Create one in the Forms module first.</p>
              )}
            </div>
            {formIsOosOot && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
                <Beaker className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  OOS/OOT type selected — investigation fields will be required in Step 3.
                </p>
              </div>
            )}
            <TemplateSelector
              moduleType="ncr"
              value={newTemplateId}
              onChange={(id, version) => {
                setNewTemplateId(id);
                setNewTemplateVersion(version);
              }}
              required
            />
          </div>
        );

      // ── Step 2: Description & Details ──
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ncr-description">Description *</Label>
              <Textarea id="ncr-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the non-conformance..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ncr-lot">Lot Number</Label>
                <Input id="ncr-lot" value={formLotNumber} onChange={(e) => setFormLotNumber(e.target.value)} placeholder="BN-2024-XXX" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ncr-qty">Quantity Affected</Label>
                <Input id="ncr-qty" type="number" value={formQtyAffected} onChange={(e) => setFormQtyAffected(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assigned To</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ncr-due">Due Date</Label>
                <Input id="ncr-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
          </div>
        );

      // ── Step 3: OOS/OOT Investigation ──
      case 2:
        return formIsOosOot ? (
          <div className="grid gap-4">
            <div className="border border-red-200 dark:border-red-800 rounded-md p-4 space-y-3 bg-red-50/50 dark:bg-red-900/10">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Beaker className="h-4 w-4 text-red-500" /> OOS/OOT Investigation Fields
              </h4>
              <div className="grid gap-2">
                <Label htmlFor="ncr-method">Analytical Method *</Label>
                <Input id="ncr-method" value={formAnalyticalMethod} onChange={(e) => setFormAnalyticalMethod(e.target.value)} placeholder="HPLC Method QC-M-XXX" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ncr-value">Measured Value</Label>
                  <Input id="ncr-value" type="number" value={formMeasuredValue} onChange={(e) => setFormMeasuredValue(e.target.value)} placeholder="0.0" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ncr-unit">Unit</Label>
                  <Input id="ncr-unit" value={formMeasuredUnit} onChange={(e) => setFormMeasuredUnit(e.target.value)} placeholder="%" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ncr-spec">Spec Limit</Label>
                  <Input id="ncr-spec" value={formSpecLimit} onChange={(e) => setFormSpecLimit(e.target.value)} placeholder="95.0-105.0%" />
                </div>
              </div>
              <Separator className="bg-red-200 dark:bg-red-800" />
              <div className="grid gap-2">
                <Label>Phase 1 Conclusion</Label>
                <Select value={formPhase1Conclusion} onValueChange={(v) => setFormPhase1Conclusion(v as 'Pending' | 'No Error Found' | 'Error Found')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="No Error Found">No Error Found</SelectItem>
                    <SelectItem value="Error Found">Error Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FlaskConical className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">No Investigation Fields Required</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              OOS/OOT investigation fields are only applicable when the NCR type is OOS or OOT. Since this NCR is of type <span className="font-medium">{formType}</span>, this step will be skipped.
            </p>
          </div>
        );

      // ── Step 4: Disposition & Impact ──
      case 3:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Preliminary Disposition</Label>
              <Select value={formPreliminaryDisposition} onValueChange={(v) => setFormPreliminaryDisposition(v as NcrDisposition)}>
                <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
                <SelectContent>
                  {ncrDispositions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncr-impact">Impact Assessment *</Label>
              <Textarea id="ncr-impact" value={formImpactAssessment} onChange={(e) => setFormImpactAssessment(e.target.value)} placeholder="Assess the impact of this non-conformance on product quality, patient safety, and regulatory compliance..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncr-containment">Immediate Containment Actions</Label>
              <Textarea id="ncr-containment" value={formContainmentActions} onChange={(e) => setFormContainmentActions(e.target.value)} placeholder="Describe any immediate containment actions taken..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncr-affected">Affected Product / Process</Label>
              <Input id="ncr-affected" value={formAffectedProduct} onChange={(e) => setFormAffectedProduct(e.target.value)} placeholder="e.g., Product XYZ, Manufacturing Line A" />
            </div>
          </div>
        );

      // ── Step 5: Summary & Submit ──
      case 4:
        return (
          <div className="grid gap-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Review Summary
              </h4>

              {/* Step 1 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1 — NCR Identification</p>
                <p className="text-sm"><span className="font-medium">Title:</span> {formTitle || '—'}</p>
                <p className="text-sm"><span className="font-medium">Type:</span> {formType}</p>
                <p className="text-sm"><span className="font-medium">Severity:</span> {formSeverity}</p>
                <p className="text-sm"><span className="font-medium">Source:</span> {formSource || '—'}</p>
              </div>

              {/* Step 2 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2 — Description & Details</p>
                <p className="text-sm"><span className="font-medium">Description:</span> {formDescription || '—'}</p>
                {formLotNumber && <p className="text-sm"><span className="font-medium">Lot Number:</span> {formLotNumber}</p>}
                {formQtyAffected && <p className="text-sm"><span className="font-medium">Qty Affected:</span> {formQtyAffected}</p>}
                <p className="text-sm"><span className="font-medium">Assigned To:</span> {formAssignedTo ? getUserName(formAssignedTo) : '—'}</p>
                <p className="text-sm"><span className="font-medium">Due Date:</span> {formDueDate || '—'}</p>
              </div>

              {/* Step 3 Summary */}
              {formIsOosOot && (
                <div className="border rounded-md p-3 space-y-1 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 3 — OOS/OOT Investigation</p>
                  <p className="text-sm"><span className="font-medium">Analytical Method:</span> {formAnalyticalMethod || '—'}</p>
                  {formMeasuredValue && <p className="text-sm"><span className="font-medium">Measured Value:</span> {formMeasuredValue} {formMeasuredUnit}</p>}
                  {formSpecLimit && <p className="text-sm"><span className="font-medium">Spec Limit:</span> {formSpecLimit}</p>}
                  <p className="text-sm"><span className="font-medium">Phase 1 Conclusion:</span> {formPhase1Conclusion}</p>
                </div>
              )}

              {/* Step 4 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 4 — Disposition & Impact</p>
                <p className="text-sm"><span className="font-medium">Preliminary Disposition:</span> {formPreliminaryDisposition}</p>
                <p className="text-sm"><span className="font-medium">Impact Assessment:</span> {formImpactAssessment || '—'}</p>
                {formContainmentActions && <p className="text-sm"><span className="font-medium">Containment Actions:</span> {formContainmentActions}</p>}
                {formAffectedProduct && <p className="text-sm"><span className="font-medium">Affected Product/Process:</span> {formAffectedProduct}</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Non-Conformances
          </h1>
          <p className="text-muted-foreground mt-1">Manage non-conformance reports and investigations <Badge variant="outline" className="ml-2 text-xs">ISO 13485 §8.3</Badge></p>
        </div>
        {hasPermission('ncr.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New NCR
          </Button>
        )}
      </div>

      {/* Layer 1 Gate Warning */}
      {!hasApprovedTemplate(ncrModuleType) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No approved template found for NCR records. Please create and approve a template in the Forms module first.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
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
            <span className="text-2xl font-bold">{summaryCounts.investigation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Pending Disposition</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.pending}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Closed</span>
            </div>
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
            {ncrSeverities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                  <TableHead className="w-[120px]">Template</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNcrs.map(ncr => (
                  <TableRow key={ncr.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(ncr)}>
                    <TableCell className="font-mono text-xs">{ncr.ncrNumber}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-xs">{ncr.title}</p>
                        {ncr.isOosOot && (
                          <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                            <Beaker className="h-3 w-3" />OOS/OOT
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(ncr.isOosOot ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400' : '')}>{ncr.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {ncr.severity && <Badge className={cn('text-xs', severityColors[ncr.severity])} variant="secondary">{ncr.severity}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[ncr.status])} variant="secondary">{ncr.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {ncr.disposition && ncr.disposition !== 'Pending' ? (
                        <Badge className={cn('text-xs', dispositionColors[ncr.disposition])} variant="secondary">{ncr.disposition}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{getUserName(ncr.assignedTo)}</TableCell>
                    <TableCell>
                      {ncr.templateId ? (
                        <Badge variant="outline" className="text-xs border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                          {(() => {
                            const tpl = store.formTemplates.find(t => t.id === ncr.templateId);
                            return tpl ? `${tpl.title} v${ncr.templateVersion || tpl.version}` : ncr.templateId;
                          })()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(ncr.createdDate, true)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNcrs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No NCRs found matching filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create NCR Dialog — Wizard */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Create New NCR
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              {WIZARD_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                  <button
                    type="button"
                    onClick={() => idx < wizardStep && goToStep(idx)}
                    disabled={idx > wizardStep}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      idx < wizardStep && 'text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20',
                      idx === wizardStep && 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
                      idx > wizardStep && 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                    )}
                  >
                    {idx < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : (
                      <span className={cn('flex items-center justify-center h-5 w-5 rounded-full text-xs border',
                        idx === wizardStep ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400')}>{idx + 1}</span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-2', idx < wizardStep ? 'bg-green-300' : 'bg-gray-200')} />
                  )}
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%` }} />
            </div>
          </div>

          {/* Step Content */}
          <div className="py-2">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>Cancel</Button>
            <div className="flex gap-2">
              {wizardStep > 0 && (
                <Button variant="outline" onClick={goPrev}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
              )}
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button onClick={goNext} disabled={!isStepValid(wizardStep)} className="bg-blue-600 hover:bg-blue-700 text-white">Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              ) : (
                <Button onClick={handleCreate} disabled={!isStepValid(wizardStep)} className="bg-green-600 hover:bg-green-700 text-white">Create NCR</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedNcr && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedNcr.ncrNumber}</span>
                  {selectedNcr.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedNcr.status])} variant="secondary">{selectedNcr.status}</Badge>
                  <Badge variant="outline" className={cn(selectedNcr.isOosOot ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400' : '')}>{selectedNcr.type}</Badge>
                  {selectedNcr.severity && <Badge className={cn(severityColors[selectedNcr.severity])} variant="secondary">{selectedNcr.severity}</Badge>}
                  {selectedNcr.disposition && selectedNcr.disposition !== 'Pending' && (
                    <Badge className={cn(dispositionColors[selectedNcr.disposition])} variant="secondary">Disposition: {selectedNcr.disposition}</Badge>
                  )}
                  {selectedNcr.templateId && (() => {
                    const tpl = store.formTemplates.find(t => t.id === selectedNcr.templateId);
                    return (
                      <Badge variant="outline" className="border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                        <FileText className="h-3 w-3 mr-1" />
                        Template: {tpl ? `${tpl.title} v${selectedNcr.templateVersion || tpl.version}` : selectedNcr.templateId}
                      </Badge>
                    );
                  })()}
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

                {/* Key Information */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">NCR Number:</span>{' '}
                    <span className="font-mono font-medium">{selectedNcr.ncrNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">{selectedNcr.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Severity:</span>{' '}
                    <span className="font-medium">{selectedNcr.severity || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>{' '}
                    <span className="font-medium">{selectedNcr.source || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned To:</span>{' '}
                    <span className="font-medium">{getUserName(selectedNcr.assignedTo)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <span className="font-medium">{formatDate(selectedNcr.createdDate)}</span>
                  </div>
                  {selectedNcr.lotNumber && (
                    <div>
                      <span className="text-muted-foreground">Lot Number:</span>{' '}
                      <span className="font-mono font-medium">{selectedNcr.lotNumber}</span>
                    </div>
                  )}
                  {selectedNcr.quantityAffected !== undefined && selectedNcr.quantityAffected !== null && (
                    <div>
                      <span className="text-muted-foreground">Qty Affected:</span>{' '}
                      <span className="font-medium">{selectedNcr.quantityAffected}</span>
                    </div>
                  )}
                  {selectedNcr.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>{' '}
                      <span className="font-medium">{formatDate(selectedNcr.dueDate)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Updated:</span>{' '}
                    <span className="font-medium">{formatDate(selectedNcr.updatedAt)}</span>
                  </div>
                  {selectedNcr.templateId && (() => {
                    const tpl = store.formTemplates.find(t => t.id === selectedNcr.templateId);
                    return (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Template:</span>{' '}
                        <span className="font-medium">{tpl ? tpl.title : selectedNcr.templateId}</span>
                        {selectedNcr.templateVersion && <span className="text-muted-foreground ml-1">(v{selectedNcr.templateVersion})</span>}
                      </div>
                    );
                  })()}
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedNcr.description}</p>
                </div>

                {/* Linked CAPA */}
                {selectedNcr.linkedCapaId && (() => {
                  const linkedCapa = getLinkedCapa(selectedNcr.linkedCapaId);
                  return (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Link2 className="h-4 w-4" />
                        Linked CAPA
                      </h4>
                      <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {linkedCapa?.capaNumber || selectedNcr.linkedCapaId}
                        </Badge>
                        {linkedCapa && (
                          <>
                            <span className="text-sm">{linkedCapa.title}</span>
                            <Badge className={cn('text-xs', linkedCapa.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')} variant="secondary">
                              {linkedCapa.status}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* OOS/OOT Section */}
                {selectedNcr.isOosOot && (
                  <div className="border border-red-200 dark:border-red-800 rounded-md p-4 space-y-3 bg-red-50/50 dark:bg-red-900/10">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-red-500" /> OOS/OOT Investigation
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {selectedNcr.analyticalMethod && (
                        <div>
                          <span className="text-muted-foreground">Analytical Method:</span>{' '}
                          <span className="font-medium">{selectedNcr.analyticalMethod}</span>
                        </div>
                      )}
                      {selectedNcr.measuredValue !== undefined && selectedNcr.measuredValue !== null && (
                        <div>
                          <span className="text-muted-foreground">Measured Value:</span>{' '}
                          <span className="font-medium">{selectedNcr.measuredValue} {selectedNcr.measuredUnit || ''}</span>
                        </div>
                      )}
                      {selectedNcr.specLimit && (
                        <div>
                          <span className="text-muted-foreground">Spec Limit:</span>{' '}
                          <span className="font-medium">{selectedNcr.specLimit}</span>
                        </div>
                      )}
                    </div>
                    <Separator className="bg-red-200 dark:bg-red-800" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Phase 1 Conclusion:</span>{' '}
                        <Badge variant="outline" className={cn('text-xs ml-1',
                          selectedNcr.phase1Conclusion === 'No Error Found' ? 'border-green-300 text-green-700' :
                          selectedNcr.phase1Conclusion === 'Error Found' ? 'border-red-300 text-red-700' : ''
                        )}>
                          {selectedNcr.phase1Conclusion || 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phase 2 Required:</span>{' '}
                        <span className="font-medium">{selectedNcr.phase2Required ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedNcr.phase2Required && (
                        <div>
                          <span className="text-muted-foreground">Phase 2 Conclusion:</span>{' '}
                          <Badge variant="outline" className={cn('text-xs ml-1',
                            selectedNcr.phase2Conclusion === 'Invalidated' ? 'border-green-300 text-green-700' :
                            selectedNcr.phase2Conclusion === 'Confirmed OOS' ? 'border-red-300 text-red-700' : ''
                          )}>
                            {selectedNcr.phase2Conclusion || 'Pending'}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Reject Lot:</span>{' '}
                        <Badge variant="outline" className={cn('text-xs ml-1',
                          selectedNcr.rejectLot ? 'border-red-300 text-red-700' : 'border-green-300 text-green-700'
                        )}>
                          {selectedNcr.rejectLot ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Impact & Containment (from new fields) */}
                {(selectedNcr.impactAssessment || selectedNcr.containmentActions || selectedNcr.affectedProduct) && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Scale className="h-4 w-4" />
                      Impact & Containment
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
                      {selectedNcr.impactAssessment && (
                        <div>
                          <span className="text-muted-foreground font-medium">Impact Assessment:</span>{' '}
                          <span>{selectedNcr.impactAssessment}</span>
                        </div>
                      )}
                      {selectedNcr.containmentActions && (
                        <div>
                          <span className="text-muted-foreground font-medium">Containment Actions:</span>{' '}
                          <span>{selectedNcr.containmentActions}</span>
                        </div>
                      )}
                      {selectedNcr.affectedProduct && (
                        <div>
                          <span className="text-muted-foreground font-medium">Affected Product/Process:</span>{' '}
                          <span>{selectedNcr.affectedProduct}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Disposition - visible when Pending Disposition or Closed */}
                {(selectedNcr.status === 'Pending Disposition' || selectedNcr.status === 'Closed') && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Disposition</h4>
                    {selectedNcr.status === 'Pending Disposition' && hasPermission('ncr.update') ? (
                      <div className="flex items-center gap-3">
                        <Select value={detailDisposition} onValueChange={setDetailDisposition}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                          <SelectContent>
                            {ncrDispositions.filter(d => d !== 'Pending').map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={handleSetDisposition}
                          disabled={!detailDisposition || detailDisposition === selectedNcr.disposition}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {selectedNcr.disposition && selectedNcr.disposition !== 'Pending' ? (
                          <Badge className={cn(dispositionColors[selectedNcr.disposition])} variant="secondary">{selectedNcr.disposition}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Not set</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Advance Status Button */}
                {hasPermission('ncr.update') && selectedNcr.status !== 'Closed' && (() => {
                  const nextStatus = getNextNcrStatus(selectedNcr.status);
                  if (!nextStatus) return null;
                  const isClose = nextStatus === 'Closed';
                  return (
                    <Button className="w-full" onClick={() => handleAdvanceStatus(selectedNcr)}>
                      {isClose ? (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Close with Electronic Signature
                        </>
                      ) : (
                        <>
                          Advance to {nextStatus}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingCloseNcr ? `${pendingCloseNcr.ncrNumber} — ${pendingCloseNcr.title}` : ''}
        recordId={pendingCloseNcr?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
