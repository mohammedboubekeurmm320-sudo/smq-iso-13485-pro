// Backward-compatibility alias: /api/organisations → /api/organizations
// Actual handlers using request-based cookie pattern (same as canonical route).

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { organizationSchema } from '../_lib/validation';
import { isLiveMode } from '../_lib/supabase';

async function createRequestClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (isLiveMode()) {
      const supabase = await createRequestClient(request);
      if (supabase) {
        const { data, error } = await supabase.from('organizations').select('*');
        if (!error) {
          const mapped = (data || []).map((d: Record<string, unknown>) => ({
            id: d.id,
            name: d.name,
            slug: d.slug,
            subscriptionStatus: d.subscription_status || 'trial',
            settings: typeof d.settings === 'string' ? d.settings : JSON.stringify(d.settings),
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          return apiSuccess(mapped);
        }
        console.warn('[Orgs Alias GET] DB error:', error.message);
      }
    }
    // Demo mode or Supabase unavailable
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

    if (isLiveMode()) {
      const supabase = await createRequestClient(request);
      if (supabase) {
        const record: Record<string, unknown> = {
          name: parsed.data.name,
          slug: parsed.data.slug,
          subscription_status: parsed.data.subscriptionStatus || 'trial',
        };
        if (parsed.data.settings) {
          try { record.settings = JSON.parse(parsed.data.settings); }
          catch { record.settings = parsed.data.settings; }
        }
        const { data, error } = await supabase.from('organizations').insert(record).select().single();
        if (error) return apiError('Failed to create organization', 500);
        return apiSuccess({
          id: data.id, name: data.name, slug: data.slug,
          subscriptionStatus: data.subscription_status,
          settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings),
          createdAt: data.created_at, updatedAt: data.updated_at,
        }, 201);
      }
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