import DocumentsTable from '../components/layout/DocumentsTable.jsx';
import { IconUpload } from '../components/icons.jsx';
import { computeDashboardStats } from '../utils/dashboardStats.js';

function MetricItem({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-slate-900',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
  };

  return (
    <div className="px-5 py-4 text-center sm:text-left">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function HomeDashboard({
  historyItems,
  historyLoading,
  activeS3Key,
  onSelectDocument,
  onViewAllDocuments,
  onGoToUpload,
}) {
  const stats = computeDashboardStats(historyItems);

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-cp-dark via-slate-900 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-lime">
              Quality Assurance Check
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Compliance overview</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Track DQR uploads, automated Textract audits, and exception handling from one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToUpload}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-cp-lime px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-lime-400"
          >
            <IconUpload />
            New upload
          </button>
        </div>
      </div>

      <div className="mb-6 grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <MetricItem label="Total documents" value={stats.total} />
        <MetricItem label="Awaiting approval" value={stats.pendingReview} tone="warning" />
        <MetricItem label="Pipeline failures" value={stats.failures} tone="danger" />
        <MetricItem label="With exceptions" value={stats.exceptions} tone="warning" />
      </div>

      <DocumentsTable
        items={historyItems}
        activeS3Key={activeS3Key}
        loading={historyLoading}
        limit={8}
        onSelect={onSelectDocument}
        onViewAll={onViewAllDocuments}
      />
    </>
  );
}
