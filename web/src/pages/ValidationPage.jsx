import AuditCharts from '../components/AuditCharts.jsx';
import CompactOverview from '../components/CompactOverview.jsx';
import FindingsPanel from '../components/FindingsPanel.jsx';
import Loader from '../components/Loader.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import PipelineFailurePanel from '../components/PipelineFailurePanel.jsx';
import { IconApprovals, IconDownload, IconFolder, IconUpload } from '../components/icons.jsx';
import { getOverallStatusStyle } from '../dashboardUtils.js';
import { getAwsPipelineStatus } from '../pipelineStatus.js';

function EmptyAudit({ onGoToDocuments, onGoToUpload }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm text-slate-600">No document selected for audit.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onGoToDocuments}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <IconFolder />
          Browse documents
        </button>
        <button
          type="button"
          onClick={onGoToUpload}
          className="inline-flex items-center gap-2 rounded-lg bg-cp-lime px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-400"
        >
          <IconUpload />
          Upload new PDF
        </button>
      </div>
    </div>
  );
}

export default function ValidationPage({
  file,
  jobStatus,
  summary,
  metadata,
  humanReview,
  findings,
  findingFilter,
  step,
  statusLabel,
  showDashboard,
  restoringJob,
  error,
  onFilterChange,
  onDownload,
  onGoToUpload,
  onGoToDocuments,
  onGoToApprovals,
  onRetry,
}) {
  const pipeline = getAwsPipelineStatus(jobStatus);
  const hasActiveJob = Boolean(jobStatus || restoringJob);

  if (!hasActiveJob) {
    return (
      <>
        <PageHeader subtitle="Open a completed document to review compliance findings." />
        <EmptyAudit onGoToDocuments={onGoToDocuments} onGoToUpload={onGoToUpload} />
      </>
    );
  }

  if (restoringJob && step !== 'analyzing') {
    return (
      <>
        <PageHeader subtitle={file?.name || 'Loading audit…'} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Loader label="Loading audit..." />
        </div>
      </>
    );
  }

  if (step === 'analyzing' && jobStatus?.status !== 'FAILED') {
    return (
      <>
        <PageHeader subtitle={file?.name || 'Processing document…'} />
        <div className="mt-4 rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-slate-900">
          <Loader label={pipeline.title} />
          <p className="mt-2 text-xs text-slate-700">{pipeline.detail}</p>
          {jobStatus?.jobId && (
            <p className="mt-1 text-[11px] text-cp-lime-dark">
              Textract job {jobStatus.jobId.slice(0, 12)}...
            </p>
          )}
        </div>
      </>
    );
  }

  if (step === 'error' || jobStatus?.status === 'FAILED') {
    return (
      <>
        <PageHeader subtitle={file?.name || 'Audit failed'} />
        <PipelineFailurePanel
          jobStatus={jobStatus}
          fallbackError={error}
          onRetry={onRetry}
        />
      </>
    );
  }

  if (!showDashboard) {
    return (
      <>
        <PageHeader subtitle="Open a completed document to review compliance findings." />
        <EmptyAudit onGoToDocuments={onGoToDocuments} onGoToUpload={onGoToUpload} />
      </>
    );
  }

  const overallStatus = summary.overallStatus || 'IN_PROGRESS';

  return (
    <>
      <PageHeader
        title="Audit results"
        subtitle={file?.name || 'Daily Quality Report'}
        actions={
          <>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getOverallStatusStyle(overallStatus)}`}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={onGoToApprovals}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconApprovals />
              Approvals
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <IconDownload />
              Download report
            </button>
          </>
        }
      />

      <AuditCharts findings={findings} summary={summary} pageCount={jobStatus.pageCount} />

      <CompactOverview
        summary={summary}
        metadata={metadata}
        step={step}
        humanReview={humanReview}
      />

      <FindingsPanel
        findings={findings}
        reviewStatus={humanReview.status || summary.humanReviewStatus}
        activeFilter={findingFilter}
        onFilterChange={onFilterChange}
      />
    </>
  );
}
