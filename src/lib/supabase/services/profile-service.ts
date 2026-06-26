import { BaseService } from './base-service';
import type { Profile } from '@/types/qms';

export class ProfileService extends BaseService {
  async list() {
    const { data, error } = await this.supabase.from('profiles').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<Profile>(d));
  }

  // Note: getById / create / update are inherited from BaseService (see
  // OrganizationService for the same pattern).
}
