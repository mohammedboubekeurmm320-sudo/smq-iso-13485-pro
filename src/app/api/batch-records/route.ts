import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { batchRecordSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const filters = { status: status || undefined, search: search || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('batchRecord', request);
    if (svc) {
      const result = await svc.list(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.batchRecords];
    if (status) filtered = filtered.filter(b => b.status === status);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(b => b.lotNumber.toLowerCase().includes(s) || b.productName.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch batch records', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = batchRecordSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // Try Supabase first
    const svc = await getService('batchRecord', request);
    if (svc) {
      const created = await svc.create('batch_records', parsed.data);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `batch-${Date.now()}`, createdAt: now } as import('@/types/qms').BatchRecord;
    store.batchRecords.push(item);
    store.logAudit('CREATE', 'BatchRecord', item.id, undefined, { lotNumber: item.lotNumber, productName: item.productName, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create batch record', 500, error instanceof Error ? error.message : undefined);
  }
}