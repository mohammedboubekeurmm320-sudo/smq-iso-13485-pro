'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Supplier, SupplierCategory, SupplierStatus } from '@/types/qms';
import {
  Truck, Plus, Search, Eye, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const statusColors: Record<SupplierStatus, string> = {
  'Qualified': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Conditional': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Disqualified': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Under Evaluation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreStroke(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={getScoreStroke(score)} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className={cn('absolute text-lg font-bold', getScoreColor(score))}>{score}</span>
    </div>
  );
}

export function SupplierView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const suppliers = store.suppliers;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<SupplierCategory>('Raw Material');
  const [formQualDate, setFormQualDate] = useState('');
  const [formCertifications, setFormCertifications] = useState('');

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = searchTerm === '' ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplierCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summaryCounts = {
    qualified: suppliers.filter(s => s.status === 'Qualified').length,
    conditional: suppliers.filter(s => s.status === 'Conditional').length,
    disqualified: suppliers.filter(s => s.status === 'Disqualified').length,
    evaluation: suppliers.filter(s => s.status === 'Under Evaluation').length,
  };

  const resetForm = () => {
    setFormCode(''); setFormName(''); setFormCategory('Raw Material');
    setFormQualDate(''); setFormCertifications('');
  };

  const handleCreate = () => {
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      supplierCode: formCode,
      name: formName,
      category: formCategory,
      status: 'Under Evaluation',
      qualificationDate: formQualDate ? new Date(formQualDate).toISOString() : undefined,
      certifications: formCertifications ? formCertifications.split(',').map(c => c.trim()) : [],
      performanceScore: 0,
      organizationId: 'org-001',
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    store.addSupplier(newSupplier);
    resetForm();
    setShowCreateDialog(false);
  };

  const openDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailDialog(true);
  };

  const categories: SupplierCategory[] = ['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other'];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />Suppliers
          </h1>
          <p className="text-muted-foreground mt-1">Supplier qualification and management</p>
        </div>
        {hasPermission('supplier.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Supplier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Qualified</span>
            <span className="text-2xl font-bold block text-green-600">{summaryCounts.qualified}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Conditional</span>
            <span className="text-2xl font-bold block text-amber-600">{summaryCounts.conditional}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Disqualified</span>
            <span className="text-2xl font-bold block text-red-600">{summaryCounts.disqualified}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <span className="text-sm text-muted-foreground">Under Evaluation</span>
            <span className="text-2xl font-bold block text-blue-600">{summaryCounts.evaluation}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Qualified">Qualified</SelectItem>
            <SelectItem value="Conditional">Conditional</SelectItem>
            <SelectItem value="Disqualified">Disqualified</SelectItem>
            <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[130px]">Category</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Performance</TableHead>
                  <TableHead className="w-[110px]">Next Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map(supplier => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(supplier)}>
                    <TableCell className="font-mono text-xs">{supplier.supplierCode}</TableCell>
                    <TableCell><p className="font-medium">{supplier.name}</p></TableCell>
                    <TableCell><Badge variant="outline">{supplier.category}</Badge></TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[supplier.status])} variant="secondary">{supplier.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {supplier.performanceScore !== undefined && supplier.performanceScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', supplier.performanceScore >= 85 ? 'bg-green-500' : supplier.performanceScore >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${supplier.performanceScore}%` }}
                            />
                          </div>
                          <span className={cn('text-sm font-medium', getScoreColor(supplier.performanceScore))}>{supplier.performanceScore}</span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">N/A</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {supplier.nextReviewDate ? new Date(supplier.nextReviewDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell>
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
          <DialogHeader><DialogTitle>Create New Supplier</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Supplier Code *</Label><Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="SUP-XXX" /></div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as SupplierCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2"><Label>Name *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Supplier name" /></div>
            <div className="grid gap-2"><Label>Qualification Date</Label><Input type="date" value={formQualDate} onChange={(e) => setFormQualDate(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Certifications (comma separated)</Label><Input value={formCertifications} onChange={(e) => setFormCertifications(e.target.value)} placeholder="ISO 9001, ISO 13485, ..." /></div>
            <Button className="w-full" onClick={handleCreate} disabled={!formCode || !formName}>Create Supplier</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedSupplier.supplierCode}</span>
                  {selectedSupplier.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(statusColors[selectedSupplier.status])} variant="secondary">{selectedSupplier.status}</Badge>
                  {selectedSupplier.category && <Badge variant="outline">{selectedSupplier.category}</Badge>}
                </div>

                {/* Performance Score Gauge */}
                {selectedSupplier.performanceScore !== undefined && selectedSupplier.performanceScore > 0 && (
                  <Card>
                    <CardContent className="pt-4 pb-4 flex items-center gap-4">
                      <ScoreGauge score={selectedSupplier.performanceScore} />
                      <div>
                        <p className="font-medium">Performance Score</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSupplier.performanceScore >= 85 ? 'Excellent performance' :
                           selectedSupplier.performanceScore >= 70 ? 'Acceptable performance' :
                           'Needs improvement'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedSupplier.qualificationDate && (
                    <div><span className="text-muted-foreground">Qualified:</span> <span className="font-medium ml-1">{new Date(selectedSupplier.qualificationDate).toLocaleDateString()}</span></div>
                  )}
                  {selectedSupplier.nextReviewDate && (
                    <div><span className="text-muted-foreground">Next Review:</span> <span className="font-medium ml-1">{new Date(selectedSupplier.nextReviewDate).toLocaleDateString()}</span></div>
                  )}
                </div>

                {/* Certifications */}
                {selectedSupplier.certifications && selectedSupplier.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {hasPermission('supplier.update') && (
                  <div className="flex gap-2">
                    {selectedSupplier.status !== 'Disqualified' && (
                      <Button variant="destructive" size="sm" onClick={() => {
                        store.updateSupplier(selectedSupplier.id, { status: 'Disqualified' });
                        setSelectedSupplier({ ...selectedSupplier, status: 'Disqualified' });
                      }}>
                        <XCircle className="h-4 w-4 mr-1" />Disqualify
                      </Button>
                    )}
                    {selectedSupplier.status === 'Disqualified' && (
                      <Button variant="default" size="sm" onClick={() => {
                        store.updateSupplier(selectedSupplier.id, { status: 'Qualified', qualificationDate: new Date().toISOString() });
                        setSelectedSupplier({ ...selectedSupplier, status: 'Qualified' });
                      }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Re-qualify
                      </Button>
                    )}
                    {selectedSupplier.status === 'Under Evaluation' && (
                      <Button variant="default" size="sm" onClick={() => {
                        store.updateSupplier(selectedSupplier.id, { status: 'Qualified', qualificationDate: new Date().toISOString(), performanceScore: 80 });
                        setSelectedSupplier({ ...selectedSupplier, status: 'Qualified', performanceScore: 80 });
                      }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Qualify
                      </Button>
                    )}
                    {selectedSupplier.status === 'Qualified' && (
                      <Button variant="outline" size="sm" onClick={() => {
                        store.updateSupplier(selectedSupplier.id, { status: 'Conditional' });
                        setSelectedSupplier({ ...selectedSupplier, status: 'Conditional' });
                      }}>
                        <AlertTriangle className="h-4 w-4 mr-1" />Set Conditional
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
