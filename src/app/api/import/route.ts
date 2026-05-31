import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import { parseCSV, validateImportData, mapCsvToEntity, generateImportTemplate } from '@/lib/import-service';
import type { Document, Capa, NonConformance, Training, Supplier, Risk, Deviation } from '@/types/qms';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const dryRunStr = formData.get('dryRun') as string | null;
    const dryRun = dryRunStr === 'true';

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (!entityType) {
      return apiError('No entity type specified', 400);
    }

    const supportedTypes = ['document', 'capa', 'ncr', 'training', 'supplier', 'risk', 'deviation'];
    if (!supportedTypes.includes(entityType)) {
      return apiError(`Unsupported entity type: ${entityType}. Supported: ${supportedTypes.join(', ')}`, 400);
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    const { headers, rows } = parseCSV(content);

    if (headers.length === 0) {
      return apiError('CSV file is empty or has no headers', 400);
    }

    if (rows.length === 0) {
      return apiError('CSV file has headers but no data rows', 400);
    }

    // Validate all rows
    const { valid, invalid } = validateImportData(entityType, rows);

    // If dry run, return validation results only
    if (dryRun) {
      return apiSuccess({
        totalRows: rows.length,
        validRows: valid.length,
        invalidRows: invalid.length,
        headers,
        errors: invalid,
      });
    }

    // Import valid rows
    const store = getDemoStore();
    const now = new Date().toISOString();
    let imported = 0;
    const importErrors: { row: number; error: string }[] = [];

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        const entity = mapCsvToEntity(entityType, row);

        switch (entityType) {
          case 'document': {
            const doc: Document = {
              id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              documentNumber: (entity.documentNumber as string) || '',
              title: (entity.title as string) || '',
              type: (entity.type as Document['type']) || 'SOP',
              version: (entity.version as string) || '1.0',
              status: (entity.status as Document['status']) || 'Draft',
              effectiveDate: entity.effectiveDate as string | undefined,
              expirationDate: entity.expirationDate as string | undefined,
              owner: entity.owner as string | undefined,
              department: entity.department as string | undefined,
              description: entity.description as string | undefined,
              classification: entity.classification as Document['classification'],
              retentionPeriod: entity.retentionPeriod as string | undefined,
              scope: entity.scope as string | undefined,
              references: entity.references as string | undefined,
              documentLevel: entity.documentLevel as Document['documentLevel'],
              isoClause: entity.isoClause as string | undefined,
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.documents.push(doc);
            store.logAudit('CREATE', 'Document', doc.id, undefined, { documentNumber: doc.documentNumber, title: doc.title, imported: true });
            break;
          }
          case 'capa': {
            const capa: Capa = {
              id: `capa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              capaNumber: (entity.capaNumber as string) || '',
              title: (entity.title as string) || '',
              type: (entity.type as Capa['type']) || 'Corrective',
              status: (entity.status as Capa['status']) || 'Open',
              priority: entity.priority as Capa['priority'],
              source: entity.source as Capa['source'],
              description: (entity.description as string) || '',
              rootCauseCategory: entity.rootCauseCategory as Capa['rootCauseCategory'],
              correctiveAction: entity.correctiveAction as string | undefined,
              assignedTo: (entity.assignedTo as string) || '',
              dueDate: (entity.dueDate as string) || now,
              createdDate: (entity.createdDate as string) || now,
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.capas.push(capa);
            store.logAudit('CREATE', 'Capa', capa.id, undefined, { capaNumber: capa.capaNumber, title: capa.title, imported: true });
            break;
          }
          case 'ncr': {
            const ncr: NonConformance = {
              id: `ncr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              ncrNumber: (entity.ncrNumber as string) || '',
              title: (entity.title as string) || '',
              type: (entity.type as NonConformance['type']) || 'Process',
              status: (entity.status as NonConformance['status']) || 'Open',
              severity: entity.severity as NonConformance['severity'],
              description: (entity.description as string) || '',
              lotNumber: entity.lotNumber as string | undefined,
              quantityAffected: entity.quantityAffected as number | undefined,
              disposition: entity.disposition as NonConformance['disposition'],
              assignedTo: entity.assignedTo as string | undefined,
              isOosOot: false,
              phase2Required: false,
              rejectLot: false,
              createdDate: (entity.createdDate as string) || now,
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.ncrs.push(ncr);
            store.logAudit('CREATE', 'NonConformance', ncr.id, undefined, { ncrNumber: ncr.ncrNumber, title: ncr.title, imported: true });
            break;
          }
          case 'training': {
            const training: Training = {
              id: `train-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: (entity.title as string) || '',
              description: entity.description as string | undefined,
              type: (entity.type as Training['type']) || 'SOP',
              status: (entity.status as Training['status']) || 'Planned',
              assignedTo: (entity.assignedTo as string) || '',
              dueDate: (entity.dueDate as string) || now,
              completedDate: entity.completedDate as string | undefined,
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.training.push(training);
            store.logAudit('CREATE', 'Training', training.id, undefined, { title: training.title, imported: true });
            break;
          }
          case 'supplier': {
            const supplier: Supplier = {
              id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              supplierCode: (entity.supplierCode as string) || '',
              name: (entity.name as string) || '',
              category: entity.category as Supplier['category'],
              status: (entity.status as Supplier['status']) || 'Under Evaluation',
              qualificationDate: entity.qualificationDate as string | undefined,
              nextReviewDate: entity.nextReviewDate as string | undefined,
              performanceScore: entity.performanceScore as number | undefined,
              primaryContactName: entity.primaryContactName as string | undefined,
              primaryContactEmail: entity.primaryContactEmail as string | undefined,
              primaryContactPhone: entity.primaryContactPhone as string | undefined,
              city: entity.city as string | undefined,
              country: entity.country as string | undefined,
              organizationId: 'org-001',
              createdAt: now,
            };
            store.suppliers.push(supplier);
            store.logAudit('CREATE', 'Supplier', supplier.id, undefined, { supplierCode: supplier.supplierCode, name: supplier.name, imported: true });
            break;
          }
          case 'risk': {
            const risk: Risk = {
              id: `risk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              riskNumber: (entity.riskNumber as string) || '',
              title: (entity.title as string) || '',
              category: entity.category as Risk['category'],
              probability: (entity.probability as number) || 1,
              impact: (entity.impact as number) || 1,
              detectability: (entity.detectability as number) || 1,
              rpn: (entity.rpn as number) || 1,
              riskLevel: (entity.riskLevel as Risk['riskLevel']) || 'Low',
              mitigation: entity.mitigation as string | undefined,
              status: (entity.status as Risk['status']) || 'Open',
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.risks.push(risk);
            store.logAudit('CREATE', 'Risk', risk.id, undefined, { riskNumber: risk.riskNumber, title: risk.title, imported: true });
            break;
          }
          case 'deviation': {
            const dev: Deviation = {
              id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              devNumber: (entity.devNumber as string) || '',
              title: (entity.title as string) || '',
              type: (entity.type as Deviation['type']) || 'Unplanned',
              status: (entity.status as Deviation['status']) || 'Open',
              severity: (entity.severity as Deviation['severity']) || 'Minor',
              category: (entity.category as Deviation['category']) || 'Process',
              description: (entity.description as string) || '',
              deviationDetails: (entity.deviationDetails as string) || '',
              assignedTo: (entity.assignedTo as string) || '',
              dueDate: (entity.dueDate as string) || now,
              lotNumber: entity.lotNumber as string | undefined,
              productCode: entity.productCode as string | undefined,
              organizationId: 'org-001',
              createdAt: now,
              updatedAt: now,
            };
            store.deviations.push(dev);
            store.logAudit('CREATE', 'Deviation', dev.id, undefined, { devNumber: dev.devNumber, title: dev.title, imported: true });
            break;
          }
        }
        imported++;
      } catch (err) {
        importErrors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : 'Unknown error during import',
        });
      }
    }

    return apiSuccess({
      imported,
      skipped: invalid.length + importErrors.length,
      errors: [...invalid, ...importErrors],
      totalRows: rows.length,
    });
  } catch (error) {
    return apiError('Import failed', 500, error instanceof Error ? error.message : undefined);
  }
}

// GET: Download import template
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');

    if (!entityType) {
      return apiError('entityType query parameter is required', 400);
    }

    const template = generateImportTemplate(entityType);

    return new Response(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entityType}-import-template.csv"`,
      },
    });
  } catch (error) {
    return apiError('Failed to generate template', 500, error instanceof Error ? error.message : undefined);
  }
}
