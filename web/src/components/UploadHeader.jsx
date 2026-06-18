import Loader from './Loader.jsx';
import { getBusyButtonLabel } from '../pipelineStatus.js';
import { SAMPLE_DOCUMENT_LABEL } from '../sampleDocument.js';
import AwsConfigAlert from './AwsConfigAlert.jsx';
import { IconDownload, IconFile, IconReview, IconSettings, IconUpload } from './icons.jsx';

export default function UploadHeader({
  file,
  showDashboard,
  statusLabel,
  overallStatusStyle,
  apiConfigured,
  isBusy,
  step,
  jobStatus,
  settingsActive = false,
  awsConfigStatus = null,
  awsConfigChecking = false,
  uploadBlocked = false,
  sampleLoading = false,
  embedded = false,
  onFileChange,
  onLoadSample,
  onNewAudit,
  onSubmit,
  onDownload,
  onGoToReview,
  onOpenSettings,
  onOpenAudit,
  onOpenAwsConfig,
}) {
  return (
    <div className={`relative rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${embedded ? '' : 'mb-4'}`}>
      {!embedded && (
        <>
          <div className="absolute right-3 top-3 flex items-center gap-1">
            {!settingsActive && (
              <a
                href="/documentation"
                className="hidden rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                title="Platform documentation"
              >
                Docs
              </a>
            )}
            {settingsActive ? (
              <button
                type="button"
                onClick={onOpenAudit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                title="Back to audit dashboard"
              >
                <IconFile className="h-3.5 w-3.5" />
                Audit
              </button>
            ) : (
              onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-cp-lime-dark"
                  title="Open settings"
                  aria-label="Open settings"
                >
                  <IconSettings className="h-4 w-4" />
                </button>
              )
            )}
          </div>

          <div className="flex flex-col gap-3 pr-12 lg:flex-row lg:items-center lg:justify-between lg:pr-28">
            <div className="min-w-0 flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-lime-50 text-cp-lime-dark">
                <IconFile />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-lime-dark">
                  Document Audit Dashboard
                </p>
                <h2 className="truncate text-lg font-bold text-slate-900">
                  {settingsActive
                    ? 'Compliance Settings'
                    : file?.name || 'Upload a Daily Quality Report'}
                </h2>
                {showDashboard && (
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${overallStatusStyle}`}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>

            {showDashboard && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onNewAudit}
                  className="inline-flex items-center gap-2 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-lime-100"
                >
                  <IconUpload className="h-4 w-4" />
                  New audit
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  <IconDownload />
                  Download Report
                </button>
                <button
                  type="button"
                  onClick={onGoToReview}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <IconReview />
                  Human Review
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {!apiConfigured && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Set <code className="font-mono">VITE_API_URL</code> in <code>web/.env</code>.
        </div>
      )}

      {!settingsActive && apiConfigured && (
        <AwsConfigAlert
          status={awsConfigStatus}
          checking={awsConfigChecking}
          onOpenAwsConfig={onOpenAwsConfig}
        />
      )}

      {!settingsActive && (
        <form onSubmit={onSubmit} className={showDashboard ? 'mt-2 border-t border-slate-100 pt-2' : 'mt-3'}>
          {!showDashboard && (
            <p className="mb-2 text-sm text-slate-600">
              Upload a Daily Quality Report PDF, or use the bundled sample to try the audit flow.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFileChange}
              disabled={isBusy}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm file:mr-3 file:h-full file:rounded-md file:border-0 file:bg-cp-lime file:px-4 file:text-sm file:font-semibold file:text-white sm:max-w-md sm:flex-1"
            />
            <span className="shrink-0 text-center text-xs font-bold uppercase tracking-wide text-slate-500 sm:px-1">
              OR
            </span>
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isBusy || sampleLoading}
              className="inline-flex h-10 w-full flex-shrink-0 items-center justify-center rounded-lg border-2 border-lime-300 bg-lime-50 px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-cp-lime hover:bg-lime-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:whitespace-nowrap"
            >
              {sampleLoading ? 'Loading sample…' : 'Use Sample DQR PDF'}
            </button>
            <button
              type="submit"
              disabled={!file || isBusy || !apiConfigured || uploadBlocked || awsConfigChecking}
              className="inline-flex h-10 w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-cp-lime px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-4 sm:w-auto"
            >
              {isBusy ? (
                <Loader
                  className="text-white"
                  label={getBusyButtonLabel(step, jobStatus)}
                />
              ) : (
                <>
                  <IconUpload />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {settingsActive && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Configure compliance rules and AWS credentials.
        </p>
      )}

      {file && !settingsActive && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{file.name}</span>
          <span className="text-slate-500"> · {Math.round(file.size / 1024)} KB</span>
          {file.name === SAMPLE_DOCUMENT_LABEL && (
            <span className="ml-2 font-semibold text-cp-lime-dark">Sample ready — click Upload & Analyze</span>
          )}
        </p>
      )}
    </div>
  );
}
