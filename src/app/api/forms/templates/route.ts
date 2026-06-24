import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../../_lib/response';
import { formTemplateSchema } from '../../_lib/validation';
import { getService } from '../../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const isActive = searchParams.get('isActive');
    const filters = { isActive: isActive !== null && isActive !== undefined ? isActive === 'true' : undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('form', request);
    if (svc) {
      const result = await svc.listTemplates(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
    let filtered = [...store.formTemplates];
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(t => t.isActive === filters.isActive);
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

    // Try Supabase first
    const svc = await getService('form', request);
    if (svc) {
      const created = await svc.createTemplate(parsed.data as Partial<import('@/types/qms').FormTemplate>);
      return apiSuccess(created, 201);
    }

    // Demo mode — Hybrid Supervision: Check linked document status
    let templateStatus: import('@/types/qms').FormTemplateStatus = 'Draft';
    if (body.documentId) {
      const linkedDoc = store.documents.find(d => d.id === body.documentId);
      if (linkedDoc && (linkedDoc.status === 'Approved' || linkedDoc.status === 'Effective')) {
        templateStatus = 'Approved';
      }
    }

    const now = new Date().toISOString();
    const item = {
      ...parsed.data,
      id: `ft-${Date.now()}`,
      createdAt: now,
      status: templateStatus,
      isActive: templateStatus === 'Approved',
      approvedAt: templateStatus === 'Approved' ? now : undefined,
    } as import('@/types/qms').FormTemplate;
    store.formTemplates.push(item);
    store.logAudit('CREATE', 'FormTemplate', item.id, undefined, { title: item.title, version: item.version, status: templateStatus });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create form template', 500, error instanceof Error ? error.message : undefined);
  }
}