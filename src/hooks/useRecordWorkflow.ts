/**
 * useRecordWorkflow — Shared workflow engine for all N4 record modules
 * Implements the Hybrid 2-Layer Supervision pattern:
 *   Layer 1: FormTemplate approval (§4.2.3 Sovereign)
 *   Layer 2: Record execution with status transitions (§4.2.4 Execution)
 *
 * CORRECTIF 7: Dynamic status flow loading from record_type_definitions
 * Previously hardcoded MODULE_STATUS_FLOWS — now loads from DB/Store
 * while maintaining backward compatibility with the 10 system modules.
 *
 * This hook provides:
 *   - Status transition validation with guards (dynamic + fallback)
 *   - FormTemplate approval gate (Layer 1 guard)
 *   - Unified transition logic across all modules (system + custom)
 *   - Audit trail integration
 *   - Custom record type support (ISO 13485 §4.1)
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type {
  FormTemplate,
  RecordTypeDefinitionLegacy as RecordTypeDefinition,
  StatusFlowStep,
} from '@/types/qms';

// ============================================================================
// Type definitions
// ============================================================================

/** Status flow definition for a module — now dynamic */
export interface StatusFlowDefinition {
  /** Linear progression steps */
  linear: string[];
  /** Branch states (e.g., Rejected, Disqualified) — defaulted to {} by builders */
  branches: Record<string, string[]>;
  /** States that require e-signature to transition to — defaulted to [] by builders */
  eSigRequired: string[];
  /** States that are terminal (no further transitions) — defaulted to [] by builders */
  terminal: string[];
}

/** Transition guard result */
export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  nextStatus?: string;
  requiresESignature?: boolean;
}

/** Hook return type */
export interface UseRecordWorkflowReturn {
  /** Get the next allowed status(es) for a given current status in a module */
  getNextStatuses: (moduleType: string, currentStatus: string) => string[];
  /** Check if a transition is valid */
  canTransition: (moduleType: string, fromStatus: string, toStatus: string) => TransitionResult;
  /** Get the primary (linear) next status */
  getPrimaryNextStatus: (moduleType: string, currentStatus: string) => string | null;
  /** Check if e-signature is required for a transition */
  isESigRequired: (moduleType: string, targetStatus: string) => boolean;
  /** Check if a status is terminal */
  isTerminal: (moduleType: string, status: string) => boolean;
  /** Layer 1 guard: get approved templates for a module */
  getApprovedTemplates: (moduleType: string) => FormTemplate[];
  /** Layer 1 guard: check if a module has at least one approved template */
  hasApprovedTemplate: (moduleType: string) => boolean;
  /** Get the full status flow for a module (dynamic or fallback) */
  getStatusFlow: (moduleType: string) => StatusFlowDefinition;
  /** Get label for a module type */
  getModuleTypeLabel: (moduleType: string) => string;
  /** Map of all module type slugs → human-readable labels (for components
   *  that need to look up multiple labels without N callback calls). */
  moduleTypeLabels: Record<string, string>;
  /** All loaded record type definitions */
  recordTypes: RecordTypeDefinition[];
  /** Whether record types are still loading */
  isLoadingRecordTypes: boolean;
}

// ============================================================================
// Fallback status flows for the 10 system modules
// Used when record_type_definitions are not yet loaded from DB
// ============================================================================

const FALLBACK_STATUS_FLOWS: Record<string, StatusFlowDefinition> = {
  capa: {
    linear: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'],
    branches: {},
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  ncr: {
    linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'],
    branches: {},
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  deviation: {
    linear: ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'],
    branches: {},
    eSigRequired: ['Approved', 'Closed'],
    terminal: ['Closed'],
  },
  change_control: {
    linear: ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed'],
    branches: { 'Rejected': ['Requested'] },
    eSigRequired: ['Approved', 'Rejected', 'Completed'],
    terminal: ['Completed', 'Rejected'],
  },
  audit: {
    linear: ['Planned', 'In Progress', 'Completed'],
    branches: {},
    eSigRequired: ['Completed'],
    terminal: ['Completed'],
  },
  risk: {
    linear: ['Open', 'Mitigated', 'Closed'],
    branches: { 'Accepted': ['Closed'] },
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  training: {
    linear: ['Planned', 'In Progress', 'Completed'],
    branches: {},
    eSigRequired: ['Completed'],
    terminal: ['Completed'],
  },
  supplier: {
    linear: ['Under Evaluation', 'Conditional', 'Qualified'],
    branches: { 'Disqualified': [] },
    eSigRequired: ['Qualified', 'Disqualified'],
    terminal: ['Disqualified'],
  },
  batch_record: {
    linear: ['In Progress', 'Pending QA Review', 'Released'],
    branches: { 'Rejected': [], 'Quarantine': ['Pending QA Review'] },
    eSigRequired: ['Released', 'Rejected'],
    terminal: ['Released', 'Rejected'],
  },
  oos_oot: {
    linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'],
    branches: {},
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  general: {
    linear: ['Open', 'Under Review', 'Closed'],
    branches: {},
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
};

// ============================================================================
// Module type labels (system defaults + dynamic)
// ============================================================================

const SYSTEM_MODULE_LABELS: Record<string, string> = {
  capa: 'CAPA',
  ncr: 'Non-Conformité (NCR)',
  deviation: 'Déviation',
  change_control: 'Maîtrise des Changements',
  audit: 'Audit',
  risk: 'Gestion des Risques',
  training: 'Formation',
  supplier: 'Fournisseur',
  batch_record: 'Enregistrement de Lot',
  oos_oot: 'HSP / HOT',
  general: 'Général',
};

/** Keep old uppercase version for backward compat */
export const MODULE_TYPE_LABELS: Record<string, string> = {
  CAPA: 'CAPA',
  NCR: 'Non-Conformité (NCR)',
  DEVIATION: 'Déviation',
  CHANGE_CONTROL: 'Maîtrise des Changements',
  AUDIT: 'Audit',
  RISK: 'Gestion des Risques',
  TRAINING: 'Formation',
  SUPPLIER: 'Fournisseur',
  BATCH_RECORD: 'Enregistrement de Lot',
  OOS_OOT: 'HSP / HOT',
  GENERAL: 'Général',
};

// ============================================================================
// Branch resolution logic (dynamic, not module-specific)
// ============================================================================

/**
 * Resolves branch transitions dynamically from a StatusFlowDefinition.
 * Previously hardcoded per-module — now generic based on flow configuration.
 */
function resolveBranchTargets(
  flow: StatusFlowDefinition,
  currentStatus: string,
): string[] {
  const targets: string[] = [];

  if (!flow.branches) return targets;

  for (const [branchState, returnStates] of Object.entries(flow.branches)) {
    // A branch state is reachable from the last non-branch linear state before it
    // Convention: branches can be reached from any state that precedes them in linear flow
    // OR from any state that is listed in the branch's return states

    // Check if currentStatus is in the returnStates (can go back to branch)
    if (returnStates.includes(currentStatus) && !targets.includes(branchState)) {
      // Not applicable — returnStates means where you can go FROM the branch state
    }

    // Branch states are reachable from the linear step just before them
    // For simplicity, branch states are reachable from:
    // 1. The second-to-last active linear state (review state before approval)
    // 2. Any linear state that is before the branch's logical position
    const branchIdx = flow.linear.indexOf(branchState);
    if (branchIdx > 0 && currentStatus === flow.linear[branchIdx - 1] && !targets.includes(branchState)) {
      targets.push(branchState);
    }

    // Special case: if branch state is not in linear, it's reachable from
    // the last linear state before the first terminal state
    if (branchIdx === -1) {
      // Find the review/approval state (typically second-to-last before terminal)
      const terminalStates = flow.terminal || [];
      for (let i = flow.linear.length - 1; i >= 0; i--) {
        if (!terminalStates.includes(flow.linear[i])) {
          // This is a "decision point" — branch states are reachable from here
          if (currentStatus === flow.linear[i] && !targets.includes(branchState)) {
            targets.push(branchState);
          }
          break;
        }
      }
    }
  }

  // If current status IS a branch state, add its return paths
  if (flow.branches[currentStatus]) {
    targets.push(...flow.branches[currentStatus]);
  }

  return targets;
}

// ============================================================================
// Hook implementation
// ============================================================================

export function useRecordWorkflow(): UseRecordWorkflowReturn {
  const store = useQMSStore();
  const { hasPermission } = useAuth();

  // Dynamic record types loaded from store/DB
  const [recordTypes, setRecordTypes] = useState<RecordTypeDefinition[]>([]);
  const [isLoadingRecordTypes, setIsLoadingRecordTypes] = useState(true);

  // Build dynamic status flows from record types
  const dynamicFlows = useMemo(() => {
    const flows: Record<string, StatusFlowDefinition> = {};
    for (const rt of recordTypes) {
      if (rt.statusFlow && rt.statusFlow.length > 0) {
        // Merge all StatusFlowStep entries into a single StatusFlowDefinition
        // Typically there's one step per record type, but support multiple
        const merged: StatusFlowDefinition = {
          linear: [],
          branches: {},
          eSigRequired: [],
          terminal: [],
        };

        for (const step of rt.statusFlow) {
          merged.linear.push(...step.linear);
          const stepBranches = step.branches;
          if (stepBranches) {
            Object.assign(merged.branches, stepBranches);
          }
          if (step.eSigRequired) {
            merged.eSigRequired.push(...step.eSigRequired);
          }
          if (step.terminal) {
            merged.terminal.push(...step.terminal);
          }
        }

        flows[rt.slug] = merged;
      }
    }
    return flows;
  }, [recordTypes]);

  // Dynamic labels from record types
  const dynamicLabels = useMemo(() => {
    const labels: Record<string, string> = { ...SYSTEM_MODULE_LABELS };
    for (const rt of recordTypes) {
      if (!labels[rt.slug]) {
        labels[rt.slug] = rt.name;
      }
    }
    return labels;
  }, [recordTypes]);

  // Load record types from store
  useEffect(() => {
    const loadRecordTypes = async () => {
      try {
        const types = store.getRecordTypes?.() || [];
        setRecordTypes(types);
      } catch {
        // Store may not have getRecordTypes yet — use fallback
      } finally {
        setIsLoadingRecordTypes(false);
      }
    };
    loadRecordTypes();
  }, [store]);

  // -----------------------------------------------------------------------
  // Get status flow (dynamic with fallback)
  // -----------------------------------------------------------------------
  const getStatusFlow = useCallback((moduleType: string): StatusFlowDefinition => {
    const lowerType = moduleType.toLowerCase();
    // 1. Try dynamic flow from record_type_definitions
    if (dynamicFlows[lowerType]) {
      return dynamicFlows[lowerType];
    }
    // 2. Fallback to hardcoded system flows
    if (FALLBACK_STATUS_FLOWS[lowerType]) {
      return FALLBACK_STATUS_FLOWS[lowerType];
    }
    // 3. Ultimate fallback: generic flow
    return FALLBACK_STATUS_FLOWS.general;
  }, [dynamicFlows]);

  // -----------------------------------------------------------------------
  // Get next statuses
  // -----------------------------------------------------------------------
  const getNextStatuses = useCallback((moduleType: string, currentStatus: string): string[] => {
    const flow = getStatusFlow(moduleType);
    const results: string[] = [];

    // Check linear progression
    const linearIdx = flow.linear.indexOf(currentStatus);
    if (linearIdx >= 0 && linearIdx < flow.linear.length - 1) {
      results.push(flow.linear[linearIdx + 1]);
    }

    // Check branches (dynamic resolution)
    const branchTargets = resolveBranchTargets(flow, currentStatus);
    for (const target of branchTargets) {
      if (!results.includes(target)) {
        results.push(target);
      }
    }

    return results;
  }, [getStatusFlow]);

  // -----------------------------------------------------------------------
  // Can transition
  // -----------------------------------------------------------------------
  const canTransition = useCallback((moduleType: string, fromStatus: string, toStatus: string): TransitionResult => {
    const nextStatuses = getNextStatuses(moduleType, fromStatus);

    if (!nextStatuses.includes(toStatus)) {
      return {
        allowed: false,
        reason: `Transition de "${fromStatus}" vers "${toStatus}" non autorisée. Transitions valides : ${nextStatuses.join(', ') || 'aucune'}`,
      };
    }

    const flow = getStatusFlow(moduleType);
    const requiresESig = flow.eSigRequired?.includes(toStatus) || false;

    return {
      allowed: true,
      nextStatus: toStatus,
      requiresESignature: requiresESig,
    };
  }, [getNextStatuses, getStatusFlow]);

  // -----------------------------------------------------------------------
  // Get primary next status
  // -----------------------------------------------------------------------
  const getPrimaryNextStatus = useCallback((moduleType: string, currentStatus: string): string | null => {
    const flow = getStatusFlow(moduleType);
    const idx = flow.linear.indexOf(currentStatus);
    if (idx >= 0 && idx < flow.linear.length - 1) {
      return flow.linear[idx + 1];
    }
    return null;
  }, [getStatusFlow]);

  // -----------------------------------------------------------------------
  // Is e-signature required
  // -----------------------------------------------------------------------
  const isESigRequired = useCallback((moduleType: string, targetStatus: string): boolean => {
    const flow = getStatusFlow(moduleType);
    return flow.eSigRequired?.includes(targetStatus) || false;
  }, [getStatusFlow]);

  // -----------------------------------------------------------------------
  // Is terminal
  // -----------------------------------------------------------------------
  const isTerminal = useCallback((moduleType: string, status: string): boolean => {
    const flow = getStatusFlow(moduleType);
    return flow.terminal?.includes(status) || false;
  }, [getStatusFlow]);

  // -----------------------------------------------------------------------
  // Layer 1 guards
  // -----------------------------------------------------------------------
  const getApprovedTemplates = useCallback((moduleType: string): FormTemplate[] => {
    return store.getApprovedTemplatesForModule(moduleType);
  }, [store]);

  const hasApprovedTemplate = useCallback((moduleType: string): boolean => {
    return store.getApprovedTemplatesForModule(moduleType).length > 0;
  }, [store]);

  // -----------------------------------------------------------------------
  // Module type label
  // -----------------------------------------------------------------------
  const getModuleTypeLabel = useCallback((moduleType: string): string => {
    const lowerType = moduleType.toLowerCase();
    return dynamicLabels[lowerType] || moduleType;
  }, [dynamicLabels]);

  return useMemo(() => ({
    getNextStatuses,
    canTransition,
    getPrimaryNextStatus,
    isESigRequired,
    isTerminal,
    getApprovedTemplates,
    hasApprovedTemplate,
    getStatusFlow,
    getModuleTypeLabel,
    moduleTypeLabels: SYSTEM_MODULE_LABELS,
    recordTypes,
    isLoadingRecordTypes,
  }), [
    getNextStatuses, canTransition, getPrimaryNextStatus,
    isESigRequired, isTerminal, getApprovedTemplates,
    hasApprovedTemplate, getStatusFlow, getModuleTypeLabel,
    recordTypes, isLoadingRecordTypes,
  ]);
}

// ============================================================================
// Export backward-compatible constants for existing code
// ============================================================================

/** @deprecated Use useRecordWorkflow().getStatusFlow() instead */
export const MODULE_STATUS_FLOWS = FALLBACK_STATUS_FLOWS;

/** @deprecated Use useRecordWorkflow().getModuleTypeLabel() instead */
export { SYSTEM_MODULE_LABELS as MODULE_TYPE_LABELS_DEPRECATED };
