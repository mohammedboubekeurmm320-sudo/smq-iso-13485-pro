'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

export interface ResponsiveTableColumn {
  key: string;
  header: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface ResponsiveTableProps {
  columns: ResponsiveTableColumn[];
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
  mobileTitleKey?: string;
  mobileSubtitleKey?: string;
}

export function ResponsiveTable({
  columns,
  data,
  onRowClick,
  mobileTitleKey,
  mobileSubtitleKey,
}: ResponsiveTableProps) {
  const titleKey = mobileTitleKey || columns[0]?.key;
  const subtitleKey = mobileSubtitleKey || columns[1]?.key;

  // Columns to show as detail fields in mobile cards (exclude title & subtitle)
  const detailColumns = columns.filter(
    (col) => col.key !== titleKey && col.key !== subtitleKey
  );

  // Detect if a column is an "actions" column (key contains "action" or render returns icons)
  const isActionsColumn = (col: ResponsiveTableColumn) => {
    const keyLower = col.key.toLowerCase();
    return keyLower === 'actions' || keyLower === 'action' || keyLower === '_actions';
  };

  const fieldColumns = detailColumns.filter((col) => !isActionsColumn(col));
  const actionsColumn = detailColumns.find((col) => isActionsColumn(col));

  const getCellValue = (row: Record<string, unknown>, col: ResponsiveTableColumn) => {
    const value = row[col.key];
    if (col.render) return col.render(value, row);
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getTitleValue = (row: Record<string, unknown>) => {
    const col = columns.find((c) => c.key === titleKey);
    if (!col) return '—';
    const value = row[col.key];
    if (col.render) return col.render(value, row);
    if (value === null || value === undefined) return '—';
    return String(value);
  };

  const getSubtitleValue = (row: Record<string, unknown>) => {
    if (!subtitleKey) return null;
    const col = columns.find((c) => c.key === subtitleKey);
    if (!col) return null;
    const value = row[col.key];
    if (col.render) return col.render(value, row);
    if (value === null || value === undefined) return null;
    return String(value);
  };

  return (
    <>
      {/* Desktop Table — visible on md+ */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No data available.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards — visible below md */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No data available.
          </div>
        ) : (
          data.map((row, rowIdx) => (
            <Card
              key={rowIdx}
              className={cn(
                'overflow-hidden',
                onRowClick && 'cursor-pointer active:bg-muted/50 transition-colors'
              )}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4 space-y-2">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight truncate">
                      {getTitleValue(row)}
                    </p>
                    {subtitleKey && getSubtitleValue(row) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {getSubtitleValue(row)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Detail fields */}
                {fieldColumns.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {fieldColumns.map((col) => (
                      <div key={col.key} className="min-w-0">
                        <span className="text-muted-foreground block truncate">{col.header}</span>
                        <span className="font-medium block truncate">
                          {getCellValue(row, col)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions row */}
                {actionsColumn && (
                  <div
                    className="flex items-center gap-1 pt-1 border-t"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getCellValue(row, actionsColumn)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
