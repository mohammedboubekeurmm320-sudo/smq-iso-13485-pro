import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';
import type { DocumentStatus } from '@/types/qms';

const VALID_STATUSES: DocumentStatus[] = ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn', 'In Review'];

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const { action, ids, payload } = body as {
      action: 'delete' | 'changeStatus' | 'changeDepartment' | 'export';
      ids: string[];
      payload?: Record<string, unknown>;
    };

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return apiError('action and ids (non-empty array) are required', 400);
    }

    // Verify all IDs exist
    const existingIds = new Set(store.documents.map(d => d.id));
    const validIds = ids.filter((id: string) => existingIds.has(id));
    if (validIds.length === 0) {
      return apiError('No valid document IDs provided', 400);
    }

    let affected = 0;

    switch (action) {
      case 'delete': {
        for (const id of validIds) {
          const idx = store.documents.findIndex(d => d.id === id);
          if (idx !== -1) {
            const old = store.documents[idx];
            store.documents[idx] = { ...old, status: 'Obsolete' as DocumentStatus, updatedAt: new Date().toISOString() };
            affected++;
          }
        }
        store.logAudit('DELETE', 'Document', undefined, { count: validIds.length }, { action: 'bulk_delete', ids: validIds });
        break;
      }

      case 'changeStatus': {
        const newStatus = payload?.status as string;
        if (!newStatus || !VALID_STATUSES.includes(newStatus as DocumentStatus)) {
          return apiError(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`, 400);
        }
        for (const id of validIds) {
          const idx = store.documents.findIndex(d => d.id === id);
          if (idx !== -1) {
            const old = store.documents[idx];
            store.documents[idx] = { ...old, status: newStatus as DocumentStatus, updatedAt: new Date().toISOString() };
            affected++;
          }
        }
        store.logAudit('UPDATE', 'Document', undefined, { action: 'bulk_changeStatus', count: validIds.length }, { status: newStatus, ids: validIds });
        break;
      }

      case 'changeDepartment': {
        const newDepartment = payload?.department as string;
        if (!newDepartment || typeof newDepartment !== 'string') {
          return apiError('department (string) is required in payload', 400);
        }
        for (const id of validIds) {
          const idx = store.documents.findIndex(d => d.id === id);
          if (idx !== -1) {
            const old = store.documents[idx];
            store.documents[idx] = { ...old, department: newDepartment, updatedAt: new Date().toISOString() };
            affected++;
          }
        }
        store.logAudit('UPDATE', 'Document', undefined, { action: 'bulk_changeDepartment', count: validIds.length }, { department: newDepartment, ids: validIds });
        break;
      }

      case 'export': {
        const selectedDocs = store.documents.filter(d => validIds.includes(d.id));
        const csvHeader = 'Document Number,Title,Type,Version,Status,Department,Effective Date,Description';
        const csvRows = selectedDocs.map(d =>
          [
            `"${d.documentNumber}"`,
            `"${(d.title || '').replace(/"/g, '""')}"`,
            `"${d.type}"`,
            `"${d.version}"`,
            `"${d.status}"`,
            `"${d.department || ''}"`,
            `"${d.effectiveDate || ''}"`,
            `"${(d.description || '').replace(/"/g, '""')}"`,
          ].join(',')
        );
        const csv = [csvHeader, ...csvRows].join('\n');
        store.logAudit('EXPORT', 'Document', undefined, undefined, { action: 'bulk_export', count: validIds.length });
        return apiSuccess({ csv, affected: validIds.length });
      }

      default:
        return apiError(`Unknown action: ${action}. Valid actions: delete, changeStatus, changeDepartment, export`, 400);
    }

    return apiSuccess({ affected });
  } catch (error) {
    return apiError('Failed to perform bulk operation', 500, error instanceof Error ? error.message : undefined);
  }
}
