'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Risk, RiskCategory, RiskLevel, RiskStatus } from '@/types/qms';
import {
  BarChart3, Plus, Search, Eye, AlertTriangle, Shield, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const riskLevelColors: Record<RiskLevel, string> = {
  'Low': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const riskStatusColors: Record<RiskStatus, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Mitigated': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Accepted': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function getRiskLevel(rpn: number): RiskLevel {
  if (rpn >= 100) return 'Critical';
  if (rpn >= 50) return 'High';
  if (rpn >= 20) return 'Medium';
  return 'Low';
}

function getMatrixCellColor(prob: number, impact: number): string {
  const rpn = prob * impact;
  if (rpn >= 20) return 'bg-red-500 text-white';
  if (rpn >= 10) return 'bg-orange-400 text-white';
  if (rpn >= 5) return 'bg-amber-300 text-gray-900';
  return 'bg-green-400 text-white';
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function RiskView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const risks = store.risks;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<RiskCategory>('Process');
  const [formProbability, setFormProbability] = useState(3);
  const [formImpact, setFormImpact] = useState(3);
  const [formDetectability, setFormDetectability] = useState(3);
  const [formMitigation, setFormMitigation] = useState('');

  const filteredRisks = risks.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.riskNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesLevel = levelFilter === 'all' || r.riskLevel === levelFilter;
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const summaryCounts = {
    low: risks.filter(r => r.riskLevel === 'Low').length,
    medium: risks.filter(r => r.riskLevel === 'Medium').length,
    high: risks.filter(r => r.riskLevel === 'High').length,
    critical: risks.filter(r => r.riskLevel === 'Critical').length,
  };

  const formRpn = formProbability * formImpact * formDetectability;
  const formRiskLevel = getRiskLevel(formRpn);

  const resetForm = () => {
    setFormTitle(''); setFormCategory('Process'); setFormProbability(3);
    setFormImpact(3); setFormDetectability(3); setFormMitigation('');
  };

  const handleCreate = () => {
    const newRisk: Risk = {
      id: `risk-${Date.now()}`,
      riskNumber: `RISK-2024-${String(risks.length + 1).padStart(3, '0')}`,
      title: formTitle,
      category: formCategory,
      probability: formProbability,
      impact: formImpact,
      detectability: formDetectability,
      rpn: formRpn,
      riskLevel: formRiskLevel,
      mitigation: formMitigation || undefined,
      status: 'Open',
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addRisk(newRisk);
    resetForm();
    setShowCreateDialog(false);
  };

  const openDetail = (risk: Risk) => {
    setSelectedRisk(risk);
    setShowDetailDialog(true);
  };

  // Count risks in each matrix cell for visualization
  const matrixCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    risks.forEach(r => {
      const key = `${r.probability}-${r.impact}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [risks]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />Risk Management
          </h1>
          <p className="text-muted-foreground mt-1">Risk assessment and management (ISO 14971)</p>
        </div>
        {hasPermission('risk.create') && (
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Risk
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Low</span></div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.low}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">Medium</span></div>
            <span className="text-2xl font-bold text-amber-600">{summaryCounts.medium}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-sm text-muted-foreground">High</span></div>
            <span className="text-2xl font-bold text-orange-600">{summaryCounts.high}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm text-muted-foreground">Critical</span></div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.critical}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Risk Register</TabsTrigger>
          <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Mitigated">Mitigated</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Risk #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead className="w-[60px]">P</TableHead>
                      <TableHead className="w-[60px]">I</TableHead>
                      <TableHead className="w-[60px]">D</TableHead>
                      <TableHead className="w-[70px]">RPN</TableHead>
                      <TableHead className="w-[100px]">Risk Level</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.map(risk => (
                      <TableRow key={risk.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(risk)}>
                        <TableCell className="font-mono text-xs">{risk.riskNumber}</TableCell>
                        <TableCell><p className="font-medium truncate max-w-xs">{risk.title}</p></TableCell>
                        <TableCell><Badge variant="outline">{risk.category}</Badge></TableCell>
                        <TableCell className="text-center font-mono">{risk.probability}</TableCell>
                        <TableCell className="text-center font-mono">{risk.impact}</TableCell>
                        <TableCell className="text-center font-mono">{risk.detectability}</TableCell>
                        <TableCell className="text-center font-bold">{risk.rpn}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', riskLevelColors[risk.riskLevel])} variant="secondary">{risk.riskLevel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', riskStatusColors[risk.status])} variant="secondary">{risk.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRisks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No risks found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Matrix (Probability × Impact)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-sm text-muted-foreground -rotate-90 whitespace-nowrap font-medium mb-16">Probability →</div>
                <div>
                  <div className="grid grid-cols-5 gap-1">
                    {/* Header row */}
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={`h-${i}`} className="text-xs text-center text-muted-foreground pb-1">Impact {i}</div>
                    ))}
                    {/* Matrix rows (probability 5 down to 1) */}
                    {[5, 4, 3, 2, 1].map(p => (
                      <React.Fragment key={p}>
                        {[1, 2, 3, 4, 5].map(i => {
                          const count = matrixCounts[`${p}-${i}`] || 0;
                          return (
                            <div
                              key={`${p}-${i}`}
                              className={cn(
                                'w-16 h-16 rounded-md flex flex-col items-center justify-center text-xs font-medium cursor-default',
                                getMatrixCellColor(p, i)
                              )}
                            >
                              <span>{p * i}</span>
                              {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-xs text-center text-muted-foreground mt-2">Impact →</div>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> Low (1-4)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300" /> Medium (5-9)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-400" /> High (10-19)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Critical (20+)</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create New Risk</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Title *</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Risk title" /></div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as RiskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Process">Process</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Probability (1-5)</Label>
                <Input type="number" min={1} max={5} value={formProbability} onChange={(e) => setFormProbability(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} />
              </div>
              <div className="grid gap-2">
                <Label>Impact (1-5)</Label>
                <Input type="number" min={1} max={5} value={formImpact} onChange={(e) => setFormImpact(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} />
              </div>
              <div className="grid gap-2">
                <Label>Detectability (1-5)</Label>
                <Input type="number" min={1} max={5} value={formDetectability} onChange={(e) => setFormDetectability(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} />
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
              <div>
                <span className="text-sm text-muted-foreground">RPN:</span>
                <span className="text-xl font-bold ml-2">{formRpn}</span>
              </div>
              <Badge className={cn('text-xs', riskLevelColors[formRiskLevel])} variant="secondary">{formRiskLevel}</Badge>
              <div className="text-xs text-muted-foreground">(P × I × D)</div>
            </div>
            <div className="grid gap-2"><Label>Mitigation</Label><Textarea value={formMitigation} onChange={(e) => setFormMitigation(e.target.value)} placeholder="Risk mitigation plan..." rows={3} /></div>
            <Button className="w-full" onClick={handleCreate} disabled={!formTitle}>Create Risk</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedRisk && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedRisk.riskNumber}</span>
                  {selectedRisk.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(riskLevelColors[selectedRisk.riskLevel])} variant="secondary">{selectedRisk.riskLevel} Risk</Badge>
                  <Badge className={cn(riskStatusColors[selectedRisk.status])} variant="secondary">{selectedRisk.status}</Badge>
                  {selectedRisk.category && <Badge variant="outline">{selectedRisk.category}</Badge>}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Probability</div>
                      <div className="text-xl font-bold">{selectedRisk.probability}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Impact</div>
                      <div className="text-xl font-bold">{selectedRisk.impact}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Detectability</div>
                      <div className="text-xl font-bold">{selectedRisk.detectability}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">RPN</div>
                      <div className="text-xl font-bold">{selectedRisk.rpn}</div>
                    </CardContent>
                  </Card>
                </div>

                {selectedRisk.mitigation && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Mitigation</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedRisk.mitigation}</p>
                  </div>
                )}
                {selectedRisk.residualRisk && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Residual Risk</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedRisk.residualRisk}</p>
                  </div>
                )}

                {hasPermission('risk.update') && selectedRisk.status === 'Open' && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => { store.updateRisk(selectedRisk.id, { status: 'Mitigated' }); setSelectedRisk({ ...selectedRisk, status: 'Mitigated' }); }}>
                      Mark as Mitigated
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => { store.updateRisk(selectedRisk.id, { status: 'Accepted' }); setSelectedRisk({ ...selectedRisk, status: 'Accepted' }); }}>
                      Accept Risk
                    </Button>
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
