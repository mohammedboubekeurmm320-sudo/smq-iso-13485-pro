import { BaseService } from './base-service';
import type { Profile } from '@/types/qms';

export class ProfileService extends BaseService {
  async list() {
    const { data, error } = await this.supabase.from('profiles').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<Profile>(d));
  }

  async getById(id: string) { return super.getById<Profile>('profiles', id); }

  async create(profile: Partial<Profile>, userId?: string) {
    return super.create<Profile>('profiles', profile as Record<string, unknown>, userId);
  }

  async update(id: string, updates: Partial<Profile>, userId?: string) {
    return super.update<Profile>('profiles', id, updates as Record<string, unknown>, userId);
  }
}
