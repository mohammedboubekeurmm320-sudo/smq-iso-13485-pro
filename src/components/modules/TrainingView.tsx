'use client';

import React, { useState, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { TemplateSelector } from '@/components/shared/TemplateSelector';
import { cn, formatDate } from '@/lib/utils';
import type { Training, TrainingType, TrainingStatus, SignatureType } from '@/types/qms';
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow';
import {
  GraduationCap, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Eye, ArrowRight, FileText, BookOpen, Play, AlertCircle,
  ChevronLeft, ChevronRight, ClipboardCheck, Award, Shield,
  Calendar, User, Target, Monitor, Timer, FileCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
// Extended Metadata Types (stored locally alongside Training records)
// ---------------------------------------------------------------------------

interface TrainingExtendedMeta {
  regulatoryReference?: string;
  materialsDescription?: string;
  duration?: string;
  deliveryMethod?: 'Classroom' | 'Online' | 'On-the-Job Training' | 'Webinar' | 'Blended' | '';
  trainer?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | '';
  assessmentRequired?: boolean;
  assessmentMethod?: 'Written Exam' | 'Practical Demonstration' | 'Oral' | 'Observation' | 'Combined' | '';
  passingScore?: number;
  retrainingInterval?: 'None' | '6 Months' | '12 Months' | '24 Months' | '36 Months' | '';
  certificationRequired?: boolean;
  certificationValidity?: 'Indefinite' | '1 Year' | '2 Years' | '3 Years' | '5 Years' | '';
  applicableStandards?: string;
  category?: 'GMP' | 'GLP' | 'GCP' | 'Safety' | 'Quality' | 'Other' | '';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<TrainingStatus, string> = {
  'Planned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Overdue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const trainingTypes: TrainingType[] = ['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'];
const trainingStatuses: TrainingStatus[] = ['Planned', 'In Progress', 'Completed', 'Overdue'];
const deliveryMethods = ['Classroom', 'Online', 'On-the-Job Training', 'Webinar', 'Blended'] as const;
const priorityOptions = ['Low', 'Medium', 'High', 'Critical'] as const;
const assessmentMethods = ['Written Exam', 'Practical Demonstration', 'Oral', 'Observation', 'Combined'] as const;
const retrainingIntervals = ['None', '6 Months', '12 Months', '24 Months', '36 Months'] as const;
const certificationValidities = ['Indefinite', '1 Year', '2 Years', '3 Years', '5 Years'] as const;
const complianceCategories = ['GMP', 'GLP', 'GCP', 'Safety', 'Quality', 'Other'] as const;

const WIZARD_STEPS = [
  { label: 'Training Details', icon: ClipboardCheck },
  { label: 'Content & Materials', icon: FileText },
  { label: 'Assignment & Schedule', icon: Calendar },
  { label: 'Competency Assessment', icon: Target },
  { label: 'Compliance & Certification', icon: Award },
  { label: 'Review & Submit', icon: CheckCircle2 },
];

/** Compute effective status: if dueDate is past and not Completed → Overdue */
function getEffectiveStatus(training: Training): TrainingStatus {
  if (training.status === 'Completed') return 'Completed';
  if (training.dueDate && new Date(training.dueDate) < new Date()) {
    return 'Overdue';
  }
  return training.status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrainingView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const trainings = store.training;
  const profiles = store.profiles;
  const documents = store.documents;
  const { getApprovedTemplates, hasApprovedTemplate, moduleTypeLabels } = useRecordWorkflow();
  const approvedTrainingTemplates = getApprovedTemplates('TRAINING');
  const trainingHasApprovedTemplate = hasApprovedTemplate('TRAINING');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingCompleteTraining, setPendingCompleteTraining] = useState<Training | null>(null);

  // Wizard step
  const [wizardStep, setWizardStep] = useState(0);

  // Template selection
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formTemplateVersion, setFormTemplateVersion] = useState('');

  // ── Step 1: Training Details ──
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<TrainingType>('SOP');
  const [formRegulatoryReference, setFormRegulatoryReference] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // ── Step 2: Content & Materials ──
  const [formDocumentId, setFormDocumentId] = useState('');
  const [formMaterialsDescription, setFormMaterialsDescription] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formDeliveryMethod, setFormDeliveryMethod] = useState<TrainingExtendedMeta['deliveryMethod']>('');

  // ── Step 3: Assignment & Schedule ──
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formTrainer, setFormTrainer] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<TrainingExtendedMeta['priority']>('');

  // ── Step 4: Competency Assessment ──
  const [formAssessmentRequired, setFormAssessmentRequired] = useState(false);
  const [formAssessmentMethod, setFormAssessmentMethod] = useState<TrainingExtendedMeta['assessmentMethod']>('');
  const [formPassingScore, setFormPassingScore] = useState<number>(70);
  const [formRetrainingInterval, setFormRetrainingInterval] = useState<TrainingExtendedMeta['retrainingInterval']>('');

  // ── Step 5: Compliance & Certification ──
  const [formCertificationRequired, setFormCertificationRequired] = useState(false);
  const [formCertificationValidity, setFormCertificationValidity] = useState<TrainingExtendedMeta['certificationValidity']>('');
  const [formApplicableStandards, setFormApplicableStandards] = useState('');
  const [formCategory, setFormCategory] = useState<TrainingExtendedMeta['category']>('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newTemplateVersion, setNewTemplateVersion] = useState('');

  // Extended metadata store (keyed by training ID)
  const [extendedMeta, setExtendedMeta] = useState<Record<string, TrainingExtendedMeta>>({});

  // Helpers
  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const approvedDocuments = documents.filter(d => d.status === 'Approved');

  // Compute effective statuses for all trainings
  const trainingsWithEffectiveStatus = useMemo(() =>
    trainings.map(t => ({ ...t, effectiveStatus: getEffectiveStatus(t) })),
    [trainings]
  );

  // Summary counts (based on effective status)
  const summaryCounts = useMemo(() => ({
    planned: trainingsWithEffectiveStatus.filter(t => t.effectiveStatus === 'Planned').length,
    inProgress: trainingsWithEffectiveStatus.filter(t => t.effectiveStatus === 'In Progress').length,
    completed: trainingsWithEffectiveStatus.filter(t => t.effectiveStatus === 'Completed').length,
    overdue: trainingsWithEffectiveStatus.filter(t => t.effectiveStatus === 'Overdue').length,
  }), [trainingsWithEffectiveStatus]);

  // Compliance percentage
  const compliancePercent = trainingsWithEffectiveStatus.length > 0
    ? Math.round((summaryCounts.completed / trainingsWithEffectiveStatus.length) * 100)
    : 0;

  // Filtered trainings
  const filteredTrainings = trainingsWithEffectiveStatus.filter(t => {
    const matchesSearch = searchTerm === '' ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.effectiveStatus === statusFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesAssignedTo = assignedToFilter === 'all' || t.assignedTo === assignedToFilter;
    return matchesSearch && matchesStatus && matchesType && matchesAssignedTo;
  });

  // ── Form reset ──
  const resetForm = () => {
    setWizardStep(0);
    setFormTitle('');
    setFormType('SOP');
    setFormRegulatoryReference('');
    setFormDescription('');
    setFormDocumentId('');
    setFormMaterialsDescription('');
    setFormDuration('');
    setFormDeliveryMethod('');
    setFormAssignedTo('');
    setFormTrainer('');
    setFormDueDate('');
    setFormPriority('');
    setFormAssessmentRequired(false);
    setFormAssessmentMethod('');
    setFormPassingScore(70);
    setFormRetrainingInterval('');
    setFormCertificationRequired(false);
    setFormCertificationValidity('');
    setFormApplicableStandards('');
    setFormCategory('');
    setNewTemplateId('');
    setNewTemplateVersion('');
  };

  // ── Step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: return !!formTitle.trim();
      case 1: return true; // optional fields
      case 2: return !!formAssignedTo && !!formDueDate;
      case 3: return !formAssessmentRequired || !!formAssessmentMethod;
      case 4: return !formCertificationRequired || !!formCertificationValidity;
      case 5: return true;
      default: return false;
    }
  };

  const canGoNext = wizardStep < 5 && isStepValid(wizardStep);
  const canGoBack = wizardStep > 0;
  const canSubmit = wizardStep === 5 && isStepValid(0) && !!formAssignedTo && !!formDueDate;

  // ── Create training ──
  const handleCreate = () => {
    if (!formTitle.trim() || !formAssignedTo || !formDueDate) return;
    const id = `train-${Date.now()}`;
    const newTraining: Training = {
      id,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      type: formType,
      status: 'Planned',
      assignedTo: formAssignedTo,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : new Date().toISOString(),
      documentId: formDocumentId && formDocumentId !== 'none' ? formDocumentId : undefined,
      templateId: formTemplateId || undefined,
      templateVersion: formTemplateVersion || undefined,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId: newTemplateId || undefined,
      templateVersion: newTemplateVersion || undefined,
    };
    // Store extended metadata locally
    const meta: TrainingExtendedMeta = {
      regulatoryReference: formRegulatoryReference.trim() || undefined,
      materialsDescription: formMaterialsDescription.trim() || undefined,
      duration: formDuration.trim() || undefined,
      deliveryMethod: formDeliveryMethod || undefined,
      trainer: formTrainer || undefined,
      priority: formPriority || undefined,
      assessmentRequired: formAssessmentRequired || undefined,
      assessmentMethod: formAssessmentMethod || undefined,
      passingScore: formAssessmentRequired ? formPassingScore : undefined,
      retrainingInterval: formRetrainingInterval || undefined,
      certificationRequired: formCertificationRequired || undefined,
      certificationValidity: formCertificationValidity || undefined,
      applicableStandards: formApplicableStandards.trim() || undefined,
      category: formCategory || undefined,
    };
    setExtendedMeta(prev => ({ ...prev, [id]: meta }));
    store.addTraining(newTraining);
    resetForm();
    setShowCreateDialog(false);
  };

  const openDetail = (training: Training) => {
    setSelectedTraining(training);
    setShowDetailDialog(true);
  };

  const handleAdvanceToInProgress = (training: Training) => {
    store.updateTraining(training.id, { status: 'In Progress' });
    if (selectedTraining?.id === training.id) {
      setSelectedTraining({ ...training, status: 'In Progress' });
    }
  };

  const handleCompleteTraining = (training: Training) => {
    const orgSettings = store.getOrgSettings('org-001');
    if (orgSettings?.require_electronic_signatures) {
      setPendingCompleteTraining(training);
      setShowSignatureModal(true);
      return;
    }
    store.updateTraining(training.id, {
      status: 'Completed',
      completedDate: new Date().toISOString(),
    });
    if (selectedTraining?.id === training.id) {
      setSelectedTraining({ ...training, status: 'Completed', completedDate: new Date().toISOString() });
    }
  };

  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingCompleteTraining) return;
    store.updateTraining(pendingCompleteTraining.id, {
      status: 'Completed',
      completedDate: new Date().toISOString(),
    });
    if (selectedTraining?.id === pendingCompleteTraining.id) {
      setSelectedTraining({ ...pendingCompleteTraining, status: 'Completed', completedDate: new Date().toISOString() });
    }
    setPendingCompleteTraining(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingCompleteTraining(null);
    setShowSignatureModal(false);
  };

  // Linked document lookup
  const getLinkedDocument = (docId?: string) => {
    if (!docId) return null;
    return documents.find(d => d.id === docId) || null;
  };

  // Get priority badge color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'High': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // ── Progress calculation for training ──
  const getTrainingProgress = (training: Training): number => {
    const status = getEffectiveStatus(training);
    switch (status) {
      case 'Completed': return 100;
      case 'In Progress': return 50;
      case 'Overdue': return 60; // overdue but was in progress
      case 'Planned': return 0;
      default: return 0;
    }
  };

  // ── Wizard Step Renderer ──
  const renderWizardStep = () => {
    switch (wizardStep) {
      // ─── Step 1: Training Details ───
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Training Details</h3>
            </div>
            <p className="text-sm text-muted-foreground">Provide the core information for this training record.</p>
            <div className="grid gap-4">
              {/* Template Selector */}
              <div className="grid gap-2">
                <Label htmlFor="train-template">Template</Label>
                <Select value={formTemplateId || 'none'} onValueChange={(v) => {
                  if (v === 'none') {
                    setFormTemplateId('');
                    setFormTemplateVersion('');
                  } else {
                    setFormTemplateId(v);
                    const tpl = approvedTrainingTemplates.find(t => t.id === v);
                    setFormTemplateVersion(tpl?.version || '');
                  }
                }}>
                  <SelectTrigger id="train-template"><SelectValue placeholder="Select an approved template (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {approvedTrainingTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="train-title">Title *</Label>
                <Input id="train-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. ISO 13485 Awareness Training" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="train-type">Type *</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as TrainingType)}>
                    <SelectTrigger id="train-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {trainingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="train-reg-ref">Regulatory Reference</Label>
                  <Input id="train-reg-ref" value={formRegulatoryReference} onChange={(e) => setFormRegulatoryReference(e.target.value)} placeholder='e.g. "ISO 13485 §6.2"' />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="train-desc">Description</Label>
                <Textarea id="train-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the training purpose and objectives..." rows={4} />
              </div>
              <TemplateSelector
                moduleType="training"
                value={newTemplateId}
                onChange={(id, version) => {
                  setNewTemplateId(id);
                  setNewTemplateVersion(version);
                }}
                required
              />
            </div>
          </div>
        );

      // ─── Step 2: Content & Materials ───
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Content &amp; Materials</h3>
            </div>
            <p className="text-sm text-muted-foreground">Link documents and describe training content and delivery.</p>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="train-doc">Linked Document</Label>
                <Select value={formDocumentId || 'none'} onValueChange={setFormDocumentId}>
                  <SelectTrigger id="train-doc"><SelectValue placeholder="Select approved document" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {approvedDocuments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.documentNumber} — {d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="train-materials">Materials Description</Label>
                <Textarea id="train-materials" value={formMaterialsDescription} onChange={(e) => setFormMaterialsDescription(e.target.value)} placeholder="Describe training materials, handouts, resources..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="train-duration">Duration</Label>
                  <Input id="train-duration" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder='e.g. "2 hours"' />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="train-delivery">Delivery Method</Label>
                  <Select value={formDeliveryMethod || 'none'} onValueChange={(v) => setFormDeliveryMethod(v === 'none' ? '' : v as TrainingExtendedMeta['deliveryMethod'])}>
                    <SelectTrigger id="train-delivery"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {deliveryMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      // ─── Step 3: Assignment & Schedule ───
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Assignment &amp; Schedule</h3>
            </div>
            <p className="text-sm text-muted-foreground">Assign the training and set the schedule.</p>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="train-assigned">Assigned To *</Label>
                  <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                    <SelectTrigger id="train-assigned"><SelectValue placeholder="Select trainee" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="train-trainer">Trainer</Label>
                  <Select value={formTrainer || 'none'} onValueChange={(v) => setFormTrainer(v === 'none' ? '' : v)}>
                    <SelectTrigger id="train-trainer"><SelectValue placeholder="Select trainer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="train-due">Due Date *</Label>
                  <Input id="train-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="train-priority">Priority</Label>
                  <Select value={formPriority || 'none'} onValueChange={(v) => setFormPriority(v === 'none' ? '' : v as TrainingExtendedMeta['priority'])}>
                    <SelectTrigger id="train-priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {priorityOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      // ─── Step 4: Competency Assessment ───
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Competency Assessment</h3>
            </div>
            <p className="text-sm text-muted-foreground">Define competency evaluation criteria per ISO 13485 §6.2.</p>
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="train-assessment-required" className="font-medium">Assessment Required</Label>
                  <p className="text-sm text-muted-foreground">Enable competency evaluation for this training</p>
                </div>
                <Switch
                  id="train-assessment-required"
                  checked={formAssessmentRequired}
                  onCheckedChange={setFormAssessmentRequired}
                />
              </div>

              {formAssessmentRequired && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                  <div className="grid gap-2">
                    <Label htmlFor="train-assess-method">Assessment Method *</Label>
                    <Select value={formAssessmentMethod || 'none'} onValueChange={(v) => setFormAssessmentMethod(v === 'none' ? '' : v as TrainingExtendedMeta['assessmentMethod'])}>
                      <SelectTrigger id="train-assess-method"><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {assessmentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="train-pass-score">Passing Score %</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="train-pass-score"
                        type="number"
                        min={0}
                        max={100}
                        value={formPassingScore}
                        onChange={(e) => setFormPassingScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">/ 100%</span>
                      <div className="flex-1">
                        <Progress value={formPassingScore} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="train-retraining">Retraining Interval</Label>
                <Select value={formRetrainingInterval || 'none'} onValueChange={(v) => setFormRetrainingInterval(v === 'none' ? '' : v as TrainingExtendedMeta['retrainingInterval'])}>
                  <SelectTrigger id="train-retraining"><SelectValue placeholder="Select interval" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {retrainingIntervals.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // ─── Step 5: Compliance & Certification ───
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Compliance &amp; Certification</h3>
            </div>
            <p className="text-sm text-muted-foreground">Define compliance requirements and certification parameters.</p>
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="train-cert-required" className="font-medium">Certification Required</Label>
                  <p className="text-sm text-muted-foreground">Issue a certificate upon successful completion</p>
                </div>
                <Switch
                  id="train-cert-required"
                  checked={formCertificationRequired}
                  onCheckedChange={setFormCertificationRequired}
                />
              </div>

              {formCertificationRequired && (
                <div className="grid gap-2 pl-4 border-l-2 border-primary/30">
                  <Label htmlFor="train-cert-validity">Certification Validity *</Label>
                  <Select value={formCertificationValidity || 'none'} onValueChange={(v) => setFormCertificationValidity(v === 'none' ? '' : v as TrainingExtendedMeta['certificationValidity'])}>
                    <SelectTrigger id="train-cert-validity"><SelectValue placeholder="Select validity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {certificationValidities.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="train-standards">Applicable Standards</Label>
                <Input id="train-standards" value={formApplicableStandards} onChange={(e) => setFormApplicableStandards(e.target.value)} placeholder='e.g. "ISO 13485:2016, FDA 21 CFR 820"' />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="train-category">Category</Label>
                <Select value={formCategory || 'none'} onValueChange={(v) => setFormCategory(v === 'none' ? '' : v as TrainingExtendedMeta['category'])}>
                  <SelectTrigger id="train-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {complianceCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // ─── Step 6: Review & Submit ───
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Review &amp; Submit</h3>
            </div>
            <p className="text-sm text-muted-foreground">Review all entered information before creating the training record.</p>

            {/* Training Details Summary */}
            <div className="rounded-md border p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1"><ClipboardCheck className="h-4 w-4" /> Training Details</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{formTitle || '-'}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{formType}</span></div>
                {formRegulatoryReference && <div><span className="text-muted-foreground">Regulatory Ref:</span> <span className="font-medium">{formRegulatoryReference}</span></div>}
                {formDescription && (
                  <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="font-medium">{formDescription}</span></div>
                )}
              </div>
            </div>

            {/* Content & Materials Summary */}
            <div className="rounded-md border p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1"><FileText className="h-4 w-4" /> Content &amp; Materials</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {formDocumentId && formDocumentId !== 'none' && (() => {
                  const doc = approvedDocuments.find(d => d.id === formDocumentId);
                  return doc ? (
                    <div><span className="text-muted-foreground">Document:</span> <span className="font-medium">{doc.documentNumber} — {doc.title}</span></div>
                  ) : null;
                })()}
                {formDuration && <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{formDuration}</span></div>}
                {formDeliveryMethod && <div><span className="text-muted-foreground">Delivery:</span> <span className="font-medium">{formDeliveryMethod}</span></div>}
                {formMaterialsDescription && <div className="col-span-2"><span className="text-muted-foreground">Materials:</span> <span className="font-medium">{formMaterialsDescription}</span></div>}
                {!formDocumentId && !formDuration && !formDeliveryMethod && !formMaterialsDescription && (
                  <div className="col-span-2 text-muted-foreground italic">No content details specified</div>
                )}
              </div>
            </div>

            {/* Assignment & Schedule Summary */}
            <div className="rounded-md border p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1"><Calendar className="h-4 w-4" /> Assignment &amp; Schedule</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium">{formAssignedTo ? getUserName(formAssignedTo) : '-'}</span></div>
                {formTrainer && <div><span className="text-muted-foreground">Trainer:</span> <span className="font-medium">{getUserName(formTrainer)}</span></div>}
                <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{formDueDate || '-'}</span></div>
                {formPriority && (
                  <div><span className="text-muted-foreground">Priority:</span> <Badge className={cn('text-xs', getPriorityColor(formPriority))} variant="secondary">{formPriority}</Badge></div>
                )}
              </div>
            </div>

            {/* Competency Assessment Summary */}
            <div className="rounded-md border p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1"><Target className="h-4 w-4" /> Competency Assessment</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Assessment Required:</span> <span className="font-medium">{formAssessmentRequired ? 'Yes' : 'No'}</span></div>
                {formAssessmentRequired && formAssessmentMethod && <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{formAssessmentMethod}</span></div>}
                {formAssessmentRequired && <div><span className="text-muted-foreground">Passing Score:</span> <span className="font-medium">{formPassingScore}%</span></div>}
                {formRetrainingInterval && <div><span className="text-muted-foreground">Retraining:</span> <span className="font-medium">{formRetrainingInterval}</span></div>}
                {!formAssessmentRequired && !formRetrainingInterval && (
                  <div className="col-span-2 text-muted-foreground italic">No assessment configured</div>
                )}
              </div>
            </div>

            {/* Compliance & Certification Summary */}
            <div className="rounded-md border p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-1"><Award className="h-4 w-4" /> Compliance &amp; Certification</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Certification Required:</span> <span className="font-medium">{formCertificationRequired ? 'Yes' : 'No'}</span></div>
                {formCertificationRequired && formCertificationValidity && <div><span className="text-muted-foreground">Validity:</span> <span className="font-medium">{formCertificationValidity}</span></div>}
                {formApplicableStandards && <div><span className="text-muted-foreground">Standards:</span> <span className="font-medium">{formApplicableStandards}</span></div>}
                {formCategory && <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{formCategory}</span></div>}
                {!formCertificationRequired && !formApplicableStandards && !formCategory && (
                  <div className="col-span-2 text-muted-foreground italic">No compliance details specified</div>
                )}
              </div>
            </div>

            {/* ISO 13485 §6.2 Verification Note */}
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary">ISO 13485 §6.2 Verification</p>
                <p className="text-muted-foreground mt-0.5">
                  This training record has been configured in accordance with ISO 13485:2016 §6.2 —
                  &quot;Human Resources&quot;. The organization shall determine the necessary competence
                  of personnel doing work affecting product quality, and provide training or take other
                  actions to achieve the necessary competence.
                </p>
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
      {/* Layer 1 Gate Warning */}
      {!trainingHasApprovedTemplate && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">No approved template found for Training records</p>
            <p className="mt-0.5">Please create and approve a template in the Forms module first.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Training
          </h1>
          <p className="text-muted-foreground mt-1">Training management and compliance tracking (ISO 13485 §6.2)</p>
        </div>
        {hasPermission('training.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Training
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Planned</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.planned}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.completed}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Overdue</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.overdue}</span>
          </CardContent>
        </Card>
      </div>

      {/* Training Compliance Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Training Compliance</span>
            </div>
            <span className="text-sm font-bold">{compliancePercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                'h-3 rounded-full transition-all duration-500',
                compliancePercent >= 80 ? 'bg-green-500' :
                compliancePercent >= 50 ? 'bg-amber-500' :
                'bg-red-500'
              )}
              style={{ width: `${compliancePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summaryCounts.completed} of {trainingsWithEffectiveStatus.length} training records completed
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search training..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {trainingStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {trainingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>
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
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[140px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[110px]">Completed</TableHead>
                  <TableHead className="w-[100px]">Document</TableHead>
                  <TableHead className="w-[110px]">Template</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map(training => {
                  const effectiveStatus = training.effectiveStatus;
                  const linkedDoc = getLinkedDocument(training.documentId);
                  const meta = extendedMeta[training.id];
                  return (
                    <TableRow
                      key={training.id}
                      className={cn(
                        'hover:bg-muted/50 cursor-pointer',
                        effectiveStatus === 'Overdue' ? 'bg-red-50/50 dark:bg-red-900/5' : ''
                      )}
                      onClick={() => openDetail(training)}
                    >
                      <TableCell>
                        <p className="font-medium">{training.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {training.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{training.description}</p>
                          )}
                          {meta?.priority && (
                            <Badge className={cn('text-[10px] px-1.5 py-0', getPriorityColor(meta.priority))} variant="secondary">
                              {meta.priority}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{training.type}</Badge></TableCell>
                      <TableCell className="text-sm">{getUserName(training.assignedTo)}</TableCell>
                      <TableCell className={cn(
                        'text-sm',
                        effectiveStatus === 'Overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        {formatDate(training.dueDate, true)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[effectiveStatus])} variant="secondary">
                          {effectiveStatus === 'Overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {effectiveStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {training.completedDate ? formatDate(training.completedDate, true) : '-'}
                      </TableCell>
                      <TableCell>
                        {linkedDoc ? (
                          <Badge variant="outline" className="text-xs font-mono">{linkedDoc.documentNumber}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {training.templateId ? (() => {
                          const tpl = store.formTemplates.find(t => t.id === training.templateId);
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(training); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredTrainings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No training records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 6-Step Wizard Create Training Dialog ─── */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Create New Training
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 py-2">
            {WIZARD_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === wizardStep;
              const isCompleted = idx < wizardStep;
              return (
                <React.Fragment key={idx}>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                    onClick={() => { if (isCompleted) setWizardStep(idx); }}
                    disabled={!isCompleted && idx > wizardStep}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{idx + 1}</span>
                    {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="min-h-[300px]">
            {renderWizardStep()}
          </div>

          <Separator />

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              Step {wizardStep + 1} of {WIZARD_STEPS.length}
            </span>
            {wizardStep < 5 ? (
              <Button
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={!canGoNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canSubmit}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Training
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Enhanced Detail Dialog ─── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedTraining && (() => {
            const effectiveStatus = getEffectiveStatus(selectedTraining);
            const linkedDoc = getLinkedDocument(selectedTraining.documentId);
            const meta = extendedMeta[selectedTraining.id];
            const progress = getTrainingProgress(selectedTraining);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedTraining.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn(statusColors[effectiveStatus])} variant="secondary">
                      {effectiveStatus === 'Overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {effectiveStatus}
                    </Badge>
                    <Badge variant="outline">{selectedTraining.type}</Badge>
                    {meta?.priority && (
                      <Badge className={cn(getPriorityColor(meta.priority))} variant="secondary">
                        {meta.priority}
                      </Badge>
                    )}
                    {meta?.category && (
                      <Badge variant="outline" className="text-xs">{meta.category}</Badge>
                    )}
                  </div>

                  {/* Training Progress Tracking */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        Training Progress
                      </h4>
                      <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                  </div>

                  {/* Status flow */}
                  <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                    {(['Planned', 'In Progress', 'Completed'] as TrainingStatus[]).map((s, i) => {
                      const isActive = s === effectiveStatus || (s === 'Completed' && effectiveStatus === 'Completed');
                      const isPast =
                        (s === 'Planned' && (effectiveStatus === 'In Progress' || effectiveStatus === 'Completed' || effectiveStatus === 'Overdue')) ||
                        (s === 'In Progress' && effectiveStatus === 'Completed');
                      return (
                        <React.Fragment key={s}>
                          <div className={cn(
                            'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                            isActive ? 'bg-primary text-primary-foreground' :
                            isPast ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {s}
                          </div>
                          {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        </React.Fragment>
                      );
                    })}
                    {effectiveStatus === 'Overdue' && (
                      <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mx-1" />
                        <div className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Overdue
                        </div>
                      </>
                    )}
                  </div>

                  {/* Training metadata */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {selectedTraining.templateId && (() => {
                      const tpl = store.formTemplates.find(t => t.id === selectedTraining.templateId);
                      return tpl ? (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Template:</span>{' '}
                          <Badge variant="outline" className="text-xs">{tpl.title} (v{selectedTraining.templateVersion || tpl.version})</Badge>
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <span className="text-muted-foreground">Assigned To:</span>{' '}
                      <span className="font-medium">{getUserName(selectedTraining.assignedTo)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>{' '}
                      <span className="font-medium">{selectedTraining.type}</span>
                    </div>
                    {meta?.trainer && (
                      <div>
                        <span className="text-muted-foreground">Trainer:</span>{' '}
                        <span className="font-medium">{getUserName(meta.trainer)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>{' '}
                      <span className={cn('font-medium', effectiveStatus === 'Overdue' && 'text-red-600')}>
                        {formatDate(selectedTraining.dueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      <span className="font-medium">{formatDate(selectedTraining.createdAt)}</span>
                    </div>
                    {selectedTraining.completedDate && (
                      <div>
                        <span className="text-muted-foreground">Completed:</span>{' '}
                        <span className="font-medium text-green-600">{formatDate(selectedTraining.completedDate)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Updated:</span>{' '}
                      <span className="font-medium">{formatDate(selectedTraining.updatedAt)}</span>
                    </div>
                    {meta?.duration && (
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{' '}
                        <span className="font-medium">{meta.duration}</span>
                      </div>
                    )}
                    {meta?.deliveryMethod && (
                      <div>
                        <span className="text-muted-foreground">Delivery:</span>{' '}
                        <span className="font-medium">{meta.deliveryMethod}</span>
                      </div>
                    )}
                    {meta?.regulatoryReference && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Regulatory Reference:</span>{' '}
                        <span className="font-medium font-mono text-xs">{meta.regulatoryReference}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedTraining.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedTraining.description}</p>
                    </div>
                  )}

                  {/* Materials Description */}
                  {meta?.materialsDescription && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                        <FileCheck className="h-4 w-4" />
                        Training Materials
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{meta.materialsDescription}</p>
                    </div>
                  )}

                  {/* Linked Document */}
                  {linkedDoc && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Linked Document
                      </h4>
                      <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">{linkedDoc.documentNumber}</Badge>
                        <span className="text-sm">{linkedDoc.title}</span>
                        <Badge className={cn(
                          'text-xs ml-auto',
                          linkedDoc.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
                        )} variant="secondary">{linkedDoc.status}</Badge>
                      </div>
                    </div>
                  )}

                  {/* ─── Competency Assessment Details ─── */}
                  {(meta?.assessmentRequired || meta?.retrainingInterval) && (
                    <div className="rounded-md border p-4 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1">
                        <Target className="h-4 w-4 text-primary" />
                        Competency Assessment
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Assessment Required:</span>{' '}
                          <span className="font-medium">{meta.assessmentRequired ? 'Yes' : 'No'}</span>
                        </div>
                        {meta.assessmentRequired && meta.assessmentMethod && (
                          <div>
                            <span className="text-muted-foreground">Method:</span>{' '}
                            <span className="font-medium">{meta.assessmentMethod}</span>
                          </div>
                        )}
                        {meta.assessmentRequired && meta.passingScore !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Passing Score:</span>{' '}
                            <span className="font-medium">{meta.passingScore}%</span>
                          </div>
                        )}
                        {meta.retrainingInterval && meta.retrainingInterval !== 'None' && (
                          <div>
                            <span className="text-muted-foreground">Retraining Interval:</span>{' '}
                            <span className="font-medium">{meta.retrainingInterval}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── Compliance & Certification Info ─── */}
                  {(meta?.certificationRequired || meta?.applicableStandards || meta?.category) && (
                    <div className="rounded-md border p-4 space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1">
                        <Award className="h-4 w-4 text-primary" />
                        Compliance &amp; Certification
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {meta.certificationRequired && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Certification Required:</span>{' '}
                              <span className="font-medium text-green-600">Yes</span>
                            </div>
                            {meta.certificationValidity && (
                              <div>
                                <span className="text-muted-foreground">Validity:</span>{' '}
                                <span className="font-medium">{meta.certificationValidity}</span>
                              </div>
                            )}
                          </>
                        )}
                        {meta.applicableStandards && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Applicable Standards:</span>{' '}
                            <span className="font-medium">{meta.applicableStandards}</span>
                          </div>
                        )}
                        {meta.category && (
                          <div>
                            <span className="text-muted-foreground">Category:</span>{' '}
                            <Badge variant="outline" className="text-xs">{meta.category}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overdue warning with date */}
                  {effectiveStatus === 'Overdue' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700 dark:text-red-400">
                        <p className="font-medium">Training Overdue</p>
                        <p className="mt-0.5">
                          This training was due on <strong>{formatDate(selectedTraining.dueDate)}</strong> and has not been completed.
                          Immediate action is required to maintain compliance with ISO 13485 §6.2.
                        </p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Action buttons */}
                  {hasPermission('training.update') && effectiveStatus !== 'Completed' && (
                    <div className="flex gap-2">
                      {effectiveStatus === 'Planned' && (
                        <Button className="flex-1" onClick={() => handleAdvanceToInProgress(selectedTraining)}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Training
                        </Button>
                      )}
                      {(effectiveStatus === 'In Progress' || effectiveStatus === 'Overdue') && (
                        <Button className="flex-1" onClick={() => handleCompleteTraining(selectedTraining)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ISO 13485 §6.2 reference note */}
                  <div className="bg-muted/30 rounded-md p-3 flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Per ISO 13485:2016 §6.2 — The organization shall determine the necessary competence
                      of personnel doing work affecting product quality, provide training or take other
                      actions to achieve the necessary competence, and evaluate the effectiveness of
                      actions taken.
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Electronic Signature Modal ─── */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingCompleteTraining ? pendingCompleteTraining.title : ''}
        recordId={pendingCompleteTraining?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
