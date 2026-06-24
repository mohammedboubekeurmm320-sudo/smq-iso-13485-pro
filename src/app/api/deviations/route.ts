import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { deviationSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const filters = { status: status || undefined, severity: severity || undefined, search: search || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('deviation', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.deviations];
    if (status) filtered = filtered.filter(d => d.status === status);
    if (severity) filtered = filtered.filter(d => d.severity === severity);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(s) || d.devNumber.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch deviations', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = deviationSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('deviation', request);
    if (svc) {
      const created = await svc.create('deviations', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `dev-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').Deviation;
    store.deviations.push(item);
    store.logAudit('CREATE', 'Deviation', item.id, undefined, { devNumber: item.devNumber, title: item.title, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create deviation', 500, error instanceof Error ? error.message : undefined);
  }
}