import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { ncrSchema } from '../_lib/validation';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let filtered = [...store.ncrs];
    if (status) filtered = filtered.filter(n => n.status === status);
    if (type) filtered = filtered.filter(n => n.type === type);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(n => n.title.toLowerCase().includes(s) || n.ncrNumber.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch NCRs', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = ncrSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const ncr = { ...parsed.data, id: `ncr-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').NonConformance;
    store.ncrs.push(ncr);
    store.logAudit('CREATE', 'NonConformance', ncr.id, undefined, { ncrNumber: ncr.ncrNumber, title: ncr.title, status: ncr.status });
    return apiSuccess(ncr, 201);
  } catch (error) {
    return apiError('Failed to create NCR', 500, error instanceof Error ? error.message : undefined);
  }
}
