// Base service for Supabase entity operations
// Provides common CRUD patterns with org-scoping and audit trail

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../server';

export abstract class BaseService {
  protected supabase: SupabaseClient;
  protected orgId: string | undefined;

  constructor(orgId?: string) {
    this.supabase = null as unknown as SupabaseClient;
    this.orgId = orgId;
  }

  async init(): Promise<void> {
    const client = await createClient();
    if (!client) {
      throw new Error('Supabase client unavailable — check env vars or server config');
    }
    this.supabase = client;
  }

  /**
   * Ensure the service is ready to use (client initialized + orgId set).
   * Throws a clear error if init() was skipped or orgId is missing.
   */
  protected requireReady(): void {
    if (!this.supabase) {
      throw new Error('Service not initialized — call init() first');
    }
    if (!this.orgId) {
      throw new Error(
        'orgId is required for this operation. ' +
        'The authenticated user has no organization_id in profiles, ' +
        'and no current_org_id cookie was set. ' +
        'Ensure the user belongs to at least one organization.'
      );
    }
  }

  // -----------------------------------------------------------------------
  // CamelCase ↔ snake_case helpers (recursive for nested objects/arrays)
  // -----------------------------------------------------------------------
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected mapToSnake(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = this.toSnakeCase(key);
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = this.mapToSnake(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map(v =>
          v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
            ? this.mapToSnake(v as Record<string, unknown>)
            : v
        );
      } else {
        result[snakeKey] = value;
      }
    }
    return result;
  }

  protected mapToCamel<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key);
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[camelKey] = this.mapToCamel<Record<string, unknown>>(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map(v =>
          v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
            ? this.mapToCamel<Record<string, unknown>>(v as Record<string, unknown>)
            : v
        );
      } else {
        result[camelKey] = value;
      }
    }
    return result as T;
  }

  // -----------------------------------------------------------------------
  // Audit trail logging (no longer needed — DB trigger log_audit_trail
  // captures everything automatically. Kept for backward compat.)
  // -----------------------------------------------------------------------
  protected async logAudit(
    action: string,
    tableName: string,
    recordId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: string,
  ) {
    // NOTE: Since migration 007, the DB trigger log_audit_trail() handles
    // audit automatically with HMAC hash chain. This method is kept only
    // for backward compatibility — it is now a no-op.
    void action; void tableName; void recordId;
    void oldValues; void newValues; void userId;
  }

  // -----------------------------------------------------------------------
  // Common queries (all org-scoped — fail-fast if orgId missing)
  // -----------------------------------------------------------------------
  public async getAll<T>(tableName: string, page = 1, pageSize = 20): Promise<{ data: T[]; total: number }> {
    this.requireReady();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const query = this.supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('organization_id', this.orgId)
      .range(from, to)
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      data: (data || []).map(d => this.mapToCamel<T>(d)),
      total: count || 0,
    };
  }

  public async getById<T>(tableName: string, id: string): Promise<T | null> {
    this.requireReady();
    const query = this.supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.orgId);

    const { data, error } = await query.single();
    if (error) return null;
    return this.mapToCamel<T>(data);
  }

  public async create<T>(tableName: string, record: Record<string, unknown>, userId?: string): Promise<T> {
    this.requireReady();
    // Inject organization_id from the service (server-side, not client-supplied)
    const snakeRecord = this.mapToSnake({ ...record, organizationId: this.orgId });
    const { data, error } = await this.supabase.from(tableName).insert(snakeRecord).select().single();
    if (error) throw new Error(error.message);

    // DB trigger log_audit_trail will auto-create the audit entry with HMAC hash
    return this.mapToCamel<T>(data);
  }

  public async update<T>(tableName: string, id: string, updates: Record<string, unknown>, userId?: string): Promise<T> {
    this.requireReady();
    const snakeUpdates = this.mapToSnake(updates);

    const query = this.supabase
      .from(tableName)
      .update(snakeUpdates)
      .eq('id', id)
      .eq('organization_id', this.orgId);

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);

    // DB trigger log_audit_trail will auto-create the audit entry with HMAC hash
    return this.mapToCamel<T>(data);
  }

  public async softDelete<T>(
    tableName: string,
    id: string,
    statusValue: string,  // ← now required, no more wrong default 'Obsolete'
    statusField = 'status',
    userId?: string,
  ): Promise<T> {
    return this.update<T>(tableName, id, { [statusField]: statusValue }, userId);
  }
}