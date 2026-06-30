import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { profileSchema } from '../_lib/validation';
import { isLiveMode } from '../_lib/supabase';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Supabase mode: fetch from profiles table
    if (isLiveMode()) {
      const supabase = await createClient();
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      // Convert snake_case to camelCase
      const profiles = (data || []).map((d: Record<string, unknown>) => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(d)) {
          const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          result[camelKey] = value;
        }
        return result;
      });
      return apiSuccess(profiles);
    }

    // Demo mode
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

    // NOTE: In production (Supabase mode), profiles are created via
    // auth.users INSERT + database trigger (FK: profiles.id → auth.users.id).
    // Direct profile creation is only available in demo mode.

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