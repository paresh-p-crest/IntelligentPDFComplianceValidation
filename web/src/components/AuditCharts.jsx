import { formatFindingType } from '../labels.js';
import { getTypeChartColor } from '../dashboardUtils.js';
import { IconChart } from './icons.jsx';

const SEVERITY_COLORS = {
  HIGH: '#e11d48',
  MEDIUM: '#ea580c',
  LOW: '#64748b',
};

function DonutChart({ segments, total }) {
  const safeTotal = total || 1;
  let cursor = 0;
  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = cursor;
      const slice = (segment.value / safeTotal) * 100;
      cursor += slice;
      return `${segment.color} ${start}% ${cursor}%`;
    });

  const gradient =
    stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e2e8f0 0% 100%)';

  return (
    <div className="relative mx-auto h-28 w-28">
      <div className="h-full w-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Issues
        </span>
      </div>
    </div>
  );
}

function HorizontalBars({ items, maxValue }) {
  const peak = maxValue || Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{item.label}</span>
            <span className="font-bold text-slate-900">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / peak) * 100}%`,
                backgroundColor: item.color,
                minWidth: item.value > 0 ? '4px' : '0',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuditCharts({ findings = [], summary = {}, pageCount = 0 }) {
  const typeSegments = [
    {
      key: 'MISSING_SIGNATURE',
      label: 'Signatures',
      value: summary.missingSignatures ?? 0,
      color: getTypeChartColor('MISSING_SIGNATURE'),
    },
    {
      key: 'STATUS_EXCEPTION',
      label: 'Exceptions',
      value: summary.statusExceptions ?? 0,
      color: getTypeChartColor('STATUS_EXCEPTION'),
    },
    {
      key: 'MISSING_INFO',
      label: 'Missing info',
      value: summary.missingInfo ?? 0,
      color: getTypeChartColor('MISSING_INFO'),
    },
  ];

  const severityCounts = findings.reduce(
    (acc, finding) => {
      const key = finding.severity || 'LOW';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 },
  );

  const severityItems = ['HIGH', 'MEDIUM', 'LOW'].map((level) => ({
    label: level,
    value: severityCounts[level] || 0,
    color: SEVERITY_COLORS[level],
  }));

  const totalFindings =
    summary.totalFindings ??
    findings.length ??
    typeSegments.reduce((sum, item) => sum + item.value, 0);
  const pages = summary.pagesProcessed ?? pageCount ?? 0;
  const cleanPages = Math.max(pages - Math.min(pages, totalFindings), 0);
  const complianceRate = pages > 0 ? Math.round((cleanPages / pages) * 100) : 100;

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <IconChart className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Audit Summary</h3>
          <p className="text-xs text-slate-500">Visual breakdown after document processing</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Findings by category
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <DonutChart segments={typeSegments} total={totalFindings} />
            <ul className="space-y-1.5 text-xs">
              {typeSegments.map((segment) => (
                <li key={segment.key} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-slate-600">{formatFindingType(segment.key)}</span>
                  <span className="font-bold text-slate-900">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Severity distribution
          </p>
          <div className="mt-3">
            <HorizontalBars items={severityItems} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Document coverage
          </p>
          <div className="mt-3 flex h-full flex-col justify-center">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">{complianceRate}%</span>
              <span className="mb-1 text-xs text-slate-500">pages without findings</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {pages} pages processed · {totalFindings} total finding
              {totalFindings === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
