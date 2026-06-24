import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { supplierSchema } from '../_lib/validation';
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
    const svc = await getService('supplier', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.suppliers];
    if (status) filtered = filtered.filter(s => s.status === status);
    if (category) filtered = filtered.filter(s => s.category === category);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.supplierCode.toLowerCase().includes(q));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch suppliers', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('supplier', request);
    if (svc) {
      const created = await svc.create('suppliers', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `sup-${Date.now()}`, createdAt: now } as import('@/types/qms').Supplier;
    store.suppliers.push(item);
    store.logAudit('CREATE', 'Supplier', item.id, undefined, { supplierCode: item.supplierCode, name: item.name, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create supplier', 500, error instanceof Error ? error.message : undefined);
  }
}