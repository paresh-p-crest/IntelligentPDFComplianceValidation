const HISTORY_KEY = 'cp-compliance-audit-history';
const LAST_JOB_KEY = 'cp-compliance-last-job';
const DISMISSED_KEY = 'cp-compliance-dismissed-history';
const MAX_LOCAL_ITEMS = 25;

function canonicalS3Key(s3Key) {
  if (!s3Key) return '';
  try {
    return decodeURIComponent(String(s3Key));
  } catch {
    return String(s3Key);
  }
}

export function documentNameFromKey(s3Key) {
  if (!s3Key) return '';
  try {
    return decodeURIComponent(canonicalS3Key(s3Key).split('/').pop() || '');
  } catch {
    return canonicalS3Key(s3Key).split('/').pop() || '';
  }
}

export function getDismissedKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveDismissedKeys(keys) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys]));
}

export function filterHistoryItems(items) {
  const dismissed = getDismissedKeys();
  return items.filter((item) => {
    const key = canonicalS3Key(item?.s3Key);
    return key && !dismissed.has(key);
  });
}

export function getLocalHistory() {
  try {
    return filterHistoryItems(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function saveLocalHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_LOCAL_ITEMS)));
}

export function upsertHistoryItem(item) {
  const key = canonicalS3Key(item?.s3Key);
  if (!key) return getLocalHistory();
  const nextItem = { ...item, s3Key: key };
  const existing = getLocalHistory().filter((entry) => canonicalS3Key(entry.s3Key) !== key);
  const next = [nextItem, ...existing].slice(0, MAX_LOCAL_ITEMS);
  saveLocalHistory(next);
  return next;
}

export function mergeHistoryItems(apiItems, localItems) {
  const map = new Map();

  [...localItems, ...apiItems].forEach((item) => {
    const key = canonicalS3Key(item?.s3Key);
    if (!key) return;
    const previous = map.get(key);
    if (!previous || (item.updatedAt || '') > (previous.updatedAt || '')) {
      map.set(key, { ...item, s3Key: key });
    }
  });

  return filterHistoryItems(
    Array.from(map.values()).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    ),
  );
}

export function dismissHistoryItem(s3Key) {
  const key = canonicalS3Key(s3Key);
  const dismissed = getDismissedKeys();
  dismissed.add(key);
  saveDismissedKeys(dismissed);

  const next = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter(
    (item) => canonicalS3Key(item.s3Key) !== key,
  );
  saveLocalHistory(next);
  clearLastViewedJobIfMatches(key);
  return getLocalHistory();
}

export function clearAllHistory() {
  const dismissed = getDismissedKeys();
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  stored.forEach((item) => {
    if (item?.s3Key) dismissed.add(item.s3Key);
  });
  saveDismissedKeys(dismissed);
  saveLocalHistory([]);
  clearLastViewedJob();
  return [];
}

export function clearLastViewedJob() {
  localStorage.removeItem(LAST_JOB_KEY);
}

export function clearLastViewedJobIfMatches(s3Key) {
  const last = getLastViewedJob();
  if (canonicalS3Key(last?.s3Key) === canonicalS3Key(s3Key)) {
    clearLastViewedJob();
  }
}

export function saveLastViewedJob(s3Key, documentName) {
  const key = canonicalS3Key(s3Key);
  localStorage.setItem(
    LAST_JOB_KEY,
    JSON.stringify({ s3Key: key, documentName: documentName || documentNameFromKey(key) }),
  );
}

export function getLastViewedJob() {
  try {
    return JSON.parse(localStorage.getItem(LAST_JOB_KEY) || 'null');
  } catch {
    return null;
  }
}

export function historyItemFromStatus(status, documentName) {
  const key = canonicalS3Key(status.s3Key);
  return {
    s3Key: key,
    documentName: documentName || status.documentName || documentNameFromKey(key),
    status: status.status,
    findingCount: status.findingCount ?? 0,
    pageCount: status.pageCount ?? 0,
    updatedAt: status.updatedAt || new Date().toISOString(),
    overallStatus: status.validationSummary?.overallStatus || '',
    reportNumber: status.metadata?.reportNumber || '',
    humanReviewStatus: status.validationSummary?.humanReviewStatus || '',
  };
}

import { formatAppDate } from './dateUtils.js';

export function formatHistoryDate(value) {
  return formatAppDate(value);
}
