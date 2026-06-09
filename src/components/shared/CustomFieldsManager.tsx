'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { CustomFieldDefinition, CustomFieldType } from '@/types/qms';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'url', label: 'URL' },
];

const APPLICABLE_TO_OPTIONS = [
  { value: '*', label: 'All Document Types' },
  { value: 'SOP', label: 'SOP' },
  { value: 'WI', label: 'Work Instruction' },
  { value: 'Form', label: 'Form' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Specification', label: 'Specification' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Instruction', label: 'Instruction' },
  { value: 'Record', label: 'Record' },
  { value: 'Manual', label: 'Manual' },
];

interface FieldFormData {
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  defaultValue: string;
  applicableTo: string[];
}

const emptyFormData: FieldFormData = {
  name: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
  placeholder: '',
  defaultValue: '',
  applicableTo: ['*'],
};

export function CustomFieldsManager() {
  const { toast } = useToast();
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FieldFormData>(emptyFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState('');

  const fetchDefinitions = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-fields');
      const json = await res.json();
      if (json.success) {
        setDefinitions(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyFormData);
    setOptionInput('');
    setShowDialog(true);
  };

  const handleOpenEdit = (def: CustomFieldDefinition) => {
    setEditingId(def.id);
    setFormData({
      name: def.name,
      label: def.label,
      type: def.type,
      required: def.required,
      options: def.options || [],
      placeholder: def.placeholder || '',
      defaultValue: def.defaultValue || '',
      applicableTo: def.applicableTo,
    });
    setOptionInput('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.label.trim()) return;

    const body = {
      ...formData,
      options: formData.type === 'select' ? formData.options : undefined,
      placeholder: formData.placeholder || undefined,
      defaultValue: formData.defaultValue || undefined,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/custom-fields/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) {
          toast({ title: 'Error', description: json.error, variant: 'destructive' });
          return;
        }
        toast({ title: 'Field Updated', description: `"${formData.label}" has been updated.` });
      } else {
        const res = await fetch('/api/custom-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) {
          toast({ title: 'Error', description: json.error, variant: 'destructive' });
          return;
        }
        toast({ title: 'Field Created', description: `"${formData.label}" has been created.` });
      }
      setShowDialog(false);
      fetchDefinitions();
    } catch {
      toast({ title: 'Error', description: 'Failed to save custom field', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Field Deleted', description: 'Custom field has been removed.' });
        fetchDefinitions();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete custom field', variant: 'destructive' });
    }
    setDeleteConfirmId(null);
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = definitions.findIndex(d => d.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === definitions.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...definitions];
    const temp = updated[idx];
    updated[idx] = updated[swapIdx];
    updated[swapIdx] = temp;

    // Update sort orders
    const reordered = updated.map((d, i) => ({ ...d, sortOrder: i }));
    setDefinitions(reordered);

    // Persist sort order via API
    try {
      await fetch(`/api/custom-fields/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: direction === 'up' ? idx - 1 : idx + 1 }),
      });
      await fetch(`/api/custom-fields/${updated[swapIdx].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: direction === 'up' ? idx : idx - 1 }),
      });
    } catch {
      // silently fail
    }
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setFormData(prev => ({ ...prev, options: [...prev.options, optionInput.trim()] }));
      setOptionInput('');
    }
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const toggleApplicableTo = (value: string) => {
    setFormData(prev => {
      if (value === '*') {
        return { ...prev, applicableTo: ['*'] };
      }
      const current = prev.applicableTo.includes('*') ? [] : prev.applicableTo;
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, applicableTo: updated.length === 0 ? ['*'] : updated };
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading custom fields...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Custom Fields
          </CardTitle>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Field
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Define custom fields that can be added to documents based on their type.
        </p>
      </CardHeader>
      <CardContent>
        {definitions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No custom fields defined yet.</p>
            <p className="text-xs mt-1">Click &quot;Add Field&quot; to create your first custom field.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {definitions.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleReorder(def.id, 'up')}
                          disabled={def.sortOrder === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleReorder(def.id, 'down')}
                          disabled={def.sortOrder === definitions.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{def.name}</TableCell>
                    <TableCell>{def.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{def.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {def.required ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Optional</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {def.applicableTo.includes('*') ? (
                          <Badge variant="secondary" className="text-xs">All</Badge>
                        ) : (
                          def.applicableTo.map(a => (
                            <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(def)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmId(def.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Custom Field' : 'Create Custom Field'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modify the custom field definition.' : 'Define a new custom field for documents.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cf-name">Field Name *</Label>
                <Input
                  id="cf-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., gxpClassification"
                />
                <p className="text-xs text-muted-foreground">Unique identifier (no spaces)</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-label">Display Label *</Label>
                <Input
                  id="cf-label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., GxP Classification"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Field Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as CustomFieldType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-required">Required</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    id="cf-required"
                    checked={formData.required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.required ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {formData.type === 'select' && (
              <div className="grid gap-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1">
                        {opt}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={() => removeOption(i)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cf-placeholder">Placeholder</Label>
                <Input
                  id="cf-placeholder"
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Placeholder text..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cf-default">Default Value</Label>
                <Input
                  id="cf-default"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Default value..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Applicable To</Label>
              <div className="flex flex-wrap gap-2">
                {APPLICABLE_TO_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-colors',
                      formData.applicableTo.includes(opt.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    )}
                    onClick={() => toggleApplicableTo(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.label.trim()}
            >
              {editingId ? 'Update Field' : 'Create Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Custom Field
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this custom field definition. Any values stored for this field will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
