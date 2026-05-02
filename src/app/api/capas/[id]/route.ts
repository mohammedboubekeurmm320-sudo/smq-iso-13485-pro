import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.capas.find(c => c.id === id);
    if (!item) return apiError('CAPA not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch CAPA', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.capas.findIndex(c => c.id === id);
    if (idx === -1) return apiError('CAPA not found', 404);
    const body = await request.json();
    const old = store.capas[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Capa;
    store.capas[idx] = updated;
    store.logAudit('UPDATE', 'Capa', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update CAPA', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.capas.findIndex(c => c.id === id);
    if (idx === -1) return apiError('CAPA not found', 404);
    const old = store.capas[idx];
    store.capas[idx] = { ...old, status: 'Closed', closedDate: new Date().toISOString(), updatedAt: new Date().toISOString() } as import('@/types/qms').Capa;
    store.logAudit('DELETE', 'Capa', id, { status: old.status }, { status: 'Closed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete CAPA', 500, error instanceof Error ? error.message : undefined);
  }
}
