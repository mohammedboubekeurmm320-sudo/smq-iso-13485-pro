import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../../_lib/response';
import { formInstanceSchema } from '../../_lib/validation';
import { getService } from '../../_lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    const filters = { status: status || undefined, templateId: templateId || undefined };

    // Try Supabase first, fall back to demo store
    const svc = await getService('form', request);
    if (svc) {
      const result = await svc.listInstances(page, pageSize, filters);
      return apiPaginated(result.data, result.total, page, pageSize);
    }

    // Demo mode
    const store = getDemoStore();
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

    // Try Supabase first
    const svc = await getService('form', request);
    if (svc) {
      const created = await svc.createInstance(parsed.data as Partial<import('@/types/qms').FormInstance>);
      return apiSuccess(created, 201);
    }

    // Demo mode — Hybrid Supervision: Validate template status (§4.2.4)
    const template = store.formTemplates.find(t => t.id === body.templateId);
    if (template) {
      const templateStatus = template.status || (template.isActive ? 'Approved' : 'Draft');
      if (templateStatus === 'Obsolete') {
        return apiError('Cannot create instance from obsolete template', 400);
      }

      // Check linked document status
      if (template.documentId) {
        const linkedDoc = store.documents.find(d => d.id === template.documentId);
        if (linkedDoc && (linkedDoc.status === 'Obsolete' || linkedDoc.status === 'Withdrawn')) {
          return apiError('Cannot create instance: linked document is obsolete/withdrawn', 400);
        }
      }
    }

    const now = new Date().toISOString();
    const item = {
      ...parsed.data,
      id: `fi-${Date.now()}`,
      createdAt: now,
      parentDocumentId: template?.documentId || undefined,
    } as import('@/types/qms').FormInstance;
    store.formInstances.push(item);
    store.logAudit('CREATE', 'FormInstance', item.id, undefined, { referenceNumber: item.referenceNumber, status: item.status });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create form instance', 500, error instanceof Error ? error.message : undefined);
  }
}