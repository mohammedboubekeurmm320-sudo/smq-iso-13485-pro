'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow';
import type {
  ChangeControl, ChangeControlStatus, ChangeControlType,
  ChangeControlPriority, ChangeControlCategory, SignatureType,
  FormTemplateModule,
} from '@/types/qms';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import {
  ArrowLeftRight, Plus, Search, Eye, ArrowRight, CheckCircle2,
  AlertTriangle, Clock, XCircle, ShieldCheck, FileText, Link2,
  ClipboardList, AlertOctagon, BarChart3, Wrench, User,
  ChevronLeft, ChevronRight, Zap, ShieldAlert, DollarSign,
  MapPin, MonitorCheck, BookOpen, Flag,
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<ChangeControlStatus, string> = {
  'Requested': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'In Implementation': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityColors: Record<ChangeControlPriority, string> = {
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Low': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const statusFlow: ChangeControlStatus[] = [
  'Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed',
];

function getNextStatus(current: ChangeControlStatus): ChangeControlStatus | null {
  if (current === 'Rejected') return null;
  const idx = statusFlow.indexOf(current);
  return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
}

const allCategories: ChangeControlCategory[] = [
  'Process', 'Equipment', 'Facility', 'Document', 'Material',
  'Computer System', 'Organizational', 'Manufacturing', 'Regulatory',
  'Supply Chain', 'Warehouse', 'Other',
];

// ---------------------------------------------------------------------------
// Wizard step definitions
// ---------------------------------------------------------------------------

const WIZARD_STEPS = [
  { id: 1, label: 'Change Request', icon: ClipboardList },
  { id: 2, label: 'Description & Justification', icon: FileText },
  { id: 3, label: 'Proposed Change', icon: ArrowLeftRight },
  { id: 4, label: 'Risk & Impact', icon: AlertTriangle },
  { id: 5, label: 'Approval & Assignment', icon: User },
  { id: 6, label: 'Linked Records & Review', icon: Link2 },
] as const;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChangeControlView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const { getApprovedTemplates, hasApprovedTemplate, moduleTypeLabels } = useRecordWorkflow();
  const changeControls = store.changeControls;
  const profiles = store.profiles;
  const documents = store.documents;
  const capas = store.capas;
  const formTemplates = store.formTemplates;

  const MODULE_TYPE: FormTemplateModule = 'CHANGE_CONTROL';
  const approvedTemplates = getApprovedTemplates(MODULE_TYPE);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCC, setSelectedCC] = useState<ChangeControl | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingStatusAdvance, setPendingStatusAdvance] = useState<ChangeControl | null>(null);
  const [prereqError, setPrereqError] = useState<string | null>(null);

  // Reject e-signature
  const [showRejectSignature, setShowRejectSignature] = useState(false);
  const [pendingRejectCC, setPendingRejectCC] = useState<ChangeControl | null>(null);

  // Wizard step
  const [wizardStep, setWizardStep] = useState(1);

  // Create form state — Step 1
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ChangeControlType>('Planned');
  const [formPriority, setFormPriority] = useState<ChangeControlPriority>('Medium');
  const [formCategory, setFormCategory] = useState<ChangeControlCategory>('Process');
  const [formEmergencyFlag, setFormEmergencyFlag] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formRegulatoryTrigger, setFormRegulatoryTrigger] = useState('');

  // Step 2
  const [formDetailedChangeDescription, setFormDetailedChangeDescription] = useState('');
  const [formBusinessComplianceJustification, setFormBusinessComplianceJustification] = useState('');

  // Step 3
  const [formProposedChange, setFormProposedChange] = useState('');
  const [formImplementationPlan, setFormImplementationPlan] = useState('');
  const [formImplementationDate, setFormImplementationDate] = useState('');
  const [formEstimatedCostImpact, setFormEstimatedCostImpact] = useState('');

  // Step 4
  const [formRiskAssessment, setFormRiskAssessment] = useState('');
  const [formImpactAnalysis, setFormImpactAnalysis] = useState('');
  const [formAffectedAreas, setFormAffectedAreas] = useState('');
  const [formImpactOnValidatedSystems, setFormImpactOnValidatedSystems] = useState(false);

  // Step 5
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formApprover, setFormApprover] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // Step 6
  const [formLinkedDocId, setFormLinkedDocId] = useState('');
  const [formLinkedCapaId, setFormLinkedCapaId] = useState('');
  const [formAdditionalReferences, setFormAdditionalReferences] = useState('');

  // Template selection
  const [formTemplateId, setFormTemplateId] = useState('');

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredCCs = changeControls.filter(cc => {
    const matchesSearch = searchTerm === '' ||
      cc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.ccNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cc.status === statusFilter;
    const matchesType = typeFilter === 'all' || cc.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || cc.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || cc.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesCategory;
  });

  const summaryCounts = {
    requested: changeControls.filter(c => c.status === 'Requested').length,
    underReview: changeControls.filter(c => c.status === 'Under Review').length,
    approved: changeControls.filter(c => c.status === 'Approved').length,
    inImplementation: changeControls.filter(c => c.status === 'In Implementation').length,
    completed: changeControls.filter(c => c.status === 'Completed').length,
    rejected: changeControls.filter(c => c.status === 'Rejected').length,
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

  const approvedDocuments = documents.filter(d => d.status === 'Approved');

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const resetForm = () => {
    setWizardStep(1);
    setFormTitle('');
    setFormType('Planned');
    setFormPriority('Medium');
    setFormCategory('Process');
    setFormEmergencyFlag(false);
    setFormDescription('');
    setFormJustification('');
    setFormRegulatoryTrigger('');
    setFormDetailedChangeDescription('');
    setFormBusinessComplianceJustification('');
    setFormProposedChange('');
    setFormImplementationPlan('');
    setFormImplementationDate('');
    setFormEstimatedCostImpact('');
    setFormRiskAssessment('');
    setFormImpactAnalysis('');
    setFormAffectedAreas('');
    setFormImpactOnValidatedSystems(false);
    setFormAssignedTo('');
    setFormApprover('');
    setFormDueDate('');
    setFormLinkedDocId('');
    setFormLinkedCapaId('');
    setFormAdditionalReferences('');
    setFormTemplateId('');
    setPrereqError(null);
  };

  const isStep1Valid = !!formTitle && !!formDescription && !!formJustification;
  const isStep2Valid = !!formDetailedChangeDescription && !!formBusinessComplianceJustification;
  const isStep3Valid = !!formProposedChange;
  const isStep5Valid = !!formAssignedTo && !!formDueDate;

  const canAdvance = () => {
    switch (wizardStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return true;
      case 5: return isStep5Valid;
      default: return true;
    }
  };

  const handleNext = () => {
    if (wizardStep < 6 && canAdvance()) setWizardStep(wizardStep + 1);
  };

  const handlePrev = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const handleCreate = () => {
    const prereqResult = store.checkPrerequisites('CHANGE_CONTROL', 'org-001');
    if (!prereqResult.met) {
      setPrereqError(`Prerequisite not met: ${prereqResult.missing.map(p => p.description).join(', ')}`);
      return;
    }
    setPrereqError(null);

    // Resolve template reference
    const selectedTemplate = formTemplateId ? approvedTemplates.find(t => t.id === formTemplateId) : undefined;

    const newCC: ChangeControl = {
      id: `cc-${Date.now()}`,
      ccNumber: `CC-2024-${String(changeControls.length + 1).padStart(3, '0')}`,
      title: formTitle,
      type: formType,
      status: 'Requested',
      templateId: selectedTemplate?.id,
      templateVersion: selectedTemplate?.version,
      priority: formPriority,
      category: formCategory,
      description: formDescription,
      justification: formJustification,
      proposedChange: formProposedChange,
      detailedChangeDescription: formDetailedChangeDescription || undefined,
      businessComplianceJustification: formBusinessComplianceJustification || undefined,
      riskAssessment: formRiskAssessment || undefined,
      impactAnalysis: formImpactAnalysis || undefined,
      affectedAreas: formAffectedAreas || undefined,
      impactOnValidatedSystems: formImpactOnValidatedSystems || undefined,
      implementationPlan: formImplementationPlan || undefined,
      implementationDate: formImplementationDate ? new Date(formImplementationDate).toISOString() : undefined,
      estimatedCostImpact: formEstimatedCostImpact || undefined,
      regulatoryTrigger: formRegulatoryTrigger || undefined,
      emergencyFlag: formEmergencyFlag || undefined,
      linkedDocumentId: formLinkedDocId && formLinkedDocId !== 'none' ? formLinkedDocId : undefined,
      linkedCapaId: formLinkedCapaId && formLinkedCapaId !== 'none' ? formLinkedCapaId : undefined,
      additionalReferences: formAdditionalReferences || undefined,
      assignedTo: formAssignedTo,
      requestedBy: currentUser?.id || '',
      approver: formApprover || undefined,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : new Date().toISOString(),
      createdById: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addChangeControl(newCC);
    resetForm();
    setShowCreateDialog(false);
  };

  // ---------------------------------------------------------------------------
  // Detail / status flow
  // ---------------------------------------------------------------------------

  const openDetail = (cc: ChangeControl) => {
    setSelectedCC(cc);
    setShowDetailDialog(true);
  };

  const handleAdvanceStatus = (cc: ChangeControl) => {
    const next = getNextStatus(cc.status);
    if (!next) return;

    if (next === 'Approved') {
      setPendingStatusAdvance(cc);
      setShowSignatureModal(true);
      return;
    }

    const updates: Partial<ChangeControl> = { status: next };
    if (next === 'In Implementation') {
      updates.implementationDate = new Date().toISOString();
    }
    if (next === 'Completed') {
      updates.completionDate = new Date().toISOString();
    }
    store.updateChangeControl(cc.id, updates);
    if (selectedCC?.id === cc.id) {
      setSelectedCC({ ...cc, ...updates });
    }
  };

  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    void signatureData;
    if (!pendingStatusAdvance) return;
    const cc = pendingStatusAdvance;
    store.updateChangeControl(cc.id, {
      status: 'Approved',
      approvedBy: currentUser?.id,
    });
    if (selectedCC?.id === cc.id) {
      setSelectedCC({ ...cc, status: 'Approved', approvedBy: currentUser?.id });
    }
    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  // Reject with e-signature
  const handleRejectRequest = (cc: ChangeControl) => {
    setPendingRejectCC(cc);
    setShowRejectSignature(true);
  };

  const handleRejectSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    void signatureData;
    if (!pendingRejectCC) return;
    const cc = pendingRejectCC;
    store.updateChangeControl(cc.id, { status: 'Rejected' });
    if (selectedCC?.id === cc.id) {
      setSelectedCC({ ...cc, status: 'Rejected' });
    }
    setPendingRejectCC(null);
    setShowRejectSignature(false);
  };

  const handleRejectSignatureCancel = () => {
    setPendingRejectCC(null);
    setShowRejectSignature(false);
  };

  // ---------------------------------------------------------------------------
  // Risk color helper
  // ---------------------------------------------------------------------------

  const getRiskColor = (text: string | undefined) => {
    if (!text) return '';
    const lower = text.toLowerCase();
    if (lower.includes('critical') || lower.includes('high risk')) return 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800';
    if (lower.includes('medium') || lower.includes('moderate')) return 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800';
    return 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-800';
  };

  // ---------------------------------------------------------------------------
  // Render wizard step
  // ---------------------------------------------------------------------------

  const renderWizardStep = () => {
    switch (wizardStep) {
      // -----------------------------------------------------------------------
      // Step 1 — Change Request
      // -----------------------------------------------------------------------
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cc-title">Title *</Label>
              <Input id="cc-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Change Control title" />
            </div>

            {/* Template Selection (Layer 2 — Template Reference) */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Template
              </Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select an approved template (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {approvedTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {approvedTemplates.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  No approved templates available. Create one in the Forms module first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => { setFormType(v as ChangeControlType); if (v !== 'Emergency') setFormEmergencyFlag(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Unplanned">Unplanned</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority *</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as ChangeControlPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ChangeControlCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formType === 'Emergency' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <Checkbox
                  id="emergency-flag"
                  checked={formEmergencyFlag}
                  onCheckedChange={(checked) => setFormEmergencyFlag(checked === true)}
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor="emergency-flag" className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
                    <Zap className="h-3.5 w-3.5" />
                    Emergency Change
                  </Label>
                  <p className="text-xs text-muted-foreground">Flag this as an emergency change requiring expedited review (ISO 13485 §7.1)</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="cc-desc">Description *</Label>
              <Textarea id="cc-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Briefly describe the change..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-just">Justification *</Label>
              <Textarea id="cc-just" value={formJustification} onChange={(e) => setFormJustification(e.target.value)} placeholder="Why is this change needed?" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-reg-trigger">Regulatory Trigger</Label>
              <Input id="cc-reg-trigger" value={formRegulatoryTrigger} onChange={(e) => setFormRegulatoryTrigger(e.target.value)} placeholder="e.g. FDA 21 CFR 820, ISO 13485 §7.1" />
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // Step 2 — Description & Justification
      // -----------------------------------------------------------------------
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cc-detailed-desc">Detailed Change Description *</Label>
              <Textarea id="cc-detailed-desc" value={formDetailedChangeDescription} onChange={(e) => setFormDetailedChangeDescription(e.target.value)} placeholder="Provide a comprehensive description of the proposed change, including current state and desired future state..." rows={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-biz-just">Business / Compliance Justification *</Label>
              <Textarea id="cc-biz-just" value={formBusinessComplianceJustification} onChange={(e) => setFormBusinessComplianceJustification(e.target.value)} placeholder="Explain the business and compliance reasons for this change. Reference applicable regulatory requirements..." rows={5} />
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // Step 3 — Proposed Change
      // -----------------------------------------------------------------------
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cc-proposed">Detailed Proposed Change *</Label>
              <Textarea id="cc-proposed" value={formProposedChange} onChange={(e) => setFormProposedChange(e.target.value)} placeholder="Describe the proposed change in detail — what will be modified, added, or removed..." rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-impl-plan">Implementation Plan</Label>
              <Textarea id="cc-impl-plan" value={formImplementationPlan} onChange={(e) => setFormImplementationPlan(e.target.value)} placeholder="Outline the steps for implementing this change, including timelines and responsibilities..." rows={4} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cc-impl-date">Implementation Date</Label>
                <Input id="cc-impl-date" type="date" value={formImplementationDate} onChange={(e) => setFormImplementationDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cc-cost">Estimated Cost / Impact</Label>
                <Input id="cc-cost" value={formEstimatedCostImpact} onChange={(e) => setFormEstimatedCostImpact(e.target.value)} placeholder="e.g. $50,000, 2-week downtime" />
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // Step 4 — Risk & Impact Assessment
      // -----------------------------------------------------------------------
      case 4:
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cc-risk" className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Risk Assessment
              </Label>
              <Textarea id="cc-risk" value={formRiskAssessment} onChange={(e) => setFormRiskAssessment(e.target.value)} placeholder="Assess the risk level of this change. Include potential hazards, likelihood, and severity..." rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-impact" className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Impact Analysis
              </Label>
              <Textarea id="cc-impact" value={formImpactAnalysis} onChange={(e) => setFormImpactAnalysis(e.target.value)} placeholder="Analyze the impact on products, processes, systems, and stakeholders..." rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-areas" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Affected Areas
              </Label>
              <Input id="cc-areas" value={formAffectedAreas} onChange={(e) => setFormAffectedAreas(e.target.value)} placeholder="e.g. Production, QA, Warehouse, IT" />
            </div>
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
              <Checkbox
                id="cc-validated-impact"
                checked={formImpactOnValidatedSystems}
                onCheckedChange={(checked) => setFormImpactOnValidatedSystems(checked === true)}
              />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor="cc-validated-impact" className="flex items-center gap-1.5 font-medium">
                  <MonitorCheck className="h-3.5 w-3.5" />
                  Impact on Validated Systems
                </Label>
                <p className="text-xs text-muted-foreground">Check if this change impacts any validated computer systems or equipment (GAMP 5 / 21 CFR Part 11)</p>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // Step 5 — Approval & Assignment
      // -----------------------------------------------------------------------
      case 5:
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Requested By</Label>
              <Input value={currentUser?.fullName || currentUser?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cc-assigned">Assigned To *</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger id="cc-assigned"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cc-approver">Approver</Label>
                <Select value={formApprover} onValueChange={setFormApprover}>
                  <SelectTrigger id="cc-approver"><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-due">Due Date *</Label>
              <Input id="cc-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // Step 6 — Linked Records & Review
      // -----------------------------------------------------------------------
      case 6:
        return (
          <div className="space-y-5">
            {/* Linked Records */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Linked Document
                </Label>
                <Select value={formLinkedDocId} onValueChange={setFormLinkedDocId}>
                  <SelectTrigger><SelectValue placeholder="Select document" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {approvedDocuments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.documentNumber} - {d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Linked CAPA
                </Label>
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cc-addl-refs">Additional References</Label>
              <Textarea id="cc-addl-refs" value={formAdditionalReferences} onChange={(e) => setFormAdditionalReferences(e.target.value)} placeholder="Any additional references, document numbers, or URLs..." rows={2} />
            </div>

            <Separator />

            {/* Full Summary Review */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Review Summary
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm max-h-72 overflow-y-auto">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{formTitle || '—'}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{formType}</span></div>
                  <div><span className="text-muted-foreground">Priority:</span> <Badge className={cn('text-xs', priorityColors[formPriority])} variant="secondary">{formPriority}</Badge></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{formCategory}</span></div>
                  {formEmergencyFlag && (
                    <div className="col-span-2"><Badge variant="destructive" className="text-xs"><Zap className="h-3 w-3 mr-1" />Emergency</Badge></div>
                  )}
                </div>
                <Separator className="my-2" />
                <div><span className="text-muted-foreground">Description:</span> <span>{formDescription || '—'}</span></div>
                <div><span className="text-muted-foreground">Justification:</span> <span>{formJustification || '—'}</span></div>
                {formRegulatoryTrigger && <div><span className="text-muted-foreground">Regulatory Trigger:</span> <span>{formRegulatoryTrigger}</span></div>}
                <Separator className="my-2" />
                <div><span className="text-muted-foreground">Detailed Change Description:</span> <span>{formDetailedChangeDescription || '—'}</span></div>
                <div><span className="text-muted-foreground">Business/Compliance Justification:</span> <span>{formBusinessComplianceJustification || '—'}</span></div>
                <Separator className="my-2" />
                <div><span className="text-muted-foreground">Proposed Change:</span> <span>{formProposedChange || '—'}</span></div>
                {formImplementationPlan && <div><span className="text-muted-foreground">Implementation Plan:</span> <span>{formImplementationPlan}</span></div>}
                {formImplementationDate && <div><span className="text-muted-foreground">Implementation Date:</span> <span>{formImplementationDate}</span></div>}
                {formEstimatedCostImpact && <div><span className="text-muted-foreground">Estimated Cost/Impact:</span> <span>{formEstimatedCostImpact}</span></div>}
                <Separator className="my-2" />
                {formRiskAssessment && <div><span className="text-muted-foreground">Risk Assessment:</span> <span>{formRiskAssessment}</span></div>}
                {formImpactAnalysis && <div><span className="text-muted-foreground">Impact Analysis:</span> <span>{formImpactAnalysis}</span></div>}
                {formAffectedAreas && <div><span className="text-muted-foreground">Affected Areas:</span> <span>{formAffectedAreas}</span></div>}
                {formImpactOnValidatedSystems && <div><Badge variant="outline" className="text-xs"><MonitorCheck className="h-3 w-3 mr-1" />Impacts Validated Systems</Badge></div>}
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Requested By:</span> <span className="font-medium">{currentUser?.fullName || currentUser?.email || '—'}</span></div>
                  <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium">{formAssignedTo ? getUserName(formAssignedTo) : '—'}</span></div>
                  <div><span className="text-muted-foreground">Approver:</span> <span className="font-medium">{formApprover && formApprover !== 'none' ? getUserName(formApprover) : '—'}</span></div>
                  <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{formDueDate || '—'}</span></div>
                </div>
                <Separator className="my-2" />
                {formLinkedDocId && formLinkedDocId !== 'none' && (() => {
                  const doc = approvedDocuments.find(d => d.id === formLinkedDocId);
                  return doc ? <div><span className="text-muted-foreground">Linked Document:</span> <span className="font-mono text-xs">{doc.documentNumber}</span> — {doc.title}</div> : null;
                })()}
                {formLinkedCapaId && formLinkedCapaId !== 'none' && (() => {
                  const capa = capas.find(c => c.id === formLinkedCapaId);
                  return capa ? <div><span className="text-muted-foreground">Linked CAPA:</span> <span className="font-mono text-xs">{capa.capaNumber}</span> — {capa.title}</div> : null;
                })()}
                {formAdditionalReferences && <div><span className="text-muted-foreground">Additional References:</span> <span>{formAdditionalReferences}</span></div>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Render Detail Dialog
  // ---------------------------------------------------------------------------

  const renderDetailDialog = () => {
    if (!selectedCC) return null;

    return (
      <div className="space-y-4">
        {/* Status & Priority Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={cn(statusColors[selectedCC.status])} variant="secondary">{selectedCC.status}</Badge>
          <Badge variant="outline" className={cn(
            selectedCC.type === 'Emergency' ? 'border-red-300 text-red-700' :
            selectedCC.type === 'Unplanned' ? 'border-amber-300 text-amber-700' :
            'border-green-300 text-green-700'
          )}>{selectedCC.type}</Badge>
          <Badge className={cn(priorityColors[selectedCC.priority])} variant="secondary">{selectedCC.priority}</Badge>
          <Badge variant="outline">{selectedCC.category}</Badge>
          {selectedCC.emergencyFlag && (
            <Badge variant="destructive" className="text-xs"><Zap className="h-3 w-3 mr-1" />Emergency</Badge>
          )}
        </div>

        {/* Status Flow Visualization */}
        <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
          {statusFlow.map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                s === selectedCC.status ? 'bg-primary text-primary-foreground' :
                statusFlow.indexOf(s) < statusFlow.indexOf(selectedCC.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-muted text-muted-foreground'
              )}>
                {s}
              </div>
              {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            </React.Fragment>
          ))}
          {/* Rejected branch */}
          {selectedCC.status === 'Rejected' && (
            <>
              <ArrowRight className="h-3 w-3 text-red-400 flex-shrink-0" />
              <div className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Rejected
              </div>
            </>
          )}
          {/* Show rejection branch indicator from Under Review */}
          {selectedCC.status === 'Under Review' && (
            <>
              <span className="text-muted-foreground text-xs mx-1">or</span>
              <div className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-red-50 text-red-400 border border-dashed border-red-300 dark:bg-red-900/10 dark:text-red-400">
                Rejected
              </div>
            </>
          )}
        </div>

        {/* Template Reference (Layer 2) */}
        {selectedCC.templateId && (() => {
          const tmpl = formTemplates.find(t => t.id === selectedCC.templateId);
          return tmpl ? (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="text-sm">
                <span className="text-muted-foreground">Template: </span>
                <span className="font-medium">{tmpl.title}</span>
                <span className="text-muted-foreground ml-2">(v{selectedCC.templateVersion || tmpl.version})</span>
              </div>
            </div>
          ) : null;
        })()}

        {/* Full Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Assigned To:</span>{' '}
            <span className="font-medium">{getUserName(selectedCC.assignedTo)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Requested By:</span>{' '}
            <span className="font-medium">{getUserName(selectedCC.requestedBy)}</span>
          </div>
          {selectedCC.approver && (
            <div>
              <span className="text-muted-foreground">Approver:</span>{' '}
              <span className="font-medium">{getUserName(selectedCC.approver)}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Due Date:</span>{' '}
            <span className="font-medium">{formatDate(selectedCC.dueDate)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            <span className="font-medium">{formatDate(selectedCC.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Updated:</span>{' '}
            <span className="font-medium">{formatDate(selectedCC.updatedAt)}</span>
          </div>
          {selectedCC.approvedBy && (
            <div>
              <span className="text-muted-foreground">Approved By:</span>{' '}
              <span className="font-medium flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                {getUserName(selectedCC.approvedBy)}
              </span>
            </div>
          )}
          {selectedCC.implementationDate && (
            <div>
              <span className="text-muted-foreground">Implementation Date:</span>{' '}
              <span className="font-medium">{formatDate(selectedCC.implementationDate)}</span>
            </div>
          )}
          {selectedCC.completionDate && (
            <div>
              <span className="text-muted-foreground">Completion Date:</span>{' '}
              <span className="font-medium">{formatDate(selectedCC.completionDate)}</span>
            </div>
          )}
          {selectedCC.estimatedCostImpact && (
            <div>
              <span className="text-muted-foreground">Estimated Cost/Impact:</span>{' '}
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                {selectedCC.estimatedCostImpact}
              </span>
            </div>
          )}
          {selectedCC.regulatoryTrigger && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Regulatory Trigger:</span>{' '}
              <span className="font-medium">{selectedCC.regulatoryTrigger}</span>
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
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCC.description}</p>
        </div>

        {/* Justification */}
        <div>
          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
            <AlertOctagon className="h-4 w-4 text-muted-foreground" />
            Justification
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCC.justification}</p>
        </div>

        {/* Detailed Change Description */}
        {selectedCC.detailedChangeDescription && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
              <FileText className="h-4 w-4 text-blue-500" />
              Detailed Change Description
            </h4>
            <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-200 dark:border-blue-800">{selectedCC.detailedChangeDescription}</p>
          </div>
        )}

        {/* Business/Compliance Justification */}
        {selectedCC.businessComplianceJustification && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-purple-500" />
              Business / Compliance Justification
            </h4>
            <p className="text-sm text-muted-foreground bg-purple-50 dark:bg-purple-900/10 p-3 rounded-md border border-purple-200 dark:border-purple-800">{selectedCC.businessComplianceJustification}</p>
          </div>
        )}

        <Separator />

        {/* Proposed Change */}
        <div>
          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Proposed Change
          </h4>
          <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 p-3 rounded-md">{selectedCC.proposedChange}</p>
        </div>

        {/* Implementation Plan */}
        {selectedCC.implementationPlan && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
              <Wrench className="h-4 w-4 text-cyan-500" />
              Implementation Plan
            </h4>
            <p className="text-sm text-muted-foreground bg-cyan-50 dark:bg-cyan-900/10 p-3 rounded-md border border-cyan-200 dark:border-cyan-800">{selectedCC.implementationPlan}</p>
          </div>
        )}

        <Separator />

        {/* Risk & Impact Assessment — Color Coded */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Risk & Impact Assessment
          </h4>
          {selectedCC.riskAssessment ? (
            <div className={cn('p-3 rounded-md border text-sm', getRiskColor(selectedCC.riskAssessment))}>
              <p className="font-medium text-xs mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Risk Assessment</p>
              <p className="text-muted-foreground">{selectedCC.riskAssessment}</p>
            </div>
          ) : (
            <div className="p-3 rounded-md border border-dashed text-sm text-muted-foreground">No risk assessment provided</div>
          )}
          {selectedCC.impactAnalysis ? (
            <div className={cn('p-3 rounded-md border text-sm', getRiskColor(selectedCC.impactAnalysis))}>
              <p className="font-medium text-xs mb-1 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />Impact Analysis</p>
              <p className="text-muted-foreground">{selectedCC.impactAnalysis}</p>
            </div>
          ) : null}
          {selectedCC.affectedAreas && (
            <div className="bg-muted/30 p-3 rounded-md text-sm">
              <p className="font-medium text-xs mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Affected Areas</p>
              <p className="text-muted-foreground">{selectedCC.affectedAreas}</p>
            </div>
          )}
          {selectedCC.impactOnValidatedSystems && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md">
              <MonitorCheck className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Impacts Validated Systems — Additional validation may be required (GAMP 5 / 21 CFR Part 11)</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Linked Document */}
        {(() => {
          const linkedDoc = getLinkedDocument(selectedCC.linkedDocumentId);
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
                <Badge className={cn('text-xs ml-auto', statusColors[linkedDoc.status as ChangeControlStatus] || 'bg-gray-100 text-gray-700')} variant="secondary">
                  {linkedDoc.status}
                </Badge>
              </div>
            </div>
          ) : null;
        })()}

        {/* Linked CAPA */}
        {(() => {
          const linkedCapa = getLinkedCapa(selectedCC.linkedCapaId);
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

        {/* Additional References */}
        {selectedCC.additionalReferences && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Additional References
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedCC.additionalReferences}</p>
          </div>
        )}

        {/* Action Buttons */}
        {hasPermission('changecontrol.update') && selectedCC.status !== 'Completed' && selectedCC.status !== 'Rejected' && (
          <div className="flex gap-3">
            {getNextStatus(selectedCC.status) && (
              <Button className="flex-1" onClick={() => handleAdvanceStatus(selectedCC)}>
                {getNextStatus(selectedCC.status) === 'Approved' ? (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Approve with Electronic Signature
                  </>
                ) : (
                  <>
                    Advance to {getNextStatus(selectedCC.status)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
            {selectedCC.status === 'Under Review' && (
              <Button variant="destructive" onClick={() => handleRejectRequest(selectedCC)}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Change Control
          </h1>
          <p className="text-muted-foreground mt-1">Change management and approval workflow (ISO 13485 §7.1)</p>
        </div>
        {hasPermission('changecontrol.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Change Control
          </Button>
        )}
      </div>

      {/* Layer 1 Gate Warning */}
      {!hasApprovedTemplate(MODULE_TYPE) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No approved template found for {moduleTypeLabels[MODULE_TYPE]} records. Please create and approve a template in the Forms module first.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Requested</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.requested}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Under Review</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.underReview}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.approved}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-muted-foreground">In Implementation</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.inImplementation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.completed}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.rejected}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Change Controls..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected'] as ChangeControlStatus[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(['Planned', 'Unplanned', 'Emergency'] as ChangeControlType[]).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {(['Critical', 'High', 'Medium', 'Low'] as ChangeControlPriority[]).map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
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
                  <TableHead className="w-[130px]">CC #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[140px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Template</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCCs.map(cc => (
                  <TableRow key={cc.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(cc)}>
                    <TableCell className="font-mono text-xs">{cc.ccNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate max-w-xs">{cc.title}</p>
                        {cc.emergencyFlag && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        cc.type === 'Emergency' ? 'border-red-300 text-red-700' :
                        cc.type === 'Unplanned' ? 'border-amber-300 text-amber-700' :
                        'border-green-300 text-green-700'
                      )}>
                        {cc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', priorityColors[cc.priority])} variant="secondary">{cc.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{cc.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[cc.status])} variant="secondary">{cc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getUserName(cc.assignedTo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cc.dueDate, true)}
                    </TableCell>
                    <TableCell>
                      {cc.templateId ? (() => {
                        const tmpl = formTemplates.find(t => t.id === cc.templateId);
                        return tmpl ? (
                          <Badge variant="outline" className="text-[10px] font-normal gap-1">
                            <FileText className="h-2.5 w-2.5" />
                            {tmpl.title}
                          </Badge>
                        ) : null;
                      })() : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(cc); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCCs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No Change Controls found matching filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Create Change Control — 6-Step Wizard Dialog                       */}
      {/* ================================================================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Create New Change Control
            </DialogTitle>
          </DialogHeader>

          {/* Wizard Step Indicator */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {WIZARD_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = wizardStep === step.id;
              const isCompleted = wizardStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => { if (isCompleted) setWizardStep(step.id); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50' :
                      'bg-muted text-muted-foreground'
                    )}
                    disabled={!isCompleted && !isActive}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    {step.label}
                    {isCompleted && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                  </button>
                  {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Prerequisite Error */}
          {prereqError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{prereqError}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="py-2">
            {renderWizardStep()}
          </div>

          {/* Wizard Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={wizardStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="text-xs text-muted-foreground">
              Step {wizardStep} of {WIZARD_STEPS.length}
            </div>

            <div className="flex gap-2">
              {wizardStep < 6 ? (
                <Button onClick={handleNext} disabled={!canAdvance()}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={!isStep1Valid || !isStep5Valid}>
                  <Flag className="h-4 w-4 mr-2" />
                  Submit Change Control
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Detail Dialog — Enhanced                                           */}
      {/* ================================================================== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCC && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedCC.ccNumber}</span>
                  {selectedCC.title}
                </DialogTitle>
              </DialogHeader>
              {renderDetailDialog()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Electronic Signature Modal — Approval                              */}
      {/* ================================================================== */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingStatusAdvance ? `${pendingStatusAdvance.ccNumber} — ${pendingStatusAdvance.title}` : ''}
        recordId={pendingStatusAdvance?.id || ''}
        signatureType="approval"
      />

      {/* ================================================================== */}
      {/* Electronic Signature Modal — Rejection                             */}
      {/* ================================================================== */}
      <ElectronicSignatureModal
        open={showRejectSignature}
        onClose={handleRejectSignatureCancel}
        onSign={handleRejectSignatureConfirm}
        recordTitle={pendingRejectCC ? `${pendingRejectCC.ccNumber} — ${pendingRejectCC.title}` : ''}
        recordId={pendingRejectCC?.id || ''}
        signatureType="rejection"
      />
    </div>
  );
}
