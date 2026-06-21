// Integration tests for QMS API route pipelines
//
// Since Next.js route handlers depend on the server runtime, we test the
// underlying pipeline that the route handlers exercise: validation (Zod
// schemas) → DemoStore mutation → audit trail creation.  We also replicate
// the filtering/pagination logic from the GET handlers to verify the full
// read pipeline, and test the response-formatting helpers (`apiSuccess`,
// `apiError`, `apiPaginated`) end-to-end.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDemoStore, type DemoStore } from '@/app/api/_lib/demo-data';
import {
  documentSchema,
  capaSchema,
  ncrSchema,
  changeControlSchema,
} from '@/app/api/_lib/validation';
import { apiSuccess, apiError, apiPaginated } from '@/app/api/_lib/response';
import type {
  Document,
  Capa,
  NonConformance,
  ChangeControl,
  AuditTrail,
} from '@/types/qms';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique-enough ID for test entities. */
function uid(prefix: string): string {
  return `${prefix}-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('API route integration pipelines', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = getDemoStore();
  });

  // =========================================================================
  // 1. Document creation pipeline
  // =========================================================================
  describe('Document creation pipeline (validation → store insert → audit trail)', () => {
    it('valid document data passes documentSchema.parse()', () => {
      const validData = {
        documentNumber: 'SOP-INT-001',
        title: 'Integration Test SOP',
        type: 'SOP' as const,
      };
      const parsed = documentSchema.parse(validData);
      expect(parsed.documentNumber).toBe('SOP-INT-001');
      expect(parsed.title).toBe('Integration Test SOP');
      expect(parsed.type).toBe('SOP');
      // Defaults applied by schema
      expect(parsed.version).toBe('1.0');
      expect(parsed.status).toBe('Draft');
    });

    it('document is added to DemoStore.documents', () => {
      const validData = {
        documentNumber: 'SOP-INT-002',
        title: 'Store Insert Test',
        type: 'WI' as const,
      };
      const parsed = documentSchema.parse(validData);
      const now = new Date().toISOString();
      const doc: Document = {
        ...parsed,
      // Zod infers wider types than Document's DocumentLevel / DocumentStatus
      documentLevel: parsed.documentLevel as Document['documentLevel'],
      status: parsed.status as Document['status'],
        id: uid('doc'),
        createdAt: now,
        updatedAt: now,
      };

      const before = store.documents.length;
      store.documents.push(doc);
      store.logAudit('CREATE', 'Document', doc.id, undefined, {
        documentNumber: doc.documentNumber,
        title: doc.title,
        status: doc.status,
      });

      expect(store.documents.length).toBe(before + 1);
      const inserted = store.documents.find(d => d.id === doc.id);
      expect(inserted).toBeDefined();
      expect(inserted!.documentNumber).toBe('SOP-INT-002');
      expect(inserted!.title).toBe('Store Insert Test');
      expect(inserted!.type).toBe('WI');
    });

    it('audit trail entry is created for document creation', () => {
      const validData = {
        documentNumber: 'SOP-INT-003',
        title: 'Audit Trail Test Doc',
        type: 'Policy' as const,
      };
      const parsed = documentSchema.parse(validData);
      const now = new Date().toISOString();
      const doc: Document = {
        ...parsed,
      // Zod infers wider types than Document's DocumentLevel / DocumentStatus
      documentLevel: parsed.documentLevel as Document['documentLevel'],
      status: parsed.status as Document['status'],
        id: uid('doc'),
        createdAt: now,
        updatedAt: now,
      };

      const trailBefore = store.auditTrails.length;
      store.documents.push(doc);
      store.logAudit('CREATE', 'Document', doc.id, undefined, {
        documentNumber: doc.documentNumber,
        title: doc.title,
        status: doc.status,
      });

      expect(store.auditTrails.length).toBe(trailBefore + 1);
      const entry = store.auditTrails[0]; // prepended
      expect(entry.action).toBe('CREATE');
      expect(entry.tableName).toBe('Document');
      expect(entry.recordId).toBe(doc.id);
      expect(entry.newValues).toBeDefined();
      expect((entry.newValues as Record<string, unknown>)!.documentNumber).toBe('SOP-INT-003');
    });

    it('invalid document data fails documentSchema.safeParse()', () => {
      // Missing required fields: documentNumber, title
      const invalidData = { type: 'SOP' as const };
      const result = documentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields.documentNumber).toBeDefined();
        expect(fields.title).toBeDefined();
      }
    });

    it('invalid enum value fails documentSchema.safeParse()', () => {
      const invalidData = {
        documentNumber: 'SOP-BAD',
        title: 'Bad Type',
        type: 'INVALID_TYPE',
      };
      const result = documentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields.type).toBeDefined();
      }
    });

    it('empty string required field fails documentSchema.safeParse()', () => {
      const invalidData = {
        documentNumber: '',
        title: '',
        type: 'SOP' as const,
      };
      const result = documentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields.documentNumber).toBeDefined();
        expect(fields.title).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 2. CAPA creation pipeline
  // =========================================================================
  describe('CAPA creation pipeline (validation → store insert → audit trail)', () => {
    it('valid CAPA data passes capaSchema.parse()', () => {
      const validData = {
        capaNumber: 'CAPA-INT-001',
        title: 'Integration Test CAPA',
        type: 'Corrective' as const,
        description: 'Root cause identified in process step 3',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = capaSchema.parse(validData);
      expect(parsed.capaNumber).toBe('CAPA-INT-001');
      expect(parsed.title).toBe('Integration Test CAPA');
      expect(parsed.type).toBe('Corrective');
      expect(parsed.status).toBe('Open'); // default
      expect(parsed.description).toBe('Root cause identified in process step 3');
    });

    it('CAPA is added to DemoStore.capas', () => {
      const validData = {
        capaNumber: 'CAPA-INT-002',
        title: 'Store Insert CAPA',
        type: 'Preventive' as const,
        description: 'Preventive action for recurring deviation',
        assignedTo: 'user-002',
        dueDate: '2024-12-31',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = capaSchema.parse(validData);
      const now = new Date().toISOString();
      const capa: Capa = {
        ...parsed,
        id: uid('capa'),
        createdAt: now,
        updatedAt: now,
      };

      const before = store.capas.length;
      store.capas.push(capa);
      store.logAudit('CREATE', 'Capa', capa.id, undefined, {
        capaNumber: capa.capaNumber,
        title: capa.title,
        status: capa.status,
      });

      expect(store.capas.length).toBe(before + 1);
      const inserted = store.capas.find(c => c.id === capa.id);
      expect(inserted).toBeDefined();
      expect(inserted!.capaNumber).toBe('CAPA-INT-002');
      expect(inserted!.type).toBe('Preventive');
    });

    it('audit trail entry is created for CAPA creation', () => {
      const validData = {
        capaNumber: 'CAPA-INT-003',
        title: 'Audit Trail CAPA',
        type: 'Corrective' as const,
        description: 'Audit trail test CAPA',
        assignedTo: 'user-003',
        dueDate: '2024-12-31',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = capaSchema.parse(validData);
      const now = new Date().toISOString();
      const capa: Capa = {
        ...parsed,
        id: uid('capa'),
        createdAt: now,
        updatedAt: now,
      };

      const trailBefore = store.auditTrails.length;
      store.capas.push(capa);
      store.logAudit('CREATE', 'Capa', capa.id, undefined, {
        capaNumber: capa.capaNumber,
        title: capa.title,
        status: capa.status,
      });

      expect(store.auditTrails.length).toBe(trailBefore + 1);
      const entry = store.auditTrails[0];
      expect(entry.action).toBe('CREATE');
      expect(entry.tableName).toBe('Capa');
      expect(entry.recordId).toBe(capa.id);
    });

    it('invalid CAPA data fails validation — missing required fields', () => {
      const invalidData = {
        capaNumber: 'CAPA-BAD',
        // missing: title, type, description, assignedTo, dueDate, createdDate
      };
      const result = capaSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields.title).toBeDefined();
        expect(fields.type).toBeDefined();
        expect(fields.description).toBeDefined();
        expect(fields.assignedTo).toBeDefined();
        expect(fields.dueDate).toBeDefined();
        expect(fields.createdDate).toBeDefined();
      }
    });

    it('invalid CAPA type enum fails validation', () => {
      const invalidData = {
        capaNumber: 'CAPA-BAD-TYPE',
        title: 'Bad Type CAPA',
        type: 'INVALID',
        description: 'desc',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: '2024-06-01',
      };
      const result = capaSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.type).toBeDefined();
      }
    });

    it('CAPA with optional fields passes validation', () => {
      const validData = {
        capaNumber: 'CAPA-OPT-001',
        title: 'Full Optional Fields CAPA',
        type: 'Corrective' as const,
        description: 'Full optional test',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: '2024-06-01',
        priority: 'High' as const,
        source: 'Audit Finding' as const,
        rootCauseCategory: 'Method' as const,
        fiveWhys: ['Why 1', 'Why 2', 'Why 3', 'Why 4', 'Why 5'],
        effectivenessResult: 'Effective' as const,
      };
      const parsed = capaSchema.parse(validData);
      expect(parsed.priority).toBe('High');
      expect(parsed.source).toBe('Audit Finding');
      expect(parsed.rootCauseCategory).toBe('Method');
      expect(parsed.fiveWhys).toHaveLength(5);
      expect(parsed.effectivenessResult).toBe('Effective');
    });
  });

  // =========================================================================
  // 3. NCR creation pipeline
  // =========================================================================
  describe('NCR creation pipeline (validation → store insert → audit trail)', () => {
    it('valid NCR data passes ncrSchema.parse()', () => {
      const validData = {
        ncrNumber: 'NCR-INT-001',
        title: 'Integration Test NCR',
        type: 'Product' as const,
        description: 'Product failed final inspection',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = ncrSchema.parse(validData);
      expect(parsed.ncrNumber).toBe('NCR-INT-001');
      expect(parsed.title).toBe('Integration Test NCR');
      expect(parsed.type).toBe('Product');
      expect(parsed.status).toBe('Open'); // default
      expect(parsed.isOosOot).toBe(false); // default
      expect(parsed.phase2Required).toBe(false); // default
      expect(parsed.rejectLot).toBe(false); // default
    });

    it('NCR is added to DemoStore.ncrs', () => {
      const validData = {
        ncrNumber: 'NCR-INT-002',
        title: 'Store Insert NCR',
        type: 'Process' as const,
        description: 'Process deviation detected',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = ncrSchema.parse(validData);
      const now = new Date().toISOString();
      const ncr: NonConformance = {
        ...parsed,
        id: uid('ncr'),
        createdAt: now,
        updatedAt: now,
      };

      const before = store.ncrs.length;
      store.ncrs.push(ncr);
      store.logAudit('CREATE', 'NonConformance', ncr.id, undefined, {
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        status: ncr.status,
      });

      expect(store.ncrs.length).toBe(before + 1);
      const inserted = store.ncrs.find(n => n.id === ncr.id);
      expect(inserted).toBeDefined();
      expect(inserted!.ncrNumber).toBe('NCR-INT-002');
    });

    it('audit trail entry is created for NCR creation', () => {
      const validData = {
        ncrNumber: 'NCR-INT-003',
        title: 'Audit Trail NCR',
        type: 'System' as const,
        description: 'Systemic non-conformance found',
        createdDate: '2024-06-01T00:00:00Z',
      };
      const parsed = ncrSchema.parse(validData);
      const now = new Date().toISOString();
      const ncr: NonConformance = {
        ...parsed,
        id: uid('ncr'),
        createdAt: now,
        updatedAt: now,
      };

      const trailBefore = store.auditTrails.length;
      store.ncrs.push(ncr);
      store.logAudit('CREATE', 'NonConformance', ncr.id, undefined, {
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        status: ncr.status,
      });

      expect(store.auditTrails.length).toBe(trailBefore + 1);
      const entry = store.auditTrails[0];
      expect(entry.action).toBe('CREATE');
      expect(entry.tableName).toBe('NonConformance');
      expect(entry.recordId).toBe(ncr.id);
    });

    it('invalid NCR data fails validation', () => {
      const invalidData = {
        ncrNumber: 'NCR-BAD',
        // missing: title, type, description, createdDate
      };
      const result = ncrSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields.title).toBeDefined();
        expect(fields.type).toBeDefined();
        expect(fields.description).toBeDefined();
        expect(fields.createdDate).toBeDefined();
      }
    });

    it('OOS NCR with all optional fields passes validation', () => {
      const validData = {
        ncrNumber: 'NCR-OOS-001',
        title: 'OOS Result NCR',
        type: 'OOS' as const,
        description: 'Out of specification result detected',
        createdDate: '2024-06-01',
        isOosOot: true,
        analyticalMethod: 'HPLC',
        measuredValue: 102.5,
        measuredUnit: '%',
        specLimit: '95.0 – 105.0%',
        phase1Conclusion: 'No Error Found' as const,
        phase2Required: true,
        phase2Conclusion: 'Confirmed OOS' as const,
        rejectLot: true,
      };
      const parsed = ncrSchema.parse(validData);
      expect(parsed.isOosOot).toBe(true);
      expect(parsed.analyticalMethod).toBe('HPLC');
      expect(parsed.measuredValue).toBe(102.5);
      expect(parsed.rejectLot).toBe(true);
    });
  });

  // =========================================================================
  // 4. Filtering and pagination (GET route logic)
  // =========================================================================
  describe('Filtering and pagination (replicating GET route logic)', () => {
    // Seed additional documents to ensure a deterministic set for filtering
    const seedDocs: Document[] = [
      {
        id: 'doc-filter-1',
        documentNumber: 'SOP-F-001',
        title: 'Filter Test SOP A',
        type: 'SOP',
        version: '1.0',
        status: 'Approved',
        description: 'First filter test document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'doc-filter-2',
        documentNumber: 'WI-F-001',
        title: 'Filter Test Work Instruction',
        type: 'WI',
        version: '2.0',
        status: 'Draft',
        description: 'Second filter test document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'doc-filter-3',
        documentNumber: 'POL-F-001',
        title: 'Quality Policy Document',
        type: 'Policy',
        version: '1.0',
        status: 'Approved',
        description: 'Third filter test document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'doc-filter-4',
        documentNumber: 'SOP-F-002',
        title: 'Another SOP for Filtering',
        type: 'SOP',
        version: '1.0',
        status: 'Draft',
        description: 'Fourth filter test document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'doc-filter-5',
        documentNumber: 'SOP-F-003',
        title: 'SOP With Special Keyword',
        type: 'SOP',
        version: '3.0',
        status: 'Under Review',
        description: 'Fifth filter test document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    beforeEach(() => {
      // Append seed docs so they are available for every test
      seedDocs.forEach(d => {
        if (!store.documents.some(existing => existing.id === d.id)) {
          store.documents.push(d);
        }
      });
    });

    /**
     * Replicates the filtering logic from the documents GET route handler.
     */
    function filterDocuments(params: {
      status?: string;
      type?: string;
      search?: string;
    }): Document[] {
      let filtered = [...store.documents];
      if (params.status) filtered = filtered.filter(d => d.status === params.status);
      if (params.type) filtered = filtered.filter(d => d.type === params.type);
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(d =>
          d.title.toLowerCase().includes(s) ||
          d.documentNumber.toLowerCase().includes(s) ||
          (d.description && d.description.toLowerCase().includes(s))
        );
      }
      return filtered;
    }

    it('filters documents by status', () => {
      const approved = filterDocuments({ status: 'Approved' });
      expect(approved.length).toBeGreaterThan(0);
      expect(approved.every(d => d.status === 'Approved')).toBe(true);

      const draft = filterDocuments({ status: 'Draft' });
      expect(draft.length).toBeGreaterThan(0);
      expect(draft.every(d => d.status === 'Draft')).toBe(true);
    });

    it('filters documents by type', () => {
      const sops = filterDocuments({ type: 'SOP' });
      expect(sops.length).toBeGreaterThan(0);
      expect(sops.every(d => d.type === 'SOP')).toBe(true);

      const policies = filterDocuments({ type: 'Policy' });
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.every(d => d.type === 'Policy')).toBe(true);
    });

    it('searches documents by title (case-insensitive)', () => {
      const results = filterDocuments({ search: 'special keyword' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(d => d.id === 'doc-filter-5')).toBe(true);
    });

    it('searches documents by document number', () => {
      const results = filterDocuments({ search: 'wi-f-001' });
      expect(results.some(d => d.id === 'doc-filter-2')).toBe(true);
    });

    it('searches documents by description', () => {
      const results = filterDocuments({ search: 'fourth filter test' });
      expect(results.some(d => d.id === 'doc-filter-4')).toBe(true);
    });

    it('combined status + type filter', () => {
      const approvedSops = filterDocuments({ status: 'Approved', type: 'SOP' });
      expect(approvedSops.length).toBeGreaterThan(0);
      expect(approvedSops.every(d => d.status === 'Approved' && d.type === 'SOP')).toBe(true);
    });

    it('returns empty array for non-matching filter', () => {
      const results = filterDocuments({ status: 'Obsolete', type: 'Specification' });
      expect(results).toEqual([]);
    });

    it('paginates results (page, pageSize, total calculation)', () => {
      const allFiltered = filterDocuments({ type: 'SOP' });
      const total = allFiltered.length;
      const pageSize = 2;
      const page = 1;

      const start = (page - 1) * pageSize;
      const page1Data = allFiltered.slice(start, start + pageSize);

      expect(page1Data.length).toBe(Math.min(pageSize, total));
      expect(page1Data.every(d => d.type === 'SOP')).toBe(true);

      // Page 2
      const page2 = 2;
      const start2 = (page2 - 1) * pageSize;
      const page2Data = allFiltered.slice(start2, start2 + pageSize);
      if (total > pageSize) {
        expect(page2Data.length).toBeGreaterThan(0);
      }

      // Verify the apiPaginated response structure
      const response = apiPaginated(page1Data, total, page, pageSize);
      // apiPaginated returns NextResponse, we can access the body via .json()
      // but in test we can inspect the shape by reading internal properties
      expect(response.status).toBe(200);
    });

    it('apiPaginated returns correct pagination metadata', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const total = 7;
      const page = 2;
      const pageSize = 2;

      const response = apiPaginated(data, total, page, pageSize);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.pagination).toEqual({
        page: 2,
        pageSize: 2,
        total: 7,
        totalPages: 4, // Math.ceil(7 / 2)
      });
    });

    it('apiPaginated handles single page correctly', async () => {
      const data = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const response = apiPaginated(data, 3, 1, 10);
      const body = await response.json();

      expect(body.pagination.totalPages).toBe(1);
      expect(body.pagination.page).toBe(1);
    });

    it('apiPaginated handles zero results', async () => {
      const response = apiPaginated([], 0, 1, 10);
      const body = await response.json();

      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
    });
  });

  // =========================================================================
  // 5. Update pipeline
  // =========================================================================
  describe('Update pipeline (update entity → audit trail → updatedAt)', () => {
    it('updates a document status in DemoStore', () => {
      const docId = uid('doc');
      const now = new Date().toISOString();
      const doc: Document = {
        id: docId,
        documentNumber: 'SOP-UPD-001',
        title: 'Update Test Doc',
        type: 'SOP',
        version: '1.0',
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
      };
      store.documents.push(doc);

      // Simulate the PUT route handler logic
      const idx = store.documents.findIndex(d => d.id === docId);
      expect(idx).not.toBe(-1);

      const old = store.documents[idx];
      const updateBody = { status: 'Under Review' as const };
      const updated: Document = {
        ...old,
        ...updateBody,
        id: old.id,
        updatedAt: new Date().toISOString(),
      };
      store.documents[idx] = updated;

      expect(store.documents[idx].status).toBe('Under Review');
    });

    it('verify audit trail is logged for document update', () => {
      const docId = uid('doc');
      const now = new Date().toISOString();
      const doc: Document = {
        id: docId,
        documentNumber: 'SOP-UPD-002',
        title: 'Audit Update Test Doc',
        type: 'WI',
        version: '1.0',
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
      };
      store.documents.push(doc);

      const idx = store.documents.findIndex(d => d.id === docId);
      const old = store.documents[idx];
      const updateBody = { status: 'Approved' as const };
      const updated: Document = {
        ...old,
        ...updateBody,
        id: old.id,
        updatedAt: new Date().toISOString(),
      };
      store.documents[idx] = updated;

      // Log audit exactly as the PUT route handler does
      store.logAudit('UPDATE', 'Document', docId, { status: old.status }, updateBody);

      const entry = store.auditTrails[0];
      expect(entry.action).toBe('UPDATE');
      expect(entry.tableName).toBe('Document');
      expect(entry.recordId).toBe(docId);
      expect((entry.oldValues as Record<string, unknown>)!.status).toBe('Draft');
      expect((entry.newValues as Record<string, unknown>)!.status).toBe('Approved');
    });

    it('verify updatedAt is set on document update', () => {
      const docId = uid('doc');
      const originalTime = '2024-01-01T00:00:00.000Z';
      const doc: Document = {
        id: docId,
        documentNumber: 'SOP-UPD-003',
        title: 'UpdatedAt Test Doc',
        type: 'Form',
        version: '1.0',
        status: 'Draft',
        createdAt: originalTime,
        updatedAt: originalTime,
      };
      store.documents.push(doc);

      const idx = store.documents.findIndex(d => d.id === docId);
      const old = store.documents[idx];
      const updated: Document = {
        ...old,
        status: 'Approved',
        id: old.id,
        updatedAt: new Date().toISOString(),
      };
      store.documents[idx] = updated;

      expect(store.documents[idx].updatedAt).not.toBe(originalTime);
      expect(store.documents[idx].status).toBe('Approved');
    });

    it('updates CAPA status and logs audit with old status', () => {
      const capaId = uid('capa');
      const now = new Date().toISOString();
      const capa: Capa = {
        id: capaId,
        capaNumber: 'CAPA-UPD-001',
        title: 'Update Test CAPA',
        type: 'Corrective',
        status: 'Open',
        description: 'Test CAPA for update',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);

      const idx = store.capas.findIndex(c => c.id === capaId);
      const old = store.capas[idx];
      const updated: Capa = {
        ...old,
        status: 'Investigation',
        id: old.id,
        updatedAt: new Date().toISOString(),
      };
      store.capas[idx] = updated;
      store.logAudit('UPDATE', 'Capa', capaId, { status: old.status }, { status: 'Investigation' });

      expect(store.capas[idx].status).toBe('Investigation');
      const entry = store.auditTrails[0];
      expect(entry.action).toBe('UPDATE');
      expect(entry.tableName).toBe('Capa');
      expect((entry.oldValues as Record<string, unknown>)!.status).toBe('Open');
    });

    it('update preserves fields not in the update body', () => {
      const docId = uid('doc');
      const now = new Date().toISOString();
      const doc: Document = {
        id: docId,
        documentNumber: 'SOP-PRES-001',
        title: 'Preserve Fields Test',
        type: 'SOP',
        version: '1.0',
        status: 'Draft',
        description: 'Original description',
        department: 'Quality',
        createdAt: now,
        updatedAt: now,
      };
      store.documents.push(doc);

      const idx = store.documents.findIndex(d => d.id === docId);
      const old = store.documents[idx];
      const updated: Document = {
        ...old,
        status: 'Under Review',
        id: old.id,
        updatedAt: new Date().toISOString(),
      };
      store.documents[idx] = updated;

      // Unchanged fields are preserved
      expect(store.documents[idx].title).toBe('Preserve Fields Test');
      expect(store.documents[idx].documentNumber).toBe('SOP-PRES-001');
      expect(store.documents[idx].description).toBe('Original description');
      expect(store.documents[idx].department).toBe('Quality');
      expect(store.documents[idx].version).toBe('1.0');
    });
  });

  // =========================================================================
  // 6. Cross-entity linking
  // =========================================================================
  describe('Cross-entity linking', () => {
    it('creates a CAPA linked to an NCR', () => {
      const ncrId = uid('ncr');
      const now = new Date().toISOString();

      // Create the NCR first
      const ncrData = {
        ncrNumber: 'NCR-LINK-001',
        title: 'NCR for CAPA linking',
        type: 'Product' as const,
        description: 'Product NCR requiring corrective action',
        createdDate: now,
      };
      const parsedNcr = ncrSchema.parse(ncrData);
      const ncr: NonConformance = {
        ...parsedNcr,
        id: ncrId,
        createdAt: now,
        updatedAt: now,
      };
      store.ncrs.push(ncr);
      store.logAudit('CREATE', 'NonConformance', ncrId, undefined, {
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        status: ncr.status,
      });

      // Create a CAPA linked to the NCR
      const capaData = {
        capaNumber: 'CAPA-LINK-001',
        title: 'CAPA linked to NCR',
        type: 'Corrective' as const,
        description: 'Corrective action for NCR-LINK-001',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
        linkedNcrId: ncrId,
      };
      const parsedCapa = capaSchema.parse(capaData);
      const capaId = uid('capa');
      const capa: Capa = {
        ...parsedCapa,
        id: capaId,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);
      store.logAudit('CREATE', 'Capa', capaId, undefined, {
        capaNumber: capa.capaNumber,
        title: capa.title,
        status: capa.status,
      });

      // Verify linkedNcrId is stored correctly
      const insertedCapa = store.capas.find(c => c.id === capaId);
      expect(insertedCapa).toBeDefined();
      expect(insertedCapa!.linkedNcrId).toBe(ncrId);

      // Verify the NCR exists
      const insertedNcr = store.ncrs.find(n => n.id === ncrId);
      expect(insertedNcr).toBeDefined();
      expect(insertedNcr!.ncrNumber).toBe('NCR-LINK-001');
    });

    it('NCR can reference a linkedCapaId back to the CAPA', () => {
      const capaId = uid('capa');
      const now = new Date().toISOString();

      const capaData = {
        capaNumber: 'CAPA-BILINK-001',
        title: 'Bidirectional Link CAPA',
        type: 'Corrective' as const,
        description: 'CAPA for bidirectional linking test',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
      };
      const parsedCapa = capaSchema.parse(capaData);
      const capa: Capa = {
        ...parsedCapa,
        id: capaId,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);

      // Create NCR that references the CAPA
      const ncrData = {
        ncrNumber: 'NCR-BILINK-001',
        title: 'Bidirectional Link NCR',
        type: 'Process' as const,
        description: 'NCR with linked CAPA',
        createdDate: now,
        linkedCapaId: capaId,
      };
      const parsedNcr = ncrSchema.parse(ncrData);
      const ncrId = uid('ncr');
      const ncr: NonConformance = {
        ...parsedNcr,
        id: ncrId,
        createdAt: now,
        updatedAt: now,
      };
      store.ncrs.push(ncr);

      const insertedNcr = store.ncrs.find(n => n.id === ncrId);
      expect(insertedNcr!.linkedCapaId).toBe(capaId);
    });

    it('creates a ChangeControl linked to a CAPA', () => {
      const capaId = uid('capa');
      const now = new Date().toISOString();

      // Create the CAPA
      const capaData = {
        capaNumber: 'CAPA-CC-LINK-001',
        title: 'CAPA for Change Control link',
        type: 'Corrective' as const,
        description: 'CAPA requiring change control',
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
      };
      const parsedCapa = capaSchema.parse(capaData);
      const capa: Capa = {
        ...parsedCapa,
        id: capaId,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);

      // Create a ChangeControl linked to the CAPA
      const ccData = {
        ccNumber: 'CC-LINK-001',
        title: 'Change Control linked to CAPA',
        type: 'Planned' as const,
        priority: 'High' as const,
        category: 'Process' as const,
        description: 'Process change driven by CAPA findings',
        justification: 'CAPA identified process improvement opportunity',
        proposedChange: 'Update manufacturing process parameter',
        linkedCapaId: capaId,
        assignedTo: 'user-001',
        requestedBy: 'user-002',
        dueDate: '2024-12-31',
      };
      const parsedCc = changeControlSchema.parse(ccData);
      const ccId = uid('cc');
      const cc: ChangeControl = {
        ...parsedCc,
        id: ccId,
        createdAt: now,
        updatedAt: now,
      };
      store.changeControls.push(cc);
      store.logAudit('CREATE', 'ChangeControl', ccId, undefined, {
        ccNumber: cc.ccNumber,
        title: cc.title,
        status: cc.status,
      });

      // Verify linkedCapaId is stored correctly
      const insertedCc = store.changeControls.find(c => c.id === ccId);
      expect(insertedCc).toBeDefined();
      expect(insertedCc!.linkedCapaId).toBe(capaId);
      expect(insertedCc!.ccNumber).toBe('CC-LINK-001');

      // Verify audit trail
      const entry = store.auditTrails[0];
      expect(entry.action).toBe('CREATE');
      expect(entry.tableName).toBe('ChangeControl');
      expect(entry.recordId).toBe(ccId);
    });

    it('linked CAPA can be resolved to its source NCR', () => {
      const ncrId = uid('ncr');
      const capaId = uid('capa');
      const now = new Date().toISOString();

      // Create NCR
      const ncr: NonConformance = {
        id: ncrId,
        ncrNumber: 'NCR-RESOLVE-001',
        title: 'Resolvable NCR',
        type: 'Product' as const,
        status: 'Open',
        description: 'NCR to resolve via CAPA',
        isOosOot: false,
        phase2Required: false,
        rejectLot: false,
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      };
      store.ncrs.push(ncr);

      // Create CAPA linked to NCR
      const capa: Capa = {
        id: capaId,
        capaNumber: 'CAPA-RESOLVE-001',
        title: 'Resolving CAPA',
        type: 'Corrective' as const,
        status: 'Open',
        description: 'CAPA to resolve NCR',
        linkedNcrId: ncrId,
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);

      // Verify we can traverse the link: CAPA → NCR
      const foundCapa = store.capas.find(c => c.id === capaId);
      expect(foundCapa!.linkedNcrId).toBe(ncrId);

      const sourceNcr = store.ncrs.find(n => n.id === foundCapa!.linkedNcrId);
      expect(sourceNcr).toBeDefined();
      expect(sourceNcr!.ncrNumber).toBe('NCR-RESOLVE-001');

      // Verify we can traverse NCR → CAPA (after updating NCR's linkedCapaId)
      const ncrIdx = store.ncrs.findIndex(n => n.id === ncrId);
      store.ncrs[ncrIdx] = { ...store.ncrs[ncrIdx], linkedCapaId: capaId };

      const updatedNcr = store.ncrs.find(n => n.id === ncrId);
      expect(updatedNcr!.linkedCapaId).toBe(capaId);

      const relatedCapa = store.capas.find(c => c.id === updatedNcr!.linkedCapaId);
      expect(relatedCapa).toBeDefined();
      expect(relatedCapa!.capaNumber).toBe('CAPA-RESOLVE-001');
    });

    it('ChangeControl linked to CAPA which is linked to NCR — full chain', () => {
      const ncrId = uid('ncr');
      const capaId = uid('capa');
      const ccId = uid('cc');
      const now = new Date().toISOString();

      // NCR
      const ncr: NonConformance = {
        id: ncrId,
        ncrNumber: 'NCR-CHAIN-001',
        title: 'Chain Link NCR',
        type: 'System' as const,
        status: 'Open',
        description: 'Systemic NCR requiring full change control',
        isOosOot: false,
        phase2Required: false,
        rejectLot: false,
        linkedCapaId: capaId,
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      };
      store.ncrs.push(ncr);

      // CAPA linked to NCR
      const capa: Capa = {
        id: capaId,
        capaNumber: 'CAPA-CHAIN-001',
        title: 'Chain Link CAPA',
        type: 'Corrective' as const,
        status: 'Open',
        description: 'CAPA for chain link test',
        linkedNcrId: ncrId,
        assignedTo: 'user-001',
        dueDate: '2024-12-31',
        createdDate: now,
        createdAt: now,
        updatedAt: now,
      };
      store.capas.push(capa);

      // ChangeControl linked to CAPA
      const cc: ChangeControl = {
        id: ccId,
        ccNumber: 'CC-CHAIN-001',
        title: 'Chain Link Change Control',
        type: 'Planned' as const,
        status: 'Requested',
        priority: 'Critical' as const,
        category: 'Process' as const,
        description: 'Change control driven by CAPA from NCR',
        justification: 'Root cause requires process modification',
        proposedChange: 'Revise manufacturing procedure',
        linkedCapaId: capaId,
        assignedTo: 'user-001',
        requestedBy: 'user-002',
        dueDate: '2024-12-31',
        createdAt: now,
        updatedAt: now,
      };
      store.changeControls.push(cc);

      // Verify full chain: CC → CAPA → NCR
      const foundCc = store.changeControls.find(c => c.id === ccId);
      expect(foundCc!.linkedCapaId).toBe(capaId);

      const foundCapa = store.capas.find(c => c.id === foundCc!.linkedCapaId);
      expect(foundCapa).toBeDefined();
      expect(foundCapa!.linkedNcrId).toBe(ncrId);

      const foundNcr = store.ncrs.find(n => n.id === foundCapa!.linkedNcrId);
      expect(foundNcr).toBeDefined();
      expect(foundNcr!.ncrNumber).toBe('NCR-CHAIN-001');

      // Reverse chain: NCR → CAPA → CC
      expect(foundNcr!.linkedCapaId).toBe(capaId);
      const capaFromNcr = store.capas.find(c => c.id === foundNcr!.linkedCapaId);
      expect(capaFromNcr).toBeDefined();

      const ccFromCapa = store.changeControls.find(c => c.linkedCapaId === capaFromNcr!.id);
      expect(ccFromCapa).toBeDefined();
      expect(ccFromCapa!.ccNumber).toBe('CC-CHAIN-001');
    });
  });

  // =========================================================================
  // Bonus: Response formatting helpers end-to-end
  // =========================================================================
  describe('Response formatting helpers (apiSuccess, apiError, apiPaginated)', () => {
    it('apiSuccess returns correct structure and status', async () => {
      const data = { id: 'test-1', name: 'Test Entity' };
      const response = apiSuccess(data);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('apiSuccess with custom status code', async () => {
      const data = { id: 'created-1' };
      const response = apiSuccess(data, 201);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('apiError returns correct structure and status', async () => {
      const response = apiError('Validation failed', 400, { field: 'title' });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toEqual({ field: 'title' });
    });

    it('apiError without details omits details field', async () => {
      const response = apiError('Not found', 404);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Not found');
      expect(body.details).toBeUndefined();
    });

    it('apiError default status is 400', async () => {
      const response = apiError('Bad request');
      expect(response.status).toBe(400);
    });

    it('apiPaginated includes correct totalPages calculation', async () => {
      // 25 items, 10 per page → 3 pages
      const response = apiPaginated(
        Array(10).fill({ id: 'item' }),
        25,
        1,
        10,
      );
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('apiPaginated on last page with partial data', async () => {
      // 25 items, page 3, pageSize 10 → 5 items on last page
      const response = apiPaginated(
        Array(5).fill({ id: 'item' }),
        25,
        3,
        10,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(5);
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.totalPages).toBe(3);
    });
  });

  // =========================================================================
  // Full end-to-end pipeline: validate → create → store → audit → format
  // =========================================================================
  describe('Full end-to-end pipeline (validate → create → store → audit → format response)', () => {
    it('document POST pipeline produces correct result', async () => {
      const inputData = {
        documentNumber: 'SOP-E2E-001',
        title: 'End-to-End Document',
        type: 'SOP' as const,
      };

      // Step 1: Validate
      const parsed = documentSchema.safeParse(inputData);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      // Step 2: Create entity with server-generated fields
      const now = new Date().toISOString();
      const doc: Document = {
        ...parsed.data,
        documentLevel: parsed.data.documentLevel as Document['documentLevel'],
        status: parsed.data.status as Document['status'],
        id: `doc-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      // Step 3: Store
      const before = store.documents.length;
      store.documents.push(doc);
      store.logAudit('CREATE', 'Document', doc.id, undefined, {
        documentNumber: doc.documentNumber,
        title: doc.title,
        status: doc.status,
      });

      expect(store.documents.length).toBe(before + 1);

      // Step 4: Verify audit trail
      const audit = store.auditTrails[0];
      expect(audit.action).toBe('CREATE');
      expect(audit.tableName).toBe('Document');
      expect(audit.recordId).toBe(doc.id);

      // Step 5: Format response
      const response = apiSuccess(doc, 201);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.documentNumber).toBe('SOP-E2E-001');
      expect(body.data.title).toBe('End-to-End Document');
      expect(body.data.status).toBe('Draft');
      expect(body.data.id).toBe(doc.id);
    });

    it('CAPA POST pipeline with validation failure returns apiError', async () => {
      const invalidData = { title: 'Missing required fields' };
      const parsed = capaSchema.safeParse(invalidData);

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        // Simulate what the route handler does on validation failure
        const response = apiError('Validation failed', 400, parsed.error.flatten());
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Validation failed');
        expect(body.details).toBeDefined();
      }
    });

    it('NCR full pipeline: create → store → audit → format', async () => {
      const inputData = {
        ncrNumber: 'NCR-E2E-001',
        title: 'End-to-End NCR',
        type: 'Process' as const,
        description: 'Full pipeline test NCR',
        createdDate: '2024-06-01T00:00:00Z',
      };

      const parsed = ncrSchema.safeParse(inputData);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const now = new Date().toISOString();
      const ncr: NonConformance = {
        ...parsed.data,
        id: `ncr-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      const before = store.ncrs.length;
      store.ncrs.push(ncr);
      store.logAudit('CREATE', 'NonConformance', ncr.id, undefined, {
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        status: ncr.status,
      });

      expect(store.ncrs.length).toBe(before + 1);

      const audit = store.auditTrails[0];
      expect(audit.action).toBe('CREATE');
      expect(audit.tableName).toBe('NonConformance');

      const response = apiSuccess(ncr, 201);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.ncrNumber).toBe('NCR-E2E-001');
      expect(body.data.isOosOot).toBe(false);
    });
  });
});
