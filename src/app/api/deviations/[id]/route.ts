import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.deviations.find(d => d.id === id);
    if (!item) return apiError('Deviation not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch deviation', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.deviations.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Deviation not found', 404);
    const body = await request.json();
    const old = store.deviations[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Deviation;
    store.deviations[idx] = updated;
    store.logAudit('UPDATE', 'Deviation', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update deviation', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.deviations.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Deviation not found', 404);
    const old = store.deviations[idx];
    store.deviations[idx] = { ...old, status: 'Closed', closedDate: new Date().toISOString(), updatedAt: new Date().toISOString() } as import('@/types/qms').Deviation;
    store.logAudit('DELETE', 'Deviation', id, { status: old.status }, { status: 'Closed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete deviation', 500, error instanceof Error ? error.message : undefined);
  }
}
