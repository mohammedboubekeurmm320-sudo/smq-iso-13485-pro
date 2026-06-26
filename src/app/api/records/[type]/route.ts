/**
 * API Route: /api/records/[type]
 * Generic CRUD for custom record type instances (form_instances)
 * ISO 13485 §4.2.4 (record control), §7.5.9 (traceability)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDemoStore } from '@/lib/demo-store-server';
import type { FormInstance, FormTemplate } from '@/types/qms';

const createInstanceSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  values: z.record(z.string(), z.unknown()).default({}),
  parentDocumentId: z.string().optional(),
  linkedRecordId: z.string().optional(),
  linkedRecordType: z.string().optional(),
});

// GET /api/records/[type]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let instances = store.getFormInstances().filter(
      (i: FormInstance) => (i as unknown as Record<string, unknown>).recordTypeSlug === type || i.linkedRecordType === type
    );

    if (status) {
      instances = instances.filter((i: FormInstance) => i.status === status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginated = instances.slice(from, to);

    return NextResponse.json({
      data: paginated,
      total: instances.length,
      page,
      pageSize,
      recordType: type,
    });
  } catch (error) {
    console.error('GET /api/records/[type] error:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

// POST /api/records/[type]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const body = await request.json();
    const validated = createInstanceSchema.parse(body);

    const store = getDemoStore();

    const template = store.getFormTemplates().find(
      (t: FormTemplate) => t.id === validated.templateId
    );
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (template.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Template must be Approved before creating instances (ISO 13485 §4.2.3 Layer 1)' },
        { status: 400 }
      );
    }
    if (template.moduleType !== type) {
      return NextResponse.json(
        { error: `Template moduleType "${template.moduleType}" does not match record type "${type}"` },
        { status: 400 }
      );
    }

    const existingInstances = store.getFormInstances().filter(
      (i: FormInstance) => (i as unknown as Record<string, unknown>).recordTypeSlug === type
    );
    const nextSeq = existingInstances.length + 1;
    const prefix = type.toUpperCase().replace(/_/g, '-').substring(0, 6);
    const year = new Date().getFullYear();
    const referenceNumber = `${prefix}-${year}-${String(nextSeq).padStart(3, '0')}`;

    const newInstance = store.addFormInstance({
      templateId: validated.templateId,
      templateVersion: template.version || '1.0',
      referenceNumber,
      values: validated.values,
      status: 'Draft',
      isLocked: false,
      recordTypeSlug: type,
      parentDocumentId: validated.parentDocumentId || template.documentId,
      linkedRecordId: validated.linkedRecordId,
      linkedRecordType: validated.linkedRecordType || type,
    });

    store.addAuditTrail({
      auditAction: 'CREATE',
      tableName: 'form_instances',
      recordId: newInstance.id,
      newValues: { ...validated, recordTypeSlug: type, referenceNumber },
    });

    return NextResponse.json({ data: newInstance }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/records/[type] error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}
