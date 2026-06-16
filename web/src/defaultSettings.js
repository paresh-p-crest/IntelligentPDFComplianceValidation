export const DEFAULT_SETTINGS = {
  rulesVersion: '1.0.0',
  rules: [
    {
      id: 'signature-verification',
      name: 'Signature Verification',
      category: 'MISSING_SIGNATURE',
      enabled: true,
      severity: 'HIGH',
      detail: 'Checks signature blocks across the document',
      fieldHints: [
        'signature',
        'hold point witness',
        'mta c&d',
        'pmc hold point',
        'quality staff / quality manager',
      ],
    },
    {
      id: 'status-exception-detection',
      name: 'Status Exception Detection',
      category: 'STATUS_EXCEPTION',
      enabled: true,
      severity: 'MEDIUM',
      detail: 'Flags quality status outside approved values',
      fieldHints: ['quality status'],
      statusValues: ['in review'],
    },
    {
      id: 'mandatory-field-completeness',
      name: 'Mandatory Field Completeness',
      category: 'MISSING_INFO',
      enabled: true,
      severity: 'MEDIUM',
      detail: 'Checks required DQR metadata and form fields',
      fieldHints: [
        'prepared by',
        "inspector's name",
        'inspector name',
        'inspection date',
        'date / time',
        'date/time',
        'attachments',
      ],
    },
    {
      id: 'human-review-queue',
      name: 'Human Review Queue',
      category: 'WORKFLOW',
      enabled: true,
      severity: 'MEDIUM',
      detail: 'Routes exceptions for reviewer decision',
    },
  ],
  appConfig: {
    pollIntervalMs: 5000,
    maxHistoryItems: 25,
    missingInfoPageMinChecklist: 34,
    statusScanEnabled: true,
    ignoreElectronicSignatureLines: true,
  },
  awsConfig: {
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
  },
};

export function mergeSettings(remote) {
  if (!remote) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...remote,
    appConfig: { ...DEFAULT_SETTINGS.appConfig, ...remote.appConfig },
    awsConfig: { ...DEFAULT_SETTINGS.awsConfig, ...remote.awsConfig },
    rules: remote.rules?.length ? remote.rules : DEFAULT_SETTINGS.rules,
  };
}

export function createBlankRule() {
  return {
    id: `custom-rule-${Date.now()}`,
    name: '',
    category: 'MISSING_INFO',
    enabled: true,
    severity: 'MEDIUM',
    detail: '',
    fieldHints: [],
    statusValues: [],
  };
}
