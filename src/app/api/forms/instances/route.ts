import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../../_lib/response';
import { formInstanceSchema } from '../../_lib/validation';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');

    let filtered = [...store.formInstances];
    if (status) filtered = filtered.filter(f => f.status === status);
    if (templateId) filtered = filtered.filter(f => f.templateId === templateId);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch form instances', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = formInstanceSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `fi-${Date.now()}`, createdAt: now } as import('@/types/qms').FormInstance;
    store.formInstances.push(item);
    store.logAudit('CREATE', 'FormInstance', item.id, undefined, { referenceNumber: item.referenceNumber, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create form instance', 500, error instanceof Error ? error.message : undefined);
  }
}
