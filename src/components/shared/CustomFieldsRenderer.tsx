'use client';

import React from 'react';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types/qms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CustomFieldsRendererProps {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValue[];
  documentType: string;
  onChange: (values: CustomFieldValue[]) => void;
  readOnly?: boolean;
}

export function CustomFieldsRenderer({
  definitions,
  values,
  documentType,
  onChange,
  readOnly = false,
}: CustomFieldsRendererProps) {
  // Filter definitions that apply to this document type
  const applicableDefinitions = definitions
    .filter(d => d.applicableTo.includes('*') || d.applicableTo.includes(documentType))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const getValue = (definitionId: string): string => {
    const field = values.find(v => v.definitionId === definitionId);
    return field?.value ?? '';
  };

  const setValue = (definitionId: string, value: string) => {
    const updated = values.filter(v => v.definitionId !== definitionId);
    if (value !== '') {
      updated.push({ definitionId, value });
    }
    onChange(updated);
  };

  if (applicableDefinitions.length === 0) {
    return null;
  }

  const renderField = (def: CustomFieldDefinition) => {
    const currentValue = getValue(def.id);
    const hasError = def.required && currentValue === '';

    if (readOnly) {
      return (
        <div key={def.id} className="grid gap-1">
          <Label className="text-xs text-muted-foreground">{def.label}</Label>
          <div className="text-sm min-h-[36px] flex items-center">
            {def.type === 'checkbox' ? (
              currentValue === 'true' ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Yes</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">No</Badge>
              )
            ) : currentValue || (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      );
    }

    switch (def.type) {
      case 'text':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={`cf-${def.id}`}
              value={currentValue}
              onChange={(e) => setValue(def.id, e.target.value)}
              placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}...`}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      case 'number':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={`cf-${def.id}`}
              type="number"
              value={currentValue}
              onChange={(e) => setValue(def.id, e.target.value)}
              placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}...`}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      case 'date':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={`cf-${def.id}`}
              type="date"
              value={currentValue}
              onChange={(e) => setValue(def.id, e.target.value)}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      case 'select':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={currentValue}
              onValueChange={(v) => setValue(def.id, v)}
            >
              <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                <SelectValue placeholder={def.placeholder || `Select ${def.label.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {def.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={def.id} className="flex items-center gap-2 py-1">
            <Switch
              id={`cf-${def.id}`}
              checked={currentValue === 'true'}
              onCheckedChange={(checked) => setValue(def.id, checked ? 'true' : 'false')}
            />
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
          </div>
        );

      case 'textarea':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={`cf-${def.id}`}
              value={currentValue}
              onChange={(e) => setValue(def.id, e.target.value)}
              placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}...`}
              rows={3}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      case 'url':
        return (
          <div key={def.id} className="grid gap-1.5">
            <Label htmlFor={`cf-${def.id}`} className="text-sm flex items-center gap-1">
              {def.label}
              {def.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={`cf-${def.id}`}
              type="url"
              value={currentValue}
              onChange={(e) => setValue(def.id, e.target.value)}
              placeholder={def.placeholder || 'https://...'}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-xs text-destructive">{def.label} is required</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid gap-3">
      {applicableDefinitions.map(def => renderField(def))}
    </div>
  );
}
