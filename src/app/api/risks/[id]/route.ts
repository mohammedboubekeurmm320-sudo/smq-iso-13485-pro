import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.risks.find(r => r.id === id);
    if (!item) return apiError('Risk not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch risk', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.risks.findIndex(r => r.id === id);
    if (idx === -1) return apiError('Risk not found', 404);
    const body = await request.json();
    const old = store.risks[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Risk;
    store.risks[idx] = updated;
    store.logAudit('UPDATE', 'Risk', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update risk', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.risks.findIndex(r => r.id === id);
    if (idx === -1) return apiError('Risk not found', 404);
    const old = store.risks[idx];
    store.risks[idx] = { ...old, status: 'Closed', updatedAt: new Date().toISOString() } as import('@/types/qms').Risk;
    store.logAudit('DELETE', 'Risk', id, { status: old.status }, { status: 'Closed' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete risk', 500, error instanceof Error ? error.message : undefined);
  }
}
