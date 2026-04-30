'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { BatchRecord, BatchStep, BatchStatus, BatchStepStatus } from '@/types/qms';
import {
  Package, Plus, Search, Eye, CheckCircle2, Lock, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const statusColors: Record<BatchStatus, string> = {
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending QA Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Released': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Quarantine': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const stepStatusColors: Record<BatchStepStatus, string> = {
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Failed': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};


export function BatchRecordView() {
  const { currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const store = useQMSStore();
  const batchRecords = store.batchRecords;
  const profiles = store.profiles;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [formLotNumber, setFormLotNumber] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formProductCode, setFormProductCode] = useState('');
  const [formBatchSize, setFormBatchSize] = useState('');
  const [formBatchSizeUnit, setFormBatchSizeUnit] = useState('vials');
  const [formMfgDate, setFormMfgDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formMasterFormulaId, setFormMasterFormulaId] = useState('');

  const filteredBatches = batchRecords.filter(b => {
    const matchesSearch = searchTerm === '' ||
      b.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summaryCounts = {
    inProgress: batchRecords.filter(b => b.status === 'In Progress').length,
    pendingQA: batchRecords.filter(b => b.status === 'Pending QA Review').length,
    released: batchRecords.filter(b => b.status === 'Released').length,
    rejected: batchRecords.filter(b => b.status === 'Rejected').length,
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const getStepProgress = (batch: BatchRecord) => {
    const steps = batch.steps || [];
    if (steps.length === 0) return 0;
    return Math.round((steps.filter(s => s.status === 'Completed').length / steps.length) * 100);
  };

  const resetForm = () => {
    setFormLotNumber(''); setFormProductName(''); setFormProductCode('');
    setFormBatchSize(''); setFormBatchSizeUnit('vials'); setFormMfgDate('');
    setFormExpiryDate(''); setFormMasterFormulaId('');
  };

  const handleCreate = () => {
    const newBatch: BatchRecord = {
      id: `batch-${Date.now()}`,
      lotNumber: formLotNumber,
      productName: formProductName,
      productCode: formProductCode || undefined,
      batchSize: formBatchSize ? parseInt(formBatchSize) : undefined,
      batchSizeUnit: formBatchSizeUnit,
      masterFormulaId: formMasterFormulaId || undefined,
      manufacturingDate: formMfgDate ? new Date(formMfgDate).toISOString() : new Date().toISOString(),
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : undefined,
      status: 'In Progress',
      isLocked: false,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
      steps: [],
    };
    store.addBatchRecord(newBatch);
    resetForm();
    setShowCreateDialog(false);
  };

  const canCompleteStep = (batch: BatchRecord, step: BatchStep): boolean => {
    if (batch.isLocked) return false;
    const steps = batch.steps || [];
    // Check if all previous steps (lower stepOrder) are completed
    const previousSteps = steps.filter(s => s.stepOrder < step.stepOrder);
    return previousSteps.every(s => s.status === 'Completed');
  };

  const handleCompleteStep = (batch: BatchRecord, step: BatchStep) => {
    if (batch.isLocked) return;
    const steps = batch.steps || [];
    // Enforce step sequencing: all previous steps must be completed
    const previousSteps = steps.filter(s => s.stepOrder < step.stepOrder);
    const incompletePrevious = previousSteps.find(s => s.status !== 'Completed');
    if (incompletePrevious) {
      toast({
        title: 'Step sequence error',
        description: `Step ${incompletePrevious.stepOrder} (${incompletePrevious.stepName}) must be completed first.`,
        variant: 'destructive',
      });
      return;
    }
    const updatedSteps = steps.map(s =>
      s.id === step.id ? { ...s, status: 'Completed' as BatchStepStatus, performedAt: new Date().toISOString(), operatorId: currentUser?.id } : s
    );
    store.updateBatchRecord(batch.id, { steps: updatedSteps });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, steps: updatedSteps });
    }
  };

  const handleQARelease = (batch: BatchRecord) => {
    store.updateBatchRecord(batch.id, {
      status: 'Released',
      isLocked: true,
      qaReleaseDate: new Date().toISOString(),
      qaReleasedById: currentUser?.id,
    });
    if (selectedBatch?.id === batch.id) {
      setSelectedBatch({ ...batch, status: 'Released', isLocked: true });
    }
  };

  const openDetail = (batch: BatchRecord) => {
    setSelectedBatch(batch);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />Batch Records
          </h1>
          <p className="text-muted-foreground mt-1">Batch record management and QA release</p>
        </div>
        {hasPermission('batch.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Batch Record
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">In Progress</span>
            <span className="text-2xl font-bold block">{summaryCounts.inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Pending QA Review</span>
            <span className="text-2xl font-bold block text-purple-600">{summaryCounts.pendingQA}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Released</span>
            <span className="text-2xl font-bold block text-green-600">{summaryCounts.released}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Rejected</span>
            <span className="text-2xl font-bold block text-red-600">{summaryCounts.rejected}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search batch records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Pending QA Review">Pending QA Review</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Quarantine">Quarantine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Lot #</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="w-[100px]">Batch Size</TableHead>
                  <TableHead className="w-[110px]">Mfg Date</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[100px]">Progress</TableHead>
                  <TableHead className="w-[100px]">QA Release</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map(batch => {
                  const progress = getStepProgress(batch);
                  return (
                    <TableRow key={batch.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(batch)}>
                      <TableCell className="font-mono text-xs">{batch.lotNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium">{batch.productName}</p>
                        {batch.productCode && <p className="text-xs text-muted-foreground">{batch.productCode}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{batch.batchSize ? `${batch.batchSize} ${batch.batchSizeUnit}` : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(batch.manufacturingDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[batch.status])} variant="secondary">{batch.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {batch.isLocked ? (
                          <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredBatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No batch records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create New Batch Record</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Lot Number *</Label><Input value={formLotNumber} onChange={(e) => setFormLotNumber(e.target.value)} placeholder="BN-2024-XXX" /></div>
              <div className="grid gap-2"><Label>Product Code</Label><Input value={formProductCode} onChange={(e) => setFormProductCode(e.target.value)} placeholder="PROD-XXX" /></div>
            </div>
            <div className="grid gap-2"><Label>Product Name *</Label><Input value={formProductName} onChange={(e) => setFormProductName(e.target.value)} placeholder="Product name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Batch Size</Label><Input type="number" value={formBatchSize} onChange={(e) => setFormBatchSize(e.target.value)} placeholder="0" /></div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={formBatchSizeUnit} onValueChange={setFormBatchSizeUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vials">Vials</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="tablets">Tablets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Manufacturing Date *</Label><Input type="date" value={formMfgDate} onChange={(e) => setFormMfgDate(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Expiry Date</Label><Input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label>Master Formula ID</Label><Input value={formMasterFormulaId} onChange={(e) => setFormMasterFormulaId(e.target.value)} placeholder="MF-XXX" /></div>
            <Button className="w-full" onClick={handleCreate} disabled={!formLotNumber || !formProductName}>Create Batch Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedBatch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedBatch.lotNumber}</span>
                  {selectedBatch.productName}
                  {selectedBatch.isLocked && <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedBatch.status])} variant="secondary">{selectedBatch.status}</Badge>
                  {selectedBatch.productCode && <Badge variant="outline">{selectedBatch.productCode}</Badge>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Batch Size:</span> <span className="font-medium">{selectedBatch.batchSize} {selectedBatch.batchSizeUnit}</span></div>
                  <div><span className="text-muted-foreground">Mfg Date:</span> <span className="font-medium">{formatDate(selectedBatch.manufacturingDate)}</span></div>
                  <div><span className="text-muted-foreground">Expiry:</span> <span className="font-medium">{formatDate(selectedBatch.expiryDate)}</span></div>
                  {selectedBatch.qaReleaseDate && <div><span className="text-muted-foreground">QA Released:</span> <span className="font-medium">{formatDate(selectedBatch.qaReleaseDate)}</span></div>}
                </div>

                {/* Step Progress */}
                {selectedBatch.steps && selectedBatch.steps.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Batch Steps</h4>
                      <span className="text-xs text-muted-foreground">{getStepProgress(selectedBatch)}% complete</span>
                    </div>
                    <Progress value={getStepProgress(selectedBatch)} className="h-2 mb-3" />

                    {/* Step indicator circles */}
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                      {selectedBatch.steps.map((step, i) => (
                        <React.Fragment key={step.id}>
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            step.status === 'Completed' ? 'bg-green-500 text-white' :
                            step.status === 'In Progress' ? 'bg-amber-500 text-white' :
                            step.status === 'Failed' ? 'bg-red-500 text-white' :
                            'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          )}>
                            {step.stepOrder}
                          </div>
                          {i < selectedBatch.steps!.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>Step</TableHead>
                            <TableHead>Instructions</TableHead>
                            <TableHead className="w-[130px]">Expected</TableHead>
                            <TableHead className="w-[130px]">Actual</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[90px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBatch.steps.map(step => (
                            <TableRow key={step.id}>
                              <TableCell className="font-mono text-xs">{step.stepOrder}</TableCell>
                              <TableCell className="font-medium text-sm">{step.stepName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{step.instructions || '-'}</TableCell>
                              <TableCell className="text-xs">{step.expectedValue || '-'}</TableCell>
                              <TableCell className="text-xs">{step.actualValue || '-'}</TableCell>
                              <TableCell>
                                <Badge className={cn('text-xs', stepStatusColors[step.status])} variant="secondary">{step.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {hasPermission('batch.update') && !selectedBatch.isLocked && step.status !== 'Completed' && step.status !== 'Failed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => handleCompleteStep(selectedBatch, step)}
                                    disabled={!canCompleteStep(selectedBatch, step)}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {selectedBatch.steps && selectedBatch.steps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No batch steps defined for this record
                  </div>
                )}

                {/* QA Release */}
                {hasPermission('batch.release') && !selectedBatch.isLocked && selectedBatch.status === 'In Progress' && (
                  <Button className="w-full" onClick={() => handleQARelease(selectedBatch)}>
                    <Lock className="h-4 w-4 mr-2" />QA Release & Lock Batch
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
