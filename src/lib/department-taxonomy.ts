/**
 * Department Taxonomy — 91 departments from the Qwen ISO 13485 SMQ specification.
 *
 * This file provides the structured department registry that replaces free-text
 * department strings throughout the application. Each department has a code,
 * French label, English label, and the module category it belongs to.
 *
 * Principle: The system provides TOOLS for users to manage 300+ documents;
 * it does NOT pre-populate them. This taxonomy serves as a selectable registry.
 */

// ============================================================================
// Department Categories (Module-level grouping)
// ============================================================================

export type DepartmentCategory =
  | 'strategique'       // Strategic / Direction
  | 'transversal'       // Cross-functional (AQ, HR, IT, Regulatory)
  | 'qc_lab'            // Quality Control Laboratory
  | 'production'        // Manufacturing & Production
  | 'rd'                // Research & Development
  | 'utilities'         // Utilities (Water, O2, N2, Generators)
  | 'maintenance'       // Maintenance (Electrical, Plumbing, Mechanical, etc.)
  | 'hse'               // Health, Safety & Environment
  | 'supply_chain'      // Supply Chain, Warehouse, Logistics
  | 'commercial'        // Commercial, Sales, Marketing
  | 'finance'           // Finance, Accounting, Procurement
  | 'it'                // Information Technology
  | 'quality'           // Quality Assurance (standalone)
  | 'regulatory'        // Regulatory Affairs
  | 'audit'             // Audit (internal/external)
  | 'other';            // Uncategorized

// ============================================================================
// Department Interface
// ============================================================================

export interface Department {
  /** Unique code (e.g., 'DIRECTION', 'AQ', 'LABO_PCQ') */
  code: string;
  /** French label (e.g., 'Direction', 'Assurance Qualité') */
  labelFr: string;
  /** English label (e.g., 'Management', 'Quality Assurance') */
  labelEn: string;
  /** Module category grouping */
  category: DepartmentCategory;
  /** Whether this department is active by default */
  isActive: boolean;
  /** Parent department code (for hierarchical departments) */
  parentCode?: string;
}

// ============================================================================
// Full Department Registry — 91 departments from Qwen specification
// ============================================================================

export const DEPARTMENTS: Department[] = [
  // === STRATÉGIQUE (Strategic) ===
  { code: 'DIRECTION', labelFr: 'Direction', labelEn: 'Management', category: 'strategique', isActive: true },
  { code: 'DIRECTION_AQ', labelFr: 'Direction / AQ', labelEn: 'Management / QA', category: 'strategique', isActive: true, parentCode: 'DIRECTION' },
  { code: 'DRH', labelFr: 'DRH', labelEn: 'Human Resources', category: 'strategique', isActive: true },
  { code: 'DRH_AQ', labelFr: 'DRH / AQ', labelEn: 'HR / QA', category: 'strategique', isActive: true, parentCode: 'DRH' },
  { code: 'DRH_DIRECTION', labelFr: 'DRH / Direction', labelEn: 'HR / Management', category: 'strategique', isActive: true, parentCode: 'DRH' },
  { code: 'DRH_TECHNIQUE', labelFr: 'DRH / Technique', labelEn: 'HR / Technical', category: 'strategique', isActive: true, parentCode: 'DRH' },
  { code: 'DRH_LABO_QC', labelFr: 'DRH / Labo QC', labelEn: 'HR / QC Lab', category: 'strategique', isActive: true, parentCode: 'DRH' },
  { code: 'JURIDIQUE', labelFr: 'Juridique', labelEn: 'Legal', category: 'strategique', isActive: true },

  // === QUALITÉ (Quality Assurance) ===
  { code: 'AQ', labelFr: 'AQ', labelEn: 'Quality Assurance', category: 'quality', isActive: true },
  { code: 'AQ_DIRECTION', labelFr: 'AQ / Direction', labelEn: 'QA / Management', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_REGLEMENTAIRE', labelFr: 'AQ / Réglementaire', labelEn: 'QA / Regulatory', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_ARCHIVES', labelFr: 'AQ / Archives', labelEn: 'QA / Archives', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_TECHNIQUE', labelFr: 'AQ / Technique', labelEn: 'QA / Technical', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_LABO', labelFr: 'AQ / Labo', labelEn: 'QA / Lab', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_PRODUCTION', labelFr: 'AQ / Production', labelEn: 'QA / Production', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'AQ_COMPTA', labelFr: 'AQ / Comptabilité', labelEn: 'QA / Accounting', category: 'quality', isActive: true, parentCode: 'AQ' },

  // === RÉGLEMENTAIRE (Regulatory Affairs) ===
  { code: 'AFFAIRES_REG', labelFr: 'Affaires Réglementaires', labelEn: 'Regulatory Affairs', category: 'regulatory', isActive: true },
  { code: 'AFFAIRES_REG_DIRECTION', labelFr: 'Affaires Réglementaires / Direction', labelEn: 'Regulatory / Management', category: 'regulatory', isActive: true, parentCode: 'AFFAIRES_REG' },

  // === AUDIT ===
  { code: 'AUDITEURS', labelFr: 'Auditeurs', labelEn: 'Auditors', category: 'audit', isActive: true },
  { code: 'AUDITEURS_AQ', labelFr: 'Auditeurs / AQ', labelEn: 'Auditors / QA', category: 'audit', isActive: true, parentCode: 'AUDITEURS' },

  // === LABORATOIRE QC (Quality Control Lab) ===
  { code: 'LABO_PCQ', labelFr: 'Labo PCQ', labelEn: 'QC Lab (Physico-Chemical)', category: 'qc_lab', isActive: true },
  { code: 'LABO_PCQ_RD', labelFr: 'Labo PCQ / R&D', labelEn: 'QC Lab / R&D', category: 'qc_lab', isActive: true, parentCode: 'LABO_PCQ' },
  { code: 'LABO_PCQ_MAINT', labelFr: 'Labo PCQ / Maintenance', labelEn: 'QC Lab / Maintenance', category: 'qc_lab', isActive: true, parentCode: 'LABO_PCQ' },
  { code: 'LABO_PCQ_AQ', labelFr: 'Labo PCQ / AQ', labelEn: 'QC Lab / QA', category: 'qc_lab', isActive: true, parentCode: 'LABO_PCQ' },

  // === LABORATOIRE MICRO (Microbiology Lab) ===
  { code: 'LABO_MICRO', labelFr: 'Labo Micro', labelEn: 'Microbiology Lab', category: 'qc_lab', isActive: true },
  { code: 'LABO_MICRO_HSE', labelFr: 'Labo Micro / HSE', labelEn: 'Micro Lab / HSE', category: 'qc_lab', isActive: true, parentCode: 'LABO_MICRO' },
  { code: 'LABO_MICRO_RD', labelFr: 'Labo Micro / R&D', labelEn: 'Micro Lab / R&D', category: 'qc_lab', isActive: true, parentCode: 'LABO_MICRO' },

  // === PRODUCTION ===
  { code: 'PRODUCTION', labelFr: 'Production', labelEn: 'Production', category: 'production', isActive: true },
  { code: 'PRODUCTION_AQ', labelFr: 'Production / AQ', labelEn: 'Production / QA', category: 'production', isActive: true, parentCode: 'PRODUCTION' },
  { code: 'PRODUCTION_QC', labelFr: 'Production / QC', labelEn: 'Production / QC', category: 'production', isActive: true, parentCode: 'PRODUCTION' },
  { code: 'PRODUCTION_SUPPLY', labelFr: 'Production / Supply', labelEn: 'Production / Supply', category: 'production', isActive: true, parentCode: 'PRODUCTION' },

  // === R&D ===
  { code: 'RD', labelFr: 'R&D', labelEn: 'R&D', category: 'rd', isActive: true },
  { code: 'RD_LABO', labelFr: 'R&D / Labo', labelEn: 'R&D / Lab', category: 'rd', isActive: true, parentCode: 'RD' },
  { code: 'RD_PRODUCTION', labelFr: 'R&D / Production', labelEn: 'R&D / Production', category: 'rd', isActive: true, parentCode: 'RD' },
  { code: 'RD_JURIDIQUE', labelFr: 'R&D / Juridique', labelEn: 'R&D / Legal', category: 'rd', isActive: true, parentCode: 'RD' },
  { code: 'RD_QC', labelFr: 'R&D / QC', labelEn: 'R&D / QC', category: 'rd', isActive: true, parentCode: 'RD' },

  // === UTILITÉS (Utilities) ===
  { code: 'STATION_EAU', labelFr: 'Station Eau', labelEn: 'Water Station', category: 'utilities', isActive: true },
  { code: 'STATION_EAU_QC', labelFr: 'Station Eau / QC', labelEn: 'Water Station / QC', category: 'utilities', isActive: true, parentCode: 'STATION_EAU' },
  { code: 'UTILITES', labelFr: 'Utilités', labelEn: 'Utilities', category: 'utilities', isActive: true },
  { code: 'UTILITES_MAINT', labelFr: 'Utilités / Maintenance', labelEn: 'Utilities / Maintenance', category: 'utilities', isActive: true, parentCode: 'UTILITES' },
  { code: 'UTILITES_HSE', labelFr: 'Utilités / HSE', labelEn: 'Utilities / HSE', category: 'utilities', isActive: true, parentCode: 'UTILITES' },

  // === MAINTENANCE ===
  { code: 'MAINTENANCE', labelFr: 'Maintenance', labelEn: 'Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINTENANCE_SUPPLY', labelFr: 'Maintenance / Supply', labelEn: 'Maintenance / Supply', category: 'maintenance', isActive: true, parentCode: 'MAINTENANCE' },
  { code: 'MAINT_ELEC', labelFr: 'Maintenance Élec', labelEn: 'Electrical Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINT_PLB', labelFr: 'Maintenance Plb', labelEn: 'Plumbing Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINT_MEC', labelFr: 'Maintenance Méca', labelEn: 'Mechanical Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINT_FRD', labelFr: 'Maintenance Froid', labelEn: 'HVAC / Cold Room Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINT_AUTO', labelFr: 'Maintenance Auto', labelEn: 'Automation / PLC Maintenance', category: 'maintenance', isActive: true },
  { code: 'MAINT_STRUCT', labelFr: 'Maintenance Struct', labelEn: 'Structural Maintenance', category: 'maintenance', isActive: true },

  // === HSE (Health, Safety, Environment) ===
  { code: 'HSE', labelFr: 'HSE', labelEn: 'HSE', category: 'hse', isActive: true },
  { code: 'HSE_MAINT', labelFr: 'HSE / Maintenance', labelEn: 'HSE / Maintenance', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_DIRECTION', labelFr: 'HSE / Direction', labelEn: 'HSE / Management', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_LABO_MICRO', labelFr: 'HSE / Labo Micro', labelEn: 'HSE / Micro Lab', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_SUPPLY', labelFr: 'HSE / Supply', labelEn: 'HSE / Supply', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_PRODUCTION', labelFr: 'HSE / Production', labelEn: 'HSE / Production', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_QC', labelFr: 'HSE / QC', labelEn: 'HSE / QC', category: 'hse', isActive: true, parentCode: 'HSE' },

  // === SUPPLY CHAIN ===
  { code: 'SUPPLY_CHAIN', labelFr: 'Supply Chain', labelEn: 'Supply Chain', category: 'supply_chain', isActive: true },
  { code: 'SC_RECEPTION', labelFr: 'Supply Chain / Réception', labelEn: 'Supply Chain / Reception', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_ENTREPOT', labelFr: 'Supply Chain / Entrepôt', labelEn: 'Supply Chain / Warehouse', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_EXPEDITION', labelFr: 'Supply Chain / Expédition', labelEn: 'Supply Chain / Shipping', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_QC', labelFr: 'Supply Chain / QC', labelEn: 'Supply Chain / QC', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_DIRECTION', labelFr: 'Supply Chain / Direction', labelEn: 'Supply Chain / Management', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_AQ', labelFr: 'Supply Chain / AQ', labelEn: 'Supply Chain / QA', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_MAINT', labelFr: 'Supply Chain / Maintenance', labelEn: 'Supply Chain / Maintenance', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_HSE', labelFr: 'Supply Chain / HSE', labelEn: 'Supply Chain / HSE', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_COMPTA', labelFr: 'Supply Chain / Comptabilité', labelEn: 'Supply Chain / Accounting', category: 'supply_chain', isActive: true, parentCode: 'SUPPLY_CHAIN' },

  // === COMMERCIAL ===
  { code: 'COMMERCIAL', labelFr: 'Commercial', labelEn: 'Commercial / Sales', category: 'commercial', isActive: true },
  { code: 'COMMERCIAL_AQ', labelFr: 'Commercial / AQ', labelEn: 'Commercial / QA', category: 'commercial', isActive: true, parentCode: 'COMMERCIAL' },
  { code: 'COMMERCIAL_SUPPLY', labelFr: 'Commercial / Supply', labelEn: 'Commercial / Supply', category: 'commercial', isActive: true, parentCode: 'COMMERCIAL' },

  // === FINANCE ===
  { code: 'FINANCE', labelFr: 'Finance', labelEn: 'Finance', category: 'finance', isActive: true },
  { code: 'COMPTA', labelFr: 'Comptabilité', labelEn: 'Accounting', category: 'finance', isActive: true, parentCode: 'FINANCE' },
  { code: 'COMPTA_DIRECTION', labelFr: 'Comptabilité / Direction', labelEn: 'Accounting / Management', category: 'finance', isActive: true, parentCode: 'COMPTA' },
  { code: 'COMPTA_SC', labelFr: 'Comptabilité / Supply Chain', labelEn: 'Accounting / Supply Chain', category: 'finance', isActive: true, parentCode: 'COMPTA' },
  { code: 'FINANCE_AQ', labelFr: 'Finance / AQ', labelEn: 'Finance / QA', category: 'finance', isActive: true, parentCode: 'FINANCE' },

  // === IT ===
  { code: 'INFORMATIQUE', labelFr: 'Informatique', labelEn: 'IT', category: 'it', isActive: true },
  { code: 'IT_AQ', labelFr: 'Informatique / AQ', labelEn: 'IT / QA', category: 'it', isActive: true, parentCode: 'INFORMATIQUE' },

  // === CROSS-FUNCTIONAL ===
  { code: 'TOUS_DEPARTEMENTS', labelFr: 'Tous Départements', labelEn: 'All Departments', category: 'transversal', isActive: true },
  { code: 'DIRECTION_SUPPLY_AQ', labelFr: 'Direction / Supply / AQ', labelEn: 'Management / Supply / QA', category: 'transversal', isActive: true },
  { code: 'LABO_STAB', labelFr: 'Labo Stabilité', labelEn: 'Stability Lab', category: 'qc_lab', isActive: true },
  { code: 'OOS_TEAM', labelFr: 'Équipe OOS', labelEn: 'OOS Team', category: 'qc_lab', isActive: true },

  // === Additional departments from Qwen spec (OOS/OOT module) ===
  { code: 'LABO_PCQ_OOS', labelFr: 'Labo PCQ / OOS', labelEn: 'QC Lab / OOS', category: 'qc_lab', isActive: true, parentCode: 'LABO_PCQ' },
  { code: 'LABO_MICRO_OOS', labelFr: 'Labo Micro / OOS', labelEn: 'Micro Lab / OOS', category: 'qc_lab', isActive: true, parentCode: 'LABO_MICRO' },
  { code: 'OOS_LABO', labelFr: 'OOS / Labo', labelEn: 'OOS / Lab', category: 'qc_lab', isActive: true },

  // === Change Control / Deviation departments ===
  { code: 'CC_EQUIPEMENT', labelFr: 'Change Control / Équipement', labelEn: 'Change Control / Equipment', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'CC_METHODE', labelFr: 'Change Control / Méthode', labelEn: 'Change Control / Method', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'CC_REGLEMENTAIRE', labelFr: 'Change Control / Réglementaire', labelEn: 'Change Control / Regulatory', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'CC_DOCUMENTATION', labelFr: 'Change Control / Documentation', labelEn: 'Change Control / Documentation', category: 'quality', isActive: true, parentCode: 'AQ' },

  // === Batch Release / Lot Dossier ===
  { code: 'DL_DIRECTION', labelFr: 'Dossier Lot / Direction', labelEn: 'Batch Dossier / Management', category: 'quality', isActive: true, parentCode: 'AQ' },
  { code: 'DL_QA', labelFr: 'Dossier Lot / AQ', labelEn: 'Batch Dossier / QA', category: 'quality', isActive: true, parentCode: 'AQ' },

  // === HSE sub-departments ===
  { code: 'HSE_EPI', labelFr: 'HSE / EPI', labelEn: 'HSE / PPE', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_DECHETS', labelFr: 'HSE / Déchets', labelEn: 'HSE / Waste', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_INCENDIE', labelFr: 'HSE / Incendie', labelEn: 'HSE / Fire', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_ENVIRONNEMENT', labelFr: 'HSE / Environnement', labelEn: 'HSE / Environment', category: 'hse', isActive: true, parentCode: 'HSE' },
  { code: 'HSE_SECURITE', labelFr: 'HSE / Sécurité', labelEn: 'HSE / Safety', category: 'hse', isActive: true, parentCode: 'HSE' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/** Get department by code */
export function getDepartmentByCode(code: string): Department | undefined {
  return DEPARTMENTS.find(d => d.code === code);
}

/** Get departments by category */
export function getDepartmentsByCategory(category: DepartmentCategory): Department[] {
  return DEPARTMENTS.filter(d => d.category === category);
}

/** Get all department codes */
export function getAllDepartmentCodes(): string[] {
  return DEPARTMENTS.map(d => d.code);
}

/** Get department display label (French by default, English optional) */
export function getDepartmentLabel(code: string, locale: 'fr' | 'en' = 'fr'): string {
  const dept = getDepartmentByCode(code);
  if (!dept) return code;
  return locale === 'en' ? dept.labelEn : dept.labelFr;
}

/** Get departments grouped by category */
export function getDepartmentsGroupedByCategory(): Record<DepartmentCategory, Department[]> {
  const grouped = {} as Record<DepartmentCategory, Department[]>;
  for (const dept of DEPARTMENTS) {
    if (!grouped[dept.category]) grouped[dept.category] = [];
    grouped[dept.category].push(dept);
  }
  return grouped;
}

/** Validate that a department code exists in the taxonomy */
export function isValidDepartment(code: string): boolean {
  return DEPARTMENTS.some(d => d.code === code);
}
