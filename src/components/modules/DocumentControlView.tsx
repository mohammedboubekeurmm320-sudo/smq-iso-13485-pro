'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Document, DocumentType, DocumentStatus, DocumentLevel, DocumentClassification, SignatureType, ElectronicSignature } from '@/types/qms';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import {
  FileText,
  Plus,
  Search,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GitBranch,
  Layers,
  History,
  Link2,
  ClipboardCheck,
  Tag,
  FileSearch,
  UserCheck,
  ListChecks,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Constants ───────────────────────────────────────────────────────────────

const statusColors: Record<DocumentStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Obsolete': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const levelLabels: Record<DocumentLevel, string> = {
  1: 'N1',
  2: 'N2',
  3: 'N3',
  4: 'N4',
};

const levelColors: Record<DocumentLevel, string> = {
  1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  2: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  3: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  4: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const classificationLabels: Record<DocumentClassification, string> = {
  'Internal': 'Interne',
  'External': 'Externe',
  'Regulatory': 'Réglementaire',
  'Confidential': 'Confidentiel',
};

const statusFlow: DocumentStatus[] = ['Draft', 'In Review', 'Approved', 'Obsolete'];

const WIZARD_STEPS = [
  { id: 0, label: 'Document Identification', icon: FileText },
  { id: 1, label: 'Classification & Level', icon: Tag },
  { id: 2, label: 'Description & Scope', icon: FileSearch },
  { id: 3, label: 'Review & Approval Setup', icon: UserCheck },
  { id: 4, label: 'Summary & Submit', icon: ListChecks },
];

function getNextStatus(current: DocumentStatus): DocumentStatus | null {
  const idx = statusFlow.indexOf(current);
  return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
}

const documentTypes: DocumentType[] = ['SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical', 'Risk Analysis', 'Validation Protocol', 'Record'];
const documentStatuses: DocumentStatus[] = ['Draft', 'In Review', 'Approved', 'Obsolete'];
const documentClassifications: DocumentClassification[] = ['Internal', 'External', 'Regulatory', 'Confidential'];
const documentLevels: DocumentLevel[] = [1, 2, 3, 4];

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentControlView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const documents = store.documents;
  const profiles = store.profiles;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialogs
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingStatusAdvance, setPendingStatusAdvance] = useState<Document | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);

  // Step 1 - Document Identification
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DocumentType>('SOP');

  // Step 2 - Classification & Level
  const [formClassification, setFormClassification] = useState<DocumentClassification>('Internal');
  const [formLevel, setFormLevel] = useState<DocumentLevel>(2);
  const [formDepartment, setFormDepartment] = useState('');
  const [formRetentionPeriod, setFormRetentionPeriod] = useState('');

  // Step 3 - Description & Scope
  const [formDescription, setFormDescription] = useState('');
  const [formScope, setFormScope] = useState('');
  const [formParentDocId, setFormParentDocId] = useState('');

  // Step 4 - Review & Approval Setup
  const [formApprover, setFormApprover] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formNextReview, setFormNextReview] = useState('');
  const [formRegulatoryRef, setFormRegulatoryRef] = useState('');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = searchTerm === '' ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const getParentDocument = (parentId?: string) => {
    if (!parentId) return null;
    return documents.find(d => d.id === parentId) || null;
  };

  const getChildDocuments = (docId: string) => {
    return documents.filter(d => d.parentDocumentId === docId);
  };

  // ── Step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formDocNumber.trim() !== '' && formTitle.trim() !== '' && formType.trim() !== '';
      case 1:
        return formClassification.trim() !== '' && formLevel !== undefined;
      case 2:
        return formDescription.trim() !== '';
      case 3:
        return formApprover !== '' && formEffectiveDate !== '';
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
    setFormDocNumber('');
    setFormTitle('');
    setFormType('SOP');
    setFormDescription('');
    setFormDepartment('');
    setFormClassification('Internal');
    setFormLevel(2);
    setFormScope('');
    setFormRetentionPeriod('');
    setFormParentDocId('');
    setFormApprover('');
    setFormEffectiveDate('');
    setFormNextReview('');
    setFormRegulatoryRef('');
  };

  // Create document that actually saves to the store
  const handleCreate = () => {
    if (!formDocNumber.trim() || !formTitle.trim()) return;

    const newDoc: Document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      documentNumber: formDocNumber.trim(),
      title: formTitle.trim(),
      type: formType,
      version: '1.0',
      status: 'Draft',
      description: formDescription.trim() || undefined,
      department: formDepartment.trim() || undefined,
      classification: formClassification,
      documentLevel: formLevel,
      scope: formScope.trim() || undefined,
      retentionPeriod: formRetentionPeriod.trim() || undefined,
      parentDocumentId: formParentDocId || undefined,
      effectiveDate: formEffectiveDate ? new Date(formEffectiveDate).toISOString() : undefined,
      nextReview: formNextReview ? new Date(formNextReview).toISOString() : undefined,
      references: formRegulatoryRef.trim() || undefined,
      owner: currentUser?.fullName || currentUser?.email,
      createdById: currentUser?.id,
      authorId: currentUser?.id,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signatures: [],
    };
    store.addDocument(newDoc);
    resetForm();
    setShowNewDocDialog(false);
  };

  // Open detail dialog
  const openDetail = (doc: Document) => {
    setSelectedDoc(doc);
    setShowDetailDialog(true);
  };

  // Status advancement
  const handleAdvanceStatus = (doc: Document) => {
    const next = getNextStatus(doc.status);
    if (!next) return;

    // If advancing to Approved, require electronic signature
    if (next === 'Approved') {
      setPendingStatusAdvance(doc);
      setShowSignatureModal(true);
      return;
    }

    // For other status transitions, just update directly
    store.updateDocument(doc.id, {
      status: next,
      effectiveDate: (next as DocumentStatus) === 'Approved' ? new Date().toISOString() : undefined,
      lastReviewed: (next as DocumentStatus) === 'In Review' ? new Date().toISOString() : undefined,
    });

    if (selectedDoc?.id === doc.id) {
      setSelectedDoc({
        ...doc,
        status: next,
        effectiveDate: (next as DocumentStatus) === 'Approved' ? new Date().toISOString() : doc.effectiveDate,
        lastReviewed: (next as DocumentStatus) === 'In Review' ? new Date().toISOString() : doc.lastReviewed,
      });
    }
  };

  // Electronic signature callback
  const handleSignatureConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingStatusAdvance) return;

    const doc = pendingStatusAdvance;
    const newSignature: ElectronicSignature = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      documentId: doc.id,
      signedById: currentUser?.id || 'unknown',
      signerName: currentUser?.fullName || currentUser?.email || 'Unknown',
      signerRole: 'Approver',
      signatureType: signatureData.signatureType,
      signatureHash: signatureData.signatureHash,
      revoked: false,
      createdAt: signatureData.signedAt,
    };

    const existingSignatures = doc.signatures || [];
    store.updateDocument(doc.id, {
      status: 'Approved',
      effectiveDate: new Date().toISOString(),
      signatures: [...existingSignatures, newSignature],
    });

    if (selectedDoc?.id === doc.id) {
      setSelectedDoc({
        ...doc,
        status: 'Approved',
        effectiveDate: new Date().toISOString(),
        signatures: [...existingSignatures, newSignature],
      });
    }

    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingStatusAdvance(null);
    setShowSignatureModal(false);
  };

  // ── Render: Wizard Step Content ──
  const renderStepContent = () => {
    switch (wizardStep) {
      // ── Step 1: Document Identification ──
      case 0:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-number">Document Number *</Label>
              <Input
                id="doc-number"
                value={formDocNumber}
                onChange={(e) => setFormDocNumber(e.target.value)}
                placeholder="SOP-QMS-XXX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-type">Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-title-inline">Title *</Label>
                <Input
                  id="doc-title-inline"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>
            </div>
            <div className="bg-muted/30 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                The document number should follow your organization&apos;s naming convention (e.g., SOP-QMS-001, WI-PROD-010).
              </p>
            </div>
          </div>
        );

      // ── Step 2: Classification & Level ──
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Classification *</Label>
                <Select value={formClassification} onValueChange={(v) => setFormClassification(v as DocumentClassification)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentClassifications.map(c => (
                      <SelectItem key={c} value={c}>{classificationLabels[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Document Level *</Label>
                <Select value={String(formLevel)} onValueChange={(v) => setFormLevel(Number(v) as DocumentLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentLevels.map(l => (
                      <SelectItem key={l} value={String(l)}>{levelLabels[l]} — Level {l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-department">Department</Label>
                <Input
                  id="doc-department"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="Quality, Production..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-retention">Retention Period</Label>
                <Input
                  id="doc-retention"
                  value={formRetentionPeriod}
                  onChange={(e) => setFormRetentionPeriod(e.target.value)}
                  placeholder="e.g. 5 years"
                />
              </div>
            </div>
            {/* Document Level Legend */}
            <div className="bg-muted/30 rounded-md p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Document Level Hierarchy</p>
              <div className="grid grid-cols-2 gap-2">
                {documentLevels.map(l => (
                  <div key={l} className="flex items-center gap-2">
                    <Badge className={cn('text-xs font-mono', levelColors[l])} variant="secondary">
                      {levelLabels[l]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {l === 1 && 'Policy / Manual'}
                      {l === 2 && 'SOP / Standard'}
                      {l === 3 && 'Work Instruction'}
                      {l === 4 && 'Form / Record'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ── Step 3: Description & Scope ──
      case 2:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-description">Description *</Label>
              <Textarea
                id="doc-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Document description and purpose"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-scope">Scope / Périmètre</Label>
              <Textarea
                id="doc-scope"
                value={formScope}
                onChange={(e) => setFormScope(e.target.value)}
                placeholder="Document scope and applicability"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Parent Document</Label>
              <Select value={formParentDocId} onValueChange={setFormParentDocId}>
                <SelectTrigger><SelectValue placeholder="Select parent document" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {documents.filter(d => d.status === 'Approved').map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.documentNumber} — {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formParentDocId && formParentDocId !== 'none' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-2">
                <GitBranch className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-700 dark:text-blue-400 font-medium">Linked to Parent Document</p>
                  <p className="text-blue-600 dark:text-blue-400/80 text-xs mt-0.5">
                    This document will be shown as a child of{' '}
                    {documents.find(d => d.id === formParentDocId)?.documentNumber || 'selected parent'}.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      // ── Step 4: Review & Approval Setup ──
      case 3:
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="effective-date">Effective Date *</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={formEffectiveDate}
                  onChange={(e) => setFormEffectiveDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="next-review-date">Next Review Date</Label>
                <Input
                  id="next-review-date"
                  type="date"
                  value={formNextReview}
                  onChange={(e) => setFormNextReview(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="regulatory-ref">Regulatory References</Label>
                <Input
                  id="regulatory-ref"
                  value={formRegulatoryRef}
                  onChange={(e) => setFormRegulatoryRef(e.target.value)}
                  placeholder="e.g., ISO 13485 §4.2, 21 CFR 820"
                />
              </div>
            </div>
            <div className="bg-muted/30 rounded-md p-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-muted-foreground">Electronic Signature Required</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Advancing this document to &quot;Approved&quot; status will require an electronic signature per 21 CFR Part 11 and EU Annex 11.
                </p>
              </div>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1 — Document Identification</p>
                <p className="text-sm"><span className="font-medium">Document Number:</span> <span className="font-mono">{formDocNumber || '—'}</span></p>
                <p className="text-sm"><span className="font-medium">Title:</span> {formTitle || '—'}</p>
                <p className="text-sm"><span className="font-medium">Type:</span> {formType}</p>
              </div>

              {/* Step 2 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2 — Classification & Level</p>
                <p className="text-sm"><span className="font-medium">Classification:</span> {classificationLabels[formClassification]}</p>
                <p className="text-sm">
                  <span className="font-medium">Document Level:</span>{' '}
                  <Badge className={cn('text-xs font-mono', levelColors[formLevel])} variant="secondary">{levelLabels[formLevel]}</Badge>
                </p>
                <p className="text-sm"><span className="font-medium">Department:</span> {formDepartment || '—'}</p>
                <p className="text-sm"><span className="font-medium">Retention Period:</span> {formRetentionPeriod || '—'}</p>
              </div>

              {/* Step 3 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 3 — Description & Scope</p>
                <p className="text-sm"><span className="font-medium">Description:</span> {formDescription || '—'}</p>
                {formScope && <p className="text-sm"><span className="font-medium">Scope:</span> {formScope}</p>}
                <p className="text-sm">
                  <span className="font-medium">Parent Document:</span>{' '}
                  {formParentDocId && formParentDocId !== 'none'
                    ? (() => {
                        const parent = documents.find(d => d.id === formParentDocId);
                        return parent ? `${parent.documentNumber} — ${parent.title}` : formParentDocId;
                      })()
                    : 'None (top-level)'}
                </p>
              </div>

              {/* Step 4 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 4 — Review & Approval Setup</p>
                <p className="text-sm"><span className="font-medium">Approver:</span> {formApprover ? getUserName(formApprover) : '—'}</p>
                <p className="text-sm"><span className="font-medium">Effective Date:</span> {formEffectiveDate || '—'}</p>
                <p className="text-sm"><span className="font-medium">Next Review Date:</span> {formNextReview || '—'}</p>
                {formRegulatoryRef && <p className="text-sm"><span className="font-medium">Regulatory References:</span> {formRegulatoryRef}</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Summary counts
  const summaryCounts = {
    total: documents.length,
    approved: documents.filter(d => d.status === 'Approved').length,
    inReview: documents.filter(d => d.status === 'In Review').length,
    draft: documents.filter(d => d.status === 'Draft').length,
    obsolete: documents.filter(d => d.status === 'Obsolete').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Document Control
          </h1>
          <p className="text-muted-foreground mt-1">Gestion des documents qualité / Quality Document Management <Badge variant="outline" className="ml-2 text-xs">ISO 13485 §4.2</Badge></p>
        </div>
        {hasPermission('documents.create') && (
          <Button onClick={() => { resetForm(); setShowNewDocDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.approved}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">In Review</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.inReview}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
            <span className="text-2xl font-bold text-gray-600">{summaryCounts.draft}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Obsolete</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.obsolete}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {documentStatuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Doc Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[80px]">Level</TableHead>
                  <TableHead className="w-[90px]">Type</TableHead>
                  <TableHead className="w-[70px]">Version</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[120px]">Department</TableHead>
                  <TableHead className="w-[100px]">Effective</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const childDocs = getChildDocuments(doc.id);
                  const parentDoc = getParentDocument(doc.parentDocumentId);
                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(doc)}>
                      <TableCell className="font-mono text-xs">{doc.documentNumber}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {doc.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{doc.description}</p>
                            )}
                          </div>
                          {/* Parent/child link indicators */}
                          {(parentDoc || childDocs.length > 0) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Link2 className="h-3 w-3 text-muted-foreground" />
                              {parentDoc && (
                                <span className="text-xs text-muted-foreground">↑ {parentDoc.documentNumber}</span>
                              )}
                              {childDocs.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {parentDoc ? ' · ' : ''}↓ {childDocs.length}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.documentLevel && (
                          <Badge className={cn('text-xs font-mono', levelColors[doc.documentLevel])} variant="secondary">
                            {levelLabels[doc.documentLevel]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1">
                          <History className="h-3 w-3 text-muted-foreground" />
                          {doc.version}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[doc.status])} variant="secondary">
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.department || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.effectiveDate, true)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(doc); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {hasPermission('documents.update') && doc.status !== 'Obsolete' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(doc); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {hasPermission('documents.approve') && getNextStatus(doc.status) && doc.status !== 'Obsolete' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(doc); }}>
                                  {getNextStatus(doc.status) === 'Approved' ? (
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                  ) : (
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                  )}
                                  Advance to {getNextStatus(doc.status)}
                                </DropdownMenuItem>
                              </>
                            )}
                            {hasPermission('documents.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No documents found matching filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Document Dialog — Wizard */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create New Document
            </DialogTitle>
          </DialogHeader>

          {/* Wizard Step Indicator */}
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
                    {idx < wizardStep ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className={cn(
                        'flex items-center justify-center h-5 w-5 rounded-full text-xs border',
                        idx === wizardStep ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400',
                      )}>{idx + 1}</span>
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
          <div className="py-2 min-h-[280px]">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => { resetForm(); setShowNewDocDialog(false); }} disabled={false}>Cancel</Button>
            <div className="flex gap-2">
              {wizardStep > 0 && (
                <Button variant="outline" onClick={goPrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
              )}
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button onClick={goNext} disabled={!isStepValid(wizardStep)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={!isStepValid(wizardStep)} className="bg-green-600 hover:bg-green-700 text-white">
                  Create Document
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedDoc.documentNumber}</span>
                  {selectedDoc.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status & Level Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedDoc.status])} variant="secondary">{selectedDoc.status}</Badge>
                  <Badge variant="outline">{selectedDoc.type}</Badge>
                  {selectedDoc.documentLevel && (
                    <Badge className={cn(levelColors[selectedDoc.documentLevel])} variant="secondary">
                      <Layers className="h-3 w-3 mr-1" />
                      {levelLabels[selectedDoc.documentLevel]}
                    </Badge>
                  )}
                  {selectedDoc.classification && (
                    <Badge variant="outline">{classificationLabels[selectedDoc.classification]}</Badge>
                  )}
                  <Badge variant="outline" className="font-mono">
                    <History className="h-3 w-3 mr-1" />
                    v{selectedDoc.version}
                  </Badge>
                </div>

                {/* Status Flow */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {statusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedDoc.status ? 'bg-primary text-primary-foreground' :
                        statusFlow.indexOf(s) < statusFlow.indexOf(selectedDoc.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Key Information */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Document Number:</span>{' '}
                    <span className="font-mono font-medium">{selectedDoc.documentNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>{' '}
                    <span className="font-medium">{selectedDoc.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">{selectedDoc.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>{' '}
                    <span className="font-medium">{selectedDoc.department || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classification:</span>{' '}
                    <span className="font-medium">{selectedDoc.classification ? classificationLabels[selectedDoc.classification] : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retention:</span>{' '}
                    <span className="font-medium">{selectedDoc.retentionPeriod || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner:</span>{' '}
                    <span className="font-medium">{selectedDoc.owner || getUserName(selectedDoc.createdById)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created By:</span>{' '}
                    <span className="font-medium">{getUserName(selectedDoc.createdById)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <span className="font-medium">{formatDate(selectedDoc.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>{' '}
                    <span className="font-medium">{formatDate(selectedDoc.updatedAt)}</span>
                  </div>
                  {selectedDoc.effectiveDate && (
                    <div>
                      <span className="text-muted-foreground">Effective Date:</span>{' '}
                      <span className="font-medium">{formatDate(selectedDoc.effectiveDate)}</span>
                    </div>
                  )}
                  {selectedDoc.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Expiration:</span>{' '}
                      <span className="font-medium">{formatDate(selectedDoc.expirationDate)}</span>
                    </div>
                  )}
                  {selectedDoc.lastReviewed && (
                    <div>
                      <span className="text-muted-foreground">Last Reviewed:</span>{' '}
                      <span className="font-medium">{formatDate(selectedDoc.lastReviewed)}</span>
                    </div>
                  )}
                  {selectedDoc.nextReview && (
                    <div>
                      <span className="text-muted-foreground">Next Review:</span>{' '}
                      <span className="font-medium">{formatDate(selectedDoc.nextReview)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {selectedDoc.description && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDoc.description}</p>
                  </div>
                )}

                {/* Scope */}
                {selectedDoc.scope && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Scope / Périmètre</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDoc.scope}</p>
                  </div>
                )}

                {/* References */}
                {selectedDoc.references && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">References</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedDoc.references}</p>
                  </div>
                )}

                {/* Parent/Child Document Links */}
                {(getParentDocument(selectedDoc.parentDocumentId) || getChildDocuments(selectedDoc.id).length > 0) && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <GitBranch className="h-4 w-4" />
                      Document Hierarchy / Hiérarchie des documents
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-md space-y-2">
                      {getParentDocument(selectedDoc.parentDocumentId) && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Parent:</span>
                          <Badge variant="outline" className="font-mono text-xs cursor-pointer" onClick={() => openDetail(getParentDocument(selectedDoc.parentDocumentId)!)}>
                            ↑ {getParentDocument(selectedDoc.parentDocumentId)!.documentNumber}
                          </Badge>
                          <span className="text-muted-foreground truncate">{getParentDocument(selectedDoc.parentDocumentId)!.title}</span>
                        </div>
                      )}
                      {getChildDocuments(selectedDoc.id).length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Child documents:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getChildDocuments(selectedDoc.id).map(child => (
                              <Badge key={child.id} variant="outline" className="font-mono text-xs cursor-pointer" onClick={() => openDetail(child)}>
                                ↓ {child.documentNumber}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Electronic Signatures */}
                {selectedDoc.signatures && selectedDoc.signatures.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      Electronic Signatures / Signatures électroniques
                    </h4>
                    <div className="space-y-2">
                      {selectedDoc.signatures.map((sig) => (
                        <div key={sig.id} className="bg-muted/30 p-3 rounded-md flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-green-500" />
                              <span className="font-medium">{sig.signerName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{sig.signatureType}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono">{sig.signatureHash.substring(0, 20)}...</span>
                            <span className="text-xs text-muted-foreground">{formatDate(sig.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advance Status Button */}
                {hasPermission('documents.approve') && getNextStatus(selectedDoc.status) && selectedDoc.status !== 'Obsolete' && (
                  <Button className="w-full" onClick={() => handleAdvanceStatus(selectedDoc)}>
                    {getNextStatus(selectedDoc.status) === 'Approved' ? (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Approve with Electronic Signature
                      </>
                    ) : (
                      <>
                        Advance to {getNextStatus(selectedDoc.status)}
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

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingStatusAdvance ? `${pendingStatusAdvance.documentNumber} — ${pendingStatusAdvance.title}` : ''}
        recordId={pendingStatusAdvance?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
