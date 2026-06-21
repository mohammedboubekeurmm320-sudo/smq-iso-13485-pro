/**
 * RecordLinkService — Generic cross-record linking
 * Replaces hardcoded FKs (linked_capa_id, linked_ncr_id, etc.)
 * ISO 13485 §7.5.9 (traceability), §4.2.4 (record control)
 */

import { BaseService } from './base-service';
import type { RecordLinkLegacy as RecordLink, RecordLinkType } from '@/types/qms';

export interface CreateRecordLinkPayload {
  sourceRecordId: string;
  sourceRecordType: string;
  targetRecordId: string;
  targetRecordType: string;
  linkType: RecordLinkType;
  description?: string;
}

export class RecordLinkService extends BaseService {
  // -----------------------------------------------------------------------
  // List links for a specific record
  // -----------------------------------------------------------------------
  async listForRecord(
    recordId: string,
    recordType: string,
    direction: 'source' | 'target' | 'both' = 'both',
  ): Promise<RecordLink[]> {
    let query = this.supabase.from('record_links').select('*');

    if (this.orgId) query = query.eq('organization_id', this.orgId);

    if (direction === 'source') {
      query = query.eq('source_record_id', recordId).eq('source_record_type', recordType);
    } else if (direction === 'target') {
      query = query.eq('target_record_id', recordId).eq('target_record_type', recordType);
    } else {
      query = query.or(
        `and(source_record_id.eq.${recordId},source_record_type.eq.${recordType}),` +
        `and(target_record_id.eq.${recordId},target_record_type.eq.${recordType})`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<RecordLink>(d));
  }

  // -----------------------------------------------------------------------
  // List all links with optional filters
  // -----------------------------------------------------------------------
  async list(filters?: {
    sourceRecordType?: string;
    targetRecordType?: string;
    linkType?: RecordLinkType;
  }): Promise<RecordLink[]> {
    let query = this.supabase.from('record_links').select('*');

    if (this.orgId) query = query.eq('organization_id', this.orgId);
    if (filters?.sourceRecordType) query = query.eq('source_record_type', filters.sourceRecordType);
    if (filters?.targetRecordType) query = query.eq('target_record_type', filters.targetRecordType);
    if (filters?.linkType) query = query.eq('link_type', filters.linkType);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(d => this.mapToCamel<RecordLink>(d));
  }

  // -----------------------------------------------------------------------
  // Create a link
  // -----------------------------------------------------------------------
  async createRecordLink(payload: CreateRecordLinkPayload, userId?: string): Promise<RecordLink> {
    // Validate: no self-link
    if (payload.sourceRecordId === payload.targetRecordId &&
        payload.sourceRecordType === payload.targetRecordType) {
      throw new Error('Cannot create a self-referencing link.');
    }

    // Validate: no duplicate
    const { data: existing } = await this.supabase
      .from('record_links')
      .select('id')
      .eq('source_record_id', payload.sourceRecordId)
      .eq('source_record_type', payload.sourceRecordType)
      .eq('target_record_id', payload.targetRecordId)
      .eq('target_record_type', payload.targetRecordType)
      .eq('link_type', payload.linkType)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('This link already exists between the two records.');
    }

    const record: Record<string, unknown> = {
      sourceRecordId: payload.sourceRecordId,
      sourceRecordType: payload.sourceRecordType,
      targetRecordId: payload.targetRecordId,
      targetRecordType: payload.targetRecordType,
      linkType: payload.linkType,
      description: payload.description,
    };

    return super.create<RecordLink>('record_links', record, userId);
  }

  // -----------------------------------------------------------------------
  // Delete a link
  // -----------------------------------------------------------------------
  async deleteRecordLink(id: string, userId?: string): Promise<void> {
    const current = await this.supabase.from('record_links').select('*').eq('id', id).single();
    if (current.error) throw new Error(current.error.message);

    const { error } = await this.supabase.from('record_links').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await this.logAudit(
      'DELETE',
      'record_links',
      id,
      this.mapToCamel<RecordLink>(current.data) as unknown as Record<string, unknown>,
      undefined,
      userId,
    );
  }

  // -----------------------------------------------------------------------
  // Get linked record IDs (useful for traversal)
  // -----------------------------------------------------------------------
  async getLinkedRecordIds(
    recordId: string,
    recordType: string,
    linkType?: RecordLinkType,
  ): Promise<{ id: string; type: string; linkType: string; direction: 'outgoing' | 'incoming' }[]> {
    const links = await this.listForRecord(recordId, recordType, 'both');

    const results: { id: string; type: string; linkType: string; direction: 'outgoing' | 'incoming' }[] = [];

    for (const link of links) {
      if (linkType && link.linkType !== linkType) continue;

      if (link.sourceRecordId === recordId && link.sourceRecordType === recordType) {
        results.push({
          id: link.targetRecordId,
          type: link.targetRecordType,
          linkType: link.linkType,
          direction: 'outgoing',
        });
      } else {
        results.push({
          id: link.sourceRecordId,
          type: link.sourceRecordType,
          linkType: link.linkType,
          direction: 'incoming',
        });
      }
    }

    return results;
  }
}
