const TYPE_STYLES = {
  MISSING_SIGNATURE: 'bg-rose-100 text-rose-800 ring-rose-200',
  STATUS_EXCEPTION: 'bg-orange-100 text-orange-900 ring-orange-200',
  MISSING_INFO: 'bg-sky-100 text-sky-900 ring-sky-200',
};

const TYPE_FILTER_STYLES = {
  MISSING_SIGNATURE: 'bg-rose-600 text-white',
  STATUS_EXCEPTION: 'bg-orange-600 text-white',
  MISSING_INFO: 'bg-sky-600 text-white',
};

const TYPE_COLORS = {
  MISSING_SIGNATURE: '#e11d48',
  STATUS_EXCEPTION: '#ea580c',
  MISSING_INFO: '#0ea5e9',
};

const SEVERITY_STYLES = {
  HIGH: 'bg-rose-600 text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-slate-500 text-white',
};

export function getTypeBadgeClass(type) {
  return TYPE_STYLES[type] || 'bg-slate-100 text-slate-700 ring-slate-200';
}

export function getTypeFilterActiveClass(type) {
  return TYPE_FILTER_STYLES[type] || 'bg-indigo-600 text-white';
}

export function getTypeChartColor(type) {
  return TYPE_COLORS[type] || '#94a3b8';
}

export function getSeverityBadgeClass(severity) {
  return SEVERITY_STYLES[severity] || 'bg-slate-500 text-white';
}

export function getOverallStatusStyle(status) {
  if (status === 'VALIDATED') {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  }
  if (status === 'VALIDATED_WITH_EXCEPTIONS') {
    return 'bg-amber-100 text-amber-900 ring-amber-200';
  }
  if (status === 'APPROVED') {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  }
  if (status === 'REJECTED') {
    return 'bg-rose-100 text-rose-800 ring-rose-200';
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

export function downloadAuditReport({ fileName, jobStatus, uploadResult }) {
  const payload = {
    generatedAt: new Date().toISOString(),
    documentName: fileName,
    s3Key: uploadResult?.key,
    jobId: jobStatus?.jobId,
    metadata: jobStatus?.metadata || {},
    validationSummary: jobStatus?.validationSummary || {},
    queryAnswers: jobStatus?.queryAnswers || [],
    findings: jobStatus?.findings || [],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName?.replace(/\.pdf$/i, '') || 'audit'}-report.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
