import {
  filterFindings,
  FINDING_FILTERS,
  formatConfidence,
  formatDescription,
  formatFindingType,
  formatRecommendation,
  formatReviewStatus,
} from '../labels.js';
import {
  getSeverityBadgeClass,
  getTypeBadgeClass,
  getTypeFilterActiveClass,
} from '../dashboardUtils.js';

export default function FindingsPanel({
  findings = [],
  reviewStatus = 'PENDING',
  title = 'Audit Findings',
  activeFilter,
  onFilterChange,
}) {
  const filtered = filterFindings(findings, activeFilter);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} of {findings.length} issue(s) shown
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FINDING_FILTERS.map((filter) => {
            const count =
              filter.id === 'ALL'
                ? findings.length
                : findings.filter((item) => item.type === filter.id).length;
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? filter.id === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : getTypeFilterActiveClass(filter.id)
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No findings in this category.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Field</th>
                <th className="whitespace-nowrap px-3 py-2.5">Page</th>
                <th className="whitespace-nowrap px-3 py-2.5">Severity</th>
                <th className="min-w-[200px] px-3 py-2.5">Description</th>
                <th className="min-w-[200px] px-3 py-2.5">Recommendation</th>
                <th className="whitespace-nowrap px-3 py-2.5">Confidence</th>
                <th className="whitespace-nowrap px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((finding) => (
                <tr key={finding.id} className="align-top hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${getTypeBadgeClass(finding.type)}`}
                    >
                      {formatFindingType(finding.type)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">{finding.field}</td>
                  <td className="px-3 py-3 text-slate-700">{finding.page}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSeverityBadgeClass(finding.severity)}`}
                    >
                      {finding.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatDescription(finding)}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatRecommendation(finding)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatConfidence(finding.confidence)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {formatReviewStatus(reviewStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
