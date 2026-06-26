/**
 * Document Code Convention & Trigger System
 *
 * Defines the structured document code system (MQ-001, PR-4.2.4, FORM-DOC-001, etc.)
 * and the trigger/declencheur relationship model from the Qwen specification.
 *
 * Code Prefixes:
 *   MQ-   → Manuel Qualité (Quality Manual)
 *   REG-  → Réglementaire (Regulatory)
 *   RD-   → Revue de Direction (Management Review)
 *   PR-   → Procédure (Procedure)
 *   WI-   → Work Instruction (Instruction)
 *   FORM- → Formulaire (Form)
 *   REG-  → Registre (Register) — context-dependent with PR-
 *   DL-   → Dossier Lot (Batch Dossier)
 *   OOS-  → Out of Specification
 *
 * Principle: The system provides TOOLS for users to create/manage 300+ documents;
 * it does NOT pre-populate them.
 */

import type { DocumentType, DocumentLevel } from '@/types/qms';

// ============================================================================
// Document Code Prefix Definitions
// ============================================================================

export interface CodePrefix {
  /** Prefix string (e.g., 'MQ', 'PR', 'FORM') */
  prefix: string;
  /** French label */
  labelFr: string;
  /** English label */
  labelEn: string;
  /** Which document types this prefix maps to */
  documentTypes: DocumentType[];
  /** Which document levels this prefix is valid for */
  validLevels: DocumentLevel[];
  /** Separator after prefix (e.g., '-', '.') */
  separator: string;
  /** Number format: 'numeric' for sequential numbers, 'clause' for ISO clause numbers */
  numberFormat: 'numeric' | 'clause' | 'mixed';
  /** Example code */
  example: string;
}

export const CODE_PREFIXES: CodePrefix[] = [
  {
    prefix: 'MQ',
    labelFr: 'Manuel Qualité',
    labelEn: 'Quality Manual',
    documentTypes: ['MANUEL', 'Manual'],
    validLevels: [1],
    separator: '-',
    numberFormat: 'numeric',
    example: 'MQ-001',
  },
  {
    prefix: 'REG',
    labelFr: 'Réglementaire / Registre',
    labelEn: 'Regulatory / Register',
    documentTypes: ['REGLEMENTAIRE', 'MAPPING', 'REGISTRE', 'Register'],
    validLevels: [1, 4],
    separator: '-',
    numberFormat: 'mixed',
    example: 'REG-001, REG-DOC-001',
  },
  {
    prefix: 'RD',
    labelFr: 'Revue de Direction',
    labelEn: 'Management Review',
    documentTypes: ['PROCEDURE', 'Procedure', 'ENREGISTREMENT', 'Record'],
    validLevels: [1, 4],
    separator: '-',
    numberFormat: 'numeric',
    example: 'RD-001',
  },
  {
    prefix: 'PR',
    labelFr: 'Procédure',
    labelEn: 'Procedure',
    documentTypes: ['PROCEDURE', 'Procedure'],
    validLevels: [2, 3],
    separator: '-',
    numberFormat: 'mixed',
    example: 'PR-4.2.4, PR-NC-001, PR-LAB-PCQ-001',
  },
  {
    prefix: 'WI',
    labelFr: 'Instruction / Mode Opératoire',
    labelEn: 'Work Instruction',
    documentTypes: ['INSTRUCTION', 'Instruction', 'WI'],
    validLevels: [4],
    separator: '-',
    numberFormat: 'mixed',
    example: 'WI-LAB-PCQ-001, WI-PROD-001',
  },
  {
    prefix: 'FORM',
    labelFr: 'Formulaire',
    labelEn: 'Form',
    documentTypes: ['FORMULAIRE', 'Form'],
    validLevels: [4],
    separator: '-',
    numberFormat: 'mixed',
    example: 'FORM-DOC-001, FORM-NC-001',
  },
  {
    prefix: 'DL',
    labelFr: 'Dossier Lot',
    labelEn: 'Batch Dossier',
    documentTypes: ['MASTER_BATCH', 'Master Batch', 'PROCEDURE', 'Procedure'],
    validLevels: [2, 3],
    separator: '-',
    numberFormat: 'mixed',
    example: 'DL-001, DL-EXEC-001',
  },
  {
    prefix: 'OOS',
    labelFr: 'Hors Spécification',
    labelEn: 'Out of Specification',
    documentTypes: ['PROCEDURE', 'Procedure', 'FORMULAIRE', 'Form'],
    validLevels: [2, 3, 4],
    separator: '-',
    numberFormat: 'mixed',
    example: 'PR-OOS-001, FORM-OOS-PC-001',
  },
  {
    prefix: 'CC',
    labelFr: 'Change Control',
    labelEn: 'Change Control',
    documentTypes: ['PROCEDURE', 'Procedure'],
    validLevels: [2, 3],
    separator: '-',
    numberFormat: 'mixed',
    example: 'PR-CC-EQP-001, PR-CC-METH-001',
  },
  {
    prefix: 'DEV',
    labelFr: 'Déviation',
    labelEn: 'Deviation',
    documentTypes: ['PROCEDURE', 'Procedure', 'FORMULAIRE', 'Form'],
    validLevels: [2, 3, 4],
    separator: '-',
    numberFormat: 'mixed',
    example: 'PR-DEV-001, FORM-DEV-INV-003',
  },
];

// ============================================================================
// Document Code Validation
// ============================================================================

/** Regex patterns for each prefix */
export const CODE_PATTERNS: Record<string, RegExp> = {
  MQ: /^MQ-\d{3}$/,
  REG: /^REG(-[A-Z]+-\d{3}|-REF-\d{3}|\d{3})$/,
  RD: /^RD-\d{3}$/,
  PR: /^PR(-\d+\.\d+\.\d+|-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/,
  WI: /^WI(-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/,
  FORM: /^FORM(-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/,
  DL: /^DL(-\d{3}|-[A-Z]+-\d{3})$/,
  OOS: /^(PR-OOS|FORM-OOS)-[A-Z]*-?\d{3}$/,
  CC: /^PR-CC(-[A-Z]+-\d{3})$/,
  DEV: /^(PR-DEV|FORM-DEV)-[A-Z]*-?\d{3}$/,
};

/** Validate a document code against convention patterns */
export function validateDocumentCode(code: string): { valid: boolean; prefix?: string; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Document code is required' };
  }

  // Try to match against known prefixes
  for (const [prefix, pattern] of Object.entries(CODE_PATTERNS)) {
    if (pattern.test(code)) {
      return { valid: true, prefix };
    }
  }

  // Check if it starts with a known prefix but doesn't match the full pattern
  const upperCode = code.toUpperCase();
  for (const p of CODE_PREFIXES) {
    if (upperCode.startsWith(p.prefix + p.separator)) {
      return {
        valid: false,
        prefix: p.prefix,
        error: `Code starts with ${p.prefix} prefix but doesn't match expected pattern. Example: ${p.example}`,
      };
    }
  }

  // Unknown prefix — still allow but warn
  return {
    valid: true,
    error: `Unknown code prefix. Consider using one of: ${CODE_PREFIXES.map(p => p.prefix).join(', ')}`,
  };
}

/** Get the code prefix definition for a given code */
export function getCodePrefix(code: string): CodePrefix | undefined {
  for (const p of CODE_PREFIXES) {
    if (code.toUpperCase().startsWith(p.prefix + p.separator)) {
      return p;
    }
  }
  return undefined;
}

/** Generate the next sequential code for a given prefix and department */
export function generateNextCode(prefix: string, departmentSuffix?: string, existingCodes: string[] = []): string {
  const matchingCodes = existingCodes.filter(c => {
    if (departmentSuffix) {
      return c.toUpperCase().startsWith(`${prefix}-${departmentSuffix}-`);
    }
    return c.toUpperCase().startsWith(`${prefix}-`);
  });

  // Extract numeric parts and find max
  const numbers = matchingCodes.map(c => {
    const parts = c.split('-');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    return isNaN(num) ? 0 : num;
  });

  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  if (departmentSuffix) {
    return `${prefix}-${departmentSuffix}-${String(nextNum).padStart(3, '0')}`;
  }
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

// ============================================================================
// Document Type → Code Prefix Mapping
// ============================================================================

/** Map a DocumentType to the recommended code prefix */
export function getRecommendedPrefixForType(type: DocumentType): string {
  const mapping: Partial<Record<DocumentType, string>> = {
    'MANUEL': 'MQ',
    'Manual': 'MQ',
    'POLITIQUE': 'MQ',
    'Policy': 'MQ',
    'INDICATEUR': 'MQ',
    'PROCESS_MAP': 'MQ',
    'Process Map': 'MQ',
    'ORGANIGRAMME': 'MQ',
    'Organigram': 'MQ',
    'REGLEMENTAIRE': 'REG',
    'MAPPING': 'REG',
    'PROCEDURE': 'PR',
    'Procedure': 'PR',
    'SOP': 'PR',
    'INSTRUCTION': 'WI',
    'Instruction': 'WI',
    'WI': 'WI',
    'FORMULAIRE': 'FORM',
    'Form': 'FORM',
    'REGISTRE': 'REG',
    'Register': 'REG',
    'ENREGISTREMENT': 'FORM',
    'Record': 'FORM',
    'MASTER_BATCH': 'DL',
    'Master Batch': 'DL',
  };
  return mapping[type] || 'PR';
}

// ============================================================================
// Trigger / Déclencheur System
// ============================================================================

export interface DocumentTrigger {
  /** The document code that IS triggered */
  targetCode: string;
  /** The document code that TRIGGERS the target */
  sourceCode: string;
  /** Type of trigger relationship */
  triggerType: TriggerType;
  /** Description of why this trigger exists */
  description?: string;
  /** Whether the trigger is mandatory (blocks workflow if not fulfilled) */
  isMandatory: boolean;
}

export type TriggerType =
  | 'prerequisite'    // Source must exist/approved before target can be created
  | 'references'      // Target references source (informational)
  | 'activates'       // Source activates/requires target when a condition occurs
  | 'output'          // Target is an output/record of source
  | 'escalation';     // Target escalates from source (e.g., NCR → CAPA)

/** Validate trigger chain — check for circular dependencies */
export function validateTriggerChain(triggers: DocumentTrigger[]): { valid: boolean; cycles?: string[][] } {
  const graph = new Map<string, Set<string>>();
  for (const t of triggers) {
    if (!graph.has(t.sourceCode)) graph.set(t.sourceCode, new Set());
    graph.get(t.sourceCode)!.add(t.targetCode);
  }

  // DFS cycle detection
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return { valid: cycles.length === 0, cycles: cycles.length > 0 ? cycles : undefined };
}

// ============================================================================
// Document Type Mapping: Qwen French → App English (backward compat)
// ============================================================================

export const QWEN_TO_APP_TYPE_MAP: Record<string, DocumentType> = {
  'MANUEL': 'MANUEL',
  'POLITIQUE': 'POLITIQUE',
  'INDICATEUR': 'INDICATEUR',
  'PROCESS_MAP': 'PROCESS_MAP',
  'ORGANIGRAMME': 'ORGANIGRAMME',
  'REGLEMENTAIRE': 'REGLEMENTAIRE',
  'MAPPING': 'MAPPING',
  'PROCEDURE': 'PROCEDURE',
  'INSTRUCTION': 'INSTRUCTION',
  'FORMULAIRE': 'FORMULAIRE',
  'REGISTRE': 'REGISTRE',
  'ENREGISTREMENT': 'ENREGISTREMENT',
  'MASTER_BATCH': 'MASTER_BATCH',
};

export const APP_TO_LEGACY_TYPE_MAP: Record<string, DocumentType> = {
  'MANUEL': 'Manual',
  'POLITIQUE': 'Policy',
  'INDICATEUR': 'Specification',
  'PROCESS_MAP': 'Process Map',
  'ORGANIGRAMME': 'Organigram',
  'REGLEMENTAIRE': 'Specification',
  'MAPPING': 'Technical',
  'PROCEDURE': 'Procedure',
  'INSTRUCTION': 'Instruction',
  'FORMULAIRE': 'Form',
  'REGISTRE': 'Register',
  'ENREGISTREMENT': 'Record',
  'MASTER_BATCH': 'Master Batch',
};

/** Convert a Qwen type to the app DocumentType */
export function qwenTypeToAppType(qwenType: string): DocumentType {
  return QWEN_TO_APP_TYPE_MAP[qwenType] || 'Procedure';
}
