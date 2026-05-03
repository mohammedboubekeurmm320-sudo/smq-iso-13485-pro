import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.audits.find(a => a.id === id);
    if (!item) return apiError('Audit not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch audit', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.audits.findIndex(a => a.id === id);
    if (idx === -1) return apiError('Audit not found', 404);
    const body = await request.json();
    const old = store.audits[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Audit;
    store.audits[idx] = updated;
    store.logAudit('UPDATE', 'Audit', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update audit', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.audits.findIndex(a => a.id === id);
    if (idx === -1) return apiError('Audit not found', 404);
    const old = store.audits[idx];
    store.audits[idx] = { ...old, status: 'Completed', updatedAt: new Date().toISOString() } as import('@/types/qms').Audit;
    store.logAudit('DELETE', 'Audit', id, { status: old.status }, { status: 'Completed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete audit', 500, error instanceof Error ? error.message : undefined);
  }
}
