import { useState } from 'react';
import { getPipelineFailureInfo } from '../pipelineFailure.js';

export default function PipelineFailurePanel({ jobStatus, fallbackError = '', onRetry }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const failure = getPipelineFailureInfo(jobStatus, fallbackError);

  return (
    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
      <h3 className="text-base font-semibold text-rose-900">{failure.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-rose-900">{failure.message}</p>

      {jobStatus?.jobId && (
        <p className="mt-3 text-xs text-rose-800">
          Reference: Textract job {jobStatus.jobId.slice(0, 12)}...
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowTechnical((current) => !current)}
          className="text-sm font-semibold text-rose-900 underline decoration-rose-400 underline-offset-2 hover:text-rose-700"
        >
          {showTechnical ? 'Hide technical details' : 'Show technical details'}
        </button>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-900 hover:bg-rose-100"
          >
            Try another upload
          </button>
        )}
      </div>

      {showTechnical && (
        <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-rose-200 bg-white p-3 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
          {failure.technical}
        </pre>
      )}
    </div>
  );
}
