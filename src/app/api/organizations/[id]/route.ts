import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiSuccess, apiError } from '../../_lib/response';
import { isLiveMode } from '../../_lib/supabase';
import { createAdminClient } from '@/lib/supabase/admin';

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

// GET /api/organizations/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isLiveMode()) {
      const supabase = await createRequestClient(request);
      if (supabase) {
        const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();
        if (error || !data) return apiError('Organization not found', 404);
        return apiSuccess({
          id: data.id, name: data.name, slug: data.slug,
          subscriptionStatus: data.subscription_status,
          settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings),
          createdAt: data.created_at, updatedAt: data.updated_at,
        });
      }
    }
    return apiError('Not available in demo mode', 400);
  } catch (error) {
    return apiError('Failed to fetch organization', 500, error instanceof Error ? error.message : undefined);
  }
}

// PUT /api/organizations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (isLiveMode()) {
      const supabase = await createRequestClient(request);
      if (supabase) {
        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.slug !== undefined) updates.slug = body.slug;
        if (body.subscriptionStatus !== undefined) updates.subscription_status = body.subscriptionStatus;
        if (body.settings !== undefined) {
          updates.settings = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings);
        }
        const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select().single();
        if (error) return apiError('Failed to update organization', 500);
        return apiSuccess({
          id: data.id, name: data.name, slug: data.slug,
          subscriptionStatus: data.subscription_status,
          settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings),
          createdAt: data.created_at, updatedAt: data.updated_at,
        });
      }
    }
    return apiError('Not available in demo mode', 400);
  } catch (error) {
    return apiError('Failed to update organization', 500, error instanceof Error ? error.message : undefined);
  }
}