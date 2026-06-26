/**
 * API Route: /api/record-types
 * CRUD for record_type_definitions — custom record type management
 * ISO 13485 §4.1 (QMS completeness), §4.2.3 (document control)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDemoStore } from '@/lib/demo-store-server';
import type { RecordTypeDefinitionLegacy } from '@/types/qms';

// Zod schema for creating a custom record type
const createRecordTypeSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Slug must be lowercase alphanumeric with underscores'),
  name: z.string().min(2).max(100),
  nameEn: z.string().max(100).optional(),
  icon: z.string().default('FileText'),
  description: z.string().max(500).optional(),
  statusFlow: z.array(z.object({
    linear: z.array(z.string()),
    branches: z.record(z.string(), z.array(z.string())).optional(),
    eSigRequired: z.array(z.string()).optional(),
    terminal: z.array(z.string()).optional(),
  })).min(1, 'At least one status flow step is required'),
  defaultFields: z.array(z.any()).default([]),
  complianceRefs: z.array(z.object({
    clause: z.string(),
    standard: z.string(),
    description: z.string().optional(),
  })).min(1, 'At least one compliance reference is required (ISO 13485 §8.4)'),
  codePrefix: z.string().max(10).optional(),
  requiresEsig: z.boolean().default(true),
  minApproverCount: z.number().int().min(1).default(1),
  changeReason: z.string().max(500).optional(),
});

// GET /api/record-types
export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const isSystem = searchParams.get('isSystem');

    let types = store.getRecordTypes();

    if (isActive === 'true') types = types.filter((t: RecordTypeDefinitionLegacy) => t.isActive === true);
    if (isActive === 'false') types = types.filter((t: RecordTypeDefinitionLegacy) => t.isActive === false);
    if (isSystem === 'true') types = types.filter((t: RecordTypeDefinitionLegacy) => t.isSystem === true);
    if (isSystem === 'false') types = types.filter((t: RecordTypeDefinitionLegacy) => t.isSystem === false);

    // System types first, then alphabetical
    types.sort((a: RecordTypeDefinitionLegacy, b: RecordTypeDefinitionLegacy) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ data: types, total: types.length });
  } catch (error) {
    console.error('GET /api/record-types error:', error);
    return NextResponse.json({ error: 'Failed to fetch record types' }, { status: 500 });
  }
}

// POST /api/record-types
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRecordTypeSchema.parse(body);

    const store = getDemoStore();

    // Check slug availability
    const existing = store.getRecordTypes().find((t: RecordTypeDefinitionLegacy) => t.slug === validated.slug);
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${validated.slug}" already exists. Choose a different slug.` },
        { status: 409 }
      );
    }

    // Check reserved slugs
    const systemSlugs = ['capa', 'ncr', 'deviation', 'change_control', 'audit', 'risk', 'training', 'supplier', 'batch_record', 'oos_oot', 'general'];
    if (systemSlugs.includes(validated.slug)) {
      return NextResponse.json(
        { error: `Slug "${validated.slug}" is reserved for system record types.` },
        { status: 400 }
      );
    }

    // Validate terminal states exist
    const allTerminal = validated.statusFlow.flatMap(f => f.terminal || []);
    if (allTerminal.length === 0) {
      return NextResponse.json(
        { error: 'Status flow must define at least one terminal state (ISO 13485 §4.2.4).' },
        { status: 400 }
      );
    }

    const newType = store.addRecordType({
      ...validated,
      isSystem: false,
      isActive: true,
    });

    // Audit trail
    store.addAuditTrail({
      auditAction: 'CREATE',
      tableName: 'record_type_definitions',
      recordId: newType.id,
      newValues: validated,
    });

    return NextResponse.json({ data: newType }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/record-types error:', error);
    return NextResponse.json({ error: 'Failed to create record type' }, { status: 500 });
  }
}
