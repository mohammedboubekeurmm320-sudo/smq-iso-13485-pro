import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.training.find(t => t.id === id);
    if (!item) return apiError('Training not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch training', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.training.findIndex(t => t.id === id);
    if (idx === -1) return apiError('Training not found', 404);
    const body = await request.json();
    const old = store.training[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Training;
    store.training[idx] = updated;
    store.logAudit('UPDATE', 'Training', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update training', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.training.findIndex(t => t.id === id);
    if (idx === -1) return apiError('Training not found', 404);
    const old = store.training[idx];
    store.training[idx] = { ...old, status: 'Completed', updatedAt: new Date().toISOString() } as import('@/types/qms').Training;
    store.logAudit('DELETE', 'Training', id, { status: old.status }, { status: 'Completed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete training', 500, error instanceof Error ? error.message : undefined);
  }
}
