'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { BatchRecord, BatchStep, BatchStatus, BatchStepStatus, SignatureType, RawMaterial, RawMaterialStatus, StepType } from '@/types/qms';
import {
  Package, Plus, Search, ArrowRight, CheckCircle2, Lock, AlertTriangle,
  ShieldCheck, Play, Clock, User, FileCheck, AlertCircle, Trash2,
  Beaker, ClipboardList, FlaskConical, ChevronLeft, ChevronRight,
  CalendarClock, ListChecks,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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

const statusColors: Record<BatchStatus, string> = {
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending QA Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Released': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Quarantine': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const stepStatusColors: Record<BatchStepStatus, string> = {
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Failed': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const rawMaterialStatusColors: Record<RawMaterialStatus, string> = {
  'Verified': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const stepTypeIcons: Record<StepType, string> = {
  'Weighing': '⚖️',
  'Mixing': '🔄',
  'Filtration': '🔬',
  'Filling': '💉',
  'Inspection': '🔍',
  'Labeling': '🏷️',
  'Packaging': '📦',
  'QC Testing': '🧪',
  'Other': '⚙️',
};

const batchStatusFlow: BatchStatus[] = ['In Progress', 'Pending QA Review', 'Released'];

const batchSizeUnits = ['vials', 'units', 'tablets', 'kg', 'liters'];

const stepTypeOptions: StepType[] = ['Weighing', 'Mixing', 'Filtration', 'Filling', 'Inspection', 'Labeling', 'Packaging', 'QC Testing', 'Other'];

const rawMaterialStatusOptions: RawMaterialStatus[] = ['Verified', 'Pending', 'Rejected'];

const WIZARD_STEPS = [
  { id: 0, label: 'Batch Identification', icon: Package },
  { id: 1, label: 'Manufacturing Dates', icon: CalendarClock },
  { id: 2, label: 'Raw Materials', icon: Beaker },
  { id: 3, label: 'Step Templates', icon: ClipboardList },
  { id: 4, label: 'Summary & Submit', icon: ListChecks },
];

interface FormRawMaterial {
  id: string;
  material: string;
  lotNumber: string;
  supplier: string;
  status: RawMaterialStatus;
}

interface FormStepTemplate {
  id: string;
  stepName: string;
  instructions: string;
  expectedValue: string;
  stepType: StepType;
}

function getNextBatchStatus(current: BatchStatus): BatchStatus | null {
  const idx = batchStatusFlow.indexOf(current);
  return idx < batchStatusFlow.length - 1 ? batchStatusFlow[idx + 1] : null;
}

function getStepNextStatus(current: BatchStepStatus): BatchStepStatus | null {
  const flow: BatchStepStatus[] = ['Pending', 'In Progress', 'Completed'];
  const idx = flow.indexOf(current);
  return idx < flow.length - 1 ? flow[idx + 1] : null;
}

export function BatchRecordView() {
  const { currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const store = useQMSStore();
  const batchRecords = store.batchRecords;
  const profiles = store.profiles;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Electronic signature
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingReleaseBatch, setPendingReleaseBatch] = useState<BatchRecord | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);

  // Create form state
  const [formAutoLot, setFormAutoLot] = useState(true);
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formProductCode, setFormProductCode] = useState('');
  const [formBatchSize, setFormBatchSize] = useState('');
  const [formBatchSizeUnit, setFormBatchSizeUnit] = useState('vials');
  const [formMfgDate, setFormMfgDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSopReference, setFormSopReference] = useState('');
  const [formSpecialInstructions, setFormSpecialInstructions] = useState('');

  // Raw materials in create form
  const [formRawMaterials, setFormRawMaterials] = useState<FormRawMaterial[]>([]);

  // Step templates in create form
  const [formStepTemplates, setFormStepTemplates] = useState<FormStepTemplate[]>([]);

  // Step editing
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editActualValue, setEditActualValue] = useState('');

  // Filtered batches
  const filteredBatches = batchRecords.filter(b => {
    const matchesSearch = searchTerm === '' ||
      b.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(b.manufacturingDate) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(b.manufacturingDate) <= new Date(dateTo + 'T23:59:59');
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const summaryCounts = {
    inProgress: batchRecords.filter(b => b.status === 'In Progress').length,
    pendingQA: batchRecords.filter(b => b.status === 'Pending QA Review').length,
    released: batchRecords.filter(b => b.status === 'Released').length,
    quarantineRejected: batchRecords.filter(b => b.status === 'Quarantine' || b.status === 'Rejected').length,
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const getStepProgress = (batch: BatchRecord) => {
    const steps = batch.steps || [];
    if (steps.length === 0) return 0;
    return Math.round((steps.filter(s => s.status === 'Completed').length / steps.length) * 100);
  };

  const generateLotNumber = () => {
    const count = batchRecords.length + 1;
    return `BN-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  };

  const addFormRawMaterial = () => {
    setFormRawMaterials(prev => [
      ...prev,
      { id: `rm-form-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, material: '', lotNumber: '', supplier: '', status: 'Pending' },
    ]);
  };

  const removeFormRawMaterial = (id: string) => {
    setFormRawMaterials(prev => prev.filter(rm => rm.id !== id));
  };

  const updateFormRawMaterial = (id: string, field: keyof FormRawMaterial, value: string) => {
    setFormRawMaterials(prev =>
      prev.map(rm => (rm.id === id ? { ...rm, [field]: value } : rm))
    );
  };

  const addFormStepTemplate = () => {
    setFormStepTemplates(prev => [
      ...prev,
      { id: `st-form-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, stepName: '', instructions: '', expectedValue: '', stepType: 'Other' },
    ]);
  };

  const removeFormStepTemplate = (id: string) => {
    setFormStepTemplates(prev => prev.filter(st => st.id !== id));
  };

  const updateFormStepTemplate = (id: string, field: keyof FormStepTemplate, value: string) => {
    setFormStepTemplates(prev =>
      prev.map(st => (st.id === id ? { ...st, [field]: value } : st))
    );
  };

  const resetForm = () => {
    setWizardStep(0);
    setFormAutoLot(true);
    setFormLotNumber('');
    setFormProductName('');
    setFormProductCode('');
    setFormBatchSize('');
    setFormBatchSizeUnit('vials');
    setFormMfgDate('');
    setFormExpiryDate('');
    setFormSopReference('');
    setFormSpecialInstructions('');
    setFormRawMaterials([]);
    setFormStepTemplates([]);
  };

  // ── Step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formProductName.trim() !== '' && (formAutoLot || formLotNumber.trim() !== '');
      case 1:
        return formMfgDate.trim() !== '';
      case 2:
        return true; // Raw materials are optional
      case 3:
        return true; // Step templates are optional
      case 4:
        return formProductName.trim() !== '' && (formAutoLot || formLotNumber.trim() !== '') && formMfgDate.trim() !== '';
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

  const handleCreate = () => {
    const lotNumber = formAutoLot ? generateLotNumber() : formLotNumber;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Build raw materials
    const rawMaterials: RawMaterial[] = formRawMaterials
      .filter(rm => rm.material.trim() !== '')
      .map(rm => ({
        id: `rm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        material: rm.material,
        lotNumber: rm.lotNumber,
        supplier: rm.supplier,
        status: rm.status,
      }));

    // Build steps from templates
    const steps: BatchStep[] = formStepTemplates
      .filter(st => st.stepName.trim() !== '')
      .map((st, idx) => ({
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
        batchRecordId: batchId,
        stepOrder: idx + 1,
        stepName: st.stepName,
        instructions: st.instructions || undefined,
        expectedValue: st.expectedValue || undefined,
        stepType: st.stepType,
        status: 'Pending' as BatchStepStatus,
        createdAt: new Date().toISOString(),
      }));

    const newBatch: BatchRecord = {
      id: batchId,
      lotNumber,
      productName: formProductName,
      productCode: formProductCode || undefined,
      batchSize: formBatchSize ? parseInt(formBatchSize) : undefined,
      batchSizeUnit: formBatchSizeUnit,
      sopReference: formSopReference || undefined,
      manufacturingDate: formMfgDate ? new Date(formMfgDate).toISOString() : new Date().toISOString(),
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : undefined,
      status: 'In Progress',
      isLocked: false,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
      steps,
      rawMaterials: rawMaterials.length > 0 ? rawMaterials : undefined,
    };
    store.addBatchRecord(newBatch);
    resetForm();
    setShowCreateDialog(false);
    toast({
      title: 'Batch Record Created',
      description: `${lotNumber} created with ${rawMaterials.length} material(s) and ${steps.length} step(s).`,
    });
  };

  const canCompleteStep = (batch: BatchRecord, step: BatchStep): boolean => {
    if (batch.isLocked) return false;
    const steps = batch.steps || [];
    const previousSteps = steps.filter(s => s.stepOrder < step.stepOrder);
    return previousSteps.every(s => s.status === 'Completed');
  };

  const handleAdvanceStepStatus = (batch: BatchRecord, step: BatchStep) => {
    if (batch.isLocked) return;
    const nextStatus = getStepNextStatus(step.status);
    if (!nextStatus) return;

    // When advancing from Pending → In Progress, enforce sequencing
    if (nextStatus === 'In Progress' || nextStatus === 'Completed') {
      const steps = batch.steps || [];
      const previousSteps = steps.filter(s => s.stepOrder < step.stepOrder);
      const incompletePrevious = previousSteps.find(s => s.status !== 'Completed');
      if (incompletePrevious) {
        toast({
          title: 'Step sequence error',
          description: `Step ${incompletePrevious.stepOrder} (${incompletePrevious.stepName}) must be completed first.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const updatedSteps = (batch.steps || []).map(s =>
      s.id === step.id
        ? {
            ...s,
            status: nextStatus,
            performedAt: nextStatus === 'Completed' ? new Date().toISOString() : s.performedAt,
            operatorId: currentUser?.id || s.operatorId,
          }
        : s
    );
    store.updateBatchRecord(batch.id, { steps: updatedSteps });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, steps: updatedSteps });
    }
  };

  const handleSaveActualValue = (batch: BatchRecord, step: BatchStep) => {
    if (batch.isLocked) return;
    const updatedSteps = (batch.steps || []).map(s =>
      s.id === step.id ? { ...s, actualValue: editActualValue } : s
    );
    store.updateBatchRecord(batch.id, { steps: updatedSteps });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, steps: updatedSteps });
    }
    setEditingStepId(null);
    setEditActualValue('');
  };

  const handleAdvanceBatchStatus = (batch: BatchRecord) => {
    if (batch.isLocked) return;
    const next = getNextBatchStatus(batch.status);
    if (!next) return;

    if (next === 'Pending QA Review') {
      store.updateBatchRecord(batch.id, { status: next });
      if (selectedBatch?.id === batch.id) {
        setSelectedBatch({ ...batch, status: next });
      }
    }
  };

  const handleQARelease = (batch: BatchRecord) => {
    setPendingReleaseBatch(batch);
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingReleaseBatch) return;

    store.updateBatchRecord(pendingReleaseBatch.id, {
      status: 'Released',
      isLocked: true,
      qaReleaseDate: new Date().toISOString(),
      qaReleasedById: currentUser?.id,
    });

    if (selectedBatch?.id === pendingReleaseBatch.id) {
      setSelectedBatch({
        ...pendingReleaseBatch,
        status: 'Released',
        isLocked: true,
        qaReleaseDate: new Date().toISOString(),
        qaReleasedById: currentUser?.id,
      });
    }

    setPendingReleaseBatch(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingReleaseBatch(null);
    setShowSignatureModal(false);
  };

  const handleRejectBatch = (batch: BatchRecord) => {
    store.updateBatchRecord(batch.id, {
      status: 'Rejected',
      isLocked: true,
    });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, status: 'Rejected', isLocked: true });
    }
  };

  const handleQuarantineBatch = (batch: BatchRecord) => {
    store.updateBatchRecord(batch.id, {
      status: 'Quarantine',
      isLocked: true,
    });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, status: 'Quarantine', isLocked: true });
    }
  };

  const openDetail = (batch: BatchRecord) => {
    setSelectedBatch(batch);
    setEditingStepId(null);
    setEditActualValue('');
    setShowDetailDialog(true);
  };

  // ── Render: Wizard Step Content ──
  const renderStepContent = () => {
    switch (wizardStep) {
      // ── Step 1: Batch Identification ──
      case 0:
        return (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="autoLot" className="text-sm">Auto-generate lot number</Label>
              <input
                id="autoLot"
                type="checkbox"
                checked={formAutoLot}
                onChange={(e) => setFormAutoLot(e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
            {!formAutoLot && (
              <div className="grid gap-2">
                <Label>Lot Number *</Label>
                <Input value={formLotNumber} onChange={(e) => setFormLotNumber(e.target.value)} placeholder="BN-2024-XXX" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Product Name *</Label>
                <Input value={formProductName} onChange={(e) => setFormProductName(e.target.value)} placeholder="Product name" />
              </div>
              <div className="grid gap-2">
                <Label>Product Code</Label>
                <Input value={formProductCode} onChange={(e) => setFormProductCode(e.target.value)} placeholder="PROD-XXX" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Batch Size</Label>
                <Input type="number" value={formBatchSize} onChange={(e) => setFormBatchSize(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={formBatchSizeUnit} onValueChange={setFormBatchSizeUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {batchSizeUnits.map(u => <SelectItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>SOP Reference</Label>
                <Input value={formSopReference} onChange={(e) => setFormSopReference(e.target.value)} placeholder="SOP-XXX" />
              </div>
            </div>
          </div>
        );

      // ── Step 2: Manufacturing Dates ──
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Manufacturing Date *</Label>
                <Input type="date" value={formMfgDate} onChange={(e) => setFormMfgDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specialInstructions">Special Handling Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={formSpecialInstructions}
                onChange={(e) => setFormSpecialInstructions(e.target.value)}
                placeholder="Enter any special handling, storage, or processing instructions for this batch..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Include temperature requirements, light sensitivity, humidity controls, or other special handling notes.
              </p>
            </div>
            {formMfgDate && formExpiryDate && (
              <div className="bg-muted/30 rounded-md p-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Shelf life: {Math.round((new Date(formExpiryDate).getTime() - new Date(formMfgDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            )}
          </div>
        );

      // ── Step 3: Raw Materials & Components ──
      case 2:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Beaker className="h-4 w-4 text-teal-500" />
                Raw Materials &amp; Components
              </h4>
              <Button variant="outline" size="sm" onClick={addFormRawMaterial}>
                <Plus className="h-3 w-3 mr-1" />Add Material
              </Button>
            </div>
            {formRawMaterials.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Material</TableHead>
                      <TableHead className="w-[140px]">Lot Number</TableHead>
                      <TableHead className="w-[160px]">Supplier</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formRawMaterials.map(rm => (
                      <TableRow key={rm.id}>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Material name"
                            value={rm.material}
                            onChange={(e) => updateFormRawMaterial(rm.id, 'material', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Lot #"
                            value={rm.lotNumber}
                            onChange={(e) => updateFormRawMaterial(rm.id, 'lotNumber', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Supplier"
                            value={rm.supplier}
                            onChange={(e) => updateFormRawMaterial(rm.id, 'supplier', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={rm.status} onValueChange={(val) => updateFormRawMaterial(rm.id, 'status', val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {rawMaterialStatusOptions.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeFormRawMaterial(rm.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center text-muted-foreground text-xs bg-muted/20">
                No raw materials added. Click &quot;Add Material&quot; to define materials and components.
              </div>
            )}
          </div>
        );

      // ── Step 4: Batch Step Templates ──
      case 3:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                Batch Step Templates
              </h4>
              <Button variant="outline" size="sm" onClick={addFormStepTemplate}>
                <Plus className="h-3 w-3 mr-1" />Add Step
              </Button>
            </div>
            {formStepTemplates.length > 0 ? (
              <div className="space-y-3">
                {formStepTemplates.map((st, idx) => (
                  <div key={st.id} className="border rounded-md p-3 space-y-2 bg-muted/10 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Step {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeFormStepTemplate(st.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Step Name *</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="e.g. Material Weighing"
                          value={st.stepName}
                          onChange={(e) => updateFormStepTemplate(st.id, 'stepName', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Step Type</Label>
                        <Select value={st.stepType} onValueChange={(val) => updateFormStepTemplate(st.id, 'stepType', val)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {stepTypeOptions.map(t => (
                              <SelectItem key={t} value={t}>
                                {stepTypeIcons[t]} {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Instructions</Label>
                      <Textarea
                        className="text-xs min-h-[48px]"
                        placeholder="Step instructions..."
                        value={st.instructions}
                        onChange={(e) => updateFormStepTemplate(st.id, 'instructions', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Expected Value</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. 250.0 ± 2.5 kg"
                        value={st.expectedValue}
                        onChange={(e) => updateFormStepTemplate(st.id, 'expectedValue', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center text-muted-foreground text-xs bg-muted/20">
                No step templates added. Click &quot;Add Step&quot; to define batch processing steps.
              </div>
            )}
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

              {/* Step 1 Summary — Batch Identification */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1 — Batch Identification</p>
                <p className="text-sm"><span className="font-medium">Lot Number:</span> {formAutoLot ? <span className="text-muted-foreground italic">Auto-generated</span> : formLotNumber || '—'}</p>
                <p className="text-sm"><span className="font-medium">Product Name:</span> {formProductName || '—'}</p>
                <p className="text-sm"><span className="font-medium">Product Code:</span> {formProductCode || '—'}</p>
                <p className="text-sm"><span className="font-medium">Batch Size:</span> {formBatchSize ? `${formBatchSize} ${formBatchSizeUnit}` : '—'}</p>
                <p className="text-sm"><span className="font-medium">SOP Reference:</span> {formSopReference || '—'}</p>
              </div>

              {/* Step 2 Summary — Manufacturing Dates */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2 — Manufacturing Dates</p>
                <p className="text-sm"><span className="font-medium">Manufacturing Date:</span> {formMfgDate || '—'}</p>
                <p className="text-sm"><span className="font-medium">Expiry Date:</span> {formExpiryDate || '—'}</p>
                {formMfgDate && formExpiryDate && (
                  <p className="text-sm"><span className="font-medium">Shelf Life:</span> {Math.round((new Date(formExpiryDate).getTime() - new Date(formMfgDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                )}
                <p className="text-sm"><span className="font-medium">Special Instructions:</span> {formSpecialInstructions || '—'}</p>
              </div>

              {/* Step 3 Summary — Raw Materials */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 3 — Raw Materials &amp; Components</p>
                <p className="text-sm"><span className="font-medium">Total Materials:</span> {formRawMaterials.length}</p>
                {formRawMaterials.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {formRawMaterials.map((rm, idx) => (
                      <div key={rm.id} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{idx + 1}.</span>
                        <span>{rm.material || 'Unnamed'}</span>
                        {rm.lotNumber && <span className="font-mono">({rm.lotNumber})</span>}
                        <Badge className={cn('text-[10px] px-1 py-0', rawMaterialStatusColors[rm.status])} variant="secondary">{rm.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No raw materials added</p>
                )}
              </div>

              {/* Step 4 Summary — Step Templates */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 4 — Batch Step Templates</p>
                <p className="text-sm"><span className="font-medium">Total Steps:</span> {formStepTemplates.length}</p>
                {formStepTemplates.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {formStepTemplates.map((st, idx) => (
                      <div key={st.id} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{idx + 1}.</span>
                        <span>{st.stepName || 'Unnamed'}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{stepTypeIcons[st.stepType]} {st.stepType}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No step templates added</p>
                )}
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
            <Package className="h-6 w-6 text-primary" />
            Batch Records
          </h1>
          <p className="text-muted-foreground mt-1">Batch record management and QA release <Badge variant="outline" className="ml-2 text-xs">ISO 13485 §8.2.4</Badge></p>
        </div>
        {hasPermission('batch.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Batch Record
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Pending QA Review</span>
            </div>
            <span className="text-2xl font-bold text-purple-600">{summaryCounts.pendingQA}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Released</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.released}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Quarantine/Rejected</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.quarantineRejected}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by lot number or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Pending QA Review">Pending QA Review</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Quarantine">Quarantine</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
          placeholder="To"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Lot #</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="w-[100px]">Batch Size</TableHead>
                  <TableHead className="w-[110px]">Mfg Date</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[100px]">Progress</TableHead>
                  <TableHead className="w-[80px]">Materials</TableHead>
                  <TableHead className="w-[100px]">Lock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map(batch => {
                  const progress = getStepProgress(batch);
                  const materialCount = batch.rawMaterials?.length || 0;
                  return (
                    <TableRow key={batch.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(batch)}>
                      <TableCell className="font-mono text-xs">{batch.lotNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium">{batch.productName}</p>
                        {batch.productCode && <p className="text-xs text-muted-foreground">{batch.productCode}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{batch.batchSize ? `${batch.batchSize} ${batch.batchSizeUnit}` : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(batch.manufacturingDate, true)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[batch.status])} variant="secondary">{batch.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {materialCount > 0 ? (
                          <div className="flex items-center gap-1" title={`${materialCount} raw material(s)`}>
                            <Beaker className="h-3.5 w-3.5 text-teal-500" />
                            <span className="text-xs font-medium text-teal-600 dark:text-teal-400">{materialCount}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.isLocked ? (
                          <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>
                        ) : <span className="text-muted-foreground text-xs">Unlocked</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredBatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No batch records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Batch Record Dialog — Wizard */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Batch Record</DialogTitle></DialogHeader>

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
                <Button onClick={handleCreate} disabled={!isStepValid(wizardStep)} className="bg-green-600 hover:bg-green-700 text-white">Create Batch Record</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          {selectedBatch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedBatch.lotNumber}</span>
                  {selectedBatch.productName}
                  {selectedBatch.isLocked && (
                    <Badge variant="outline" className="text-xs ml-2">
                      <Lock className="h-3 w-3 mr-1" />Locked
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedBatch.status])} variant="secondary">
                    {selectedBatch.status}
                  </Badge>
                  {selectedBatch.productCode && <Badge variant="outline">{selectedBatch.productCode}</Badge>}
                  {selectedBatch.sopReference && (
                    <Badge variant="outline" className="border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                      <FileCheck className="h-3 w-3 mr-1" />{selectedBatch.sopReference}
                    </Badge>
                  )}
                  {selectedBatch.isLocked && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                      <Lock className="h-3 w-3 mr-1" />Record Locked
                    </Badge>
                  )}
                </div>

                {/* Status Flow Visualization */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {batchStatusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedBatch.status ? 'bg-primary text-primary-foreground' :
                        batchStatusFlow.indexOf(s) < batchStatusFlow.indexOf(selectedBatch.status) ?
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < batchStatusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                  {/* Branch indicators for Rejected/Quarantine */}
                  {(selectedBatch.status === 'Rejected' || selectedBatch.status === 'Quarantine') && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        statusColors[selectedBatch.status]
                      )}>
                        {selectedBatch.status}
                      </div>
                    </>
                  )}
                </div>

                {/* Batch Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lot Number:</span>{' '}
                    <span className="font-mono font-medium">{selectedBatch.lotNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Product:</span>{' '}
                    <span className="font-medium">{selectedBatch.productName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Batch Size:</span>{' '}
                    <span className="font-medium">{selectedBatch.batchSize ? `${selectedBatch.batchSize} ${selectedBatch.batchSizeUnit}` : '-'}</span>
                  </div>
                  {selectedBatch.productCode && (
                    <div>
                      <span className="text-muted-foreground">Product Code:</span>{' '}
                      <span className="font-mono font-medium">{selectedBatch.productCode}</span>
                    </div>
                  )}
                  {selectedBatch.sopReference && (
                    <div>
                      <span className="text-muted-foreground">SOP Ref:</span>{' '}
                      <span className="font-mono font-medium">{selectedBatch.sopReference}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Mfg Date:</span>{' '}
                    <span className="font-medium">{formatDate(selectedBatch.manufacturingDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expiry Date:</span>{' '}
                    <span className="font-medium">{formatDate(selectedBatch.expiryDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <span className="font-medium">{formatDate(selectedBatch.createdAt)}</span>
                  </div>
                  {selectedBatch.qaReleaseDate && (
                    <div>
                      <span className="text-muted-foreground">QA Released:</span>{' '}
                      <span className="font-medium text-green-600">{formatDate(selectedBatch.qaReleaseDate)}</span>
                    </div>
                  )}
                  {selectedBatch.qaReleasedById && (
                    <div>
                      <span className="text-muted-foreground">Released By:</span>{' '}
                      <span className="font-medium">{getUserName(selectedBatch.qaReleasedById)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Raw Materials Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-teal-500" />
                      Raw Materials &amp; Components
                    </h4>
                    {selectedBatch.rawMaterials && selectedBatch.rawMaterials.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedBatch.rawMaterials.filter(rm => rm.status === 'Verified').length}/{selectedBatch.rawMaterials.length} verified
                      </span>
                    )}
                  </div>

                  {selectedBatch.rawMaterials && selectedBatch.rawMaterials.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="w-[140px]">Lot Number</TableHead>
                            <TableHead className="w-[180px]">Supplier</TableHead>
                            <TableHead className="w-[110px]">Verification Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBatch.rawMaterials.map(rm => (
                            <TableRow key={rm.id}>
                              <TableCell className="font-medium text-sm">
                                <div className="flex items-center gap-2">
                                  <FlaskConical className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                                  {rm.material}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{rm.lotNumber}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{rm.supplier}</TableCell>
                              <TableCell>
                                <Badge className={cn('text-xs', rawMaterialStatusColors[rm.status])} variant="secondary">
                                  {rm.status === 'Verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {rm.status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {rm.status === 'Rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {rm.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-muted/20">
                      <Beaker className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                      No raw materials recorded for this batch
                    </div>
                  )}
                </div>

                <Separator />

                {/* Steps Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Batch Steps
                    </h4>
                    {selectedBatch.steps && selectedBatch.steps.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {getStepProgress(selectedBatch)}% complete
                      </span>
                    )}
                  </div>

                  {selectedBatch.steps && selectedBatch.steps.length > 0 ? (
                    <>
                      <Progress value={getStepProgress(selectedBatch)} className="h-2 mb-3" />

                      {/* Step indicator circles */}
                      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                        {selectedBatch.steps.map((step, i) => (
                          <React.Fragment key={step.id}>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                              step.status === 'Completed' ? 'bg-green-500 text-white' :
                              step.status === 'In Progress' ? 'bg-amber-500 text-white' :
                              step.status === 'Failed' ? 'bg-red-500 text-white' :
                              'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            )} title={step.stepType || ''}>
                              {step.stepOrder}
                            </div>
                            {i < selectedBatch.steps!.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Steps Table */}
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40px]">#</TableHead>
                              <TableHead>Step Name</TableHead>
                              <TableHead className="w-[100px]">Type</TableHead>
                              <TableHead className="w-[140px]">Instructions</TableHead>
                              <TableHead className="w-[110px]">Expected</TableHead>
                              <TableHead className="w-[130px]">Actual</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                              <TableHead className="w-[110px]">Operator</TableHead>
                              <TableHead className="w-[110px]">Performed</TableHead>
                              <TableHead className="w-[100px]">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedBatch.steps.map(step => (
                              <TableRow key={step.id}>
                                <TableCell className="font-mono text-xs">{step.stepOrder}</TableCell>
                                <TableCell className="font-medium text-sm">{step.stepName}</TableCell>
                                <TableCell>
                                  {step.stepType ? (
                                    <Badge variant="outline" className="text-xs">
                                      {stepTypeIcons[step.stepType]} {step.stepType}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                                  {step.instructions || '-'}
                                </TableCell>
                                <TableCell className="text-xs">{step.expectedValue || '-'}</TableCell>
                                <TableCell>
                                  {/* Editable actualValue for In Progress or Pending steps */}
                                  {editingStepId === step.id ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="h-7 text-xs w-[80px]"
                                        value={editActualValue}
                                        onChange={(e) => setEditActualValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveActualValue(selectedBatch, step);
                                          if (e.key === 'Escape') { setEditingStepId(null); setEditActualValue(''); }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleSaveActualValue(selectedBatch, step)}
                                      >
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        'text-xs cursor-pointer',
                                        (step.status === 'Pending' || step.status === 'In Progress') && !selectedBatch.isLocked && hasPermission('batch.update')
                                          ? 'hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 border border-dashed border-transparent hover:border-muted-foreground/30'
                                          : ''
                                      )}
                                      onClick={() => {
                                        if ((step.status === 'Pending' || step.status === 'In Progress') && !selectedBatch.isLocked && hasPermission('batch.update')) {
                                          setEditingStepId(step.id);
                                          setEditActualValue(step.actualValue || '');
                                        }
                                      }}
                                    >
                                      {step.actualValue || '-'}
                                      {(step.status === 'Pending' || step.status === 'In Progress') && !selectedBatch.isLocked && hasPermission('batch.update') && !step.actualValue && (
                                        <span className="text-muted-foreground ml-1">click to edit</span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn('text-xs', stepStatusColors[step.status])} variant="secondary">
                                    {step.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {step.operatorId ? (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      {getUserName(step.operatorId)}
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {step.performedAt ? formatDate(step.performedAt, true) : '-'}
                                </TableCell>
                                <TableCell>
                                  {hasPermission('batch.update') && !selectedBatch.isLocked && step.status !== 'Completed' && step.status !== 'Failed' && (() => {
                                    const nextStepStatus = getStepNextStatus(step.status);
                                    if (!nextStepStatus) return null;
                                    return (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => handleAdvanceStepStatus(selectedBatch, step)}
                                        disabled={!canCompleteStep(selectedBatch, step)}
                                      >
                                        {nextStepStatus === 'In Progress' ? (
                                          <><Play className="h-3 w-3 mr-1" />Start</>
                                        ) : (
                                          <><CheckCircle2 className="h-3 w-3 mr-1" />Complete</>
                                        )}
                                      </Button>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Step signature tracking */}
                      {selectedBatch.steps.some(s => s.signatureHash) && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Step Signatures
                          </h5>
                          <div className="space-y-1">
                            {selectedBatch.steps.filter(s => s.signatureHash).map(step => (
                              <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                <span className="font-mono">Step {step.stepOrder}:</span>
                                <span>{getUserName(step.operatorId)}</span>
                                <span className="font-mono text-[10px]">{step.signatureHash}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-md bg-muted/20">
                      <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      No batch steps defined for this record
                    </div>
                  )}
                </div>

                <Separator />

                {/* QA Release Section */}
                {selectedBatch.status === 'Pending QA Review' && hasPermission('batch.release') && !selectedBatch.isLocked && (
                  <div className="border border-purple-200 dark:border-purple-800 rounded-md p-4 space-y-3 bg-purple-50/50 dark:bg-purple-900/10">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                      QA Release Decision
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This batch is ready for QA review. Release requires an electronic signature per 21 CFR Part 11.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => handleQARelease(selectedBatch)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Release Batch
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectBatch(selectedBatch)}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleQuarantineBatch(selectedBatch)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Quarantine
                      </Button>
                    </div>
                  </div>
                )}

                {/* Advance Batch Status */}
                {hasPermission('batch.update') && !selectedBatch.isLocked && selectedBatch.status === 'In Progress' && (() => {
                  const next = getNextBatchStatus(selectedBatch.status);
                  if (!next) return null;
                  return (
                    <Button className="w-full" onClick={() => handleAdvanceBatchStatus(selectedBatch)}>
                      Advance to {next}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  );
                })()}

                {/* Lock Indicator */}
                {selectedBatch.isLocked && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      This batch record is locked. {selectedBatch.status === 'Released' ? 'Released batches cannot be modified.' :
                        selectedBatch.status === 'Rejected' ? 'Rejected batches cannot be modified.' :
                        'Quarantined batches cannot be modified.'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal for QA Release */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingReleaseBatch ? `${pendingReleaseBatch.lotNumber} — ${pendingReleaseBatch.productName}` : ''}
        recordId={pendingReleaseBatch?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
