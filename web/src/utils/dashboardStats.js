export function computeDashboardStats(items = []) {
  const total = items.length;
  const pendingReview = items.filter(
    (item) =>
      item.humanReviewStatus === 'PENDING' ||
      item.overallStatus === 'VALIDATED_WITH_EXCEPTIONS',
  ).length;
  const failures = items.filter((item) => item.status === 'FAILED').length;
  const exceptions = items.filter(
    (item) =>
      item.overallStatus === 'VALIDATED_WITH_EXCEPTIONS' ||
      (item.findingCount > 0 && item.overallStatus !== 'APPROVED'),
  ).length;

  return { total, pendingReview, failures, exceptions };
}
