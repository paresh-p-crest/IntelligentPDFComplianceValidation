import { formatDisplayStatus } from '../../labels.js';
import { formatHistoryDate } from '../../historyStorage.js';

function statusBadge(item) {
  const label =
    item.overallStatus && item.overallStatus !== 'IN_PROGRESS'
      ? item.overallStatus.replaceAll('_', ' ')
      : formatDisplayStatus(item.status);

  let className = 'bg-slate-100 text-slate-700';
  if (item.overallStatus === 'APPROVED') className = 'bg-emerald-100 text-emerald-800';
  else if (item.status === 'FAILED' || item.overallStatus === 'REJECTED') {
    className = 'bg-rose-100 text-rose-800';
  } else if (
    item.overallStatus === 'VALIDATED_WITH_EXCEPTIONS' ||
    item.findingCount > 0
  ) {
    className = 'bg-amber-100 text-amber-900';
  } else if (item.status === 'IN_PROGRESS' || item.status === 'PENDING') {
    className = 'bg-blue-100 text-blue-800';
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export default function DocumentsTable({
  items,
  activeS3Key,
  loading,
  limit,
  title = 'Recent Documents',
  subtitle = 'Latest uploads and processing states',
  onSelect,
  onDelete,
  onViewAll,
}) {
  const rows = limit ? items.slice(0, limit) : items;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-slate-500">Syncing…</span>}
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-sm font-semibold text-cp-lime-dark hover:text-cp-lime"
            >
              View all
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">No documents audited yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Document</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Findings</th>
                <th className="px-5 py-3 font-semibold">Uploaded</th>
                {!limit && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.s3Key}
                  className={`border-b border-slate-100 last:border-0 ${
                    item.s3Key === activeS3Key ? 'bg-lime-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="max-w-xs truncate text-left font-medium text-slate-900 hover:text-cp-lime-dark"
                    >
                      {item.documentName}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-600">DQR</td>
                  <td className="px-5 py-3">{statusBadge(item)}</td>
                  <td className="px-5 py-3 text-slate-600">{item.findingCount ?? 0}</td>
                  <td className="px-5 py-3 text-slate-600">{formatHistoryDate(item.updatedAt)}</td>
                  {!limit && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-500"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
