import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiError } from '../../_lib/response';
import {
  generateDocumentsCSV,
  generateCapasCSV,
  generateNcrsCSV,
  generateAuditsCSV,
  generateTrainingCSV,
  generateRisksCSV,
  generateBatchRecordsCSV,
  generateSuppliersCSV,
} from '../../_lib/export-service';

const entityExporters: Record<string, { generate: (store: ReturnType<typeof getDemoStore>) => string; label: string }> = {
  documents: { generate: (store) => generateDocumentsCSV(store.documents), label: 'documents' },
  capas: { generate: (store) => generateCapasCSV(store.capas), label: 'capas' },
  ncrs: { generate: (store) => generateNcrsCSV(store.ncrs), label: 'ncrs' },
  audits: { generate: (store) => generateAuditsCSV(store.audits), label: 'audits' },
  training: { generate: (store) => generateTrainingCSV(store.training), label: 'training' },
  risks: { generate: (store) => generateRisksCSV(store.risks), label: 'risks' },
  'batch-records': { generate: (store) => generateBatchRecordsCSV(store.batchRecords), label: 'batch-records' },
  suppliers: { generate: (store) => generateSuppliersCSV(store.suppliers), label: 'suppliers' },
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity } = await params;
    const exporter = entityExporters[entity];
    if (!exporter) {
      return apiError(`Unknown entity type: ${entity}. Valid types: ${Object.keys(entityExporters).join(', ')}`, 400);
    }

    const store = getDemoStore();
    const csv = exporter.generate(store);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiError('Failed to export entity data', 500, error instanceof Error ? error.message : undefined);
  }
}
