export const PIPELINE_STEPS = {
  idle: 'idle',
  requesting: 'requesting',
  uploading: 'uploading',
  analyzing: 'analyzing',
  done: 'done',
  error: 'error',
};

export function getBusyButtonLabel(step, jobStatus) {
  if (step === PIPELINE_STEPS.requesting) {
    return 'Getting S3 upload URL...';
  }
  if (step === PIPELINE_STEPS.uploading) {
    return 'Uploading to S3...';
  }
  if (step === PIPELINE_STEPS.analyzing) {
    return getAwsPipelineStatus(jobStatus).shortLabel;
  }
  return 'Processing...';
}

export function getAwsPipelineStatus(jobStatus) {
  const status = jobStatus?.status || 'PENDING';
  const hasJobId = Boolean(jobStatus?.jobId);

  if (status === 'PENDING') {
    return {
      shortLabel: 'Triggering AWS workflow...',
      title: 'Waiting for S3 event → Step Functions',
      detail:
        'S3 upload is complete. EventBridge will start the compliance workflow and hand the document to Textract.',
    };
  }

  if (status === 'IN_PROGRESS') {
    if (!hasJobId) {
      return {
        shortLabel: 'Starting Step Functions...',
        title: 'Step Functions workflow started',
        detail:
          'AWS Step Functions is starting Amazon Textract document analysis (forms, tables, signatures).',
      };
    }

    return {
      shortLabel: 'Textract running...',
      title: 'Amazon Textract analysis in progress',
      detail:
        'Step Functions is waiting for Textract to finish. Completion arrives via SNS, then the rule engine validates the extracted data.',
    };
  }

  if (status === 'COMPLETED') {
    return {
      shortLabel: 'Finalizing results...',
      title: 'Applying compliance rules',
      detail: 'Textract output received. Findings and metadata are being saved to DynamoDB.',
    };
  }

  if (status === 'FAILED') {
    return {
      shortLabel: 'Pipeline failed',
      title: 'AWS pipeline failed',
      detail: jobStatus?.errorMessage || 'Step Functions or Textract returned an error.',
    };
  }

  return {
    shortLabel: 'Processing in AWS...',
    title: 'Processing in AWS',
    detail: String(status).replaceAll('_', ' '),
  };
}
