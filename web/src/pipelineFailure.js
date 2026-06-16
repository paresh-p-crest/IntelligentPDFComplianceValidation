/** User-facing and technical messages for AWS pipeline failures. */

function asStackTrace(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.join('\n');
  return String(value);
}

export function formatTechnicalDetails(jobStatus = {}) {
  const details = jobStatus.errorDetails || {};
  const lines = [
    details.stage && `Stage: ${details.stage}`,
    (details.errorType || jobStatus.errorType) &&
      `Type: ${details.errorType || jobStatus.errorType}`,
    (details.errorMessage || jobStatus.errorMessage) &&
      `Message: ${details.errorMessage || jobStatus.errorMessage}`,
    jobStatus.jobId && `Textract job: ${jobStatus.jobId}`,
    jobStatus.executionArn && `Execution: ${jobStatus.executionArn}`,
    details.requestId && `Request ID: ${details.requestId}`,
    asStackTrace(details.stackTrace) && `Trace:\n${asStackTrace(details.stackTrace)}`,
  ].filter(Boolean);

  return lines.join('\n\n') || jobStatus.errorMessage || 'No technical details available.';
}

export function getPipelineFailureInfo(jobStatus = {}, fallbackError = '') {
  const details = jobStatus.errorDetails || {};
  const rawMessage = (
    jobStatus.errorMessage ||
    details.errorMessage ||
    fallbackError ||
    ''
  ).toString();
  const errorType = (details.errorType || '').toString();
  const stage = (details.stage || '').toString();
  const combined = `${errorType} ${rawMessage}`.toLowerCase();

  if (stage === 'Amazon Textract' || combined.includes('textract')) {
    return {
      title: 'Textract could not finish analyzing this PDF',
      message:
        'Amazon Textract did not complete successfully. The file may be corrupted, password-protected, or unsupported. Try a different export of the PDF and upload again.',
      technical: formatTechnicalDetails(jobStatus),
    };
  }

  if (
    combined.includes('load_settings') ||
    combined.includes('settings') ||
    errorType === 'TypeError'
  ) {
    return {
      title: 'Compliance settings could not be loaded',
      message:
        'The rule engine failed while loading compliance settings. Ask an administrator to verify the deployment and settings configuration, then try again.',
      technical: formatTechnicalDetails(jobStatus),
    };
  }

  if (stage === 'RuleEngine' || combined.includes('rule')) {
    return {
      title: 'Compliance validation failed',
      message:
        'Textract finished, but the compliance rule engine encountered an error. Try uploading again. If the problem continues, review the technical details below.',
      technical: formatTechnicalDetails(jobStatus),
    };
  }

  if (stage === 'AWS Step Functions' || combined.includes('step functions') || jobStatus.executionArn) {
    return {
      title: 'AWS workflow did not complete',
      message:
        'The Step Functions compliance workflow stopped before results were saved. You can retry the upload, or share the technical details with your AWS administrator.',
      technical: formatTechnicalDetails(jobStatus),
    };
  }

  return {
    title: 'Document audit could not be completed',
    message:
      rawMessage ||
      'The AWS pipeline returned an error before the audit finished. Your PDF remains in S3 — try uploading again or contact your administrator.',
    technical: formatTechnicalDetails(jobStatus),
  };
}
