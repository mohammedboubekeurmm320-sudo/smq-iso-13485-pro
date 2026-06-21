'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SUPPORTED_ENTITY_TYPES } from '@/lib/import-service';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: string;
}

interface ImportError {
  row: number;
  errors?: string[];
  error?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
  totalRows?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataImportDialog({ open, onOpenChange, entityType: initialEntityType }: DataImportDialogProps) {
  const [entityType, setEntityType] = useState(initialEntityType || '');
  const [dryRun, setDryRun] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEntityTypeChange = useCallback((value: string) => {
    setEntityType(value);
    setFile(null);
    setResult(null);
    setError(null);
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Only CSV files are supported');
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDownloadTemplate = useCallback(async () => {
    if (!entityType) return;
    try {
      const response = await fetch(`/api/import?entityType=${entityType}`);
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}-import-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    }
  }, [entityType]);

  const handleImport = useCallback(async () => {
    if (!file || !entityType) return;

    setIsImporting(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('dryRun', String(dryRun));

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Import failed');
        return;
      }

      setResult(data.data);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [file, entityType, dryRun]);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setFile(null);
      setResult(null);
      setError(null);
      setProgress(0);
      onOpenChange(false);
    }
  }, [isImporting, onOpenChange]);

  const allErrors = result?.errors || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entity Type Selector */}
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select value={entityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity type to import" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_ENTITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Download */}
          {entityType && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download CSV Template
              </Button>
              <span className="text-xs text-muted-foreground">
                Get a template with the correct column headers
              </span>
            </div>
          )}

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm">Dry Run (Validate Only)</Label>
              <p className="text-xs text-muted-foreground">
                Validate data without creating records
              </p>
            </div>
            <Switch
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

          {/* File Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
              isDragging && 'border-primary bg-primary/5',
              file && 'border-green-500 bg-green-50 dark:bg-green-950/20',
              !file && !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .csv files (UTF-8, RFC 4180)
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {dryRun ? 'Validating...' : 'Importing...'}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-center gap-1">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{result.totalRows || result.imported + result.skipped}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {dryRun ? (result as unknown as Record<string, unknown>).validRows as number || result.imported : result.imported}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{dryRun ? 'Valid' : 'Imported'}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">
                      {dryRun ? (result as unknown as Record<string, unknown>).invalidRows as number || result.skipped : result.skipped}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{dryRun ? 'Invalid' : 'Skipped'}</p>
                </div>
              </div>

              {/* Errors Table */}
              {allErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Validation Errors
                  </h4>
                  <ScrollArea className="max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allErrors.map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {err.row}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-destructive">
                              {err.errors ? err.errors.join('; ') : err.error || 'Unknown error'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={!file || !entityType || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {dryRun ? 'Validating...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {dryRun ? 'Validate Only' : 'Import Data'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
