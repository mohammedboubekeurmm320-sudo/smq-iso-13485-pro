import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.ncrs.find(n => n.id === id);
    if (!item) return apiError('NCR not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch NCR', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.ncrs.findIndex(n => n.id === id);
    if (idx === -1) return apiError('NCR not found', 404);
    const body = await request.json();
    const old = store.ncrs[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').NonConformance;
    store.ncrs[idx] = updated;
    store.logAudit('UPDATE', 'NonConformance', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update NCR', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.ncrs.findIndex(n => n.id === id);
    if (idx === -1) return apiError('NCR not found', 404);
    const old = store.ncrs[idx];
    store.ncrs[idx] = { ...old, status: 'Closed', updatedAt: new Date().toISOString() } as import('@/types/qms').NonConformance;
    store.logAudit('DELETE', 'NonConformance', id, { status: old.status }, { status: 'Closed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete NCR', 500, error instanceof Error ? error.message : undefined);
  }
}
