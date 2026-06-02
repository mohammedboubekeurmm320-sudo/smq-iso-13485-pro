/**
 * useRecordWorkflow — Shared workflow engine for all N4 record modules
 * Implements the Hybrid 2-Layer Supervision pattern:
 *   Layer 1: FormTemplate approval (§4.2.3 Sovereign)
 *   Layer 2: Record execution with status transitions (§4.2.4 Execution)
 *
 * This hook provides:
 *   - Status transition validation with guards
 *   - FormTemplate approval gate (Layer 1 guard)
 *   - Unified transition logic across all 10 modules
 *   - Audit trail integration
 */

import { useCallback, useMemo } from 'react';
import { useQMSStore } from '@/lib/demo-store';
import { useAuth } from '@/contexts/AuthContext';
import type { FormTemplateModule, FormTemplate } from '@/types/qms';

// ============================================================================
// Type definitions
// ============================================================================

/** Maps each module to its status enum type */
export type ModuleStatusMap = {
  CAPA: 'Open' | 'Investigation' | 'Implementation' | 'Effectiveness Check' | 'Closed';
  NCR: 'Open' | 'Under Investigation' | 'Pending Disposition' | 'Closed';
  DEVIATION: 'Open' | 'Under Investigation' | 'Pending QA Review' | 'Approved' | 'Closed';
  CHANGE_CONTROL: 'Requested' | 'Under Review' | 'Approved' | 'In Implementation' | 'Completed' | 'Rejected';
  AUDIT: 'Planned' | 'In Progress' | 'Completed';
  RISK: 'Open' | 'Mitigated' | 'Accepted' | 'Closed';
  TRAINING: 'Planned' | 'In Progress' | 'Completed' | 'Overdue';
  SUPPLIER: 'Under Evaluation' | 'Conditional' | 'Qualified' | 'Disqualified';
  BATCH_RECORD: 'In Progress' | 'Pending QA Review' | 'Released' | 'Rejected' | 'Quarantine';
  OOS_OOT: 'Open' | 'Under Investigation' | 'Pending Disposition' | 'Closed';
};

/** Status flow definition for a module */
export interface StatusFlowDefinition {
  /** Linear progression steps */
  linear: string[];
  /** Branch states (e.g., Rejected, Disqualified) */
  branches?: Record<string, string[]>;
  /** States that require e-signature to transition to */
  eSigRequired?: string[];
  /** States that are terminal (no further transitions) */
  terminal?: string[];
}

/** Pre-defined status flows for all 10 modules */
export const MODULE_STATUS_FLOWS: Record<FormTemplateModule, StatusFlowDefinition> = {
  CAPA: {
    linear: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'],
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  NCR: {
    linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'],
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  DEVIATION: {
    linear: ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'],
    eSigRequired: ['Approved', 'Closed'],
    terminal: ['Closed'],
  },
  CHANGE_CONTROL: {
    linear: ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed'],
    branches: { 'Rejected': ['Requested'] },
    eSigRequired: ['Approved', 'Rejected', 'Completed'],
    terminal: ['Completed', 'Rejected'],
  },
  AUDIT: {
    linear: ['Planned', 'In Progress', 'Completed'],
    eSigRequired: ['Completed'],
    terminal: ['Completed'],
  },
  RISK: {
    linear: ['Open', 'Mitigated', 'Closed'],
    branches: { 'Accepted': ['Closed'] },
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  TRAINING: {
    linear: ['Planned', 'In Progress', 'Completed'],
    eSigRequired: ['Completed'],
    terminal: ['Completed'],
  },
  SUPPLIER: {
    linear: ['Under Evaluation', 'Conditional', 'Qualified'],
    branches: { 'Disqualified': [] },
    eSigRequired: ['Qualified', 'Disqualified'],
    terminal: ['Disqualified'],
  },
  BATCH_RECORD: {
    linear: ['In Progress', 'Pending QA Review', 'Released'],
    branches: { 'Rejected': [], 'Quarantine': ['Pending QA Review'] },
    eSigRequired: ['Released', 'Rejected'],
    terminal: ['Released', 'Rejected'],
  },
  OOS_OOT: {
    linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'],
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
  GENERAL: {
    linear: ['Open', 'Under Review', 'Closed'],
    eSigRequired: ['Closed'],
    terminal: ['Closed'],
  },
};

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
  getNextStatuses: (moduleType: FormTemplateModule, currentStatus: string) => string[];
  /** Check if a transition is valid */
  canTransition: (moduleType: FormTemplateModule, fromStatus: string, toStatus: string) => TransitionResult;
  /** Get the primary (linear) next status */
  getPrimaryNextStatus: (moduleType: FormTemplateModule, currentStatus: string) => string | null;
  /** Check if e-signature is required for a transition */
  isESigRequired: (moduleType: FormTemplateModule, targetStatus: string) => boolean;
  /** Check if a status is terminal */
  isTerminal: (moduleType: FormTemplateModule, status: string) => boolean;
  /** Layer 1 guard: get approved templates for a module */
  getApprovedTemplates: (moduleType: FormTemplateModule) => FormTemplate[];
  /** Layer 1 guard: check if a module has at least one approved template */
  hasApprovedTemplate: (moduleType: FormTemplateModule) => boolean;
  /** Get the full status flow for a module */
  getStatusFlow: (moduleType: FormTemplateModule) => StatusFlowDefinition;
  /** Module type labels for display */
  moduleTypeLabels: Record<FormTemplateModule, string>;
}

// ============================================================================
// Module type labels
// ============================================================================

const MODULE_TYPE_LABELS: Record<FormTemplateModule, string> = {
  CAPA: 'CAPA',
  NCR: 'Non-Conformance (NCR)',
  DEVIATION: 'Deviation',
  CHANGE_CONTROL: 'Change Control',
  AUDIT: 'Audit',
  RISK: 'Risk Management',
  TRAINING: 'Training',
  SUPPLIER: 'Supplier',
  BATCH_RECORD: 'Batch Record',
  OOS_OOT: 'OOS / OOT',
  GENERAL: 'General',
};

// ============================================================================
// Hook implementation
// ============================================================================

export function useRecordWorkflow(): UseRecordWorkflowReturn {
  const store = useQMSStore();
  const { hasPermission } = useAuth();

  const moduleTypeLabels = MODULE_TYPE_LABELS;

  const getStatusFlow = useCallback((moduleType: FormTemplateModule): StatusFlowDefinition => {
    return MODULE_STATUS_FLOWS[moduleType] || MODULE_STATUS_FLOWS.GENERAL;
  }, []);

  const getNextStatuses = useCallback((moduleType: FormTemplateModule, currentStatus: string): string[] => {
    const flow = getStatusFlow(moduleType);
    const results: string[] = [];

    // Check linear progression
    const linearIdx = flow.linear.indexOf(currentStatus);
    if (linearIdx >= 0 && linearIdx < flow.linear.length - 1) {
      results.push(flow.linear[linearIdx + 1]);
    }

    // Check branches
    if (flow.branches) {
      // If current status is in branches, add its return paths
      if (flow.branches[currentStatus]) {
        results.push(...flow.branches[currentStatus]);
      }
      // If current status allows branching to a branch state
      for (const [branchState, returnStates] of Object.entries(flow.branches)) {
        // Branch states can be reached from the last linear state before them
        // For simplicity, we check if branchState is a valid target from current position
        if (!results.includes(branchState)) {
          // In Change Control, Rejected is reachable from Under Review
          if (moduleType === 'CHANGE_CONTROL' && currentStatus === 'Under Review' && branchState === 'Rejected') {
            results.push(branchState);
          }
          // In Supplier, Disqualified is reachable from any active state
          if (moduleType === 'SUPPLIER' && ['Under Evaluation', 'Conditional', 'Qualified'].includes(currentStatus) && branchState === 'Disqualified') {
            results.push(branchState);
          }
          // In Batch Record, Rejected and Quarantine reachable from certain states
          if (moduleType === 'BATCH_RECORD') {
            if (currentStatus === 'Pending QA Review' && (branchState === 'Rejected' || branchState === 'Quarantine')) {
              results.push(branchState);
            }
          }
          // In Risk, Accepted is reachable from Open
          if (moduleType === 'RISK' && currentStatus === 'Open' && branchState === 'Accepted') {
            results.push(branchState);
          }
        }
      }
    }

    return results;
  }, [getStatusFlow]);

  const canTransition = useCallback((moduleType: FormTemplateModule, fromStatus: string, toStatus: string): TransitionResult => {
    const nextStatuses = getNextStatuses(moduleType, fromStatus);

    if (!nextStatuses.includes(toStatus)) {
      return {
        allowed: false,
        reason: `Transition from "${fromStatus}" to "${toStatus}" is not allowed. Valid transitions: ${nextStatuses.join(', ') || 'none'}`,
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

  const getPrimaryNextStatus = useCallback((moduleType: FormTemplateModule, currentStatus: string): string | null => {
    const flow = getStatusFlow(moduleType);
    const idx = flow.linear.indexOf(currentStatus);
    if (idx >= 0 && idx < flow.linear.length - 1) {
      return flow.linear[idx + 1];
    }
    return null;
  }, [getStatusFlow]);

  const isESigRequired = useCallback((moduleType: FormTemplateModule, targetStatus: string): boolean => {
    const flow = getStatusFlow(moduleType);
    return flow.eSigRequired?.includes(targetStatus) || false;
  }, [getStatusFlow]);

  const isTerminal = useCallback((moduleType: FormTemplateModule, status: string): boolean => {
    const flow = getStatusFlow(moduleType);
    return flow.terminal?.includes(status) || false;
  }, [getStatusFlow]);

  const getApprovedTemplates = useCallback((moduleType: FormTemplateModule): FormTemplate[] => {
    return store.getApprovedTemplatesForModule(moduleType);
  }, [store]);

  const hasApprovedTemplate = useCallback((moduleType: FormTemplateModule): boolean => {
    return store.getApprovedTemplatesForModule(moduleType).length > 0;
  }, [store]);

  return useMemo(() => ({
    getNextStatuses,
    canTransition,
    getPrimaryNextStatus,
    isESigRequired,
    isTerminal,
    getApprovedTemplates,
    hasApprovedTemplate,
    getStatusFlow,
    moduleTypeLabels,
  }), [
    getNextStatuses, canTransition, getPrimaryNextStatus,
    isESigRequired, isTerminal, getApprovedTemplates,
    hasApprovedTemplate, getStatusFlow,
  ]);
}
