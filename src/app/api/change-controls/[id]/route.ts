import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.changeControls.find(c => c.id === id);
    if (!item) return apiError('Change control not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch change control', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.changeControls.findIndex(c => c.id === id);
    if (idx === -1) return apiError('Change control not found', 404);
    const body = await request.json();
    const old = store.changeControls[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').ChangeControl;
    store.changeControls[idx] = updated;
    store.logAudit('UPDATE', 'ChangeControl', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update change control', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.changeControls.findIndex(c => c.id === id);
    if (idx === -1) return apiError('Change control not found', 404);
    const old = store.changeControls[idx];
    store.changeControls[idx] = { ...old, status: 'Rejected', updatedAt: new Date().toISOString() } as import('@/types/qms').ChangeControl;
    store.logAudit('DELETE', 'ChangeControl', id, { status: old.status }, { status: 'Rejected' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete change control', 500, error instanceof Error ? error.message : undefined);
  }
}
