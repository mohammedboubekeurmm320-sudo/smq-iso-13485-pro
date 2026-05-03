import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { trainingSchema } from '../_lib/validation';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let filtered = [...store.training];
    if (status) filtered = filtered.filter(t => t.status === status);
    if (type) filtered = filtered.filter(t => t.type === type);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(s));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch training records', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = trainingSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `train-${Date.now()}`, createdAt: now, updatedAt: now } as import('@/types/qms').Training;
    store.training.push(item);
    store.logAudit('CREATE', 'Training', item.id, undefined, { title: item.title, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create training record', 500, error instanceof Error ? error.message : undefined);
  }
}
