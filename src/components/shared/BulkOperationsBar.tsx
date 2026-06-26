'use client';

import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  Building2,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BulkOperationsBarProps {
  selectedIds: string[];
  onAction: (action: string, ids: string[], payload?: Record<string, unknown>) => void;
  onClearSelection: () => void;
  entityType: string;
}

const validStatuses = ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn'];

export function BulkOperationsBar({
  selectedIds,
  onAction,
  onClearSelection,
  entityType,
}: BulkOperationsBarProps) {
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    label: string;
    payload?: Record<string, unknown>;
  } | null>(null);

  // Sub-dialog states for status and department changes
  const [statusSubDialogOpen, setStatusSubDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [departmentSubDialogOpen, setDepartmentSubDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const handleDeleteClick = () => {
    setConfirmAction({
      action: 'delete',
      label: `Delete ${selectedIds.length} ${entityType}${selectedIds.length > 1 ? 's' : ''}`,
    });
  };

  const handleChangeStatusClick = () => {
    setStatusSubDialogOpen(true);
  };

  const handleChangeDepartmentClick = () => {
    setDepartmentSubDialogOpen(true);
  };

  const handleExportClick = () => {
    onAction('export', selectedIds);
  };

  const handleConfirmStatus = () => {
    if (!selectedStatus) return;
    onAction('changeStatus', selectedIds, { status: selectedStatus });
    setStatusSubDialogOpen(false);
    setSelectedStatus('');
  };

  const handleConfirmDepartment = () => {
    if (!selectedDepartment.trim()) return;
    onAction('changeDepartment', selectedIds, { department: selectedDepartment.trim() });
    setDepartmentSubDialogOpen(false);
    setSelectedDepartment('');
  };

  const handleConfirmDestructive = () => {
    if (!confirmAction) return;
    onAction(confirmAction.action, selectedIds, confirmAction.payload);
    setConfirmAction(null);
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-foreground text-background rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.length} selected
          </span>

          <div className="h-4 w-px bg-background/30" />

          <Button
            variant="ghost"
            size="sm"
            className="text-background hover:bg-background/20 h-8"
            onClick={handleChangeStatusClick}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Change Status
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-background hover:bg-background/20 h-8"
            onClick={handleChangeDepartmentClick}
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Change Dept
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-background hover:bg-background/20 h-8"
            onClick={handleExportClick}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:bg-red-500/20 hover:text-red-200 h-8"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <div className="h-4 w-px bg-background/30" />

          <Button
            variant="ghost"
            size="icon"
            className="text-background hover:bg-background/20 h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmation dialog for destructive actions */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm {confirmAction?.label}
            </DialogTitle>
            <DialogDescription>
              This action will affect {selectedIds.length} {entityType}{selectedIds.length > 1 ? 's' : ''}.
              This operation will be logged to the audit trail and cannot be easily undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDestructive}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status dialog */}
      <Dialog open={statusSubDialogOpen} onOpenChange={setStatusSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Set a new status for {selectedIds.length} selected {entityType}{selectedIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {validStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusSubDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatus} disabled={!selectedStatus}>
              Apply Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Department dialog */}
      <Dialog open={departmentSubDialogOpen} onOpenChange={setDepartmentSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Department</DialogTitle>
            <DialogDescription>
              Set a new department for {selectedIds.length} selected {entityType}{selectedIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New Department</Label>
              <Input
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                placeholder="e.g., Quality, Production..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentSubDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDepartment} disabled={!selectedDepartment.trim()}>
              Apply Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
