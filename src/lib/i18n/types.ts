export type Locale = 'en' | 'fr';

export interface TranslationStrings {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    close: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    loading: string;
    noData: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    yes: string;
    no: string;
    status: string;
    actions: string;
    details: string;
    date: string;
    description: string;
    title: string;
    type: string;
    priority: string;
    assignedTo: string;
    dueDate: string;
    createdAt: string;
    updatedAt: string;
    version: string;
    owner: string;
    department: string;
    total: string;
    allTypes: string;
    allStatuses: string;
    viewDetails: string;
    advanceTo: string;
    noResults: string;
    searchPlaceholder: string;
    submit: string;
    scope: string;
    none: string;
  };
  // Navigation
  nav: {
    dashboard: string;
    documents: string;
    documentHierarchy: string;
    capa: string;
    ncr: string;
    audits: string;
    risks: string;
    training: string;
    changeControl: string;
    deviations: string;
    batchRecords: string;
    suppliers: string;
    oosOot: string;
    forms: string;
    reports: string;
    compliance: string;
    userManagement: string;
    settings: string;
    records: string;
    governance: string;
  };
  // Section titles — used in AppLayout header
  sections: {
    dashboard: string;
    documents: string;
    'document-hierarchy': string;
    capa: string;
    ncr: string;
    audits: string;
    risks: string;
    training: string;
    'change-control': string;
    deviations: string;
    'batch-records': string;
    suppliers: string;
    'oos-oot': string;
    forms: string;
    reports: string;
    compliance: string;
    'user-management': string;
    settings: string;
  };
  // Dashboard
  dashboard: {
    welcome: string;
    qualityDashboard: string;
    openCapas: string;
    overdue: string;
    critical: string;
    approved: string;
    inReview: string;
    drafts: string;
    closureRate: string;
    createCapa: string;
    createNcr: string;
    uploadDoc: string;
    scheduleAudit: string;
    complianceScore: string;
    quickActions: string;
    batchRecords: string;
    activeRisks: string;
    suppliers: string;
    released: string;
    qualified: string;
    qualityMetricsTrend: string;
    capaStatus: string;
    riskProfile: string;
    recentActivity: string;
  };
  // Setup
  setup: {
    organization: string;
    industry: string;
    standards: string;
    modules: string;
    team: string;
    summary: string;
    selectCountry: string;
    coreModules: string;
    optionalModules: string;
    applicableStandards: string;
    previous: string;
    next: string;
    cancel: string;
    launch: string;
    optionalStep: string;
    selected: string;
    companyName: string;
    companySize: string;
  };
  // Industries
  industries: {
    medicalDevice: string;
    pharmaceutical: string;
    biotech: string;
    ivd: string;
    combinationProduct: string;
  };
  // Document statuses
  statuses: {
    draft: string;
    inReview: string;
    approved: string;
    obsolete: string;
    open: string;
    investigation: string;
    implementation: string;
    effectivenessCheck: string;
    closed: string;
    planned: string;
    inProgress: string;
    completed: string;
    overdue: string;
    mitigated: string;
    accepted: string;
    qualified: string;
    conditional: string;
    disqualified: string;
    underEvaluation: string;
    released: string;
    rejected: string;
    quarantine: string;
    pending: string;
    submitted: string;
    locked: string;
  };
  // Modules specific labels
  modules: {
    documents: {
      title: string;
      documentNumber: string;
      effectiveDate: string;
      expirationDate: string;
      classification: string;
      retentionPeriod: string;
      documentControl: string;
      newDocument: string;
      searchDocuments: string;
      docNumber: string;
      level: string;
      effective: string;
      noDocsFound: string;
      createNewDocument: string;
      stepIdentification: string;
      stepClassification: string;
      stepDescription: string;
      stepReviewApproval: string;
      stepSummary: string;
      documentLevel: string;
      parentDocument: string;
      approver: string;
      nextReviewDate: string;
      regulatoryReferences: string;
      electronicSignatureRequired: string;
      electronicSignatureNote: string;
      reviewSummary: string;
      documentLevelHierarchy: string;
      linkedToParent: string;
      linkedToParentNote: string;
      namingConventionNote: string;
      docNumberPlaceholder: string;
      docTitlePlaceholder: string;
      docTypePlaceholder: string;
      selectParent: string;
      noneTopLevel: string;
      selectApprover: string;
      retentionPlaceholder: string;
      classificationInternal: string;
      classificationExternal: string;
      classificationRegulatory: string;
      classificationConfidential: string;
      levelN1: string;
      levelN2: string;
      levelN3: string;
      levelN4: string;
      isTemplate: string;
      templateReference: string;
      selectTemplate: string;
      noTemplateNeeded: string;
      noApprovedTemplates: string;
      noApprovedTemplatesDesc: string;
      templateMustBeApproved: string;
      templateMustBeApprovedDesc: string;
      createdFromTemplate: string;
      createdFromTemplateNote: string;
      templateBadge: string;
      templateApprovedBadge: string;
      templatePendingBadge: string;
      templatesCount: string;
      referenceTemplate: string;
    };
    capa: {
      title: string;
      capaNumber: string;
      rootCause: string;
      correctiveAction: string;
      effectiveness: string;
      source: string;
      capaManagement: string;
      newCapa: string;
      searchCapas: string;
      createNewCapa: string;
      noCapasFound: string;
    };
    ncr: {
      title: string;
      ncrNumber: string;
      severity: string;
      disposition: string;
      lotNumber: string;
    };
    training: {
      title: string;
      assignedTo: string;
      completedDate: string;
      trainingManagement: string;
      newTraining: string;
      searchTraining: string;
    };
    risk: {
      title: string;
      riskNumber: string;
      probability: string;
      impact: string;
      detectability: string;
      rpn: string;
      riskLevel: string;
      mitigation: string;
    };
    audit: {
      title: string;
      auditNumber: string;
      leadAuditor: string;
      findings: string;
      scheduledDate: string;
    };
    batch: {
      title: string;
      lotNumber: string;
      productName: string;
      manufacturingDate: string;
      expiryDate: string;
      qaRelease: string;
    };
    supplier: {
      title: string;
      supplierCode: string;
      qualificationDate: string;
      performanceScore: string;
    };
    changeControl: {
      title: string;
      ccNumber: string;
      justification: string;
      proposedChange: string;
    };
    deviation: {
      title: string;
      devNumber: string;
      deviationDetails: string;
    };
    compliance: {
      title: string;
      overallCompliance: string;
      compliant: string;
      partiallyCompliant: string;
      nonCompliant: string;
      notAssessed: string;
      gaps: string;
    };
    reports: {
      title: string;
      generate: string;
      export: string;
    };
    oosOot: {
      title: string;
    };
    forms: {
      title: string;
    };
    userManagement: {
      title: string;
    };
    documentHierarchy: {
      title: string;
    };
  };
  // Auth
  auth: {
    login: string;
    logout: string;
    switchUser: string;
    demoMode: string;
    email: string;
    password: string;
    signIn: string;
  };
  // Bulk operations — placeholders for future features
  bulk: {
    selected: string;
    selectAll: string;
    deselectAll: string;
    bulkDelete: string;
    bulkExport: string;
    bulkUpdate: string;
    confirmBulkAction: string;
    bulkActionWarning: string;
  };
  // Custom fields — placeholders for future features
  customFields: {
    title: string;
    addField: string;
    fieldName: string;
    fieldType: string;
    fieldRequired: string;
    fieldOptions: string;
    textType: string;
    numberType: string;
    dateType: string;
    selectType: string;
    multiselectType: string;
  };
  // Data import — placeholders for future features
  dataImport: {
    title: string;
    importFile: string;
    importFromCsv: string;
    importFromExcel: string;
    importPreview: string;
    importConfirm: string;
    importSuccess: string;
    importError: string;
    dragDropOrClick: string;
    supportedFormats: string;
  };
  // Rate limiting
  rateLimit: {
    tooManyRequests: string;
    retryAfter: string;
  };
  // Settings module
  settings: {
    title: string;
    description: string;
    accessDenied: string;
    accessDeniedDesc: string;
    tabs: {
      general: string;
      recordTypes: string;
      users: string;
    };
    general: {
      orgSettings: string;
      orgSettingsDesc: string;
      notificationSettings: string;
    };
    recordTypes: {
      title: string;
      description: string;
      newType: string;
      totalTypes: string;
      systemTypes: string;
      customTypes: string;
      allTypes: string;
      systemOnly: string;
      customOnly: string;
      searchPlaceholder: string;
      noTypesFound: string;
      createTitle: string;
      createDesc: string;
      editTitle: string;
      editDesc: string;
      deleteTitle: string;
      deleteDesc: string;
      deleteWarning: string;
      name: string;
      namePlaceholder: string;
      codePrefix: string;
      descriptionField: string;
      descriptionPlaceholder: string;
      workflowTemplate: string;
      workflowPreview: string;
      initialStatus: string;
    };
  };
}
