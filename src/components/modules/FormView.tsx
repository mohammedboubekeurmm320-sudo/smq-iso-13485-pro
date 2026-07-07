'use client';

import React, { useState, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import { cn, formatDate } from '@/lib/utils';
import type { FormTemplate, FormInstance, FormFieldDefinition, FormInstanceStatus, SignatureType, FormTemplateWorkflow, FormTemplateCompliance, FormTemplateStatus, FormTemplateModuleType } from '@/types/qms';
import { FORM_TEMPLATE_TRANSITIONS } from '@/types/qms';
import {
  FileSpreadsheet, Plus, Search, Eye, Lock, ChevronUp, ChevronDown,
  Trash2, GripVertical, ShieldCheck, CheckCircle2, XCircle,
  FileText, LayoutTemplate, ClipboardList, PenLine,
  ChevronLeft, ChevronRight, Star, Upload, Repeat,
  Gavel, Scale, Printer, Clock, AlertTriangle,
  Send, RotateCcw, Archive, Ban,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Status Color Maps
// ============================================================================

const instanceStatusColors: Record<FormInstanceStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Submitted': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const templateStatusColors: Record<FormTemplateStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Under_Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Obsolete': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const templateStatusLabels: Record<FormTemplateStatus, string> = {
  'Draft': 'Draft',
  'Under_Review': 'Under Review',
  'Approved': 'Approved',
  'Obsolete': 'Obsolete',
};

const moduleTypeLabels: Record<FormTemplateModuleType, string> = {
  capa: 'CAPA', ncr: 'NCR', deviation: 'Deviation', change_control: 'Change Control',
  audit: 'Audit', risk: 'Risk', training: 'Training', supplier: 'Supplier',
  batch_record: 'Batch Record', oos_oot: 'OOS/OOT', general: 'General',
};

const fieldTypeIcons: Record<string, string> = {
  text: 'Aa',
  number: '#',
  date: '📅',
  select: '☰',
  checkbox: '☑',
  textarea: '¶',
  signature: '✍',
  table: '▦',
  rating: '★',
  file: '📎',
  repeater: '⟳',
};

const dataClassificationColors: Record<string, string> = {
  'Internal': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Confidential': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Regulatory': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'GxP Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const WIZARD_STEPS = [
  { id: 1, label: 'Template Info', icon: LayoutTemplate },
  { id: 2, label: 'Field Builder', icon: ClipboardList },
  { id: 3, label: 'Field Config', icon: FileText },
  { id: 4, label: 'Workflow & Rules', icon: Gavel },
  { id: 5, label: 'Compliance', icon: ShieldCheck },
  { id: 6, label: 'Review & Submit', icon: CheckCircle2 },
];

const TEMPLATE_STATUS_STEPS: FormTemplateStatus[] = ['Draft', 'Under_Review', 'Approved', 'Obsolete'];

export function FormView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const templates = store.formTemplates;
  const instances = store.formInstances;
  const documents = store.documents;

  // ===== TEMPLATES TAB STATE =====
  const [templateSearch, setTemplateSearch] = useState('');
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showTemplateDetailDialog, setShowTemplateDetailDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderVersion, setBuilderVersion] = useState('1.0');
  const [builderLinkedDoc, setBuilderLinkedDoc] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderModuleType, setBuilderModuleType] = useState<FormTemplateModuleType>('general');
  const [builderFields, setBuilderFields] = useState<FormFieldDefinition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // New field state (Step 2)
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldDefinition['type']>('text');

  // Field config state (Step 3)
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldValidationMin, setFieldValidationMin] = useState('');
  const [fieldValidationMax, setFieldValidationMax] = useState('');
  const [fieldValidationPattern, setFieldValidationPattern] = useState('');

  // Workflow state (Step 4)
  const [workflowRequiresApproval, setWorkflowRequiresApproval] = useState(true);
  const [workflowType, setWorkflowType] = useState<'single' | 'sequential' | 'parallel'>('single');
  const [workflowAllowDraftSaves, setWorkflowAllowDraftSaves] = useState(true);
  const [workflowLockAfterSubmission, setWorkflowLockAfterSubmission] = useState(true);
  const [workflowESignatureRequired, setWorkflowESignatureRequired] = useState(false);

  // Compliance state (Step 5)
  const [complianceRegulatoryRef, setComplianceRegulatoryRef] = useState('');
  const [complianceRetentionPeriod, setComplianceRetentionPeriod] = useState('Product Lifetime');
  const [complianceDataClassification, setComplianceDataClassification] = useState<FormTemplateCompliance['dataClassification']>('Internal');
  const [complianceAuditTrailEnabled, setComplianceAuditTrailEnabled] = useState(true);
  const [compliancePrintFriendly, setCompliancePrintFriendly] = useState(false);
  const [complianceCfrPart11, setComplianceCfrPart11] = useState(false);

  // ===== INSTANCES TAB STATE =====
  const [instanceSearch, setInstanceSearch] = useState('');
  const [instanceTemplateFilter, setInstanceTemplateFilter] = useState<string>('all');
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<string>('all');
  const [showFillerDialog, setShowFillerDialog] = useState(false);
  const [showInstanceDetailDialog, setShowInstanceDetailDialog] = useState(false);
  const [fillingTemplate, setFillingTemplate] = useState<FormTemplate | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<FormInstance | null>(null);

  // Filler state
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  // E-signature (instance)
  const [showEsigModal, setShowEsigModal] = useState(false);
  const [pendingInstanceAction, setPendingInstanceAction] = useState<{ instanceId: string; action: 'approve' | 'reject' } | null>(null);

  // E-signature (template)
  const [showTemplateEsigModal, setShowTemplateEsigModal] = useState(false);
  const [pendingTemplateAction, setPendingTemplateAction] = useState<{ templateId: string; targetStatus: FormTemplateStatus } | null>(null);

  // ===== COMPUTED =====
  const approvedDocuments = useMemo(() => documents.filter(d => d.status === 'Approved'), [documents]);

  const filteredTemplates = useMemo(() =>
    templates.filter(t => templateSearch === '' || t.title.toLowerCase().includes(templateSearch.toLowerCase())),
    [templates, templateSearch]
  );

  const filteredInstances = useMemo(() =>
    instances.filter(i => {
      const matchesSearch = instanceSearch === '' || i.referenceNumber.toLowerCase().includes(instanceSearch.toLowerCase());
      const matchesTemplate = instanceTemplateFilter === 'all' || i.templateId === instanceTemplateFilter;
      const matchesStatus = instanceStatusFilter === 'all' || i.status === instanceStatusFilter;
      return matchesSearch && matchesTemplate && matchesStatus;
    }),
    [instances, instanceSearch, instanceTemplateFilter, instanceStatusFilter]
  );

  const getInstanceCount = (templateId: string) => instances.filter(i => i.templateId === templateId).length;

  const templateSummary = useMemo(() => ({
    draftTemplates: templates.filter(t => t.status === 'Draft').length,
    underReviewTemplates: templates.filter(t => t.status === 'Under_Review').length,
    approvedTemplates: templates.filter(t => t.status === 'Approved').length,
    totalInstances: instances.length,
  }), [templates, instances]);

  const getTemplateName = (templateId: string) =>
    templates.find(t => t.id === templateId)?.title || templateId;

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = store.profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  /** Get the display-friendly version of a template's status */
  const getTemplateStatus = (template: FormTemplate): FormTemplateStatus =>
    template.status || (template.isActive ? 'Approved' : 'Draft');

  // ===== SELECTED FIELD FOR STEP 3 =====
  const selectedField = useMemo(() =>
    builderFields.find(f => f.id === selectedFieldId) || null,
    [builderFields, selectedFieldId]
  );

  // Sync Step 3 config state when selected field changes
  React.useEffect(() => {
    if (selectedField) {
      setFieldPlaceholder(selectedField.placeholder || '');
      setFieldDefaultValue(selectedField.defaultValue || '');
      setFieldRequired(selectedField.required || false);
      setFieldOptions(selectedField.options?.join(', ') || '');
      setFieldValidationMin(selectedField.validation?.min?.toString() || '');
      setFieldValidationMax(selectedField.validation?.max?.toString() || '');
      setFieldValidationPattern(selectedField.validation?.pattern || '');
    } else {
      setFieldPlaceholder(''); setFieldDefaultValue(''); setFieldRequired(false);
      setFieldOptions(''); setFieldValidationMin(''); setFieldValidationMax(''); setFieldValidationPattern('');
    }
  }, [selectedField]);

  // Sync selectedTemplate when the store data changes (for live status updates)
  React.useEffect(() => {
    if (selectedTemplate) {
      const updated = templates.find(t => t.id === selectedTemplate.id);
      if (updated) setSelectedTemplate(updated);
    }
  }, [templates, selectedTemplate]);

  // ===== BUILDER HELPERS =====
  const resetBuilder = () => {
    setWizardStep(1);
    setBuilderTitle(''); setBuilderVersion('1.0'); setBuilderLinkedDoc('');
    setBuilderDescription(''); setBuilderModuleType('general'); setBuilderFields([]); setSelectedFieldId(null);
    setNewFieldName(''); setNewFieldLabel(''); setNewFieldType('text');
    setFieldPlaceholder(''); setFieldDefaultValue(''); setFieldRequired(false);
    setFieldOptions(''); setFieldValidationMin(''); setFieldValidationMax(''); setFieldValidationPattern('');
    setWorkflowRequiresApproval(true); setWorkflowType('single');
    setWorkflowAllowDraftSaves(true); setWorkflowLockAfterSubmission(true);
    setWorkflowESignatureRequired(false);
    setComplianceRegulatoryRef(''); setComplianceRetentionPeriod('Product Lifetime');
    setComplianceDataClassification('Internal'); setComplianceAuditTrailEnabled(true);
    setCompliancePrintFriendly(false); setComplianceCfrPart11(false);
  };

  const addField = () => {
    if (!newFieldName || !newFieldLabel) return;
    const field: FormFieldDefinition = {
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: newFieldName,
      label: newFieldLabel,
      type: newFieldType,
    };
    setBuilderFields([...builderFields, field]);
    setNewFieldName(''); setNewFieldLabel(''); setNewFieldType('text');
  };

  const removeField = (id: string) => {
    setBuilderFields(builderFields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...builderFields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setBuilderFields(newFields);
  };

  const moveFieldDown = (index: number) => {
    if (index === builderFields.length - 1) return;
    const newFields = [...builderFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setBuilderFields(newFields);
  };

  // Apply Step 3 field config changes back to the field
  const applyFieldConfig = () => {
    if (!selectedFieldId) return;
    setBuilderFields(builderFields.map(f => {
      if (f.id !== selectedFieldId) return f;
      return {
        ...f,
        placeholder: fieldPlaceholder || undefined,
        defaultValue: fieldDefaultValue || undefined,
        required: fieldRequired,
        options: f.type === 'select' ? fieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
        validation: (fieldValidationMin || fieldValidationMax || fieldValidationPattern) ? {
          min: fieldValidationMin ? parseFloat(fieldValidationMin) : undefined,
          max: fieldValidationMax ? parseFloat(fieldValidationMax) : undefined,
          pattern: fieldValidationPattern || undefined,
        } : undefined,
      };
    }));
  };

  // ===== TEMPLATE SAVE (creates as Draft) =====
  const handleSaveTemplate = () => {
    if (!builderTitle || builderFields.length === 0) return;
    const workflow: FormTemplateWorkflow = {
      requiresApproval: workflowRequiresApproval,
      workflowType,
      allowDraftSaves: workflowAllowDraftSaves,
      lockAfterSubmission: workflowLockAfterSubmission,
      eSignatureRequired: workflowESignatureRequired,
    };
    const compliance: FormTemplateCompliance = {
      regulatoryReference: complianceRegulatoryRef,
      retentionPeriod: complianceRetentionPeriod,
      dataClassification: complianceDataClassification,
      auditTrailEnabled: complianceAuditTrailEnabled,
      printFriendlyLayout: compliancePrintFriendly,
      cfrPart11Compliance: complianceCfrPart11,
    };
    const newTemplate: FormTemplate = {
      id: `ft-${Date.now()}`,
      documentId: builderLinkedDoc || '',
      title: builderTitle,
      version: builderVersion,
      description: builderDescription || undefined,
      fields: builderFields,
      isActive: false,
      status: 'Draft',
      moduleType: builderModuleType,
      workflow,
      compliance,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    store.addFormTemplate(newTemplate);
    resetBuilder();
    setShowBuilderDialog(false);
  };

  const openTemplateDetail = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDetailDialog(true);
  };

  // ===== TEMPLATE STATUS TRANSITION =====
  const handleTemplateTransition = (templateId: string, targetStatus: FormTemplateStatus) => {
    // For approval (Under_Review → Approved), e-signature is required
    if (targetStatus === 'Approved') {
      setPendingTemplateAction({ templateId, targetStatus });
      setShowTemplateEsigModal(true);
      return;
    }
    // Other transitions don't require e-signature
    const result = store.transitionFormTemplateStatus(
      templateId,
      targetStatus,
      currentUser?.id || '',
      currentUser?.role || 'operator',
    );
    if (!result.success) {
      alert(result.error || 'Transition failed');
      return;
    }
    // Refresh selected template
    const updated = store.formTemplates.find(t => t.id === templateId);
    if (updated) setSelectedTemplate(updated);
  };

  const handleTemplateEsigSign = (data: { signatureHash: string; signedAt: string; signatureType: SignatureType; reason?: string }) => {
    if (!pendingTemplateAction) return;
    const { templateId, targetStatus } = pendingTemplateAction;
    const result = store.transitionFormTemplateStatus(
      templateId,
      targetStatus,
      currentUser?.id || '',
      currentUser?.role || 'operator',
      data.signatureHash,
      data.reason,
    );
    if (!result.success) {
      alert(result.error || 'Template transition failed');
      setShowTemplateEsigModal(false);
      setPendingTemplateAction(null);
      return;
    }
    // Refresh selected template
    const updated = store.formTemplates.find(t => t.id === templateId);
    if (updated) setSelectedTemplate(updated);
    setShowTemplateEsigModal(false);
    setPendingTemplateAction(null);
  };

  // ===== FILLER HELPERS =====
  const openFiller = (template: FormTemplate) => {
    // Check if template is Approved before allowing instance creation
    if (template.status !== 'Approved') {
      alert('Only Approved templates can be used to create form instances. Please submit this template for review and get it approved first.');
      return;
    }
    setFillingTemplate(template);
    const initialValues: Record<string, unknown> = {};
    template.fields.forEach(f => {
      initialValues[f.name] = f.type === 'checkbox' ? (f.defaultValue === 'true' ? true : false) : (f.defaultValue || '');
    });
    setFormValues(initialValues);
    setShowFillerDialog(true);
  };

  const handleSubmitInstance = () => {
    if (!fillingTemplate) return;
    const newInstance: FormInstance = {
      id: `fi-${Date.now()}`,
      templateId: fillingTemplate.id,
      templateVersion: fillingTemplate.version,
      const nextFormNum = instances.length > 0
        ? Math.max(...instances.map(i => {
            const m = i.referenceNumber.match(/(\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
          })) + 1
        : 1;
      const referenceNumber = `FORM-${new Date().getFullYear()}-${String(nextFormNum).padStart(3, '0')}`,
      values: formValues,
      status: 'Submitted',
      isLocked: false,
      submittedById: currentUser?.id,
      submittedAt: new Date().toISOString(),
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    store.addFormInstance(newInstance);
    setShowFillerDialog(false);
    setFillingTemplate(null);
  };

  const openInstanceDetail = (instance: FormInstance) => {
    setSelectedInstance(instance);
    setShowInstanceDetailDialog(true);
  };

  const handleApproveReject = (instanceId: string, action: 'approve' | 'reject') => {
    setPendingInstanceAction({ instanceId, action });
    setShowEsigModal(true);
  };

  const handleEsigSign = (data: { signatureHash: string; signedAt: string; signatureType: SignatureType; reason?: string }) => {
    if (!pendingInstanceAction) return;
    const { instanceId, action } = pendingInstanceAction;
    const targetStatus = action === 'approve' ? 'Approved' as const : 'Rejected' as const;
    const result = store.transitionFormInstanceStatus(
      instanceId,
      targetStatus,
      currentUser?.id || '',
      currentUser?.role || 'operator',
      data.signatureHash,
      data.reason,
    );
    if (!result.success) {
      alert(result.error || 'Instance transition failed');
    } else {
      // Refresh selected instance
      const updated = store.formInstances.find(f => f.id === instanceId);
      if (updated && selectedInstance?.id === instanceId) {
        setSelectedInstance(updated);
      }
    }
    setShowEsigModal(false);
    setPendingInstanceAction(null);
  };

  const allFieldTypes: FormFieldDefinition['type'][] = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'signature', 'table', 'rating', 'file', 'repeater'];

  // ===== WIZARD STEP VALIDATION =====
  const canGoNext = (): boolean => {
    switch (wizardStep) {
      case 1: return !!(builderTitle && builderVersion && builderModuleType);
      case 2: return builderFields.length > 0;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  // ===== RENDER FIELD PREVIEW (shared) =====
  const renderFieldPreview = (field: FormFieldDefinition, disabled = true) => (
    <div key={field.id} className="grid gap-1.5">
      <Label className="text-sm">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {field.type === 'text' && (
        <Input placeholder={field.placeholder} disabled={disabled} className="bg-white dark:bg-gray-950" />
      )}
      {field.type === 'number' && (
        <Input type="number" placeholder={field.placeholder} disabled={disabled} className="bg-white dark:bg-gray-950" />
      )}
      {field.type === 'date' && (
        <Input type="date" disabled={disabled} className="bg-white dark:bg-gray-950" />
      )}
      {field.type === 'select' && field.options && (
        <Select disabled={disabled}>
          <SelectTrigger className="bg-white dark:bg-gray-950"><SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} /></SelectTrigger>
        </Select>
      )}
      {field.type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Checkbox disabled={disabled} />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      )}
      {field.type === 'textarea' && (
        <Textarea placeholder={field.placeholder} disabled={disabled} className="bg-white dark:bg-gray-950" rows={2} />
      )}
      {field.type === 'signature' && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-20 flex items-center justify-center text-muted-foreground text-xs">
          <PenLine className="h-5 w-5 mr-2" />Signature Area
        </div>
      )}
      {field.type === 'table' && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-16 flex items-center justify-center text-muted-foreground text-xs">
          ▦ Table Field
        </div>
      )}
      {field.type === 'rating' && (
        <div className="flex items-center gap-1 text-muted-foreground">
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} className="h-5 w-5" />
          ))}
        </div>
      )}
      {field.type === 'file' && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-16 flex items-center justify-center text-muted-foreground text-xs">
          <Upload className="h-4 w-4 mr-2" />File Upload Area
        </div>
      )}
      {field.type === 'repeater' && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-20 flex items-center justify-center text-muted-foreground text-xs">
          <Repeat className="h-4 w-4 mr-2" />Repeater Group
        </div>
      )}
    </div>
  );

  // ===========================================================================
  // RENDER TEMPLATE STATUS BADGE
  // ===========================================================================
  const renderTemplateStatusBadge = (template: FormTemplate) => {
    const status = getTemplateStatus(template);
    return (
      <Badge
        className={cn('text-xs', templateStatusColors[status])}
        variant="secondary"
      >
        {templateStatusLabels[status]}
      </Badge>
    );
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />Dynamic Forms
            </h1>
            <p className="text-muted-foreground mt-1">Form templates and electronic records management</p>
          </div>
          {hasPermission('documents.create') && (
            <Button onClick={() => { resetBuilder(); setShowBuilderDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Template
            </Button>
          )}
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">
              <LayoutTemplate className="h-4 w-4 mr-1" />Templates
            </TabsTrigger>
            <TabsTrigger value="instances">
              <ClipboardList className="h-4 w-4 mr-1" />Instances
            </TabsTrigger>
          </TabsList>


        {/* ============================================================ */}
        {/* TEMPLATES TAB                                                 */}
        {/* ============================================================ */}
        <TabsContent value="templates" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Draft Templates</span>
                </div>
                <span className="text-2xl font-bold">{templateSummary.draftTemplates}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Under Review</span>
                </div>
                <span className="text-2xl font-bold">{templateSummary.underReviewTemplates}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Approved Templates</span>
                </div>
                <span className="text-2xl font-bold">{templateSummary.approvedTemplates}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Instances</span>
                </div>
                <span className="text-2xl font-bold">{templateSummary.totalInstances}</span>
              </CardContent>
            </Card>
          </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="pl-9 max-w-sm" />
            </div>

          {/* Templates Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[80px]">Version</TableHead>
                      <TableHead className="w-[100px]">Fields</TableHead>
                      <TableHead className="w-[150px]">Linked Document</TableHead>
                      <TableHead className="w-[110px]">Status</TableHead>
                      <TableHead className="w-[100px]">Module</TableHead>
                      <TableHead className="w-[110px]">Instances</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map(template => {
                      const linkedDoc = documents.find(d => d.id === template.documentId);
                      const instanceCount = getInstanceCount(template.id);
                      return (
                        <TableRow key={template.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openTemplateDetail(template)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {template.title}
                              {template.compliance?.cfrPart11Compliance && (
                                <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">21 CFR Part 11</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{template.version}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.fields.length} fields</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {linkedDoc ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-mono">{linkedDoc.documentNumber}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{linkedDoc.title}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {renderTemplateStatusBadge(template)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {moduleTypeLabels[template.moduleType || 'general'] || template.moduleType || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{instanceCount}</Badge>
                          </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); openTemplateDetail(template); }}>
                                  <Eye className="h-3 w-3 mr-1" />View
                                </Button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8"
                                        disabled={getTemplateStatus(template) !== 'Approved'}
                                        onClick={(e) => { e.stopPropagation(); if (getTemplateStatus(template) === 'Approved') openFiller(template); }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />Fill
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {getTemplateStatus(template) !== 'Approved' && (
                                    <TooltipContent>
                                      <p>Template must be approved before creating instances</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredTemplates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No templates found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* INSTANCES TAB                                                 */}
          {/* ============================================================ */}
          <TabsContent value="instances" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search instances by reference #..." value={instanceSearch} onChange={(e) => setInstanceSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={instanceTemplateFilter} onValueChange={setInstanceTemplateFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={instanceStatusFilter} onValueChange={setInstanceStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(['Draft', 'Submitted', 'Approved', 'Rejected'] as FormInstanceStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instances Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Reference #</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[150px]">Submitted By</TableHead>
                        <TableHead className="w-[120px]">Submitted Date</TableHead>
                        <TableHead className="w-[80px]">Locked</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map(instance => (
                        <TableRow key={instance.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openInstanceDetail(instance)}>
                          <TableCell className="font-mono text-xs">{instance.referenceNumber}</TableCell>
                          <TableCell className="font-medium">{getTemplateName(instance.templateId)}</TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs', instanceStatusColors[instance.status])} variant="secondary">{instance.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getUserName(instance.submittedById)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(instance.submittedAt)}</TableCell>
                          <TableCell>
                            {instance.isLocked ? (
                              <Lock className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); openInstanceDetail(instance); }}>
                                <Eye className="h-3 w-3 mr-1" />View
                              </Button>
                              {instance.status === 'Submitted' && hasPermission('documents.approve') && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); handleApproveReject(instance.id, 'approve'); }}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleApproveReject(instance.id, 'reject'); }}>
                                    <XCircle className="h-3 w-3 mr-1" />Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredInstances.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No instances found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ============================================================ */}
        {/* 6-STEP TEMPLATE BUILDER WIZARD DIALOG                        */}
        {/* ============================================================ */}
        <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-primary" />
                Create New Template
              </DialogTitle>
            </DialogHeader>

            {/* Wizard Progress */}
            <div className="flex items-center gap-1 mb-2">
              {WIZARD_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = wizardStep === step.id;
                const isComplete = wizardStep > step.id;
                return (
                  <React.Fragment key={step.id}>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer',
                        isActive && 'bg-primary text-primary-foreground',
                        isComplete && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        !isActive && !isComplete && 'bg-muted text-muted-foreground',
                      )}
                      onClick={() => { if (isComplete || step.id <= wizardStep) setWizardStep(step.id); }}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                      {step.label}
                    </div>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <Separator />

            {/* ===== STEP 1: Template Info ===== */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-primary" />
                  Template Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="Enter template title" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Version</Label>
                    <Input value={builderVersion} onChange={(e) => setBuilderVersion(e.target.value)} placeholder="e.g. 1.0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Module Type *</Label>
                    <Select value={builderModuleType} onValueChange={(v) => setBuilderModuleType(v as FormTemplateModuleType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(moduleTypeLabels) as FormTemplateModuleType[]).map(mt => (
                          <SelectItem key={mt} value={mt}>{moduleTypeLabels[mt]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Which record module this template serves</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Linked Document</Label>
                    <Select value={builderLinkedDoc} onValueChange={setBuilderLinkedDoc}>
                      <SelectTrigger><SelectValue placeholder="Select a linked document..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {approvedDocuments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.documentNumber} — {d.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={builderDescription} onChange={(e) => setBuilderDescription(e.target.value)} placeholder="Describe the purpose of this form template..." rows={3} />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Templates are created in <strong>Draft</strong> status and must be submitted for review and approved before instances can be created.
                  </p>
                </div>
              </div>
            )}

            {/* ===== STEP 2: Field Builder ===== */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Field Builder
                </h3>

                {/* Add Field Form */}
                <div className="border rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add New Field
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Field Name *</Label>
                      <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="fieldName" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Label *</Label>
                      <Input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Field Label" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FormFieldDefinition['type'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allFieldTypes.map(t => <SelectItem key={t} value={t}>{fieldTypeIcons[t]} {t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" onClick={addField} disabled={!newFieldName || !newFieldLabel}>
                    <Plus className="h-3 w-3 mr-1" />Add Field
                  </Button>
                </div>

                {/* Field List */}
                {builderFields.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Fields ({builderFields.length})</h4>
                    {builderFields.map((field, i) => (
                      <div
                        key={field.id}
                        className={cn(
                          'flex items-center gap-2 border rounded-md p-2 text-sm transition-colors',
                          selectedFieldId === field.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                        )}
                        onClick={() => setSelectedFieldId(field.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground font-mono text-xs w-6">{i + 1}.</span>
                        <span className="font-medium flex-1">{field.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {fieldTypeIcons[field.type]} {field.type}
                        </Badge>
                        {field.required && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Required</Badge>}
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveFieldUp(i); }} disabled={i === 0}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveFieldDown(i); }} disabled={i === builderFields.length - 1}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No fields added yet. Use the form above to add fields.</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 3: Field Config ===== */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Field Configuration
                </h3>

                {selectedField ? (
                  <div className="space-y-4">
                    <div className="border rounded-md p-4 space-y-3">
                      <h4 className="font-semibold text-sm">{selectedField.label} <span className="text-muted-foreground font-mono text-xs">({selectedField.name})</span></h4>
                      <Badge variant="outline" className="text-xs">{fieldTypeIcons[selectedField.type]} {selectedField.type}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Placeholder</Label>
                        <Input value={fieldPlaceholder} onChange={(e) => setFieldPlaceholder(e.target.value)} placeholder="Placeholder text..." />
                      </div>
                      <div className="grid gap-2">
                        <Label>Default Value</Label>
                        <Input value={fieldDefaultValue} onChange={(e) => setFieldDefaultValue(e.target.value)} placeholder="Default value..." />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-md">
                      <Checkbox
                        checked={fieldRequired}
                        onCheckedChange={(v) => setFieldRequired(v === true)}
                      />
                      <div>
                        <Label className="font-medium">Required Field</Label>
                        <p className="text-xs text-muted-foreground">Users must fill in this field before submission</p>
                      </div>
                    </div>

                    {selectedField.type === 'select' && (
                      <div className="grid gap-2">
                        <Label>Options (comma-separated)</Label>
                        <Input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" />
                      </div>
                    )}

                    {(selectedField.type === 'number' || selectedField.type === 'text') && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Min Value</Label>
                          <Input value={fieldValidationMin} onChange={(e) => setFieldValidationMin(e.target.value)} placeholder="Min" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Max Value</Label>
                          <Input value={fieldValidationMax} onChange={(e) => setFieldValidationMax(e.target.value)} placeholder="Max" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Pattern (regex)</Label>
                          <Input value={fieldValidationPattern} onChange={(e) => setFieldValidationPattern(e.target.value)} placeholder="^[A-Z]+$" />
                        </div>
                      </div>
                    )}

                    <Button onClick={applyFieldConfig}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />Apply Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Select a field from Step 2 to configure its properties.</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 4: Workflow & Rules ===== */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" />
                  Workflow & Rules
                </h3>

                <div className="flex items-center gap-3 p-3 border rounded-md">
                  <Checkbox
                    checked={workflowRequiresApproval}
                    onCheckedChange={(v) => setWorkflowRequiresApproval(v === true)}
                  />
                  <div>
                    <Label className="font-medium">Requires Approval</Label>
                    <p className="text-xs text-muted-foreground">Form submissions must be reviewed and approved</p>
                  </div>
                </div>

                {workflowRequiresApproval && (
                  <div className="grid gap-2 pl-4">
                    <Label>Approval Workflow Type</Label>
                    <Select value={workflowType} onValueChange={(v) => setWorkflowType(v as 'single' | 'sequential' | 'parallel')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Approver</SelectItem>
                        <SelectItem value="sequential">Sequential (Multi-step)</SelectItem>
                        <SelectItem value="parallel">Parallel (Any Approver)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 border rounded-md">
                  <Checkbox
                    checked={workflowAllowDraftSaves}
                    onCheckedChange={(v) => setWorkflowAllowDraftSaves(v === true)}
                  />
                  <div>
                    <Label className="font-medium">Allow Draft Saves</Label>
                    <p className="text-xs text-muted-foreground">Users can save and resume forms before submission</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-md">
                  <Checkbox
                    checked={workflowLockAfterSubmission}
                    onCheckedChange={(v) => setWorkflowLockAfterSubmission(v === true)}
                  />
                  <div>
                    <Label className="font-medium">Lock After Submission</Label>
                    <p className="text-xs text-muted-foreground">Prevent editing once the form is submitted</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-md">
                  <Checkbox
                    checked={workflowESignatureRequired}
                    onCheckedChange={(v) => setWorkflowESignatureRequired(v === true)}
                  />
                  <div>
                    <Label className="font-medium">E-Signature Required</Label>
                    <p className="text-xs text-muted-foreground">Electronic signature required on submission</p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 5: Compliance ===== */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Compliance
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Regulatory Reference</Label>
                      <Input value={complianceRegulatoryRef} onChange={(e) => setComplianceRegulatoryRef(e.target.value)} placeholder="e.g., ISO 13485:2016 Clause 4.2.4" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Retention Period</Label>
                      <Select value={complianceRetentionPeriod} onValueChange={setComplianceRetentionPeriod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Product Lifetime">Product Lifetime</SelectItem>
                          <SelectItem value="5 Years">5 Years</SelectItem>
                          <SelectItem value="10 Years">10 Years</SelectItem>
                          <SelectItem value="15 Years">15 Years</SelectItem>
                          <SelectItem value="25 Years">25 Years</SelectItem>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Data Classification</Label>
                      <Select value={complianceDataClassification} onValueChange={(v) => setComplianceDataClassification(v as FormTemplateCompliance['dataClassification'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Internal">Internal</SelectItem>
                          <SelectItem value="Confidential">Confidential</SelectItem>
                          <SelectItem value="Regulatory">Regulatory</SelectItem>
                          <SelectItem value="GxP Critical">GxP Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border rounded-md">
                      <Checkbox
                        checked={complianceAuditTrailEnabled}
                        onCheckedChange={(v) => setComplianceAuditTrailEnabled(v === true)}
                      />
                      <div>
                        <Label className="font-medium">Audit Trail Enabled</Label>
                        <p className="text-xs text-muted-foreground">Track all changes with full audit trail</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-md">
                      <Checkbox
                        checked={compliancePrintFriendly}
                        onCheckedChange={(v) => setCompliancePrintFriendly(v === true)}
                      />
                      <div>
                        <Label className="font-medium">Print-Friendly Layout</Label>
                        <p className="text-xs text-muted-foreground">Generate print-optimized versions of form records</p>
                      </div>
                    </div>

                    <div className={cn(
                      'flex items-start gap-3 p-3 border rounded-md',
                      complianceCfrPart11 && 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/10'
                    )}>
                      <Checkbox
                        checked={complianceCfrPart11}
                        onCheckedChange={(v) => setComplianceCfrPart11(v === true)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label className="font-medium flex items-center gap-1">
                          21 CFR Part 11 Compliance
                          {complianceCfrPart11 && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enables electronic record and signature requirements per FDA 21 CFR Part 11.
                          All form entries will require electronic signatures and full audit trails.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 6: Review & Submit ===== */}
            {wizardStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Review & Submit
                </h3>

                {/* Template Info Summary */}
                <div className="border rounded-md p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    Template Info
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-1">{builderTitle || '—'}</span></div>
                    <div><span className="text-muted-foreground">Version:</span> <span className="font-mono ml-1">{builderVersion}</span></div>
                    <div><span className="text-muted-foreground">Module:</span> <span className="font-medium ml-1">{moduleTypeLabels[builderModuleType]}</span></div>
                    <div><span className="text-muted-foreground">Linked Doc:</span> <span className="ml-1">{builderLinkedDoc && builderLinkedDoc !== 'none' ? approvedDocuments.find(d => d.id === builderLinkedDoc)?.documentNumber || '—' : 'None'}</span></div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Initial Status:</span>{' '}
                    <Badge className={cn('text-xs ml-1', templateStatusColors['Draft'])} variant="secondary">Draft</Badge>
                    <span className="text-muted-foreground ml-3">Fields:</span> <span className="font-medium ml-1">{builderFields.length}</span>
                  </div>
                  {builderDescription && (
                    <p className="text-sm text-muted-foreground mt-1">{builderDescription}</p>
                  )}
                </div>

                {/* Fields Preview */}
                <div className="border rounded-md p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Field Preview ({builderFields.length} fields)
                  </h4>
                  {builderFields.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {builderFields.map((field, i) => (
                        <div key={field.id} className="flex items-center gap-2 py-1 text-sm border-b last:border-0">
                          <span className="text-muted-foreground font-mono text-xs w-6">{i + 1}.</span>
                          <span className="font-medium flex-1">{field.label}</span>
                          <Badge variant="outline" className="text-xs">{fieldTypeIcons[field.type]} {field.type}</Badge>
                          {field.required && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Req</Badge>}
                          {field.placeholder && <span className="text-xs text-muted-foreground italic truncate max-w-[100px]">&quot;{field.placeholder}&quot;</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No fields defined</p>
                  )}
                </div>

                {/* Workflow Summary */}
                <div className="border rounded-md p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-primary" />
                    Workflow & Rules
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      {workflowRequiresApproval ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>Requires Approval</span>
                    </div>
                    {workflowRequiresApproval && (
                      <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1 capitalize">{workflowType === 'single' ? 'Single Approver' : workflowType === 'sequential' ? 'Sequential' : 'Parallel'}</span></div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {workflowAllowDraftSaves ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>Allow Draft Saves</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {workflowLockAfterSubmission ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>Lock After Submission</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {workflowESignatureRequired ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>E-Signature Required</span>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="border rounded-md p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Compliance
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Regulatory Ref:</span> <span className="font-medium ml-1">{complianceRegulatoryRef || '—'}</span></div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{complianceRetentionPeriod}</span>
                    </div>
                    <div>
                      <Badge className={cn(dataClassificationColors[complianceDataClassification])} variant="secondary">
                        {complianceDataClassification}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {complianceAuditTrailEnabled ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>Audit Trail</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {compliancePrintFriendly ? <Printer className="h-3.5 w-3.5 text-green-500" /> : <Printer className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>Print-Friendly</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {complianceCfrPart11 ? (
                        <>
                          <Scale className="h-3.5 w-3.5 text-orange-500" />
                          <span className="font-medium text-orange-700 dark:text-orange-400">21 CFR Part 11</span>
                        </>
                      ) : (
                        <>
                          <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">No CFR Part 11</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== WIZARD NAVIGATION ===== */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                disabled={wizardStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>

              <span className="text-sm text-muted-foreground">Step {wizardStep} of 6</span>

              {wizardStep < 6 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canGoNext()}
                >
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!builderTitle || builderFields.length === 0}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />Create as Draft
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

      {/* ============================================================ */}
      {/* ENHANCED TEMPLATE DETAIL DIALOG                              */}
      {/* ============================================================ */}
      <Dialog open={showTemplateDetailDialog} onOpenChange={setShowTemplateDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (() => {
            const currentStatus = getTemplateStatus(selectedTemplate);
            const allowedTransitions = FORM_TEMPLATE_TRANSITIONS[currentStatus] || [];
            const currentStepIndex = TEMPLATE_STATUS_STEPS.indexOf(currentStatus);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <LayoutTemplate className="h-5 w-5 text-primary" />
                    {selectedTemplate.title}
                    <Badge variant="outline" className="font-mono text-xs">v{selectedTemplate.version}</Badge>
                    <Badge className={cn('text-xs', templateStatusColors[currentStatus])} variant="secondary">
                      {currentStatus === 'Under_Review' ? 'Under Review' : currentStatus}
                    </Badge>
                    {selectedTemplate.compliance?.cfrPart11Compliance && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">21 CFR Part 11</Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Status Stepper */}
                  <div className="border rounded-md p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Template Lifecycle
                    </h4>
                    <div className="flex items-center gap-1">
                      {TEMPLATE_STATUS_STEPS.map((step, idx) => {
                        const isCurrent = step === currentStatus;
                        const isComplete = idx < currentStepIndex;
                        const isFuture = idx > currentStepIndex;
                        return (
                          <React.Fragment key={step}>
                            <div className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                              isCurrent && 'bg-primary text-primary-foreground',
                              isComplete && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                              isFuture && 'bg-muted text-muted-foreground',
                            )}>
                              {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {isCurrent && <Clock className="h-3.5 w-3.5" />}
                              {step === 'Under_Review' ? 'Under Review' : step}
                            </div>
                            {idx < TEMPLATE_STATUS_STEPS.length - 1 && (
                              <div className={cn('h-0.5 flex-1 min-w-[12px]', isComplete ? 'bg-green-300 dark:bg-green-700' : 'bg-muted')} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {selectedTemplate.effectiveDate && (
                      <p className="text-xs text-muted-foreground mt-2">Effective Date: {formatDate(selectedTemplate.effectiveDate)}</p>
                    )}
                    {selectedTemplate.reviewComment && (
                      <p className="text-xs text-muted-foreground mt-1">Review Comment: {selectedTemplate.reviewComment}</p>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Version:</span> <span className="font-medium ml-1">{selectedTemplate.version}</span></div>
                    <div><span className="text-muted-foreground">Module:</span> <Badge variant="outline" className="text-xs ml-1">{selectedTemplate.moduleType ? moduleTypeLabels[selectedTemplate.moduleType] : '—'}</Badge></div>
                    <div><span className="text-muted-foreground">Fields:</span> <span className="font-medium ml-1">{selectedTemplate.fields.length}</span></div>
                    <div><span className="text-muted-foreground">Instances:</span> <span className="font-medium ml-1">{getInstanceCount(selectedTemplate.id)}</span></div>
                    <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedTemplate.createdAt)}</span></div>
                    {selectedTemplate.updatedAt && (
                      <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium ml-1">{formatDate(selectedTemplate.updatedAt)}</span></div>
                    )}
                    {selectedTemplate.documentId && (() => {
                      const doc = documents.find(d => d.id === selectedTemplate.documentId);
                      return doc ? (
                        <div><span className="text-muted-foreground">Linked Doc:</span> <span className="font-medium ml-1 font-mono text-xs">{doc.documentNumber}</span></div>
                      ) : null;
                    })()}
                  </div>

                  {/* Signatures on this template */}
                  {selectedTemplate.signatures && selectedTemplate.signatures.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Signatures ({selectedTemplate.signatures.length})
                      </h4>
                      <div className="max-h-[120px] overflow-y-auto space-y-1">
                        {selectedTemplate.signatures.map(sig => (
                          <div key={sig.id} className="flex items-center gap-2 text-xs border-b pb-1">
                            <Badge variant="outline" className="text-[10px]">{sig.signatureType}</Badge>
                            <span className="font-medium">{sig.signerName}</span>
                            <span className="text-muted-foreground">{sig.signerRole}</span>
                            <span className="text-muted-foreground ml-auto">{formatDate(sig.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3">{selectedTemplate.description}</p>
                  )}

                  <Separator />

                  {/* Field List */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Field Configurations</h4>
                    {selectedTemplate.fields.map((field, i) => (
                      <div key={field.id} className="border rounded-md p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs">{i + 1}.</span>
                            <span className="font-medium text-sm">{field.label}</span>
                            <Badge variant="outline" className="text-xs">{fieldTypeIcons[field.type]} {field.type}</Badge>
                            {field.required && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Required</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{field.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {field.placeholder && <span className="bg-muted/50 px-1.5 py-0.5 rounded">Placeholder: &quot;{field.placeholder}&quot;</span>}
                          {field.defaultValue && <span className="bg-muted/50 px-1.5 py-0.5 rounded">Default: {field.defaultValue}</span>}
                          {field.options && field.options.length > 0 && (
                            <span className="bg-muted/50 px-1.5 py-0.5 rounded">Options: {field.options.join(', ')}</span>
                          )}
                          {field.validation && (
                            <span className="bg-muted/50 px-1.5 py-0.5 rounded">
                              Validation: {field.validation.min !== undefined && `min=${field.validation.min}`} {field.validation.max !== undefined && `max=${field.validation.max}`} {field.validation.pattern && `pattern=/${field.validation.pattern}/`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Workflow Rules */}
                  {selectedTemplate.workflow && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Gavel className="h-4 w-4 text-primary" />
                          Workflow Rules
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.workflow.requiresApproval ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Requires Approval</span>
                          </div>
                          {selectedTemplate.workflow.requiresApproval && (
                            <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1 capitalize">{selectedTemplate.workflow.workflowType === 'single' ? 'Single Approver' : selectedTemplate.workflow.workflowType === 'sequential' ? 'Sequential' : 'Parallel'}</span></div>
                          )}
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.workflow.allowDraftSaves ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Allow Draft Saves</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.workflow.lockAfterSubmission ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Lock After Submission</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.workflow.eSignatureRequired ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>E-Signature Required</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Compliance Settings */}
                  {selectedTemplate.compliance && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Compliance
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Regulatory Ref:</span> <span className="font-medium ml-1">{selectedTemplate.compliance.regulatoryReference || '—'}</span></div>
                          <div><span className="text-muted-foreground">Retention:</span> <span className="font-medium ml-1">{selectedTemplate.compliance.retentionPeriod}</span></div>
                          <div>
                            <span className="text-muted-foreground">Classification:</span>{' '}
                            <Badge className={cn(dataClassificationColors[selectedTemplate.compliance.dataClassification])} variant="secondary">
                              {selectedTemplate.compliance.dataClassification}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.compliance.auditTrailEnabled ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Audit Trail</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.compliance.printFriendlyLayout ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>Print-Friendly</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {selectedTemplate.compliance.cfrPart11Compliance ? <Scale className="h-3.5 w-3.5 text-orange-500" /> : <Scale className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className={selectedTemplate.compliance.cfrPart11Compliance ? 'font-medium text-orange-700 dark:text-orange-400' : ''}>21 CFR Part 11</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Template Statistics */}
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Template Statistics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="border rounded-md p-3 text-center">
                        <div className="text-2xl font-bold">{selectedTemplate.fields.length}</div>
                        <div className="text-xs text-muted-foreground">Total Fields</div>
                      </div>
                      <div className="border rounded-md p-3 text-center">
                        <div className="text-2xl font-bold">{selectedTemplate.fields.filter(f => f.required).length}</div>
                        <div className="text-xs text-muted-foreground">Required Fields</div>
                      </div>
                      <div className="border rounded-md p-3 text-center">
                        <div className="text-2xl font-bold">{getInstanceCount(selectedTemplate.id)}</div>
                        <div className="text-xs text-muted-foreground">Instances</div>
                      </div>
                      <div className="border rounded-md p-3 text-center">
                        <div className="text-2xl font-bold">{selectedTemplate.fields.filter(f => f.type === 'signature').length}</div>
                        <div className="text-xs text-muted-foreground">Signature Fields</div>
                      </div>
                    </div>
                  </div>

                  {/* Status Transition Actions */}
                  {allowedTransitions.length > 0 && hasPermission('documents.approve') && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Gavel className="h-4 w-4 text-primary" />
                          Status Actions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {/* Draft → Submit for Review */}
                          {currentStatus === 'Draft' && allowedTransitions.includes('Under_Review') && (
                            <Button
                              onClick={() => handleTemplateTransition(selectedTemplate.id, 'Under_Review')}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Clock className="h-4 w-4 mr-2" />Submit for Review
                            </Button>
                          )}
                          {/* Under_Review → Approve (requires e-sig) */}
                          {currentStatus === 'Under_Review' && allowedTransitions.includes('Approved') && (
                            <Button
                              onClick={() => handleTemplateTransition(selectedTemplate.id, 'Approved')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />Approve with E-Signature
                            </Button>
                          )}
                          {/* Under_Review → Return to Draft */}
                          {currentStatus === 'Under_Review' && allowedTransitions.includes('Draft') && (
                            <Button
                              variant="outline"
                              onClick={() => handleTemplateTransition(selectedTemplate.id, 'Draft')}
                            >
                              <ChevronLeft className="h-4 w-4 mr-2" />Return to Draft
                            </Button>
                          )}
                          {/* Approved → Create New Revision (→ Draft) */}
                          {currentStatus === 'Approved' && allowedTransitions.includes('Draft') && (
                            <Button
                              variant="outline"
                              onClick={() => handleTemplateTransition(selectedTemplate.id, 'Draft')}
                            >
                              <Plus className="h-4 w-4 mr-2" />Create New Revision
                            </Button>
                          )}
                          {/* Approved → Mark Obsolete */}
                          {currentStatus === 'Approved' && allowedTransitions.includes('Obsolete') && (
                            <Button
                              variant="destructive"
                              onClick={() => handleTemplateTransition(selectedTemplate.id, 'Obsolete')}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />Mark Obsolete
                            </Button>
                          )}
                          {/* Obsolete → no actions */}
                          {currentStatus === 'Obsolete' && (
                            <p className="text-sm text-muted-foreground">This template is obsolete and cannot be transitioned.</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* FILL FORM DIALOG                                              */}
      {/* ============================================================ */}
      <Dialog open={showFillerDialog} onOpenChange={setShowFillerDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {fillingTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-primary" />
                  Fill: {fillingTemplate.title}
                  <Badge variant="outline" className="font-mono text-xs">v{fillingTemplate.version}</Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Compliance Badges */}
              {fillingTemplate.compliance && (
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(dataClassificationColors[fillingTemplate.compliance.dataClassification])} variant="secondary">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {fillingTemplate.compliance.dataClassification}
                  </Badge>
                  {fillingTemplate.compliance.cfrPart11Compliance && (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                      <Scale className="h-3 w-3 mr-1" />
                      21 CFR Part 11
                    </Badge>
                  )}
                  {fillingTemplate.compliance.auditTrailEnabled && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Audit Trail
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* Form Fields */}
              <div className="space-y-4">
                {fillingTemplate.fields.map(field => (
                  <div key={field.id} className="grid gap-1.5">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input
                        placeholder={field.placeholder}
                        value={(formValues[field.name] as string) ?? ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={(formValues[field.name] as string) ?? ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={(formValues[field.name] as string) ?? ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select
                        value={(formValues[field.name] as string) ?? ''}
                        onValueChange={(v) => setFormValues({ ...formValues, [field.name]: v })}
                      >
                        <SelectTrigger><SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} /></SelectTrigger>
                        <SelectContent>
                          {field.options.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={(formValues[field.name] as boolean) ?? false}
                          onCheckedChange={(v) => setFormValues({ ...formValues, [field.name]: v === true })}
                        />
                        <span className="text-sm text-muted-foreground">{field.label}</span>
                      </div>
                    )}
                    {field.type === 'textarea' && (
                      <Textarea
                        placeholder={field.placeholder}
                        value={(formValues[field.name] as string) ?? ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        rows={3}
                      />
                    )}
                    {field.type === 'signature' && (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-20 flex items-center justify-center text-muted-foreground text-xs">
                        <PenLine className="h-5 w-5 mr-2" />Signature Area
                      </div>
                    )}
                    {field.type === 'rating' && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={cn(
                              'h-6 w-6 cursor-pointer',
                              ((formValues[field.name] as number) || 0) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            )}
                            onClick={() => setFormValues({ ...formValues, [field.name]: star })}
                          />
                        ))}
                      </div>
                    )}
                    {field.type === 'file' && (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-16 flex items-center justify-center text-muted-foreground text-xs">
                        <Upload className="h-4 w-4 mr-2" />File Upload Area
                      </div>
                    )}
                    {(field.type === 'table' || field.type === 'repeater') && (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-16 flex items-center justify-center text-muted-foreground text-xs">
                        {field.type === 'table' ? '▦' : '⟳'} {field.type === 'table' ? 'Table' : 'Repeater'} Field
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button onClick={handleSubmitInstance}>
                  <Send className="h-4 w-4 mr-2" />Submit Form
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* INSTANCE DETAIL DIALOG                                       */}
      {/* ============================================================ */}
      <Dialog open={showInstanceDetailDialog} onOpenChange={setShowInstanceDetailDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedInstance && (() => {
            const instanceTemplate = templates.find(t => t.id === selectedInstance.templateId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    {selectedInstance.referenceNumber}
                    <Badge className={cn('text-xs', instanceStatusColors[selectedInstance.status])} variant="secondary">
                      {selectedInstance.status}
                    </Badge>
                    <Badge variant="outline">v{selectedInstance.templateVersion}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Instance Meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Template:</span> <span className="font-medium ml-1">{instanceTemplate?.title || selectedInstance.templateId}</span></div>
                    <div><span className="text-muted-foreground">Submitted By:</span> <span className="font-medium ml-1">{getUserName(selectedInstance.submittedById)}</span></div>
                    <div><span className="text-muted-foreground">Submitted Date:</span> <span className="font-medium ml-1">{formatDate(selectedInstance.submittedAt)}</span></div>
                    <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedInstance.createdAt)}</span></div>
                    <div><span className="text-muted-foreground">Locked:</span> <span className="font-medium ml-1">{selectedInstance.isLocked ? 'Yes' : 'No'}</span></div>
                    {selectedInstance.updatedAt && (
                      <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium ml-1">{formatDate(selectedInstance.updatedAt)}</span></div>
                    )}
                  </div>

                  {/* Linked Record */}
                  {(selectedInstance.linkedRecordType || selectedInstance.linkedRecordId) && (
                    <div className="border rounded-md p-3 bg-muted/30">
                      <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        Linked Record
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedInstance.linkedRecordType && (
                          <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="text-xs ml-1">{selectedInstance.linkedRecordType}</Badge></div>
                        )}
                        {selectedInstance.linkedRecordId && (
                          <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs ml-1">{selectedInstance.linkedRecordId}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Form Values */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Form Values</h4>
                    {instanceTemplate ? instanceTemplate.fields.map(field => {
                      const value = selectedInstance.values[field.name];
                      return (
                        <div key={field.id} className="border-b pb-2">
                          <span className="text-sm text-muted-foreground block">{field.label}:</span>
                          <p className="font-medium text-sm mt-0.5">
                            {field.type === 'checkbox' ? (
                              value === true ? (
                                <span className="text-green-600 dark:text-green-400">✓ Yes</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">✗ No</span>
                              )
                            ) : field.type === 'signature' ? (
                              value ? (
                                <span className="flex items-center gap-1"><PenLine className="h-3 w-3" />Signed</span>
                              ) : (
                                <span className="text-muted-foreground">Not signed</span>
                              )
                            ) : field.type === 'rating' ? (
                              <span className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className={cn(
                                    'h-4 w-4',
                                    (value as number || 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                                  )} />
                                ))}
                                <span className="ml-1">({String(value ?? 0)})</span>
                              </span>
                            ) : field.type === 'file' ? (
                              value ? (
                                <span className="flex items-center gap-1"><Upload className="h-3 w-3" />{String(value)}</span>
                              ) : (
                                <span className="text-muted-foreground">No file uploaded</span>
                              )
                            ) : (
                              String(value || '-')
                            )}
                          </p>
                        </div>
                      );
                    }) : (
                      Object.entries(selectedInstance.values).map(([key, value]) => (
                        <div key={key} className="border-b pb-2">
                          <span className="text-sm text-muted-foreground">{key}:</span>
                          <p className="font-medium text-sm">
                            {value === true ? '✓ Yes' : value === false ? '✗ No' : String(value || '-')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Approval History */}
                  {selectedInstance.approvalHistory && selectedInstance.approvalHistory.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Approval History
                        </h4>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                          {selectedInstance.approvalHistory.map(entry => (
                            <div key={entry.id} className="border rounded-md p-2.5 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    'text-[10px]',
                                    entry.action === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    entry.action === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  )}
                                  variant="secondary"
                                >
                                  {entry.action === 'approved' ? '✓ Approved' : entry.action === 'rejected' ? '✗ Rejected' : '↩ Returned'}
                                </Badge>
                                <span className="font-medium">{entry.approverName}</span>
                                <span className="text-muted-foreground text-xs ml-auto">{formatDate(entry.timestamp)}</span>
                              </div>
                              {entry.comment && (
                                <p className="text-xs text-muted-foreground mt-1 italic">&quot;{entry.comment}&quot;</p>
                              )}
                              {entry.signatureHash && (
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Sig: {entry.signatureHash.substring(0, 20)}...</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Signatures on instance */}
                  {selectedInstance.signatures && selectedInstance.signatures.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Electronic Signatures
                        </h4>
                        {selectedInstance.signatures.map(sig => (
                          <div key={sig.id} className="flex items-center gap-2 text-xs border-b pb-1">
                            <Badge variant="outline" className="text-[10px]">{sig.signatureType}</Badge>
                            <span className="font-medium">{sig.signerName}</span>
                            <span className="text-muted-foreground">{sig.signerRole}</span>
                            <span className="text-muted-foreground ml-auto">{formatDate(sig.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Approve/Reject buttons */}
                  {(selectedInstance.status === 'Submitted') && hasPermission('documents.approve') && (
                    <>
                      <Separator />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => handleApproveReject(selectedInstance.id, 'reject')}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />Reject
                        </Button>
                        <Button
                          onClick={() => handleApproveReject(selectedInstance.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />Approve
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal (Instance) */}
      <ElectronicSignatureModal
        open={showEsigModal}
        onClose={() => { setShowEsigModal(false); setPendingInstanceAction(null); }}
        onSign={handleEsigSign}
        recordTitle={pendingInstanceAction ? `Form Instance - ${getTemplateName(instances.find(i => i.id === pendingInstanceAction?.instanceId)?.templateId || '')}` : 'Form Instance'}
        recordId={pendingInstanceAction?.instanceId || ''}
        signatureType={pendingInstanceAction?.action === 'approve' ? 'approval' : 'rejection'}
      />

      {/* Electronic Signature Modal (Template Approval) */}
      <ElectronicSignatureModal
        open={showTemplateEsigModal}
        onClose={() => { setShowTemplateEsigModal(false); setPendingTemplateAction(null); }}
        onSign={handleTemplateEsigSign}
        recordTitle={pendingTemplateAction ? `Template - ${store.formTemplates.find(t => t.id === pendingTemplateAction.templateId)?.title || ''}` : 'Template'}
        recordId={pendingTemplateAction?.templateId || ''}
        signatureType="approval"
      />
    </div>
  </TooltipProvider>
  );
}
