export function isAwsConfigPresent(awsConfig = {}) {
  return Boolean(awsConfig.accessKeyId?.trim() && awsConfig.secretAccessKey?.trim());
}

export function getAwsConfigAlertMessage(status) {
  if (!status || status.valid) return '';

  if (status.reason === 'missing') {
    return 'AWS credentials are not configured. Add your Access Key ID and Secret Access Key in AWS Config.';
  }
  if (status.reason === 'expired') {
    return 'AWS session token has expired. Update your credentials in AWS Config.';
  }
  if (status.reason === 'invalid') {
    return status.message || 'AWS credentials are invalid. Check values in AWS Config.';
  }
  return status.message || 'AWS credentials need attention. Open AWS Config in Settings.';
}

export function buildLocalAwsConfigStatus(awsConfig) {
  if (!isAwsConfigPresent(awsConfig)) {
    return {
      valid: false,
      reason: 'missing',
      message: 'AWS Access Key ID and Secret Access Key are required.',
    };
  }
  return { valid: null, reason: 'unchecked', message: '' };
}
