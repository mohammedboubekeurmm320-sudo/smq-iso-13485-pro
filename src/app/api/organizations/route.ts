import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { organizationSchema } from '../_lib/validation';
import { getService } from '../_lib/supabase';

export async function GET() {
  try {
    // Try Supabase first, fall back to demo store
    const svc = await getService('organization');
    if (svc) {
      const result = await svc.list();
      return apiSuccess(result);
    }

    // Demo mode
    const store = getDemoStore();
    return apiSuccess(store.organizations);
  } catch (error) {
    return apiError('Failed to fetch organizations', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = organizationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    // Try Supabase first
    const svc = await getService('organization', request);
    if (svc) {
      // Parse settings string to JSONB if provided
      const record: Record<string, unknown> = {
        name: parsed.data.name,
        slug: parsed.data.slug,
        subscriptionStatus: parsed.data.subscriptionStatus || 'trial',
      };
      if (parsed.data.settings) {
        try {
          record.settings = JSON.parse(parsed.data.settings);
        } catch {
          record.settings = parsed.data.settings;
        }
      }
      const created = await svc.create('organizations', record);
      return apiSuccess(created, 201);
    }

    // Demo mode
    const store = getDemoStore();
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