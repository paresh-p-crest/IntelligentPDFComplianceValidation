import { formatDisplayStatus } from '../labels.js';
import { formatHistoryDate } from '../historyStorage.js';

function statusTone(item) {
  if (item.overallStatus === 'APPROVED') return 'text-emerald-400';
  if (item.overallStatus === 'REJECTED') return 'text-rose-400';
  if (item.status === 'FAILED') return 'text-rose-400';
  if (item.status === 'IN_PROGRESS' || item.status === 'PENDING') return 'text-amber-300';
  if (item.findingCount > 0) return 'text-amber-300';
  return 'text-slate-300';
}

export default function AuditHistory({
  items,
  activeS3Key,
  loading,
  onSelect,
  onDelete,
  onClearAll,
}) {
  return (
    <section className="mt-8 border-t border-slate-800 pt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Audit History
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[10px] text-slate-500">Syncing…</span>}
          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 transition hover:text-rose-300"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Past audits are saved locally and synced from AWS on refresh.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No completed audits yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const isActive = item.s3Key === activeS3Key;
            const label =
              item.overallStatus && item.overallStatus !== 'IN_PROGRESS'
                ? item.overallStatus.replaceAll('_', ' ')
                : formatDisplayStatus(item.status);

            return (
              <li key={item.s3Key}>
                <div
                  className={`flex items-stretch overflow-hidden rounded-xl border transition ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-950/60'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                  >
                    <p className="truncate text-sm font-medium text-white">
                      {item.documentName}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${statusTone(item)}`}>{label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatHistoryDate(item.updatedAt)}
                      {item.findingCount > 0 ? ` · ${item.findingCount} findings` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => onDelete(item, event)}
                    className="flex w-9 flex-shrink-0 items-center justify-center border-l border-slate-800 text-slate-500 transition hover:bg-rose-950/40 hover:text-rose-300"
                    aria-label={`Remove ${item.documentName} from history`}
                    title="Remove from history"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
