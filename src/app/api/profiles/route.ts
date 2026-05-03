import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { profileSchema } from '../_lib/validation';

export async function GET() {
  try {
    const store = getDemoStore();
    return apiSuccess(store.profiles);
  } catch (error) {
    return apiError('Failed to fetch profiles', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const now = new Date().toISOString();
    const item = {
      ...parsed.data,
      id: `user-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    } as import('@/types/qms').Profile;
    store.profiles.push(item);
    store.logAudit('CREATE', 'Profile', item.id, undefined, { email: item.email, fullName: item.fullName, role: item.role });
    return apiSuccess(item, 201);
  } catch (error) {
    return apiError('Failed to create profile', 500, error instanceof Error ? error.message : undefined);
  }
}
