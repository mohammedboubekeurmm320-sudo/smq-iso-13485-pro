'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeftRight, GitCompare, Clock, User, FileText } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface VersionInfo {
  id: string;
  version: string;
  title: string;
  changeSummary?: string;
  changedByName?: string;
  status?: string;
  createdAt: string;
  description?: string;
  content?: string;
}

interface VersionDiffViewerProps {
  documentId: string;
  documentNumber?: string;
  onClose?: () => void;
}

// ─── Simple Word-Level Diff Algorithm ──────────────────────────────────────

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

function tokenize(text: string): string[] {
  // Split into words while preserving whitespace
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);
  const segments: DiffSegment[] = [];

  // Simple LCS-based diff
  const m = oldWords.length;
  const n = newWords.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = m, j = n;
  const ops: { type: 'unchanged' | 'added' | 'removed'; word: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      ops.push({ type: 'unchanged', word: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', word: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      ops.push({ type: 'removed', word: oldWords[i - 1] });
      i--;
    }
  }

  ops.reverse();

  // Merge consecutive same-type ops into segments
  let currentType: string | null = null;
  let currentText = '';

  for (const op of ops) {
    if (op.type !== currentType) {
      if (currentType !== null && currentText) {
        segments.push({ type: currentType as DiffSegment['type'], text: currentText });
      }
      currentType = op.type;
      currentText = op.word;
    } else {
      currentText += op.word;
    }
  }
  if (currentType !== null && currentText) {
    segments.push({ type: currentType as DiffSegment['type'], text: currentText });
  }

  return segments;
}

// ─── Diff Display Component ────────────────────────────────────────────────

function DiffDisplay({ oldText, newText, label }: { oldText: string; newText: string; label: string }) {
  const segments = useMemo(() => computeWordDiff(oldText || '', newText || ''), [oldText, newText]);
  const hasChanges = segments.some(s => s.type !== 'unchanged');

  if (!oldText && !newText) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="p-3 rounded-md bg-muted/30 text-sm leading-relaxed">
        {hasChanges ? (
          segments.map((seg, idx) => (
            <span
              key={idx}
              className={cn(
                seg.type === 'removed' && 'bg-red-100 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400',
                seg.type === 'added' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              )}
            >
              {seg.text}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{newText || '(vide)'}</span>
        )}
      </div>
    </div>
  );
}

// ─── Field Comparison ──────────────────────────────────────────────────────

function FieldComparison({
  label,
  oldValue,
  newValue,
  icon: Icon,
}: {
  label: string;
  oldValue?: string | null;
  newValue?: string | null;
  icon?: React.ElementType;
}) {
  const isDifferent = (oldValue || '') !== (newValue || '');
  const DisplayIcon = Icon || FileText;

  return (
    <div className={cn('p-3 rounded-md border', isDifferent ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10' : 'border-transparent')}>
      <div className="flex items-center gap-2 mb-1">
        <DisplayIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {isDifferent && (
          <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-600">Modifié</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Avant</p>
          <p className={cn('text-sm', isDifferent && 'bg-red-50 line-through text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded px-1')}>
            {oldValue || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Après</p>
          <p className={cn('text-sm', isDifferent && 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded px-1')}>
            {newValue || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function VersionDiffViewer({ documentId, documentNumber }: VersionDiffViewerProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [leftVersion, setLeftVersion] = useState<VersionInfo | null>(null);
  const [rightVersion, setRightVersion] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch version list
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${documentId}/versions`);
        const json = await res.json();
        if (json.success) {
          const data = json.data as VersionInfo[];
          setVersions(data);
          // Default: compare latest vs previous
          if (data.length >= 2) {
            setLeftVersionId(data[1].id); // previous
            setRightVersionId(data[0].id); // latest (newest first)
          } else if (data.length === 1) {
            setRightVersionId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch versions:', err);
      } finally {
        setLoading(false);
      }
    };
    if (documentId) fetchVersions();
  }, [documentId]);

  // Fetch version details when selection changes
  useEffect(() => {
    const fetchVersionDetail = async (versionId: string, setter: (v: VersionInfo) => void) => {
      try {
        const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`);
        const json = await res.json();
        if (json.success) setter(json.data);
      } catch (err) {
        console.error('Failed to fetch version detail:', err);
      }
    };

    if (leftVersionId) fetchVersionDetail(leftVersionId, setLeftVersion);
    else setLeftVersion(null);

    if (rightVersionId) fetchVersionDetail(rightVersionId, setRightVersion);
    else setRightVersion(null);
  }, [documentId, leftVersionId, rightVersionId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Chargement des versions...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun historique de version disponible</p>
          <p className="text-xs mt-1">Les versions sont créées lorsque le document est modifié ou son statut avance.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-5 w-5 text-primary" />
          Comparaison de versions
          {documentNumber && <span className="text-sm text-muted-foreground font-normal">({documentNumber})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Version A (ancienne)</label>
            <Select value={leftVersionId} onValueChange={setLeftVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === rightVersionId}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">v{v.version}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {v.changedByName || '—'} · {formatDate(v.createdAt)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Version B (nouvelle)</label>
            <Select value={rightVersionId} onValueChange={setRightVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === leftVersionId}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">v{v.version}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {v.changedByName || '—'} · {formatDate(v.createdAt)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded" />
            <span>Supprimé</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded" />
            <span>Ajouté</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-amber-100 dark:bg-amber-900/20 rounded border border-amber-200" />
            <span>Modifié</span>
          </div>
        </div>

        {/* Comparison Content */}
        {leftVersion && rightVersion ? (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4 pr-4">
              {/* Field Comparisons */}
              <FieldComparison
                label="Version"
                oldValue={leftVersion.version}
                newValue={rightVersion.version}
                icon={FileText}
              />
              <FieldComparison
                label="Titre"
                oldValue={leftVersion.title}
                newValue={rightVersion.title}
              />
              <FieldComparison
                label="Statut"
                oldValue={leftVersion.status}
                newValue={rightVersion.status}
              />
              <FieldComparison
                label="Modifié par"
                oldValue={leftVersion.changedByName}
                newValue={rightVersion.changedByName}
                icon={User}
              />

              {/* Text Diff for Description */}
              <DiffDisplay
                oldText={leftVersion.description || ''}
                newText={rightVersion.description || ''}
                label="Description"
              />

              {/* Text Diff for Content */}
              {(leftVersion.content || rightVersion.content) && (
                <DiffDisplay
                  oldText={leftVersion.content || ''}
                  newText={rightVersion.content || ''}
                  label="Contenu"
                />
              )}

              {/* Change Summaries */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modifications (Version A)</p>
                  <div className="p-3 rounded-md bg-muted/30 text-sm">
                    {leftVersion.changeSummary || 'Aucun résumé de modification'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modifications (Version B)</p>
                  <div className="p-3 rounded-md bg-muted/30 text-sm">
                    {rightVersion.changeSummary || 'Aucun résumé de modification'}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Version A: {formatDateTime(leftVersion.createdAt)}
                </div>
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Version B: {formatDateTime(rightVersion.createdAt)}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : rightVersion && !leftVersion ? (
          /* Show only right version details */
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-4">
              <div className="bg-muted/30 rounded-md p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-2">Détails de la version v{rightVersion.version}</p>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Titre:</span> {rightVersion.title}</p>
                  <p><span className="text-muted-foreground">Statut:</span> {rightVersion.status}</p>
                  <p><span className="text-muted-foreground">Modifié par:</span> {rightVersion.changedByName || '—'}</p>
                  {rightVersion.description && <p><span className="text-muted-foreground">Description:</span> {rightVersion.description}</p>}
                  {rightVersion.changeSummary && <p><span className="text-muted-foreground">Modifications:</span> {rightVersion.changeSummary}</p>}
                  <p className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatDateTime(rightVersion.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sélectionnez deux versions pour comparer
          </div>
        )}
      </CardContent>
    </Card>
  );
}
