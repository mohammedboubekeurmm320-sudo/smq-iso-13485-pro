// PDF Service - Management Review Report Generation
// Generates well-formatted HTML for print-to-PDF management review reports

import type {
  Document,
  Capa,
  NonConformance,
  Audit,
  Training,
  Risk,
  BatchRecord,
  Supplier,
  AuditTrail,
} from '@/types/qms';
import { formatDate } from '@/lib/utils';
import { getOrganizationName } from './demo-data';

// ============================================================================
// Types
// ============================================================================

export interface ManagementReviewData {
  documents: Document[];
  capas: Capa[];
  ncrs: NonConformance[];
  audits: Audit[];
  training: Training[];
  risks: Risk[];
  batchRecords: BatchRecord[];
  suppliers: Supplier[];
  auditTrails: AuditTrail[];
}

// ============================================================================
// Metrics Computation
// ============================================================================

function computeDocumentMetrics(documents: Document[]) {
  const total = documents.length;
  const approved = documents.filter(d => d.status === 'Approved').length;
  const draft = documents.filter(d => d.status === 'Draft').length;
  const inReview = documents.filter(d => d.status === 'In Review').length;
  const obsolete = documents.filter(d => d.status === 'Obsolete').length;

  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const overdueReview = documents.filter(d =>
    d.nextReview && new Date(d.nextReview) < now
  ).length;

  return { total, approved, draft, inReview, obsolete, overdueReview };
}

function computeCapaMetrics(capas: Capa[]) {
  const total = capas.length;
  const open = capas.filter(c => c.status === 'Open').length;
  const investigation = capas.filter(c => c.status === 'Investigation').length;
  const implementation = capas.filter(c => c.status === 'Implementation').length;
  const effectivenessCheck = capas.filter(c => c.status === 'Effectiveness Check').length;
  const closed = capas.filter(c => c.status === 'Closed').length;

  const now = new Date();
  const overdue = capas.filter(c =>
    c.dueDate && new Date(c.dueDate) < now && c.status !== 'Closed'
  ).length;

  const critical = capas.filter(c => c.priority === 'Critical').length;
  const high = capas.filter(c => c.priority === 'High').length;

  return { total, open, investigation, implementation, effectivenessCheck, closed, overdue, critical, high };
}

function computeNcrMetrics(ncrs: NonConformance[]) {
  const total = ncrs.length;
  const open = ncrs.filter(n => n.status === 'Open').length;
  const underInvestigation = ncrs.filter(n => n.status === 'Under Investigation').length;
  const pendingDisposition = ncrs.filter(n => n.status === 'Pending Disposition').length;
  const closed = ncrs.filter(n => n.status === 'Closed').length;
  const critical = ncrs.filter(n => n.severity === 'Critical').length;
  const major = ncrs.filter(n => n.severity === 'Major').length;
  const minor = ncrs.filter(n => n.severity === 'Minor').length;

  return { total, open, underInvestigation, pendingDisposition, closed, critical, major, minor };
}

function computeTrainingMetrics(training: Training[]) {
  const total = training.length;
  const planned = training.filter(t => t.status === 'Planned').length;
  const inProgress = training.filter(t => t.status === 'In Progress').length;
  const completed = training.filter(t => t.status === 'Completed').length;
  const overdue = training.filter(t => t.status === 'Overdue').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, planned, inProgress, completed, overdue, completionRate };
}

function computeRiskMetrics(risks: Risk[]) {
  const total = risks.length;
  const critical = risks.filter(r => r.riskLevel === 'Critical').length;
  const high = risks.filter(r => r.riskLevel === 'High').length;
  const medium = risks.filter(r => r.riskLevel === 'Medium').length;
  const low = risks.filter(r => r.riskLevel === 'Low').length;
  const open = risks.filter(r => r.status === 'Open').length;
  const mitigated = risks.filter(r => r.status === 'Mitigated').length;
  const accepted = risks.filter(r => r.status === 'Accepted').length;
  const closed = risks.filter(r => r.status === 'Closed').length;

  const avgRpn = total > 0
    ? Math.round(risks.reduce((sum, r) => sum + r.rpn, 0) / total)
    : 0;

  return { total, critical, high, medium, low, open, mitigated, accepted, closed, avgRpn };
}

function computeAuditMetrics(audits: Audit[]) {
  const total = audits.length;
  const planned = audits.filter(a => a.status === 'Planned').length;
  const inProgress = audits.filter(a => a.status === 'In Progress').length;
  const completed = audits.filter(a => a.status === 'Completed').length;

  const totalFindings = audits.reduce((sum, a) => sum + (a.findings?.length || 0), 0);
  const criticalFindings = audits.reduce((sum, a) =>
    sum + (a.findings?.filter(f => f.severity === 'Critical').length || 0), 0);
  const majorFindings = audits.reduce((sum, a) =>
    sum + (a.findings?.filter(f => f.severity === 'Major').length || 0), 0);

  return { total, planned, inProgress, completed, totalFindings, criticalFindings, majorFindings };
}

function computeBatchMetrics(batchRecords: BatchRecord[]) {
  const total = batchRecords.length;
  const inProgress = batchRecords.filter(b => b.status === 'In Progress').length;
  const pendingQA = batchRecords.filter(b => b.status === 'Pending QA Review').length;
  const released = batchRecords.filter(b => b.status === 'Released').length;
  const rejected = batchRecords.filter(b => b.status === 'Rejected').length;
  const quarantine = batchRecords.filter(b => b.status === 'Quarantine').length;

  return { total, inProgress, pendingQA, released, rejected, quarantine };
}

function computeSupplierMetrics(suppliers: Supplier[]) {
  const total = suppliers.length;
  const qualified = suppliers.filter(s => s.status === 'Qualified').length;
  const conditional = suppliers.filter(s => s.status === 'Conditional').length;
  const disqualified = suppliers.filter(s => s.status === 'Disqualified').length;
  const underEvaluation = suppliers.filter(s => s.status === 'Under Evaluation').length;

  const avgScore = suppliers.filter(s => s.performanceScore && s.performanceScore > 0).length > 0
    ? Math.round(
        suppliers
          .filter(s => s.performanceScore && s.performanceScore > 0)
          .reduce((sum, s) => sum + (s.performanceScore || 0), 0) /
        suppliers.filter(s => s.performanceScore && s.performanceScore > 0).length
      )
    : 0;

  return { total, qualified, conditional, disqualified, underEvaluation, avgScore };
}

function computeComplianceScore(data: ManagementReviewData): number {
  const docMetrics = computeDocumentMetrics(data.documents);
  const capaMetrics = computeCapaMetrics(data.capas);
  const trainMetrics = computeTrainingMetrics(data.training);
  const auditMetrics = computeAuditMetrics(data.audits);

  const docScore = docMetrics.total > 0
    ? Math.round((docMetrics.approved / docMetrics.total) * 100)
    : 100;
  const capaScore = capaMetrics.total > 0
    ? Math.round((capaMetrics.closed / capaMetrics.total) * 100)
    : 100;
  const trainScore = trainMetrics.completionRate;
  const auditScore = auditMetrics.total > 0
    ? Math.round((auditMetrics.completed / auditMetrics.total) * 100)
    : 100;

  return Math.round(docScore * 0.3 + capaScore * 0.3 + trainScore * 0.2 + auditScore * 0.2);
}

// ============================================================================
// HTML Generation Helpers
// ============================================================================

function metricCard(label: string, value: string | number, color = '#1a1a2e'): string {
  return `
    <div class="metric-card">
      <div class="metric-value" style="color: ${color}">${value}</div>
      <div class="metric-label">${label}</div>
    </div>`;
}

function statusRow(label: string, count: number, color: string): string {
  return `
    <div class="status-row">
      <span class="status-dot" style="background: ${color}"></span>
      <span class="status-label">${label}</span>
      <span class="status-count">${count}</span>
    </div>`;
}

function tableHeader(columns: string[]): string {
  return `<tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>`;
}

function tableRow(cells: string[]): string {
  return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

// ============================================================================
// Main HTML Report Generator
// ============================================================================

export function generateManagementReviewHTML(data: ManagementReviewData): string {
  const orgName = getOrganizationName();
  const generatedAt = new Date().toISOString();
  const complianceScore = computeComplianceScore(data);

  const docMetrics = computeDocumentMetrics(data.documents);
  const capaMetrics = computeCapaMetrics(data.capas);
  const ncrMetrics = computeNcrMetrics(data.ncrs);
  const trainMetrics = computeTrainingMetrics(data.training);
  const riskMetrics = computeRiskMetrics(data.risks);
  const auditMetrics = computeAuditMetrics(data.audits);
  const batchMetrics = computeBatchMetrics(data.batchRecords);
  const supplierMetrics = computeSupplierMetrics(data.suppliers);

  const totalOverdue = capaMetrics.overdue + trainMetrics.overdue;
  const totalOpenItems = capaMetrics.open + capaMetrics.investigation + capaMetrics.implementation +
    ncrMetrics.open + ncrMetrics.underInvestigation + ncrMetrics.pendingDisposition;

  const scoreColor = complianceScore >= 80 ? '#16a34a' : complianceScore >= 60 ? '#d97706' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Management Review Report - ${orgName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px;
    }

    /* Header */
    .report-header {
      text-align: center;
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .report-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .report-header .org-name {
      font-size: 20px;
      color: #555;
      margin-bottom: 16px;
    }
    .report-header .meta {
      font-size: 13px;
      color: #777;
    }

    /* Compliance Score */
    .compliance-section {
      text-align: center;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .compliance-score {
      font-size: 72px;
      font-weight: 800;
      margin: 10px 0;
    }
    .compliance-label {
      font-size: 18px;
      color: #555;
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .summary-card .label {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }

    /* Section */
    .section {
      margin-bottom: 36px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    /* Metrics Row */
    .metrics-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 16px 20px;
      min-width: 120px;
      text-align: center;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 700;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    /* Status Breakdown */
    .status-breakdown {
      margin-bottom: 20px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-label {
      flex: 1;
      font-size: 14px;
    }
    .status-count {
      font-weight: 600;
      font-size: 14px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }
    th {
      background: #1a1a2e;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:nth-child(even) td {
      background: #f8f9fa;
    }

    /* Footer */
    .report-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #1a1a2e;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    .report-footer .disclaimer {
      margin-top: 12px;
      font-style: italic;
    }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #e0e7ff; color: #3730a3; }
    .badge-low { background: #dcfce7; color: #166534; }
    .badge-open { background: #fee2e2; color: #991b1b; }
    .badge-closed { background: #dcfce7; color: #166534; }
    .badge-progress { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="report-header">
      <h1>Management Review Report</h1>
      <div class="org-name">${orgName}</div>
      <div class="meta">
        Generated: ${formatDate(generatedAt)} | Report Period: All Data | 
        Compliance Standard: ISO 13485:2016 / FDA 21 CFR 820
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="compliance-section">
      <div class="compliance-label">Overall Compliance Score</div>
      <div class="compliance-score" style="color: ${scoreColor}">${complianceScore}%</div>
      <div class="compliance-label">${complianceScore >= 80 ? 'Compliant' : complianceScore >= 60 ? 'Needs Improvement' : 'Non-Compliant'}</div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="value" style="color: #dc2626">${totalOverdue}</div>
        <div class="label">Overdue Items</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: #d97706">${totalOpenItems}</div>
        <div class="label">Open Items</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: #16a34a">${capaMetrics.closed + ncrMetrics.closed}</div>
        <div class="label">Closed Items</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.auditTrails.length}</div>
        <div class="label">Audit Trail Entries</div>
      </div>
    </div>

    <!-- Documents Section -->
    <div class="section">
      <h2 class="section-title">Document Control</h2>
      <div class="metrics-row">
        ${metricCard('Total Documents', docMetrics.total)}
        ${metricCard('Approved', docMetrics.approved, '#16a34a')}
        ${metricCard('Draft', docMetrics.draft, '#d97706')}
        ${metricCard('In Review', docMetrics.inReview, '#2563eb')}
        ${metricCard('Overdue Review', docMetrics.overdueReview, '#dc2626')}
      </div>
      <table>
        <thead>${tableHeader(['Doc Number', 'Title', 'Type', 'Version', 'Status', 'Owner', 'Effective Date'])}</thead>
        <tbody>
          ${data.documents.map(d => tableRow([
            d.documentNumber,
            d.title,
            d.type,
            d.version,
            `<span class="badge badge-${d.status === 'Approved' ? 'closed' : d.status === 'Draft' ? 'medium' : 'progress'}">${d.status}</span>`,
            d.owner || '-',
            formatDate(d.effectiveDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- CAPAs Section -->
    <div class="section">
      <h2 class="section-title">Corrective & Preventive Actions (CAPA)</h2>
      <div class="metrics-row">
        ${metricCard('Total CAPAs', capaMetrics.total)}
        ${metricCard('Open', capaMetrics.open, '#dc2626')}
        ${metricCard('In Investigation', capaMetrics.investigation, '#d97706')}
        ${metricCard('In Implementation', capaMetrics.implementation, '#2563eb')}
        ${metricCard('Closed', capaMetrics.closed, '#16a34a')}
        ${metricCard('Overdue', capaMetrics.overdue, '#dc2626')}
      </div>
      <div class="status-breakdown">
        <h3 style="font-size:14px;margin-bottom:8px;color:#555">Priority Distribution</h3>
        ${statusRow('Critical', capaMetrics.critical, '#dc2626')}
        ${statusRow('High', capaMetrics.high, '#d97706')}
      </div>
      <table>
        <thead>${tableHeader(['CAPA Number', 'Title', 'Type', 'Status', 'Priority', 'Source', 'Assigned To', 'Due Date'])}</thead>
        <tbody>
          ${data.capas.map(c => tableRow([
            c.capaNumber,
            c.title,
            c.type,
            `<span class="badge badge-${c.status === 'Closed' ? 'closed' : c.status === 'Open' ? 'open' : 'progress'}">${c.status}</span>`,
            c.priority ? `<span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span>` : '-',
            c.source || '-',
            c.assignedTo,
            formatDate(c.dueDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- NCRs Section -->
    <div class="section page-break">
      <h2 class="section-title">Non-Conformances</h2>
      <div class="metrics-row">
        ${metricCard('Total NCRs', ncrMetrics.total)}
        ${metricCard('Open', ncrMetrics.open, '#dc2626')}
        ${metricCard('Under Investigation', ncrMetrics.underInvestigation, '#d97706')}
        ${metricCard('Closed', ncrMetrics.closed, '#16a34a')}
      </div>
      <div class="status-breakdown">
        <h3 style="font-size:14px;margin-bottom:8px;color:#555">Severity Distribution</h3>
        ${statusRow('Critical', ncrMetrics.critical, '#dc2626')}
        ${statusRow('Major', ncrMetrics.major, '#d97706')}
        ${statusRow('Minor', ncrMetrics.minor, '#16a34a')}
      </div>
      <table>
        <thead>${tableHeader(['NCR Number', 'Title', 'Type', 'Status', 'Severity', 'Lot Number', 'Disposition', 'Created'])}</thead>
        <tbody>
          ${data.ncrs.map(n => tableRow([
            n.ncrNumber,
            n.title,
            n.type,
            `<span class="badge badge-${n.status === 'Closed' ? 'closed' : n.status === 'Open' ? 'open' : 'progress'}">${n.status}</span>`,
            n.severity ? `<span class="badge badge-${n.severity.toLowerCase()}">${n.severity}</span>` : '-',
            n.lotNumber || '-',
            n.disposition || '-',
            formatDate(n.createdDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Training Section -->
    <div class="section">
      <h2 class="section-title">Training Compliance</h2>
      <div class="metrics-row">
        ${metricCard('Total Training', trainMetrics.total)}
        ${metricCard('Completed', trainMetrics.completed, '#16a34a')}
        ${metricCard('In Progress', trainMetrics.inProgress, '#2563eb')}
        ${metricCard('Overdue', trainMetrics.overdue, '#dc2626')}
        ${metricCard('Completion Rate', trainMetrics.completionRate + '%', trainMetrics.completionRate >= 80 ? '#16a34a' : '#d97706')}
      </div>
      <table>
        <thead>${tableHeader(['Title', 'Type', 'Status', 'Assigned To', 'Due Date', 'Completed Date'])}</thead>
        <tbody>
          ${data.training.map(t => tableRow([
            t.title,
            t.type,
            `<span class="badge badge-${t.status === 'Completed' ? 'closed' : t.status === 'Overdue' ? 'open' : 'progress'}">${t.status}</span>`,
            t.assignedTo,
            formatDate(t.dueDate),
            formatDate(t.completedDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Risks Section -->
    <div class="section page-break">
      <h2 class="section-title">Risk Management</h2>
      <div class="metrics-row">
        ${metricCard('Total Risks', riskMetrics.total)}
        ${metricCard('Critical', riskMetrics.critical, '#dc2626')}
        ${metricCard('High', riskMetrics.high, '#d97706')}
        ${metricCard('Medium', riskMetrics.medium, '#2563eb')}
        ${metricCard('Low', riskMetrics.low, '#16a34a')}
        ${metricCard('Avg RPN', riskMetrics.avgRpn)}
      </div>
      <div class="status-breakdown">
        <h3 style="font-size:14px;margin-bottom:8px;color:#555">Status Distribution</h3>
        ${statusRow('Open', riskMetrics.open, '#dc2626')}
        ${statusRow('Mitigated', riskMetrics.mitigated, '#16a34a')}
        ${statusRow('Accepted', riskMetrics.accepted, '#d97706')}
        ${statusRow('Closed', riskMetrics.closed, '#6b7280')}
      </div>
      <table>
        <thead>${tableHeader(['Risk Number', 'Title', 'Category', 'P', 'I', 'D', 'RPN', 'Level', 'Status'])}</thead>
        <tbody>
          ${data.risks.map(r => tableRow([
            r.riskNumber,
            r.title,
            r.category || '-',
            String(r.probability),
            String(r.impact),
            String(r.detectability),
            String(r.rpn),
            `<span class="badge badge-${r.riskLevel.toLowerCase()}">${r.riskLevel}</span>`,
            r.status,
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Audits Section -->
    <div class="section">
      <h2 class="section-title">Audit Management</h2>
      <div class="metrics-row">
        ${metricCard('Total Audits', auditMetrics.total)}
        ${metricCard('Completed', auditMetrics.completed, '#16a34a')}
        ${metricCard('In Progress', auditMetrics.inProgress, '#d97706')}
        ${metricCard('Planned', auditMetrics.planned, '#2563eb')}
        ${metricCard('Total Findings', auditMetrics.totalFindings)}
        ${metricCard('Critical Findings', auditMetrics.criticalFindings, '#dc2626')}
      </div>
      <table>
        <thead>${tableHeader(['Audit Number', 'Title', 'Type', 'Status', 'Lead Auditor', 'Scheduled Date', 'Findings'])}</thead>
        <tbody>
          ${data.audits.map(a => tableRow([
            a.auditNumber,
            a.title,
            a.type,
            `<span class="badge badge-${a.status === 'Completed' ? 'closed' : a.status === 'Planned' ? 'medium' : 'progress'}">${a.status}</span>`,
            a.leadAuditor,
            formatDate(a.scheduledDate),
            String(a.findings?.length || 0),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Batch Records Section -->
    <div class="section page-break">
      <h2 class="section-title">Batch Records</h2>
      <div class="metrics-row">
        ${metricCard('Total Batches', batchMetrics.total)}
        ${metricCard('In Progress', batchMetrics.inProgress, '#d97706')}
        ${metricCard('Released', batchMetrics.released, '#16a34a')}
        ${metricCard('Quarantine', batchMetrics.quarantine, '#dc2626')}
      </div>
      <table>
        <thead>${tableHeader(['Lot Number', 'Product', 'Batch Size', 'Status', 'Mfg Date', 'Expiry Date', 'QA Release'])}</thead>
        <tbody>
          ${data.batchRecords.map(b => tableRow([
            b.lotNumber,
            b.productName,
            b.batchSize ? `${b.batchSize} ${b.batchSizeUnit || ''}` : '-',
            `<span class="badge badge-${b.status === 'Released' ? 'closed' : b.status === 'Quarantine' || b.status === 'Rejected' ? 'open' : 'progress'}">${b.status}</span>`,
            formatDate(b.manufacturingDate),
            formatDate(b.expiryDate),
            formatDate(b.qaReleaseDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Suppliers Section -->
    <div class="section">
      <h2 class="section-title">Supplier Management</h2>
      <div class="metrics-row">
        ${metricCard('Total Suppliers', supplierMetrics.total)}
        ${metricCard('Qualified', supplierMetrics.qualified, '#16a34a')}
        ${metricCard('Conditional', supplierMetrics.conditional, '#d97706')}
        ${metricCard('Under Evaluation', supplierMetrics.underEvaluation, '#2563eb')}
        ${metricCard('Avg Performance', supplierMetrics.avgScore + '/100', supplierMetrics.avgScore >= 80 ? '#16a34a' : '#d97706')}
      </div>
      <table>
        <thead>${tableHeader(['Code', 'Name', 'Category', 'Status', 'Performance', 'Certifications', 'Next Review'])}</thead>
        <tbody>
          ${data.suppliers.map(s => tableRow([
            s.supplierCode,
            s.name,
            s.category || '-',
            `<span class="badge badge-${s.status === 'Qualified' ? 'closed' : s.status === 'Disqualified' ? 'open' : 'progress'}">${s.status}</span>`,
            s.performanceScore ? s.performanceScore + '/100' : '-',
            Array.isArray(s.certifications) ? s.certifications.join(', ') : '-',
            formatDate(s.nextReviewDate),
          ])).join('')}
        </tbody>
      </table>
    </div>

    <!-- Audit Trail Summary -->
    <div class="section page-break">
      <h2 class="section-title">Audit Trail Summary (21 CFR Part 11)</h2>
      <div class="metrics-row">
        ${metricCard('Total Entries', data.auditTrails.length)}
        ${metricCard('CREATE', data.auditTrails.filter(a => a.action === 'CREATE').length)}
        ${metricCard('UPDATE', data.auditTrails.filter(a => a.action === 'UPDATE').length)}
        ${metricCard('APPROVE', data.auditTrails.filter(a => a.action === 'APPROVE').length)}
        ${metricCard('SIGN', data.auditTrails.filter(a => a.action === 'SIGN').length)}
      </div>
      <table>
        <thead>${tableHeader(['Timestamp (UTC)', 'User', 'Action', 'Table', 'Record ID', 'Details'])}</thead>
        <tbody>
          ${data.auditTrails.slice(0, 50).map(a => tableRow([
            a.createdAt,
            a.userEmail || a.userId || '-',
            `<span class="badge badge-${a.action === 'DELETE' ? 'open' : a.action === 'CREATE' ? 'closed' : 'progress'}">${a.action}</span>`,
            a.tableName,
            a.recordId || '-',
            a.newValues ? Object.keys(a.newValues).join(', ') : '-',
          ])).join('')}
        </tbody>
      </table>
      ${data.auditTrails.length > 50 ? '<p style="font-size:12px;color:#777;text-align:center">Showing 50 most recent entries. Export full audit trail via CSV for complete data.</p>' : ''}
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <p>Management Review Report — ${orgName}</p>
      <p>Generated: ${formatDate(generatedAt)} | Report ID: MRR-${Date.now().toString(36).toUpperCase()}</p>
      <p class="disclaimer">
        This report is generated from the QMS SaaS Pro system and is compliant with 
        ISO 13485:2016 and FDA 21 CFR Part 11 requirements. 
        This document should be retained per applicable record retention requirements.
      </p>
    </div>
  </div>
</body>
</html>`;
}
