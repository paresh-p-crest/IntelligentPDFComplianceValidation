const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

async function parseJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function requestUploadUrl(filename) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(
    `${API_URL}/upload-url?filename=${encodeURIComponent(filename)}`,
  );

  return parseJson(response);
}

export async function uploadPdfToS3(file, uploadUrl) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': 'application/pdf',
    },
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed (${response.status})`);
  }
}

export async function fetchJobStatus(s3Key) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(
    `${API_URL}/status?s3Key=${encodeURIComponent(s3Key)}`,
  );

  return parseJson(response);
}

export async function fetchJobHistory() {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/history`);
  return parseJson(response);
}

export async function deleteJobHistory(s3Key) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(
    `${API_URL}/history?s3Key=${encodeURIComponent(s3Key)}`,
    { method: 'DELETE' },
  );

  return parseJson(response);
}

export async function fetchSettings() {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/settings`);
  return parseJson(response);
}

export async function updateSettings(payload) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJson(response);
}

export async function validateAwsConfig() {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/settings/aws-config/validate`);
  return parseJson(response);
}

export async function submitHumanReview({ s3Key, decision, comments, reviewerId }) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3Key, decision, comments, reviewerId }),
  });

  return parseJson(response);
}

export function pollJobStatus(s3Key, { intervalMs = 5000, onUpdate, signal }) {
  return new Promise((resolve, reject) => {
    let timerId;

    async function checkStatus() {
      try {
        const status = await fetchJobStatus(s3Key);
        onUpdate?.(status);

        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(timerId);
          resolve(status);
          return;
        }
      } catch (error) {
        clearInterval(timerId);
        reject(error);
      }
    }

    if (signal) {
      signal.addEventListener('abort', () => {
        clearInterval(timerId);
        reject(new DOMException('Polling aborted', 'AbortError'));
      });
    }

    checkStatus();
    timerId = setInterval(checkStatus, intervalMs);
  });
}
