import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { riskSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const filters = { status: status || undefined, category: category || undefined, search: search || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('risk', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.risks];
    if (status) filtered = filtered.filter(r => r.status === status);
    if (category) filtered = filtered.filter(r => r.category === category);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(s) || r.riskNumber.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch risks', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = riskSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('risk', request);
    if (svc) {
      const created = await svc.create('risks', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `risk-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').Risk;
    store.risks.push(item);
    store.logAudit('CREATE', 'Risk', item.id, undefined, { riskNumber: item.riskNumber, title: item.title, riskLevel: item.riskLevel });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create risk', 500, error instanceof Error ? error.message : undefined);
  }
}