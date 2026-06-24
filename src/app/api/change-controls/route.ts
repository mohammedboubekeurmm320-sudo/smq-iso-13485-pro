import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { changeControlSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const filters = { status: status || undefined, priority: priority || undefined, search: search || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('changeControl', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.changeControls];
    if (status) filtered = filtered.filter(c => c.status === status);
    if (priority) filtered = filtered.filter(c => c.priority === priority);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(s) || c.ccNumber.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch change controls', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = changeControlSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('changeControl', request);
    if (svc) {
      const created = await svc.create('change_controls', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `cc-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').ChangeControl;
    store.changeControls.push(item);
    store.logAudit('CREATE', 'ChangeControl', item.id, undefined, { ccNumber: item.ccNumber, title: item.title, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create change control', 500, error instanceof Error ? error.message : undefined);
  }
}