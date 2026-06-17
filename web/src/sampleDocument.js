export const SAMPLE_DOCUMENT_URL = '/samples/DQR-TCE-20260104-sample.pdf';
export const SAMPLE_DOCUMENT_LABEL = 'DQR-TCE-20260104-sample.pdf';

export async function loadSampleDocument() {
  const response = await fetch(SAMPLE_DOCUMENT_URL);
  if (!response.ok) {
    throw new Error('Sample DQR could not be loaded. Check that the file is deployed.');
  }

  const blob = await response.blob();
  return new File([blob], SAMPLE_DOCUMENT_LABEL, { type: 'application/pdf' });
}
