'use client';

import React, { useState, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import type { Risk, RiskCategory, RiskLevel, RiskStatus, SignatureType } from '@/types/qms';
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal';
import {
  BarChart3, Plus, Search, Eye, AlertTriangle, Shield, ShieldCheck,
  ArrowRight, AlertCircle, CheckCircle2, XCircle, Info,
  ChevronLeft, ChevronRight, MapPin, FileText, Link2,
  ClipboardCheck, UserCircle, BookOpen, Target, Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const riskLevelColors: Record<RiskLevel, string> = {
  'Low': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const riskStatusColors: Record<RiskStatus, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Mitigated': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Accepted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/** Extended categories for wizard */
const wizardCategories = [
  'Process', 'Product', 'Equipment', 'Facility', 'Personnel',
  'Regulatory', 'Supply Chain', 'Software', 'Environmental',
] as const;
type WizardRiskCategory = typeof wizardCategories[number];

/** Map wizard categories to existing RiskCategory type */
function mapToRiskCategory(cat: WizardRiskCategory): RiskCategory {
  switch (cat) {
    case 'Product': return 'Product';
    case 'Supply Chain': return 'Supplier';
    case 'Process': return 'Process';
    default: return 'System';
  }
}

const riskStatuses: RiskStatus[] = ['Open', 'Mitigated', 'Accepted', 'Closed'];
const riskLevels: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

const probLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const probDescriptions = [
  'Event may occur only in exceptional circumstances',
  'Event could occur at some time but not expected',
  'Event might occur at some time',
  'Event will probably occur in most circumstances',
  'Event is expected to occur in most circumstances',
];
const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const impactDescriptions = [
  'No significant impact on product quality or patient safety',
  'Minor impact, slight deviation from specifications',
  'Moderate impact, may cause non-conformance or minor harm',
  'Major impact, significant quality failure or serious harm',
  'Catastrophic impact, life-threatening or product recall',
];
const detectLabels = ['Very Detectable', 'Detectable', 'Possible', 'Difficult', 'Undetectable'];
const detectDescriptions = [
  'Almost certain to detect before reaching patient (P=1)',
  'High likelihood of detection through current controls (P=2)',
  'Moderate likelihood of detection (P=3)',
  'Low likelihood of detection through current controls (P=4)',
  'Very unlikely to detect before reaching patient (P=5)',
];

const hierarchyOfControls = [
  'Elimination',
  'Substitution',
  'Engineering Controls',
  'Administrative Controls',
  'PPE',
] as const;

const acceptabilityOptions = ['Acceptable', 'ALARP', 'Unacceptable'] as const;

/** RPN-based risk level per spec: 1-10=Low, 11-30=Medium, 31-60=High, 61+=Critical */
function getRiskLevel(rpn: number): RiskLevel {
  if (rpn >= 61) return 'Critical';
  if (rpn >= 31) return 'High';
  if (rpn >= 11) return 'Medium';
  return 'Low';
}

/** Matrix cell color based on RPN thresholds */
function getMatrixCellColor(rpn: number): string {
  if (rpn >= 61) return 'bg-red-500/80 text-white';
  if (rpn >= 31) return 'bg-orange-400/80 text-white';
  if (rpn >= 11) return 'bg-yellow-300/80 text-gray-900';
  return 'bg-green-400/80 text-white';
}

/** Get risk level color for badge backgrounds */
function getRiskLevelBadgeColor(level: RiskLevel): string {
  return riskLevelColors[level];
}

/** Status flow: Open → Mitigated → Closed (or Open → Accepted) */
function getAvailableTransitions(current: RiskStatus): RiskStatus[] {
  switch (current) {
    case 'Open': return ['Mitigated', 'Accepted'];
    case 'Mitigated': return ['Closed'];
    case 'Accepted': return [];
    case 'Closed': return [];
    default: return [];
  }
}

// ---------------------------------------------------------------------------
// Wizard Form State Interface
// ---------------------------------------------------------------------------
interface WizardFormState {
  // Step 1
  title: string;
  category: WizardRiskCategory;
  hazardDescription: string;
  // Step 2
  probability: number;
  impact: number;
  detectability: number;
  // Step 3
  riskAcceptability: 'Acceptable' | 'ALARP' | 'Unacceptable';
  regulatoryReference: string;
  // Step 4
  mitigationMeasures: string;
  controlType: typeof hierarchyOfControls[number];
  verificationMethod: string;
  residualProbability: number;
  residualImpact: number;
  residualDetectability: number;
  // Step 5
  riskOwner: string;
  linkedDocument: string;
  linkedCapa: string;
  priorityNotes: string;
}

const initialWizardForm: WizardFormState = {
  title: '',
  category: 'Process',
  hazardDescription: '',
  probability: 3,
  impact: 3,
  detectability: 3,
  riskAcceptability: 'ALARP',
  regulatoryReference: 'ISO 14971:2019',
  mitigationMeasures: '',
  controlType: 'Engineering Controls',
  verificationMethod: '',
  residualProbability: 2,
  residualImpact: 2,
  residualDetectability: 2,
  riskOwner: '',
  linkedDocument: '',
  linkedCapa: '',
  priorityNotes: '',
};

// ---------------------------------------------------------------------------
// 5×5 Risk Matrix Visualization Component
// ---------------------------------------------------------------------------
function RiskMatrixVisualization({
  probability,
  impact,
  detectability,
  size = 'sm',
}: {
  probability: number;
  impact: number;
  detectability: number;
  size?: 'sm' | 'lg';
}) {
  const cellSize = size === 'lg' ? 'w-[72px] h-[72px]' : 'w-10 h-10';
  const textSize = size === 'lg' ? 'text-xs' : 'text-[10px]';
  const gapSize = size === 'lg' ? 'gap-1' : 'gap-0.5';

  return (
    <div>
      {size === 'lg' && (
        <div className="mb-2">
          <h4 className="font-medium text-sm">5 × 5 Probability × Impact Matrix</h4>
          <p className="text-xs text-muted-foreground">Current risk position highlighted with marker</p>
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Y-axis label */}
        {size === 'lg' && (
          <div className="text-sm text-muted-foreground -rotate-90 whitespace-nowrap font-medium mb-20">
            Probability →
          </div>
        )}

        <div>
          {/* Impact header row */}
          <div className={`grid grid-cols-5 ${gapSize} mb-1`}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={`h-${i}`} className={`${textSize} text-center text-muted-foreground ${cellSize.replace('h-[72px]', '').replace('h-10', '').trim()} flex items-end justify-center pb-0.5`}>
                {size === 'lg' ? (
                  <div>
                    <div className="font-medium">Impact {i}</div>
                    <div className="text-[10px]">{impactLabels[i - 1]}</div>
                  </div>
                ) : (
                  <span>I{i}</span>
                )}
              </div>
            ))}
          </div>

          {/* Matrix rows (probability 5 down to 1) */}
          {[5, 4, 3, 2, 1].map(p => (
            <div key={p} className={`grid grid-cols-5 ${gapSize} mb-1`}>
              {[1, 2, 3, 4, 5].map(i => {
                const isHighlighted = probability === p && impact === i;
                const cellRpn = p * i * (detectability || 3);
                return (
                  <div
                    key={`${p}-${i}`}
                    className={cn(
                      `${cellSize} rounded flex flex-col items-center justify-center ${textSize} font-medium`,
                      isHighlighted
                        ? `ring-2 ring-primary ring-offset-2 shadow-lg ${getMatrixCellColor(cellRpn)}`
                        : getMatrixCellColor(p * i * 3),
                      isHighlighted && 'scale-110 z-10',
                    )}
                  >
                    {isHighlighted && <MapPin className="h-3 w-3 mb-0.5" />}
                    <span className={isHighlighted ? 'font-bold' : ''}>
                      {isHighlighted ? cellRpn : p * i}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis label */}
          <div className={`${textSize} text-center text-muted-foreground mt-1 font-medium`}>
            Impact →
          </div>
        </div>

        {/* Probability row labels */}
        <div className="flex flex-col justify-around">
          {[5, 4, 3, 2, 1].map(p => (
            <div key={`pl-${p}`} className={`${cellSize.includes('72') ? 'h-[72px]' : 'h-10'} flex items-center`}>
              <div className={`${textSize} text-muted-foreground whitespace-nowrap`}>
                {size === 'lg' ? (
                  <>
                    <span className="font-medium">P{p}</span>
                    <span className="text-[10px] ml-1">{probLabels[p - 1]}</span>
                  </>
                ) : (
                  <span className="font-medium">P{p}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {size === 'lg' && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400/80" /> Low (RPN 1-10)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-300/80" /> Medium (RPN 11-30)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-400/80" /> High (RPN 31-60)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/80" /> Critical (RPN 61+)</div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskView() {
  const { currentUser, hasPermission } = useAuth();
  const store = useQMSStore();
  const risks = store.risks;
  const profiles = store.profiles;
  const documents = store.documents;
  const capas = store.capas;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState<WizardFormState>({ ...initialWizardForm });

  // Electronic signature state
  const [showEsigModal, setShowEsigModal] = useState(false);
  const [esigTargetStatus, setEsigTargetStatus] = useState<RiskStatus | null>(null);
  const [esigRisk, setEsigRisk] = useState<Risk | null>(null);

  // Computed wizard values
  const wizardRpn = wizardForm.probability * wizardForm.impact * wizardForm.detectability;
  const wizardRiskLevel = getRiskLevel(wizardRpn);
  const residualRpn = wizardForm.residualProbability * wizardForm.residualImpact * wizardForm.residualDetectability;
  const residualRiskLevel = getRiskLevel(residualRpn);

  // Filtered risks
  const filteredRisks = risks.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.riskNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesLevel = levelFilter === 'all' || r.riskLevel === levelFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesLevel && matchesCategory;
  });

  // Summary counts
  const summaryCounts = useMemo(() => ({
    total: risks.length,
    highCritical: risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length,
    open: risks.filter(r => r.status === 'Open').length,
    mitigated: risks.filter(r => r.status === 'Mitigated').length,
  }), [risks]);

  // Matrix counts (probability vs impact)
  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    risks.forEach(r => {
      const key = `${r.probability}-${r.impact}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [risks]);

  // Approved documents for linking
  const approvedDocs = documents.filter(d => d.status === 'Approved');

  // Wizard helpers
  const updateWizardForm = (field: keyof WizardFormState, value: string | number) => {
    setWizardForm(prev => ({ ...prev, [field]: value }));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardForm({ ...initialWizardForm });
  };

  const canAdvanceStep = (step: number): boolean => {
    switch (step) {
      case 1: return wizardForm.title.trim().length > 0 && wizardForm.hazardDescription.trim().length > 0;
      case 2: return true; // P/I/D always have defaults
      case 3: return true;
      case 4: return true;
      case 5: return wizardForm.riskOwner !== '';
      case 6: return true;
      default: return false;
    }
  };

  const handleCreateFromWizard = () => {
    if (!wizardForm.title.trim()) return;
    const newRisk: Risk = {
      id: `risk-${Date.now()}`,
      riskNumber: `RISK-2024-${String(risks.length + 1).padStart(3, '0')}`,
      title: wizardForm.title.trim(),
      category: mapToRiskCategory(wizardForm.category),
      probability: wizardForm.probability,
      impact: wizardForm.impact,
      detectability: wizardForm.detectability,
      rpn: wizardRpn,
      riskLevel: wizardRiskLevel,
      mitigation: wizardForm.mitigationMeasures.trim() || undefined,
      residualRisk: `Residual RPN: ${residualRpn} (${residualRiskLevel}) — Control: ${wizardForm.controlType}`,
      status: 'Open',
      // --- P0-2: Persist ALL wizard data (previously lost) ---
      hazardDescription: wizardForm.hazardDescription.trim() || undefined,
      riskAcceptability: wizardForm.riskAcceptability,
      regulatoryReference: wizardForm.regulatoryReference.trim() || undefined,
      controlType: wizardForm.controlType,
      verificationMethod: wizardForm.verificationMethod.trim() || undefined,
      residualProbability: wizardForm.residualProbability,
      residualImpact: wizardForm.residualImpact,
      residualDetectability: wizardForm.residualDetectability,
      riskOwner: wizardForm.riskOwner.trim() || undefined,
      priorityNotes: wizardForm.priorityNotes.trim() || undefined,
      linkedDocumentId: wizardForm.linkedDocument && wizardForm.linkedDocument !== 'none' ? wizardForm.linkedDocument : undefined,
      linkedCapaId: wizardForm.linkedCapa && wizardForm.linkedCapa !== 'none' ? wizardForm.linkedCapa : undefined,
      organizationId: 'org-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addRisk(newRisk);
    resetWizard();
    setShowCreateDialog(false);
  };

  const openDetail = (risk: Risk) => {
    setSelectedRisk(risk);
    setShowDetailDialog(true);
  };

  const handleStatusAdvanceRequest = (risk: Risk, newStatus: RiskStatus) => {
    setEsigRisk(risk);
    setEsigTargetStatus(newStatus);
    setShowEsigModal(true);
  };

  const handleEsigConfirm = (signatureData: { signatureHash: string; signedAt: string; signatureType: SignatureType }) => {
    if (esigRisk && esigTargetStatus) {
      store.updateRisk(esigRisk.id, { status: esigTargetStatus });
      if (selectedRisk?.id === esigRisk.id) {
        setSelectedRisk({ ...esigRisk, status: esigTargetStatus });
      }
    }
    setShowEsigModal(false);
    setEsigRisk(null);
    setEsigTargetStatus(null);
  };

  // Step labels
  const wizardSteps = [
    { num: 1, label: 'Identification', icon: Target },
    { num: 2, label: 'Assessment', icon: BarChart3 },
    { num: 3, label: 'Evaluation', icon: Scale },
    { num: 4, label: 'Mitigation', icon: ShieldCheck },
    { num: 5, label: 'Assignment', icon: UserCircle },
    { num: 6, label: 'Review', icon: ClipboardCheck },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Risk Management
          </h1>
          <p className="text-muted-foreground mt-1">Risk assessment and management (ISO 14971:2019)</p>
        </div>
        {hasPermission('risk.create') && (
          <Button onClick={() => { resetWizard(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Risk
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Risks</span>
            </div>
            <span className="text-2xl font-bold">{summaryCounts.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">High / Critical</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{summaryCounts.highCritical}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{summaryCounts.open}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Mitigated</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{summaryCounts.mitigated}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: List + Matrix */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Risk Register</TabsTrigger>
          <TabsTrigger value="matrix">RPN Risk Matrix</TabsTrigger>
        </TabsList>

        {/* ─── Risk Register Tab ─── */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {riskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {riskLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Process">Process</SelectItem>
                <SelectItem value="System">System</SelectItem>
                <SelectItem value="Supplier">Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Risk #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead className="w-[50px]">P</TableHead>
                      <TableHead className="w-[50px]">I</TableHead>
                      <TableHead className="w-[50px]">D</TableHead>
                      <TableHead className="w-[70px]">RPN</TableHead>
                      <TableHead className="w-[100px]">Risk Level</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
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
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(risk); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRisks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No risks found matching filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Risk Matrix Tab ─── */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RPN Risk Matrix — Probability (1-5) × Impact (1-5)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cell values show P×I base score. Counts indicate how many risks occupy each cell.
                Risk level is determined by full RPN (P × I × D).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                {/* Y-axis label */}
                <div className="text-sm text-muted-foreground -rotate-90 whitespace-nowrap font-medium mb-20">
                  Probability →
                </div>

                <div>
                  {/* Impact header row */}
                  <div className="grid grid-cols-5 gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={`h-${i}`} className="text-xs text-center text-muted-foreground w-[72px]">
                        <div className="font-medium">Impact {i}</div>
                        <div className="text-[10px]">{impactLabels[i - 1]}</div>
                      </div>
                    ))}
                  </div>

                  {/* Matrix rows (probability 5 down to 1) */}
                  {[5, 4, 3, 2, 1].map(p => (
                    <div key={p} className="grid grid-cols-5 gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(i => {
                        const count = matrixCounts[`${p}-${i}`] || 0;
                        const baseRpn = p * i;
                        return (
                          <div
                            key={`${p}-${i}`}
                            className={cn(
                              'w-[72px] h-[72px] rounded-md flex flex-col items-center justify-center text-xs font-medium cursor-default',
                              getMatrixCellColor(baseRpn * 3)
                            )}
                          >
                            <span className="font-bold">{baseRpn}</span>
                            {count > 0 && (
                              <span className="text-[10px] opacity-90 mt-0.5">({count} risk{count > 1 ? 's' : ''})</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* X-axis label */}
                  <div className="text-xs text-center text-muted-foreground mt-2 font-medium">Impact →</div>
                </div>

                {/* Probability row labels */}
                <div className="flex flex-col justify-around mb-6">
                  {[5, 4, 3, 2, 1].map(p => (
                    <div key={`pl-${p}`} className="h-[72px] flex items-center">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium">P{p}</span>
                        <span className="text-[10px] ml-1">{probLabels[p - 1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400/80" /> Low (RPN 1-10)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-300/80" /> Medium (RPN 11-30)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-400/80" /> High (RPN 31-60)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/80" /> Critical (RPN 61+)</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create Risk Wizard Dialog ─── */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetWizard(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Create New Risk Assessment
            </DialogTitle>
          </DialogHeader>

          {/* Wizard Step Indicator */}
          <div className="flex items-center gap-1 px-2 pb-2">
            {wizardSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = wizardStep === step.num;
              const isCompleted = wizardStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <button
                    onClick={() => { if (isCompleted) setWizardStep(step.num); }}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20' :
                      'bg-muted text-muted-foreground',
                    )}
                    disabled={!isCompleted && !isActive}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.num}</span>
                  </button>
                  {idx < wizardSteps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <Separator />

          {/* Wizard Content */}
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">

              {/* ─── Step 1: Risk Identification ─── */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Step 1: Risk Identification
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Define the risk, its category, and describe the potential hazard.</p>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="risk-title" className="flex items-center gap-1">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="risk-title"
                        value={wizardForm.title}
                        onChange={(e) => updateWizardForm('title', e.target.value)}
                        placeholder="e.g., Sterilization process failure risk"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select value={wizardForm.category} onValueChange={(v) => updateWizardForm('category', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {wizardCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="hazard-desc" className="flex items-center gap-1">
                        Hazard Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="hazard-desc"
                        value={wizardForm.hazardDescription}
                        onChange={(e) => updateWizardForm('hazardDescription', e.target.value)}
                        placeholder="Describe the potential harm, hazardous situation, and who/what could be affected..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        Describe the potential harm, the hazardous situation that could lead to it, and the population that could be affected (per ISO 14971 hazard analysis).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 2: Risk Assessment (P × I × D) ─── */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Step 2: Risk Assessment (P × I × D)
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Evaluate probability, impact, and detectability to calculate the Risk Priority Number.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Probability */}
                    <div className="grid gap-2">
                      <Label className="font-semibold">Probability (P)</Label>
                      <Select value={String(wizardForm.probability)} onValueChange={(v) => updateWizardForm('probability', Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(v => (
                            <SelectItem key={v} value={String(v)}>
                              {v} — {probLabels[v - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                        <div className="font-medium text-primary">{wizardForm.probability} — {probLabels[wizardForm.probability - 1]}</div>
                        <p className="text-muted-foreground">{probDescriptions[wizardForm.probability - 1]}</p>
                      </div>
                    </div>

                    {/* Impact */}
                    <div className="grid gap-2">
                      <Label className="font-semibold">Impact (I)</Label>
                      <Select value={String(wizardForm.impact)} onValueChange={(v) => updateWizardForm('impact', Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(v => (
                            <SelectItem key={v} value={String(v)}>
                              {v} — {impactLabels[v - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                        <div className="font-medium text-primary">{wizardForm.impact} — {impactLabels[wizardForm.impact - 1]}</div>
                        <p className="text-muted-foreground">{impactDescriptions[wizardForm.impact - 1]}</p>
                      </div>
                    </div>

                    {/* Detectability */}
                    <div className="grid gap-2">
                      <Label className="font-semibold">Detectability (D)</Label>
                      <Select value={String(wizardForm.detectability)} onValueChange={(v) => updateWizardForm('detectability', Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(v => (
                            <SelectItem key={v} value={String(v)}>
                              {v} — {detectLabels[v - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                        <div className="font-medium text-primary">{wizardForm.detectability} — {detectLabels[wizardForm.detectability - 1]}</div>
                        <p className="text-muted-foreground">{detectDescriptions[wizardForm.detectability - 1]}</p>
                      </div>
                    </div>
                  </div>

                  {/* RPN Display */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <span className="text-sm text-muted-foreground">RPN:</span>
                      <span className="text-3xl font-bold ml-2">{wizardRpn}</span>
                    </div>
                    <Badge className={cn('text-sm px-3 py-1', getRiskLevelBadgeColor(wizardRiskLevel))} variant="secondary">
                      {wizardRiskLevel}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      (P × I × D = {wizardForm.probability} × {wizardForm.impact} × {wizardForm.detectability} = {wizardRpn})
                    </div>
                  </div>

                  {/* 5×5 Risk Matrix */}
                  <RiskMatrixVisualization
                    probability={wizardForm.probability}
                    impact={wizardForm.impact}
                    detectability={wizardForm.detectability}
                    size="lg"
                  />
                </div>
              )}

              {/* ─── Step 3: Risk Evaluation ─── */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Scale className="h-5 w-5 text-primary" />
                      Step 3: Risk Evaluation
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Determine risk acceptability based on the calculated RPN and regulatory thresholds.</p>
                  </div>

                  {/* Auto-calculated Risk Level */}
                  <Card>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Calculated Risk Level</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-bold">RPN {wizardRpn}</span>
                            <Badge className={cn('text-sm px-3 py-1', getRiskLevelBadgeColor(wizardRiskLevel))} variant="secondary">
                              {wizardRiskLevel}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">Formula</div>
                          <div className="font-mono">{wizardForm.probability} × {wizardForm.impact} × {wizardForm.detectability} = {wizardRpn}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* RPN Thresholds */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-md p-3 text-center">
                      <div className="text-lg font-bold text-green-700 dark:text-green-400">1-10</div>
                      <div className="text-xs font-medium text-green-700 dark:text-green-400">Low</div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-md p-3 text-center">
                      <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">11-30</div>
                      <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Medium</div>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/30 rounded-md p-3 text-center">
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-400">31-60</div>
                      <div className="text-xs font-medium text-orange-700 dark:text-orange-400">High</div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-md p-3 text-center">
                      <div className="text-lg font-bold text-red-700 dark:text-red-400">61+</div>
                      <div className="text-xs font-medium text-red-700 dark:text-red-400">Critical</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Risk Acceptability */}
                  <div className="grid gap-2">
                    <Label className="font-semibold">Risk Acceptability</Label>
                    <Select value={wizardForm.riskAcceptability} onValueChange={(v) => updateWizardForm('riskAcceptability', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {acceptabilityOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="bg-muted/50 rounded-md p-3 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]" variant="secondary">Acceptable</Badge>
                        <span className="text-muted-foreground">Risk is acceptable without further mitigation. RPN is in the Low range.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px]" variant="secondary">ALARP</Badge>
                        <span className="text-muted-foreground">As Low As Reasonably Practicable — risk must be reduced to the lowest practical level. Mitigation is required.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]" variant="secondary">Unacceptable</Badge>
                        <span className="text-muted-foreground">Risk is unacceptable and must be reduced before proceeding. Immediate action required.</span>
                      </div>
                    </div>
                  </div>

                  {/* Regulatory Reference */}
                  <div className="grid gap-2">
                    <Label className="font-semibold flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      Regulatory Reference
                    </Label>
                    <Input
                      value={wizardForm.regulatoryReference}
                      onChange={(e) => updateWizardForm('regulatoryReference', e.target.value)}
                      placeholder="e.g., ISO 14971:2019"
                    />
                  </div>
                </div>
              )}

              {/* ─── Step 4: Mitigation Plan ─── */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Step 4: Mitigation Plan
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Define mitigation measures using the Hierarchy of Controls and assess residual risk.</p>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="font-semibold">Mitigation Measures</Label>
                      <Textarea
                        value={wizardForm.mitigationMeasures}
                        onChange={(e) => updateWizardForm('mitigationMeasures', e.target.value)}
                        placeholder="Describe the specific actions taken to reduce the risk, including process changes, design modifications, or controls implemented..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-semibold">Control Type (Hierarchy of Controls)</Label>
                        <Select value={wizardForm.controlType} onValueChange={(v) => updateWizardForm('controlType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {hierarchyOfControls.map(ct => (
                              <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="bg-muted/50 rounded-md p-2 text-xs text-muted-foreground">
                          <span className="font-medium">Hierarchy:</span> Elimination → Substitution → Engineering → Administrative → PPE
                          <br />(Most effective to least effective)
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-semibold">Verification Method</Label>
                        <Input
                          value={wizardForm.verificationMethod}
                          onChange={(e) => updateWizardForm('verificationMethod', e.target.value)}
                          placeholder="e.g., Process validation, inspection, testing"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Residual Risk Assessment */}
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <ArrowRight className="h-4 w-4" />
                        Residual Risk Assessment
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Residual Probability</Label>
                          <Select value={String(wizardForm.residualProbability)} onValueChange={(v) => updateWizardForm('residualProbability', Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(v => (
                                <SelectItem key={v} value={String(v)}>{v} — {probLabels[v - 1]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Residual Impact</Label>
                          <Select value={String(wizardForm.residualImpact)} onValueChange={(v) => updateWizardForm('residualImpact', Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(v => (
                                <SelectItem key={v} value={String(v)}>{v} — {impactLabels[v - 1]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Residual Detectability</Label>
                          <Select value={String(wizardForm.residualDetectability)} onValueChange={(v) => updateWizardForm('residualDetectability', Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(v => (
                                <SelectItem key={v} value={String(v)}>{v} — {detectLabels[v - 1]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Residual RPN comparison */}
                      <div className="mt-3 p-4 bg-muted/50 rounded-lg border flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Initial RPN</div>
                          <div className="text-2xl font-bold">{wizardRpn}</div>
                          <Badge className={cn('text-xs', getRiskLevelBadgeColor(wizardRiskLevel))} variant="secondary">{wizardRiskLevel}</Badge>
                        </div>
                        <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Residual RPN</div>
                          <div className="text-2xl font-bold">{residualRpn}</div>
                          <Badge className={cn('text-xs', getRiskLevelBadgeColor(residualRiskLevel))} variant="secondary">{residualRiskLevel}</Badge>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-xs text-muted-foreground">Reduction</div>
                          <div className={cn(
                            'text-lg font-bold',
                            residualRpn < wizardRpn ? 'text-green-600' : residualRpn > wizardRpn ? 'text-red-600' : 'text-muted-foreground'
                          )}>
                            {residualRpn < wizardRpn ? '↓' : residualRpn > wizardRpn ? '↑' : '→'} {Math.abs(wizardRpn - residualRpn)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 5: Assignment & Links ─── */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-primary" />
                      Step 5: Assignment & Links
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Assign a risk owner and link to related documents and CAPAs.</p>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="font-semibold flex items-center gap-1">
                        <UserCircle className="h-4 w-4" />
                        Risk Owner <span className="text-red-500">*</span>
                      </Label>
                      <Select value={wizardForm.riskOwner} onValueChange={(v) => updateWizardForm('riskOwner', v)}>
                        <SelectTrigger><SelectValue placeholder="Select risk owner..." /></SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.fullName || p.email} — {p.jobTitle || p.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-semibold flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Linked Document
                        </Label>
                        <Select value={wizardForm.linkedDocument} onValueChange={(v) => updateWizardForm('linkedDocument', v)}>
                          <SelectTrigger><SelectValue placeholder="Select approved document..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {approvedDocs.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.documentNumber} — {d.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-semibold flex items-center gap-1">
                          <Link2 className="h-4 w-4" />
                          Linked CAPA
                        </Label>
                        <Select value={wizardForm.linkedCapa} onValueChange={(v) => updateWizardForm('linkedCapa', v)}>
                          <SelectTrigger><SelectValue placeholder="Select CAPA..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {capas.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.capaNumber} — {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-semibold">Priority Notes</Label>
                      <Textarea
                        value={wizardForm.priorityNotes}
                        onChange={(e) => updateWizardForm('priorityNotes', e.target.value)}
                        placeholder="Any additional priority notes, deadlines, or special considerations..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 6: Review & Submit ─── */}
              {wizardStep === 6 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      Step 6: Review & Submit
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Review all entered data before submitting the risk assessment.</p>
                  </div>

                  {/* Review Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Identification Summary */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4" /> Identification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Title:</span>
                          <span className="font-medium truncate max-w-[200px]">{wizardForm.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <Badge variant="outline">{wizardForm.category}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hazard:</span>
                          <p className="text-xs mt-0.5 line-clamp-3">{wizardForm.hazardDescription}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assessment Summary */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" /> Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P:</span>
                          <span className="font-medium">{wizardForm.probability} — {probLabels[wizardForm.probability - 1]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">I:</span>
                          <span className="font-medium">{wizardForm.impact} — {impactLabels[wizardForm.impact - 1]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">D:</span>
                          <span className="font-medium">{wizardForm.detectability} — {detectLabels[wizardForm.detectability - 1]}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-muted-foreground">RPN:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{wizardRpn}</span>
                            <Badge className={cn('text-xs', getRiskLevelBadgeColor(wizardRiskLevel))} variant="secondary">{wizardRiskLevel}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Evaluation Summary */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Scale className="h-4 w-4" /> Evaluation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Risk Level:</span>
                          <Badge className={cn('text-xs', getRiskLevelBadgeColor(wizardRiskLevel))} variant="secondary">{wizardRiskLevel}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Acceptability:</span>
                          <Badge variant="outline">{wizardForm.riskAcceptability}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Regulatory Ref:</span>
                          <span className="font-medium">{wizardForm.regulatoryReference}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Mitigation Summary */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Mitigation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Control Type:</span>
                          <Badge variant="outline">{wizardForm.controlType}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verification:</span>
                          <span className="font-medium truncate max-w-[180px]">{wizardForm.verificationMethod || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Residual RPN:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{residualRpn}</span>
                            <Badge className={cn('text-xs', getRiskLevelBadgeColor(residualRiskLevel))} variant="secondary">{residualRiskLevel}</Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">RPN Reduction:</span>
                          <span className={cn('font-bold', residualRpn < wizardRpn ? 'text-green-600' : 'text-muted-foreground')}>
                            {wizardRpn} → {residualRpn} (↓{wizardRpn - residualRpn})
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Assignment Summary */}
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UserCircle className="h-4 w-4" /> Assignment & Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk Owner:</span>
                          <span className="font-medium">
                            {profiles.find(p => p.id === wizardForm.riskOwner)?.fullName || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Linked Document:</span>
                          <span className="font-medium truncate max-w-[150px]">
                            {wizardForm.linkedDocument && wizardForm.linkedDocument !== 'none'
                              ? documents.find(d => d.id === wizardForm.linkedDocument)?.documentNumber || '—'
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Linked CAPA:</span>
                          <span className="font-medium truncate max-w-[150px]">
                            {wizardForm.linkedCapa && wizardForm.linkedCapa !== 'none'
                              ? capas.find(c => c.id === wizardForm.linkedCapa)?.capaNumber || '—'
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {wizardForm.priorityNotes && (
                        <div className="mt-2">
                          <span className="text-muted-foreground">Priority Notes:</span>
                          <p className="text-xs mt-0.5">{wizardForm.priorityNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ISO 14971 Compliance Note */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">ISO 14971:2019 Compliance Verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By submitting this risk assessment, you confirm that the risk has been evaluated in accordance with
                        ISO 14971:2019 — Medical devices — Application of risk management to medical devices.
                        The risk assessment follows the standard&apos;s requirements for risk analysis, risk evaluation, and risk control.
                        All risk control measures have been verified for effectiveness, and residual risk has been evaluated
                        against benefit criteria as required by the standard.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Wizard Navigation */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <Button
              variant="outline"
              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
              disabled={wizardStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="text-xs text-muted-foreground">
              Step {wizardStep} of 6
            </div>

            {wizardStep < 6 ? (
              <Button
                onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                disabled={!canAdvanceStep(wizardStep)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateFromWizard}
                disabled={!wizardForm.title.trim()}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Submit Risk Assessment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Enhanced Detail Dialog ─── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedRisk && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedRisk.riskNumber}</span>
                  {selectedRisk.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(riskLevelColors[selectedRisk.riskLevel])} variant="secondary">{selectedRisk.riskLevel} Risk</Badge>
                  <Badge className={cn(riskStatusColors[selectedRisk.status])} variant="secondary">{selectedRisk.status}</Badge>
                  {selectedRisk.category && <Badge variant="outline">{selectedRisk.category}</Badge>}
                </div>

                {/* Status flow visualization */}
                <div className="flex items-center gap-1 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  {(['Open', 'Mitigated', 'Closed'] as RiskStatus[]).map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                        s === selectedRisk.status ? 'bg-primary text-primary-foreground' :
                        (s === 'Open' && selectedRisk.status !== 'Open') ||
                        (s === 'Mitigated' && selectedRisk.status === 'Closed') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {s}
                      </div>
                      {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                  {selectedRisk.status === 'Accepted' && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mx-1" />
                      <div className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Accepted
                      </div>
                    </>
                  )}
                </div>

                {/* RPN Breakdown */}
                <div className="grid grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Probability</div>
                      <div className="text-xl font-bold">{selectedRisk.probability}</div>
                      <div className="text-[10px] text-muted-foreground">{probLabels[selectedRisk.probability - 1]}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Impact</div>
                      <div className="text-xl font-bold">{selectedRisk.impact}</div>
                      <div className="text-[10px] text-muted-foreground">{impactLabels[selectedRisk.impact - 1]}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">Detectability</div>
                      <div className="text-xl font-bold">{selectedRisk.detectability}</div>
                      <div className="text-[10px] text-muted-foreground">{detectLabels[selectedRisk.detectability - 1]}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <div className="text-xs text-muted-foreground">RPN</div>
                      <div className="text-xl font-bold">{selectedRisk.rpn}</div>
                      <div className="text-[10px] text-muted-foreground">P×I×D</div>
                    </CardContent>
                  </Card>
                </div>

                {/* RPN formula */}
                <div className="p-3 bg-muted/30 rounded-md text-sm">
                  <span className="text-muted-foreground">RPN Calculation: </span>
                  <span className="font-mono font-medium">{selectedRisk.probability} × {selectedRisk.impact} × {selectedRisk.detectability} = {selectedRisk.rpn}</span>
                  <span className="text-muted-foreground ml-2">→ </span>
                  <Badge className={cn('text-xs ml-1', riskLevelColors[selectedRisk.riskLevel])} variant="secondary">{selectedRisk.riskLevel}</Badge>
                </div>

                {/* Risk Matrix Position (highlighted) */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Matrix Position
                  </h4>
                  <RiskMatrixVisualization
                    probability={selectedRisk.probability}
                    impact={selectedRisk.impact}
                    detectability={selectedRisk.detectability}
                    size="sm"
                  />
                </div>

                <Separator />

                {/* Mitigation Plan Section */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Mitigation Plan
                  </h4>
                  {selectedRisk.mitigation ? (
                    <div className="space-y-2">
                      <p className="text-sm bg-muted/30 p-3 rounded-md">{selectedRisk.mitigation}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No mitigation plan recorded.</p>
                  )}
                </div>

                {/* Residual Risk Assessment (P3-3: ISO 14971 structured comparison) */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Residual Risk Assessment
                  </h4>
                  {selectedRisk.residualProbability !== undefined && selectedRisk.residualImpact !== undefined && selectedRisk.residualDetectability !== undefined ? (
                    <div className="space-y-3">
                      {/* Side-by-side comparison table */}
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Parameter</th>
                              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Initial</th>
                              <th className="px-3 py-2 text-center font-medium text-muted-foreground">→</th>
                              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Residual</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="px-3 py-2 font-medium">Probability (P)</td>
                              <td className="px-3 py-2 text-center">{selectedRisk.probability}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">→</td>
                              <td className={cn('px-3 py-2 text-center font-medium', selectedRisk.residualProbability < selectedRisk.probability ? 'text-green-600' : selectedRisk.residualProbability > selectedRisk.probability ? 'text-red-600' : '')}>
                                {selectedRisk.residualProbability}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Impact (I)</td>
                              <td className="px-3 py-2 text-center">{selectedRisk.impact}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">→</td>
                              <td className={cn('px-3 py-2 text-center font-medium', selectedRisk.residualImpact < selectedRisk.impact ? 'text-green-600' : selectedRisk.residualImpact > selectedRisk.impact ? 'text-red-600' : '')}>
                                {selectedRisk.residualImpact}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Detectability (D)</td>
                              <td className="px-3 py-2 text-center">{selectedRisk.detectability}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">→</td>
                              <td className={cn('px-3 py-2 text-center font-medium', selectedRisk.residualDetectability < selectedRisk.detectability ? 'text-green-600' : selectedRisk.residualDetectability > selectedRisk.detectability ? 'text-red-600' : '')}>
                                {selectedRisk.residualDetectability}
                              </td>
                            </tr>
                            <tr className="bg-muted/30">
                              <td className="px-3 py-2 font-bold">RPN</td>
                              <td className="px-3 py-2 text-center font-bold">{selectedRisk.rpn}</td>
                              <td className="px-3 py-2 text-center">
                                <ArrowRight className="h-4 w-4 text-primary mx-auto" />
                              </td>
                              <td className="px-3 py-2 text-center font-bold">
                                {(() => {
                                  const residualRpn = selectedRisk.residualProbability * selectedRisk.residualImpact * selectedRisk.residualDetectability;
                                  return (
                                    <span className={cn(residualRpn < selectedRisk.rpn ? 'text-green-600' : residualRpn > selectedRisk.rpn ? 'text-red-600' : '')}>
                                      {residualRpn}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr className="bg-muted/30">
                              <td className="px-3 py-2 font-bold">Risk Level</td>
                              <td className="px-3 py-2 text-center">
                                <Badge className={cn('text-xs', riskLevelColors[selectedRisk.riskLevel])} variant="secondary">{selectedRisk.riskLevel}</Badge>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <ArrowRight className="h-4 w-4 text-primary mx-auto" />
                              </td>
                              <td className="px-3 py-2 text-center">
                                {(() => {
                                  const residualRpn = selectedRisk.residualProbability * selectedRisk.residualImpact * selectedRisk.residualDetectability;
                                  const residualLevel = getRiskLevel(residualRpn);
                                  return (
                                    <Badge className={cn('text-xs', riskLevelColors[residualLevel])} variant="secondary">{residualLevel}</Badge>
                                  );
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {/* Visual RPN reduction indicator */}
                      {(() => {
                        const residualRpn = selectedRisk.residualProbability * selectedRisk.residualImpact * selectedRisk.residualDetectability;
                        const reduction = selectedRisk.rpn - residualRpn;
                        const reductionPct = Math.round((reduction / selectedRisk.rpn) * 100);
                        return (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{selectedRisk.rpn}</span>
                              <ArrowRight className="h-5 w-5 text-primary" />
                              <span className="text-lg font-bold text-green-600">{residualRpn}</span>
                            </div>
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" variant="secondary">
                              {reductionPct > 0 ? `↓ ${reductionPct}% reduction` : reductionPct < 0 ? `↑ ${Math.abs(reductionPct)}% increase` : 'No change'}
                            </Badge>
                          </div>
                        );
                      })()}
                      {/* Residual risk description */}
                      {selectedRisk.residualRisk && (
                        <div className="p-3 bg-muted/30 rounded-md text-sm">
                          <span className="text-muted-foreground">Notes: </span>
                          <span>{selectedRisk.residualRisk}</span>
                        </div>
                      )}
                    </div>
                  ) : selectedRisk.residualRisk ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/30 rounded-md text-sm">
                        <p>{selectedRisk.residualRisk}</p>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md border">
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">Initial RPN</div>
                          <div className="text-lg font-bold">{selectedRisk.rpn}</div>
                          <Badge className={cn('text-[10px]', riskLevelColors[selectedRisk.riskLevel])} variant="secondary">{selectedRisk.riskLevel}</Badge>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">Residual Assessment</div>
                          <div className="text-sm font-medium">{selectedRisk.residualRisk}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No residual risk assessment recorded.</p>
                  )}
                </div>

                {/* Hazard Description */}
                {selectedRisk.hazardDescription && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Hazard Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{selectedRisk.hazardDescription}</p>
                  </div>
                )}

                {/* Risk Owner */}
                {selectedRisk.riskOwner && (
                  <div className="text-sm"><span className="font-medium">Risk Owner:</span> {selectedRisk.riskOwner}</div>
                )}

                {/* Regulatory Reference & Control Type */}
                {(selectedRisk.regulatoryReference || selectedRisk.controlType || selectedRisk.verificationMethod) && (
                  <div className="rounded-md border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Control &amp; Verification
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {selectedRisk.regulatoryReference && (
                        <div><span className="text-muted-foreground">Regulatory Ref:</span> <span className="font-medium font-mono text-xs">{selectedRisk.regulatoryReference}</span></div>
                      )}
                      {selectedRisk.controlType && (
                        <div><span className="text-muted-foreground">Control Type:</span> <span className="font-medium">{selectedRisk.controlType}</span></div>
                      )}
                      {selectedRisk.verificationMethod && (
                        <div><span className="text-muted-foreground">Verification:</span> <span className="font-medium">{selectedRisk.verificationMethod}</span></div>
                      )}
                      {selectedRisk.riskAcceptability && (
                        <div><span className="text-muted-foreground">Acceptability:</span> <span className="font-medium">{selectedRisk.riskAcceptability}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Priority Notes */}
                {selectedRisk.priorityNotes && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Priority Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedRisk.priorityNotes}</p>
                  </div>
                )}

                {/* Linked Records */}
                {(selectedRisk.linkedDocumentId || selectedRisk.linkedCapaId) && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Linked Records</h4>
                    {selectedRisk.linkedDocumentId && (() => {
                      const doc = store.documents.find(d => d.id === selectedRisk.linkedDocumentId);
                      return doc ? (
                        <div className="text-sm flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">{doc.documentNumber}</span>
                          <span className="text-muted-foreground">{doc.title}</span>
                        </div>
                      ) : null;
                    })()}
                    {selectedRisk.linkedCapaId && (() => {
                      const capa = store.capas.find(c => c.id === selectedRisk.linkedCapaId);
                      return capa ? (
                        <div className="text-sm flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">{capa.capaNumber}</span>
                          <span className="text-muted-foreground">{capa.title}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium ml-1">{formatDate(selectedRisk.createdAt)}</span></div>
                  <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium ml-1">{formatDate(selectedRisk.updatedAt)}</span></div>
                </div>

                <Separator />

                {/* Status Advancement Buttons with E-Signature */}
                {hasPermission('risk.update') && getAvailableTransitions(selectedRisk.status).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Status Transition (Electronic Signature Required)
                    </h4>
                    <div className="flex gap-2">
                      {getAvailableTransitions(selectedRisk.status).map(nextStatus => (
                        <Button
                          key={nextStatus}
                          className="flex-1"
                          variant={nextStatus === 'Accepted' ? 'outline' : 'default'}
                          onClick={() => handleStatusAdvanceRequest(selectedRisk, nextStatus)}
                        >
                          {nextStatus === 'Mitigated' && <ShieldCheck className="h-4 w-4 mr-2" />}
                          {nextStatus === 'Accepted' && <CheckCircle2 className="h-4 w-4 mr-2" />}
                          {nextStatus === 'Closed' && <XCircle className="h-4 w-4 mr-2" />}
                          Mark as {nextStatus}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      All status transitions require electronic signature per 21 CFR Part 11
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Electronic Signature Modal ─── */}
      <ElectronicSignatureModal
        open={showEsigModal}
        onClose={() => { setShowEsigModal(false); setEsigRisk(null); setEsigTargetStatus(null); }}
        onSign={handleEsigConfirm}
        recordTitle={esigRisk ? `${esigRisk.riskNumber} — ${esigRisk.title}` : ''}
        recordId={esigRisk?.id || ''}
        signatureType="approval"
      />
    </div>
  );
}
