'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import type { Audit, AuditStatus, AuditType, AuditFinding, SignatureType, Capa, CapaPriority } from '@/types/qms';
import {
  ClipboardCheck, Plus, Search, ArrowRight, AlertCircle,
  CheckCircle2, ShieldCheck, Link2, PlusCircle, Flag,
  ChevronLeft, ChevronRight, Calendar, Users, FileText,
  ListChecks, ClipboardList, BookOpen, Trash2, Info, FileSpreadsheet,
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

// ============================================================================
// Constants
// ============================================================================

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

const complianceColors: Record<string, string> = {
  'Compliant': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Minor Gap': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Major Gap': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'N/A': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const ratingColors: Record<string, string> = {
  'Non-compliant': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Partially compliant': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Largely compliant': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Substantially compliant': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Fully compliant': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const auditStatusFlow: AuditStatus[] = ['Planned', 'In Progress', 'Completed'];
const auditTypes: AuditType[] = ['Internal', 'External', 'Supplier'];
const extendedAuditTypes = ['Internal', 'External Customer', 'External Regulatory', 'Supplier'] as const;
const findingSeverities: AuditFinding['severity'][] = ['Critical', 'Major', 'Minor', 'Observation'];
const auditCriteriaOptions = [
  'ISO 13485:2016', 'FDA 21 CFR 820', 'EU MDR', 'EU IVDR', 'MDSAP', 'Internal SOPs', 'Customer requirements',
];
const complianceRatingOptions = [
  'Non-compliant', 'Partially compliant', 'Largely compliant', 'Substantially compliant', 'Fully compliant',
];
const teamMemberRoles = ['Co-Auditor', 'Technical Expert', 'Observer', 'Trainee'] as const;
const complianceOptions = ['Compliant', 'Minor Gap', 'Major Gap', 'N/A'] as const;

// ============================================================================
// Wizard Step Definitions
// ============================================================================

const wizardSteps = [
  { id: 1, label: 'Planning', icon: ClipboardList },
  { id: 2, label: 'Schedule & Team', icon: Users },
  { id: 3, label: 'Checklist', icon: ListChecks },
  { id: 4, label: 'Execution & Findings', icon: FileText },
  { id: 5, label: 'Response & Closure', icon: BookOpen },
];

// ============================================================================
// Form Types
// ============================================================================

interface TeamMemberRow {
  id: string;
  member: string;
  role: string;
  assignedScope: string;
}

interface AuditeeRow {
  id: string;
  name: string;
  department: string;
  roleFunction: string;
}

interface ChecklistItemRow {
  id: string;
  clauseRef: string;
  requirement: string;
  evidenceExpected: string;
}

interface DocumentReviewedRow {
  id: string;
  docNumber: string;
  revision: string;
  compliance: string;
}

interface InterviewRow {
  id: string;
  person: string;
  topics: string;
  keyPoints: string;
}

interface FindingRow {
  id: string;
  severity: string;
  referenceClause: string;
  description: string;
  objectiveEvidence: string;
  carRequired: boolean;
  capaReference: string;
}

interface CorrectiveActionRow {
  id: string;
  action: string;
  responsible: string;
  dueDate: string;
  requiredEvidence: string;
}

interface DocumentUpdateRow {
  id: string;
  document: string;
  requiredChange: string;
  changeControlRef: string;
}

interface TrainingRequiredRow {
  id: string;
  scope: string;
  targetPersonnel: string;
  plannedDate: string;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ============================================================================
// Helper
// ============================================================================

function getNextAuditStatus(current: AuditStatus): AuditStatus | null {
  const idx = auditStatusFlow.indexOf(current);
  return idx < auditStatusFlow.length - 1 ? auditStatusFlow[idx + 1] : null;
}

function mapExtendedType(ext: string): AuditType {
  if (ext === 'External Customer' || ext === 'External Regulatory') return 'External';
  if (ext === 'Supplier') return 'Supplier';
  return 'Internal';
}

// ============================================================================
// Component
// ============================================================================

export function AuditView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const audits = store.audits;
  const profiles = store.profiles;
  const capas = store.capas;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Electronic signature
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingCompleteAudit, setPendingCompleteAudit] = useState<Audit | null>(null);

  // Wizard step
  const [wizardStep, setWizardStep] = useState(1);

  // ========== Step 1 - Audit Planning ==========
  const [formTitle, setFormTitle] = useState('');
  const [formExtendedType, setFormExtendedType] = useState<string>('Internal');
  const [formScope, setFormScope] = useState('');
  const [formCriteria, setFormCriteria] = useState<string[]>([]);
  const [formObjectives, setFormObjectives] = useState('');

  // ========== Step 2 - Schedule & Team ==========
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLeadAuditor, setFormLeadAuditor] = useState('');
  const [formTeamMembers, setFormTeamMembers] = useState<TeamMemberRow[]>([]);
  const [formAuditees, setFormAuditees] = useState<AuditeeRow[]>([]);

  // ========== Step 3 - Checklist & Documents ==========
  const [formChecklistItems, setFormChecklistItems] = useState<ChecklistItemRow[]>([]);
  const [formPreviousAuditRef, setFormPreviousAuditRef] = useState('');

  // ========== Step 4 - Execution & Findings ==========
  const [formOpeningMeetingDate, setFormOpeningMeetingDate] = useState('');
  const [formClosingMeetingDate, setFormClosingMeetingDate] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [formDocumentsReviewed, setFormDocumentsReviewed] = useState<DocumentReviewedRow[]>([]);
  const [formInterviews, setFormInterviews] = useState<InterviewRow[]>([]);
  const [formGeneralObservations, setFormGeneralObservations] = useState('');
  const [formFindings, setFormFindings] = useState<FindingRow[]>([]);

  // ========== Step 5 - Response & Closure ==========
  const [formCorrectiveActions, setFormCorrectiveActions] = useState<CorrectiveActionRow[]>([]);
  const [formDocumentUpdates, setFormDocumentUpdates] = useState<DocumentUpdateRow[]>([]);
  const [formTrainingRequired, setFormTrainingRequired] = useState<TrainingRequiredRow[]>([]);
  const [formFollowUpDate, setFormFollowUpDate] = useState('');
  const [formExecutiveSummary, setFormExecutiveSummary] = useState('');
  const [formComplianceRating, setFormComplianceRating] = useState<string>('');
  const [formRiskAssessment, setFormRiskAssessment] = useState('');
  const [formManagementReviewRequired, setFormManagementReviewRequired] = useState(false);
  const [formNextAuditDate, setFormNextAuditDate] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');

  // Add finding (in detail dialog)
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [findingSeverity, setFindingSeverity] = useState<AuditFinding['severity']>('Minor');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingReferenceClause, setFindingReferenceClause] = useState('');
  const [findingCar, setFindingCar] = useState(false);

  // P2-4: Create CAPA from finding
  const [showCreateCapaFromFinding, setShowCreateCapaFromFinding] = useState(false);
  const [pendingFindingForCapa, setPendingFindingForCapa] = useState<{ findingId: string; findingDesc: string } | null>(null);
  const [capaFromFindingTitle, setCapaFromFindingTitle] = useState('');
  const [capaFromFindingPriority, setCapaFromFindingPriority] = useState<CapaPriority>('High');
  const [capaFromFindingAssignedTo, setCapaFromFindingAssignedTo] = useState('');
  const [capaFromFindingDueDate, setCapaFromFindingDueDate] = useState('');

  // Auto-generated audit number
  const nextAuditNumber = `AUD-2024-${String(audits.length + 1).padStart(3, '0')}`;

  // ============================================================================
  // Filtered & Computed
  // ============================================================================

  const filteredAudits = audits.filter(a => {
    const matchesSearch = searchTerm === '' ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.auditNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.scope && a.scope.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const getLinkedCapa = (capaId?: string) => {
    if (!capaId) return null;
    return capas.find(c => c.id === capaId) || null;
  };

  // ============================================================================
  // Form Reset
  // ============================================================================

  const resetForm = () => {
    setWizardStep(1);
    setFormTitle(''); setFormExtendedType('Internal'); setFormScope('');
    setFormCriteria([]); setFormObjectives('');
    setFormStartDate(''); setFormEndDate(''); setFormLeadAuditor('');
    setFormTeamMembers([]); setFormAuditees([]);
    setFormChecklistItems([]); setFormPreviousAuditRef('');
    setFormOpeningMeetingDate(''); setFormClosingMeetingDate('');
    setFormAttendees(''); setFormDocumentsReviewed([]);
    setFormInterviews([]); setFormGeneralObservations('');
    setFormFindings([]);
    setFormCorrectiveActions([]); setFormDocumentUpdates([]);
    setFormTrainingRequired([]); setFormFollowUpDate('');
    setFormExecutiveSummary(''); setFormComplianceRating('');
    setFormRiskAssessment(''); setFormManagementReviewRequired(false);
    setFormNextAuditDate('');
    setFormTemplateId('');
  };

  const resetFindingForm = () => {
    setFindingSeverity('Minor'); setFindingDescription('');
    setFindingReferenceClause(''); setFindingCar(false);
    setShowAddFinding(false);
  };

  // ============================================================================
  // Dynamic Table Helpers
  // ============================================================================

  const addTeamMember = () => {
    setFormTeamMembers(prev => [...prev, { id: uid(), member: '', role: 'Co-Auditor', assignedScope: '' }]);
  };
  const removeTeamMember = (id: string) => {
    setFormTeamMembers(prev => prev.filter(r => r.id !== id));
  };
  const updateTeamMember = (id: string, field: keyof TeamMemberRow, value: string) => {
    setFormTeamMembers(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addAuditee = () => {
    setFormAuditees(prev => [...prev, { id: uid(), name: '', department: '', roleFunction: '' }]);
  };
  const removeAuditee = (id: string) => {
    setFormAuditees(prev => prev.filter(r => r.id !== id));
  };
  const updateAuditee = (id: string, field: keyof AuditeeRow, value: string) => {
    setFormAuditees(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addChecklistItem = () => {
    setFormChecklistItems(prev => [...prev, { id: uid(), clauseRef: '', requirement: '', evidenceExpected: '' }]);
  };
  const removeChecklistItem = (id: string) => {
    setFormChecklistItems(prev => prev.filter(r => r.id !== id));
  };
  const updateChecklistItem = (id: string, field: keyof ChecklistItemRow, value: string) => {
    setFormChecklistItems(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addDocumentReviewed = () => {
    setFormDocumentsReviewed(prev => [...prev, { id: uid(), docNumber: '', revision: '', compliance: 'Compliant' }]);
  };
  const removeDocumentReviewed = (id: string) => {
    setFormDocumentsReviewed(prev => prev.filter(r => r.id !== id));
  };
  const updateDocumentReviewed = (id: string, field: keyof DocumentReviewedRow, value: string) => {
    setFormDocumentsReviewed(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addInterview = () => {
    setFormInterviews(prev => [...prev, { id: uid(), person: '', topics: '', keyPoints: '' }]);
  };
  const removeInterview = (id: string) => {
    setFormInterviews(prev => prev.filter(r => r.id !== id));
  };
  const updateInterview = (id: string, field: keyof InterviewRow, value: string) => {
    setFormInterviews(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addFindingRow = () => {
    setFormFindings(prev => [...prev, { id: uid(), severity: 'Minor', referenceClause: '', description: '', objectiveEvidence: '', carRequired: false, capaReference: '' }]);
  };
  const removeFindingRow = (id: string) => {
    setFormFindings(prev => prev.filter(r => r.id !== id));
  };
  const updateFindingRow = (id: string, field: keyof FindingRow, value: string | boolean) => {
    setFormFindings(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addCorrectiveAction = () => {
    setFormCorrectiveActions(prev => [...prev, { id: uid(), action: '', responsible: '', dueDate: '', requiredEvidence: '' }]);
  };
  const removeCorrectiveAction = (id: string) => {
    setFormCorrectiveActions(prev => prev.filter(r => r.id !== id));
  };
  const updateCorrectiveAction = (id: string, field: keyof CorrectiveActionRow, value: string) => {
    setFormCorrectiveActions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addDocumentUpdate = () => {
    setFormDocumentUpdates(prev => [...prev, { id: uid(), document: '', requiredChange: '', changeControlRef: '' }]);
  };
  const removeDocumentUpdate = (id: string) => {
    setFormDocumentUpdates(prev => prev.filter(r => r.id !== id));
  };
  const updateDocumentUpdate = (id: string, field: keyof DocumentUpdateRow, value: string) => {
    setFormDocumentUpdates(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addTrainingRequired = () => {
    setFormTrainingRequired(prev => [...prev, { id: uid(), scope: '', targetPersonnel: '', plannedDate: '' }]);
  };
  const removeTrainingRequired = (id: string) => {
    setFormTrainingRequired(prev => prev.filter(r => r.id !== id));
  };
  const updateTrainingRequired = (id: string, field: keyof TrainingRequiredRow, value: string) => {
    setFormTrainingRequired(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleCriteria = (criterion: string, checked: boolean) => {
    setFormCriteria(prev =>
      checked ? [...prev, criterion] : prev.filter(c => c !== criterion)
    );
  };

  // ============================================================================
  // Create Handler
  // ============================================================================

  const handleCreate = () => {
    const complianceRatingMap: Record<string, number> = {
      'Non-compliant': 1,
      'Partially compliant': 2,
      'Largely compliant': 3,
      'Substantially compliant': 4,
      'Fully compliant': 5,
    };

    const newAudit: Audit = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      auditNumber: nextAuditNumber,
      title: formTitle,
      type: mapExtendedType(formExtendedType),
      status: 'Planned',
      scope: formScope || undefined,
      scheduledDate: formStartDate ? new Date(formStartDate).toISOString() : new Date().toISOString(),
      completedDate: undefined,
      leadAuditor: formLeadAuditor,
      auditees: formAuditees.length > 0 ? formAuditees.map(a => a.name).filter(Boolean) : undefined,
      findings: formFindings.filter(f => f.description.trim()).map((f, idx) => ({
        id: `finding-${Date.now()}-${idx}`,
        description: f.description.trim(),
        severity: f.severity as AuditFinding['severity'],
        referenceClause: f.referenceClause.trim() || undefined,
        correctiveActionRequired: f.carRequired,
        capaId: f.capaReference.trim() || undefined,
      })),
      teamMembers: formTeamMembers.length > 0 ? formTeamMembers.map(tm => ({ member: tm.member, role: tm.role, assignedScope: tm.assignedScope })) : undefined,
      checklistItems: formChecklistItems.length > 0 ? formChecklistItems.map(ci => ({ clauseRef: ci.clauseRef, requirement: ci.requirement, evidenceExpected: ci.evidenceExpected })) : undefined,
      documentsReviewed: formDocumentsReviewed.length > 0 ? formDocumentsReviewed.map(dr => ({ docNumber: dr.docNumber, revision: dr.revision, compliance: dr.compliance })) : undefined,
      interviews: formInterviews.length > 0 ? formInterviews.map(iv => ({ person: iv.person, topics: iv.topics, keyPoints: iv.keyPoints })) : undefined,
      correctiveActions: formCorrectiveActions.length > 0 ? formCorrectiveActions.map(ca => ({ action: ca.action, responsible: ca.responsible, dueDate: ca.dueDate, requiredEvidence: ca.requiredEvidence })) : undefined,
      documentUpdates: formDocumentUpdates.length > 0 ? formDocumentUpdates.map(du => ({ document: du.document, requiredChange: du.requiredChange, changeControlRef: du.changeControlRef })) : undefined,
      trainingRequired: formTrainingRequired.length > 0 ? formTrainingRequired.map(tr => ({ scope: tr.scope, targetPersonnel: tr.targetPersonnel, plannedDate: tr.plannedDate })) : undefined,
      openingMeetingDate: formOpeningMeetingDate || undefined,
      closingMeetingDate: formClosingMeetingDate || undefined,
      attendees: formAttendees || undefined,
      generalObservations: formGeneralObservations || undefined,
      executiveSummary: formExecutiveSummary || undefined,
      complianceRating: formComplianceRating ? complianceRatingMap[formComplianceRating] : undefined,
      riskAssessment: formRiskAssessment || undefined,
      managementReviewRequired: formManagementReviewRequired || undefined,
      followUpDate: formFollowUpDate || undefined,
      nextAuditDate: formNextAuditDate || undefined,
      previousAuditRef: formPreviousAuditRef || undefined,
      criteria: formCriteria.length > 0 ? formCriteria : undefined,
      objectives: formObjectives.trim() ? formObjectives.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
      endDate: formEndDate || undefined,
      organizationId: 'org-001',
      templateId: formTemplateId && formTemplateId !== 'none' ? formTemplateId : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addAudit(newAudit);
    resetForm();
    setShowCreateDialog(false);
  };

  // ============================================================================
  // Status & Signature Handlers
  // ============================================================================

  const handleAdvanceStatus = (audit: Audit) => {
    const next = getNextAuditStatus(audit.status);
    if (!next) return;

    if (next === 'Completed') {
      setPendingCompleteAudit(audit);
      setShowSignatureModal(true);
      return;
    }

    store.updateAudit(audit.id, { status: next });
    if (selectedAudit?.id === audit.id) {
      setSelectedAudit({ ...audit, status: next });
    }
  };

  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingCompleteAudit) return;

    store.updateAudit(pendingCompleteAudit.id, {
      status: 'Completed',
      completedDate: new Date().toISOString(),
    });

    if (selectedAudit?.id === pendingCompleteAudit.id) {
      setSelectedAudit({ ...pendingCompleteAudit, status: 'Completed', completedDate: new Date().toISOString() });
    }

    setPendingCompleteAudit(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingCompleteAudit(null);
    setShowSignatureModal(false);
  };

  const openDetail = (audit: Audit) => {
    setSelectedAudit(audit);
    resetFindingForm();
    setShowDetailDialog(true);
  };

  const handleAddFinding = () => {
    if (!selectedAudit || !findingDescription.trim()) return;

    const newFinding: AuditFinding = {
      id: `finding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: findingDescription.trim(),
      severity: findingSeverity,
      referenceClause: findingReferenceClause.trim() || undefined,
      correctiveActionRequired: findingCar,
      capaId: undefined,
    };

    const existingFindings = selectedAudit.findings || [];
    const updatedFindings = [...existingFindings, newFinding];

    store.updateAudit(selectedAudit.id, { findings: updatedFindings });
    setSelectedAudit({ ...selectedAudit, findings: updatedFindings });
    resetFindingForm();
  };

  // ============================================================================
  // Step Validation
  // ============================================================================

  const isStep1Valid = formTitle.trim() !== '' && formExtendedType !== '';
  const isStep2Valid = formLeadAuditor.trim() !== '' && formStartDate !== '';
  // Steps 3-5 are optional

  // ============================================================================
  // Render: Wizard Step Content
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="grid gap-2">
        <Label>Audit Number</Label>
        <Input value={nextAuditNumber} readOnly className="bg-muted/50 text-muted-foreground font-mono" />
        <p className="text-xs text-muted-foreground">Auto-generated, read-only</p>
      </div>
      <div className="grid gap-2">
        <Label>Audit Title *</Label>
        <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., Q1 2024 Internal Quality Audit — Production" />
      </div>
      <div className="grid gap-2">
        <Label>Audit Type *</Label>
        <Select value={formExtendedType} onValueChange={setFormExtendedType}>
          <SelectTrigger><SelectValue placeholder="Select audit type" /></SelectTrigger>
          <SelectContent>
            {extendedAuditTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Audit Scope</Label>
        <Textarea
          value={formScope}
          onChange={(e) => setFormScope(e.target.value)}
          placeholder="Describe the scope of the audit, including departments, processes, and locations to be covered..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Include: departments/processes covered, physical locations, organizational units, and any exclusions with justification.
        </p>
      </div>
      <div className="grid gap-2">
        <Label>Audit Criteria</Label>
        <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/20">
          {auditCriteriaOptions.map(criterion => (
            <label key={criterion} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={formCriteria.includes(criterion)}
                onCheckedChange={(checked) => toggleCriteria(criterion, !!checked)}
              />
              <span>{criterion}</span>
            </label>
          ))}
        </div>
        {formCriteria.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {formCriteria.map(c => (
              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Audit Objectives</Label>
        <Textarea
          value={formObjectives}
          onChange={(e) => setFormObjectives(e.target.value)}
          placeholder="Define the objectives of this audit, e.g., verify conformity to ISO 13485:2016, evaluate QMS effectiveness..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Scheduled Start Date *</Label>
          <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Scheduled End Date</Label>
          <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Lead Auditor *</Label>
        <Select value={formLeadAuditor} onValueChange={setFormLeadAuditor}>
          <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
          <SelectContent>
            {profiles.map(p => <SelectItem key={p.id} value={p.fullName || p.email}>{p.fullName || p.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">Lead auditor must be independent of the audited area per ISO 19011 requirements.</p>
        </div>
      </div>

      {/* Audit Team Members */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Audit Team Members</Label>
          <Button variant="outline" size="sm" onClick={addTeamMember}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Member
          </Button>
        </div>
        {formTeamMembers.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Member</TableHead>
                  <TableHead className="w-[140px]">Role</TableHead>
                  <TableHead>Assigned Scope</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTeamMembers.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Select value={row.member} onValueChange={(v) => updateTeamMember(row.id, 'member', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => <SelectItem key={p.id} value={p.fullName || p.email}>{p.fullName || p.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row.role} onValueChange={(v) => updateTeamMember(row.id, 'role', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {teamMemberRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.assignedScope} onChange={(e) => updateTeamMember(row.id, 'assignedScope', e.target.value)} placeholder="e.g., Production area" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTeamMember(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No team members added yet</p>
        )}
      </div>

      {/* Auditees */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Auditees</Label>
          <Button variant="outline" size="sm" onClick={addAuditee}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Auditee
          </Button>
        </div>
        {formAuditees.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Auditee Name</TableHead>
                  <TableHead className="w-[150px]">Department</TableHead>
                  <TableHead>Role / Function</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formAuditees.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.name} onChange={(e) => updateAuditee(row.id, 'name', e.target.value)} placeholder="Name" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.department} onChange={(e) => updateAuditee(row.id, 'department', e.target.value)} placeholder="Department" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.roleFunction} onChange={(e) => updateAuditee(row.id, 'roleFunction', e.target.value)} placeholder="Role / Function" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAuditee(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No auditees added yet</p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Audit Checklist Items</Label>
          <Button variant="outline" size="sm" onClick={addChecklistItem}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Item
          </Button>
        </div>
        {formChecklistItems.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Clause Reference</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Evidence Expected</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formChecklistItems.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs font-mono" value={row.clauseRef} onChange={(e) => updateChecklistItem(row.id, 'clauseRef', e.target.value)} placeholder="e.g., §8.2.4" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.requirement} onChange={(e) => updateChecklistItem(row.id, 'requirement', e.target.value)} placeholder="Requirement description" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.evidenceExpected} onChange={(e) => updateChecklistItem(row.id, 'evidenceExpected', e.target.value)} placeholder="Expected evidence" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChecklistItem(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No checklist items added yet</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Previous Audit Reference</Label>
        <Input
          value={formPreviousAuditRef}
          onChange={(e) => setFormPreviousAuditRef(e.target.value)}
          placeholder="e.g., AUD-2024-005 (for follow-up verification)"
        />
        <p className="text-xs text-muted-foreground">Reference the previous audit number if this is a follow-up audit.</p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Opening Meeting Date</Label>
          <Input type="date" value={formOpeningMeetingDate} onChange={(e) => setFormOpeningMeetingDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Closing Meeting Date</Label>
          <Input type="date" value={formClosingMeetingDate} onChange={(e) => setFormClosingMeetingDate(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Attendees</Label>
        <Input value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} placeholder="List attendees at opening/closing meetings (comma-separated)" />
      </div>

      {/* Documents Reviewed */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Documents Reviewed</Label>
          <Button variant="outline" size="sm" onClick={addDocumentReviewed}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Document
          </Button>
        </div>
        {formDocumentsReviewed.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Document Number</TableHead>
                  <TableHead className="w-[100px]">Revision</TableHead>
                  <TableHead className="w-[160px]">Compliance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formDocumentsReviewed.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs font-mono" value={row.docNumber} onChange={(e) => updateDocumentReviewed(row.id, 'docNumber', e.target.value)} placeholder="e.g., SOP-QA-001" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.revision} onChange={(e) => updateDocumentReviewed(row.id, 'revision', e.target.value)} placeholder="e.g., Rev. 3" />
                    </TableCell>
                    <TableCell>
                      <Select value={row.compliance} onValueChange={(v) => updateDocumentReviewed(row.id, 'compliance', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {complianceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDocumentReviewed(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No documents reviewed yet</p>
        )}
      </div>

      {/* Interviews Conducted */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Interviews Conducted</Label>
          <Button variant="outline" size="sm" onClick={addInterview}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Interview
          </Button>
        </div>
        {formInterviews.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Person</TableHead>
                  <TableHead>Topics</TableHead>
                  <TableHead>Key Points</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formInterviews.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.person} onChange={(e) => updateInterview(row.id, 'person', e.target.value)} placeholder="Person name" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.topics} onChange={(e) => updateInterview(row.id, 'topics', e.target.value)} placeholder="Topics discussed" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.keyPoints} onChange={(e) => updateInterview(row.id, 'keyPoints', e.target.value)} placeholder="Key points noted" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeInterview(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No interviews recorded yet</p>
        )}
      </div>

      {/* General Observations */}
      <div className="grid gap-2">
        <Label>General Observations</Label>
        <Textarea
          value={formGeneralObservations}
          onChange={(e) => setFormGeneralObservations(e.target.value)}
          placeholder="Positive observations and areas of concern identified during the audit..."
          rows={4}
        />
      </div>

      {/* Findings Summary */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1">
            <Flag className="h-4 w-4" />
            Findings Summary
          </Label>
          <Button variant="outline" size="sm" onClick={addFindingRow}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Finding
          </Button>
        </div>
        {formFindings.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[120px]">Severity</TableHead>
                  <TableHead className="w-[130px]">Ref. Clause</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Objective Evidence</TableHead>
                  <TableHead className="w-[70px]">CAR Req.</TableHead>
                  <TableHead className="w-[110px]">CAPA Ref.</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formFindings.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Select value={row.severity} onValueChange={(v) => updateFindingRow(row.id, 'severity', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {findingSeverities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs font-mono" value={row.referenceClause} onChange={(e) => updateFindingRow(row.id, 'referenceClause', e.target.value)} placeholder="§8.2.4" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.description} onChange={(e) => updateFindingRow(row.id, 'description', e.target.value)} placeholder="Finding description" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.objectiveEvidence} onChange={(e) => updateFindingRow(row.id, 'objectiveEvidence', e.target.value)} placeholder="Evidence" />
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={row.carRequired} onCheckedChange={(checked) => updateFindingRow(row.id, 'carRequired', !!checked)} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.capaReference} onChange={(e) => updateFindingRow(row.id, 'capaReference', e.target.value)} placeholder="CAPA-001" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFindingRow(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No findings recorded yet</p>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-5">
      {/* Corrective Action Plan */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Corrective Action Plan</Label>
          <Button variant="outline" size="sm" onClick={addCorrectiveAction}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Action
          </Button>
        </div>
        {formCorrectiveActions.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[150px]">Responsible</TableHead>
                  <TableHead className="w-[130px]">Due Date</TableHead>
                  <TableHead>Required Evidence</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formCorrectiveActions.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.action} onChange={(e) => updateCorrectiveAction(row.id, 'action', e.target.value)} placeholder="Corrective action" />
                    </TableCell>
                    <TableCell>
                      <Select value={row.responsible} onValueChange={(v) => updateCorrectiveAction(row.id, 'responsible', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => <SelectItem key={p.id} value={p.fullName || p.email}>{p.fullName || p.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="date" className="h-8 text-xs" value={row.dueDate} onChange={(e) => updateCorrectiveAction(row.id, 'dueDate', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.requiredEvidence} onChange={(e) => updateCorrectiveAction(row.id, 'requiredEvidence', e.target.value)} placeholder="Evidence of completion" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCorrectiveAction(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No corrective actions added yet</p>
        )}
      </div>

      {/* Document Updates Required */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Document Updates Required</Label>
          <Button variant="outline" size="sm" onClick={addDocumentUpdate}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Document
          </Button>
        </div>
        {formDocumentUpdates.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Document</TableHead>
                  <TableHead>Required Change</TableHead>
                  <TableHead className="w-[160px]">Change Control Ref.</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formDocumentUpdates.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.document} onChange={(e) => updateDocumentUpdate(row.id, 'document', e.target.value)} placeholder="e.g., SOP-QA-001" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.requiredChange} onChange={(e) => updateDocumentUpdate(row.id, 'requiredChange', e.target.value)} placeholder="Describe required change" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.changeControlRef} onChange={(e) => updateDocumentUpdate(row.id, 'changeControlRef', e.target.value)} placeholder="e.g., CC-2024-012" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDocumentUpdate(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No document updates required yet</p>
        )}
      </div>

      {/* Training / Awareness Required */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Training / Awareness Required</Label>
          <Button variant="outline" size="sm" onClick={addTrainingRequired}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Training
          </Button>
        </div>
        {formTrainingRequired.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-[180px]">Target Personnel</TableHead>
                  <TableHead className="w-[140px]">Planned Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTrainingRequired.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.scope} onChange={(e) => updateTrainingRequired(row.id, 'scope', e.target.value)} placeholder="Training scope" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs" value={row.targetPersonnel} onChange={(e) => updateTrainingRequired(row.id, 'targetPersonnel', e.target.value)} placeholder="Target personnel" />
                    </TableCell>
                    <TableCell>
                      <Input type="date" className="h-8 text-xs" value={row.plannedDate} onChange={(e) => updateTrainingRequired(row.id, 'plannedDate', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTrainingRequired(row.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-md">No training requirements added yet</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Follow-Up Verification Date</Label>
        <Input type="date" value={formFollowUpDate} onChange={(e) => setFormFollowUpDate(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Executive Summary</Label>
        <Textarea
          value={formExecutiveSummary}
          onChange={(e) => setFormExecutiveSummary(e.target.value)}
          placeholder="Provide a high-level executive summary of audit results, key findings, and recommendations..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Overall Compliance Rating</Label>
          <Select value={formComplianceRating} onValueChange={setFormComplianceRating}>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              {complianceRatingOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Recommended Next Audit Date</Label>
          <Input type="date" value={formNextAuditDate} onChange={(e) => setFormNextAuditDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Risk Assessment Summary</Label>
        <Textarea
          value={formRiskAssessment}
          onChange={(e) => setFormRiskAssessment(e.target.value)}
          placeholder="Summarize risk assessment findings and their impact on the QMS..."
          rows={3}
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={formManagementReviewRequired}
          onCheckedChange={(checked) => setFormManagementReviewRequired(!!checked)}
        />
        <span>Management Review Required</span>
      </label>

      <div className="grid gap-2">
        <Label>Template associé (§4.2.4)</Label>
        <Select value={formTemplateId} onValueChange={setFormTemplateId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un template..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {store.formTemplates
              .filter(t => (t.templateStatus === 'Approved' || (t.isActive && !t.templateStatus)) && (t.associatedModule === 'AUDIT' || !t.associatedModule || t.associatedModule === 'GENERAL'))
              .map(t => (
                <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version})</SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (wizardStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Audits
          </h1>
          <p className="text-muted-foreground mt-1">Plan, conduct and track quality audits (ISO 13485 §8.2.4) <Badge variant="outline" className="ml-2 text-xs">ISO 13485 §4.2.4</Badge></p>
        </div>
        {hasPermission('audit.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Audit
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Planned</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.planned}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.inProgress}</span>
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
      </div>

      {/* Filters */}
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
            {auditTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-xs">{audit.title}</p>
                        {audit.scope && <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{audit.scope}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{audit.type}</Badge></TableCell>
                    <TableCell className="text-sm">{audit.leadAuditor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(audit.scheduledDate, true)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[audit.status])} variant="secondary">{audit.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {audit.findings && audit.findings.length > 0 ? (
                        <Badge variant="outline" className="text-xs">{audit.findings.length}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAudits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audits found matching filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Create Audit Dialog — Multi-Step Wizard                             */}
      {/* ================================================================== */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Create New Audit
            </DialogTitle>
          </DialogHeader>

          {/* Wizard Stepper */}
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {wizardSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = wizardStep === step.id;
              const isCompleted = wizardStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => { if (isCompleted || step.id <= wizardStep) setWizardStep(step.id); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer' :
                      'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {step.label}
                  </button>
                  {i < wizardSteps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="py-2">
            {renderStepContent()}
          </div>

          <Separator />

          {/* Wizard Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
              disabled={wizardStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <span className="text-xs text-muted-foreground">Step {wizardStep} of {wizardSteps.length}</span>
            {wizardStep < wizardSteps.length ? (
              <Button
                onClick={() => setWizardStep(prev => Math.min(wizardSteps.length, prev + 1))}
                disabled={(wizardStep === 1 && !isStep1Valid) || (wizardStep === 2 && !isStep2Valid)}
              >
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!isStep1Valid || !isStep2Valid}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Create Audit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Detail Dialog — Enhanced                                            */}
      {/* ================================================================== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedAudit.auditNumber}</span>
                  {selectedAudit.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedAudit.status])} variant="secondary">{selectedAudit.status}</Badge>
                  <Badge variant="outline">{selectedAudit.type}</Badge>
                  {selectedAudit.findings && selectedAudit.findings.some(f => f.severity === 'Critical') && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" variant="secondary">Critical Findings</Badge>
                  )}
                  {selectedAudit.findings && selectedAudit.findings.some(f => f.severity === 'Major') && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" variant="secondary">Major Findings</Badge>
                  )}
                </div>

                {/* Status Flow */}
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

                {/* Section: Audit Metadata */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />Audit Planning
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Audit Number:</span>{' '}
                      <span className="font-mono font-medium">{selectedAudit.auditNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>{' '}
                      <span className="font-medium">{selectedAudit.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead Auditor:</span>{' '}
                      <span className="font-medium">{selectedAudit.leadAuditor}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scheduled Date:</span>{' '}
                      <span className="font-medium">{formatDate(selectedAudit.scheduledDate)}</span>
                    </div>
                    {selectedAudit.completedDate && (
                      <div>
                        <span className="text-muted-foreground">Completed Date:</span>{' '}
                        <span className="font-medium">{formatDate(selectedAudit.completedDate)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      <span className="font-medium">{formatDate(selectedAudit.createdAt)}</span>
                    </div>
                    {selectedAudit.auditees && selectedAudit.auditees.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Auditees:</span>{' '}
                        <span className="font-medium">{selectedAudit.auditees.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope */}
                {selectedAudit.scope && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Scope</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedAudit.scope}</p>
                  </div>
                )}

                <Separator />

                {/* Section: Findings with Severity Color Coding */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <Flag className="h-4 w-4" />
                      Findings ({selectedAudit.findings?.length || 0})
                    </h4>
                    {hasPermission('audit.update') && selectedAudit.status !== 'Completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddFinding(!showAddFinding)}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Add Finding
                      </Button>
                    )}
                  </div>

                  {/* Add Finding Form */}
                  {showAddFinding && (
                    <div className="border rounded-md p-4 space-y-3 mb-3 bg-muted/20">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Severity *</Label>
                          <Select value={findingSeverity} onValueChange={(v) => setFindingSeverity(v as AuditFinding['severity'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {findingSeverities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Reference Clause</Label>
                          <Input
                            value={findingReferenceClause}
                            onChange={(e) => setFindingReferenceClause(e.target.value)}
                            placeholder="e.g., ISO 13485 §8.2.4"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Description *</Label>
                        <Textarea
                          value={findingDescription}
                          onChange={(e) => setFindingDescription(e.target.value)}
                          placeholder="Describe the finding..."
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={findingCar}
                            onCheckedChange={(checked) => setFindingCar(!!checked)}
                          />
                          Corrective Action Required (CAR)
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddFinding} disabled={!findingDescription.trim()}>
                          Add Finding
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetFindingForm}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Findings List — Color-coded severity */}
                  {selectedAudit.findings && selectedAudit.findings.length > 0 ? (
                    <div className="space-y-2">
                      {selectedAudit.findings.map((f, idx) => {
                        const linkedCapa = getLinkedCapa(f.capaId);
                        return (
                          <div key={f.id} className={cn(
                            'border rounded-md p-3',
                            f.severity === 'Critical' ? 'border-l-4 border-l-red-500' :
                            f.severity === 'Major' ? 'border-l-4 border-l-orange-500' :
                            f.severity === 'Minor' ? 'border-l-4 border-l-amber-500' :
                            'border-l-4 border-l-blue-500'
                          )}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                              <Badge className={cn('text-xs', findingSeverityColors[f.severity])} variant="secondary">{f.severity}</Badge>
                              {f.correctiveActionRequired && (
                                <Badge variant="outline" className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-400">
                                  CAR Required
                                </Badge>
                              )}
                              {f.referenceClause && (
                                <span className="text-xs text-muted-foreground font-mono">{f.referenceClause}</span>
                              )}
                            </div>
                            <p className="text-sm mt-1">{f.description}</p>
                            {f.capaId && linkedCapa ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Link2 className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-muted-foreground">Linked CAPA:</span>
                                <Badge variant="outline" className="font-mono text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                                  {linkedCapa.capaNumber}
                                </Badge>
                              </div>
                            ) : f.correctiveActionRequired && !f.capaId ? (
                              <div className="mt-2">
                                {hasPermission('capa.create') ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                      setPendingFindingForCapa({ findingId: f.id, findingDesc: f.description });
                                      setCapaFromFindingTitle(`CAPA - ${f.description}`);
                                      setCapaFromFindingPriority(f.severity === 'Critical' ? 'Critical' : f.severity === 'Major' ? 'High' : 'Medium');
                                      setCapaFromFindingAssignedTo('');
                                      setCapaFromFindingDueDate('');
                                      setShowCreateCapaFromFinding(true);
                                    }}
                                  >
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Create CAPA
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                    CAR Required — No CAPA
                                  </Badge>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-md">
                      No findings recorded yet
                    </p>
                  )}
                </div>

                <Separator />

                {/* Section: Compliance Summary */}
                {selectedAudit.findings && selectedAudit.findings.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />Findings Summary
                    </h4>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {findingSeverities.map(sev => {
                        const count = selectedAudit.findings?.filter(f => f.severity === sev).length || 0;
                        return count > 0 ? (
                          <div key={sev} className="flex items-center gap-1.5">
                            <Badge className={cn('text-xs', findingSeverityColors[sev])} variant="secondary">{sev}</Badge>
                            <span className="font-medium">{count}</span>
                          </div>
                        ) : null;
                      })}
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">{selectedAudit.findings.length}</span>
                      </div>
                      {selectedAudit.findings.some(f => f.correctiveActionRequired) && (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-400">CAR</Badge>
                          <span className="font-medium">{selectedAudit.findings.filter(f => f.correctiveActionRequired).length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Extended Audit Data Sections */}
                {(selectedAudit.teamMembers && selectedAudit.teamMembers.length > 0) ||
                 (selectedAudit.checklistItems && selectedAudit.checklistItems.length > 0) ||
                 (selectedAudit.documentsReviewed && selectedAudit.documentsReviewed.length > 0) ||
                 (selectedAudit.correctiveActions && selectedAudit.correctiveActions.length > 0) ||
                 selectedAudit.executiveSummary ||
                 selectedAudit.criteria ||
                 selectedAudit.objectives ||
                 selectedAudit.endDate ||
                 selectedAudit.openingMeetingDate ||
                 selectedAudit.closingMeetingDate ||
                 selectedAudit.attendees ||
                 selectedAudit.generalObservations ||
                 selectedAudit.riskAssessment ||
                 selectedAudit.managementReviewRequired ||
                 selectedAudit.followUpDate ||
                 selectedAudit.nextAuditDate ||
                 selectedAudit.previousAuditRef ||
                 selectedAudit.complianceRating ? (
                  <>
                    <Separator />

                    {/* Schedule & Meetings */}
                    {(selectedAudit.endDate || selectedAudit.openingMeetingDate || selectedAudit.closingMeetingDate || selectedAudit.attendees) && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />Schedule & Meetings
                        </h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {selectedAudit.endDate && (
                            <div>
                              <span className="text-muted-foreground">End Date:</span>{' '}
                              <span className="font-medium">{formatDate(selectedAudit.endDate)}</span>
                            </div>
                          )}
                          {selectedAudit.openingMeetingDate && (
                            <div>
                              <span className="text-muted-foreground">Opening Meeting:</span>{' '}
                              <span className="font-medium">{formatDate(selectedAudit.openingMeetingDate)}</span>
                            </div>
                          )}
                          {selectedAudit.closingMeetingDate && (
                            <div>
                              <span className="text-muted-foreground">Closing Meeting:</span>{' '}
                              <span className="font-medium">{formatDate(selectedAudit.closingMeetingDate)}</span>
                            </div>
                          )}
                          {selectedAudit.attendees && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Attendees:</span>{' '}
                              <span className="font-medium">{selectedAudit.attendees}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Criteria & Objectives */}
                    {(selectedAudit.criteria || selectedAudit.objectives || selectedAudit.previousAuditRef) && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />Planning Details
                        </h4>
                        <div className="text-sm space-y-2">
                          {selectedAudit.criteria && selectedAudit.criteria.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Criteria:</span>{' '}
                              <span className="flex flex-wrap gap-1 mt-0.5">
                                {selectedAudit.criteria.map(c => (
                                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                                ))}
                              </span>
                            </div>
                          )}
                          {selectedAudit.objectives && selectedAudit.objectives.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Objectives:</span>
                              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                {selectedAudit.objectives.map((o, i) => (
                                  <li key={i} className="text-muted-foreground">{o}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedAudit.previousAuditRef && (
                            <div>
                              <span className="text-muted-foreground">Previous Audit Ref:</span>{' '}
                              <span className="font-mono font-medium">{selectedAudit.previousAuditRef}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Team Members */}
                    {selectedAudit.teamMembers && selectedAudit.teamMembers.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Team Members</h4>
                        <div className="text-sm space-y-0.5">
                          {selectedAudit.teamMembers.map((tm, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="font-medium">{tm.member}</span>
                              <span className="text-muted-foreground">— {tm.role}</span>
                              {tm.assignedScope && <span className="text-muted-foreground text-xs">({tm.assignedScope})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Checklist Items */}
                    {selectedAudit.checklistItems && selectedAudit.checklistItems.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Checklist</h4>
                        <div className="text-sm space-y-0.5">
                          {selectedAudit.checklistItems.map((ci, i) => (
                            <div key={i} className="flex gap-2">
                              <Badge variant="outline" className="text-xs font-mono">{ci.clauseRef}</Badge>
                              <span>{ci.requirement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents Reviewed */}
                    {selectedAudit.documentsReviewed && selectedAudit.documentsReviewed.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Documents Reviewed</h4>
                        <div className="text-sm space-y-0.5">
                          {selectedAudit.documentsReviewed.map((dr, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="font-mono">{dr.docNumber}</span>
                              <span className="text-muted-foreground">Rev. {dr.revision}</span>
                              <Badge variant="outline" className={cn('text-xs', complianceColors[dr.compliance] || '')}>{dr.compliance}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Corrective Actions */}
                    {selectedAudit.correctiveActions && selectedAudit.correctiveActions.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Corrective Actions</h4>
                        <div className="text-sm space-y-0.5">
                          {selectedAudit.correctiveActions.map((ca, i) => (
                            <div key={i} className="flex gap-2">
                              <span>{ca.action}</span>
                              <span className="text-muted-foreground">— {ca.responsible}</span>
                              {ca.dueDate && <span className="text-xs text-muted-foreground">Due: {ca.dueDate}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* General Observations */}
                    {selectedAudit.generalObservations && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">General Observations</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedAudit.generalObservations}</p>
                      </div>
                    )}

                    {/* Executive Summary */}
                    {selectedAudit.executiveSummary && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Executive Summary</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedAudit.executiveSummary}</p>
                      </div>
                    )}

                    {/* Compliance & Risk */}
                    {(selectedAudit.complianceRating || selectedAudit.riskAssessment || selectedAudit.managementReviewRequired || selectedAudit.followUpDate || selectedAudit.nextAuditDate) && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />Closure & Compliance
                        </h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {selectedAudit.complianceRating && (
                            <div>
                              <span className="text-muted-foreground">Compliance Rating:</span>{' '}
                              <Badge className={cn('text-xs', ratingColors[complianceRatingOptions[selectedAudit.complianceRating - 1] || ''] || '')} variant="secondary">
                                {complianceRatingOptions[selectedAudit.complianceRating - 1] || `${selectedAudit.complianceRating}/5`}
                              </Badge>
                            </div>
                          )}
                          {selectedAudit.managementReviewRequired && (
                            <div>
                              <span className="text-muted-foreground">Management Review:</span>{' '}
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            </div>
                          )}
                          {selectedAudit.followUpDate && (
                            <div>
                              <span className="text-muted-foreground">Follow-Up Date:</span>{' '}
                              <span className="font-medium">{formatDate(selectedAudit.followUpDate)}</span>
                            </div>
                          )}
                          {selectedAudit.nextAuditDate && (
                            <div>
                              <span className="text-muted-foreground">Next Audit Date:</span>{' '}
                              <span className="font-medium">{formatDate(selectedAudit.nextAuditDate)}</span>
                            </div>
                          )}
                          {selectedAudit.riskAssessment && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Risk Assessment:</span>
                              <p className="text-sm text-muted-foreground mt-0.5">{selectedAudit.riskAssessment}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                {/* Electronic Signature Section for Completed Audits */}
                {selectedAudit.status === 'Completed' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-700 dark:text-green-400">
                      <p className="font-medium">Electronically Signed</p>
                      <p className="mt-0.5 text-xs">This audit has been closed with an electronic signature per 21 CFR Part 11 requirements.</p>
                      {selectedAudit.completedDate && (
                        <p className="text-xs mt-1">Completed: {formatDate(selectedAudit.completedDate)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Hybrid Supervision: Template associé (§4.2.4) */}
                {selectedAudit.templateId && (() => {
                  const tmpl = store.formTemplates.find(t => t.id === selectedAudit.templateId);
                  return tmpl ? (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        Template associé (§4.2.4)
                      </h4>
                      <div className="border rounded-md p-2 text-sm flex items-center justify-between">
                        <div>
                          <span className="font-medium">{tmpl.title}</span>
                          <span className="text-muted-foreground ml-2">v{tmpl.version}</span>
                        </div>
                        <Badge className={tmpl.templateStatus === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : tmpl.templateStatus === 'Obsolete' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'} variant="secondary">
                          {tmpl.templateStatus || (tmpl.isActive ? 'Approved' : 'Draft')}
                        </Badge>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Advance Status Button */}
                {hasPermission('audit.update') && selectedAudit.status !== 'Completed' && (() => {
                  const nextStatus = getNextAuditStatus(selectedAudit.status);
                  if (!nextStatus) return null;
                  const isComplete = nextStatus === 'Completed';
                  return (
                    <Button className="w-full" onClick={() => handleAdvanceStatus(selectedAudit)}>
                      {isComplete ? (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Complete with Electronic Signature
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

      {/* P2-4: Create CAPA from Finding Dialog */}
      <Dialog open={showCreateCapaFromFinding} onOpenChange={(open) => { setShowCreateCapaFromFinding(open); if (!open) setPendingFindingForCapa(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Create CAPA from Finding
            </DialogTitle>
          </DialogHeader>
          {pendingFindingForCapa && selectedAudit && (
            <div className="space-y-4">
              {/* Finding context */}
              <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
                <p><span className="font-medium">Audit:</span> <span className="font-mono">{selectedAudit.auditNumber}</span></p>
                <p><span className="font-medium">Finding:</span> {pendingFindingForCapa.findingDesc}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                A new CAPA will be created and bidirectionally linked to this audit finding.
              </p>

              {/* Title */}
              <div className="grid gap-2">
                <Label>CAPA Title</Label>
                <Input
                  value={capaFromFindingTitle}
                  onChange={(e) => setCapaFromFindingTitle(e.target.value)}
                  placeholder="CAPA title"
                />
              </div>

              {/* Priority */}
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={capaFromFindingPriority} onValueChange={(v) => setCapaFromFindingPriority(v as CapaPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To */}
              <div className="grid gap-2">
                <Label>Assigned To</Label>
                <Select value={capaFromFindingAssignedTo} onValueChange={setCapaFromFindingAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.fullName || p.email}>{p.fullName || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={capaFromFindingDueDate}
                  onChange={(e) => setCapaFromFindingDueDate(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowCreateCapaFromFinding(false); setPendingFindingForCapa(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAudit || !pendingFindingForCapa) return;
                    const newCapa = store.createCapaFromAuditFinding(
                      selectedAudit.id,
                      pendingFindingForCapa.findingId,
                      {
                        title: capaFromFindingTitle,
                        description: pendingFindingForCapa.findingDesc,
                        priority: capaFromFindingPriority,
                        assignedTo: capaFromFindingAssignedTo || currentUser?.id || 'user-001',
                        dueDate: capaFromFindingDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                      }
                    );
                    if (newCapa) {
                      // Refresh selectedAudit with updated findings
                      const updatedAudit = store.audits.find(a => a.id === selectedAudit.id);
                      if (updatedAudit) {
                        setSelectedAudit(updatedAudit);
                      }
                    }
                    setShowCreateCapaFromFinding(false);
                    setPendingFindingForCapa(null);
                  }}
                  disabled={!capaFromFindingTitle.trim() || !capaFromFindingAssignedTo}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Create CAPA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingCompleteAudit ? `${pendingCompleteAudit.auditNumber} — ${pendingCompleteAudit.title}` : ''}
        recordId={pendingCompleteAudit?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
