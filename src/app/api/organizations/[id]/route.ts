import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../../_lib/response';
import { getService } from '../../_lib/supabase';
import { organizationSchema } from '../../_lib/validation';

// ---------------------------------------------------------------------------
// GET /api/organizations/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const svc = await getService('organization');
    if (svc) {
      const result = await svc.getById<import('@/types/qms').Organization>('organizations', id);
      if (!result) {
        return apiError('Organization not found', 404);
      }
      return apiSuccess(result);
    }

    // Demo mode — not critical, return 404
    return apiError('Not available in demo mode', 400);
  } catch (error) {
    return apiError('Failed to fetch organization', 500, error instanceof Error ? error.message : undefined);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/organizations/[id]
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating name, settings, subscription_status
    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.slug !== undefined) allowedFields.slug = body.slug;
    if (body.subscriptionStatus !== undefined) allowedFields.subscriptionStatus = body.subscriptionStatus;
    if (body.settings !== undefined) {
      // settings is passed as a JSON string
      allowedFields.settings = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings);
    }

    const svc = await getService('organization', request);
    if (svc) {
      const result = await svc.update<import('@/types/qms').Organization>('organizations', id, allowedFields);
      return apiSuccess(result);
    }

    return apiError('Not available in demo mode', 400);
  } catch (error) {
    return apiError('Failed to update organization', 500, error instanceof Error ? error.message : undefined);
  }
}