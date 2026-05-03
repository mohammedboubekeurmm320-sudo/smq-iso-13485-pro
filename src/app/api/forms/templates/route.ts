import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../../_lib/response';
import { formTemplateSchema } from '../../_lib/validation';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const isActive = searchParams.get('isActive');

    let filtered = [...store.formTemplates];
    if (isActive !== null && isActive !== undefined) {
      filtered = filtered.filter(t => t.isActive === (isActive === 'true'));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch form templates', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = formTemplateSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const item = { ...parsed.data, id: `ft-${Date.now()}`, createdAt: now } as import('@/types/qms').FormTemplate;
    store.formTemplates.push(item);
    store.logAudit('CREATE', 'FormTemplate', item.id, undefined, { title: item.title, version: item.version, isActive: item.isActive });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create form template', 500, error instanceof Error ? error.message : undefined);
  }
}
