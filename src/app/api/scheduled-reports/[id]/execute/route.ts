import { NextRequest } from 'next/server';
import { getDemoStore } from '../../../_lib/demo-data';
import { apiSuccess, apiError } from '../../../_lib/response';
import { generateDocumentsCSV, generateCapasCSV, generateNcrsCSV, generateAuditsCSV, generateTrainingCSV, generateRisksCSV } from '../../../_lib/export-service';

// POST: Manually trigger execution of a scheduled report
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const report = store.scheduledReports.find(r => r.id === id);
    if (!report) {
      return apiError('Scheduled report not found', 404);
    }

    // Generate the report content using existing export service functions
    let recordCount = 0;
    let content = '';

    switch (report.reportType) {
      case 'capa-summary': {
        content = generateCapasCSV(store.capas);
        recordCount = store.capas.length;
        break;
      }
      case 'audit-summary': {
        content = generateAuditsCSV(store.audits);
        recordCount = store.audits.length;
        break;
      }
      case 'compliance-overview': {
        content = generateDocumentsCSV(store.documents);
        recordCount = store.documents.length;
        break;
      }
      case 'training-status': {
        content = generateTrainingCSV(store.training);
        recordCount = store.training.length;
        break;
      }
      case 'risk-profile': {
        content = generateRisksCSV(store.risks);
        recordCount = store.risks.length;
        break;
      }
      case 'management-review': {
        content = generateDocumentsCSV(store.documents);
        recordCount = store.documents.length;
        break;
      }
      default:
        content = 'Report type not supported yet';
    }

    // Update the report's lastRunAt and lastResult
    const now = new Date().toISOString();
    const idx = store.scheduledReports.findIndex(r => r.id === id);
    if (idx !== -1) {
      // Compute next run date
      let nextRunAt: Date;
      const dateNow = new Date();
      switch (report.frequency) {
        case 'daily':
          nextRunAt = new Date(dateNow.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          nextRunAt = new Date(dateNow.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          nextRunAt = new Date(dateNow.getFullYear(), dateNow.getMonth() + 1, dateNow.getDate());
          break;
        case 'quarterly':
          nextRunAt = new Date(dateNow.getFullYear(), dateNow.getMonth() + 3, dateNow.getDate());
          break;
        default:
          nextRunAt = new Date(dateNow.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      store.scheduledReports[idx] = {
        ...store.scheduledReports[idx],
        lastRunAt: now,
        nextRunAt: nextRunAt.toISOString(),
        lastResult: { success: true, recordCount },
        updatedAt: now,
      };
    }

    // Log generation (in demo mode, no actual email sending)
    store.logAudit('EXPORT', 'ScheduledReport', id, undefined, {
      name: report.name,
      reportType: report.reportType,
      recordCount,
      recipients: report.recipients.join(', '),
      message: `Report generated in demo mode. In production, this would be emailed to: ${report.recipients.join(', ')}`,
    });

    // Return the generated content
    if (report.format === 'csv') {
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return apiSuccess({
      message: 'Report generated successfully',
      reportType: report.reportType,
      format: report.format,
      recordCount,
      lastRunAt: now,
      recipients: report.recipients,
      demoNote: 'In production, this report would be emailed to the recipients.',
    });
  } catch (error) {
    return apiError('Failed to execute scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}
