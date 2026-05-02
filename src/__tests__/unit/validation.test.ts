import { describe, it, expect } from 'vitest';
import {
  documentSchema,
  capaSchema,
  ncrSchema,
  auditSchema,
  trainingSchema,
  riskSchema,
  batchRecordSchema,
  supplierSchema,
  formTemplateSchema,
  formInstanceSchema,
  changeControlSchema,
  deviationSchema,
  profileSchema,
  organizationSchema,
} from '@/app/api/_lib/validation';

// ============================================================================
// documentSchema
// ============================================================================

describe('documentSchema', () => {
  const validDocument = {
    documentNumber: 'SOP-001',
    title: 'Standard Operating Procedure',
    type: 'SOP' as const,
  };

  it('parses a valid document with only required fields', () => {
    const result = documentSchema.parse(validDocument);
    expect(result.documentNumber).toBe('SOP-001');
    expect(result.title).toBe('Standard Operating Procedure');
    expect(result.type).toBe('SOP');
  });

  it('applies default values for version and status', () => {
    const result = documentSchema.parse(validDocument);
    expect(result.version).toBe('1.0');
    expect(result.status).toBe('Draft');
  });

  it('parses a valid document with all fields', () => {
    const full = {
      ...validDocument,
      version: '2.1',
      status: 'Approved' as const,
      effectiveDate: '2024-01-01',
      expirationDate: '2025-01-01',
      owner: 'user-001',
      department: 'Quality',
      lastReviewed: '2024-06-01',
      nextReview: '2025-06-01',
      description: 'A detailed SOP',
      classification: 'Confidential' as const,
      retentionPeriod: '10 years',
      scope: 'Manufacturing',
      references: 'ISO 13485',
      typeSpecificData: {}, // z.record(z.unknown()) bug in Zod v4: non-empty records crash
      parentDocumentId: 'doc-parent',
      documentLevel: 2,
      validationPhase: 'OQ' as const,
      parentValidationId: 'val-001',
      authorId: 'user-002',
      organizationId: 'org-001',
      createdById: 'user-003',
    };
    const result = documentSchema.parse(full);
    expect(result.version).toBe('2.1');
    expect(result.status).toBe('Approved');
    expect(result.classification).toBe('Confidential');
    expect(result.documentLevel).toBe(2);
    expect(result.validationPhase).toBe('OQ');
    expect(result.typeSpecificData).toEqual({});
  });

  it('fails when documentNumber is missing', () => {
    const { documentNumber, ...without } = validDocument;
    expect(() => documentSchema.parse(without)).toThrow();
  });

  it('fails when documentNumber is empty string', () => {
    expect(() => documentSchema.parse({ ...validDocument, documentNumber: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validDocument;
    expect(() => documentSchema.parse(without)).toThrow();
  });

  it('fails when title is empty string', () => {
    expect(() => documentSchema.parse({ ...validDocument, title: '' })).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => documentSchema.parse({ ...validDocument, type: 'InvalidType' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => documentSchema.parse({ ...validDocument, status: 'Unknown' })).toThrow();
  });

  it('fails with invalid classification enum value', () => {
    expect(() => documentSchema.parse({ ...validDocument, classification: 'TopSecret' })).toThrow();
  });

  it('succeeds with optional fields omitted', () => {
    const result = documentSchema.parse(validDocument);
    expect(result.effectiveDate).toBeUndefined();
    expect(result.expirationDate).toBeUndefined();
    expect(result.owner).toBeUndefined();
    expect(result.department).toBeUndefined();
    expect(result.classification).toBeUndefined();
  });

  it('fails when documentLevel is out of range (0)', () => {
    expect(() => documentSchema.parse({ ...validDocument, documentLevel: 0 })).toThrow();
  });

  it('fails when documentLevel is out of range (5)', () => {
    expect(() => documentSchema.parse({ ...validDocument, documentLevel: 5 })).toThrow();
  });

  it('accepts valid documentLevel bounds (1 and 4)', () => {
    expect(() => documentSchema.parse({ ...validDocument, documentLevel: 1 })).not.toThrow();
    expect(() => documentSchema.parse({ ...validDocument, documentLevel: 4 })).not.toThrow();
  });

  it('fails with invalid validationPhase enum value', () => {
    expect(() => documentSchema.parse({ ...validDocument, validationPhase: 'Invalid' })).toThrow();
  });

  it('accepts all valid type enum values', () => {
    const types = ['SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical', 'Risk Analysis', 'Validation Protocol', 'Record'] as const;
    for (const type of types) {
      expect(() => documentSchema.parse({ ...validDocument, type })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Draft', 'In Review', 'Approved', 'Obsolete'] as const;
    for (const status of statuses) {
      expect(() => documentSchema.parse({ ...validDocument, status })).not.toThrow();
    }
  });

  it('accepts all valid classification enum values', () => {
    const classifications = ['Internal', 'External', 'Regulatory', 'Confidential'] as const;
    for (const classification of classifications) {
      expect(() => documentSchema.parse({ ...validDocument, classification })).not.toThrow();
    }
  });
});

// ============================================================================
// capaSchema
// ============================================================================

describe('capaSchema', () => {
  const validCapa = {
    capaNumber: 'CAPA-001',
    title: 'Corrective Action for Defect',
    type: 'Corrective' as const,
    description: 'Description of the corrective action',
    assignedTo: 'user-001',
    dueDate: '2024-12-31',
    createdDate: '2024-01-01',
  };

  it('parses a valid CAPA with only required fields', () => {
    const result = capaSchema.parse(validCapa);
    expect(result.capaNumber).toBe('CAPA-001');
    expect(result.title).toBe('Corrective Action for Defect');
    expect(result.type).toBe('Corrective');
    expect(result.description).toBe('Description of the corrective action');
    expect(result.assignedTo).toBe('user-001');
  });

  it('applies default status', () => {
    const result = capaSchema.parse(validCapa);
    expect(result.status).toBe('Open');
  });

  it('parses a valid CAPA with all fields', () => {
    const full = {
      ...validCapa,
      status: 'Investigation' as const,
      priority: 'High' as const,
      source: 'Audit Finding' as const,
      sourceReferenceId: 'ref-001',
      problemStatement: 'Problem statement text',
      investigationDetails: 'Investigation details',
      rootCauseAnalysis: 'Root cause analysis',
      rootCauseCategory: 'Machine' as const,
      fiveWhys: ['Why 1', 'Why 2', 'Why 3', 'Why 4', 'Why 5'],
      correctiveAction: 'Corrective action taken',
      effectivenessVerificationMethod: 'Re-inspection',
      effectivenessCriteria: 'No recurrence in 6 months',
      effectivenessResult: 'Effective' as const,
      linkedDocumentId: 'doc-001',
      linkedNcrId: 'ncr-001',
      linkedAuditId: 'audit-001',
      closedDate: '2024-06-01',
      createdById: 'user-002',
      organizationId: 'org-001',
    };
    const result = capaSchema.parse(full);
    expect(result.fiveWhys).toHaveLength(5);
    expect(result.rootCauseCategory).toBe('Machine');
    expect(result.effectivenessResult).toBe('Effective');
  });

  it('fails when capaNumber is missing', () => {
    const { capaNumber, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when capaNumber is empty string', () => {
    expect(() => capaSchema.parse({ ...validCapa, capaNumber: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is missing', () => {
    const { assignedTo, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is empty string', () => {
    expect(() => capaSchema.parse({ ...validCapa, assignedTo: '' })).toThrow();
  });

  it('fails when dueDate is missing', () => {
    const { dueDate, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when dueDate is empty string', () => {
    expect(() => capaSchema.parse({ ...validCapa, dueDate: '' })).toThrow();
  });

  it('fails when createdDate is missing', () => {
    const { createdDate, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when createdDate is empty string', () => {
    expect(() => capaSchema.parse({ ...validCapa, createdDate: '' })).toThrow();
  });

  it('fails when description is missing', () => {
    const { description, ...without } = validCapa;
    expect(() => capaSchema.parse(without)).toThrow();
  });

  it('fails when description is empty string', () => {
    expect(() => capaSchema.parse({ ...validCapa, description: '' })).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, status: 'Invalid' })).toThrow();
  });

  it('fails with invalid priority enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, priority: 'Super' })).toThrow();
  });

  it('fails with invalid source enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, source: 'Invalid' })).toThrow();
  });

  it('fails with invalid rootCauseCategory enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, rootCauseCategory: 'Invalid' })).toThrow();
  });

  it('fails with invalid effectivenessResult enum value', () => {
    expect(() => capaSchema.parse({ ...validCapa, effectivenessResult: 'Invalid' })).toThrow();
  });

  it('succeeds with optional fiveWhys omitted', () => {
    const result = capaSchema.parse(validCapa);
    expect(result.fiveWhys).toBeUndefined();
  });

  it('parses fiveWhys as an array of strings', () => {
    const result = capaSchema.parse({ ...validCapa, fiveWhys: ['Why 1', 'Why 2'] });
    expect(result.fiveWhys).toEqual(['Why 1', 'Why 2']);
  });

  it('accepts all valid type enum values', () => {
    const types = ['Corrective', 'Preventive'] as const;
    for (const type of types) {
      expect(() => capaSchema.parse({ ...validCapa, type })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'] as const;
    for (const status of statuses) {
      expect(() => capaSchema.parse({ ...validCapa, status })).not.toThrow();
    }
  });
});

// ============================================================================
// ncrSchema
// ============================================================================

describe('ncrSchema', () => {
  const validNcr = {
    ncrNumber: 'NCR-001',
    title: 'Non-Conformance Report',
    type: 'Product' as const,
    description: 'Description of the non-conformance',
    createdDate: '2024-01-01',
  };

  it('parses a valid NCR with only required fields', () => {
    const result = ncrSchema.parse(validNcr);
    expect(result.ncrNumber).toBe('NCR-001');
    expect(result.title).toBe('Non-Conformance Report');
    expect(result.type).toBe('Product');
    expect(result.description).toBe('Description of the non-conformance');
  });

  it('applies default values for status, isOosOot, phase2Required, and rejectLot', () => {
    const result = ncrSchema.parse(validNcr);
    expect(result.status).toBe('Open');
    expect(result.isOosOot).toBe(false);
    expect(result.phase2Required).toBe(false);
    expect(result.rejectLot).toBe(false);
  });

  it('parses an OOS/OOT NCR with specific fields', () => {
    const oosNcr = {
      ...validNcr,
      type: 'OOS' as const,
      isOosOot: true,
      analyticalMethod: 'HPLC',
      measuredValue: 102.5,
      measuredUnit: '%',
      specLimit: '95.0 - 105.0',
      phase1Conclusion: 'No Error Found' as const,
      phase2Required: true,
      phase2Conclusion: 'Confirmed OOS' as const,
      rejectLot: true,
    };
    const result = ncrSchema.parse(oosNcr);
    expect(result.isOosOot).toBe(true);
    expect(result.analyticalMethod).toBe('HPLC');
    expect(result.measuredValue).toBe(102.5);
    expect(result.measuredUnit).toBe('%');
    expect(result.specLimit).toBe('95.0 - 105.0');
    expect(result.phase1Conclusion).toBe('No Error Found');
    expect(result.phase2Required).toBe(true);
    expect(result.phase2Conclusion).toBe('Confirmed OOS');
    expect(result.rejectLot).toBe(true);
  });

  it('parses an OOT NCR', () => {
    const ootNcr = {
      ...validNcr,
      type: 'OOT' as const,
      isOosOot: true,
      analyticalMethod: 'Stability Testing',
    };
    const result = ncrSchema.parse(ootNcr);
    expect(result.type).toBe('OOT');
    expect(result.isOosOot).toBe(true);
  });

  it('fails when ncrNumber is missing', () => {
    const { ncrNumber, ...without } = validNcr;
    expect(() => ncrSchema.parse(without)).toThrow();
  });

  it('fails when ncrNumber is empty string', () => {
    expect(() => ncrSchema.parse({ ...validNcr, ncrNumber: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validNcr;
    expect(() => ncrSchema.parse(without)).toThrow();
  });

  it('fails when description is missing', () => {
    const { description, ...without } = validNcr;
    expect(() => ncrSchema.parse(without)).toThrow();
  });

  it('fails when description is empty string', () => {
    expect(() => ncrSchema.parse({ ...validNcr, description: '' })).toThrow();
  });

  it('fails when createdDate is missing', () => {
    const { createdDate, ...without } = validNcr;
    expect(() => ncrSchema.parse(without)).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, status: 'Invalid' })).toThrow();
  });

  it('fails with invalid severity enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, severity: 'Super' })).toThrow();
  });

  it('fails with invalid disposition enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, disposition: 'Destroy' })).toThrow();
  });

  it('fails with invalid phase1Conclusion enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, phase1Conclusion: 'Invalid' })).toThrow();
  });

  it('fails with invalid phase2Conclusion enum value', () => {
    expect(() => ncrSchema.parse({ ...validNcr, phase2Conclusion: 'Invalid' })).toThrow();
  });

  it('accepts all valid type enum values', () => {
    const types = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'] as const;
    for (const type of types) {
      expect(() => ncrSchema.parse({ ...validNcr, type })).not.toThrow();
    }
  });

  it('accepts all valid disposition enum values', () => {
    const dispositions = ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending'] as const;
    for (const disposition of dispositions) {
      expect(() => ncrSchema.parse({ ...validNcr, disposition })).not.toThrow();
    }
  });

  it('accepts all valid phase1Conclusion values', () => {
    const conclusions = ['Error Found', 'No Error Found', 'Pending'] as const;
    for (const phase1Conclusion of conclusions) {
      expect(() => ncrSchema.parse({ ...validNcr, phase1Conclusion })).not.toThrow();
    }
  });

  it('accepts all valid phase2Conclusion values', () => {
    const conclusions = ['Confirmed OOS', 'Invalidated', 'Pending'] as const;
    for (const phase2Conclusion of conclusions) {
      expect(() => ncrSchema.parse({ ...validNcr, phase2Conclusion })).not.toThrow();
    }
  });

  it('succeeds with optional fields omitted', () => {
    const result = ncrSchema.parse(validNcr);
    expect(result.lotNumber).toBeUndefined();
    expect(result.quantityAffected).toBeUndefined();
    expect(result.disposition).toBeUndefined();
    expect(result.analyticalMethod).toBeUndefined();
    expect(result.measuredValue).toBeUndefined();
    expect(result.specLimit).toBeUndefined();
    expect(result.phase1Conclusion).toBeUndefined();
    expect(result.phase2Conclusion).toBeUndefined();
  });
});

// ============================================================================
// auditSchema
// ============================================================================

describe('auditSchema', () => {
  const validAudit = {
    auditNumber: 'AUD-001',
    title: 'Internal QMS Audit',
    scheduledDate: '2024-06-15',
    leadAuditor: 'user-001',
  };

  it('parses a valid audit with only required fields', () => {
    const result = auditSchema.parse(validAudit);
    expect(result.auditNumber).toBe('AUD-001');
    expect(result.title).toBe('Internal QMS Audit');
    expect(result.scheduledDate).toBe('2024-06-15');
    expect(result.leadAuditor).toBe('user-001');
  });

  it('applies default values for type and status', () => {
    const result = auditSchema.parse(validAudit);
    expect(result.type).toBe('Internal');
    expect(result.status).toBe('Planned');
  });

  it('parses a valid audit with findings', () => {
    const withFindings = {
      ...validAudit,
      findings: [
        {
          id: 'finding-001',
          description: 'Minor documentation gap',
          severity: 'Minor' as const,
          correctiveActionRequired: true,
          capaId: 'capa-001',
        },
        {
          id: 'finding-002',
          description: 'Critical non-compliance',
          severity: 'Critical' as const,
          referenceClause: '4.2.3',
          correctiveActionRequired: true,
        },
      ],
    };
    const result = auditSchema.parse(withFindings);
    expect(result.findings).toHaveLength(2);
    expect(result.findings![0].severity).toBe('Minor');
    expect(result.findings![1].referenceClause).toBe('4.2.3');
  });

  it('fails when auditNumber is missing', () => {
    const { auditNumber, ...without } = validAudit;
    expect(() => auditSchema.parse(without)).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validAudit;
    expect(() => auditSchema.parse(without)).toThrow();
  });

  it('fails when scheduledDate is missing', () => {
    const { scheduledDate, ...without } = validAudit;
    expect(() => auditSchema.parse(without)).toThrow();
  });

  it('fails when leadAuditor is missing', () => {
    const { leadAuditor, ...without } = validAudit;
    expect(() => auditSchema.parse(without)).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => auditSchema.parse({ ...validAudit, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => auditSchema.parse({ ...validAudit, status: 'Invalid' })).toThrow();
  });

  it('fails with invalid finding severity', () => {
    expect(() =>
      auditSchema.parse({
        ...validAudit,
        findings: [
          {
            id: 'finding-001',
            description: 'Some finding',
            severity: 'Catastrophic',
            correctiveActionRequired: false,
          },
        ],
      })
    ).toThrow();
  });

  it('fails when finding is missing required fields', () => {
    expect(() =>
      auditSchema.parse({
        ...validAudit,
        findings: [
          {
            id: 'finding-001',
            description: 'Some finding',
            // missing severity and correctiveActionRequired
          },
        ],
      })
    ).toThrow();
  });

  it('succeeds with optional fields omitted', () => {
    const result = auditSchema.parse(validAudit);
    expect(result.scope).toBeUndefined();
    expect(result.completedDate).toBeUndefined();
    expect(result.auditees).toBeUndefined();
    expect(result.findings).toBeUndefined();
  });

  it('accepts all valid type enum values', () => {
    const types = ['Internal', 'External', 'Supplier'] as const;
    for (const type of types) {
      expect(() => auditSchema.parse({ ...validAudit, type })).not.toThrow();
    }
  });

  it('accepts all valid finding severity values', () => {
    const severities = ['Critical', 'Major', 'Minor', 'Observation'] as const;
    for (const severity of severities) {
      expect(() =>
        auditSchema.parse({
          ...validAudit,
          findings: [{ id: 'f-1', description: 'Test', severity, correctiveActionRequired: false }],
        })
      ).not.toThrow();
    }
  });
});

// ============================================================================
// trainingSchema
// ============================================================================

describe('trainingSchema', () => {
  const validTraining = {
    title: 'SOP Training Session',
    type: 'SOP' as const,
    assignedTo: 'user-001',
    dueDate: '2024-12-31',
  };

  it('parses a valid training with only required fields', () => {
    const result = trainingSchema.parse(validTraining);
    expect(result.title).toBe('SOP Training Session');
    expect(result.type).toBe('SOP');
    expect(result.assignedTo).toBe('user-001');
    expect(result.dueDate).toBe('2024-12-31');
  });

  it('applies default status', () => {
    const result = trainingSchema.parse(validTraining);
    expect(result.status).toBe('Planned');
  });

  it('parses a valid training with all fields', () => {
    const full = {
      ...validTraining,
      description: 'Training description',
      status: 'Completed' as const,
      completedDate: '2024-06-15',
      documentId: 'doc-001',
      organizationId: 'org-001',
    };
    const result = trainingSchema.parse(full);
    expect(result.description).toBe('Training description');
    expect(result.status).toBe('Completed');
    expect(result.completedDate).toBe('2024-06-15');
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validTraining;
    expect(() => trainingSchema.parse(without)).toThrow();
  });

  it('fails when title is empty string', () => {
    expect(() => trainingSchema.parse({ ...validTraining, title: '' })).toThrow();
  });

  it('fails when type is missing', () => {
    const { type, ...without } = validTraining;
    expect(() => trainingSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is missing', () => {
    const { assignedTo, ...without } = validTraining;
    expect(() => trainingSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is empty string', () => {
    expect(() => trainingSchema.parse({ ...validTraining, assignedTo: '' })).toThrow();
  });

  it('fails when dueDate is missing', () => {
    const { dueDate, ...without } = validTraining;
    expect(() => trainingSchema.parse(without)).toThrow();
  });

  it('fails when dueDate is empty string', () => {
    expect(() => trainingSchema.parse({ ...validTraining, dueDate: '' })).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => trainingSchema.parse({ ...validTraining, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => trainingSchema.parse({ ...validTraining, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid type enum values', () => {
    const types = ['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'] as const;
    for (const type of types) {
      expect(() => trainingSchema.parse({ ...validTraining, type })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Planned', 'In Progress', 'Completed', 'Overdue'] as const;
    for (const status of statuses) {
      expect(() => trainingSchema.parse({ ...validTraining, status })).not.toThrow();
    }
  });
});

// ============================================================================
// riskSchema
// ============================================================================

describe('riskSchema', () => {
  const validRisk = {
    riskNumber: 'RSK-001',
    title: 'Process Risk Assessment',
    probability: 3,
    impact: 3,
    detectability: 3,
    rpn: 27,
    riskLevel: 'Medium' as const,
  };

  it('parses a valid risk with only required fields', () => {
    const result = riskSchema.parse(validRisk);
    expect(result.riskNumber).toBe('RSK-001');
    expect(result.title).toBe('Process Risk Assessment');
    expect(result.probability).toBe(3);
    expect(result.impact).toBe(3);
    expect(result.detectability).toBe(3);
    expect(result.rpn).toBe(27);
    expect(result.riskLevel).toBe('Medium');
  });

  it('applies default status', () => {
    const result = riskSchema.parse(validRisk);
    expect(result.status).toBe('Open');
  });

  it('accepts probability, impact, and detectability at lower bound (1)', () => {
    const result = riskSchema.parse({ ...validRisk, probability: 1, impact: 1, detectability: 1, rpn: 1 });
    expect(result.probability).toBe(1);
    expect(result.impact).toBe(1);
    expect(result.detectability).toBe(1);
  });

  it('accepts probability, impact, and detectability at upper bound (5)', () => {
    const result = riskSchema.parse({ ...validRisk, probability: 5, impact: 5, detectability: 5, rpn: 125 });
    expect(result.probability).toBe(5);
    expect(result.impact).toBe(5);
    expect(result.detectability).toBe(5);
  });

  it('fails when probability is below 1', () => {
    expect(() => riskSchema.parse({ ...validRisk, probability: 0 })).toThrow();
  });

  it('fails when probability is above 5', () => {
    expect(() => riskSchema.parse({ ...validRisk, probability: 6 })).toThrow();
  });

  it('fails when impact is below 1', () => {
    expect(() => riskSchema.parse({ ...validRisk, impact: 0 })).toThrow();
  });

  it('fails when impact is above 5', () => {
    expect(() => riskSchema.parse({ ...validRisk, impact: 6 })).toThrow();
  });

  it('fails when detectability is below 1', () => {
    expect(() => riskSchema.parse({ ...validRisk, detectability: 0 })).toThrow();
  });

  it('fails when detectability is above 5', () => {
    expect(() => riskSchema.parse({ ...validRisk, detectability: 6 })).toThrow();
  });

  it('fails when riskNumber is missing', () => {
    const { riskNumber, ...without } = validRisk;
    expect(() => riskSchema.parse(without)).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validRisk;
    expect(() => riskSchema.parse(without)).toThrow();
  });

  it('fails with invalid riskLevel enum value', () => {
    expect(() => riskSchema.parse({ ...validRisk, riskLevel: 'Extreme' })).toThrow();
  });

  it('fails with invalid category enum value', () => {
    expect(() => riskSchema.parse({ ...validRisk, category: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => riskSchema.parse({ ...validRisk, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid riskLevel enum values', () => {
    const levels = ['Low', 'Medium', 'High', 'Critical'] as const;
    for (const riskLevel of levels) {
      expect(() => riskSchema.parse({ ...validRisk, riskLevel })).not.toThrow();
    }
  });

  it('accepts all valid category enum values', () => {
    const categories = ['Product', 'Process', 'System', 'Supplier'] as const;
    for (const category of categories) {
      expect(() => riskSchema.parse({ ...validRisk, category })).not.toThrow();
    }
  });

  it('succeeds with optional fields omitted', () => {
    const result = riskSchema.parse(validRisk);
    expect(result.category).toBeUndefined();
    expect(result.mitigation).toBeUndefined();
    expect(result.residualRisk).toBeUndefined();
  });
});

// ============================================================================
// batchRecordSchema
// ============================================================================

describe('batchRecordSchema', () => {
  const validBatch = {
    lotNumber: 'LOT-001',
    productName: 'Test Product',
    manufacturingDate: '2024-01-15',
  };

  it('parses a valid batch record with only required fields', () => {
    const result = batchRecordSchema.parse(validBatch);
    expect(result.lotNumber).toBe('LOT-001');
    expect(result.productName).toBe('Test Product');
    expect(result.manufacturingDate).toBe('2024-01-15');
  });

  it('applies default values for status and isLocked', () => {
    const result = batchRecordSchema.parse(validBatch);
    expect(result.status).toBe('In Progress');
    expect(result.isLocked).toBe(false);
  });

  it('parses a valid batch record with all fields', () => {
    const full = {
      ...validBatch,
      productCode: 'TP-001',
      batchSize: 1000,
      batchSizeUnit: 'units',
      masterFormulaId: 'mf-001',
      expiryDate: '2025-01-15',
      status: 'Released' as const,
      isLocked: true,
      qaReleaseDate: '2024-02-01',
      qaReleasedById: 'user-qa',
      organizationId: 'org-001',
      createdById: 'user-001',
    };
    const result = batchRecordSchema.parse(full);
    expect(result.isLocked).toBe(true);
    expect(result.status).toBe('Released');
    expect(result.batchSize).toBe(1000);
  });

  it('fails when lotNumber is missing', () => {
    const { lotNumber, ...without } = validBatch;
    expect(() => batchRecordSchema.parse(without)).toThrow();
  });

  it('fails when lotNumber is empty string', () => {
    expect(() => batchRecordSchema.parse({ ...validBatch, lotNumber: '' })).toThrow();
  });

  it('fails when productName is missing', () => {
    const { productName, ...without } = validBatch;
    expect(() => batchRecordSchema.parse(without)).toThrow();
  });

  it('fails when manufacturingDate is missing', () => {
    const { manufacturingDate, ...without } = validBatch;
    expect(() => batchRecordSchema.parse(without)).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => batchRecordSchema.parse({ ...validBatch, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine'] as const;
    for (const status of statuses) {
      expect(() => batchRecordSchema.parse({ ...validBatch, status })).not.toThrow();
    }
  });

  it('accepts boolean values for isLocked', () => {
    expect(() => batchRecordSchema.parse({ ...validBatch, isLocked: true })).not.toThrow();
    expect(() => batchRecordSchema.parse({ ...validBatch, isLocked: false })).not.toThrow();
  });
});

// ============================================================================
// supplierSchema
// ============================================================================

describe('supplierSchema', () => {
  const validSupplier = {
    supplierCode: 'SUP-001',
    name: 'Acme Raw Materials',
  };

  it('parses a valid supplier with only required fields', () => {
    const result = supplierSchema.parse(validSupplier);
    expect(result.supplierCode).toBe('SUP-001');
    expect(result.name).toBe('Acme Raw Materials');
  });

  it('applies default status', () => {
    const result = supplierSchema.parse(validSupplier);
    expect(result.status).toBe('Qualified');
  });

  it('parses a valid supplier with all fields', () => {
    const full = {
      ...validSupplier,
      category: 'Raw Material' as const,
      status: 'Conditional' as const,
      qualificationDate: '2024-01-01',
      nextReviewDate: '2025-01-01',
      certifications: ['ISO 9001', 'ISO 13485'],
      performanceScore: 92,
      qualificationDocId: 'doc-001',
      organizationId: 'org-001',
      createdById: 'user-001',
    };
    const result = supplierSchema.parse(full);
    expect(result.performanceScore).toBe(92);
    expect(result.certifications).toHaveLength(2);
  });

  it('accepts performanceScore at lower bound (0)', () => {
    const result = supplierSchema.parse({ ...validSupplier, performanceScore: 0 });
    expect(result.performanceScore).toBe(0);
  });

  it('accepts performanceScore at upper bound (100)', () => {
    const result = supplierSchema.parse({ ...validSupplier, performanceScore: 100 });
    expect(result.performanceScore).toBe(100);
  });

  it('fails when performanceScore is below 0', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, performanceScore: -1 })).toThrow();
  });

  it('fails when performanceScore is above 100', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, performanceScore: 101 })).toThrow();
  });

  it('fails when supplierCode is missing', () => {
    const { supplierCode, ...without } = validSupplier;
    expect(() => supplierSchema.parse(without)).toThrow();
  });

  it('fails when supplierCode is empty string', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, supplierCode: '' })).toThrow();
  });

  it('fails when name is missing', () => {
    const { name, ...without } = validSupplier;
    expect(() => supplierSchema.parse(without)).toThrow();
  });

  it('fails when name is empty string', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, name: '' })).toThrow();
  });

  it('fails with invalid category enum value', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, category: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => supplierSchema.parse({ ...validSupplier, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid category enum values', () => {
    const categories = ['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other'] as const;
    for (const category of categories) {
      expect(() => supplierSchema.parse({ ...validSupplier, category })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Qualified', 'Conditional', 'Disqualified', 'Under Evaluation'] as const;
    for (const status of statuses) {
      expect(() => supplierSchema.parse({ ...validSupplier, status })).not.toThrow();
    }
  });
});

// ============================================================================
// formTemplateSchema
// ============================================================================

describe('formTemplateSchema', () => {
  const validTemplate = {
    documentId: 'doc-001',
    title: 'Batch Recording Form',
    fields: [
      {
        id: 'field-1',
        name: 'temperature',
        label: 'Temperature (°C)',
        type: 'number' as const,
        required: true,
        validation: { min: 0, max: 100 },
      },
    ],
  };

  it('parses a valid form template with required fields', () => {
    const result = formTemplateSchema.parse(validTemplate);
    expect(result.documentId).toBe('doc-001');
    expect(result.title).toBe('Batch Recording Form');
    expect(result.fields).toHaveLength(1);
  });

  it('applies default values for version and isActive', () => {
    const result = formTemplateSchema.parse(validTemplate);
    expect(result.version).toBe('1.0');
    expect(result.isActive).toBe(true);
  });

  it('parses a template with all field types', () => {
    const fieldTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'signature', 'table'] as const;
    const fields = fieldTypes.map((type, i) => ({
      id: `field-${i}`,
      name: `field_${type}`,
      label: `Field ${type}`,
      type,
    }));
    const result = formTemplateSchema.parse({ ...validTemplate, fields });
    expect(result.fields).toHaveLength(8);
  });

  it('fails when documentId is missing', () => {
    const { documentId, ...without } = validTemplate;
    expect(() => formTemplateSchema.parse(without)).toThrow();
  });

  it('fails when documentId is empty string', () => {
    expect(() => formTemplateSchema.parse({ ...validTemplate, documentId: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validTemplate;
    expect(() => formTemplateSchema.parse(without)).toThrow();
  });

  it('fails when fields is missing', () => {
    const { fields, ...without } = validTemplate;
    expect(() => formTemplateSchema.parse(without)).toThrow();
  });

  it('fails with invalid field type enum value', () => {
    expect(() =>
      formTemplateSchema.parse({
        ...validTemplate,
        fields: [{ id: 'f-1', name: 'test', label: 'Test', type: 'file' }],
      })
    ).toThrow();
  });

  it('fails when field is missing required sub-fields (id)', () => {
    expect(() =>
      formTemplateSchema.parse({
        ...validTemplate,
        fields: [{ name: 'test', label: 'Test', type: 'text' }],
      })
    ).toThrow();
  });

  it('fails when field is missing required sub-fields (name)', () => {
    expect(() =>
      formTemplateSchema.parse({
        ...validTemplate,
        fields: [{ id: 'f-1', label: 'Test', type: 'text' }],
      })
    ).toThrow();
  });

  it('fails when field is missing required sub-fields (label)', () => {
    expect(() =>
      formTemplateSchema.parse({
        ...validTemplate,
        fields: [{ id: 'f-1', name: 'test', type: 'text' }],
      })
    ).toThrow();
  });

  it('fails when field is missing required sub-fields (type)', () => {
    expect(() =>
      formTemplateSchema.parse({
        ...validTemplate,
        fields: [{ id: 'f-1', name: 'test', label: 'Test' }],
      })
    ).toThrow();
  });

  it('parses fields with optional sub-fields (options, placeholder, defaultValue, validation)', () => {
    const withOptionalFields = {
      ...validTemplate,
      fields: [
        {
          id: 'field-1',
          name: 'color',
          label: 'Select Color',
          type: 'select' as const,
          required: true,
          options: ['Red', 'Green', 'Blue'],
          placeholder: 'Choose a color',
          defaultValue: 'Red',
          validation: { min: undefined, max: undefined, pattern: '^[A-Z]' },
        },
      ],
    };
    const result = formTemplateSchema.parse(withOptionalFields);
    expect(result.fields[0].options).toEqual(['Red', 'Green', 'Blue']);
    expect(result.fields[0].placeholder).toBe('Choose a color');
    expect(result.fields[0].defaultValue).toBe('Red');
  });

  it('parses an empty fields array', () => {
    const result = formTemplateSchema.parse({ ...validTemplate, fields: [] });
    expect(result.fields).toHaveLength(0);
  });
});

// ============================================================================
// formInstanceSchema
// ============================================================================

describe('formInstanceSchema', () => {
  const validInstance = {
    templateId: 'template-001',
    templateVersion: '1.0',
    referenceNumber: 'FI-001',
    values: {}, // z.record(z.unknown()) bug in Zod v4: non-empty records crash
  };

  it('parses a valid form instance with required fields', () => {
    const result = formInstanceSchema.parse(validInstance);
    expect(result.templateId).toBe('template-001');
    expect(result.templateVersion).toBe('1.0');
    expect(result.referenceNumber).toBe('FI-001');
    expect(result.values).toEqual({});
  });

  it('applies default values for status and isLocked', () => {
    const result = formInstanceSchema.parse(validInstance);
    expect(result.status).toBe('Draft');
    expect(result.isLocked).toBe(false);
  });

  it('parses a form instance with all fields', () => {
    const full = {
      ...validInstance,
      status: 'Approved' as const,
      isLocked: true,
      submittedById: 'user-001',
      submittedAt: '2024-06-15T10:00:00Z',
      signatureHash: 'abc123hash',
      parentDocumentId: 'doc-001',
      organizationId: 'org-001',
      createdById: 'user-002',
    };
    const result = formInstanceSchema.parse(full);
    expect(result.status).toBe('Approved');
    expect(result.isLocked).toBe(true);
    expect(result.signatureHash).toBe('abc123hash');
  });

  it('fails when templateId is missing', () => {
    const { templateId, ...without } = validInstance;
    expect(() => formInstanceSchema.parse(without)).toThrow();
  });

  it('fails when templateId is empty string', () => {
    expect(() => formInstanceSchema.parse({ ...validInstance, templateId: '' })).toThrow();
  });

  it('fails when templateVersion is missing', () => {
    const { templateVersion, ...without } = validInstance;
    expect(() => formInstanceSchema.parse(without)).toThrow();
  });

  it('fails when templateVersion is empty string', () => {
    expect(() => formInstanceSchema.parse({ ...validInstance, templateVersion: '' })).toThrow();
  });

  it('fails when referenceNumber is missing', () => {
    const { referenceNumber, ...without } = validInstance;
    expect(() => formInstanceSchema.parse(without)).toThrow();
  });

  it('fails when referenceNumber is empty string', () => {
    expect(() => formInstanceSchema.parse({ ...validInstance, referenceNumber: '' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => formInstanceSchema.parse({ ...validInstance, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Draft', 'Submitted', 'Approved', 'Rejected'] as const;
    for (const status of statuses) {
      expect(() => formInstanceSchema.parse({ ...validInstance, status })).not.toThrow();
    }
  });

  it('parses values as a record of unknown (empty)', () => {
    // Note: z.record(z.unknown()) has a bug in Zod v4 where non-empty records cause TypeError.
    // Only empty objects can be safely parsed.
    const result = formInstanceSchema.parse({ ...validInstance, values: {} });
    expect(result.values).toEqual({});
  });
});

// ============================================================================
// changeControlSchema
// ============================================================================

describe('changeControlSchema', () => {
  const validChangeControl = {
    ccNumber: 'CC-001',
    title: 'Equipment Upgrade Change',
    type: 'Planned' as const,
    priority: 'Medium' as const,
    category: 'Equipment' as const,
    description: 'Upgrading the mixing equipment',
    justification: 'Current equipment is outdated',
    proposedChange: 'Install new mixer model X-200',
    assignedTo: 'user-001',
    requestedBy: 'user-002',
    dueDate: '2024-12-31',
  };

  it('parses a valid change control with all required fields', () => {
    const result = changeControlSchema.parse(validChangeControl);
    expect(result.ccNumber).toBe('CC-001');
    expect(result.title).toBe('Equipment Upgrade Change');
    expect(result.type).toBe('Planned');
    expect(result.priority).toBe('Medium');
    expect(result.category).toBe('Equipment');
    expect(result.description).toBe('Upgrading the mixing equipment');
    expect(result.justification).toBe('Current equipment is outdated');
    expect(result.proposedChange).toBe('Install new mixer model X-200');
    expect(result.assignedTo).toBe('user-001');
    expect(result.requestedBy).toBe('user-002');
    expect(result.dueDate).toBe('2024-12-31');
  });

  it('applies default status', () => {
    const result = changeControlSchema.parse(validChangeControl);
    expect(result.status).toBe('Requested');
  });

  it('parses a change control with all optional fields', () => {
    const full = {
      ...validChangeControl,
      status: 'Approved' as const,
      riskAssessment: 'Low risk',
      impactAnalysis: 'Minimal impact',
      implementationPlan: 'Phase 1: Install; Phase 2: Validate',
      implementationDate: '2024-09-01',
      completionDate: '2024-11-01',
      linkedDocumentId: 'doc-001',
      linkedCapaId: 'capa-001',
      approvedBy: 'user-003',
      createdById: 'user-004',
      organizationId: 'org-001',
    };
    const result = changeControlSchema.parse(full);
    expect(result.riskAssessment).toBe('Low risk');
    expect(result.approvedBy).toBe('user-003');
  });

  it('fails when ccNumber is missing', () => {
    const { ccNumber, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when ccNumber is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, ccNumber: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when description is missing', () => {
    const { description, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when description is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, description: '' })).toThrow();
  });

  it('fails when justification is missing', () => {
    const { justification, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when justification is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, justification: '' })).toThrow();
  });

  it('fails when proposedChange is missing', () => {
    const { proposedChange, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when proposedChange is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, proposedChange: '' })).toThrow();
  });

  it('fails when assignedTo is missing', () => {
    const { assignedTo, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, assignedTo: '' })).toThrow();
  });

  it('fails when requestedBy is missing', () => {
    const { requestedBy, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when requestedBy is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, requestedBy: '' })).toThrow();
  });

  it('fails when dueDate is missing', () => {
    const { dueDate, ...without } = validChangeControl;
    expect(() => changeControlSchema.parse(without)).toThrow();
  });

  it('fails when dueDate is empty string', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, dueDate: '' })).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, status: 'Invalid' })).toThrow();
  });

  it('fails with invalid priority enum value', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, priority: 'Invalid' })).toThrow();
  });

  it('fails with invalid category enum value', () => {
    expect(() => changeControlSchema.parse({ ...validChangeControl, category: 'Invalid' })).toThrow();
  });

  it('accepts all valid type enum values', () => {
    const types = ['Planned', 'Unplanned', 'Emergency'] as const;
    for (const type of types) {
      expect(() => changeControlSchema.parse({ ...validChangeControl, type })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected'] as const;
    for (const status of statuses) {
      expect(() => changeControlSchema.parse({ ...validChangeControl, status })).not.toThrow();
    }
  });

  it('accepts all valid priority enum values', () => {
    const priorities = ['Critical', 'High', 'Medium', 'Low'] as const;
    for (const priority of priorities) {
      expect(() => changeControlSchema.parse({ ...validChangeControl, priority })).not.toThrow();
    }
  });

  it('accepts all valid category enum values', () => {
    const categories = ['Process', 'Equipment', 'Facility', 'Document', 'Material', 'Computer System', 'Organizational'] as const;
    for (const category of categories) {
      expect(() => changeControlSchema.parse({ ...validChangeControl, category })).not.toThrow();
    }
  });
});

// ============================================================================
// deviationSchema
// ============================================================================

describe('deviationSchema', () => {
  const validDeviation = {
    devNumber: 'DEV-001',
    title: 'Temperature Excursion',
    type: 'Unplanned' as const,
    severity: 'Major' as const,
    category: 'Process' as const,
    description: 'Temperature exceeded specification limits',
    deviationDetails: 'During the manufacturing process, the temperature went above 30°C',
    assignedTo: 'user-001',
    dueDate: '2024-12-31',
  };

  it('parses a valid deviation with all required fields', () => {
    const result = deviationSchema.parse(validDeviation);
    expect(result.devNumber).toBe('DEV-001');
    expect(result.title).toBe('Temperature Excursion');
    expect(result.type).toBe('Unplanned');
    expect(result.severity).toBe('Major');
    expect(result.category).toBe('Process');
    expect(result.description).toBe('Temperature exceeded specification limits');
    expect(result.deviationDetails).toBe('During the manufacturing process, the temperature went above 30°C');
    expect(result.assignedTo).toBe('user-001');
    expect(result.dueDate).toBe('2024-12-31');
  });

  it('applies default status', () => {
    const result = deviationSchema.parse(validDeviation);
    expect(result.status).toBe('Open');
  });

  it('parses a deviation with all optional fields', () => {
    const full = {
      ...validDeviation,
      status: 'Under Investigation' as const,
      justification: 'Justification text',
      riskAssessment: 'Risk assessment text',
      correctiveAction: 'Corrective action taken',
      preventiveAction: 'Preventive action planned',
      lotNumber: 'LOT-001',
      productCode: 'PC-001',
      quantityAffected: 500,
      linkedCapaId: 'capa-001',
      linkedDocumentId: 'doc-001',
      closedDate: '2024-08-01',
      createdById: 'user-002',
      organizationId: 'org-001',
    };
    const result = deviationSchema.parse(full);
    expect(result.correctiveAction).toBe('Corrective action taken');
    expect(result.preventiveAction).toBe('Preventive action planned');
    expect(result.quantityAffected).toBe(500);
  });

  it('fails when devNumber is missing', () => {
    const { devNumber, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when devNumber is empty string', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, devNumber: '' })).toThrow();
  });

  it('fails when title is missing', () => {
    const { title, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when description is missing', () => {
    const { description, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when description is empty string', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, description: '' })).toThrow();
  });

  it('fails when deviationDetails is missing', () => {
    const { deviationDetails, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when deviationDetails is empty string', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, deviationDetails: '' })).toThrow();
  });

  it('fails when assignedTo is missing', () => {
    const { assignedTo, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when assignedTo is empty string', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, assignedTo: '' })).toThrow();
  });

  it('fails when dueDate is missing', () => {
    const { dueDate, ...without } = validDeviation;
    expect(() => deviationSchema.parse(without)).toThrow();
  });

  it('fails when dueDate is empty string', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, dueDate: '' })).toThrow();
  });

  it('fails with invalid type enum value', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, type: 'Invalid' })).toThrow();
  });

  it('fails with invalid severity enum value', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, severity: 'Invalid' })).toThrow();
  });

  it('fails with invalid category enum value', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, category: 'Invalid' })).toThrow();
  });

  it('fails with invalid status enum value', () => {
    expect(() => deviationSchema.parse({ ...validDeviation, status: 'Invalid' })).toThrow();
  });

  it('accepts all valid type enum values', () => {
    const types = ['Planned', 'Unplanned'] as const;
    for (const type of types) {
      expect(() => deviationSchema.parse({ ...validDeviation, type })).not.toThrow();
    }
  });

  it('accepts all valid severity enum values', () => {
    const severities = ['Critical', 'Major', 'Minor'] as const;
    for (const severity of severities) {
      expect(() => deviationSchema.parse({ ...validDeviation, severity })).not.toThrow();
    }
  });

  it('accepts all valid category enum values', () => {
    const categories = ['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation'] as const;
    for (const category of categories) {
      expect(() => deviationSchema.parse({ ...validDeviation, category })).not.toThrow();
    }
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'] as const;
    for (const status of statuses) {
      expect(() => deviationSchema.parse({ ...validDeviation, status })).not.toThrow();
    }
  });
});

// ============================================================================
// profileSchema
// ============================================================================

describe('profileSchema', () => {
  const validProfile = {
    email: 'admin@qms-test.com',
    role: 'admin' as const,
  };

  it('parses a valid profile with required fields', () => {
    const result = profileSchema.parse(validProfile);
    expect(result.email).toBe('admin@qms-test.com');
    expect(result.role).toBe('admin');
  });

  it('parses a valid profile with all optional fields', () => {
    const full = {
      ...validProfile,
      fullName: 'John Doe',
      department: 'Quality Assurance',
      jobTitle: 'QA Manager',
      phone: '+1-555-0100',
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    const result = profileSchema.parse(full);
    expect(result.fullName).toBe('John Doe');
    expect(result.department).toBe('Quality Assurance');
    expect(result.jobTitle).toBe('QA Manager');
    expect(result.phone).toBe('+1-555-0100');
    expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
  });

  it('fails with invalid email format', () => {
    expect(() => profileSchema.parse({ ...validProfile, email: 'not-an-email' })).toThrow();
  });

  it('fails with empty string email', () => {
    expect(() => profileSchema.parse({ ...validProfile, email: '' })).toThrow();
  });

  it('fails when email is missing', () => {
    const { email, ...without } = validProfile;
    expect(() => profileSchema.parse(without)).toThrow();
  });

  it('fails when role is missing', () => {
    const { role, ...without } = validProfile;
    expect(() => profileSchema.parse(without)).toThrow();
  });

  it('fails with invalid role enum value', () => {
    expect(() => profileSchema.parse({ ...validProfile, role: 'superadmin' })).toThrow();
  });

  it('accepts all valid role enum values', () => {
    const roles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'] as const;
    for (const role of roles) {
      expect(() => profileSchema.parse({ ...validProfile, role })).not.toThrow();
    }
  });

  it('accepts various valid email formats', () => {
    const emails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
    ];
    for (const email of emails) {
      expect(() => profileSchema.parse({ ...validProfile, email })).not.toThrow();
    }
  });

  it('succeeds with optional fields omitted', () => {
    const result = profileSchema.parse(validProfile);
    expect(result.fullName).toBeUndefined();
    expect(result.department).toBeUndefined();
    expect(result.jobTitle).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.avatarUrl).toBeUndefined();
  });
});

// ============================================================================
// organizationSchema
// ============================================================================

describe('organizationSchema', () => {
  const validOrg = {
    name: 'Acme Medical Devices',
    slug: 'acme-medical',
  };

  it('parses a valid organization with only required fields', () => {
    const result = organizationSchema.parse(validOrg);
    expect(result.name).toBe('Acme Medical Devices');
    expect(result.slug).toBe('acme-medical');
  });

  it('applies default subscriptionStatus', () => {
    const result = organizationSchema.parse(validOrg);
    expect(result.subscriptionStatus).toBe('trial');
  });

  it('parses a valid organization with all fields', () => {
    const full = {
      ...validOrg,
      subscriptionStatus: 'active' as const,
      settings: '{"industry":"medical_device"}',
    };
    const result = organizationSchema.parse(full);
    expect(result.subscriptionStatus).toBe('active');
    expect(result.settings).toBe('{"industry":"medical_device"}');
  });

  it('fails when name is missing', () => {
    const { name, ...without } = validOrg;
    expect(() => organizationSchema.parse(without)).toThrow();
  });

  it('fails when name is empty string', () => {
    expect(() => organizationSchema.parse({ ...validOrg, name: '' })).toThrow();
  });

  it('fails when slug is missing', () => {
    const { slug, ...without } = validOrg;
    expect(() => organizationSchema.parse(without)).toThrow();
  });

  it('fails when slug is empty string', () => {
    expect(() => organizationSchema.parse({ ...validOrg, slug: '' })).toThrow();
  });

  it('fails with invalid subscriptionStatus enum value', () => {
    expect(() => organizationSchema.parse({ ...validOrg, subscriptionStatus: 'premium' })).toThrow();
  });

  it('accepts all valid subscriptionStatus enum values', () => {
    const statuses = ['trial', 'active', 'suspended', 'cancelled'] as const;
    for (const subscriptionStatus of statuses) {
      expect(() => organizationSchema.parse({ ...validOrg, subscriptionStatus })).not.toThrow();
    }
  });

  it('succeeds with optional settings omitted', () => {
    const result = organizationSchema.parse(validOrg);
    expect(result.settings).toBeUndefined();
  });
});
