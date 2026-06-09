// CSV Import Service for QMS entities
// RFC 4180 compliant CSV parser with BOM handling, validation, and entity mapping

// ============================================================================
// CSV Parser (RFC 4180 compliant)
// ============================================================================

/**
 * Parse CSV content into structured data.
 * Handles:
 * - BOM characters at the start of UTF-8 files
 * - Quoted fields (fields enclosed in double quotes)
 * - Escaped quotes (double quotes within quoted fields represented as "")
 * - Newlines within quoted fields
 * - Trailing commas / empty fields
 */
export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM if present
  let csv = content;
  if (csv.charCodeAt(0) === 0xfeff) {
    csv = csv.slice(1);
  }

  const rows: Record<string, string>[] = [];
  const records = parseCSVRecords(csv);

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map(h => h.trim());
  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = idx < record.length ? record[idx] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse CSV string into an array of string arrays (records).
 * Handles quoted fields and escaped quotes per RFC 4180.
 */
function parseCSVRecords(csv: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRecord.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r') {
        // Handle \r\n or standalone \r
        currentRecord.push(currentField);
        currentField = '';
        if (i + 1 < csv.length && csv[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        if (currentRecord.length > 0 || currentField !== '') {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else if (char === '\n') {
        currentRecord.push(currentField);
        currentField = '';
        i++;
        if (currentRecord.length > 0 || currentField !== '') {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/record
  currentRecord.push(currentField);
  if (currentRecord.some(f => f.length > 0)) {
    records.push(currentRecord);
  }

  return records;
}

// ============================================================================
// Entity Type Definitions for Import
// ============================================================================

interface FieldMapping {
  csvHeader: string;
  entityField: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  enumValues?: string[];
  defaultValue?: string;
}

const ENTITY_MAPPINGS: Record<string, FieldMapping[]> = {
  document: [
    { csvHeader: 'Document Number', entityField: 'documentNumber', required: true },
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Type', entityField: 'type', required: true, type: 'enum', enumValues: ['SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical', 'Risk Analysis', 'Validation Protocol', 'Record', 'Manual', 'Instruction', 'Register', 'Master Batch', 'Procedure', 'Process Map', 'Organigram', 'MANUEL', 'POLITIQUE', 'INDICATEUR', 'PROCESS_MAP', 'ORGANIGRAMME', 'REGLEMENTAIRE', 'MAPPING', 'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT', 'MASTER_BATCH'] },
    { csvHeader: 'Version', entityField: 'version', defaultValue: '1.0' },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn'], defaultValue: 'Draft' },
    { csvHeader: 'Effective Date', entityField: 'effectiveDate', type: 'date' },
    { csvHeader: 'Expiration Date', entityField: 'expirationDate', type: 'date' },
    { csvHeader: 'Owner', entityField: 'owner' },
    { csvHeader: 'Department', entityField: 'department' },
    { csvHeader: 'Description', entityField: 'description' },
    { csvHeader: 'Classification', entityField: 'classification', type: 'enum', enumValues: ['Internal', 'External', 'Regulatory', 'Confidential'] },
    { csvHeader: 'Retention Period', entityField: 'retentionPeriod' },
    { csvHeader: 'Scope', entityField: 'scope' },
    { csvHeader: 'References', entityField: 'references' },
    { csvHeader: 'Document Level', entityField: 'documentLevel', type: 'number' },
    { csvHeader: 'ISO Clause', entityField: 'isoClause' },
  ],
  capa: [
    { csvHeader: 'CAPA Number', entityField: 'capaNumber', required: true },
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Type', entityField: 'type', required: true, type: 'enum', enumValues: ['Corrective', 'Preventive'] },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'], defaultValue: 'Open' },
    { csvHeader: 'Priority', entityField: 'priority', type: 'enum', enumValues: ['Critical', 'High', 'Medium', 'Low'] },
    { csvHeader: 'Source', entityField: 'source', type: 'enum', enumValues: ['Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue'] },
    { csvHeader: 'Description', entityField: 'description', required: true },
    { csvHeader: 'Root Cause Category', entityField: 'rootCauseCategory', type: 'enum', enumValues: ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management'] },
    { csvHeader: 'Corrective Action', entityField: 'correctiveAction' },
    { csvHeader: 'Assigned To', entityField: 'assignedTo', required: true },
    { csvHeader: 'Due Date', entityField: 'dueDate', required: true, type: 'date' },
    { csvHeader: 'Created Date', entityField: 'createdDate', required: true, type: 'date' },
  ],
  ncr: [
    { csvHeader: 'NCR Number', entityField: 'ncrNumber', required: true },
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Type', entityField: 'type', required: true, type: 'enum', enumValues: ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'] },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], defaultValue: 'Open' },
    { csvHeader: 'Severity', entityField: 'severity', type: 'enum', enumValues: ['Critical', 'Major', 'Minor'] },
    { csvHeader: 'Description', entityField: 'description', required: true },
    { csvHeader: 'Lot Number', entityField: 'lotNumber' },
    { csvHeader: 'Quantity Affected', entityField: 'quantityAffected', type: 'number' },
    { csvHeader: 'Disposition', entityField: 'disposition', type: 'enum', enumValues: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending'] },
    { csvHeader: 'Assigned To', entityField: 'assignedTo' },
    { csvHeader: 'Created Date', entityField: 'createdDate', required: true, type: 'date' },
  ],
  training: [
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Description', entityField: 'description' },
    { csvHeader: 'Type', entityField: 'type', required: true, type: 'enum', enumValues: ['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'] },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Planned', 'In Progress', 'Completed', 'Overdue'], defaultValue: 'Planned' },
    { csvHeader: 'Assigned To', entityField: 'assignedTo', required: true },
    { csvHeader: 'Due Date', entityField: 'dueDate', required: true, type: 'date' },
    { csvHeader: 'Completed Date', entityField: 'completedDate', type: 'date' },
  ],
  supplier: [
    { csvHeader: 'Supplier Code', entityField: 'supplierCode', required: true },
    { csvHeader: 'Name', entityField: 'name', required: true },
    { csvHeader: 'Category', entityField: 'category', type: 'enum', enumValues: ['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other'] },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Qualified', 'Conditional', 'Disqualified', 'Under Evaluation'], defaultValue: 'Under Evaluation' },
    { csvHeader: 'Qualification Date', entityField: 'qualificationDate', type: 'date' },
    { csvHeader: 'Next Review Date', entityField: 'nextReviewDate', type: 'date' },
    { csvHeader: 'Performance Score', entityField: 'performanceScore', type: 'number' },
    { csvHeader: 'Primary Contact Name', entityField: 'primaryContactName' },
    { csvHeader: 'Primary Contact Email', entityField: 'primaryContactEmail' },
    { csvHeader: 'Primary Contact Phone', entityField: 'primaryContactPhone' },
    { csvHeader: 'City', entityField: 'city' },
    { csvHeader: 'Country', entityField: 'country' },
  ],
  risk: [
    { csvHeader: 'Risk Number', entityField: 'riskNumber', required: true },
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Category', entityField: 'category', type: 'enum', enumValues: ['Product', 'Process', 'System', 'Supplier'] },
    { csvHeader: 'Probability', entityField: 'probability', required: true, type: 'number' },
    { csvHeader: 'Impact', entityField: 'impact', required: true, type: 'number' },
    { csvHeader: 'Detectability', entityField: 'detectability', required: true, type: 'number' },
    { csvHeader: 'RPN', entityField: 'rpn', type: 'number' },
    { csvHeader: 'Risk Level', entityField: 'riskLevel', required: true, type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'] },
    { csvHeader: 'Mitigation', entityField: 'mitigation' },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Open', 'Mitigated', 'Accepted', 'Closed'], defaultValue: 'Open' },
  ],
  deviation: [
    { csvHeader: 'Deviation Number', entityField: 'devNumber', required: true },
    { csvHeader: 'Title', entityField: 'title', required: true },
    { csvHeader: 'Type', entityField: 'type', required: true, type: 'enum', enumValues: ['Planned', 'Unplanned'] },
    { csvHeader: 'Status', entityField: 'status', type: 'enum', enumValues: ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'], defaultValue: 'Open' },
    { csvHeader: 'Severity', entityField: 'severity', required: true, type: 'enum', enumValues: ['Critical', 'Major', 'Minor'] },
    { csvHeader: 'Category', entityField: 'category', required: true, type: 'enum', enumValues: ['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation'] },
    { csvHeader: 'Description', entityField: 'description', required: true },
    { csvHeader: 'Deviation Details', entityField: 'deviationDetails', required: true },
    { csvHeader: 'Assigned To', entityField: 'assignedTo', required: true },
    { csvHeader: 'Due Date', entityField: 'dueDate', required: true, type: 'date' },
    { csvHeader: 'Lot Number', entityField: 'lotNumber' },
    { csvHeader: 'Product Code', entityField: 'productCode' },
  ],
};

// ============================================================================
// Validation
// ============================================================================

export function validateImportData(
  entityType: string,
  rows: Record<string, string>[],
): {
  valid: Record<string, string>[];
  invalid: { row: number; errors: string[] }[];
} {
  const mapping = ENTITY_MAPPINGS[entityType];
  if (!mapping) {
    return {
      valid: [],
      invalid: rows.map((_, idx) => ({ row: idx + 1, errors: [`Unknown entity type: ${entityType}`] })),
    };
  }

  const valid: Record<string, string>[] = [];
  const invalid: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    for (const field of mapping) {
      const value = row[field.csvHeader]?.trim();

      // Required field check
      if (field.required && (!value || value === '')) {
        errors.push(`Missing required field: "${field.csvHeader}"`);
        continue;
      }

      // Skip further validation if empty and not required
      if (!value || value === '') continue;

      // Type validation
      if (field.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`Invalid number for "${field.csvHeader}": "${value}"`);
        }
      }

      if (field.type === 'date') {
        const parsed = Date.parse(value);
        if (isNaN(parsed)) {
          errors.push(`Invalid date format for "${field.csvHeader}": "${value}" (expected YYYY-MM-DD or ISO format)`);
        }
      }

      if (field.type === 'enum' && field.enumValues) {
        if (!field.enumValues.includes(value)) {
          errors.push(`Invalid value for "${field.csvHeader}": "${value}" (allowed: ${field.enumValues.join(', ')})`);
        }
      }

      if (field.type === 'boolean') {
        const lower = value.toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
          errors.push(`Invalid boolean for "${field.csvHeader}": "${value}" (expected: true/false, yes/no, 1/0)`);
        }
      }
    }

    if (errors.length > 0) {
      invalid.push({ row: i + 1, errors });
    } else {
      valid.push(row);
    }
  }

  return { valid, invalid };
}

// ============================================================================
// Entity Mapping with Type Coercion
// ============================================================================

export function mapCsvToEntity(entityType: string, row: Record<string, string>): Record<string, unknown> {
  const mapping = ENTITY_MAPPINGS[entityType];
  if (!mapping) return {};

  const entity: Record<string, unknown> = {};

  for (const field of mapping) {
    let value = row[field.csvHeader]?.trim();

    // Apply default if empty
    if ((!value || value === '') && field.defaultValue) {
      value = field.defaultValue;
    }

    // Skip if still empty
    if (!value || value === '') continue;

    // Type coercion
    switch (field.type) {
      case 'number': {
        const num = Number(value);
        if (!isNaN(num)) {
          entity[field.entityField] = num;
        }
        break;
      }
      case 'date': {
        const parsed = Date.parse(value);
        if (!isNaN(parsed)) {
          entity[field.entityField] = new Date(parsed).toISOString().split('T')[0];
        }
        break;
      }
      case 'boolean': {
        const lower = value.toLowerCase();
        entity[field.entityField] = ['true', '1', 'yes'].includes(lower);
        break;
      }
      default:
        entity[field.entityField] = value;
    }
  }

  // Compute RPN for risk if not provided
  if (entityType === 'risk' && entity.rpn === undefined) {
    const p = Number(entity.probability) || 0;
    const i = Number(entity.impact) || 0;
    const d = Number(entity.detectability) || 0;
    entity.rpn = p * i * d;
  }

  return entity;
}

// ============================================================================
// Import Template Generator
// ============================================================================

export function generateImportTemplate(entityType: string): string {
  const mapping = ENTITY_MAPPINGS[entityType];
  if (!mapping) {
    return `Unknown entity type: ${entityType}\n`;
  }

  // Header row
  const headers = mapping.map(f => f.csvHeader);

  // Example row with placeholder values showing expected format
  const exampleRow = mapping.map(f => {
    if (f.defaultValue) return f.defaultValue;
    switch (f.type) {
      case 'number': return f.entityField === 'probability' || f.entityField === 'impact' || f.entityField === 'detectability' ? '3' : '1';
      case 'date': return '2025-01-15';
      case 'boolean': return 'false';
      case 'enum':
        return f.enumValues?.[0] || 'example';
      default:
        if (f.required) {
          return f.entityField === 'documentNumber' ? 'DOC-001' :
                 f.entityField === 'capaNumber' ? 'CAPA-001' :
                 f.entityField === 'ncrNumber' ? 'NCR-001' :
                 f.entityField === 'riskNumber' ? 'RISK-001' :
                 f.entityField === 'devNumber' ? 'DEV-001' :
                 f.entityField === 'supplierCode' ? 'SUP-001' :
                 'Example';
        }
        return '';
    }
  });

  // Build CSV with proper quoting
  const headerLine = headers.map(h => h.includes(',') || h.includes('"') ? `"${h.replace(/"/g, '""')}"` : h).join(',');
  const exampleLine = exampleRow.map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(',');

  return `${headerLine}\n${exampleLine}\n`;
}

// ============================================================================
// Supported Entity Types
// ============================================================================

export const SUPPORTED_ENTITY_TYPES = [
  { value: 'document', label: 'Documents' },
  { value: 'capa', label: 'CAPAs' },
  { value: 'ncr', label: 'Non-Conformances' },
  { value: 'training', label: 'Training' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'risk', label: 'Risks' },
  { value: 'deviation', label: 'Deviations' },
] as const;

export type SupportedEntityType = (typeof SUPPORTED_ENTITY_TYPES)[number]['value'];
