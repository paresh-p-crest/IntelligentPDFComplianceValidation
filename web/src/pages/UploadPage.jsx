import ComplianceProcessList from '../components/ComplianceProcessList.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import UploadHeader from '../components/UploadHeader.jsx';
import Loader from '../components/Loader.jsx';
import PipelineFailurePanel from '../components/PipelineFailurePanel.jsx';
import { IconSettings } from '../components/icons.jsx';
import { getAwsPipelineStatus } from '../pipelineStatus.js';

export default function UploadPage({
  file,
  showDashboard,
  statusLabel,
  overallStatusStyle,
  apiConfigured,
  isBusy,
  step,
  jobStatus,
  error,
  awsConfigStatus,
  awsConfigChecking,
  uploadBlocked,
  sampleLoading,
  restoringJob,
  appSettings,
  findings,
  onFileChange,
  onLoadSample,
  onSubmit,
  onOpenAwsConfig,
  onViewRules,
  onRetry,
}) {
  const pipeline = getAwsPipelineStatus(jobStatus);
  const enabledRules = appSettings.rules.filter((rule) => rule.enabled !== false);

  return (
    <>
      <PageHeader subtitle="Submit a Daily Quality Report PDF for automated compliance validation." />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <UploadHeader
            file={file}
            showDashboard={false}
            statusLabel={statusLabel}
            overallStatusStyle={overallStatusStyle}
            apiConfigured={apiConfigured}
            isBusy={isBusy}
            step={step}
            jobStatus={jobStatus}
            settingsActive={false}
            embedded
            awsConfigStatus={awsConfigStatus}
            awsConfigChecking={awsConfigChecking}
            uploadBlocked={uploadBlocked}
            sampleLoading={sampleLoading}
            onFileChange={onFileChange}
            onLoadSample={onLoadSample}
            onSubmit={onSubmit}
            onOpenAwsConfig={onOpenAwsConfig}
          />

          {restoringJob && step !== 'analyzing' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Loader label="Loading document..." />
            </div>
          )}

          {step === 'analyzing' && jobStatus?.status !== 'FAILED' && (
            <div className="rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-slate-900">
              <Loader label={pipeline.title} />
              <p className="mt-2 text-xs text-slate-700">{pipeline.detail}</p>
              {jobStatus?.jobId && (
                <p className="mt-1 text-[11px] text-cp-lime-dark">
                  Textract job {jobStatus.jobId.slice(0, 12)}...
                </p>
              )}
            </div>
          )}

          {(step === 'error' || jobStatus?.status === 'FAILED') && (
            <PipelineFailurePanel
              jobStatus={jobStatus}
              fallbackError={error}
              onRetry={onRetry}
            />
          )}
        </div>

        <aside className="xl:col-span-2">
          <div className="sticky top-20 rounded-xl border border-slate-800 bg-cp-dark p-5 text-white shadow-md">
            <ComplianceProcessList
              embedded
              pipelineActive={step === 'analyzing'}
              auditComplete={showDashboard}
              findings={findings}
              rules={enabledRules}
              onViewRules={onViewRules}
            />
            <button
              type="button"
              onClick={onViewRules}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cp-lime hover:bg-slate-800 hover:text-cp-lime"
            >
              <IconSettings className="h-4 w-4" />
              View &amp; edit compliance rules
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
