import { formatConfidence } from '../labels.js';

function confidenceTone(confidence) {
  const value = Number(confidence);
  const percent = value <= 1 ? value * 100 : value;
  if (percent >= 85) return 'text-emerald-700 bg-emerald-50';
  if (percent >= 70) return 'text-amber-700 bg-amber-50';
  return 'text-rose-700 bg-rose-50';
}

export default function TextractInsights({ answers = [] }) {
  if (!answers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
        No Textract query responses available for this document.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {answers.map((item) => (
        <article
          key={`${item.alias}-${item.page}`}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            AI Extraction
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">
            {item.label || item.alias}
          </h4>
          {item.question && (
            <p className="mt-1 text-sm text-slate-500">{item.question}</p>
          )}
          <p className="mt-4 text-sm font-medium text-slate-800">
            {item.displayValue || item.answer || 'Not detected'}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Page {item.page || '—'}</span>
            <span
              className={`rounded-full px-2.5 py-1 font-semibold ${confidenceTone(item.confidence)}`}
            >
              Confidence {formatConfidence(item.confidence)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
