'use client';

import React, { useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { Document, DocumentLevel } from '@/types/qms';
import {
  GitBranch, AlertTriangle, ChevronDown, ChevronRight, FileText, FolderOpen, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const levelColors: Record<number, string> = {
  1: 'bg-violet-500 text-white',
  2: 'bg-sky-500 text-white',
  3: 'bg-teal-500 text-white',
  4: 'bg-amber-500 text-white',
};

const levelLabels: Record<number, string> = {
  1: 'N1 - Policy',
  2: 'N2 - SOP',
  3: 'N3 - WI',
  4: 'N4 - Record',
};

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Obsolete': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface TreeNodeProps {
  doc: Document;
  childDocs: Document[];
  allDocs: Document[];
  depth: number;
}

function TreeNode({ doc, childDocs, allDocs, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = childDocs.length > 0;

  return (
    <div className="ml-0">
      <div className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded-md px-2 cursor-pointer" onClick={() => hasChildren && setExpanded(!expanded)}>
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <Badge className={cn('text-xs', levelColors[doc.documentLevel || 1])} variant="secondary">
          N{doc.documentLevel || 1}
        </Badge>
        <span className="font-mono text-xs text-muted-foreground">{doc.documentNumber}</span>
        <span className="text-sm font-medium truncate">{doc.title}</span>
        <Badge className={cn('text-xs ml-auto', statusColors[doc.status])} variant="secondary">{doc.status}</Badge>
      </div>
      {expanded && hasChildren && (
        <div className="ml-6 border-l border-muted pl-2">
          {childDocs.map(child => {
            const grandChildren = allDocs.filter(d => d.parentDocumentId === child.id);
            return <TreeNode key={child.id} doc={child} childDocs={grandChildren} allDocs={allDocs} depth={depth + 1} />;
          })}
        </div>
      )}
    </div>
  );
}

export function DocumentHierarchyView() {
  const store = useQMSStore();
  const documents = store.documents;

  // Group documents by level
  const docsByLevel = (level: number) => documents.filter(d => d.documentLevel === level);

  // Root documents (no parent)
  const rootDocs = documents.filter(d => !d.parentDocumentId);

  // Obsolete or non-Approved docs with linked active records
  const problemDocs = documents.filter(d =>
    (d.status === 'Obsolete' || d.status === 'Draft') &&
    documents.some(child => child.parentDocumentId === d.id && child.status === 'Approved')
  );

  // Also find documents that are Obsolete and still have active children
  const alertDocs = documents.filter(d => {
    if (d.status === 'Obsolete') return true;
    if (d.status === 'Draft' && documents.some(c => c.parentDocumentId === d.id && c.status === 'Approved')) return true;
    return false;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />Document Hierarchy
        </h1>
        <p className="text-muted-foreground mt-1">Visualize and manage the document hierarchy and relationships</p>
      </div>

      <Tabs defaultValue="constellation">
        <TabsList>
          <TabsTrigger value="constellation">Constellation</TabsTrigger>
          <TabsTrigger value="arborescence">Arborescence</TabsTrigger>
          <TabsTrigger value="alertes">Alertes</TabsTrigger>
        </TabsList>

        {/* Constellation Tab - Visual Nodes */}
        <TabsContent value="constellation">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([1, 2, 3, 4] as const).map(level => {
              const docs = docsByLevel(level);
              return (
                <Card key={level}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', levelColors[level])}>
                        N{level}
                      </div>
                      {levelLabels[level]}
                      <Badge variant="outline" className="ml-auto">{docs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/60 cursor-pointer">
                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground">{doc.documentNumber}</span>
                        <span className="text-xs truncate flex-1">{doc.title}</span>
                        <Badge className={cn('text-[10px]', statusColors[doc.status])} variant="secondary">{doc.status}</Badge>
                      </div>
                    ))}
                    {docs.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No documents at this level</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Connecting lines visualization */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hierarchy Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {([1, 2, 3, 4] as const).map((level, i) => (
                  <React.Fragment key={level}>
                    <div className={cn('px-4 py-3 rounded-lg text-center', levelColors[level])}>
                      <div className="font-bold">N{level}</div>
                      <div className="text-xs opacity-90">{levelLabels[level].split(' - ')[1]}</div>
                      <div className="text-xs mt-1">{docsByLevel(level).length} docs</div>
                    </div>
                    {i < 3 && (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-0.5 bg-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground">governs</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arborescence Tab - Expandable Tree */}
        <TabsContent value="arborescence">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />Document Tree
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {rootDocs.map(doc => {
                const childDocs = documents.filter(d => d.parentDocumentId === doc.id);
                return <TreeNode key={doc.id} doc={doc} childDocs={childDocs} allDocs={documents} depth={0} />;
              })}
              {rootDocs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No root documents found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertes Tab */}
        <TabsContent value="alertes">
          <div className="space-y-3">
            {alertDocs.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">All Clear</h3>
                    <p className="text-muted-foreground">No document hierarchy alerts at this time</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              alertDocs.map(doc => {
                const activeChildren = documents.filter(d => d.parentDocumentId === doc.id && d.status === 'Approved');
                return (
                  <Card key={doc.id} className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{doc.documentNumber}</span>
                            <Badge className={cn('text-xs', statusColors[doc.status])} variant="secondary">{doc.status}</Badge>
                          </div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.status === 'Obsolete' && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              This document is Obsolete but has {activeChildren.length} active child document(s)
                            </p>
                          )}
                          {doc.status === 'Draft' && activeChildren.length > 0 && (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              This document is in Draft but has {activeChildren.length} Approved child document(s)
                            </p>
                          )}
                          {activeChildren.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {activeChildren.map(child => (
                                <Badge key={child.id} variant="outline" className="text-xs">
                                  {child.documentNumber} - {child.title}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
