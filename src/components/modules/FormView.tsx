'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { FormTemplate, FormInstance, FormFieldDefinition, FormInstanceStatus } from '@/types/qms';
import {
  FileSpreadsheet, Plus, Search, Eye, Edit, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

const instanceStatusColors: Record<FormInstanceStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Submitted': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function FormView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const templates = store.formTemplates;
  const instances = store.formInstances;

  const [searchTerm, setSearchTerm] = useState('');
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showFillerDialog, setShowFillerDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FormInstance | null>(null);
  const [fillingTemplate, setFillingTemplate] = useState<FormTemplate | null>(null);

  // Builder state
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderVersion, setBuilderVersion] = useState('1.0');
  const [builderFields, setBuilderFields] = useState<FormFieldDefinition[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldDefinition['type']>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Filler state
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const filteredTemplates = templates.filter(t =>
    searchTerm === '' || t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredInstances = instances.filter(i =>
    searchTerm === '' || i.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTemplateName = (templateId: string) => {
    return templates.find(t => t.id === templateId)?.title || templateId;
  };

  const resetBuilder = () => {
    setBuilderTitle(''); setBuilderVersion('1.0'); setBuilderFields([]);
    setNewFieldName(''); setNewFieldLabel(''); setNewFieldType('text');
    setNewFieldRequired(false); setNewFieldOptions('');
  };

  const addField = () => {
    if (!newFieldName || !newFieldLabel) return;
    const field: FormFieldDefinition = {
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: newFieldName,
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'select' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    };
    setBuilderFields([...builderFields, field]);
    setNewFieldName(''); setNewFieldLabel(''); setNewFieldType('text');
    setNewFieldRequired(false); setNewFieldOptions('');
  };

  const removeField = (id: string) => {
    setBuilderFields(builderFields.filter(f => f.id !== id));
  };

  const handleSaveTemplate = () => {
    const newTemplate: FormTemplate = {
      id: `ft-${Date.now()}`,
      documentId: '',
      title: builderTitle,
      version: builderVersion,
      fields: builderFields,
      isActive: true,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    store.addFormTemplate(newTemplate);
    resetBuilder();
    setShowBuilderDialog(false);
  };

  const openFiller = (template: FormTemplate) => {
    setFillingTemplate(template);
    const initialValues: Record<string, unknown> = {};
    template.fields.forEach(f => {
      initialValues[f.name] = f.type === 'checkbox' ? false : '';
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
      referenceNumber: `FORM-2024-${String(instances.length + 1).padStart(3, '0')}`,
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

  const openViewInstance = (instance: FormInstance) => {
    setSelectedInstance(instance);
    setShowViewDialog(true);
  };

  const fieldTypes: FormFieldDefinition['type'][] = ['text', 'number', 'date', 'select', 'checkbox', 'textarea'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />Forms
          </h1>
          <p className="text-muted-foreground mt-1">Electronic forms and records management</p>
        </div>
        <Button onClick={() => { resetBuilder(); setShowBuilderDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Template
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 max-w-sm" />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[80px]">Version</TableHead>
                    <TableHead className="w-[100px]">Fields</TableHead>
                    <TableHead className="w-[80px]">Active</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell className="font-mono text-sm">{template.version}</TableCell>
                      <TableCell><Badge variant="outline">{template.fields.length} fields</Badge></TableCell>
                      <TableCell>
                        <Badge className={template.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'} variant="secondary">
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => openFiller(template)}>
                          <Plus className="h-3 w-3 mr-1" />Create Instance
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No templates found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search instances..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 max-w-sm" />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Reference #</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Submitted</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstances.map(instance => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-mono text-xs">{instance.referenceNumber}</TableCell>
                      <TableCell>{getTemplateName(instance.templateId)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', instanceStatusColors[instance.status])} variant="secondary">{instance.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {instance.submittedAt ? new Date(instance.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => openViewInstance(instance)}>
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInstances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No instances found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Form Builder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Template Title</Label><Input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="Template name" /></div>
              <div className="grid gap-2"><Label>Version</Label><Input value={builderVersion} onChange={(e) => setBuilderVersion(e.target.value)} /></div>
            </div>

            {/* Add Field */}
            <div className="border rounded-md p-3 space-y-3">
              <h4 className="font-medium text-sm">Add Field</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1"><Label className="text-xs">Field Name</Label><Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="fieldName" /></div>
                <div className="grid gap-1"><Label className="text-xs">Label</Label><Input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Field Label" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FormFieldDefinition['type'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Required</Label>
                  <div className="flex items-center h-9">
                    <Checkbox checked={newFieldRequired} onCheckedChange={(v) => setNewFieldRequired(v === true)} />
                  </div>
                </div>
                {newFieldType === 'select' && (
                  <div className="grid gap-1">
                    <Label className="text-xs">Options (comma sep)</Label>
                    <Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="A, B, C" />
                  </div>
                )}
              </div>
              <Button size="sm" onClick={addField} disabled={!newFieldName || !newFieldLabel}>Add Field</Button>
            </div>

            {/* Field List */}
            {builderFields.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Fields ({builderFields.length})</h4>
                {builderFields.map((field, i) => (
                  <div key={field.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">{i + 1}.</span>
                      <span className="font-medium">{field.label}</span>
                      <Badge variant="outline" className="text-xs">{field.type}</Badge>
                      {field.required && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Required</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => removeField(field.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={handleSaveTemplate} disabled={!builderTitle || builderFields.length === 0}>
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Filler Dialog */}
      <Dialog open={showFillerDialog} onOpenChange={setShowFillerDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {fillingTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>Fill: {fillingTemplate.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {fillingTemplate.fields.map(field => (
                  <div key={field.id} className="grid gap-2">
                    <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                    {field.type === 'text' && (
                      <Input value={(formValues[field.name] as string) || ''} onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })} placeholder={field.placeholder} />
                    )}
                    {field.type === 'number' && (
                      <Input type="number" value={(formValues[field.name] as string) || ''} onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })} />
                    )}
                    {field.type === 'date' && (
                      <Input type="date" value={(formValues[field.name] as string) || ''} onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })} />
                    )}
                    {field.type === 'textarea' && (
                      <Textarea value={(formValues[field.name] as string) || ''} onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })} />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select value={(formValues[field.name] as string) || ''} onValueChange={(v) => setFormValues({ ...formValues, [field.name]: v })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <Checkbox checked={formValues[field.name] as boolean || false} onCheckedChange={(v) => setFormValues({ ...formValues, [field.name]: v === true })} />
                        <span className="text-sm text-muted-foreground">{field.label}</span>
                      </div>
                    )}
                  </div>
                ))}
                <Button className="w-full" onClick={handleSubmitInstance}>Submit Form</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Instance Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {selectedInstance && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedInstance.referenceNumber}</span>
                  {getTemplateName(selectedInstance.templateId)}
                  {selectedInstance.isLocked && <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Badge className={cn(instanceStatusColors[selectedInstance.status])} variant="secondary">{selectedInstance.status}</Badge>
                {Object.entries(selectedInstance.values).map(([key, value]) => {
                  const template = templates.find(t => t.id === selectedInstance.templateId);
                  const field = template?.fields.find(f => f.name === key);
                  return (
                    <div key={key} className="border-b pb-2">
                      <span className="text-sm text-muted-foreground">{field?.label || key}:</span>
                      <p className="font-medium text-sm">
                        {value === true ? '✓ Yes' : value === false ? '✗ No' : String(value || '-')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
