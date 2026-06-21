/**
 * API Route: /api/record-links
 * Generic cross-record linking — ISO 13485 §7.5.9 (traceability)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDemoStore } from '@/lib/demo-store-server';
import type { RecordLinkLegacy } from '@/types/qms';

const createLinkSchema = z.object({
  sourceRecordId: z.string().uuid(),
  sourceRecordType: z.string().min(1),
  targetRecordId: z.string().uuid(),
  targetRecordType: z.string().min(1),
  linkType: z.enum([
    'related', 'caused_by', 'corrected_by', 'linked_to',
    'derived_from', 'supersedes', 'references', 'depends_on',
  ]),
  description: z.string().max(500).optional(),
});

// GET /api/record-links
export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const recordType = searchParams.get('recordType');
    const linkType = searchParams.get('linkType');

    let links = store.getRecordLinks();

    if (recordId && recordType) {
      links = links.filter(
        (l: RecordLinkLegacy) =>
          (l.sourceRecordId === recordId && l.sourceRecordType === recordType) ||
          (l.targetRecordId === recordId && l.targetRecordType === recordType)
      );
    }
    if (linkType) {
      links = links.filter((l: RecordLinkLegacy) => l.linkType === linkType);
    }

    return NextResponse.json({ data: links, total: links.length });
  } catch (error) {
    console.error('GET /api/record-links error:', error);
    return NextResponse.json({ error: 'Failed to fetch record links' }, { status: 500 });
  }
}

// POST /api/record-links
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createLinkSchema.parse(body);

    // No self-links
    if (validated.sourceRecordId === validated.targetRecordId &&
        validated.sourceRecordType === validated.targetRecordType) {
      return NextResponse.json(
        { error: 'Cannot create a self-referencing link.' },
        { status: 400 }
      );
    }

    const store = getDemoStore();

    // Check for duplicates
    const existing = store.getRecordLinks().find(
      (l: RecordLinkLegacy) =>
        l.sourceRecordId === validated.sourceRecordId &&
        l.sourceRecordType === validated.sourceRecordType &&
        l.targetRecordId === validated.targetRecordId &&
        l.targetRecordType === validated.targetRecordType &&
        l.linkType === validated.linkType
    );
    if (existing) {
      return NextResponse.json({ error: 'This link already exists.' }, { status: 409 });
    }

    const newLink = store.addRecordLink(validated);

    // Audit trail
    store.addAuditTrail({
      auditAction: 'CREATE',
      tableName: 'record_links',
      recordId: newLink.id,
      newValues: validated,
    });

    return NextResponse.json({ data: newLink }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/record-links error:', error);
    return NextResponse.json({ error: 'Failed to create record link' }, { status: 500 });
  }
}

// DELETE /api/record-links?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const store = getDemoStore();
    const link = store.getRecordLinks().find((l: RecordLinkLegacy) => l.id === id);
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    store.deleteRecordLink(id);

    // Audit trail — cast through unknown because addAuditTrail's oldValues
    // expects Record<string, unknown> but RecordLinkLegacy has no index sig.
    store.addAuditTrail({
      auditAction: 'DELETE',
      tableName: 'record_links',
      recordId: id,
      oldValues: link as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/record-links error:', error);
    return NextResponse.json({ error: 'Failed to delete record link' }, { status: 500 });
  }
}
