'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Training, TrainingType, TrainingStatus } from '@/types/qms';
import {
  GraduationCap, Plus, Search, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const statusColors: Record<TrainingStatus, string> = {
  'Planned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Overdue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function TrainingView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const trainings = store.training;
  const profiles = store.profiles;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<TrainingType>('SOP');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = searchTerm === '' ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const summaryCounts = {
    planned: trainings.filter(t => t.status === 'Planned').length,
    inProgress: trainings.filter(t => t.status === 'In Progress').length,
    completed: trainings.filter(t => t.status === 'Completed').length,
    overdue: trainings.filter(t => t.status === 'Overdue').length,
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const resetForm = () => {
    setFormTitle(''); setFormType('SOP'); setFormDescription('');
    setFormAssignedTo(''); setFormDueDate('');
  };

  const handleCreate = () => {
    const newTraining: Training = {
      id: `train-${Date.now()}`,
      title: formTitle,
      description: formDescription || undefined,
      type: formType,
      status: 'Planned',
      assignedTo: formAssignedTo,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : new Date().toISOString(),
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addTraining(newTraining);
    resetForm();
    setShowCreateDialog(false);
  };

  const handleMarkCompleted = (training: Training) => {
    store.updateTraining(training.id, {
      status: 'Completed',
      completedDate: new Date().toISOString(),
    });
  };

  const trainingTypes: TrainingType[] = ['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />Training
          </h1>
          <p className="text-muted-foreground mt-1">Training management and compliance tracking</p>
        </div>
        {hasPermission('training.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Training
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Planned</span></div>
            <span className="text-2xl font-bold">{summaryCounts.planned}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">In Progress</span></div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Completed</span></div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.completed}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm text-muted-foreground">Overdue</span></div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.overdue}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search training..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {trainingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[140px]">Assigned To</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Completed</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map(training => (
                  <TableRow key={training.id} className={cn(
                    'hover:bg-muted/50',
                    training.status === 'Overdue' ? 'bg-red-50/50 dark:bg-red-900/5' : ''
                  )}>
                    <TableCell>
                      <p className="font-medium">{training.title}</p>
                      {training.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{training.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{training.type}</Badge></TableCell>
                    <TableCell className="text-sm">{getUserName(training.assignedTo)}</TableCell>
                    <TableCell className={cn(
                      'text-sm',
                      training.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'
                    )}>
                      {new Date(training.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[training.status])} variant="secondary">{training.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {training.completedDate ? new Date(training.completedDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell>
                      {hasPermission('training.update') && training.status !== 'Completed' && (
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleMarkCompleted(training)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTrainings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No training records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create New Training</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Title *</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Training title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as TrainingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date *</Label>
                <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Training description..." rows={3} /></div>
            <div className="grid gap-2">
              <Label>Assigned To *</Label>
              <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.fullName || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!formTitle || !formAssignedTo}>Create Training</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
