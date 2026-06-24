import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';
import { auditSchema } from '../../_lib/validation';
import { getService } from '../../_lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const svc = await getService('audit', request);
    if (svc) {
      const item = await svc.getById<import('@/types/qms').Audit>('audits', id);
      if (!item) return apiError('Audit not found', 404);
      return apiSuccess(item);
    }

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
    const body = await request.json();

    const svc = await getService('audit', request);
    if (svc) {
      const updated = await svc.update<import('@/types/qms').Audit>('audits', id, body);
      return apiSuccess(updated);
    }

    const store = getDemoStore();
    const idx = store.audits.findIndex(a => a.id === id);
    if (idx === -1) return apiError('Audit not found', 404);
    const old = store.audits[idx];
    const updated = { ...old, ...body, id: old.id, updatedAt: new Date().toISOString() } as import('@/types/qms').Audit;
    store.audits[idx] = updated;
    store.logAudit('UPDATE', 'Audit', id, { status: old.status }, body);
    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update audit', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const svc = await getService('audit', request);
    if (svc) {
      const updated = await svc.softDelete<import('@/types/qms').Audit>('audits', id, 'status', 'Completed');
      return apiSuccess(updated);
    }

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