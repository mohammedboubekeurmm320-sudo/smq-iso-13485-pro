import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';
import type { ScheduledReport, ReportFrequency, ReportType, ReportFormat, ScheduledReportStatus } from '@/types/qms';

// GET: List all scheduled reports
export async function GET() {
  try {
    const store = getDemoStore();
    return apiSuccess(store.scheduledReports);
  } catch (error) {
    return apiError('Failed to fetch scheduled reports', 500, error instanceof Error ? error.message : undefined);
  }
}

// POST: Create a new scheduled report
export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.reportType || !body.frequency || !body.format) {
      return apiError('Missing required fields: name, reportType, frequency, format', 400);
    }

    const validReportTypes: ReportType[] = ['management-review', 'capa-summary', 'audit-summary', 'compliance-overview', 'training-status', 'risk-profile'];
    const validFrequencies: ReportFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly'];
    const validFormats: ReportFormat[] = ['csv', 'html', 'pdf'];

    if (!validReportTypes.includes(body.reportType)) {
      return apiError(`Invalid reportType. Allowed: ${validReportTypes.join(', ')}`, 400);
    }
    if (!validFrequencies.includes(body.frequency)) {
      return apiError(`Invalid frequency. Allowed: ${validFrequencies.join(', ')}`, 400);
    }
    if (!validFormats.includes(body.format)) {
      return apiError(`Invalid format. Allowed: ${validFormats.join(', ')}`, 400);
    }

    if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return apiError('At least one recipient email is required', 400);
    }

    // Compute nextRunAt based on frequency
    const now = new Date();
    let nextRunAt: Date;
    switch (body.frequency) {
      case 'daily':
        nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        break;
      case 'quarterly':
        nextRunAt = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        break;
      default:
        nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const report: ScheduledReport = {
      id: `sr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: body.name,
      reportType: body.reportType,
      format: body.format,
      frequency: body.frequency,
      status: 'active' as ScheduledReportStatus,
      recipients: body.recipients,
      filters: body.filters,
      nextRunAt: nextRunAt.toISOString(),
      organizationId: 'org-001',
      createdById: 'user-001',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    store.scheduledReports.push(report);
    store.logAudit('CREATE', 'ScheduledReport', report.id, undefined, { name: report.name, reportType: report.reportType, frequency: report.frequency });

    return apiSuccess(report, 201);
  } catch (error) {
    return apiError('Failed to create scheduled report', 500, error instanceof Error ? error.message : undefined);
  }
}
