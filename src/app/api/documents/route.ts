import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';
import { documentSchema } from '../_lib/validation';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let filtered = [...store.documents];

    if (status) filtered = filtered.filter(d => d.status === status);
    if (type) filtered = filtered.filter(d => d.type === type);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(s) ||
        d.documentNumber.toLowerCase().includes(s) ||
        (d.description && d.description.toLowerCase().includes(s))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return apiPaginated(data, total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch documents', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = documentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const now = new Date().toISOString();
    const doc = {
      ...parsed.data,
      id: `doc-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    } as import('@/types/qms').Document;

    store.documents.push(doc);
    store.logAudit('CREATE', 'Document', doc.id, undefined, { documentNumber: doc.documentNumber, title: doc.title, status: doc.status });

    return apiSuccess(doc, 201);
  } catch (error) {
    return apiError('Failed to create document', 500, error instanceof Error ? error.message : undefined);
  }
}
