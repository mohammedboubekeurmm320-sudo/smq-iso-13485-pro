import { NextRequest } from 'next/server';
import { getDemoStore } from '../../../_lib/demo-data';
import { apiSuccess, apiError } from '../../../_lib/response';
import type { ScheduledReportStatus } from '@/types/qms';

// POST: Toggle a report between 'active' and 'paused' status
export async function POST(
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

    const current = store.scheduledReports[idx];
    const newStatus: ScheduledReportStatus = current.status === 'active' ? 'paused' : 'active';

    store.scheduledReports[idx] = {
      ...current,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    store.logAudit('UPDATE', 'ScheduledReport', id, { status: current.status }, { status: newStatus });

    return apiSuccess(store.scheduledReports[idx]);
  } catch (error) {
    return apiError('Failed to toggle scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}
