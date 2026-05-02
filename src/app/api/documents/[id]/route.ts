import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const doc = store.documents.find(d => d.id === id);
    if (!doc) return apiError('Document not found', 404);
    return apiSuccess(doc);
  } catch (error) {
    return apiError('Failed to fetch document', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.documents.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Document not found', 404);

    const body = await request.json();
    const old = store.documents[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Document;
    store.documents[idx] = updated;
    store.logAudit('UPDATE', 'Document', id, { status: old.status }, body);

    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update document', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.documents.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Document not found', 404);

    // Soft delete — change status to Obsolete
    const old = store.documents[idx];
    store.documents[idx] = { ...old, status: 'Obsolete', updatedAt: new Date().toISOString() } as import('@/types/qms').Document;
    store.logAudit('DELETE', 'Document', id, { status: old.status }, { status: 'Obsolete' });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete document', 500, error instanceof Error ? error.message : undefined);
  }
}
