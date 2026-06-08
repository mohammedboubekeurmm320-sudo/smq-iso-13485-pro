'use client';

import React from 'react';
import { useQMSStore } from '@/lib/demo-store';
import type { FormTemplateModuleType } from '@/types/qms';
import { LayoutTemplate, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface TemplateSelectorProps {
  /** Which QMS module this selector is for */
  moduleType: FormTemplateModuleType;
  /** Currently selected template ID */
  value?: string;
  /** Callback when user selects a template */
  onChange: (templateId: string, templateVersion: string) => void;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * Reusable component for selecting an Approved FormTemplate
 * when creating a QMS record (CAPA, NCR, Deviation, etc.).
 *
 * Only shows templates that are:
 * - status === 'Approved'
 * - moduleType matches the current module
 *
 * This enforces ISO 13485 §4.2.3 — records must be based on approved templates.
 */
export function TemplateSelector({ moduleType, value, onChange, required = false }: TemplateSelectorProps) {
  const store = useQMSStore();
  const approvedTemplates = store.getApprovedTemplatesForModule(moduleType);

  const selectedTemplate = value
    ? store.formTemplates.find(t => t.id === value)
    : undefined;

  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-1.5">
        <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
        Form Template
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>

      {approvedTemplates.length > 0 ? (
        <>
          <Select
            value={value || 'none'}
            onValueChange={(v) => {
              if (v === 'none') {
                onChange('', '');
                return;
              }
              const template = store.formTemplates.find(t => t.id === v);
              if (template) {
                onChange(template.id, template.version);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an approved template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template</SelectItem>
              {approvedTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span>{t.title}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">v{t.version}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTemplate && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium">{selectedTemplate.title}</span>
                <Badge variant="outline" className="text-[10px]">v{selectedTemplate.version}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Workflow:</span>
                <Badge variant="secondary" className="text-[10px]">
                  {selectedTemplate.workflow?.workflowType === 'single' ? 'Single Approver' :
                   selectedTemplate.workflow?.workflowType === 'sequential' ? 'Sequential' :
                   selectedTemplate.workflow?.workflowType === 'parallel' ? 'Parallel' : 'None'}
                </Badge>
                {selectedTemplate.workflow?.eSignatureRequired && (
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                    E-Sig Required
                  </Badge>
                )}
              </div>
              {selectedTemplate.workflow?.approvers && selectedTemplate.workflow.approvers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Approvers:</span>
                  <span>{selectedTemplate.workflow.approvers.map(a => a.userName).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2 p-3 border border-amber-200 dark:border-amber-800 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">No approved template available</p>
            <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
              An approved form template for this module must be created in the Forms section before records can be generated.
              (ISO 13485 §4.2.3)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
