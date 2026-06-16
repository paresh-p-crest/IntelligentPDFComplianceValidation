export const FINDING_TYPE_LABELS = {
  MISSING_SIGNATURE: 'Missing Signature',
  STATUS_EXCEPTION: 'Status Exception',
  MISSING_INFO: 'Missing Information',
};

export const FINDING_FILTERS = [
  { id: 'ALL', label: 'All Findings' },
  { id: 'MISSING_SIGNATURE', label: 'Missing Signature' },
  { id: 'STATUS_EXCEPTION', label: 'Status Exception' },
  { id: 'MISSING_INFO', label: 'Missing Information' },
];

const SOURCE_LABELS = {
  TEXTRACT_FORMS: 'Textract Forms',
  TEXTRACT_LINES: 'Textract Lines',
  TEXTRACT_QUERIES: 'Textract Queries',
};

export function formatFindingType(type) {
  return (
    FINDING_TYPE_LABELS[type] ||
    type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatDisplayStatus(status) {
  if (!status) return 'PENDING';
  return String(status).replaceAll('_', ' ').toUpperCase();
}

export function formatReviewStatus(reviewStatus) {
  if (reviewStatus === 'COMPLETED') return 'REVIEWED';
  return 'AWAITING REVIEW';
}

export function formatConfidence(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(1)}%`;
}

export function formatEvidence(evidence) {
  if (!evidence) return '—';

  return evidence.replace(
    /from\s+(TEXTRACT_[A-Z_]+)/g,
    (_, source) => `from ${SOURCE_LABELS[source] || source.replaceAll('_', ' ')}`,
  );
}

export function formatDescription(finding) {
  if (finding.description) return finding.description;

  const field = finding.field || 'field';
  const page = finding.page || '—';
  const value = finding.value || 'blank';

  if (finding.type === 'MISSING_SIGNATURE') {
    return `The signature block for '${field}' on page ${page} is missing or shows '${value}'.`;
  }
  if (finding.type === 'STATUS_EXCEPTION') {
    return `Quality status field '${field}' on page ${page} is '${value}', which requires review.`;
  }
  return `Required field '${field}' on page ${page} is blank or incomplete.`;
}

export function formatRecommendation(finding) {
  if (finding.recommendation) return finding.recommendation;

  if (finding.type === 'MISSING_SIGNATURE') {
    return 'Obtain the Quality Manager signature and date before acceptance.';
  }
  if (finding.type === 'STATUS_EXCEPTION') {
    return 'Resolve the status exception or obtain Quality Manager approval.';
  }
  return `Complete '${finding.field || 'field'}' with valid information before submission.`;
}

export function filterFindings(findings, filterId) {
  if (filterId === 'ALL') return findings;
  return findings.filter((finding) => finding.type === filterId);
}
