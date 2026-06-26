import { BaseService } from './base-service';
import type { Organization } from '@/types/qms';

export class OrganizationService extends BaseService {
  async list() {
    const { data, error } = await this.supabase.from('organizations').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<Organization>(d));
  }

  // Note: getById / create / update are inherited from BaseService and called
  // with the table name as the first argument (e.g.
  // `orgService.getById<Organization>('organizations', id)`). They are not
  // overridden here to avoid LSP violations from incompatible method signatures.
}
