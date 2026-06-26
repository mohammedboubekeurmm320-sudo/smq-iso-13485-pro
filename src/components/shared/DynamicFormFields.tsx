'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FormFieldDefinition } from '@/types/qms';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';

interface DynamicFormFieldsProps {
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  readonly?: boolean;
  /** Show as compact inline (for detail dialogs) vs full form (for wizards) */
  compact?: boolean;
}

/**
 * DynamicFormFields — Renders form fields dynamically from a FormTemplate's field definitions.
 * Used in creation wizards (P1-2) and detail dialogs to show template-driven form sections.
 * Compliant with §4.2.4 (Formulaires = Exécution) of the Hybrid 2-Layer Supervision.
 */
export function DynamicFormFields({
  fields,
  values,
  onChange,
  readonly = false,
  compact = false,
}: DynamicFormFieldsProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Champs du template (§4.2.4)</h4>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            {fields.length} champ{fields.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
      {fields.map((field) => {
        const currentValue = values[field.id] ?? field.defaultValue ?? '';

        return (
          <div key={field.id} className={compact ? 'space-y-1' : 'grid gap-2'}>
            <Label className="text-sm flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>

            {renderField(field, currentValue, readonly)}

            {field.required && !currentValue && !readonly && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Champ obligatoire
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  function renderField(field: FormFieldDefinition, value: unknown, isReadonly: boolean) {
    const strValue = String(value ?? '');

    if (isReadonly) {
      return renderReadonlyField(field, value);
    }

    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={strValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={strValue}
            onChange={(e) => onChange(field.id, e.target.value ? parseFloat(e.target.value) : '')}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={strValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={strValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            rows={3}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={strValue || undefined}
            onValueChange={(v) => onChange(field.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(field.id, Boolean(checked))}
            />
            <Label htmlFor={field.id} className="text-sm text-muted-foreground">
              {field.placeholder || 'Oui / Non'}
            </Label>
          </div>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {Array.from({ length: field.validation?.max || 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`w-8 h-8 rounded-full border-2 text-sm font-bold transition-colors ${
                  (Number(value) || 0) > i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                }`}
                onClick={() => onChange(field.id, i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        );

      case 'signature':
        return (
          <div className="border-2 border-dashed rounded-md p-4 text-center text-muted-foreground text-sm">
            <p>Signature électronique requise</p>
            <p className="text-xs mt-1">(Capture lors de la soumission du formulaire)</p>
          </div>
        );

      case 'table':
        return (
          <div className="border rounded-md p-3 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Tableau dynamique — {field.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les colonnes seront définies par le template
            </p>
          </div>
        );

      case 'file':
        return (
          <div className="border-2 border-dashed rounded-md p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {field.placeholder || 'Glisser-déposer ou cliquer pour télécharger'}
            </p>
          </div>
        );

      case 'repeater':
        return (
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-sm text-muted-foreground">{field.label} (répéteur)</p>
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => {
                const arr = Array.isArray(value) ? value : [];
                onChange(field.id, [...arr, {}]);
              }}
            >
              + Ajouter une ligne
            </button>
          </div>
        );

      default:
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={strValue}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        );
    }
  }

  function renderReadonlyField(field: FormFieldDefinition, value: unknown) {
    const strValue = String(value ?? '');

    switch (field.type) {
      case 'checkbox':
        return (
          <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
            {value ? 'Oui' : 'Non'}
          </Badge>
        );
      case 'rating':
        return (
          <div className="flex gap-1">
            {Array.from({ length: field.validation?.max || 5 }, (_, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                  (Number(value) || 0) > i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        );
      case 'textarea':
        return <p className="text-sm bg-muted/30 p-2 rounded-md whitespace-pre-wrap">{strValue || '—'}</p>;
      default:
        return <p className="text-sm bg-muted/30 p-2 rounded-md">{strValue || '—'}</p>;
    }
  }
}

/**
 * Helper: Extract template field values from a form state, suitable for creating a FormInstance.
 * Takes the template fields and current values, returns a clean Record<string, unknown>.
 */
export function extractFormInstanceValues(
  fields: FormFieldDefinition[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (values[field.id] !== undefined) {
      result[field.id] = values[field.id];
    } else if (field.defaultValue !== undefined) {
      result[field.id] = field.defaultValue;
    } else {
      result[field.id] = '';
    }
  }
  return result;
}
