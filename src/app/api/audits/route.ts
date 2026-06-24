import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { auditSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const filters = { status: status || undefined, type: type || undefined, search: search || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('audit', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.audits];
    if (status) filtered = filtered.filter(a => a.status === status);
    if (type) filtered = filtered.filter(a => a.type === type);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a => a.title.toLowerCase().includes(s) || a.auditNumber.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch audits', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = auditSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('audit', request);
    if (svc) {
      const created = await svc.create('audits', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const audit = { ...parsed.data, id: `audit-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').Audit;
    store.audits.push(audit);
    store.logAudit('CREATE', 'Audit', audit.id, undefined, { auditNumber: audit.auditNumber, title: audit.title, status: audit.status });
    return apiSuccess(audit, 201);
  } catch (error) {
    return apiError('Failed to create audit', 500, error instanceof Error ? error.message : undefined);
  }
}