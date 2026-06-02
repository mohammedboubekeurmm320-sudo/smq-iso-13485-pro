'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import type { Supplier, SupplierCategory, SupplierStatus, QualificationMethod, SignatureType } from '@/types/qms';
import {
  Truck, Plus, Search, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  Award, FileText, Edit3, Save, Star, CalendarClock, TrendingUp,
  Globe, User, Mail, Phone, MapPin, Shield, ClipboardCheck,
  Building2, Siren, ChevronLeft, ChevronRight, ListChecks, ShieldCheck,
  Link2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';

const statusColors: Record<SupplierStatus, string> = {
  'Qualified': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Conditional': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Disqualified': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Under Evaluation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const supplierStatusFlow: SupplierStatus[] = ['Under Evaluation', 'Conditional', 'Qualified'];

const supplierCategories: SupplierCategory[] = [
  'Raw Material', 'Packaging', 'Equipment', 'Service',
  'Contract Manufacturer', 'Laboratory', 'Other',
];

const qualificationMethods: QualificationMethod[] = [
  'On-Site Audit', 'Questionnaire', 'Certificate Review', 'Third-Party Assessment', 'Historical Performance',
];

const qualificationMethodIcons: Record<QualificationMethod, React.ReactNode> = {
  'On-Site Audit': <Shield className="h-3 w-3" />,
  'Questionnaire': <ClipboardCheck className="h-3 w-3" />,
  'Certificate Review': <Award className="h-3 w-3" />,
  'Third-Party Assessment': <Building2 className="h-3 w-3" />,
  'Historical Performance': <TrendingUp className="h-3 w-3" />,
};

const WIZARD_STEPS = [
  { id: 0, label: 'Supplier Identification', icon: Truck },
  { id: 1, label: 'Primary Contact', icon: User },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Qualification & Certification', icon: Shield },
  { id: 4, label: 'Summary & Submit', icon: ListChecks },
];

const qualificationMethodBadgeColors: Record<QualificationMethod, string> = {
  'On-Site Audit': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Questionnaire': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Certificate Review': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Third-Party Assessment': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Historical Performance': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Acceptable';
  return 'Needs Improvement';
}

function isReviewApproaching(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return false;
  const reviewDate = new Date(nextReviewDate);
  const now = new Date();
  const daysUntilReview = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilReview <= 30 && daysUntilReview >= 0;
}

function isReviewOverdue(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return false;
  const reviewDate = new Date(nextReviewDate);
  return reviewDate < new Date();
}

function getDaysUntilReview(nextReviewDate?: string): number | null {
  if (!nextReviewDate) return null;
  const reviewDate = new Date(nextReviewDate);
  const now = new Date();
  return Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getRequalStatus(nextReviewDate?: string): 'overdue' | 'due-soon' | 'ok' | 'none' {
  if (!nextReviewDate) return 'none';
  if (isReviewOverdue(nextReviewDate)) return 'overdue';
  if (isReviewApproaching(nextReviewDate)) return 'due-soon';
  return 'ok';
}

export function SupplierView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const suppliers = store.suppliers;
  const documents = store.documents;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Create form state — existing
  const [formAutoCode, setFormAutoCode] = useState(true);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<SupplierCategory>('Raw Material');
  const [formQualDate, setFormQualDate] = useState('');
  const [formNextReviewDate, setFormNextReviewDate] = useState('');
  const [formCertifications, setFormCertifications] = useState('');

  // Create form state — new fields
  const [formWebsite, setFormWebsite] = useState('');
  const [formPrimaryContactName, setFormPrimaryContactName] = useState('');
  const [formPrimaryContactEmail, setFormPrimaryContactEmail] = useState('');
  const [formPrimaryContactPhone, setFormPrimaryContactPhone] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStateProvince, setFormStateProvince] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formEmergencyContactName, setFormEmergencyContactName] = useState('');
  const [formEmergencyContactPhone, setFormEmergencyContactPhone] = useState('');
  const [formQualificationMethod, setFormQualificationMethod] = useState<QualificationMethod>('On-Site Audit');
  const [formQualificationDocRef, setFormQualificationDocRef] = useState('');
  const [formLinkedDocIds, setFormLinkedDocIds] = useState<string[]>([]);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);

  // Inline performance score editing
  const [editingScore, setEditingScore] = useState(false);
  const [editScoreValue, setEditScoreValue] = useState('');

  // E-signature state for supplier qualification/disqualification (21 CFR Part 11 / ISO 13485 §7.4)
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingSupplierAction, setPendingSupplierAction] = useState<{ supplier: Supplier; action: 'qualify' | 'disqualify' } | null>(null);

  // Detail dialog — document linking state
  const [showLinkDocs, setShowLinkDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = searchTerm === '' ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.primaryContactName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.country || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const summaryCounts = {
    qualified: suppliers.filter(s => s.status === 'Qualified').length,
    conditional: suppliers.filter(s => s.status === 'Conditional').length,
    disqualified: suppliers.filter(s => s.status === 'Disqualified').length,
    evaluation: suppliers.filter(s => s.status === 'Under Evaluation').length,
  };

  const avgScore = suppliers.length > 0
    ? Math.round(
        suppliers
          .filter(s => s.performanceScore !== undefined && s.performanceScore > 0)
          .reduce((sum, s) => sum + (s.performanceScore || 0), 0) /
        Math.max(suppliers.filter(s => s.performanceScore !== undefined && s.performanceScore > 0).length, 1)
      )
    : 0;

  const generateSupplierCode = () => {
    const count = suppliers.length + 1;
    return `SUP-${String(count).padStart(3, '0')}`;
  };

  const resetForm = () => {
    setWizardStep(0);
    setFormAutoCode(true);
    setFormCode('');
    setFormName('');
    setFormCategory('Raw Material');
    setFormQualDate('');
    setFormNextReviewDate('');
    setFormCertifications('');
    setFormWebsite('');
    setFormPrimaryContactName('');
    setFormPrimaryContactEmail('');
    setFormPrimaryContactPhone('');
    setFormStreet('');
    setFormCity('');
    setFormStateProvince('');
    setFormPostalCode('');
    setFormCountry('');
    setFormEmergencyContactName('');
    setFormEmergencyContactPhone('');
    setFormQualificationMethod('On-Site Audit');
    setFormQualificationDocRef('');
    setFormLinkedDocIds([]);
  };

  const handleCreate = () => {
    const code = formAutoCode ? generateSupplierCode() : formCode;
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      supplierCode: code,
      name: formName,
      category: formCategory,
      status: 'Under Evaluation',
      qualificationDate: formQualDate ? new Date(formQualDate).toISOString() : undefined,
      nextReviewDate: formNextReviewDate ? new Date(formNextReviewDate).toISOString() : undefined,
      certifications: formCertifications ? formCertifications.split(',').map(c => c.trim()).filter(Boolean) : [],
      performanceScore: 0,
      website: formWebsite || undefined,
      primaryContactName: formPrimaryContactName || undefined,
      primaryContactEmail: formPrimaryContactEmail || undefined,
      primaryContactPhone: formPrimaryContactPhone || undefined,
      street: formStreet || undefined,
      city: formCity || undefined,
      stateProvince: formStateProvince || undefined,
      postalCode: formPostalCode || undefined,
      country: formCountry || undefined,
      emergencyContactName: formEmergencyContactName || undefined,
      emergencyContactPhone: formEmergencyContactPhone || undefined,
      qualificationMethod: formQualificationMethod,
      qualificationDocRef: formQualificationDocRef || undefined,
      linkedDocumentIds: formLinkedDocIds.length > 0 ? formLinkedDocIds : undefined,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    store.addSupplier(newSupplier);
    resetForm();
    setShowCreateDialog(false);
  };

  const handleStatusAdvancement = (supplier: Supplier, newStatus: SupplierStatus) => {
    // Require e-signature for qualification (21 CFR Part 11 / ISO 13485 §7.4)
    if (newStatus === 'Qualified') {
      setPendingSupplierAction({ supplier, action: 'qualify' });
      setShowSignatureModal(true);
      return;
    }
    // Other status changes don't require e-signature
    const updates: Partial<Supplier> = { status: newStatus };
    store.updateSupplier(supplier.id, updates);
    if (selectedSupplier?.id === supplier.id) {
      setSelectedSupplier({ ...supplier, ...updates });
    }
  };

  const handleDisqualify = (supplier: Supplier) => {
    setPendingSupplierAction({ supplier, action: 'disqualify' });
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = (data: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (!pendingSupplierAction) return;
    const { supplier, action } = pendingSupplierAction;

    if (action === 'qualify') {
      const updates: Partial<Supplier> = {
        status: 'Qualified',
        qualificationDate: new Date().toISOString(),
      };
      if (supplier.performanceScore === undefined || supplier.performanceScore === 0) {
        updates.performanceScore = 80;
      }
      store.updateSupplier(supplier.id, updates);
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier({ ...supplier, ...updates });
      }
    } else if (action === 'disqualify') {
      store.updateSupplier(supplier.id, { status: 'Disqualified' });
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier({ ...supplier, status: 'Disqualified' });
      }
    }

    setPendingSupplierAction(null);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setPendingSupplierAction(null);
    setShowSignatureModal(false);
  };

  const handleSaveScore = () => {
    if (!selectedSupplier) return;
    const score = parseInt(editScoreValue);
    if (isNaN(score) || score < 0 || score > 100) return;
    store.updateSupplier(selectedSupplier.id, { performanceScore: score });
    setSelectedSupplier({ ...selectedSupplier, performanceScore: score });
    setEditingScore(false);
    setEditScoreValue('');
  };

  const getQualificationDocument = (docId?: string) => {
    if (!docId) return null;
    return documents.find(d => d.id === docId) || null;
  };

  const openDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditingScore(false);
    setEditScoreValue('');
    setShowDetailDialog(true);
  };

  // ── Wizard step validation ──
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formName.trim() !== '' && (formAutoCode || formCode.trim() !== '');
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return !!formQualificationMethod;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ── Wizard navigation ──
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

  // ── Render: Wizard Step Content ──
  const renderStepContent = () => {
    switch (wizardStep) {
      // ── Step 1: Supplier Identification ──
      case 0:
        return (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="autoCode" className="text-sm">Auto-generate supplier code</Label>
              <input
                id="autoCode"
                type="checkbox"
                checked={formAutoCode}
                onChange={(e) => setFormAutoCode(e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
            {!formAutoCode && (
              <div className="grid gap-2">
                <Label>Supplier Code *</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="SUP-XXX" />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Supplier name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as SupplierCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {supplierCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Website</Label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 2: Primary Contact ──
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Contact Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formPrimaryContactName}
                  onChange={(e) => setFormPrimaryContactName(e.target.value)}
                  placeholder="Full name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formPrimaryContactEmail}
                    onChange={(e) => setFormPrimaryContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formPrimaryContactPhone}
                    onChange={(e) => setFormPrimaryContactPhone(e.target.value)}
                    placeholder="+1 555 1234567"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 3: Address ──
      case 2:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Street</Label>
              <Input
                value={formStreet}
                onChange={(e) => setFormStreet(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label>State / Province</Label>
                <Input
                  value={formStateProvince}
                  onChange={(e) => setFormStateProvince(e.target.value)}
                  placeholder="State or province"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Postal Code</Label>
                <Input
                  value={formPostalCode}
                  onChange={(e) => setFormPostalCode(e.target.value)}
                  placeholder="Postal / ZIP code"
                />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>
        );

      // ── Step 4: Qualification & Certification ──
      case 3:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Qualification Method *</Label>
              <Select value={formQualificationMethod} onValueChange={(v) => setFormQualificationMethod(v as QualificationMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {qualificationMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Qualification Date</Label>
                <Input type="date" value={formQualDate} onChange={(e) => setFormQualDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Next Review Date</Label>
                <Input type="date" value={formNextReviewDate} onChange={(e) => setFormNextReviewDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Certifications (comma separated)</Label>
              <Input value={formCertifications} onChange={(e) => setFormCertifications(e.target.value)} placeholder="ISO 9001, ISO 13485, ..." />
            </div>
            <div className="grid gap-2">
              <Label>Qualification Documents Reference</Label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formQualificationDocRef}
                  onChange={(e) => setFormQualificationDocRef(e.target.value)}
                  placeholder="QA-AUD-2024-XXX"
                  className="pl-9"
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={formEmergencyContactName}
                  onChange={(e) => setFormEmergencyContactName(e.target.value)}
                  placeholder="Emergency contact name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={formEmergencyContactPhone}
                  onChange={(e) => setFormEmergencyContactPhone(e.target.value)}
                  placeholder="+1 555 9999999"
                />
              </div>
            </div>
            <Separator />
            {/* Linked Documents */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4" /> Linked Documents
              </Label>
              <p className="text-xs text-muted-foreground">Select approved/effective documents to associate with this supplier.</p>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {documents.filter(d => d.status === 'Approved' || d.status === 'Effective').length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No approved or effective documents available.</p>
                ) : (
                  documents
                    .filter(d => d.status === 'Approved' || d.status === 'Effective')
                    .map(doc => (
                      <label
                        key={doc.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 border-b last:border-b-0',
                          formLinkedDocIds.includes(doc.id) && 'bg-primary/5'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={formLinkedDocIds.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormLinkedDocIds([...formLinkedDocIds, doc.id]);
                            } else {
                              setFormLinkedDocIds(formLinkedDocIds.filter(id => id !== doc.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground">{doc.documentNumber}</span>
                        <span className="truncate">{doc.title}</span>
                      </label>
                    ))
                )}
              </div>
              {formLinkedDocIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{formLinkedDocIds.length} document(s) selected</p>
              )}
            </div>
          </div>
        );

      // ── Step 5: Summary & Submit ──
      case 4:
        return (
          <div className="grid gap-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 max-h-[440px] overflow-y-auto">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Review Summary
              </h4>

              {/* Step 1 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1 — Supplier Identification</p>
                <p className="text-sm"><span className="font-medium">Code:</span> {formAutoCode ? generateSupplierCode() : formCode || '—'}</p>
                <p className="text-sm"><span className="font-medium">Name:</span> {formName || '—'}</p>
                <p className="text-sm"><span className="font-medium">Category:</span> {formCategory}</p>
                {formWebsite && <p className="text-sm"><span className="font-medium">Website:</span> {formWebsite}</p>}
              </div>

              {/* Step 2 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2 — Primary Contact</p>
                <p className="text-sm"><span className="font-medium">Contact Name:</span> {formPrimaryContactName || '—'}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {formPrimaryContactEmail || '—'}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {formPrimaryContactPhone || '—'}</p>
              </div>

              {/* Step 3 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 3 — Address</p>
                {formStreet && <p className="text-sm"><span className="font-medium">Street:</span> {formStreet}</p>}
                <p className="text-sm">
                  <span className="font-medium">City:</span> {formCity || '—'}
                  {formStateProvince && <span className="ml-2"><span className="font-medium">State/Province:</span> {formStateProvince}</span>}
                </p>
                <p className="text-sm">
                  {formPostalCode && <span><span className="font-medium">Postal Code:</span> {formPostalCode}</span>}
                  {formCountry && <span className="ml-2"><span className="font-medium">Country:</span> {formCountry}</span>}
                </p>
                {!formStreet && !formCity && !formStateProvince && !formPostalCode && !formCountry && (
                  <p className="text-sm text-muted-foreground">No address provided</p>
                )}
              </div>

              {/* Step 4 Summary */}
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 4 — Qualification & Certification</p>
                <p className="text-sm"><span className="font-medium">Qualification Method:</span> {formQualificationMethod}</p>
                {formQualDate && <p className="text-sm"><span className="font-medium">Qualification Date:</span> {formQualDate}</p>}
                {formNextReviewDate && <p className="text-sm"><span className="font-medium">Next Review Date:</span> {formNextReviewDate}</p>}
                {formCertifications && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm font-medium">Certifications:</span>
                    {formCertifications.split(',').map(c => c.trim()).filter(Boolean).map((cert, i) => (
                      <Badge key={i} variant="outline" className="text-xs"><Award className="h-3 w-3 mr-1" />{cert}</Badge>
                    ))}
                  </div>
                )}
                {formQualificationDocRef && <p className="text-sm"><span className="font-medium">Doc Reference:</span> {formQualificationDocRef}</p>}
                {formEmergencyContactName && <p className="text-sm"><span className="font-medium">Emergency Contact:</span> {formEmergencyContactName}{formEmergencyContactPhone ? ` (${formEmergencyContactPhone})` : ''}</p>}
              </div>

              {/* Linked Documents Summary */}
              {formLinkedDocIds.length > 0 && (
                <div className="border rounded-md p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Documents</p>
                  {formLinkedDocIds.map(docId => {
                    const doc = documents.find(d => d.id === docId);
                    return doc ? (
                      <p key={docId} className="text-sm flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground">{doc.documentNumber}</span>
                        <span>{doc.title}</span>
                      </p>
                    ) : null;
                  })}
                </div>
              )}
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
            <Truck className="h-6 w-6 text-primary" />
            Suppliers
          </h1>
          <p className="text-muted-foreground mt-1">Supplier qualification and management <Badge variant="outline" className="ml-2 text-xs">ISO 13485 §7.4</Badge></p>
        </div>
        {hasPermission('supplier.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Supplier
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Qualified</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.qualified}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Conditional</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.conditional}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Disqualified</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.disqualified}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Under Evaluation</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{summaryCounts.evaluation}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg. Performance</span>
            </div>
            <span className={cn('text-2xl font-bold', avgScore > 0 ? getScoreColorClass(avgScore) : 'text-muted-foreground')}>
              {avgScore > 0 ? avgScore : 'N/A'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers, contacts, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Qualified">Qualified</SelectItem>
            <SelectItem value="Conditional">Conditional</SelectItem>
            <SelectItem value="Disqualified">Disqualified</SelectItem>
            <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {supplierCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[130px]">Category</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[130px]">Qual. Method</TableHead>
                  <TableHead className="w-[140px]">Performance</TableHead>
                  <TableHead className="w-[110px]">Next Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map(supplier => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(supplier)}>
                    <TableCell className="font-mono text-xs">{supplier.supplierCode}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.city && supplier.country && (
                          <p className="text-xs text-muted-foreground">{supplier.city}, {supplier.country}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{supplier.category}</Badge></TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[supplier.status])} variant="secondary">
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {supplier.qualificationMethod ? (
                        <Badge className={cn('text-[10px] gap-1', qualificationMethodBadgeColors[supplier.qualificationMethod])} variant="secondary">
                          {qualificationMethodIcons[supplier.qualificationMethod]}
                          {supplier.qualificationMethod}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.performanceScore !== undefined && supplier.performanceScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', getScoreBarColor(supplier.performanceScore))}
                              style={{ width: `${supplier.performanceScore}%` }}
                            />
                          </div>
                          <span className={cn('text-sm font-medium', getScoreColorClass(supplier.performanceScore))}>
                            {supplier.performanceScore}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">N/A</span>}
                    </TableCell>
                    <TableCell>
                      {supplier.nextReviewDate ? (
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'text-sm',
                            isReviewOverdue(supplier.nextReviewDate) ? 'text-red-600 font-medium' :
                            isReviewApproaching(supplier.nextReviewDate) ? 'text-amber-600' :
                            'text-muted-foreground'
                          )}>
                            {formatDate(supplier.nextReviewDate, true)}
                          </span>
                          {(isReviewOverdue(supplier.nextReviewDate) || isReviewApproaching(supplier.nextReviewDate)) && (
                            <CalendarClock className={cn(
                              'h-3 w-3',
                              isReviewOverdue(supplier.nextReviewDate) ? 'text-red-500' : 'text-amber-500'
                            )} />
                          )}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ====================== Create Supplier Dialog (Wizard) ====================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Supplier</DialogTitle></DialogHeader>

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
                <Button onClick={handleCreate} disabled={!isStepValid(wizardStep)} className="bg-green-600 hover:bg-green-700 text-white">Create Supplier</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====================== Detail Dialog ====================== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedSupplier.supplierCode}</span>
                  {selectedSupplier.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Badge & Category */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedSupplier.status])} variant="secondary">
                    {selectedSupplier.status}
                  </Badge>
                  {selectedSupplier.category && <Badge variant="outline">{selectedSupplier.category}</Badge>}
                  {selectedSupplier.qualificationMethod && (
                    <Badge className={cn('gap-1', qualificationMethodBadgeColors[selectedSupplier.qualificationMethod])} variant="secondary">
                      {qualificationMethodIcons[selectedSupplier.qualificationMethod]}
                      {selectedSupplier.qualificationMethod}
                    </Badge>
                  )}
                </div>

                {/* Status Flow Visualization */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {supplierStatusFlow.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedSupplier.status ? 'bg-primary text-primary-foreground' :
                        supplierStatusFlow.indexOf(s) < supplierStatusFlow.indexOf(selectedSupplier.status) ?
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < supplierStatusFlow.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                  {/* Branch for Disqualified */}
                  {selectedSupplier.status === 'Disqualified' && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className={cn('px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap', statusColors['Disqualified'])}>
                        Disqualified
                      </div>
                    </>
                  )}
                </div>

                {/* Contact Information Section */}
                {(selectedSupplier.primaryContactName || selectedSupplier.primaryContactEmail || selectedSupplier.primaryContactPhone || selectedSupplier.website) && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                      <User className="h-4 w-4" /> Contact Information
                    </h4>
                    <Card>
                      <CardContent className="pt-3 pb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {selectedSupplier.primaryContactName && (
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">Primary:</span>
                              <span className="font-medium">{selectedSupplier.primaryContactName}</span>
                            </div>
                          )}
                          {selectedSupplier.primaryContactEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">Email:</span>
                              <a href={`mailto:${selectedSupplier.primaryContactEmail}`} className="font-medium text-primary hover:underline truncate">
                                {selectedSupplier.primaryContactEmail}
                              </a>
                            </div>
                          )}
                          {selectedSupplier.primaryContactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium">{selectedSupplier.primaryContactPhone}</span>
                            </div>
                          )}
                          {selectedSupplier.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">Web:</span>
                              <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate">
                                {selectedSupplier.website}
                              </a>
                            </div>
                          )}
                          {selectedSupplier.emergencyContactName && (
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <Siren className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                              <span className="text-muted-foreground">Emergency:</span>
                              <span className="font-medium">{selectedSupplier.emergencyContactName}</span>
                              {selectedSupplier.emergencyContactPhone && (
                                <span className="text-muted-foreground">({selectedSupplier.emergencyContactPhone})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Address Section */}
                {(selectedSupplier.street || selectedSupplier.city || selectedSupplier.country) && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> Address
                    </h4>
                    <Card>
                      <CardContent className="pt-3 pb-3">
                        <div className="text-sm">
                          {selectedSupplier.street && <p className="font-medium">{selectedSupplier.street}</p>}
                          <p>
                            {[selectedSupplier.city, selectedSupplier.stateProvince].filter(Boolean).join(', ')}
                            {selectedSupplier.postalCode ? ` ${selectedSupplier.postalCode}` : ''}
                          </p>
                          {selectedSupplier.country && <p className="text-muted-foreground">{selectedSupplier.country}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Supplier Metadata */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Code:</span>{' '}
                    <span className="font-mono font-medium">{selectedSupplier.supplierCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{selectedSupplier.name}</span>
                  </div>
                  {selectedSupplier.category && (
                    <div>
                      <span className="text-muted-foreground">Category:</span>{' '}
                      <span className="font-medium">{selectedSupplier.category}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge className={cn('text-xs ml-1', statusColors[selectedSupplier.status])} variant="secondary">
                      {selectedSupplier.status}
                    </Badge>
                  </div>
                  {selectedSupplier.qualificationDate && (
                    <div>
                      <span className="text-muted-foreground">Qualified Date:</span>{' '}
                      <span className="font-medium">{formatDate(selectedSupplier.qualificationDate)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <span className="font-medium">{formatDate(selectedSupplier.createdAt)}</span>
                  </div>
                </div>

                <Separator />

                {/* Qualification Details Section */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Qualification Details
                  </h4>
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Method:</span>{' '}
                          {selectedSupplier.qualificationMethod ? (
                            <Badge className={cn('ml-1 gap-1', qualificationMethodBadgeColors[selectedSupplier.qualificationMethod])} variant="secondary">
                              {qualificationMethodIcons[selectedSupplier.qualificationMethod]}
                              {selectedSupplier.qualificationMethod}
                            </Badge>
                          ) : <span className="text-muted-foreground">Not specified</span>}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Documents Ref:</span>{' '}
                          {selectedSupplier.qualificationDocRef ? (
                            <span className="font-mono font-medium ml-1">{selectedSupplier.qualificationDocRef}</span>
                          ) : <span className="text-muted-foreground">Not specified</span>}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next Review:</span>{' '}
                          {selectedSupplier.nextReviewDate ? (
                            <span className={cn(
                              'font-medium ml-1',
                              isReviewOverdue(selectedSupplier.nextReviewDate) ? 'text-red-600' :
                              isReviewApproaching(selectedSupplier.nextReviewDate) ? 'text-amber-600' : ''
                            )}>
                              {formatDate(selectedSupplier.nextReviewDate)}
                            </span>
                          ) : <span className="text-muted-foreground">Not scheduled</span>}
                        </div>
                        {selectedSupplier.qualificationDate && (
                          <div>
                            <span className="text-muted-foreground">Qualified On:</span>{' '}
                            <span className="font-medium ml-1">{formatDate(selectedSupplier.qualificationDate)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Re-qualification Timeline Visualization */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" /> Re-qualification Timeline
                  </h4>
                  {(() => {
                    const requalStatus = getRequalStatus(selectedSupplier.nextReviewDate);
                    const daysLeft = getDaysUntilReview(selectedSupplier.nextReviewDate);

                    if (requalStatus === 'none') {
                      return (
                        <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                          No re-qualification review scheduled.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {/* Visual timeline bar */}
                        <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              requalStatus === 'overdue' ? 'bg-red-500' :
                              requalStatus === 'due-soon' ? 'bg-amber-500' :
                              'bg-green-500'
                            )}
                            style={{
                              width: requalStatus === 'overdue' ? '100%' :
                              `${Math.max(5, Math.min(95, daysLeft !== null ? 100 - (daysLeft / 365 * 100) : 50))}%`
                            }}
                          />
                        </div>
                        {/* Status indicators */}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                            requalStatus === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            requalStatus === 'due-soon' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          )}>
                            {requalStatus === 'overdue' ? (
                              <><XCircle className="h-3 w-3" /> Overdue</>
                            ) : requalStatus === 'due-soon' ? (
                              <><AlertTriangle className="h-3 w-3" /> Due Soon</>
                            ) : (
                              <><CheckCircle2 className="h-3 w-3" /> On Track</>
                            )}
                          </div>
                          {daysLeft !== null && (
                            <span className={cn(
                              'text-sm',
                              requalStatus === 'overdue' ? 'text-red-600 font-medium' :
                              requalStatus === 'due-soon' ? 'text-amber-600' :
                              'text-muted-foreground'
                            )}>
                              {daysLeft < 0
                                ? `${Math.abs(daysLeft)} days overdue`
                                : `${daysLeft} days remaining`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Certifications */}
                {selectedSupplier.certifications && selectedSupplier.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Award className="h-4 w-4" /> Certifications
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />{cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Score */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <Star className="h-4 w-4" /> Performance Score
                  </h4>
                  {editingScore ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editScoreValue}
                        onChange={(e) => setEditScoreValue(e.target.value)}
                        className="w-[80px] h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveScore();
                          if (e.key === 'Escape') { setEditingScore(false); setEditScoreValue(''); }
                        }}
                      />
                      <span className="text-sm text-muted-foreground">/ 100</span>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveScore}>
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingScore(false); setEditScoreValue(''); }}>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                'text-2xl font-bold',
                                selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0
                                  ? getScoreColorClass(selectedSupplier.performanceScore)
                                  : 'text-muted-foreground'
                              )}>
                                {selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0
                                  ? selectedSupplier.performanceScore
                                  : 'N/A'}
                              </span>
                              {hasPermission('supplier.update') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingScore(true);
                                    setEditScoreValue(String(selectedSupplier.performanceScore || ''));
                                  }}
                                >
                                  <Edit3 className="h-3 w-3 mr-1" />Edit
                                </Button>
                              )}
                            </div>
                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0
                                    ? getScoreBarColor(selectedSupplier.performanceScore)
                                    : 'bg-muted'
                                )}
                                style={{ width: `${selectedSupplier.performanceScore || 0}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                              <span>0</span>
                              <span className={cn(
                                selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0
                                  ? getScoreColorClass(selectedSupplier.performanceScore)
                                  : ''
                              )}>
                                {selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0
                                  ? getScoreLabel(selectedSupplier.performanceScore)
                                  : 'Not rated'}
                              </span>
                              <span>100</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Qualification Document Link */}
                {selectedSupplier.qualificationDocId && (() => {
                  const qualDoc = getQualificationDocument(selectedSupplier.qualificationDocId);
                  return (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <FileText className="h-4 w-4" /> Qualification Document
                      </h4>
                      <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        {qualDoc ? (
                          <div>
                            <p className="text-sm font-medium">{qualDoc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {qualDoc.documentNumber} · v{qualDoc.version} · <Badge className={cn('text-[10px]', qualDoc.status === 'Approved' ? 'bg-green-100 text-green-700' : '')} variant="secondary">{qualDoc.status}</Badge>
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Document ref: {selectedSupplier.qualificationDocId}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Linked Documents */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm flex items-center gap-1">
                      <Link2 className="h-4 w-4" /> Linked Documents
                    </h4>
                    {hasPermission('supplier.update') && !showLinkDocs && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowLinkDocs(true); setSelectedDocIds([]); }}>
                        <Plus className="h-3 w-3 mr-1" />Add Documents
                      </Button>
                    )}
                  </div>
                  {(selectedSupplier.linkedDocumentIds && selectedSupplier.linkedDocumentIds.length > 0) ? (
                    <div className="space-y-1.5">
                      {selectedSupplier.linkedDocumentIds.map(docId => {
                        const doc = documents.find(d => d.id === docId);
                        return doc ? (
                          <div key={docId} className="bg-muted/30 p-2 rounded-md flex items-center gap-3">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.documentNumber} · v{doc.version} · <Badge className={cn('text-[10px]', doc.status === 'Approved' ? 'bg-green-100 text-green-700' : doc.status === 'Effective' ? 'bg-emerald-100 text-emerald-700' : '')} variant="secondary">{doc.status}</Badge>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div key={docId} className="bg-muted/30 p-2 rounded-md flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">Document ref: {docId}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents linked to this supplier.</p>
                  )}
                  {/* Add Documents dropdown */}
                  {showLinkDocs && (
                    <div className="mt-3 border rounded-md p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select documents to link</p>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {documents
                          .filter(d => d.status === 'Approved' || d.status === 'Effective')
                          .filter(d => !(selectedSupplier.linkedDocumentIds || []).includes(d.id))
                          .length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No additional approved/effective documents available to link.</p>
                        ) : (
                          documents
                            .filter(d => d.status === 'Approved' || d.status === 'Effective')
                            .filter(d => !(selectedSupplier.linkedDocumentIds || []).includes(d.id))
                            .map(doc => (
                              <label
                                key={doc.id}
                                className={cn(
                                  'flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded hover:bg-muted/50',
                                  selectedDocIds.includes(doc.id) && 'bg-primary/5'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDocIds.includes(doc.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDocIds([...selectedDocIds, doc.id]);
                                    } else {
                                      setSelectedDocIds(selectedDocIds.filter(id => id !== doc.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="font-mono text-xs text-muted-foreground">{doc.documentNumber}</span>
                                <span className="truncate">{doc.title}</span>
                              </label>
                            ))
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={selectedDocIds.length === 0}
                          onClick={() => {
                            if (selectedDocIds.length > 0) {
                              store.linkDocumentsToSupplier(selectedSupplier.id, selectedDocIds);
                              const updatedLinkedDocIds = [...(selectedSupplier.linkedDocumentIds || []), ...selectedDocIds];
                              setSelectedSupplier({ ...selectedSupplier, linkedDocumentIds: updatedLinkedDocIds });
                              setSelectedDocIds([]);
                              setShowLinkDocs(false);
                            }
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1" />
                          Link {selectedDocIds.length > 0 ? `(${selectedDocIds.length})` : ''}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowLinkDocs(false); setSelectedDocIds([]); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Re-qualification Warning */}
                {selectedSupplier.nextReviewDate && (isReviewApproaching(selectedSupplier.nextReviewDate) || isReviewOverdue(selectedSupplier.nextReviewDate)) && selectedSupplier.status === 'Qualified' && (
                  <div className={cn(
                    'border rounded-md p-3 flex items-start gap-2',
                    isReviewOverdue(selectedSupplier.nextReviewDate)
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  )}>
                    <CalendarClock className={cn(
                      'h-4 w-4 mt-0.5 flex-shrink-0',
                      isReviewOverdue(selectedSupplier.nextReviewDate) ? 'text-red-500' : 'text-amber-500'
                    )} />
                    <div className={cn(
                      'text-sm',
                      isReviewOverdue(selectedSupplier.nextReviewDate)
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    )}>
                      <p className="font-medium">
                        {isReviewOverdue(selectedSupplier.nextReviewDate)
                          ? 'Re-qualification Overdue'
                          : 'Re-qualification Due Soon'}
                      </p>
                      <p>Next review date: {formatDate(selectedSupplier.nextReviewDate)}</p>
                    </div>
                  </div>
                )}

                {/* Status Advancement Actions */}
                {hasPermission('supplier.update') && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplier.status === 'Under Evaluation' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusAdvancement(selectedSupplier, 'Conditional')}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />Set Conditional
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusAdvancement(selectedSupplier, 'Qualified')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />Qualify
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisqualify(selectedSupplier)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Disqualify
                        </Button>
                      </>
                    )}
                    {selectedSupplier.status === 'Conditional' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusAdvancement(selectedSupplier, 'Qualified')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />Qualify
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisqualify(selectedSupplier)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Disqualify
                        </Button>
                      </>
                    )}
                    {selectedSupplier.status === 'Qualified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusAdvancement(selectedSupplier, 'Conditional')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />Set Conditional
                      </Button>
                    )}
                    {selectedSupplier.status === 'Disqualified' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusAdvancement(selectedSupplier, 'Qualified')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />Re-qualify
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal for Supplier Qualification/Disqualification (21 CFR Part 11) */}
      <ElectronicSignatureModal
        open={showSignatureModal}
        onClose={handleSignatureCancel}
        onSign={handleSignatureConfirm}
        recordTitle={pendingSupplierAction ? `${pendingSupplierAction.action === 'qualify' ? 'Qualification' : 'Disqualification'}: ${pendingSupplierAction.supplier.name}` : ''}
        recordId={pendingSupplierAction?.supplier.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
