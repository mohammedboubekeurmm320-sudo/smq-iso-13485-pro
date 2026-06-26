import { getDemoStore } from '../../_lib/demo-data';
import { generateManagementReviewHTML } from '../../_lib/export-service';
import { apiError } from '../../_lib/response';

export async function GET() {
  try {
    const store = getDemoStore();

    const totalDocuments = store.documents.length;
    const approvedDocuments = store.documents.filter(d => d.status === 'Approved').length;
    const draftDocuments = store.documents.filter(d => d.status === 'Draft' || d.status === 'Under Review').length;

    const openCapas = store.capas.filter(c => c.status !== 'Closed').length;
    const closedCapas = store.capas.filter(c => c.status === 'Closed').length;
    const overdueCapas = store.capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date()).length;

    const openNcrs = store.ncrs.filter(n => n.status !== 'Closed').length;
    const closedNcrs = store.ncrs.filter(n => n.status === 'Closed').length;

    const plannedAudits = store.audits.filter(a => a.status === 'Planned').length;
    const completedAudits = store.audits.filter(a => a.status === 'Completed').length;

    const overdueTraining = store.training.filter(t => t.status === 'Overdue').length;
    const completedTraining = store.training.filter(t => t.status === 'Completed').length;

    const highRisks = store.risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length;
    const mitigatedRisks = store.risks.filter(r => r.status === 'Mitigated').length;

    // Simple compliance score calculation
    const complianceScore = Math.round(
      ((approvedDocuments / Math.max(totalDocuments, 1)) * 25 +
        (closedCapas / Math.max(store.capas.length, 1)) * 20 +
        (completedTraining / Math.max(store.training.length, 1)) * 15 +
        (completedAudits / Math.max(store.audits.length, 1)) * 15 +
        (closedNcrs / Math.max(store.ncrs.length, 1)) * 10 +
        (mitigatedRisks / Math.max(store.risks.length, 1)) * 10 +
        (1 - overdueCapas / Math.max(store.capas.length, 1)) * 5)
    );

    const html = generateManagementReviewHTML({
      organizationName: store.getOrganizationName('org-001'),
      period: `${new Date().getFullYear()} Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      totalDocuments,
      approvedDocuments,
      draftDocuments,
      openCapas,
      closedCapas,
      overdueCapas,
      openNcrs,
      closedNcrs,
      plannedAudits,
      completedAudits,
      overdueTraining,
      completedTraining,
      highRisks,
      mitigatedRisks,
      complianceScore: Math.min(complianceScore, 100),
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="management-review-${new Date().toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    return apiError('Failed to generate management review', 500, error instanceof Error ? error.message : undefined);
  }
}
