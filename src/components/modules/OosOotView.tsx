'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import type { NonConformance } from '@/types/qms';
import {
  FlaskConical, Search, Eye, ArrowRight, CheckCircle2,
  AlertTriangle, XCircle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';

const phase1ConclusionColors: Record<string, string> = {
  'Error Found': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'No Error Found': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const phase2ConclusionColors: Record<string, string> = {
  'Confirmed OOS': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Invalidated': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pending': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const ncrStatusColors: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending Disposition': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Closed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function OosOotView() {
  const store = useQMSStore();
  const ncrs = store.ncrs;
  const profiles = store.profiles;

  // Filter to only OOS/OOT NCRs
  const oosOotNcrs = ncrs.filter(n => n.isOosOot);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNcr, setSelectedNcr] = useState<NonConformance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const filteredNcrs = oosOotNcrs.filter(ncr => {
    const matchesSearch = searchTerm === '' ||
      ncr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ncr.lotNumber && ncr.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || ncr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summaryCounts = {
    total: oosOotNcrs.length,
    phase1Pending: oosOotNcrs.filter(n => n.phase1Conclusion === 'Pending').length,
    phase2Required: oosOotNcrs.filter(n => n.phase2Required).length,
    confirmedOos: oosOotNcrs.filter(n => n.phase2Conclusion === 'Confirmed OOS').length,
    invalidated: oosOotNcrs.filter(n => n.phase2Conclusion === 'Invalidated').length,
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile?.fullName || profile?.email || userId;
  };

  const openDetail = (ncr: NonConformance) => {
    setSelectedNcr(ncr);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            OOS / OOT Investigations
          </h1>
          <p className="text-muted-foreground mt-1">Out of Specification / Out of Trend — ICH Q2(R1)</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Total OOS/OOT</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Phase 1 Pending</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.phase1Pending}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Phase 2 Required</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.phase2Required}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Confirmed OOS</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.confirmedOos}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Invalidated</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.invalidated}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher OOS/OOT (titre, NCR#, lot#)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['Open', 'Under Investigation', 'Pending Disposition', 'Closed'] as string[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-400">
          OOS/OOT records are created from the NCR module with the OOS/OOT flag enabled. This view provides a specialized investigation workflow per ICH Q2(R1) guidelines.
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">NCR #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Lot #</TableHead>
                  <TableHead className="w-[180px]">Analytical Method</TableHead>
                  <TableHead className="w-[100px]">Measured Value</TableHead>
                  <TableHead className="w-[110px]">Spec Limit</TableHead>
                  <TableHead className="w-[130px]">Phase 1</TableHead>
                  <TableHead className="w-[130px]">Phase 2</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNcrs.map(ncr => (
                  <TableRow key={ncr.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(ncr)}>
                    <TableCell className="font-mono text-xs">{ncr.ncrNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-xs">{ncr.title}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ncr.lotNumber || '-'}</TableCell>
                    <TableCell className="text-xs">{ncr.analyticalMethod || '-'}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {ncr.measuredValue !== undefined ? `${ncr.measuredValue} ${ncr.measuredUnit || ''}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{ncr.specLimit || '-'}</TableCell>
                    <TableCell>
                      {ncr.phase1Conclusion ? (
                        <Badge className={cn('text-xs', phase1ConclusionColors[ncr.phase1Conclusion] || '')} variant="secondary">
                          {ncr.phase1Conclusion}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ncr.phase2Required ? (
                        ncr.phase2Conclusion ? (
                          <Badge className={cn('text-xs', phase2ConclusionColors[ncr.phase2Conclusion] || '')} variant="secondary">
                            {ncr.phase2Conclusion}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" variant="secondary">
                            Required
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', ncrStatusColors[ncr.status] || '')} variant="secondary">{ncr.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(ncr); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNcrs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Aucun résultat OOS/OOT trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          {selectedNcr && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  <span className="font-mono text-sm text-muted-foreground">{selectedNcr.ncrNumber}</span>
                  {selectedNcr.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(ncrStatusColors[selectedNcr.status] || '')} variant="secondary">{selectedNcr.status}</Badge>
                  <Badge variant="outline" className="border-red-300 text-red-700">{selectedNcr.type}</Badge>
                  {selectedNcr.severity && <Badge variant="outline">{selectedNcr.severity}</Badge>}
                  {selectedNcr.rejectLot && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" variant="secondary">
                      Reject Lot
                    </Badge>
                  )}
                </div>

                {/* Phase 1 Investigation */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">Phase 1</span>
                    Laboratory Investigation
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Analytical Method:</span> <span className="font-medium ml-1">{selectedNcr.analyticalMethod || '-'}</span></div>
                    <div><span className="text-muted-foreground">Lot Number:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.lotNumber || '-'}</span></div>
                    <div><span className="text-muted-foreground">Measured Value:</span> <span className="font-medium ml-1">
                      {selectedNcr.measuredValue !== undefined ? `${selectedNcr.measuredValue} ${selectedNcr.measuredUnit || ''}` : '-'}
                    </span></div>
                    <div><span className="text-muted-foreground">Specification Limit:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.specLimit || '-'}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Phase 1 Conclusion:</span>
                    {selectedNcr.phase1Conclusion ? (
                      <Badge className={cn(phase1ConclusionColors[selectedNcr.phase1Conclusion] || '')} variant="secondary">
                        {selectedNcr.phase1Conclusion}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>

                {/* Phase 2 Investigation (if required) */}
                {selectedNcr.phase2Required && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded text-xs font-medium">Phase 2</span>
                      Full-Scale Investigation
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Phase 2 Conclusion:</span>
                      {selectedNcr.phase2Conclusion ? (
                        <Badge className={cn(phase2ConclusionColors[selectedNcr.phase2Conclusion] || '')} variant="secondary">
                          {selectedNcr.phase2Conclusion}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Reject Lot Decision:</span>
                      {selectedNcr.rejectLot ? (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" variant="secondary">Yes — Reject Lot</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" variant="secondary">No — Do Not Reject</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Standard NCR Fields */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">NCR Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{getUserName(selectedNcr.assignedTo)}</span></div>
                    <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedNcr.createdDate)}</span></div>
                    {selectedNcr.quantityAffected !== undefined && (
                      <div><span className="text-muted-foreground">Qty Affected:</span> <span className="font-medium ml-1">{selectedNcr.quantityAffected}</span></div>
                    )}
                    {selectedNcr.disposition && (
                      <div><span className="text-muted-foreground">Disposition:</span> <span className="font-medium ml-1">{selectedNcr.disposition}</span></div>
                    )}
                    {selectedNcr.source && (
                      <div><span className="text-muted-foreground">Source:</span> <span className="font-medium ml-1">{selectedNcr.source}</span></div>
                    )}
                    {selectedNcr.linkedCapaId && (
                      <div><span className="text-muted-foreground">Linked CAPA:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.linkedCapaId}</span></div>
                    )}
                    {selectedNcr.linkedProcedureRef && (
                      <div><span className="text-muted-foreground">Linked Procedure:</span> <span className="font-medium ml-1 font-mono text-xs">{selectedNcr.linkedProcedureRef}</span></div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-sm mb-1">Description</h5>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedNcr.description}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
