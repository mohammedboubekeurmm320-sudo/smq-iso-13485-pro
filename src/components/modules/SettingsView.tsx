'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQMSStore } from '@/lib/demo-store';
import { useI18n } from '@/lib/i18n';
import { cn, formatDate } from '@/lib/utils';
import type {
  UserRole, RecordTypeDefinition, StatusFlowConfig,
  CreateRecordTypeDefinitionDTO, SYSTEM_RECORD_TYPE_SLUGS,
} from '@/types/qms';
import {
  Settings, Shield, FileText, Plus, Edit, Trash2, Lock, Unlock,
  ChevronRight, AlertTriangle, Info, CheckCircle2, XCircle,
  Workflow, Hash, Database, Search, Filter, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================================
// Default status flow templates
// ============================================================================

const DEFAULT_STATUS_FLOW: StatusFlowConfig = {
  statuses: ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete'],
  transitions: [
    { from: 'Draft', to: 'Under Review', required_role: ['admin', 'quality_manager'] },
    { from: 'Under Review', to: 'Approved', required_role: ['admin', 'quality_manager'] },
    { from: 'Under Review', to: 'Draft', required_role: ['admin', 'quality_manager'] },
    { from: 'Approved', to: 'Effective', required_role: ['admin'] },
    { from: 'Effective', to: 'Obsolete', required_role: ['admin'] },
  ],
  initial_status: 'Draft',
};

const WORKFLOW_TEMPLATES: Record<string, StatusFlowConfig> = {
  document: DEFAULT_STATUS_FLOW,
  capa: {
    statuses: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'],
    transitions: [
      { from: 'Open', to: 'Investigation', required_role: ['admin', 'quality_manager'] },
      { from: 'Investigation', to: 'Implementation', required_role: ['admin', 'quality_manager'] },
      { from: 'Implementation', to: 'Effectiveness Check', required_role: ['admin', 'quality_manager'] },
      { from: 'Effectiveness Check', to: 'Closed', required_role: ['admin', 'quality_manager'] },
    ],
    initial_status: 'Open',
  },
  simple: {
    statuses: ['Draft', 'Approved', 'Closed'],
    transitions: [
      { from: 'Draft', to: 'Approved', required_role: ['admin', 'quality_manager'] },
      { from: 'Approved', to: 'Closed', required_role: ['admin'] },
    ],
    initial_status: 'Draft',
  },
  investigation: {
    statuses: ['Open', 'Under Investigation', 'Pending Review', 'Closed'],
    transitions: [
      { from: 'Open', to: 'Under Investigation', required_role: ['admin', 'quality_manager'] },
      { from: 'Under Investigation', to: 'Pending Review', required_role: ['admin', 'quality_manager'] },
      { from: 'Pending Review', to: 'Closed', required_role: ['admin', 'quality_manager'] },
      { from: 'Pending Review', to: 'Under Investigation', required_role: ['admin', 'quality_manager'] },
    ],
    initial_status: 'Open',
  },
};

// ============================================================================
// System record type seed data
// ============================================================================

const SYSTEM_RECORD_TYPES: RecordTypeDefinition[] = [
  {
    id: 'rt-system-capa', org_id: 'demo-org', slug: 'capa',
    name: 'CAPA', description: 'Corrective and Preventive Action — ISO 13485 §8.5.2 / §8.5.3',
    is_system: true, code_prefix: 'CAPA-',
    status_flow: WORKFLOW_TEMPLATES.capa, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-ncr', org_id: 'demo-org', slug: 'ncr',
    name: 'Non-Conformité', description: 'Non-Conformance Report — ISO 13485 §8.3',
    is_system: true, code_prefix: 'NCR-',
    status_flow: WORKFLOW_TEMPLATES.investigation, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-deviation', org_id: 'demo-org', slug: 'deviation',
    name: 'Déviation', description: 'Deviation Report — ISO 13485 §8.3 / §7.1',
    is_system: true, code_prefix: 'DEV-',
    status_flow: WORKFLOW_TEMPLATES.investigation, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-change-control', org_id: 'demo-org', slug: 'change-control',
    name: 'Contrôle des Changements', description: 'Change Control — ISO 13485 §7.3.7 / §8.5.1',
    is_system: true, code_prefix: 'CC-',
    status_flow: WORKFLOW_TEMPLATES.document, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-audit', org_id: 'demo-org', slug: 'audit',
    name: 'Audit', description: 'Internal/External Audit — ISO 13485 §8.2.4',
    is_system: true, code_prefix: 'AUD-',
    status_flow: {
      statuses: ['Planned', 'In Progress', 'Completed'],
      transitions: [
        { from: 'Planned', to: 'In Progress', required_role: ['admin', 'quality_manager'] },
        { from: 'In Progress', to: 'Completed', required_role: ['admin', 'quality_manager'] },
      ],
      initial_status: 'Planned',
    }, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-risk', org_id: 'demo-org', slug: 'risk',
    name: 'Risque', description: 'Risk Management — ISO 14971 / ISO 13485 §7.1',
    is_system: true, code_prefix: 'RSK-',
    status_flow: {
      statuses: ['Open', 'Mitigated', 'Accepted', 'Closed'],
      transitions: [
        { from: 'Open', to: 'Mitigated', required_role: ['admin', 'quality_manager'] },
        { from: 'Open', to: 'Accepted', required_role: ['admin', 'quality_manager'] },
        { from: 'Mitigated', to: 'Closed', required_role: ['admin'] },
        { from: 'Accepted', to: 'Closed', required_role: ['admin'] },
      ],
      initial_status: 'Open',
    }, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-training', org_id: 'demo-org', slug: 'training',
    name: 'Formation', description: 'Training & Competency — ISO 13485 §6.2',
    is_system: true, code_prefix: 'TRN-',
    status_flow: {
      statuses: ['Planned', 'In Progress', 'Completed', 'Overdue'],
      transitions: [
        { from: 'Planned', to: 'In Progress', required_role: ['admin', 'quality_manager', 'document_controller'] },
        { from: 'In Progress', to: 'Completed', required_role: ['admin', 'quality_manager'] },
      ],
      initial_status: 'Planned',
    }, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-supplier', org_id: 'demo-org', slug: 'supplier',
    name: 'Fournisseur', description: 'Supplier Qualification — ISO 13485 §7.4',
    is_system: true, code_prefix: 'FRN-',
    status_flow: {
      statuses: ['Under Evaluation', 'Conditional', 'Qualified', 'Disqualified'],
      transitions: [
        { from: 'Under Evaluation', to: 'Conditional', required_role: ['admin', 'quality_manager'] },
        { from: 'Under Evaluation', to: 'Qualified', required_role: ['admin', 'quality_manager'] },
        { from: 'Conditional', to: 'Qualified', required_role: ['admin', 'quality_manager'] },
        { from: 'Conditional', to: 'Disqualified', required_role: ['admin'] },
        { from: 'Qualified', to: 'Disqualified', required_role: ['admin'] },
      ],
      initial_status: 'Under Evaluation',
    }, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-batch-record', org_id: 'demo-org', slug: 'batch-record',
    name: 'Batch Record', description: 'Batch/Production Record — ISO 13485 §7.5.1 / §8.2.4',
    is_system: true, code_prefix: 'BR-',
    status_flow: {
      statuses: ['In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine'],
      transitions: [
        { from: 'In Progress', to: 'Pending QA Review', required_role: ['admin', 'quality_manager', 'operator'] },
        { from: 'Pending QA Review', to: 'Released', required_role: ['admin', 'quality_manager'] },
        { from: 'Pending QA Review', to: 'Rejected', required_role: ['admin', 'quality_manager'] },
        { from: 'Pending QA Review', to: 'Quarantine', required_role: ['admin', 'quality_manager'] },
      ],
      initial_status: 'In Progress',
    }, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rt-system-oos-oot', org_id: 'demo-org', slug: 'oos-oot',
    name: 'OOS/OOT', description: 'Out of Specification / Out of Trend — 21 CFR 211.165 / ICH Q1A/Q2',
    is_system: true, code_prefix: 'OOS-',
    status_flow: WORKFLOW_TEMPLATES.investigation, json_schema: null,
    created_by: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
];

// ============================================================================
// Slug generation helper
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

// ============================================================================
// Access Denied Component
// ============================================================================

function AccessDenied() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        {t.settings?.accessDenied || 'Accès Refusé'}
      </h2>
      <p className="text-muted-foreground text-center max-w-md">
        {t.settings?.accessDeniedDesc || 'Seul un administrateur peut accéder aux paramètres du système. Contactez votre administrateur pour obtenir les droits nécessaires.'}
      </p>
    </div>
  );
}

// ============================================================================
// Workflow Visualizer Component
// ============================================================================

function WorkflowVisualizer({ flow }: { flow: StatusFlowConfig }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {flow.statuses.map((status, idx) => (
          <React.Fragment key={status}>
            <div className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium border',
              status === flow.initial_status
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                : 'bg-muted text-muted-foreground border-border'
            )}>
              {status}
              {status === flow.initial_status && (
                <span className="ml-1.5 text-[10px] text-blue-500">(initial)</span>
              )}
            </div>
            {idx < flow.statuses.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {flow.transitions.length} transition(s) | {flow.statuses.length} statut(s)
      </div>
    </div>
  );
}

// ============================================================================
// RecordTypeManager Component — Admin Only
// ============================================================================

function RecordTypeManager() {
  const { t } = useI18n();
  const { hasPermission, currentUser } = useAuth();
  const canManage = hasPermission('admin.settings');

  // State for record types (demo: local state initialized with system types)
  const [recordTypes, setRecordTypes] = useState<RecordTypeDefinition[]>(SYSTEM_RECORD_TYPES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<RecordTypeDefinition | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateRecordTypeDefinitionDTO>({
    name: '',
    description: '',
    code_prefix: '',
    status_flow: { ...DEFAULT_STATUS_FLOW },
    json_schema: null,
  });
  const [selectedWorkflowTemplate, setSelectedWorkflowTemplate] = useState<string>('document');

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<RecordTypeDefinition>>({});

  // Computed
  const filteredTypes = useMemo(() => {
    return recordTypes.filter(rt => {
      const matchesSearch = searchTerm === '' ||
        rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rt.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rt.code_prefix.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' ||
        (filterType === 'system' && rt.is_system) ||
        (filterType === 'custom' && !rt.is_system);
      return matchesSearch && matchesFilter;
    });
  }, [recordTypes, searchTerm, filterType]);

  const systemCount = recordTypes.filter(rt => rt.is_system).length;
  const customCount = recordTypes.filter(rt => !rt.is_system).length;

  // Handlers
  const resetCreateForm = () => {
    setCreateForm({ name: '', description: '', code_prefix: '', status_flow: { ...DEFAULT_STATUS_FLOW }, json_schema: null });
    setSelectedWorkflowTemplate('document');
  };

  const handleCreate = () => {
    if (!createForm.name || !createForm.code_prefix) return;
    const slug = generateSlug(createForm.name);
    // Check for slug conflict
    if (recordTypes.some(rt => rt.slug === slug)) {
      return; // TODO: show error
    }
    const newType: RecordTypeDefinition = {
      id: `rt-custom-${Date.now()}`,
      org_id: 'demo-org',
      slug,
      name: createForm.name,
      description: createForm.description || null,
      is_system: false,
      code_prefix: createForm.code_prefix,
      status_flow: createForm.status_flow,
      json_schema: createForm.json_schema || null,
      created_by: currentUser?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRecordTypes(prev => [...prev, newType]);
    resetCreateForm();
    setShowCreateDialog(false);
  };

  const handleEdit = () => {
    if (!selectedType || !editForm.name) return;
    // System types cannot be edited
    if (selectedType.is_system) return;
    setRecordTypes(prev => prev.map(rt =>
      rt.id === selectedType.id
        ? { ...rt, name: editForm.name || rt.name, description: editForm.description ?? rt.description, updated_at: new Date().toISOString() }
        : rt
    ));
    setShowEditDialog(false);
    setSelectedType(null);
  };

  const handleDelete = () => {
    if (!selectedType) return;
    if (selectedType.is_system) return;
    setRecordTypes(prev => prev.filter(rt => rt.id !== selectedType.id));
    setShowDeleteDialog(false);
    setSelectedType(null);
  };

  const openEdit = (rt: RecordTypeDefinition) => {
    if (rt.is_system) return;
    setEditForm({ name: rt.name, description: rt.description || '' });
    setSelectedType(rt);
    setShowEditDialog(true);
  };

  const openDelete = (rt: RecordTypeDefinition) => {
    if (rt.is_system) return;
    setSelectedType(rt);
    setShowDeleteDialog(true);
  };

  const openDetail = (rt: RecordTypeDefinition) => {
    setSelectedType(rt);
    setShowDetailDialog(true);
  };

  // Apply workflow template
  const handleWorkflowTemplateChange = (template: string) => {
    setSelectedWorkflowTemplate(template);
    if (WORKFLOW_TEMPLATES[template]) {
      setCreateForm(prev => ({ ...prev, status_flow: { ...WORKFLOW_TEMPLATES[template] } }));
    }
  };

  // Auto-generate code_prefix from name
  const handleNameChange = (name: string) => {
    const prefix = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 4) + '-';
    setCreateForm(prev => ({ ...prev, name, code_prefix: prev.code_prefix || prefix }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {t.settings?.recordTypes?.title || 'Types d\'Enregistrements'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t.settings?.recordTypes?.description || 'Gérez les types d\'enregistrements du système qualité. Les modules système sont protégés conformément à l\'ISO 13485.'}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t.settings?.recordTypes?.newType || 'Nouveau Type'}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.settings?.recordTypes?.totalTypes || 'Total'}</span>
            </div>
            <span className="text-2xl font-bold">{recordTypes.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">{t.settings?.recordTypes?.systemTypes || 'Système'}</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{systemCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">{t.settings?.recordTypes?.customTypes || 'Personnalisés'}</span>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{customCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.settings?.recordTypes?.searchPlaceholder || 'Rechercher par nom, slug ou préfixe...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'system' | 'custom')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.settings?.recordTypes?.allTypes || 'Tous les types'}</SelectItem>
            <SelectItem value="system">{t.settings?.recordTypes?.systemOnly || 'Système uniquement'}</SelectItem>
            <SelectItem value="custom">{t.settings?.recordTypes?.customOnly || 'Personnalisés uniquement'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Record Types Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-[120px]">Slug</TableHead>
                  <TableHead className="w-[100px]">Préfixe</TableHead>
                  <TableHead className="w-[140px]">Workflow</TableHead>
                  <TableHead className="w-[100px]">Statuts</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map(rt => (
                  <TableRow
                    key={rt.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => openDetail(rt)}
                  >
                    <TableCell>
                      {rt.is_system ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] cursor-default" variant="secondary">
                                <Lock className="h-2.5 w-2.5 mr-0.5" />Système
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Module système protégé — ISO 13485. Impossible de modifier ou supprimer.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]" variant="secondary">
                          <Unlock className="h-2.5 w-2.5 mr-0.5" />Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{rt.name}</span>
                        {rt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{rt.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rt.slug}</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-semibold text-primary">{rt.code_prefix}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Workflow className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{rt.status_flow.transitions.length} transitions</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{rt.status_flow.statuses.length} statuts</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openDetail(rt); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && !rt.is_system && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(rt); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); openDelete(rt); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t.settings?.recordTypes?.noTypesFound || 'Aucun type trouvé pour ces filtres'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Record Type Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {t.settings?.recordTypes?.createTitle || 'Créer un Nouveau Type d\'Enregistrement'}
            </DialogTitle>
            <DialogDescription>
              {t.settings?.recordTypes?.createDesc || 'Définissez un nouveau type d\'enregistrement personnalisé pour votre système qualité. Ce type sera soumis au workflow d\'approbation ISO 13485 §4.2.3.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label className="font-medium">{t.settings?.recordTypes?.name || 'Nom du Type'} *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t.settings?.recordTypes?.namePlaceholder || 'ex: Inspection Visuelle'}
              />
              <p className="text-xs text-muted-foreground">
                Slug auto-généré : <code className="bg-muted px-1 rounded">{generateSlug(createForm.name || '')}</code>
              </p>
            </div>

            {/* Code Prefix */}
            <div className="grid gap-2">
              <Label className="font-medium">{t.settings?.recordTypes?.codePrefix || 'Préfixe de Numérotation'} *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createForm.code_prefix}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, code_prefix: e.target.value }))}
                  placeholder="ex: INSP-"
                  className="w-[150px]"
                />
                <span className="text-xs text-muted-foreground">0001</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Préfixe utilisé pour la numérotation automatique des enregistrements de ce type.
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>{t.settings?.recordTypes?.descriptionField || 'Description'}</Label>
              <Textarea
                value={createForm.description || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.settings?.recordTypes?.descriptionPlaceholder || 'Décrivez l\'objectif de ce type d\'enregistrement et sa référence réglementaire...'}
                rows={3}
              />
            </div>

            {/* Workflow Template */}
            <div className="grid gap-2">
              <Label className="font-medium">{t.settings?.recordTypes?.workflowTemplate || 'Template de Workflow'}</Label>
              <Select value={selectedWorkflowTemplate} onValueChange={handleWorkflowTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document (Draft → In Review → Approved → Effective → Obsolete)</SelectItem>
                  <SelectItem value="capa">CAPA (Open → Investigation → Implementation → Effectiveness Check → Closed)</SelectItem>
                  <SelectItem value="investigation">Investigation (Open → Under Investigation → Pending Review → Closed)</SelectItem>
                  <SelectItem value="simple">Simple (Draft → Approved → Closed)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Workflow Preview */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t.settings?.recordTypes?.workflowPreview || 'Aperçu du Workflow'}</span>
              </div>
              <WorkflowVisualizer flow={createForm.status_flow} />
            </div>

            {/* ISO 13485 Compliance Notice */}
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Conformité ISO 13485
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    La création d'un nouveau type d'enregistrement est un acte réglementé par l'ISO 13485 §4.2.3 (Maîtrise des documents).
                    Ce type devra être approuvé via le workflow avant de pouvoir créer des instances d'enregistrements.
                    Toute modification sera tracée dans l'audit trail conformément au 21 CFR Part 11.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreate} disabled={!createForm.name || !createForm.code_prefix}>
                <Plus className="h-4 w-4 mr-2" />
                {t.common.create || 'Créer'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t.common.cancel || 'Annuler'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Record Type Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              {t.settings?.recordTypes?.editTitle || 'Modifier le Type d\'Enregistrement'}
            </DialogTitle>
            <DialogDescription>
              {t.settings?.recordTypes?.editDesc || 'Modifiez les propriétés du type personnalisé. Le slug et le préfixe ne peuvent pas être modifiés après création.'}
            </DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="grid gap-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <code className="bg-muted px-2 py-1 rounded text-sm font-semibold text-primary">{selectedType.code_prefix}</code>
                <div>
                  <p className="font-medium">{selectedType.name}</p>
                  <p className="text-xs text-muted-foreground">Slug: {selectedType.slug}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="font-medium">Nom *</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleEdit} disabled={!editForm.name}>
                  {t.common.save || 'Enregistrer'}
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  {t.common.cancel || 'Annuler'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              {t.settings?.recordTypes?.deleteTitle || 'Supprimer le Type d\'Enregistrement'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedType && (
                <>
                  {t.settings?.recordTypes?.deleteDesc || 'Êtes-vous sûr de vouloir supprimer le type'} <strong>{selectedType.name}</strong> ({selectedType.slug}) ?
                  {t.settings?.recordTypes?.deleteWarning || 'Cette action est irréversible. Tous les enregistrements associés seront également supprimés.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel || 'Annuler'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t.common.delete || 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedType && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    selectedType.is_system ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                  )}>
                    {selectedType.is_system ? (
                      <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Unlock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p>{selectedType.name}</p>
                    <p className="text-sm font-normal text-muted-foreground">{selectedType.slug}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedType.is_system ? (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <Lock className="h-3 w-3 mr-1" />Module Système
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Unlock className="h-3 w-3 mr-1" />Type Personnalisé
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Hash className="h-3 w-3 mr-1" />{selectedType.code_prefix}0001
                  </Badge>
                </div>

                {/* Description */}
                {selectedType.description && (
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedType.description}</p>
                  </div>
                )}

                {/* Workflow */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    Configuration du Workflow
                  </h4>
                  <WorkflowVisualizer flow={selectedType.status_flow} />

                  {/* Transitions detail */}
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Détail des transitions :</p>
                    {selectedType.status_flow.transitions.map((tr, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">{tr.from}</Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px]">{tr.to}</Badge>
                        <span className="text-muted-foreground ml-2">
                          Rôles: {tr.required_role.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ISO Reference */}
                <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Référence ISO 13485</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        {selectedType.is_system
                          ? 'Ce module est un type système protégé. Toute modification est interdite par le trigger protect_system_record_types() afin de garantir la conformité du QMS.'
                          : 'Ce type est personnalisé. Les modifications sont tracées dans l\'audit trail (21 CFR Part 11). Le workflow doit être approuvé conformément à l\'ISO 13485 §4.2.3 avant création d\'instances.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Créé le:</span>
                    <span className="font-medium">{formatDate(selectedType.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Mis à jour:</span>
                    <span className="font-medium">{formatDate(selectedType.updated_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                {canManage && !selectedType.is_system && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowDetailDialog(false); openEdit(selectedType); }}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { setShowDetailDialog(false); openDelete(selectedType); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// General Settings Tab Content
// ============================================================================

function GeneralSettings() {
  const { t } = useI18n();
  const { orgSettings, updateSettings } = useOrganization();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('admin.settings');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t.settings?.general?.orgSettings || 'Paramètres de l\'Organisation'}
          </CardTitle>
          <CardDescription>
            {t.settings?.general?.orgSettingsDesc || 'Configuration générale du système qualité'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Signature Électronique Obligatoire</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={orgSettings?.require_electronic_signatures ?? true}
                  disabled={!canManage}
                  onCheckedChange={(checked) => updateSettings({ require_electronic_signatures: checked })}
                />
                <span className="text-sm text-muted-foreground">21 CFR Part 11 / EU Annex 11</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Audit Trail Activé</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={orgSettings?.audit_trail_enabled ?? true}
                  disabled={!canManage}
                  onCheckedChange={(checked) => updateSettings({ audit_trail_enabled: checked })}
                />
                <span className="text-sm text-muted-foreground">ISO 13485 §4.2.4</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Documents Prérequis Requis</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={orgSettings?.require_prerequisite_docs ?? false}
                  disabled={!canManage}
                  onCheckedChange={(checked) => updateSettings({ require_prerequisite_docs: checked })}
                />
                <span className="text-sm text-muted-foreground">Vérification avant approbation</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Période de Rétention par Défaut</Label>
            <Input
              value={orgSettings?.default_document_retention || '5 ans'}
              disabled={!canManage}
              onChange={(e) => canManage && updateSettings({ default_document_retention: e.target.value })}
              className="w-[200px]"
            />
            <p className="text-xs text-muted-foreground">ISO 13485 §4.2.4 — Durée minimale de conservation des enregistrements</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.settings?.general?.notificationSettings || 'Paramètres de Notification'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'capa_overdue' as const, label: 'CAPA en retard', iso: '§8.5.2' },
            { key: 'ncr_overdue' as const, label: 'NCR en retard', iso: '§8.3' },
            { key: 'document_expiry' as const, label: 'Expiration de document', iso: '§4.2.3' },
            { key: 'training_overdue' as const, label: 'Formation en retard', iso: '§6.2' },
            { key: 'audit_due' as const, label: 'Audit à venir', iso: '§8.2.4' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-sm">{item.label}</span>
                <Badge variant="outline" className="text-[10px]">{item.iso}</Badge>
              </div>
              <Switch
                checked={orgSettings?.notification_settings?.[item.key] ?? true}
                disabled={!canManage}
                onCheckedChange={(checked) => {
                  if (!canManage) return;
                  updateSettings({
                    notification_settings: {
                      ...orgSettings?.notification_settings,
                      capa_overdue: orgSettings?.notification_settings?.capa_overdue ?? true,
                      ncr_overdue: orgSettings?.notification_settings?.ncr_overdue ?? true,
                      document_expiry: orgSettings?.notification_settings?.document_expiry ?? true,
                      training_overdue: orgSettings?.notification_settings?.training_overdue ?? true,
                      audit_due: orgSettings?.notification_settings?.audit_due ?? true,
                      [item.key]: checked,
                    },
                  });
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main SettingsView Component
// ============================================================================

export function SettingsView() {
  const { t } = useI18n();
  const { hasPermission, currentUser } = useAuth();
  const canAccess = hasPermission('admin.settings');

  // Access guard — only admin can access settings
  if (!canAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t.settings?.title || 'Paramètres'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.settings?.description || 'Configuration du système qualité — Accessible uniquement aux administrateurs'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Session Admin
          </Badge>
          <span className="text-xs text-muted-foreground">
            {currentUser?.fullName} ({currentUser?.role})
          </span>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings?.tabs?.general || 'Général'}</span>
          </TabsTrigger>
          <TabsTrigger value="record-types" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings?.tabs?.recordTypes || 'Types d\'Enreg.'}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings?.tabs?.users || 'Sécurité'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="record-types">
          <RecordTypeManager />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sécurité & Permissions
              </CardTitle>
              <CardDescription>
                Gestion des rôles et permissions du système — ISO 13485 §5.5.2 / 21 CFR Part 11
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Matrice des Rôles</h4>
                  <p className="text-sm text-muted-foreground">
                    La gestion des utilisateurs et des rôles est accessible via l'onglet « Gestion Utilisateurs » dans la barre latérale.
                    Les permissions sont définies conformément au principe du moindre privilège (ISO 13485 §5.5.2).
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { role: 'admin', label: 'Administrateur', desc: 'Accès complet + paramètres', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                      { role: 'quality_manager', label: 'Responsable Qualité', desc: 'CRUD + approbations', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                      { role: 'auditor', label: 'Auditeur', desc: 'Lecture + audits', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                      { role: 'document_controller', label: 'Contrôleur Doc.', desc: 'Gestion documents', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
                      { role: 'executive', label: 'Direction', desc: 'Lecture + rapports', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                      { role: 'operator', label: 'Opérateur', desc: 'Production limitée', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
                    ].map(r => (
                      <div key={r.role} className="border rounded-md p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-[10px]', r.color)} variant="secondary">{r.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">21 CFR Part 11 — Conformité</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Signatures électroniques', status: true },
                      { label: 'Audit trail des actions', status: true },
                      { label: 'Vérification d\'identité', status: true },
                      { label: 'Verrouillage après approbation', status: true },
                      { label: 'Horodatage sécurisé', status: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <CheckCircle2 className={cn('h-4 w-4', item.status ? 'text-green-600' : 'text-red-600')} />
                        <span className="text-sm">{item.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{item.status ? 'Actif' : 'Inactif'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
