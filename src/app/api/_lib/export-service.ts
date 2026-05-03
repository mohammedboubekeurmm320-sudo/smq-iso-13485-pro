// CSV / PDF export service for QMS entities
// 21 CFR Part 11 compliant audit trail export

import type { Document, Capa, NonConformance, Audit, Training, Risk, BatchRecord, Supplier, AuditTrail } from '@/types/qms';

// ============================================================================
// Generic CSV generator
// ============================================================================

export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const headerRow = columns.map(c => `"${c.header}"`).join(',');
  const rows = data.map(item =>
    columns.map(c => {
      const val = item[c.key];
      if (val === null || val === undefined) return '""';
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

// ============================================================================
// 21 CFR Part 11 compliant audit trail CSV
// ============================================================================

export function generateAuditTrailCSV(trails: AuditTrail[]): string {
  const columns: { key: keyof AuditTrail; header: string }[] = [
    { key: 'id', header: 'Audit Trail ID' },
    { key: 'action', header: 'Action' },
    { key: 'tableName', header: 'Table Name' },
    { key: 'recordId', header: 'Record ID' },
    { key: 'userId', header: 'User ID' },
    { key: 'userEmail', header: 'User Email' },
    { key: 'oldValues', header: 'Old Values' },
    { key: 'newValues', header: 'New Values' },
    { key: 'ipAddress', header: 'IP Address' },
    { key: 'userAgent', header: 'User Agent' },
    { key: 'organizationId', header: 'Organization ID' },
    { key: 'createdAt', header: 'Timestamp (UTC)' },
  ];
  return generateCSV(trails, columns);
}

// ============================================================================
// Entity-specific CSV generators
// ============================================================================

export function generateDocumentsCSV(documents: Document[]): string {
  const columns: { key: keyof Document; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'documentNumber', header: 'Document Number' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'version', header: 'Version' },
    { key: 'status', header: 'Status' },
    { key: 'effectiveDate', header: 'Effective Date' },
    { key: 'expirationDate', header: 'Expiration Date' },
    { key: 'owner', header: 'Owner' },
    { key: 'department', header: 'Department' },
    { key: 'classification', header: 'Classification' },
    { key: 'retentionPeriod', header: 'Retention Period' },
    { key: 'createdAt', header: 'Created At' },
    { key: 'updatedAt', header: 'Updated At' },
  ];
  return generateCSV(documents, columns);
}

export function generateCapasCSV(capas: Capa[]): string {
  const columns: { key: keyof Capa; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'capaNumber', header: 'CAPA Number' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'priority', header: 'Priority' },
    { key: 'source', header: 'Source' },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'createdDate', header: 'Created Date' },
    { key: 'closedDate', header: 'Closed Date' },
    { key: 'rootCauseCategory', header: 'Root Cause Category' },
    { key: 'effectivenessResult', header: 'Effectiveness Result' },
  ];
  return generateCSV(capas, columns);
}

export function generateNcrsCSV(ncrs: NonConformance[]): string {
  const columns: { key: keyof NonConformance; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'ncrNumber', header: 'NCR Number' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'severity', header: 'Severity' },
    { key: 'description', header: 'Description' },
    { key: 'lotNumber', header: 'Lot Number' },
    { key: 'disposition', header: 'Disposition' },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'createdDate', header: 'Created Date' },
  ];
  return generateCSV(ncrs, columns);
}

export function generateAuditsCSV(audits: Audit[]): string {
  const columns: { key: keyof Audit; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'auditNumber', header: 'Audit Number' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'leadAuditor', header: 'Lead Auditor' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'completedDate', header: 'Completed Date' },
  ];
  return generateCSV(audits, columns);
}

export function generateTrainingCSV(training: Training[]): string {
  const columns: { key: keyof Training; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'completedDate', header: 'Completed Date' },
  ];
  return generateCSV(training, columns);
}

export function generateRisksCSV(risks: Risk[]): string {
  const columns: { key: keyof Risk; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'riskNumber', header: 'Risk Number' },
    { key: 'title', header: 'Title' },
    { key: 'category', header: 'Category' },
    { key: 'probability', header: 'Probability' },
    { key: 'impact', header: 'Impact' },
    { key: 'detectability', header: 'Detectability' },
    { key: 'rpn', header: 'RPN' },
    { key: 'riskLevel', header: 'Risk Level' },
    { key: 'status', header: 'Status' },
  ];
  return generateCSV(risks, columns);
}

export function generateBatchRecordsCSV(records: BatchRecord[]): string {
  const columns: { key: keyof BatchRecord; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'lotNumber', header: 'Lot Number' },
    { key: 'productName', header: 'Product Name' },
    { key: 'productCode', header: 'Product Code' },
    { key: 'batchSize', header: 'Batch Size' },
    { key: 'status', header: 'Status' },
    { key: 'manufacturingDate', header: 'Manufacturing Date' },
    { key: 'expiryDate', header: 'Expiry Date' },
  ];
  return generateCSV(records, columns);
}

export function generateSuppliersCSV(suppliers: Supplier[]): string {
  const columns: { key: keyof Supplier; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'supplierCode', header: 'Supplier Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'status', header: 'Status' },
    { key: 'performanceScore', header: 'Performance Score' },
    { key: 'qualificationDate', header: 'Qualification Date' },
    { key: 'nextReviewDate', header: 'Next Review Date' },
  ];
  return generateCSV(suppliers, columns);
}

// ============================================================================
// Management Review HTML Report (for print-to-PDF)
// ============================================================================

export function generateManagementReviewHTML(data: {
  organizationName: string;
  period: string;
  totalDocuments: number;
  approvedDocuments: number;
  draftDocuments: number;
  openCapas: number;
  closedCapas: number;
  overdueCapas: number;
  openNcrs: number;
  closedNcrs: number;
  plannedAudits: number;
  completedAudits: number;
  overdueTraining: number;
  completedTraining: number;
  highRisks: number;
  mitigatedRisks: number;
  complianceScore: number;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Management Review Report — ${data.organizationName}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 40px; color: #1a1a1a; }
    h1 { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; }
    h2 { color: #0f766e; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background: #0f766e; color: white; }
    tr:nth-child(even) { background: #f3f4f6; }
    .score { font-size: 48px; text-align: center; color: #0f766e; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #d1d5db; padding-top: 10px; }
    .badge-critical { color: #dc2626; font-weight: bold; }
    .badge-high { color: #ea580c; font-weight: bold; }
    .badge-good { color: #16a34a; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Management Review Report</h1>
  <p style="text-align:center"><strong>${data.organizationName}</strong> | Period: ${data.period}</p>
  <p style="text-align:center">Generated: ${new Date().toISOString()}</p>

  <div style="text-align:center; margin: 30px 0;">
    <div class="score">${data.complianceScore}%</div>
    <p>Overall Compliance Score</p>
  </div>

  <h2>Document Control</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>Total Documents</td><td>${data.totalDocuments}</td></tr>
    <tr><td>Approved</td><td class="badge-good">${data.approvedDocuments}</td></tr>
    <tr><td>Draft / In Review</td><td>${data.draftDocuments}</td></tr>
  </table>

  <h2>CAPA Status</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>Open CAPAs</td><td>${data.openCapas}</td></tr>
    <tr><td>Closed CAPAs</td><td class="badge-good">${data.closedCapas}</td></tr>
    <tr><td>Overdue CAPAs</td><td class="${data.overdueCapas > 0 ? 'badge-critical' : 'badge-good'}">${data.overdueCapas}</td></tr>
  </table>

  <h2>Non-Conformances</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>Open NCRs</td><td>${data.openNcrs}</td></tr>
    <tr><td>Closed NCRs</td><td class="badge-good">${data.closedNcrs}</td></tr>
  </table>

  <h2>Audits</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>Planned</td><td>${data.plannedAudits}</td></tr>
    <tr><td>Completed</td><td class="badge-good">${data.completedAudits}</td></tr>
  </table>

  <h2>Training</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>Overdue Training</td><td class="${data.overdueTraining > 0 ? 'badge-high' : 'badge-good'}">${data.overdueTraining}</td></tr>
    <tr><td>Completed</td><td class="badge-good">${data.completedTraining}</td></tr>
  </table>

  <h2>Risk Profile</h2>
  <table>
    <tr><th>Metric</th><th>Count</th></tr>
    <tr><td>High / Critical Risks</td><td class="${data.highRisks > 0 ? 'badge-high' : 'badge-good'}">${data.highRisks}</td></tr>
    <tr><td>Mitigated Risks</td><td class="badge-good">${data.mitigatedRisks}</td></tr>
  </table>

  <div class="footer">
    <p>This report is generated from QMS SaaS Pro and is intended for management review purposes only.<br/>
    21 CFR Part 11 compliant — electronic records with audit trail.</p>
  </div>
</body>
</html>`;
}
