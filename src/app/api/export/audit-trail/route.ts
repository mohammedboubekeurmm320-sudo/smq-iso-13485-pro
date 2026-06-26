import { getDemoStore } from '../../_lib/demo-data';
import { generateAuditTrailCSV } from '../../_lib/export-service';
import { apiError } from '../../_lib/response';

export async function GET() {
  try {
    const store = getDemoStore();
    const csv = generateAuditTrailCSV(store.auditTrails);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiError('Failed to export audit trail', 500, error instanceof Error ? error.message : undefined);
  }
}
