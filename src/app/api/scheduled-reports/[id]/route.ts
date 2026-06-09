import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

// GET: Get single scheduled report
export async function GET(
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
    return apiSuccess(report);
  } catch (error) {
    return apiError('Failed to fetch scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}

// PUT: Update scheduled report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.scheduledReports.findIndex(r => r.id === id);
    if (idx === -1) {
      return apiError('Scheduled report not found', 404);
    }

    const body = await request.json();
    const now = new Date().toISOString();

    // Recalculate nextRunAt if frequency changed
    if (body.frequency) {
      const currentReport = store.scheduledReports[idx];
      if (body.frequency !== currentReport.frequency) {
        const dateNow = new Date();
        let nextRunAt: Date;
        switch (body.frequency) {
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
        body.nextRunAt = nextRunAt.toISOString();
      }
    }

    store.scheduledReports[idx] = {
      ...store.scheduledReports[idx],
      ...body,
      updatedAt: now,
    };

    store.logAudit('UPDATE', 'ScheduledReport', id, undefined, body);

    return apiSuccess(store.scheduledReports[idx]);
  } catch (error) {
    return apiError('Failed to update scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}

// DELETE: Delete scheduled report
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.scheduledReports.findIndex(r => r.id === id);
    if (idx === -1) {
      return apiError('Scheduled report not found', 404);
    }

    const old = store.scheduledReports[idx];
    store.scheduledReports.splice(idx, 1);
    store.logAudit('DELETE', 'ScheduledReport', id, { name: old.name });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}
