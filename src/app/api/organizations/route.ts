import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { organizationSchema } from '../_lib/validation';

export async function GET() {
  try {
    const store = getDemoStore();
    return apiSuccess(store.organizations);
  } catch (error) {
    return apiError('Failed to fetch organizations', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = organizationSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const item = {
      ...parsed.data,
      id: `org-${Date.now()}`,
      settings: parsed.data.settings || '{}',
      createdAt: now,
      updatedAt: now,
    } as import('@/types/qms').Organization;
    store.organizations.push(item);
    store.logAudit('CREATE', 'Organization', item.id, undefined, { name: item.name, slug: item.slug });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create organization', 500, error instanceof Error ? error.message : undefined);
  }
}
