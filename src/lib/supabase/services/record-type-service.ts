/**
 * RecordTypeService — CRUD for record_type_definitions
 * Manages both system (10 built-in) and custom record types.
 * ISO 13485 §4.1 (QMS completeness), §4.2.3 (document control)
 *
 * Key constraints:
 * - System types (isSystem=true) cannot be deleted or deactivated
 * - Slug must be unique per organization
 * - Custom types require compliance_refs mapping to at least one ISO clause
 */

import { BaseService } from './base-service';
import type {
  RecordTypeDefinitionLegacy as RecordTypeDefinition,
  FormFieldDefinition,
  StatusFlowStep,
  ComplianceRef,
} from '@/types/qms';

/** Payload for creating a custom record type */
export interface CreateRecordTypePayload {
  slug: string;
  name: string;
  nameEn?: string;
  icon?: string;
  description?: string;
  statusFlow: StatusFlowStep[];
  defaultFields?: FormFieldDefinition[];
  complianceRefs: ComplianceRef[];
  codePrefix?: string;
  requiresEsig?: boolean;
  minApproverCount?: number;
  changeReason?: string;
}

/** Payload for updating a record type definition */
export interface UpdateRecordTypePayload {
  name?: string;
  nameEn?: string;
  icon?: string;
  description?: string;
  statusFlow?: StatusFlowStep[];
  defaultFields?: FormFieldDefinition[];
  complianceRefs?: ComplianceRef[];
  codePrefix?: string;
  isActive?: boolean;
  requiresEsig?: boolean;
  minApproverCount?: number;
  changeReason?: string;
}

export class RecordTypeService extends BaseService {
  // -----------------------------------------------------------------------
  // List record types
  // -----------------------------------------------------------------------
  async list(filters?: {
    isActive?: boolean;
    isSystem?: boolean;
    search?: string;
  }): Promise<RecordTypeDefinition[]> {
    let query = this.supabase
      .from('record_type_definitions')
      .select('*')
      .order('is_system', { ascending: false }) // System types first
      .order('name', { ascending: true });

    if (this.orgId) query = query.eq('organization_id', this.orgId);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
    if (filters?.isSystem !== undefined) query = query.eq('is_system', filters.isSystem);
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<RecordTypeDefinition>(d));
  }

  // -----------------------------------------------------------------------
  // Get by ID
  // -----------------------------------------------------------------------
  // Note: getById is inherited from BaseService — call as
  // `service.getById<RecordTypeDefinition>('record_type_definitions', id)`.

  // -----------------------------------------------------------------------
  // Get by slug
  // -----------------------------------------------------------------------
  async getBySlug(slug: string): Promise<RecordTypeDefinition | null> {
    let query = this.supabase
      .from('record_type_definitions')
      .select('*')
      .eq('slug', slug);

    if (this.orgId) query = query.eq('organization_id', this.orgId);

    const { data, error } = await query.single();
    if (error) return null;
    return this.mapToCamel<RecordTypeDefinition>(data);
  }

  // -----------------------------------------------------------------------
  // Create custom record type
  // -----------------------------------------------------------------------
  async createRecordType(payload: CreateRecordTypePayload, userId?: string): Promise<RecordTypeDefinition> {
    // Validate: slug must be URL-safe
    if (!/^[a-z][a-z0-9_]*$/.test(payload.slug)) {
      throw new Error('Slug must be lowercase alphanumeric with underscores, starting with a letter.');
    }

    // Validate: at least one compliance ref (§8.4 data analysis)
    if (!payload.complianceRefs || payload.complianceRefs.length === 0) {
      throw new Error('At least one compliance reference is required per ISO 13485 §8.4.');
    }

    // Validate: status flow must have at least 2 steps and a terminal state
    if (!payload.statusFlow || payload.statusFlow.length === 0) {
      throw new Error('Status flow is required with at least one step definition.');
    }

    const allTerminal = payload.statusFlow.flatMap(f => f.terminal || []);
    if (allTerminal.length === 0) {
      throw new Error('Status flow must define at least one terminal state (ISO 13485 §4.2.4).');
    }

    // Validate: slug must not conflict with system types
    const systemSlugs = ['capa', 'ncr', 'deviation', 'change_control', 'audit', 'risk', 'training', 'supplier', 'batch_record', 'oos_oot', 'general'];
    if (systemSlugs.includes(payload.slug)) {
      throw new Error(`Slug "${payload.slug}" is reserved for system record types. Choose a different slug.`);
    }

    const record: Record<string, unknown> = {
      slug: payload.slug,
      name: payload.name,
      nameEn: payload.nameEn,
      icon: payload.icon || 'FileText',
      description: payload.description,
      statusFlow: payload.statusFlow,
      defaultFields: payload.defaultFields || [],
      complianceRefs: payload.complianceRefs,
      codePrefix: payload.codePrefix,
      isSystem: false,
      isActive: true,
      requiresEsig: payload.requiresEsig ?? true,
      minApproverCount: payload.minApproverCount ?? 1,
      changeReason: payload.changeReason,
    };

    return super.create<RecordTypeDefinition>('record_type_definitions', record, userId);
  }

  // -----------------------------------------------------------------------
  // Update record type (system types have limited updates)
  // -----------------------------------------------------------------------
  async updateRecordType(id: string, payload: UpdateRecordTypePayload, userId?: string): Promise<RecordTypeDefinition> {
    // Get current record to check if system
    const current = await super.getById<RecordTypeDefinition>('record_type_definitions', id);
    if (!current) throw new Error('Record type not found.');

    if (current.isSystem) {
      // System types: only description, defaultFields, and complianceRefs can change
      const allowedKeys: (keyof UpdateRecordTypePayload)[] = ['description', 'defaultFields', 'complianceRefs', 'changeReason'];
      const disallowedUpdates = Object.keys(payload).filter(k => !allowedKeys.includes(k as keyof UpdateRecordTypePayload));
      if (disallowedUpdates.length > 0) {
        throw new Error(`System record types cannot have "${disallowedUpdates.join(', ')}" modified. Only description, defaultFields, and complianceRefs are allowed.`);
      }
    }

    // If deactivating, validate no active instances exist (§4.2.4)
    if (payload.isActive === false && current.isActive === true) {
      const { count } = await this.supabase
        .from('form_instances')
        .select('*', { count: 'exact', head: true })
        .eq('record_type_slug', current.slug)
        .in('status', ['Draft', 'Submitted']);

      if (count && count > 0) {
        throw new Error(`Cannot deactivate: ${count} active form instance(s) exist. Close all instances first per ISO 13485 §4.2.4.`);
      }
    }

    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.nameEn !== undefined) updates.nameEn = payload.nameEn;
    if (payload.icon !== undefined) updates.icon = payload.icon;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.statusFlow !== undefined) updates.statusFlow = payload.statusFlow;
    if (payload.defaultFields !== undefined) updates.defaultFields = payload.defaultFields;
    if (payload.complianceRefs !== undefined) updates.complianceRefs = payload.complianceRefs;
    if (payload.codePrefix !== undefined) updates.codePrefix = payload.codePrefix;
    if (payload.isActive !== undefined) updates.isActive = payload.isActive;
    if (payload.requiresEsig !== undefined) updates.requiresEsig = payload.requiresEsig;
    if (payload.minApproverCount !== undefined) updates.minApproverCount = payload.minApproverCount;
    if (payload.changeReason !== undefined) updates.changeReason = payload.changeReason;

    return super.update<RecordTypeDefinition>('record_type_definitions', id, updates, userId);
  }

  // -----------------------------------------------------------------------
  // Delete (only custom, only if no templates/instances)
  // -----------------------------------------------------------------------
  async deleteRecordType(id: string, userId?: string): Promise<void> {
    const current = await super.getById<RecordTypeDefinition>('record_type_definitions', id);
    if (!current) throw new Error('Record type not found.');

    if (current.isSystem) {
      throw new Error('Cannot delete system record type. System types are protected per ISO 13485 §4.1.');
    }

    // Check for templates
    const { count: templateCount } = await this.supabase
      .from('form_templates')
      .select('*', { count: 'exact', head: true })
      .eq('module_type', current.slug);

    if (templateCount && templateCount > 0) {
      throw new Error(`Cannot delete: ${templateCount} template(s) reference this type. Delete templates first.`);
    }

    // Check for instances
    const { count: instanceCount } = await this.supabase
      .from('form_instances')
      .select('*', { count: 'exact', head: true })
      .eq('record_type_slug', current.slug);

    if (instanceCount && instanceCount > 0) {
      throw new Error(`Cannot delete: ${instanceCount} instance(s) reference this type. Close instances first.`);
    }

    await this.supabase.from('record_type_definitions').delete().eq('id', id);
    await this.logAudit('DELETE', 'record_type_definitions', id, current as unknown as Record<string, unknown>, undefined, userId);
  }

  // -----------------------------------------------------------------------
  // Get all active record types for template creation
  // -----------------------------------------------------------------------
  async getActiveTypes(): Promise<RecordTypeDefinition[]> {
    return this.list({ isActive: true });
  }

  // -----------------------------------------------------------------------
  // Get system record types (the 10 built-in modules)
  // -----------------------------------------------------------------------
  async getSystemTypes(): Promise<RecordTypeDefinition[]> {
    return this.list({ isSystem: true, isActive: true });
  }

  // -----------------------------------------------------------------------
  // Get custom record types only
  // -----------------------------------------------------------------------
  async getCustomTypes(): Promise<RecordTypeDefinition[]> {
    return this.list({ isSystem: false, isActive: true });
  }

  // -----------------------------------------------------------------------
  // Check if slug is available
  // -----------------------------------------------------------------------
  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.getBySlug(slug);
    return existing === null;
  }
}
