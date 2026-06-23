'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Capa, CapaStatus, CapaType, CapaPriority, CapaSource, RootCauseCategory, SignatureType, FormTemplateModule, FormTemplateModuleType } from '@/types/qms';
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { TemplateSelector } from '@/components/shared/TemplateSelector';
import {
  Shield, Plus, Search, Eye, ArrowRight, CheckCircle2, AlertTriangle,
  Clock, XCircle, ChevronDown, ChevronUp, AlertCircle, Link2,
  ChevronLeft, ChevronRight, FileText, ClipboardCheck, Wrench,
  BarChart3, UserCheck, ListChecks, Zap, DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ─── Constants ───────────────────────────────────────────────────────────────

const statusColors: Record<CapaStatus, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Implementation': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Effectiveness Check': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Closed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const priorityColors: Record<CapaPriority, string> = {
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Low': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const statusFlow: CapaStatus[] = ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'];

const WIZARD_STEPS = [
  { id: 0, label: 'Change Request', icon: FileText },
  { id: 1, label: 'Description & Justification', icon: ClipboardCheck },
  { id: 2, label: 'Proposed Change', icon: Wrench },
  { id: 3, label: 'Risk & Impact', icon: BarChart3 },
  { id: 4, label: 'Approval & Assignment', icon: UserCheck },
  { id: 5, label: 'Linked Records & Review', icon: ListChecks },
];

const riskRatingLabels = ['N/A', '1 - Very Low', '2 - Low', '3 - Medium', '4 - High', '5 - Very High'];

const riskRatingColor = (val: number): string => {
  if (val <= 1) return 'text-green-600 dark:text-green-400';
  if (val <= 2) return 'text-green-500 dark:text-green-400';
  if (val <= 3) return 'text-amber-500 dark:text-amber-400';
  if (val <= 4) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-500 dark:text-red-400';
};

const rpnColor = (rpn: number): string => {
  if (rpn <= 20) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
  if (rpn <= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700';
  if (rpn <= 100) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
};

function getNextStatus(current: CapaStatus): CapaStatus | null {
  const idx = statusFlow.indexOf(current);
  return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CapaView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const { hasApprovedTemplate } = useRecordWorkflow();
  const capaModuleType: FormTemplateModuleType = 'capa';
  const capas = store.capas;
  const profiles = store.profiles;
  const documents = store.documents;

  // ── View state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCapa, setSelectedCapa] = useState<Capa | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [prereqError, setPrereqError] = useState<string | null>(null);

  // ── Wizard state ──
  const [wizardStep, setWizardStep] = useState(0);

  // ── Step 1 - Change Request ──
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<CapaType>('Corrective');
  const [formPriority, setFormPriority] = useState<CapaPriority>('Medium');
  const [formSource, setFormSource] = useState<CapaSource>('Non-Conformance');
  const [formCategory, setFormCategory] = useState('');
  const [formEmergency, setFormEmergency] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formRegulatoryTrigger, setFormRegulatoryTrigger] = useState('');

  // ── Step 2 - Description & Justification ──
  const [formProblemStatement, setFormProblemStatement] = useState('');
  const [formJustification, setFormJustification] = useState('');

  // ── Step 3 - Proposed Change ──
  const [formProposedChange, setFormProposedChange] = useState('');
  const [formImplementationPlan, setFormImplementationPlan] = useState('');
  const [formImplementationDate, setFormImplementationDate] = useState('');
  const [formEstimatedCost, setFormEstimatedCost] = useState('');

  // ── Step 4 - Risk & Impact Assessment ──
  const [formRiskProbability, setFormRiskProbability] = useState(3);
  const [formRiskImpact, setFormRiskImpact] = useState(3);
  const [formRiskDetection, setFormRiskDetection] = useState(3);
  const [formImpactAnalysis, setFormImpactAnalysis] = useState('');
  const [formAffectedAreas, setFormAffectedAreas] = useState('');
  const [formImpactOnValidatedSystems, setFormImpactOnValidatedSystems] = useState(false);

  // ── Step 5 - Approval & Assignment ──
  const [formRootCauseCategory, setFormRootCauseCategory] = useState<RootCauseCategory>('Method');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formApprover, setFormApprover] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // ── Step 6 - Linked Records ──
  const [formLinkedDocId, setFormLinkedDocId] = useState('');
  const [formLinkedNcrId, setFormLinkedNcrId] = useState('');
  const [formAdditionalReferences, setFormAdditionalReferences] = useState('');

  // ── Template ──
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newTemplateVersion, setNewTemplateVersion] = useState('');

  // ── Electronic Signature ──
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ capa: Capa; nextStatus: CapaStatus } | null>(null);

  // ── Computed ──
  const filteredCapas = capas.filter(c => {
    const matchesSearch = searchTerm === '' ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.capaNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const summaryCounts = {
    open: capas.filter(c => c.status === 'Open').length,
    investigation: capas.filter(c => c.status === 'Investigation').length,
    implementation: capas.filter(c => c.status === 'Implementation').length,
    effectiveness: capas.filter(c => c.status === 'Effectiveness Check').length,
    closed: capas.filter(c => c.status === 'Closed').length,
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const approvedSops = documents.filter(d => d.type === 'SOP' && d.status === 'Approved');

  const computedRpn = formRiskProbability * formRiskImpact * formRiskDetection;

  // ── Step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formTitle.trim() !== '' && formDescription.trim() !== '';
      case 1:
        return formProblemStatement.trim() !== '' && formJustification.trim() !== '';
      case 2:
        return formProposedChange.trim() !== '' && formImplementationPlan.trim() !== '';
      case 3:
        return formImpactAnalysis.trim() !== '' && formAffectedAreas.trim() !== '';
      case 4:
        return formAssignedTo !== '' && formApprover !== '' && formDueDate !== '';
      case 5:
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

  // ── Create ──
  const handleCreate = () => {
    const prereqResult = store.checkPrerequisites('CAPA', 'org-001');
    if (!prereqResult.met) {
      setPrereqError(`Prerequisite not met: ${prereqResult.missing.map(p => p.description).join(', ')}`);
      return;
    }
    setPrereqError(null);

    const newCapa: Capa = {
      id: `capa-${Date.now()}`,
      capaNumber: `CAPA-2024-${String(capas.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Open',
      priority: formPriority,
      source: formSource,
      description: formDescription,
      problemStatement: formProblemStatement,
      rootCauseCategory: formRootCauseCategory,
      assignedTo: formAssignedTo,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : new Date().toISOString(),
      createdDate: new Date().toISOString(),
      linkedDocumentId: formLinkedDocId && formLinkedDocId !== 'none' ? formLinkedDocId : undefined,
      templateId: newTemplateId || undefined,
      templateVersion: newTemplateVersion || undefined,
      // TODO: wire up linkedCapaId selector in the form — field is on the
      // Capa interface (linkedCapaId) but no `formLinkedCapaId` state exists yet.
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addCapa(newCapa);
    resetForm();
    setShowCreateDialog(false);
  };

  const resetForm = () => {
    setWizardStep(0);
    setFormTitle('');
    setFormType('Corrective');
    setFormPriority('Medium');
    setFormSource('Non-Conformance');
    setFormCategory('');
    setFormEmergency(false);
    setFormDescription('');
    setFormRegulatoryTrigger('');
    setFormProblemStatement('');
    setFormJustification('');
    setFormProposedChange('');
    setFormImplementationPlan('');
    setFormImplementationDate('');
    setFormEstimatedCost('');
    setFormRiskProbability(3);
    setFormRiskImpact(3);
    setFormRiskDetection(3);
    setFormImpactAnalysis('');
    setFormAffectedAreas('');
    setFormImpactOnValidatedSystems(false);
    setFormRootCauseCategory('Method');
    setFormAssignedTo('');
    setFormApprover('');
    setFormDueDate('');
    setFormLinkedDocId('');
    setFormLinkedNcrId('');
    setFormAdditionalReferences('');
    setNewTemplateId('');
    setNewTemplateVersion('');
    setPrereqError(null);
  };

  // ── Status advancement with e-signature ──
  const handleAdvanceStatus = (capa: Capa) => {
    const next = getNextStatus(capa.status);
    if (!next) return;
    setPendingStatusChange({ capa, nextStatus: next });
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingStatusChange) return;
    const { capa, nextStatus } = pendingStatusChange;
    store.updateCapa(capa.id, {
      status: nextStatus,
      closedDate: nextStatus === 'Closed' ? new Date().toISOString() : undefined,
    });
    if (selectedCapa?.id === capa.id) {
      setSelectedCapa({ ...capa, status: nextStatus, closedDate: nextStatus === 'Closed' ? new Date().toISOString() : undefined });
    }
    setShowSignatureModal(false);
    setPendingStatusChange(null);
  };

  const openDetail = (capa: Capa) => {
    setSelectedCapa(capa);
    setShowDetailDialog(true);
  };

  // ── Helper: get linked NCR ──
  const getLinkedNcr = (ncrId?: string) => {
    if (!ncrId) return null;
    return store.ncrs.find(n => n.id === ncrId);
  };

  // ── Render: Wizard Step Content ──
  const renderStepContent = () => {
    switch (wizardStep) {
      // ── Step 1: Change Request ──
      case 0:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="capa-title">Title *</Label>
              <Input id="capa-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Enter CAPA title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CapaType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrective">Corrective</SelectItem>
                    <SelectItem value="Preventive">Preventive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority *</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as CapaPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={formSource} onValueChange={(v) => setFormSource(v as CapaSource)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Conformance">Non-Conformance</SelectItem>
                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                    <SelectItem value="Customer Complaint">Customer Complaint</SelectItem>
                    <SelectItem value="Management Review">Management Review</SelectItem>
                    <SelectItem value="Process Monitoring">Process Monitoring</SelectItem>
                    <SelectItem value="Supplier Issue">Supplier Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Process, Equipment" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="emergency-flag"
                checked={formEmergency}
                onCheckedChange={(checked) => setFormEmergency(checked === true)}
              />
              <Label htmlFor="emergency-flag" className="flex items-center gap-2 cursor-pointer">
                <Zap className="h-4 w-4 text-amber-500" />
                Emergency Change
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capa-description">Description *</Label>
              <Textarea id="capa-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the corrective or preventive action..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regulatory-trigger">Regulatory Trigger Reference</Label>
              <Input id="regulatory-trigger" value={formRegulatoryTrigger} onChange={(e) => setFormRegulatoryTrigger(e.target.value)} placeholder="e.g., ISO 13485 §8.5.2, 21 CFR 820.100" />
            </div>
            <TemplateSelector
              moduleType="capa"
              value={newTemplateId}
              onChange={(id, version) => {
                setNewTemplateId(id);
                setNewTemplateVersion(version);
              }}
              required
            />
          </div>
        );

      // ── Step 2: Description & Justification ──
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="problem-statement">Problem Statement *</Label>
              <Textarea id="problem-statement" value={formProblemStatement} onChange={(e) => setFormProblemStatement(e.target.value)} placeholder="What is the problem? What went wrong or could go wrong?" rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="justification">Business / Compliance Justification *</Label>
              <Textarea id="justification" value={formJustification} onChange={(e) => setFormJustification(e.target.value)} placeholder="Why is this CAPA necessary? What are the business or compliance implications?" rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regulatory-trigger-detail">Regulatory Trigger Reference</Label>
              <Input id="regulatory-trigger-detail" value={formRegulatoryTrigger} onChange={(e) => setFormRegulatoryTrigger(e.target.value)} placeholder="Applicable regulatory clause or standard reference" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Root Cause Category</Label>
                <Select value={formRootCauseCategory} onValueChange={(v) => setFormRootCauseCategory(v as RootCauseCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management'] as RootCauseCategory[]).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={formSource} onValueChange={(v) => setFormSource(v as CapaSource)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Conformance">Non-Conformance</SelectItem>
                    <SelectItem value="Audit Finding">Audit Finding</SelectItem>
                    <SelectItem value="Customer Complaint">Customer Complaint</SelectItem>
                    <SelectItem value="Management Review">Management Review</SelectItem>
                    <SelectItem value="Process Monitoring">Process Monitoring</SelectItem>
                    <SelectItem value="Supplier Issue">Supplier Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // ── Step 3: Proposed Change ──
      case 2:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="proposed-change">Proposed Change *</Label>
              <Textarea id="proposed-change" value={formProposedChange} onChange={(e) => setFormProposedChange(e.target.value)} placeholder="Describe the proposed change in detail..." rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="implementation-plan">Implementation Plan *</Label>
              <Textarea id="implementation-plan" value={formImplementationPlan} onChange={(e) => setFormImplementationPlan(e.target.value)} placeholder="Step-by-step implementation plan..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="implementation-date">Target Implementation Date</Label>
                <Input id="implementation-date" type="date" value={formImplementationDate} onChange={(e) => setFormImplementationDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimated-cost">Estimated Cost / Impact</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="estimated-cost" value={formEstimatedCost} onChange={(e) => setFormEstimatedCost(e.target.value)} placeholder="e.g., $5,000" className="pl-9" />
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 4: Risk & Impact Assessment ──
      case 3:
        return (
          <div className="grid gap-4">
            {/* Risk Assessment Grid */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Risk Assessment (FMEA-style)
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Probability (1-5)</Label>
                  <Select value={String(formRiskProbability)} onValueChange={(v) => setFormRiskProbability(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{riskRatingLabels[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Impact (1-5)</Label>
                  <Select value={String(formRiskImpact)} onValueChange={(v) => setFormRiskImpact(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{riskRatingLabels[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Detection (1-5)</Label>
                  <Select value={String(formRiskDetection)} onValueChange={(v) => setFormRiskDetection(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{riskRatingLabels[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* RPN Display */}
              <div className="flex items-center gap-4 pt-1">
                <div className={cn('px-4 py-2 rounded-md border text-lg font-bold', rpnColor(computedRpn))}>
                  RPN: {computedRpn}
                </div>
                <div className="text-sm text-muted-foreground">
                  P ({formRiskProbability}) × I ({formRiskImpact}) × D ({formRiskDetection})
                </div>
              </div>
            </div>

            <Separator />

            {/* Impact Analysis */}
            <div className="grid gap-2">
              <Label htmlFor="impact-analysis">Impact Analysis *</Label>
              <Textarea id="impact-analysis" value={formImpactAnalysis} onChange={(e) => setFormImpactAnalysis(e.target.value)} placeholder="Describe the potential impact on products, processes, and systems..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="affected-areas">Affected Areas *</Label>
              <Input id="affected-areas" value={formAffectedAreas} onChange={(e) => setFormAffectedAreas(e.target.value)} placeholder="e.g., Manufacturing, QA, Supply Chain" />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="impact-validated"
                checked={formImpactOnValidatedSystems}
                onCheckedChange={(checked) => setFormImpactOnValidatedSystems(checked === true)}
              />
              <Label htmlFor="impact-validated" className="cursor-pointer">
                Impact on Validated Systems
              </Label>
            </div>
            {formImpactOnValidatedSystems && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Re-validation may be required. Ensure change control process includes validation protocol updates per 21 CFR 820 and ISO 13485 §7.5.6.
                </p>
              </div>
            )}
          </div>
        );

      // ── Step 5: Approval & Assignment ──
      case 4:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Requested By</Label>
              <Input
                value={currentUser?.fullName || currentUser?.email || 'Unknown User'}
                disabled
                className="bg-muted/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assigned To *</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Approver *</Label>
                <Select value={formApprover} onValueChange={setFormApprover}>
                  <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date *</Label>
              <Input id="due-date" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Root Cause Category</Label>
              <Select value={formRootCauseCategory} onValueChange={(v) => setFormRootCauseCategory(v as RootCauseCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management'] as RootCauseCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // ── Step 6: Linked Records & Review ──
      case 5:
        return (
          <div className="grid gap-4">
            {/* Linked Records */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Linked Document (Approved SOP)</Label>
                <Select value={formLinkedDocId} onValueChange={setFormLinkedDocId}>
                  <SelectTrigger><SelectValue placeholder="Select linked SOP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {approvedSops.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.documentNumber} - {d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Linked NCR</Label>
                <Select value={formLinkedNcrId} onValueChange={setFormLinkedNcrId}>
                  <SelectTrigger><SelectValue placeholder="Select linked NCR" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {store.ncrs.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.ncrNumber} - {n.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="additional-references">Additional References</Label>
              <Textarea id="additional-references" value={formAdditionalReferences} onChange={(e) => setFormAdditionalReferences(e.target.value)} placeholder="Any additional references, documents, or links..." rows={2} />
            </div>

            <Separator />

            {/* Full Review Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 max-h-[340px] overflow-y-auto">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Review Summary
              </h4>

              {/* Step 1 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1 — Change Request</p>
                <p className="text-sm"><span className="font-medium">Title:</span> {formTitle || '—'}</p>
                <p className="text-sm"><span className="font-medium">Type:</span> {formType}</p>
                <p className="text-sm"><span className="font-medium">Priority:</span> {formPriority}</p>
                <p className="text-sm"><span className="font-medium">Source:</span> {formSource}</p>
                {formCategory && <p className="text-sm"><span className="font-medium">Category:</span> {formCategory}</p>}
                <p className="text-sm"><span className="font-medium">Emergency:</span> {formEmergency ? 'Yes' : 'No'}</p>
                <p className="text-sm"><span className="font-medium">Description:</span> {formDescription || '—'}</p>
                {formRegulatoryTrigger && <p className="text-sm"><span className="font-medium">Regulatory Trigger:</span> {formRegulatoryTrigger}</p>}
              </div>

              {/* Step 2 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2 — Description & Justification</p>
                <p className="text-sm"><span className="font-medium">Problem Statement:</span> {formProblemStatement || '—'}</p>
                <p className="text-sm"><span className="font-medium">Justification:</span> {formJustification || '—'}</p>
                <p className="text-sm"><span className="font-medium">Root Cause Category:</span> {formRootCauseCategory}</p>
              </div>

              {/* Step 3 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 3 — Proposed Change</p>
                <p className="text-sm"><span className="font-medium">Proposed Change:</span> {formProposedChange || '—'}</p>
                <p className="text-sm"><span className="font-medium">Implementation Plan:</span> {formImplementationPlan || '—'}</p>
                {formImplementationDate && <p className="text-sm"><span className="font-medium">Target Date:</span> {formImplementationDate}</p>}
                {formEstimatedCost && <p className="text-sm"><span className="font-medium">Estimated Cost:</span> {formEstimatedCost}</p>}
              </div>

              {/* Step 4 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 4 — Risk & Impact Assessment</p>
                <div className="flex items-center gap-3">
                  <span className={cn('px-2 py-0.5 rounded border text-xs font-bold', rpnColor(computedRpn))}>RPN: {computedRpn}</span>
                  <span className="text-sm text-muted-foreground">P={formRiskProbability} I={formRiskImpact} D={formRiskDetection}</span>
                </div>
                <p className="text-sm"><span className="font-medium">Impact Analysis:</span> {formImpactAnalysis || '—'}</p>
                <p className="text-sm"><span className="font-medium">Affected Areas:</span> {formAffectedAreas || '—'}</p>
                <p className="text-sm"><span className="font-medium">Impact on Validated Systems:</span> {formImpactOnValidatedSystems ? 'Yes' : 'No'}</p>
              </div>

              {/* Step 5 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 5 — Approval & Assignment</p>
                <p className="text-sm"><span className="font-medium">Requested By:</span> {currentUser?.fullName || currentUser?.email || '—'}</p>
                <p className="text-sm"><span className="font-medium">Assigned To:</span> {formAssignedTo ? getUserName(formAssignedTo) : '—'}</p>
                <p className="text-sm"><span className="font-medium">Approver:</span> {formApprover ? getUserName(formApprover) : '—'}</p>
                <p className="text-sm"><span className="font-medium">Due Date:</span> {formDueDate || '—'}</p>
              </div>

              {/* Step 6 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 6 — Linked Records</p>
                <p className="text-sm">
                  <span className="font-medium">Linked SOP:</span>{' '}
                  {formLinkedDocId && formLinkedDocId !== 'none'
                    ? approvedSops.find(d => d.id === formLinkedDocId)?.documentNumber || formLinkedDocId
                    : 'None'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Linked NCR:</span>{' '}
                  {formLinkedNcrId && formLinkedNcrId !== 'none'
                    ? store.ncrs.find(n => n.id === formLinkedNcrId)?.ncrNumber || formLinkedNcrId
                    : 'None'}
                </p>
                {formAdditionalReferences && (
                  <p className="text-sm"><span className="font-medium">Additional References:</span> {formAdditionalReferences}</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            CAPA Management
          </h1>
          <p className="text-muted-foreground mt-1">Corrective and Preventive Actions (ISO 13485 §8.5.2 / §8.5.3)</p>
        </div>
        {hasPermission('capa.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New CAPA
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
              <span className="text-sm text-muted-foreground">Investigation</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.investigation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Implementation</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.implementation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-muted-foreground">Effectiveness</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.effectiveness}</span>
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search CAPAs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
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
            <SelectItem value="Corrective">Corrective</SelectItem>
            <SelectItem value="Preventive">Preventive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
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
                  <TableHead className="w-[140px]">CAPA #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[140px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Template</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCapas.map(capa => (
                  <TableRow key={capa.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(capa)}>
                    <TableCell className="font-mono text-xs">{capa.capaNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-xs">{capa.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(capa.type === 'Corrective' ? 'border-red-300 text-red-700' : 'border-blue-300 text-blue-700')}>
                        {capa.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {capa.priority && <Badge className={cn('text-xs', priorityColors[capa.priority])} variant="secondary">{capa.priority}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[capa.status])} variant="secondary">{capa.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getUserName(capa.assignedTo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(capa.dueDate, true)}
                    </TableCell>
                    <TableCell>
                      {capa.templateId ? (
                        <Badge variant="outline" className="text-xs border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                          {(() => {
                            const tpl = store.formTemplates.find(t => t.id === capa.templateId);
                            return tpl ? `${tpl.title} v${capa.templateVersion || tpl.version}` : capa.templateId;
                          })()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(capa); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCapas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No CAPAs found matching filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Layer 1 Gate Warning */}
      {!hasApprovedTemplate(capaModuleType) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No approved template found for CAPA records. Please create and approve a template in the Forms module first.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE CAPA DIALOG — 6-STEP WIZARD
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Create New CAPA
            </DialogTitle>
          </DialogHeader>

          {prereqError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{prereqError}</p>
            </div>
          )}

          {/* Step Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === wizardStep;
                const isCompleted = idx < wizardStep;
                const isAccessible = idx <= wizardStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isAccessible}
                    onClick={() => isAccessible && goToStep(idx)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 transition-all px-2 py-1 rounded-lg',
                      isActive ? 'text-primary' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                      isAccessible ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                      isActive ? 'border-primary bg-primary text-primary-foreground' :
                      isCompleted ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600' :
                      'border-muted-foreground/30 bg-background text-muted-foreground'
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[80px]">{step.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Progress Bar */}
            <Progress value={((wizardStep + 1) / WIZARD_STEPS.length) * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="py-2 min-h-[300px]">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={wizardStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Step {wizardStep + 1} of {WIZARD_STEPS.length}
            </span>
            {wizardStep < WIZARD_STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={!isStepValid(wizardStep)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!isStepValid(wizardStep)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Submit CAPA
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DETAIL DIALOG — ENHANCED
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[92vh] overflow-y-auto">
          {selectedCapa && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedCapa.capaNumber}</span>
                  {selectedCapa.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status & Priority Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedCapa.status])} variant="secondary">{selectedCapa.status}</Badge>
                  <Badge variant="outline" className={selectedCapa.type === 'Corrective' ? 'border-red-300 text-red-700' : 'border-blue-300 text-blue-700'}>{selectedCapa.type}</Badge>
                  {selectedCapa.priority && <Badge className={cn(priorityColors[selectedCapa.priority])} variant="secondary">{selectedCapa.priority}</Badge>}
                  {selectedCapa.source && <Badge variant="outline">{selectedCapa.source}</Badge>}
                  {selectedCapa.sourceReferenceId && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                      <Link2 className="h-3 w-3 mr-1" />
                      Linked Non-Conformance
                    </Badge>
                  )}
                  {selectedCapa.templateId && (() => {
                    const tpl = store.formTemplates.find(t => t.id === selectedCapa.templateId);
                    return (
                      <Badge variant="outline" className="border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">
                        <FileText className="h-3 w-3 mr-1" />
                        Template: {tpl ? `${tpl.title} v${selectedCapa.templateVersion || tpl.version}` : selectedCapa.templateId}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Status Flow */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {statusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedCapa.status ? 'bg-primary text-primary-foreground' :
                        statusFlow.indexOf(s) < statusFlow.indexOf(selectedCapa.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{getUserName(selectedCapa.assignedTo)}</span></div>
                  <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium ml-1">{formatDate(selectedCapa.dueDate)}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedCapa.createdDate)}</span></div>
                  {selectedCapa.closedDate && <div><span className="text-muted-foreground">Closed:</span> <span className="font-medium ml-1">{formatDate(selectedCapa.closedDate)}</span></div>}
                  {selectedCapa.templateId && (() => {
                    const tpl = store.formTemplates.find(t => t.id === selectedCapa.templateId);
                    return (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Template:</span>{' '}
                        <span className="font-medium ml-1">{tpl ? tpl.title : selectedCapa.templateId}</span>
                        {selectedCapa.templateVersion && <span className="text-muted-foreground ml-1">(v{selectedCapa.templateVersion})</span>}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Sections ── */}
                <div className="space-y-3">
                  {/* Description */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.description}</p>
                  </div>

                  {/* Problem Statement */}
                  {selectedCapa.problemStatement && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Problem Statement</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.problemStatement}</p>
                    </div>
                  )}

                  {/* Investigation Details */}
                  {selectedCapa.investigationDetails && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Investigation Details</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.investigationDetails}</p>
                    </div>
                  )}

                  {/* Root Cause Analysis */}
                  {selectedCapa.rootCauseAnalysis && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Root Cause Analysis</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.rootCauseAnalysis}</p>
                      {selectedCapa.rootCauseCategory && (
                        <Badge variant="outline" className="mt-2 text-xs">Category: {selectedCapa.rootCauseCategory}</Badge>
                      )}
                    </div>
                  )}

                  {/* 5 Whys Analysis */}
                  {selectedCapa.fiveWhys && selectedCapa.fiveWhys.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">5 Whys Analysis</h4>
                      <div className="space-y-1">
                        {selectedCapa.fiveWhys.map((why, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm bg-muted/30 p-2 rounded">
                            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">Why {i + 1}:</span>
                            <span>{why}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corrective Action */}
                  {selectedCapa.correctiveAction && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Corrective Action</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.correctiveAction}</p>
                    </div>
                  )}

                  {/* ── NEW: Proposed Change Section ── */}
                  {Boolean((selectedCapa as unknown as Record<string, unknown>).proposedChange) && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-primary" />
                        Proposed Change
                      </h4>
                      <p className="text-sm text-muted-foreground bg-purple-50 dark:bg-purple-900/10 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                        {String((selectedCapa as unknown as Record<string, unknown>).proposedChange)}
                      </p>
                    </div>
                  )}

                  {/* ── NEW: Risk & Impact Assessment Section (color-coded) ── */}
                  {Boolean((selectedCapa as unknown as Record<string, unknown>).riskAssessment) && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Risk & Impact Assessment
                      </h4>
                      <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-md border border-amber-200 dark:border-amber-800 space-y-2">
                        <p className="text-sm text-muted-foreground">{String((selectedCapa as unknown as Record<string, unknown>).riskAssessment ?? '')}</p>
                        {Boolean((selectedCapa as unknown as Record<string, unknown>).impactAnalysis) && (
                          <p className="text-sm"><span className="font-medium">Impact Analysis:</span> <span className="text-muted-foreground">{String((selectedCapa as unknown as Record<string, unknown>).impactAnalysis)}</span></p>
                        )}
                        {Boolean((selectedCapa as unknown as Record<string, unknown>).affectedAreas) && (
                          <p className="text-sm"><span className="font-medium">Affected Areas:</span> <span className="text-muted-foreground">{String((selectedCapa as unknown as Record<string, unknown>).affectedAreas)}</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Effectiveness Verification */}
                  {selectedCapa.effectivenessVerificationMethod && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Effectiveness Verification</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.effectivenessVerificationMethod}</p>
                      {selectedCapa.effectivenessCriteria && (
                        <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Criteria:</span> {selectedCapa.effectivenessCriteria}</p>
                      )}
                      {selectedCapa.effectivenessResult && (
                        <Badge variant="outline" className="mt-2 text-xs">Result: {selectedCapa.effectivenessResult}</Badge>
                      )}
                    </div>
                  )}

                  {/* ── NEW: Linked NCR Reference (clickable) ── */}
                  {selectedCapa.linkedNcrId && (() => {
                    const linkedNcr = getLinkedNcr(selectedCapa.linkedNcrId);
                    return (
                      <div>
                        <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-primary" />
                          Linked NCR
                        </h4>
                        {linkedNcr ? (
                          <div className="text-sm text-primary bg-primary/5 p-3 rounded-md border border-primary/20">
                            {linkedNcr.ncrNumber} — {linkedNcr.title}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCapa.linkedNcrId}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Linked Document */}
                  {selectedCapa.linkedDocumentId && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Linked Document
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                        {(() => {
                          const doc = documents.find(d => d.id === selectedCapa.linkedDocumentId);
                          return doc ? `${doc.documentNumber} — ${doc.title}` : selectedCapa.linkedDocumentId;
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button — requires electronic signature */}
                {hasPermission('capa.update') && selectedCapa.status !== 'Closed' && (
                  <Button className="w-full" onClick={() => handleAdvanceStatus(selectedCapa)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Advance to {getNextStatus(selectedCapa.status)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Electronic Signature Modal ── */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={() => { setShowSignatureModal(false); setPendingStatusChange(null); }}
        onSign={handleSignatureComplete}
        recordTitle={pendingStatusChange?.capa.title || ''}
        recordId={pendingStatusChange?.capa.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
