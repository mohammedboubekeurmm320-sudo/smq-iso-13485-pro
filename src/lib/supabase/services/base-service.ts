// Base service for Supabase entity operations
// Provides common CRUD patterns with org-scoping and audit trail

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../server';

export abstract class BaseService {
  protected supabase: SupabaseClient;
  protected orgId: string | undefined;

  constructor(orgId?: string) {
    // createClient is async but we store a promise
    // Services should call init() before use
    this.supabase = null as unknown as SupabaseClient;
    this.orgId = orgId;
  }

  async init(): Promise<void> {
    const client = await createClient();
    if (!client) {
      throw new Error('Supabase is not configured. Cannot initialize service.');
    }
    this.supabase = client;
  }

  // -----------------------------------------------------------------------
  // CamelCase ↔ snake_case helpers
  // -----------------------------------------------------------------------
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected mapToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.toSnakeCase(key)] = value;
    }
    return result;
  }

  protected mapToCamel<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.toCamelCase(key)] = value;
    }
    return result as T;
  }

  // -----------------------------------------------------------------------
  // Audit trail logging
  // -----------------------------------------------------------------------
  protected async logAudit(
    action: string,
    tableName: string,
    recordId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: string,
  ) {
    const { error } = await this.supabase.from('audit_trails').insert({
      audit_action: action,
      table_name: tableName,
      record_id: recordId,
      user_id: userId || null,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      organization_id: this.orgId || null,
    });
    if (error) console.error('Audit trail insert failed:', error.message);
  }

  // -----------------------------------------------------------------------
  // Common queries
  // -----------------------------------------------------------------------
  public async getAll<T>(tableName: string, page = 1, pageSize = 20): Promise<{ data: T[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.from(tableName).select('*', { count: 'exact' });
    if (this.orgId) query = query.eq('organization_id', this.orgId);

    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return {
      data: (data || []).map(d => this.mapToCamel<T>(d)),
      total: count || 0,
    };
  }

  public async getById<T>(tableName: string, id: string): Promise<T | null> {
    let query = this.supabase.from(tableName).select('*').eq('id', id);
    if (this.orgId) query = query.eq('organization_id', this.orgId);

    const { data, error } = await query.single();
    if (error) return null;
    return this.mapToCamel<T>(data);
  }

  public async create<T>(tableName: string, record: Record<string, unknown>, userId?: string): Promise<T> {
    const snakeRecord = this.mapToSnake({ ...record, organizationId: this.orgId });
    const { data, error } = await this.supabase.from(tableName).insert(snakeRecord).select().single();
    if (error) throw new Error(error.message);

    const result = this.mapToCamel<T>(data);
    await this.logAudit('CREATE', tableName, (result as Record<string, unknown>).id as string, undefined, record, userId);
    return result;
  }

  public async update<T>(tableName: string, id: string, updates: Record<string, unknown>, userId?: string): Promise<T> {
    // Get old values for audit
    const old = await this.getById<T>(tableName, id);
    const snakeUpdates = this.mapToSnake(updates);

    let query = this.supabase.from(tableName).update(snakeUpdates).eq('id', id);
    if (this.orgId) query = query.eq('organization_id', this.orgId);

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);

    const result = this.mapToCamel<T>(data);
    await this.logAudit('UPDATE', tableName, id, old as Record<string, unknown>, updates, userId);
    return result;
  }

  public async softDelete<T>(tableName: string, id: string, statusField = 'status', statusValue = 'Obsolete', userId?: string): Promise<T> {
    return this.update<T>(tableName, id, { [statusField]: statusValue }, userId);
  }
}
