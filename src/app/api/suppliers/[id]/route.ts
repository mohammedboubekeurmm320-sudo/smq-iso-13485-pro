import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const item = store.suppliers.find(s => s.id === id);
    if (!item) return apiError('Supplier not found', 404);
    return apiSuccess(item);
  } catch (error) {
    return apiError('Failed to fetch supplier', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return apiError('Supplier not found', 404);
    const body = await request.json();
    const old = store.suppliers[idx];
    const updated = { ...old, ...body, id: old.id } as import('@/types/qms').Supplier;
    store.suppliers[idx] = updated;
    store.logAudit('UPDATE', 'Supplier', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update supplier', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return apiError('Supplier not found', 404);
    const old = store.suppliers[idx];
    store.suppliers[idx] = { ...old, status: 'Disqualified' } as import('@/types/qms').Supplier;
    store.logAudit('DELETE', 'Supplier', id, { status: old.status }, { status: 'Disqualified' });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete supplier', 500, error instanceof Error ? error.message : undefined);
  }
}
