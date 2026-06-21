'use client';

/**
 * RecordTypeManager — Admin UI for managing record type definitions
 * ISO 13485 §4.1 (QMS completeness), §4.2.3 (document control)
 *
 * Features:
 * - List all record types (system + custom)
 * - Create new custom record types
 * - Configure status flows, fields, compliance refs
 * - Auto-numbering prefix setup
 * - System type protection (read-only)
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Plus, ShieldCheck, FileText, Trash2, Edit, Search,
  ChevronRight, AlertTriangle, CheckCircle, Lock,
} from 'lucide-react';
import type {
  RecordTypeDefinitionLegacy as RecordTypeDefinition,
  StatusFlowStep, ComplianceRef,
  FormFieldDefinition,
} from '@/types/qms';
import { useAuth } from '@/contexts/AuthContext';
import { useQMSStore } from '@/lib/demo-store';

// ============================================================================
// Constants
// ============================================================================

const SYSTEM_ICONS = [
  'FileText', 'ShieldCheck', 'AlertTriangle', 'Search', 'TrendingUp',
  'GraduationCap', 'Truck', 'Package', 'FlaskConical', 'GitBranch',
  'RefreshCw', 'Settings', 'ClipboardCheck', 'Beaker', 'Wrench',
  'Microscope', 'Thermometer', 'Scale', 'Cpu', 'Database',
];

const ISO_CLAUSES = [
  { clause: '4.1', standard: 'ISO 13485', description: 'Quality management system — General requirements' },
  { clause: '4.2.3', standard: 'ISO 13485', description: 'Medical device file' },
  { clause: '4.2.4', standard: 'ISO 13485', description: 'Control of records' },
  { clause: '6.2', standard: 'ISO 13485', description: 'Competence, awareness and training' },
  { clause: '7.1', standard: 'ISO 13485', description: 'Planning of product realization' },
  { clause: '7.3', standard: 'ISO 13485', description: 'Design and development' },
  { clause: '7.3.7', standard: 'ISO 13485', description: 'Design changes' },
  { clause: '7.4', standard: 'ISO 13485', description: 'Purchasing' },
  { clause: '7.5.1', standard: 'ISO 13485', description: 'Control of production' },
  { clause: '7.5.6', standard: 'ISO 13485', description: 'Validation of processes' },
  { clause: '7.5.8', standard: 'ISO 13485', description: 'Identification' },
  { clause: '7.5.9', standard: 'ISO 13485', description: 'Traceability' },
  { clause: '8.2.4', standard: 'ISO 13485', description: 'Internal audit' },
  { clause: '8.3', standard: 'ISO 13485', description: 'Control of nonconforming product' },
  { clause: '8.4', standard: 'ISO 13485', description: 'Analysis of data' },
  { clause: '8.5.2', standard: 'ISO 13485', description: 'Corrective action' },
  { clause: '8.5.3', standard: 'ISO 13485', description: 'Preventive action' },
  { clause: '3', standard: 'ISO 14971', description: 'Risk analysis' },
  { clause: '11.10', standard: '21 CFR Part 11', description: 'Controls for closed systems' },
  { clause: '11.50', standard: '21 CFR Part 11', description: 'Signature manifestations' },
  { clause: '11.70', standard: '21 CFR Part 11', description: 'Signature/record linkage' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function RecordTypeManager() {
  // Subscribe directly to store slices — avoids the `setState in useEffect`
  // anti-pattern that triggers cascading renders (react-hooks/set-state-in-effect).
  // Zustand selectors are stable and only re-render when the selected slice changes.
  const recordTypes = useQMSStore(s => s.recordTypes);
  const addRecordType = useQMSStore(s => s.addRecordType);
  const deleteRecordType = useQMSStore(s => s.deleteRecordType);
  const { hasPermission } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<RecordTypeDefinition | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Create form state
  const [formSlug, setFormSlug] = useState('');
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formIcon, setFormIcon] = useState('FileText');
  const [formDescription, setFormDescription] = useState('');
  const [formCodePrefix, setFormCodePrefix] = useState('');
  const [formRequiresEsig, setFormRequiresEsig] = useState(true);
  const [formStatusFlow, setFormStatusFlow] = useState<StatusFlowStep[]>([
    { linear: ['Open', 'Under Review', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] },
  ]);
  const [formComplianceRefs, setFormComplianceRefs] = useState<ComplianceRef[]>([]);
  const [formChangeReason, setFormChangeReason] = useState('');
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission('recordtypes.create');
  const canUpdate = hasPermission('recordtypes.update');
  const canDelete = hasPermission('recordtypes.delete');

  // Filter
  const filteredTypes = recordTypes.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const systemTypes = filteredTypes.filter(t => t.isSystem);
  const customTypes = filteredTypes.filter(t => !t.isSystem);

  // Reset form
  const resetForm = useCallback(() => {
    setFormSlug('');
    setFormName('');
    setFormNameEn('');
    setFormIcon('FileText');
    setFormDescription('');
    setFormCodePrefix('');
    setFormRequiresEsig(true);
    setFormStatusFlow([{ linear: ['Open', 'Under Review', 'Closed'], eSigRequired: ['Closed'], terminal: ['Closed'] }]);
    setFormComplianceRefs([]);
    setFormChangeReason('');
    setFormError('');
  }, []);

  // Handle create
  const handleCreate = useCallback(() => {
    setFormError('');

    // Validate
    if (!formSlug.match(/^[a-z][a-z0-9_]*$/)) {
      setFormError('Le slug doit être en minuscules, alphanumérique avec underscores, commençant par une lettre.');
      return;
    }
    if (!formName || formName.length < 2) {
      setFormError('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    if (formComplianceRefs.length === 0) {
      setFormError('Au moins une référence de conformité est requise (ISO 13485 §8.4).');
      return;
    }

    const allTerminal = formStatusFlow.flatMap(f => f.terminal || []);
    if (allTerminal.length === 0) {
      setFormError('Le flux de statuts doit définir au moins un état terminal (ISO 13485 §4.2.4).');
      return;
    }

    // Check slug uniqueness
    const existing = recordTypes.find(t => t.slug === formSlug);
    if (existing) {
      setFormError(`Le slug "${formSlug}" existe déjà.`);
      return;
    }

    try {
      addRecordType({
        slug: formSlug,
        name: formName,
        nameEn: formNameEn || undefined,
        icon: formIcon,
        description: formDescription || undefined,
        statusFlow: formStatusFlow,
        defaultFields: [],
        complianceRefs: formComplianceRefs,
        codePrefix: formCodePrefix || undefined,
        requiresEsig: formRequiresEsig,
        minApproverCount: 1,
        changeReason: formChangeReason || undefined,
        isSystem: false,
        isActive: true,
      });

      // No manual refresh needed — the Zustand selector subscription
      // (recordTypes = useQMSStore(s => s.recordTypes)) re-renders automatically.
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  }, [formSlug, formName, formNameEn, formIcon, formDescription, formCodePrefix,
      formRequiresEsig, formStatusFlow, formComplianceRefs, formChangeReason,
      recordTypes, addRecordType, resetForm]);

  // Handle delete (custom only)
  const handleDelete = useCallback((type: RecordTypeDefinition) => {
    if (type.isSystem) return;
    if (!confirm(`Supprimer le type d'enregistrement "${type.name}" ? Cette action est irréversible.`)) return;

    try {
      deleteRecordType(type.id);
      setShowDetailDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }, [deleteRecordType]);

  // Add compliance ref
  const addComplianceRef = useCallback(() => {
    setFormComplianceRefs(prev => [...prev, { clause: '', standard: 'ISO 13485', description: '' }]);
  }, []);

  // Remove compliance ref
  const removeComplianceRef = useCallback((idx: number) => {
    setFormComplianceRefs(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Update compliance ref
  const updateComplianceRef = useCallback((idx: number, field: keyof ComplianceRef, value: string) => {
    setFormComplianceRefs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  // Add status to linear flow
  const addLinearStatus = useCallback((stepIdx: number) => {
    setFormStatusFlow(prev => {
      const next = [...prev];
      const step = { ...next[stepIdx] };
      step.linear = [...step.linear, `Step${step.linear.length + 1}`];
      next[stepIdx] = step;
      return next;
    });
  }, []);

  // Remove status from linear flow
  const removeLinearStatus = useCallback((stepIdx: number, statusIdx: number) => {
    setFormStatusFlow(prev => {
      const next = [...prev];
      const step = { ...next[stepIdx] };
      step.linear = step.linear.filter((_, i) => i !== statusIdx);
      next[stepIdx] = step;
      return next;
    });
  }, []);

  // Update status in linear flow
  const updateLinearStatus = useCallback((stepIdx: number, statusIdx: number, value: string) => {
    setFormStatusFlow(prev => {
      const next = [...prev];
      const step = { ...next[stepIdx] };
      step.linear = [...step.linear];
      step.linear[statusIdx] = value;
      next[stepIdx] = step;
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Types d'Enregistrements</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des types d'enregistrements système et personnalisés — ISO 13485 §4.1, §4.2.3
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Type
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Rechercher un type d'enregistrement..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* System Types */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Modules Système ({systemTypes.length})
          <Badge variant="secondary" className="text-xs">Protégé ISO 13485</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {systemTypes.map(type => (
            <div
              key={type.id}
              className="border rounded-lg p-4 bg-blue-50/50 border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelectedType(type); setShowDetailDialog(true); }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900">{type.name}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Slug : <code className="bg-blue-100 px-1 rounded">{type.slug}</code></div>
                <div>Préfixe : <code className="bg-blue-100 px-1 rounded">{type.codePrefix || '—'}</code></div>
                <div>Flux : {type.statusFlow?.[0]?.linear?.join(' → ') || 'N/A'}</div>
                {type.complianceRefs?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {type.complianceRefs.slice(0, 3).map((ref, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {ref.standard} {ref.clause}
                      </Badge>
                    ))}
                    {type.complianceRefs.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">+{type.complianceRefs.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Types */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Types Personnalisés ({customTypes.length})
        </h3>
        {customTypes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Aucun type personnalisé créé</p>
            <p className="text-xs mt-1">Créez un type pour étendre votre QMS au-delà des 10 modules système</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTypes.map(type => (
              <div
                key={type.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedType(type); setShowDetailDialog(true); }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{type.name}</span>
                  <Badge variant={type.isActive ? 'default' : 'secondary'}>
                    {type.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Slug : <code className="bg-gray-100 px-1 rounded">{type.slug}</code></div>
                  <div>Préfixe : <code className="bg-gray-100 px-1 rounded">{type.codePrefix || '—'}</code></div>
                  <div>Flux : {type.statusFlow?.[0]?.linear?.join(' → ') || 'N/A'}</div>
                  {type.complianceRefs?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {type.complianceRefs.map((ref, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {ref.standard} {ref.clause}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== CREATE DIALOG ========== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un Type d'Enregistrement Personnalisé</DialogTitle>
            <DialogDescription>
              Définissez un nouveau type d'enregistrement pour étendre votre QMS.
              ISO 13485 §4.1, §4.2.3, §4.2.4
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Identification */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug (identifiant unique)</Label>
                <Input
                  placeholder="ex: etalonnage_equipement"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                />
                <p className="text-xs text-gray-400 mt-1">Minuscules, sans espaces</p>
              </div>
              <div>
                <Label>Nom (français) *</Label>
                <Input
                  placeholder="ex: Étalonnage Équipement"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom (anglais)</Label>
                <Input
                  placeholder="ex: Equipment Calibration"
                  value={formNameEn}
                  onChange={e => setFormNameEn(e.target.value)}
                />
              </div>
              <div>
                <Label>Préfixe de numérotation</Label>
                <Input
                  placeholder="ex: ETL"
                  value={formCodePrefix}
                  onChange={e => setFormCodePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
                  maxLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">Génère ETL-2025-001, etc.</p>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Décrivez l'objectif de ce type d'enregistrement..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Icon selection */}
            <div>
              <Label>Icône</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SYSTEM_ICONS.map(icon => (
                  <button
                    key={icon}
                    className={`w-8 h-8 rounded border flex items-center justify-center text-xs ${
                      formIcon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setFormIcon(icon)}
                    title={icon}
                  >
                    {icon.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Flow */}
            <div className="border rounded-lg p-4">
              <Label className="text-base font-semibold">Flux de Statuts</Label>
              <p className="text-xs text-gray-500 mb-3">
                Définissez les états par lesquels un enregistrement passe. Au moins un état terminal est requis.
              </p>

              {formStatusFlow.map((step, stepIdx) => (
                <div key={stepIdx} className="space-y-2">
                  {/* Linear flow */}
                  <div>
                    <Label className="text-sm">Progression linéaire</Label>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {step.linear.map((status, statusIdx) => (
                        <div key={statusIdx} className="flex items-center gap-1">
                          {statusIdx > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                          <Input
                            className="w-32 h-8 text-sm"
                            value={status}
                            onChange={e => updateLinearStatus(stepIdx, statusIdx, e.target.value)}
                          />
                          {step.linear.length > 2 && (
                            <button
                              className="text-red-400 hover:text-red-600"
                              onClick={() => removeLinearStatus(stepIdx, statusIdx)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => addLinearStatus(stepIdx)}
                      >
                        + État
                      </Button>
                    </div>
                  </div>

                  {/* Terminal states */}
                  <div>
                    <Label className="text-sm">États terminaux (séparés par des virgules)</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Closed, Completed"
                      value={(step.terminal || []).join(', ')}
                      onChange={e => {
                        const terminals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setFormStatusFlow(prev => {
                          const next = [...prev];
                          next[stepIdx] = { ...next[stepIdx], terminal: terminals };
                          return next;
                        });
                      }}
                    />
                  </div>

                  {/* E-signature required states */}
                  <div>
                    <Label className="text-sm">États nécessitant une e-signature (séparés par des virgules)</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Closed, Approved"
                      value={(step.eSigRequired || []).join(', ')}
                      onChange={e => {
                        const eSig = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setFormStatusFlow(prev => {
                          const next = [...prev];
                          next[stepIdx] = { ...next[stepIdx], eSigRequired: eSig };
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance References */}
            <div className="border rounded-lg p-4">
              <Label className="text-base font-semibold">Références de Conformité *</Label>
              <p className="text-xs text-gray-500 mb-3">
                Au moins une référence réglementaire est requise (ISO 13485 §8.4).
              </p>

              {formComplianceRefs.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={`${ref.standard}|${ref.clause}`}
                    onChange={e => {
                      const [standard, clause] = e.target.value.split('|');
                      const found = ISO_CLAUSES.find(c => c.standard === standard && c.clause === clause);
                      updateComplianceRef(idx, 'standard', standard);
                      updateComplianceRef(idx, 'clause', clause);
                      if (found) updateComplianceRef(idx, 'description', found.description);
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    {ISO_CLAUSES.map((c, i) => (
                      <option key={i} value={`${c.standard}|${c.clause}`}>
                        {c.standard} {c.clause} — {c.description}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Description"
                    value={ref.description || ''}
                    onChange={e => updateComplianceRef(idx, 'description', e.target.value)}
                  />
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={() => removeComplianceRef(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addComplianceRef}>
                <Plus className="w-3 h-3 mr-1" />
                Ajouter une référence
              </Button>
            </div>

            {/* E-signature requirement */}
            <div className="flex items-center gap-3">
              <Switch
                checked={formRequiresEsig}
                onCheckedChange={setFormRequiresEsig}
              />
              <Label>E-signature requise pour toutes les transitions</Label>
              <Badge variant="outline" className="text-xs">21 CFR Part 11</Badge>
            </div>

            {/* Change reason */}
            <div>
              <Label>Raison de la création</Label>
              <Textarea
                placeholder="Pourquoi ce type d'enregistrement est-il nécessaire ?"
                value={formChangeReason}
                onChange={e => setFormChangeReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Créer le Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== DETAIL DIALOG ========== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          {selectedType && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedType.isSystem && <Lock className="w-5 h-5 text-blue-600" />}
                  {selectedType.name}
                  <Badge variant={selectedType.isSystem ? 'default' : 'secondary'}>
                    {selectedType.isSystem ? 'Système' : 'Personnalisé'}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Slug :</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{selectedType.slug}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">Préfixe :</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{selectedType.codePrefix || '—'}</code>
                  </div>
                  {selectedType.nameEn && (
                    <div>
                      <span className="text-gray-500">Nom (EN) :</span> {selectedType.nameEn}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">E-signature :</span>{' '}
                    {selectedType.requiresEsig ? '✅ Requise' : '❌ Non requise'}
                  </div>
                </div>

                {selectedType.description && (
                  <div>
                    <Label className="text-sm font-semibold">Description</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedType.description}</p>
                  </div>
                )}

                {/* Status Flow */}
                <div>
                  <Label className="text-sm font-semibold">Flux de Statuts</Label>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {selectedType.statusFlow?.[0]?.linear?.map((status, idx) => {
                      const isTerminal = selectedType.statusFlow?.[0]?.terminal?.includes(status);
                      const requiresEsig = selectedType.statusFlow?.[0]?.eSigRequired?.includes(status);
                      return (
                        <React.Fragment key={idx}>
                          {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isTerminal ? 'bg-red-100 text-red-700' :
                            requiresEsig ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {status}
                            {isTerminal && ' ⏹'}
                            {requiresEsig && ' ✍️'}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    ⏹ = Terminal &nbsp; ✍️ = E-signature requise
                  </p>
                </div>

                {/* Compliance References */}
                {selectedType.complianceRefs?.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Références de Conformité</Label>
                    <div className="mt-2 space-y-1">
                      {selectedType.complianceRefs.map((ref, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{ref.standard} {ref.clause}</Badge>
                          <span className="text-gray-600">{ref.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {!selectedType.isSystem && canDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedType)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
