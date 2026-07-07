'use client';

import React, { useState, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { TemplateSelector } from '@/components/shared/TemplateSelector';
import { cn, formatDate } from '@/lib/utils';
import type { NonConformance, NcrStatus, NcrDisposition, SignatureType, FormTemplateModule } from '@/types/qms';
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow';
import {
  FlaskConical, Search, Eye, ArrowRight, CheckCircle2,
  AlertTriangle, XCircle, AlertCircle, ChevronRight, Plus,
  ShieldCheck, ClipboardCheck, Beaker, Ban, Gavel,
  ChevronLeft, FileText, Activity, Wrench, Scale,
  BookOpen, ListChecks, Trash2, Info,
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

// ─── Color Maps ────────────────────────────────────────────────────────────────

const phase1ConclusionColors: Record<string, string> = {
  'Assignable Cause Found': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'No Assignable Cause Found': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Requires Phase II': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Error Found': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'No Error Found': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const phase2ConclusionColors: Record<string, string> = {
  'Confirmed OOS': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Invalidated': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Error Found': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'No Error Found': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const ncrStatusColors: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending Disposition': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Closed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const dispositionColors: Record<string, string> = {
  'Use As Is': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rework': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Scrap': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Return to Supplier': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Concession': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type OosOotType = 'OOS' | 'OOT';

interface ContainmentAction {
  id: string;
  action: string;
  responsible: string;
  completionDate: string;
}

interface WizardFormData {
  // Step 1 - Identification
  title: string;
  type: OosOotType;
  productCode: string;
  lotNumber: string;
  sampleId: string;
  analyticalMethod: string;
  specification: string;
  measuredValue: string;
  unit: string;
  specReference: string;
  // Step 2 - Analytical Data
  specLimit: string;
  detectionSource: string;
  // Step 3 - Phase I
  labInvestigation: string;
  analystError: boolean;
  calculationError: boolean;
  instrumentMalfunction: boolean;
  samplePrepError: boolean;
  environmentalConditions: boolean;
  methodDeviation: boolean;
  assignableCauseDesc: string;
  phase1Conclusion: string;
  // Step 4 - Phase II
  extendedInvestigation: string;
  rootCauseMethod: string;
  rootCauseStatement: string;
  phase2Conclusion: string;
  // Step 5 - Disposition & Impact
  lotDisposition: string;
  dispositionDecision: string;
  dispositionJustification: string;
  concession: boolean;
  reworkInstructions: string;
  concessionAuthorizedBy: string;
  scrapDocRef: string;
  // Step 6 - Actions & CAPA
  containmentActions: ContainmentAction[];
  correctiveActionSummary: string;
  linkedCapaRef: string;
  lessonsLearned: string;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Identification', icon: FileText },
  { id: 2, label: 'Analytical Data', icon: Beaker },
  { id: 3, label: 'Phase I Investigation', icon: ClipboardCheck },
  { id: 4, label: 'Phase II Investigation', icon: Search },
  { id: 5, label: 'Disposition & Impact', icon: Scale },
  { id: 6, label: 'Actions & CAPA', icon: Wrench },
  { id: 7, label: 'Review & Submit', icon: CheckCircle2 },
];

const initialWizardData: WizardFormData = {
  title: '',
  type: 'OOS',
  productCode: '',
  lotNumber: '',
  sampleId: '',
  analyticalMethod: '',
  specification: '',
  measuredValue: '',
  unit: '',
  specReference: '',
  specLimit: '',
  detectionSource: '',
  labInvestigation: '',
  analystError: false,
  calculationError: false,
  instrumentMalfunction: false,
  samplePrepError: false,
  environmentalConditions: false,
  methodDeviation: false,
  assignableCauseDesc: '',
  phase1Conclusion: '',
  extendedInvestigation: '',
  rootCauseMethod: '',
  rootCauseStatement: '',
  phase2Conclusion: '',
  lotDisposition: '',
  dispositionDecision: '',
  dispositionJustification: '',
  concession: false,
  reworkInstructions: '',
  concessionAuthorizedBy: '',
  scrapDocRef: '',
  containmentActions: [],
  correctiveActionSummary: '',
  linkedCapaRef: '',
  lessonsLearned: '',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function OosOotView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const ncrs = store.ncrs;
  const profiles = store.profiles;
  const capas = store.capas;
  const { getApprovedTemplates, hasApprovedTemplate } = useRecordWorkflow();
  const approvedOosTemplates = getApprovedTemplates('oos_oot');
  const oosHasApprovedTemplate = hasApprovedTemplate('oos_oot');

  // Filter to only OOS/OOT NCRs
  const oosOotNcrs = useMemo(() => ncrs.filter(n => n.isOosOot), [ncrs]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [conclusionFilter, setConclusionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState<NonConformance | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardFormData>({ ...initialWizardData });

  // Template selection
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formTemplateVersion, setFormTemplateVersion] = useState('');

  // Phase advancement state for detail dialog
  const [phase1Conclusion, setPhase1Conclusion] = useState<string>('');
  const [phase2Conclusion, setPhase2Conclusion] = useState<string>('');
  const [rejectLotDecision, setRejectLotDecision] = useState<boolean>(false);

  // Lab investigation checklist for detail dialog
  const [labChecklist, setLabChecklist] = useState({
    analystError: false,
    calculationError: false,
    instrumentMalfunction: false,
    samplePrepError: false,
    environmentalConditions: false,
    methodDeviation: false,
  });

  // Disposition decision for detail dialog
  const [disposition, setDisposition] = useState<NcrDisposition>('Pending');

  // E-signature
  const [showEsigModal, setShowEsigModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newTemplateVersion, setNewTemplateVersion] = useState('');

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const isMeasuredValueOutOfSpec = (ncr: NonConformance) => {
    if (ncr.measuredValue === undefined || !ncr.specLimit) return false;
    const specMatch = ncr.specLimit.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (specMatch) {
      const min = parseFloat(specMatch[1]);
      const max = parseFloat(specMatch[2]);
      return ncr.measuredValue < min || ncr.measuredValue > max;
    }
    return true;
  };

  const isWizardMeasuredOutOfSpec = () => {
    const val = parseFloat(wizardData.measuredValue);
    if (isNaN(val) || !wizardData.specLimit) return null;
    const specMatch = wizardData.specLimit.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (specMatch) {
      const min = parseFloat(specMatch[1]);
      const max = parseFloat(specMatch[2]);
      return val < min || val > max;
    }
    return null;
  };

  const updateWizard = <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
    setWizardData(prev => ({ ...prev, [key]: value }));
  };

  const addContainmentAction = () => {
    updateWizard('containmentActions', [
      ...wizardData.containmentActions,
      { id: `ca-${Date.now()}`, action: '', responsible: '', completionDate: '' },
    ]);
  };

  const removeContainmentAction = (id: string) => {
    updateWizard('containmentActions', wizardData.containmentActions.filter(a => a.id !== id));
  };

  const updateContainmentAction = (id: string, field: keyof ContainmentAction, value: string) => {
    updateWizard('containmentActions', wizardData.containmentActions.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  // ─── Filtered NCRs ─────────────────────────────────────────────────────────

  const filteredNcrs = useMemo(() => {
    return oosOotNcrs.filter(ncr => {
      const matchesSearch = searchTerm === '' ||
        ncr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ncr.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ncr.lotNumber && ncr.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === 'all' || ncr.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || ncr.status === statusFilter;

      let matchesPhase = true;
      if (phaseFilter === 'phase1_pending') {
        matchesPhase = !ncr.phase1Conclusion || ncr.phase1Conclusion === 'Pending';
      } else if (phaseFilter === 'phase2_required') {
        matchesPhase = ncr.phase2Required;
      } else if (phaseFilter === 'phase2_pending') {
        matchesPhase = ncr.phase2Required && (!ncr.phase2Conclusion || ncr.phase2Conclusion === 'Pending');
      }

      let matchesConclusion = true;
      if (conclusionFilter === 'confirmed_oos') {
        matchesConclusion = ncr.phase2Conclusion === 'Confirmed OOS';
      } else if (conclusionFilter === 'invalidated') {
        matchesConclusion = ncr.phase2Conclusion === 'Invalidated' || (ncr.phase1Conclusion === 'No Error Found' && !ncr.phase2Required);
      } else if (conclusionFilter === 'error_found') {
        matchesConclusion = ncr.phase1Conclusion === 'Error Found';
      } else if (conclusionFilter === 'no_error') {
        matchesConclusion = ncr.phase1Conclusion === 'No Error Found';
      }

      return matchesSearch && matchesType && matchesStatus && matchesPhase && matchesConclusion;
    });
  }, [oosOotNcrs, searchTerm, typeFilter, statusFilter, phaseFilter, conclusionFilter]);

  // ─── Summary counts ────────────────────────────────────────────────────────

  const summaryCounts = useMemo(() => ({
    oosCount: oosOotNcrs.filter(n => n.type === 'OOS').length,
    ootCount: oosOotNcrs.filter(n => n.type === 'OOT').length,
    phase1Pending: oosOotNcrs.filter(n => !n.phase1Conclusion || n.phase1Conclusion === 'Pending').length,
    phase2Confirmed: oosOotNcrs.filter(n => n.phase2Conclusion === 'Confirmed OOS').length,
  }), [oosOotNcrs]);

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  const openDetail = (ncr: NonConformance) => {
    setSelectedNcr(ncr);
    setPhase1Conclusion(ncr.phase1Conclusion || '');
    setPhase2Conclusion(ncr.phase2Conclusion || '');
    setRejectLotDecision(ncr.rejectLot);
    setDisposition(ncr.disposition || 'Pending');
    setLabChecklist({
      analystError: false,
      calculationError: false,
      instrumentMalfunction: false,
      samplePrepError: false,
      environmentalConditions: false,
      methodDeviation: false,
    });
    setShowDetailDialog(true);
  };

  const resetCreateForm = () => {
    setWizardStep(1);
    setWizardData({ ...initialWizardData });
    setNewTemplateId('');
    setNewTemplateVersion('');
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setShowCreateDialog(true);
  };

  const handleCreateOosOot = () => {
    if (!wizardData.title) return;
    const ncrCount = store.ncrs.length;
    const newNcr: NonConformance = {
      id: `ncr-${Date.now()}`,
      ncrNumber: `NCR-2024-${String(ncrCount + 1).padStart(3, '0')}`,
      title: wizardData.title,
      type: wizardData.type,
      status: 'Open',
      severity: 'Major',
      source: wizardData.detectionSource || 'Quality Control Testing',
      description: wizardData.assignableCauseDesc || wizardData.labInvestigation || `OOS/OOT Investigation for ${wizardData.productCode || 'Unknown Product'}`,
      lotNumber: wizardData.lotNumber || undefined,
      disposition: 'Pending',
      isOosOot: true,
      analyticalMethod: wizardData.analyticalMethod || undefined,
      measuredValue: wizardData.measuredValue ? parseFloat(wizardData.measuredValue) : undefined,
      measuredUnit: wizardData.unit || undefined,
      specLimit: wizardData.specLimit || wizardData.specification || undefined,
      phase1Conclusion: (wizardData.phase1Conclusion || 'Pending') as NonConformance['phase1Conclusion'],
      phase2Required: wizardData.phase1Conclusion === 'Requires Phase II' || wizardData.phase1Conclusion === 'No Assignable Cause Found',
      phase2Conclusion: (wizardData.phase2Conclusion || 'Pending') as NonConformance['phase2Conclusion'],
      rejectLot: wizardData.lotDisposition === 'Reject Lot',
      linkedCapaId: wizardData.linkedCapaRef || undefined,
      templateId: formTemplateId || undefined,
      templateVersion: formTemplateVersion || undefined,
      assignedTo: undefined,
      createdDate: new Date().toISOString(),
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addNCR(newNcr);
    resetCreateForm();
    setShowCreateDialog(false);
  };

  const handleAdvancePhase1 = () => {
    if (!selectedNcr || !phase1Conclusion) return;
    const updates: Partial<NonConformance> = {
      phase1Conclusion: phase1Conclusion as NonConformance['phase1Conclusion'],
      status: 'Under Investigation' as NcrStatus,
    };
    if (phase1Conclusion === 'Error Found') {
      updates.phase2Required = true;
    } else if (phase1Conclusion === 'No Error Found') {
      updates.phase2Required = true;
    }
    store.updateNCR(selectedNcr.id, updates);
    setSelectedNcr({ ...selectedNcr, ...updates });
  };

  const handleAdvancePhase2 = () => {
    if (!selectedNcr || !phase2Conclusion) return;
    const updates: Partial<NonConformance> = {
      phase2Conclusion: phase2Conclusion as NonConformance['phase2Conclusion'],
      rejectLot: rejectLotDecision,
      status: 'Pending Disposition' as NcrStatus,
    };
    store.updateNCR(selectedNcr.id, updates);
    setSelectedNcr({ ...selectedNcr, ...updates });
  };

  const handleSetDisposition = () => {
    if (!selectedNcr || disposition === 'Pending') return;
    setPendingAction('disposition');
    setShowEsigModal(true);
  };

  const handleEsigSign = (data: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!selectedNcr) return;
    if (pendingAction === 'disposition') {
      const updates: Partial<NonConformance> = {
        disposition,
        status: 'Closed' as NcrStatus,
      };
      store.updateNCR(selectedNcr.id, updates);
      setSelectedNcr({ ...selectedNcr, ...updates });
    }
    setShowEsigModal(false);
    setPendingAction('');
  };

  // ─── Wizard step validation ────────────────────────────────────────────────

  const canProceedStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!wizardData.title && !!wizardData.type;
      case 2: return !!wizardData.specLimit;
      case 3: return !!wizardData.phase1Conclusion;
      case 4: return wizardData.phase1Conclusion === 'Requires Phase II' || wizardData.phase1Conclusion === 'No Assignable Cause Found' ? !!wizardData.phase2Conclusion : true;
      case 5: return !!wizardData.lotDisposition && !!wizardData.dispositionDecision;
      case 6: return true;
      case 7: return true;
      default: return true;
    }
  };

  // ─── Render: Wizard Steps ──────────────────────────────────────────────────

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 1: Identification</h3>
            </div>
            <p className="text-sm text-muted-foreground">Enter the identification details for this OOS/OOT investigation.</p>

            {/* Template Selector */}
            <div className="grid gap-2">
              <Label>Template</Label>
              <Select value={formTemplateId || 'none'} onValueChange={(v) => {
                if (v === 'none') {
                  setFormTemplateId('');
                  setFormTemplateVersion('');
                } else {
                  setFormTemplateId(v);
                  const tpl = approvedOosTemplates.find(t => t.id === v);
                  setFormTemplateVersion(tpl?.version || '');
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select an approved template (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {approvedOosTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Title *</Label>
                <Input value={wizardData.title} onChange={(e) => updateWizard('title', e.target.value)} placeholder="e.g., Out of Specification Result - API Assay" />
              </div>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={wizardData.type} onValueChange={(v) => updateWizard('type', v as OosOotType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OOS">OOS - Out of Specification</SelectItem>
                    <SelectItem value="OOT">OOT - Out of Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Product Code</Label>
                <Input value={wizardData.productCode} onChange={(e) => updateWizard('productCode', e.target.value)} placeholder="e.g., PRD-001" />
              </div>
              <div className="grid gap-2">
                <Label>Lot Number</Label>
                <Input value={wizardData.lotNumber} onChange={(e) => updateWizard('lotNumber', e.target.value)} placeholder="e.g., BN-2024-XXX" />
              </div>
              <div className="grid gap-2">
                <Label>Sample ID</Label>
                <Input value={wizardData.sampleId} onChange={(e) => updateWizard('sampleId', e.target.value)} placeholder="e.g., SMP-2024-001" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Analytical Method</Label>
                <Input value={wizardData.analyticalMethod} onChange={(e) => updateWizard('analyticalMethod', e.target.value)} placeholder="e.g., HPLC Assay USP <621>" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Specification</Label>
                <Input value={wizardData.specification} onChange={(e) => updateWizard('specification', e.target.value)} placeholder="e.g., 95.0% - 105.0%" />
              </div>
              <div className="grid gap-2">
                <Label>Measured Value</Label>
                <Input type="number" value={wizardData.measuredValue} onChange={(e) => updateWizard('measuredValue', e.target.value)} placeholder="e.g., 92.3" />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input value={wizardData.unit} onChange={(e) => updateWizard('unit', e.target.value)} placeholder="e.g., %, mg/L, CFU/mL" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Applicable Specification Reference</Label>
                <Input value={wizardData.specReference} onChange={(e) => updateWizard('specReference', e.target.value)} placeholder="e.g., SOP-QC-042 Rev. 3" />
              </div>
              <div className="sm:col-span-2">
                <TemplateSelector
                  moduleType="oos_oot"
                  value={newTemplateId}
                  onChange={(id, version) => {
                    setNewTemplateId(id);
                    setNewTemplateVersion(version);
                  }}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Beaker className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 2: Analytical Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">Review specification limits, measured values, and detection source.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Specification Limit (Upper/Lower) *</Label>
                <Input value={wizardData.specLimit} onChange={(e) => updateWizard('specLimit', e.target.value)} placeholder="e.g., 95.0-105.0%" />
              </div>
            </div>

            {/* Out-of-Spec Visual Comparison */}
            {wizardData.measuredValue && wizardData.specLimit && (
              <div className={cn(
                'rounded-lg p-4 border-2',
                isWizardMeasuredOutOfSpec() === true
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800'
                  : isWizardMeasuredOutOfSpec() === false
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800'
                    : 'bg-muted/30 border-muted'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Measured Value</span>
                    <span className={cn(
                      'text-2xl font-bold',
                      isWizardMeasuredOutOfSpec() === true ? 'text-red-600 dark:text-red-400'
                        : isWizardMeasuredOutOfSpec() === false ? 'text-green-600 dark:text-green-400'
                          : ''
                    )}>
                      {wizardData.measuredValue} {wizardData.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block mb-1">Specification</span>
                    <span className="text-sm font-mono font-medium">{wizardData.specLimit}</span>
                  </div>
                  {isWizardMeasuredOutOfSpec() === true && (
                    <div className="flex items-center gap-1 ml-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">OUT OF SPEC</span>
                    </div>
                  )}
                  {isWizardMeasuredOutOfSpec() === false && (
                    <div className="flex items-center gap-1 ml-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">IN SPEC</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Detection Source</Label>
              <Select value={wizardData.detectionSource} onValueChange={(v) => updateWizard('detectionSource', v)}>
                <SelectTrigger><SelectValue placeholder="Select detection source..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Final QC Testing">Final QC Testing</SelectItem>
                  <SelectItem value="Customer Complaint">Customer Complaint</SelectItem>
                  <SelectItem value="Internal Audit">Internal Audit</SelectItem>
                  <SelectItem value="Supplier COA Review">Supplier COA Review</SelectItem>
                  <SelectItem value="Environmental Monitoring">Environmental Monitoring</SelectItem>
                  <SelectItem value="Stability Study">Stability Study</SelectItem>
                  <SelectItem value="Process Deviation">Process Deviation</SelectItem>
                  <SelectItem value="Management Review">Management Review</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 3: Phase I Investigation</h3>
            </div>
            <p className="text-sm text-muted-foreground">Laboratory investigation per FDA OOS Guidance — Phase I assesses assignable laboratory causes.</p>

            <div className="grid gap-2">
              <Label>Laboratory Investigation</Label>
              <Textarea value={wizardData.labInvestigation} onChange={(e) => updateWizard('labInvestigation', e.target.value)} placeholder="Describe the laboratory investigation performed..." rows={4} />
            </div>

            {/* Checklist */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Investigation Checklist</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { key: 'analystError' as const, label: 'Analyst Error?' },
                  { key: 'calculationError' as const, label: 'Calculation Error?' },
                  { key: 'instrumentMalfunction' as const, label: 'Instrument Malfunction?' },
                  { key: 'samplePrepError' as const, label: 'Sample Preparation Error?' },
                  { key: 'environmentalConditions' as const, label: 'Environmental Conditions?' },
                  { key: 'methodDeviation' as const, label: 'Method Deviation?' },
                ]).map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`wiz-${item.key}`}
                      checked={wizardData[item.key]}
                      onCheckedChange={(checked) => updateWizard(item.key, checked === true)}
                    />
                    <Label htmlFor={`wiz-${item.key}`} className="text-sm cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Assignable Cause Description</Label>
              <Textarea value={wizardData.assignableCauseDesc} onChange={(e) => updateWizard('assignableCauseDesc', e.target.value)} placeholder="Describe any assignable cause identified..." rows={3} />
            </div>

            <div className="grid gap-2">
              <Label>Phase I Conclusion *</Label>
              <Select value={wizardData.phase1Conclusion} onValueChange={(v) => updateWizard('phase1Conclusion', v)}>
                <SelectTrigger><SelectValue placeholder="Select Phase I conclusion..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assignable Cause Found">Assignable Cause Found</SelectItem>
                  <SelectItem value="No Assignable Cause Found">No Assignable Cause Found</SelectItem>
                  <SelectItem value="Requires Phase II">Requires Phase II</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {wizardData.phase1Conclusion === 'Assignable Cause Found' && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-700 dark:text-green-400">
                  <p className="font-medium">Assignable Cause Found</p>
                  <p className="mt-1">An assignable cause has been identified. The original result may be invalidated and a retest performed.</p>
                </div>
              </div>
            )}
            {(wizardData.phase1Conclusion === 'No Assignable Cause Found' || wizardData.phase1Conclusion === 'Requires Phase II') && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Phase II Investigation Required</p>
                  <p className="mt-1">No assignable cause was identified in the laboratory investigation. A full-scale Phase II investigation is required per FDA OOS Guidance.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 4: Phase II Investigation</h3>
            </div>
            <p className="text-sm text-muted-foreground">Full-scale investigation beyond the laboratory — covers manufacturing, equipment, materials, and personnel.</p>

            {(wizardData.phase1Conclusion === 'Assignable Cause Found') && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p>Phase II is optional when an assignable cause was found in Phase I. You may still proceed to document additional investigation if needed.</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Extended Investigation Description</Label>
              <Textarea value={wizardData.extendedInvestigation} onChange={(e) => updateWizard('extendedInvestigation', e.target.value)} placeholder="Describe the extended full-scale investigation performed..." rows={4} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Root Cause Analysis Method</Label>
                <Select value={wizardData.rootCauseMethod} onValueChange={(v) => updateWizard('rootCauseMethod', v)}>
                  <SelectTrigger><SelectValue placeholder="Select RCA method..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5 Whys">5 Whys</SelectItem>
                    <SelectItem value="Fishbone">Fishbone (Ishikawa)</SelectItem>
                    <SelectItem value="FMEA">FMEA</SelectItem>
                    <SelectItem value="Ishikawa">Ishikawa Diagram</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Phase II Conclusion *</Label>
                <Select value={wizardData.phase2Conclusion} onValueChange={(v) => updateWizard('phase2Conclusion', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Phase II conclusion..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmed OOS">Confirmed OOS</SelectItem>
                    <SelectItem value="Invalidated">Invalidated</SelectItem>
                    <SelectItem value="Error Found">Error Found</SelectItem>
                    <SelectItem value="No Error Found">No Error Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Root Cause Statement</Label>
              <Textarea value={wizardData.rootCauseStatement} onChange={(e) => updateWizard('rootCauseStatement', e.target.value)} placeholder="State the identified root cause..." rows={3} />
            </div>

            {wizardData.phase2Conclusion === 'Confirmed OOS' && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-400">
                  <p className="font-medium">OOS Confirmed</p>
                  <p className="mt-1">The original OOS result has been confirmed. Lot disposition and impact assessment must be completed.</p>
                </div>
              </div>
            )}
            {wizardData.phase2Conclusion === 'Invalidated' && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-700 dark:text-green-400">
                  <p className="font-medium">Result Invalidated</p>
                  <p className="mt-1">The original OOS result has been invalidated. A retest may be performed and the original result should not be reported.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 5: Disposition &amp; Impact</h3>
            </div>
            <p className="text-sm text-muted-foreground">Determine lot disposition and assess impact on product quality.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lot Disposition *</Label>
                <Select value={wizardData.lotDisposition} onValueChange={(v) => updateWizard('lotDisposition', v)}>
                  <SelectTrigger><SelectValue placeholder="Select lot disposition..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reject Lot">Reject Lot</SelectItem>
                    <SelectItem value="Do Not Reject Lot">Do Not Reject Lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Disposition Decision *</Label>
                <Select value={wizardData.dispositionDecision} onValueChange={(v) => updateWizard('dispositionDecision', v)}>
                  <SelectTrigger><SelectValue placeholder="Select disposition decision..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Use As Is">Use As Is</SelectItem>
                    <SelectItem value="Rework">Rework</SelectItem>
                    <SelectItem value="Scrap">Scrap</SelectItem>
                    <SelectItem value="Return to Supplier">Return to Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lot disposition visual indicator */}
            {wizardData.lotDisposition && (
              <div className={cn(
                'rounded-md p-4 flex items-center gap-3',
                wizardData.lotDisposition === 'Reject Lot'
                  ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
              )}>
                {wizardData.lotDisposition === 'Reject Lot' ? (
                  <>
                    <Ban className="h-6 w-6 text-red-500" />
                    <div>
                      <span className="font-medium text-red-700 dark:text-red-400">LOT REJECTED</span>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">This lot must be rejected based on the investigation findings.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-400">LOT NOT REJECTED</span>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">The lot disposition decision is to not reject this lot.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label>Disposition Justification</Label>
              <Textarea value={wizardData.dispositionJustification} onChange={(e) => updateWizard('dispositionJustification', e.target.value)} placeholder="Justify the disposition decision..." rows={3} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="wiz-concession"
                checked={wizardData.concession}
                onCheckedChange={(checked) => updateWizard('concession', checked === true)}
              />
              <Label htmlFor="wiz-concession" className="text-sm cursor-pointer">Concession Granted</Label>
            </div>

            {wizardData.dispositionDecision === 'Rework' && (
              <div className="grid gap-2">
                <Label>Rework Instructions</Label>
                <Textarea value={wizardData.reworkInstructions} onChange={(e) => updateWizard('reworkInstructions', e.target.value)} placeholder="Provide detailed rework instructions..." rows={3} />
              </div>
            )}

            {wizardData.concession && (
              <div className="grid gap-2">
                <Label>Concession Authorized By</Label>
                <Input value={wizardData.concessionAuthorizedBy} onChange={(e) => updateWizard('concessionAuthorizedBy', e.target.value)} placeholder="Name of authorizing person" />
              </div>
            )}

            {wizardData.dispositionDecision === 'Scrap' && (
              <div className="grid gap-2">
                <Label>Scrap Documentation Reference</Label>
                <Input value={wizardData.scrapDocRef} onChange={(e) => updateWizard('scrapDocRef', e.target.value)} placeholder="e.g., SCR-2024-001" />
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 6: Actions &amp; CAPA</h3>
            </div>
            <p className="text-sm text-muted-foreground">Define containment actions, corrective actions, and link to CAPA records.</p>

            {/* Containment Actions Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Containment Actions</Label>
                <Button variant="outline" size="sm" onClick={addContainmentAction}>
                  <Plus className="h-3 w-3 mr-1" />Add Action
                </Button>
              </div>
              {wizardData.containmentActions.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Action</TableHead>
                        <TableHead className="w-[25%]">Responsible</TableHead>
                        <TableHead className="w-[25%]">Completion Date</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wizardData.containmentActions.map((ca) => (
                        <TableRow key={ca.id}>
                          <TableCell>
                            <Input value={ca.action} onChange={(e) => updateContainmentAction(ca.id, 'action', e.target.value)} placeholder="Action description" className="h-8 text-xs" />
                          </TableCell>
                          <TableCell>
                            <Input value={ca.responsible} onChange={(e) => updateContainmentAction(ca.id, 'responsible', e.target.value)} placeholder="Name" className="h-8 text-xs" />
                          </TableCell>
                          <TableCell>
                            <Input type="date" value={ca.completionDate} onChange={(e) => updateContainmentAction(ca.id, 'completionDate', e.target.value)} className="h-8 text-xs" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeContainmentAction(ca.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  No containment actions added. Click &quot;Add Action&quot; to add one.
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Corrective Action Summary</Label>
              <Textarea value={wizardData.correctiveActionSummary} onChange={(e) => updateWizard('correctiveActionSummary', e.target.value)} placeholder="Summarize the corrective actions to be taken..." rows={3} />
            </div>

            <div className="grid gap-2">
              <Label>Linked CAPA Reference</Label>
              <Select value={wizardData.linkedCapaRef} onValueChange={(v) => updateWizard('linkedCapaRef', v)}>
                <SelectTrigger><SelectValue placeholder="Select existing CAPA..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {capas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.capaNumber} — {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Lessons Learned</Label>
              <Textarea value={wizardData.lessonsLearned} onChange={(e) => updateWizard('lessonsLearned', e.target.value)} placeholder="Document key lessons learned from this investigation..." rows={3} />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Step 7: Review &amp; Submit</h3>
            </div>
            <p className="text-sm text-muted-foreground">Review all entered data before submitting the investigation.</p>

            {/* Summary Sections */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identification</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-1">{wizardData.title || '-'}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <Badge className={cn('ml-1 text-xs', wizardData.type === 'OOS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')} variant="secondary">{wizardData.type}</Badge></div>
                <div><span className="text-muted-foreground">Product Code:</span> <span className="font-medium ml-1 font-mono text-xs">{wizardData.productCode || '-'}</span></div>
                <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-medium ml-1 font-mono text-xs">{wizardData.lotNumber || '-'}</span></div>
                <div><span className="text-muted-foreground">Sample ID:</span> <span className="font-medium ml-1 font-mono text-xs">{wizardData.sampleId || '-'}</span></div>
                <div><span className="text-muted-foreground">Analytical Method:</span> <span className="font-medium ml-1 text-xs">{wizardData.analyticalMethod || '-'}</span></div>
                <div><span className="text-muted-foreground">Specification:</span> <span className="font-medium ml-1 font-mono text-xs">{wizardData.specification || '-'}</span></div>
                <div><span className="text-muted-foreground">Spec Reference:</span> <span className="font-medium ml-1 text-xs">{wizardData.specReference || '-'}</span></div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Beaker className="h-4 w-4 text-primary" />Analytical Data</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Spec Limit:</span> <span className="font-mono font-medium ml-1">{wizardData.specLimit || '-'}</span></div>
                <div><span className="text-muted-foreground">Measured Value:</span> <span className={cn('font-bold ml-1', isWizardMeasuredOutOfSpec() === true ? 'text-red-600 dark:text-red-400' : '')}>{wizardData.measuredValue || '-'} {wizardData.unit}</span></div>
                <div><span className="text-muted-foreground">Detection Source:</span> <span className="font-medium ml-1">{wizardData.detectionSource || '-'}</span></div>
              </div>
              {isWizardMeasuredOutOfSpec() === true && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">OUT OF SPECIFICATION</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />Phase I Investigation</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Conclusion:</span> <Badge className={cn('ml-1 text-xs', phase1ConclusionColors[wizardData.phase1Conclusion] || '')} variant="secondary">{wizardData.phase1Conclusion || 'Pending'}</Badge></div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Lab Investigation:</span> <span className="ml-1">{wizardData.labInvestigation || '-'}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Assignable Cause:</span> <span className="ml-1">{wizardData.assignableCauseDesc || '-'}</span></div>
              <div className="flex flex-wrap gap-2">
                {wizardData.analystError && <Badge variant="outline" className="text-xs">Analyst Error</Badge>}
                {wizardData.calculationError && <Badge variant="outline" className="text-xs">Calculation Error</Badge>}
                {wizardData.instrumentMalfunction && <Badge variant="outline" className="text-xs">Instrument Malfunction</Badge>}
                {wizardData.samplePrepError && <Badge variant="outline" className="text-xs">Sample Prep Error</Badge>}
                {wizardData.environmentalConditions && <Badge variant="outline" className="text-xs">Environmental Conditions</Badge>}
                {wizardData.methodDeviation && <Badge variant="outline" className="text-xs">Method Deviation</Badge>}
              </div>
            </div>

            {(wizardData.phase2Conclusion || wizardData.phase1Conclusion === 'Requires Phase II' || wizardData.phase1Conclusion === 'No Assignable Cause Found') && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Phase II Investigation</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Conclusion:</span> <Badge className={cn('ml-1 text-xs', phase2ConclusionColors[wizardData.phase2Conclusion] || '')} variant="secondary">{wizardData.phase2Conclusion || 'Pending'}</Badge></div>
                  <div><span className="text-muted-foreground">RCA Method:</span> <span className="font-medium ml-1">{wizardData.rootCauseMethod || '-'}</span></div>
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Root Cause:</span> <span className="ml-1">{wizardData.rootCauseStatement || '-'}</span></div>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Disposition &amp; Impact</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Lot Disposition:</span> <Badge className={cn('ml-1 text-xs', wizardData.lotDisposition === 'Reject Lot' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')} variant="secondary">{wizardData.lotDisposition || '-'}</Badge></div>
                <div><span className="text-muted-foreground">Decision:</span> <Badge className={cn('ml-1 text-xs', dispositionColors[wizardData.dispositionDecision] || '')} variant="secondary">{wizardData.dispositionDecision || '-'}</Badge></div>
                <div><span className="text-muted-foreground">Concession:</span> <span className="font-medium ml-1">{wizardData.concession ? 'Yes' : 'No'}</span></div>
              </div>
              {wizardData.dispositionJustification && <div className="text-sm"><span className="text-muted-foreground">Justification:</span> <span className="ml-1">{wizardData.dispositionJustification}</span></div>}
            </div>

            {(wizardData.containmentActions.length > 0 || wizardData.correctiveActionSummary || wizardData.lessonsLearned) && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" />Actions &amp; CAPA</h4>
                {wizardData.containmentActions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Containment Actions:</span>
                    {wizardData.containmentActions.map((ca) => (
                      <div key={ca.id} className="text-sm ml-2 flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span>{ca.action || 'Unnamed'} — {ca.responsible || 'Unassigned'} ({ca.completionDate || 'No date'})</span>
                      </div>
                    ))}
                  </div>
                )}
                {wizardData.correctiveActionSummary && <div className="text-sm"><span className="text-muted-foreground">Corrective Action:</span> <span className="ml-1">{wizardData.correctiveActionSummary}</span></div>}
                {wizardData.linkedCapaRef && wizardData.linkedCapaRef !== 'none' && <div className="text-sm"><span className="text-muted-foreground">Linked CAPA:</span> <span className="ml-1 font-mono text-xs">{capas.find(c => c.id === wizardData.linkedCapaRef)?.capaNumber || wizardData.linkedCapaRef}</span></div>}
                {wizardData.lessonsLearned && <div className="text-sm"><span className="text-muted-foreground">Lessons Learned:</span> <span className="ml-1">{wizardData.lessonsLearned}</span></div>}
              </div>
            )}

            {/* Regulatory Compliance Note */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-400">
                <p className="font-medium">Regulatory Compliance Verification</p>
                <p className="mt-1">This investigation has been conducted in accordance with <strong>ICH Q2(R1)</strong> (Validation of Analytical Procedures) and <strong>FDA OOS Guidance</strong> (Investigating Out-of-Specification Test Results for Pharmaceutical Production). All phases follow the prescribed laboratory and full-scale investigation workflow.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Render: Enhanced Detail Dialog ────────────────────────────────────────

  const renderDetailDialog = () => {
    if (!selectedNcr) return null;

    // Compute investigation workflow phase
    const getWorkflowPhase = () => {
      if (selectedNcr.status === 'Open') return 1;
      if (selectedNcr.phase1Conclusion && selectedNcr.phase1Conclusion !== 'Pending' && !selectedNcr.phase2Required) return 3;
      if (selectedNcr.phase1Conclusion && selectedNcr.phase1Conclusion !== 'Pending' && selectedNcr.phase2Required) {
        if (selectedNcr.phase2Conclusion && selectedNcr.phase2Conclusion !== 'Pending') return 4;
        return 3;
      }
      return 2;
    };
    const workflowPhase = getWorkflowPhase();

    return (
      <div className="space-y-5">
        {/* Status & Type Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={cn(ncrStatusColors[selectedNcr.status] || '')} variant="secondary">{selectedNcr.status}</Badge>
          <Badge className={cn(
            selectedNcr.type === 'OOS'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          )} variant="secondary">{selectedNcr.type}</Badge>
          {selectedNcr.severity && <Badge variant="outline">{selectedNcr.severity}</Badge>}
          {selectedNcr.rejectLot && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" variant="secondary">
              <Ban className="h-3 w-3 mr-1" />Reject Lot
            </Badge>
          )}
        </div>

        {/* Spec Comparison Visualization */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Beaker className="h-4 w-4 text-primary" />
            Specification Comparison
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-md p-3">
              <span className="text-xs text-muted-foreground block mb-1">Analytical Method</span>
              <span className="font-medium text-sm">{selectedNcr.analyticalMethod || '-'}</span>
            </div>
            <div className="bg-muted/30 rounded-md p-3">
              <span className="text-xs text-muted-foreground block mb-1">Specification Limit</span>
              <span className="font-mono text-sm font-medium">{selectedNcr.specLimit || '-'}</span>
            </div>
          </div>
          <div className={cn(
            'rounded-md p-4 border-2',
            isMeasuredValueOutOfSpec(selectedNcr)
              ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Measured Value</span>
                <span className={cn(
                  'text-2xl font-bold',
                  isMeasuredValueOutOfSpec(selectedNcr) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                )}>
                  {selectedNcr.measuredValue !== undefined ? `${selectedNcr.measuredValue} ${selectedNcr.measuredUnit || ''}` : '-'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block mb-1">Specification</span>
                <span className="text-sm font-mono font-medium">{selectedNcr.specLimit || '-'}</span>
              </div>
              {isMeasuredValueOutOfSpec(selectedNcr) ? (
                <div className="flex items-center gap-1 ml-4">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">OUT OF SPEC</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">IN SPEC</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Investigation Workflow Progress Bar */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Investigation Workflow
          </h4>
          <div className="flex items-center gap-1">
            {[
              { label: 'Open', phase: 1 },
              { label: 'Phase I', phase: 2 },
              { label: 'Phase I Complete', phase: 3 },
              { label: 'Phase II', phase: 4 },
              { label: 'Disposition', phase: 5 },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className={cn(
                  'px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap flex-1 text-center',
                  workflowPhase >= step.phase
                    ? step.label === 'Phase II' && selectedNcr.phase2Conclusion === 'Confirmed OOS'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : step.label === 'Disposition' && selectedNcr.rejectLot
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {step.label}
                </div>
                {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                workflowPhase >= 5 ? 'bg-green-500' : workflowPhase >= 4 ? 'bg-red-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min((workflowPhase / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Basic Info */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {selectedNcr.templateId && (() => {
              const tpl = store.formTemplates.find(t => t.id === selectedNcr.templateId);
              return tpl ? (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Template:</span>{' '}
                  <Badge variant="outline" className="text-xs">{tpl.title} (v{selectedNcr.templateVersion || tpl.version})</Badge>
                </div>
              ) : null;
            })()}
            <div><span className="text-muted-foreground">NCR Number:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.ncrNumber}</span></div>
            <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1">{selectedNcr.type}</span></div>
            <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.lotNumber || '-'}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge className={cn('text-xs ml-1', ncrStatusColors[selectedNcr.status])} variant="secondary">{selectedNcr.status}</Badge></div>
            <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{getUserName(selectedNcr.assignedTo)}</span></div>
            <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedNcr.createdDate)}</span></div>
          </div>
          {selectedNcr.description && (
            <div>
              <h5 className="font-medium text-sm mb-1">Description</h5>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedNcr.description}</p>
            </div>
          )}
        </div>

        {/* Phase I Investigation */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">Phase 1</span>
            Laboratory Investigation
          </h4>

          {/* Checklist Results */}
          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Investigation Checklist</h5>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'analystError' as const, label: 'Analyst Error?' },
                { key: 'calculationError' as const, label: 'Calculation Error?' },
                { key: 'instrumentMalfunction' as const, label: 'Instrument Malfunction?' },
                { key: 'samplePrepError' as const, label: 'Sample Preparation Error?' },
                { key: 'environmentalConditions' as const, label: 'Environmental Conditions?' },
                { key: 'methodDeviation' as const, label: 'Method Deviation?' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={labChecklist[item.key]}
                    onCheckedChange={(checked) => setLabChecklist({ ...labChecklist, [item.key]: checked === true })}
                    disabled={!!(selectedNcr.phase1Conclusion && selectedNcr.phase1Conclusion !== 'Pending')}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <Separator />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Phase 1 Conclusion:</span>
              {selectedNcr.phase1Conclusion && selectedNcr.phase1Conclusion !== 'Pending' ? (
                <Badge className={cn(phase1ConclusionColors[selectedNcr.phase1Conclusion] || '')} variant="secondary">
                  {selectedNcr.phase1Conclusion}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
              )}
            </div>
            {hasPermission('ncr.update') && (!selectedNcr.phase1Conclusion || selectedNcr.phase1Conclusion === 'Pending') && (
              <div className="flex items-center gap-2">
                <Select value={phase1Conclusion} onValueChange={setPhase1Conclusion}>
                  <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Select conclusion" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Error Found">Error Found</SelectItem>
                    <SelectItem value="No Error Found">No Error Found</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAdvancePhase1} disabled={!phase1Conclusion}>
                  Advance <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
          {selectedNcr.phase1Conclusion === 'Error Found' && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-xs text-amber-700 dark:text-amber-400">
              An error was found during laboratory investigation. The result may be invalidated. Phase 2 investigation is required to confirm root cause.
            </div>
          )}
          {selectedNcr.phase1Conclusion === 'No Error Found' && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-2 text-xs text-blue-700 dark:text-blue-400">
              No error found in laboratory investigation. The OOS result cannot be invalidated — Phase 2 full-scale investigation is required.
            </div>
          )}
        </div>

        {/* Phase II Investigation */}
        {selectedNcr.phase2Required && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded text-xs font-medium">Phase 2</span>
              Full-Scale Investigation
            </h4>
            {(!selectedNcr.phase1Conclusion || selectedNcr.phase1Conclusion === 'Pending') ? (
              <div className="bg-muted/30 rounded-md p-3 text-sm text-muted-foreground">
                Phase 2 investigation requires Phase 1 to be concluded first.
              </div>
            ) : (
              <>
                <div className="bg-muted/30 rounded-md p-3 space-y-1 text-sm">
                  <p>Phase 2 is required because <strong>{selectedNcr.phase1Conclusion === 'No Error Found' ? 'no assignable error was found in Phase 1' : 'an error was found but the result must be confirmed through expanded investigation'}</strong>.</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Phase 2 Conclusion:</span>
                    {selectedNcr.phase2Conclusion && selectedNcr.phase2Conclusion !== 'Pending' ? (
                      <Badge className={cn(phase2ConclusionColors[selectedNcr.phase2Conclusion] || '')} variant="secondary">
                        {selectedNcr.phase2Conclusion}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                    )}
                  </div>
                  {hasPermission('ncr.update') && (!selectedNcr.phase2Conclusion || selectedNcr.phase2Conclusion === 'Pending') && (
                    <div className="flex items-center gap-2">
                      <Select value={phase2Conclusion} onValueChange={setPhase2Conclusion}>
                        <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Select conclusion" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Confirmed OOS">Confirmed OOS</SelectItem>
                          <SelectItem value="Invalidated">Invalidated</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAdvancePhase2} disabled={!phase2Conclusion}>
                        Conclude <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Reject Lot Decision */}
                {(selectedNcr.phase2Conclusion === 'Confirmed OOS' || (!selectedNcr.phase2Conclusion || selectedNcr.phase2Conclusion === 'Pending')) && (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Reject Lot Decision:</span>
                      {selectedNcr.phase2Conclusion && selectedNcr.phase2Conclusion !== 'Pending' ? (
                        selectedNcr.rejectLot ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" variant="secondary">
                            <Ban className="h-3 w-3 mr-1" />Yes — Reject Lot
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" variant="secondary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />No — Do Not Reject
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      )}
                    </div>
                    {hasPermission('ncr.update') && (!selectedNcr.phase2Conclusion || selectedNcr.phase2Conclusion === 'Pending') && (
                      <Button
                        size="sm"
                        variant={rejectLotDecision ? 'destructive' : 'outline'}
                        onClick={() => setRejectLotDecision(!rejectLotDecision)}
                      >
                        {rejectLotDecision ? 'Reject Lot' : 'Do Not Reject Lot'}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Disposition Decision with Visual Indicator */}
        {(selectedNcr.status === 'Pending Disposition' || (selectedNcr.disposition && selectedNcr.disposition !== 'Pending')) && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" />
              Disposition Decision
            </h4>
            {selectedNcr.disposition && selectedNcr.disposition !== 'Pending' ? (
              <div className={cn(
                'rounded-md p-4 flex items-center gap-3',
                selectedNcr.disposition === 'Scrap' || selectedNcr.disposition === 'Return to Supplier'
                  ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                  : selectedNcr.disposition === 'Rework'
                    ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
              )}>
                <Badge className={cn('text-sm', dispositionColors[selectedNcr.disposition] || '')} variant="secondary">
                  {selectedNcr.disposition}
                </Badge>
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">E-signature verified</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Use As Is', 'Rework', 'Scrap', 'Return to Supplier'] as NcrDisposition[]).map(d => (
                    <Button
                      key={d}
                      variant={disposition === d ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setDisposition(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
                {hasPermission('ncr.approve') && (
                  <Button onClick={handleSetDisposition} disabled={disposition === 'Pending'} className="w-full">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Apply Disposition with Electronic Signature
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Lot Disposition Visual */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Lot Disposition
          </h4>
          <div className={cn(
            'rounded-md p-4 flex items-center gap-3',
            selectedNcr.rejectLot
              ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
          )}>
            {selectedNcr.rejectLot ? (
              <>
                <Ban className="h-6 w-6 text-red-500" />
                <div>
                  <span className="font-medium text-red-700 dark:text-red-400">LOT REJECTED</span>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">This lot must be rejected based on the confirmed OOS result.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <div>
                  <span className="font-medium text-green-700 dark:text-green-400">LOT NOT REJECTED</span>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">The lot disposition decision is to not reject this lot.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Linked CAPA */}
        {selectedNcr.linkedCapaId && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Linked CAPA
            </h4>
            <div className="text-sm">
              <span className="font-mono text-xs">{selectedNcr.linkedCapaId}</span>
              {(() => {
                const capa = store.capas.find(c => c.id === selectedNcr.linkedCapaId);
                return capa ? (
                  <span className="ml-2 text-muted-foreground">— {capa.title}</span>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Layer 1 Gate Warning */}
      {!oosHasApprovedTemplate && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">No approved template found for OOS/OOT records</p>
            <p className="mt-0.5">Please create and approve a template in the Forms module first.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            OOS / OOT Investigations
          </h1>
          <p className="text-muted-foreground mt-1">Out of Specification / Out of Trend — FDA &amp; ICH Q2(R1) Guidance</p>
        </div>
        {hasPermission('ncr.create') && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />Create OOS/OOT
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">OOS Count</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.oosCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">OOT Count</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.ootCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Phase 1 Pending</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.phase1Pending}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Phase 2 Confirmed</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.phase2Confirmed}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search OOS/OOT (title, NCR#, lot#)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="OOS">OOS</SelectItem>
            <SelectItem value="OOT">OOT</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="phase1_pending">Phase 1 Pending</SelectItem>
            <SelectItem value="phase2_required">Phase 2 Required</SelectItem>
            <SelectItem value="phase2_pending">Phase 2 Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conclusionFilter} onValueChange={setConclusionFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Conclusion" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conclusions</SelectItem>
            <SelectItem value="confirmed_oos">Confirmed OOS</SelectItem>
            <SelectItem value="invalidated">Invalidated</SelectItem>
            <SelectItem value="error_found">Error Found</SelectItem>
            <SelectItem value="no_error">No Error Found</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['Open', 'Under Investigation', 'Pending Disposition', 'Closed'] as NcrStatus[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  <TableHead className="w-[130px]">NCR #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[70px]">Type</TableHead>
                  <TableHead className="w-[110px]">Lot #</TableHead>
                  <TableHead className="w-[180px]">Analytical Method</TableHead>
                  <TableHead className="w-[120px]">Measured vs Spec</TableHead>
                  <TableHead className="w-[120px]">Phase 1</TableHead>
                  <TableHead className="w-[120px]">Phase 2</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[100px]">Template</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNcrs.map(ncr => (
                  <TableRow key={ncr.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(ncr)}>
                    <TableCell className="font-mono text-xs">{ncr.ncrNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-xs">{ncr.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'text-xs',
                        ncr.type === 'OOS'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )} variant="secondary">{ncr.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ncr.lotNumber || '-'}</TableCell>
                    <TableCell className="text-xs">{ncr.analyticalMethod || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={cn(
                          'text-sm font-medium',
                          isMeasuredValueOutOfSpec(ncr) && 'text-red-600 dark:text-red-400'
                        )}>
                          {ncr.measuredValue !== undefined ? `${ncr.measuredValue} ${ncr.measuredUnit || ''}` : '-'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">vs {ncr.specLimit || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ncr.phase1Conclusion && ncr.phase1Conclusion !== 'Pending' ? (
                        <Badge className={cn('text-xs', phase1ConclusionColors[ncr.phase1Conclusion] || '')} variant="secondary">
                          {ncr.phase1Conclusion}
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {ncr.phase2Required ? (
                        ncr.phase2Conclusion && ncr.phase2Conclusion !== 'Pending' ? (
                          <Badge className={cn('text-xs', phase2ConclusionColors[ncr.phase2Conclusion] || '')} variant="secondary">
                            {ncr.phase2Conclusion}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" variant="secondary">
                            Required
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', ncrStatusColors[ncr.status] || '')} variant="secondary">{ncr.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {ncr.templateId ? (() => {
                        const tpl = store.formTemplates.find(t => t.id === ncr.templateId);
                        return tpl ? (
                          <Badge variant="outline" className="text-xs">{tpl.title}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        );
                      })() : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(ncr); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNcrs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No OOS/OOT records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 7-Step Create Wizard Dialog ────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Create OOS/OOT Investigation
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = wizardStep === step.id;
              const isComplete = wizardStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isComplete) setWizardStep(step.id);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isComplete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50' :
                      'bg-muted text-muted-foreground cursor-default'
                    )}
                    disabled={!isComplete && !isActive}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.id}</span>
                  </button>
                  {i < WIZARD_STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 mb-4">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(wizardStep / 7) * 100}%` }}
            />
          </div>

          {/* Step Content */}
          {renderWizardStep()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
              disabled={wizardStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <span className="text-sm text-muted-foreground">Step {wizardStep} of 7</span>
            {wizardStep < 7 ? (
              <Button onClick={() => setWizardStep(Math.min(7, wizardStep + 1))} disabled={!canProceedStep(wizardStep)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreateOosOot} disabled={!wizardData.title}>
                <Plus className="h-4 w-4 mr-1" />Create Investigation
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Enhanced Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          {selectedNcr && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  <span className="font-mono text-sm text-muted-foreground">{selectedNcr.ncrNumber}</span>
                  {selectedNcr.title}
                </DialogTitle>
              </DialogHeader>
              {renderDetailDialog()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={showEsigModal}
        onClose={() => { setShowEsigModal(false); setPendingAction(''); }}
        onSign={handleEsigSign}
        recordTitle={selectedNcr?.title || 'OOS/OOT Investigation'}
        recordId={selectedNcr?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
