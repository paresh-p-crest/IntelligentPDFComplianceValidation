const HISTORY_KEY = 'cp-compliance-audit-history';
const LAST_JOB_KEY = 'cp-compliance-last-job';
const DISMISSED_KEY = 'cp-compliance-dismissed-history';
const MAX_LOCAL_ITEMS = 25;

export function documentNameFromKey(s3Key) {
  if (!s3Key) return '';
  try {
    return decodeURIComponent(s3Key.split('/').pop() || '');
  } catch {
    return s3Key.split('/').pop() || '';
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
  return items.filter((item) => item?.s3Key && !dismissed.has(item.s3Key));
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
  const existing = getLocalHistory().filter((entry) => entry.s3Key !== item.s3Key);
  const next = [item, ...existing].slice(0, MAX_LOCAL_ITEMS);
  saveLocalHistory(next);
  return next;
}

export function mergeHistoryItems(apiItems, localItems) {
  const map = new Map();

  [...localItems, ...apiItems].forEach((item) => {
    if (!item?.s3Key) return;
    const previous = map.get(item.s3Key);
    if (!previous || (item.updatedAt || '') > (previous.updatedAt || '')) {
      map.set(item.s3Key, item);
    }
  });

  return filterHistoryItems(
    Array.from(map.values()).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    ),
  );
}

export function dismissHistoryItem(s3Key) {
  const dismissed = getDismissedKeys();
  dismissed.add(s3Key);
  saveDismissedKeys(dismissed);

  const next = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter(
    (item) => item.s3Key !== s3Key,
  );
  saveLocalHistory(next);
  clearLastViewedJobIfMatches(s3Key);
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
  if (last?.s3Key === s3Key) {
    clearLastViewedJob();
  }
}

export function saveLastViewedJob(s3Key, documentName) {
  localStorage.setItem(
    LAST_JOB_KEY,
    JSON.stringify({ s3Key, documentName: documentName || documentNameFromKey(s3Key) }),
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
  return {
    s3Key: status.s3Key,
    documentName: documentName || status.documentName || documentNameFromKey(status.s3Key),
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
