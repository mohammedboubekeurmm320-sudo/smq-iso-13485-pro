import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';
import { getService } from '../../_lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Try Supabase first
    const svc = await getService('ncr', request);
    if (svc) {
      const item = await svc.getById<import('@/types/qms').NonConformance>('non_conformances', id);
      if (!item) return apiError('NCR not found', 404);
      return apiSuccess(item);
    }

    // Demo mode
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
    const body = await request.json();

    // Try Supabase first
    const svc = await getService('ncr', request);
    if (svc) {
      const updated = await svc.update<import('@/types/qms').NonConformance>('non_conformances', id, body);
      return apiSuccess(updated);
    }

    // Demo mode
    const store = getDemoStore();
    const idx = store.ncrs.findIndex(n => n.id === id);
    if (idx === -1) return apiError('NCR not found', 404);
    const old = store.ncrs[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').NonConformance;
    store.ncrs[idx] = updated;
    store.logAudit('UPDATE', 'NonConformance', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update NCR', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Try Supabase first
    const svc = await getService('ncr', request);
    if (svc) {
      const updated = await svc.softDelete<import('@/types/qms').NonConformance>('non_conformances', id, 'status', 'Closed');
      return apiSuccess(updated);
    }

    // Demo mode
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