import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.batchRecords.find(b => b.id === id);
    if (!item) return apiError('Batch record not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch batch record', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.batchRecords.findIndex(b => b.id === id);
    if (idx === -1) return apiError('Batch record not found', 404);
    const body = await request.json();
    const old = store.batchRecords[idx];
    const updated = { ...old, ...body, id: old.id } as import('@/types/qms').BatchRecord;
    store.batchRecords[idx] = updated;
    store.logAudit('UPDATE', 'BatchRecord', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update batch record', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.batchRecords.findIndex(b => b.id === id);
    if (idx === -1) return apiError('Batch record not found', 404);
    const old = store.batchRecords[idx];
    store.batchRecords[idx] = { ...old, status: 'Rejected', updatedAt: new Date().toISOString() } as import('@/types/qms').BatchRecord;
    store.logAudit('DELETE', 'BatchRecord', id, { status: old.status }, { status: 'Rejected' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete batch record', 500, error instanceof Error ? error.message : undefined);
  }
}
