import { useEffect, useRef, useState } from 'react';
import {
  deleteJobHistory,
  fetchJobHistory,
  fetchJobStatus,
  fetchSettings,
  pollJobStatus,
  requestUploadUrl,
  uploadPdfToS3,
  validateAwsConfig,
} from './api.js';
import {
  buildLocalAwsConfigStatus,
  isAwsConfigPresent,
} from './awsConfigUtils.js';
import AuditCharts from './components/AuditCharts.jsx';
import AuditHistory from './components/AuditHistory.jsx';
import CompactOverview from './components/CompactOverview.jsx';
import ComplianceProcessList from './components/ComplianceProcessList.jsx';
import FindingsPanel from './components/FindingsPanel.jsx';
import HumanReviewPanel from './components/HumanReviewPanel.jsx';
import { IconOverview, IconReview, IconSettings } from './components/icons.jsx';
import Loader from './components/Loader.jsx';
import PipelineFailurePanel from './components/PipelineFailurePanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import UploadHeader from './components/UploadHeader.jsx';
import { DEFAULT_SETTINGS, mergeSettings } from './defaultSettings.js';
import {
  downloadAuditReport,
  getOverallStatusStyle,
} from './dashboardUtils.js';
import {
  clearAllHistory,
  dismissHistoryItem,
  documentNameFromKey,
  getLastViewedJob,
  getLocalHistory,
  historyItemFromStatus,
  mergeHistoryItems,
  saveLastViewedJob,
  saveLocalHistory,
  upsertHistoryItem,
} from './historyStorage.js';
import {
  getAwsPipelineStatus,
  getBusyButtonLabel,
  PIPELINE_STEPS,
} from './pipelineStatus.js';

const STEPS = PIPELINE_STEPS;

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', Icon: IconOverview },
  { id: 'review', label: 'Human Review', Icon: IconReview },
];

export default function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(STEPS.idle);
  const [uploadResult, setUploadResult] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');
  const [mainView, setMainView] = useState('audit');
  const [activeTab, setActiveTab] = useState('overview');
  const [findingFilter, setFindingFilter] = useState('ALL');
  const [historyItems, setHistoryItems] = useState(() => getLocalHistory());
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringJob, setRestoringJob] = useState(false);
  const [appSettings, setAppSettings] = useState(() => structuredClone(DEFAULT_SETTINGS));
  const [awsConfigStatus, setAwsConfigStatus] = useState(null);
  const [awsConfigChecking, setAwsConfigChecking] = useState(false);
  const [focusAwsConfig, setFocusAwsConfig] = useState(false);
  const abortRef = useRef(null);
  const restoredRef = useRef(false);

  const apiConfigured = Boolean(import.meta.env.VITE_API_URL);
  const pollIntervalMs = appSettings.appConfig?.pollIntervalMs || 5000;
  const uploadBlocked =
    apiConfigured && (awsConfigChecking || awsConfigStatus?.valid === false);

  const summary = jobStatus?.validationSummary || {};
  const metadata = jobStatus?.metadata || {};
  const humanReview = jobStatus?.humanReview || {};
  const findings = jobStatus?.findings ?? [];
  const isBusy =
    restoringJob ||
    ([STEPS.requesting, STEPS.uploading, STEPS.analyzing].includes(step) &&
      jobStatus?.status !== 'FAILED');
  const showDashboard = step === STEPS.done && uploadResult && jobStatus;
  const activeS3Key = uploadResult?.key || '';

  function openAwsConfigSettings() {
    setFocusAwsConfig(true);
    setMainView('settings');
  }

  async function checkAwsConfig(awsConfig = appSettings.awsConfig) {
    const localStatus = buildLocalAwsConfigStatus(awsConfig);
    if (localStatus.valid === false && localStatus.reason === 'missing') {
      setAwsConfigStatus(localStatus);
      return localStatus;
    }

    if (!apiConfigured) {
      const fallback = isAwsConfigPresent(awsConfig)
        ? { valid: true, reason: 'local', message: '' }
        : localStatus;
      setAwsConfigStatus(fallback);
      return fallback;
    }

    setAwsConfigChecking(true);
    try {
      const remoteStatus = await validateAwsConfig();
      setAwsConfigStatus(remoteStatus);
      return remoteStatus;
    } catch {
      const fallback = isAwsConfigPresent(awsConfig)
        ? { valid: true, reason: 'unchecked', message: '' }
        : localStatus;
      setAwsConfigStatus(fallback);
      return fallback;
    } finally {
      setAwsConfigChecking(false);
    }
  }

  function handleJobStatusUpdate(status) {
    setJobStatus(status);
    if (status?.status === 'FAILED') {
      setStep(STEPS.error);
      setError(status.errorMessage || 'Textract processing failed');
    }
  }

  function rememberJob(status, documentName) {
    if (!status?.s3Key) return;
    const entry = historyItemFromStatus(status, documentName);
    const next = upsertHistoryItem(entry);
    setHistoryItems(next);
    saveLastViewedJob(status.s3Key, entry.documentName);
  }

  async function refreshHistoryFromApi() {
    if (!apiConfigured) return;

    setHistoryLoading(true);
    try {
      const data = await fetchJobHistory();
      const merged = mergeHistoryItems(data.items || [], getLocalHistory());
      saveLocalHistory(merged);
      setHistoryItems(merged);
    } catch {
      setHistoryItems(getLocalHistory());
    } finally {
      setHistoryLoading(false);
    }
  }

  async function restoreJob(s3Key, documentName) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resolvedName = documentName || documentNameFromKey(s3Key);
    setError('');
    setRestoringJob(true);
    setUploadResult({ key: s3Key });
    setFile({ name: resolvedName });
    setActiveTab('overview');
    setFindingFilter('ALL');
    setMainView('audit');

    try {
      const status = await fetchJobStatus(s3Key);
      setJobStatus(status);
      saveLastViewedJob(s3Key, resolvedName);

      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        rememberJob(status, resolvedName);
        setStep(status.status === 'FAILED' ? STEPS.error : STEPS.done);
        if (status.status === 'FAILED') {
          setError(status.errorMessage || 'Textract processing failed');
        }
        return;
      }

      setStep(STEPS.analyzing);
      const finalStatus = await pollJobStatus(s3Key, {
        intervalMs: pollIntervalMs,
        onUpdate: handleJobStatusUpdate,
        signal: controller.signal,
      });

      setJobStatus(finalStatus);
      rememberJob(finalStatus, resolvedName);
      setStep(finalStatus.status === 'FAILED' ? STEPS.error : STEPS.done);

      if (finalStatus.status === 'FAILED') {
        setError(finalStatus.errorMessage || 'Textract processing failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStep(STEPS.error);
      setError(err.message || 'Could not load saved audit');
    } finally {
      setRestoringJob(false);
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const local = getLocalHistory();
      if (!cancelled) setHistoryItems(local);

      if (!apiConfigured) return;

      try {
        const settings = await fetchSettings();
        if (!cancelled) {
          const merged = mergeSettings(settings);
          setAppSettings(merged);
          await checkAwsConfig(merged.awsConfig);
        }
      } catch {
        if (!cancelled) {
          const defaults = structuredClone(DEFAULT_SETTINGS);
          setAppSettings(defaults);
          setAwsConfigStatus(buildLocalAwsConfigStatus(defaults.awsConfig));
        }
      }

      await refreshHistoryFromApi();
      if (cancelled || restoredRef.current) return;

      const last = getLastViewedJob();
      if (last?.s3Key) {
        restoredRef.current = true;
        await restoreJob(last.s3Key, last.documentName);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [apiConfigured]);

  async function handleHistorySelect(item) {
    await restoreJob(item.s3Key, item.documentName);
  }

  function resetDashboardView() {
    abortRef.current?.abort();
    setStep(STEPS.idle);
    setUploadResult(null);
    setJobStatus(null);
    setFile(null);
    setError('');
    setActiveTab('overview');
    setFindingFilter('ALL');
    setMainView('audit');
    setRestoringJob(false);
  }

  async function handleDeleteHistory(item) {
    try {
      if (apiConfigured) {
        await deleteJobHistory(item.s3Key);
      }
    } catch {
      // Still remove locally if the API call fails.
    }

    const next = dismissHistoryItem(item.s3Key);
    setHistoryItems(next);

    if (item.s3Key === activeS3Key) {
      resetDashboardView();
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Remove all audits from history? PDFs remain in S3.')) {
      return;
    }

    if (apiConfigured) {
      await Promise.allSettled(
        historyItems.map((item) => deleteJobHistory(item.s3Key)),
      );
    }

    clearAllHistory();
    setHistoryItems([]);
    resetDashboardView();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    const awsStatus = await checkAwsConfig();
    if (!awsStatus.valid) {
      openAwsConfigSettings();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError('');
    setUploadResult(null);
    setJobStatus(null);

    try {
      setStep(STEPS.requesting);
      const uploadData = await requestUploadUrl(file.name);

      setStep(STEPS.uploading);
      await uploadPdfToS3(file, uploadData.uploadUrl);
      setUploadResult(uploadData);

      setStep(STEPS.analyzing);
      const finalStatus = await pollJobStatus(uploadData.key, {
        intervalMs: pollIntervalMs,
        onUpdate: handleJobStatusUpdate,
        signal: controller.signal,
      });

      setJobStatus(finalStatus);
      rememberJob(finalStatus, file.name);
      setStep(finalStatus.status === 'FAILED' ? STEPS.error : STEPS.done);

      if (finalStatus.status === 'FAILED') {
        setError(finalStatus.errorMessage || 'Textract processing failed');
      } else {
        refreshHistoryFromApi();
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStep(STEPS.error);
      setError(err.message || 'Something went wrong');
    }
  }

  function handleFileChange(event) {
    abortRef.current?.abort();
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setStep(STEPS.idle);
    setUploadResult(null);
    setJobStatus(null);
    setError('');
    setActiveTab('overview');
    setFindingFilter('ALL');
    setMainView('audit');
    setRestoringJob(false);
  }

  const overallStatus = summary.overallStatus || 'IN_PROGRESS';
  const statusLabel =
    overallStatus === 'VALIDATED'
      ? 'Validated'
      : overallStatus === 'VALIDATED_WITH_EXCEPTIONS'
        ? 'Validated with Exceptions'
        : overallStatus === 'VALIDATED_WITH_WARNINGS'
          ? 'Validated with Warnings'
          : overallStatus === 'APPROVED'
            ? 'Approved'
            : overallStatus === 'REJECTED'
              ? 'Rejected'
              : overallStatus === 'CORRECTED'
                ? 'Corrected'
                : 'Processing';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-slate-950 px-6 py-8 text-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
            Crosstown Partners
          </p>
          <h1 className="mt-3 text-2xl font-bold">Compliance Audit</h1>
          <p className="mt-3 text-sm text-slate-400">
            Intelligent PDF validation for Daily Quality Reports using AWS Textract and
            deterministic rule checks.
          </p>
          <ComplianceProcessList
            pipelineActive={step === STEPS.analyzing}
            auditComplete={showDashboard}
            findings={findings}
            rules={appSettings.rules.filter((rule) => rule.enabled !== false)}
          />

          <div className="mt-8 border-t border-slate-800 pt-6">
            <button
              type="button"
              onClick={() => setMainView('settings')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mainView === 'settings'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <IconSettings className="h-4 w-4" />
              Settings
            </button>
          </div>

          <AuditHistory
            items={historyItems}
            activeS3Key={activeS3Key}
            loading={historyLoading}
            onSelect={handleHistorySelect}
            onDelete={(item) => handleDeleteHistory(item)}
            onClearAll={handleClearHistory}
          />
        </aside>

        <main className="flex-1 px-4 py-4 md:px-8">
          <div className="relative">
            <UploadHeader
              file={file}
              showDashboard={showDashboard}
              statusLabel={statusLabel}
              overallStatusStyle={getOverallStatusStyle(overallStatus)}
              apiConfigured={apiConfigured}
              isBusy={isBusy}
              step={step}
              jobStatus={jobStatus}
              settingsActive={mainView === 'settings'}
              awsConfigStatus={awsConfigStatus}
              awsConfigChecking={awsConfigChecking}
              uploadBlocked={uploadBlocked}
              onFileChange={handleFileChange}
              onSubmit={handleSubmit}
              onDownload={() =>
                downloadAuditReport({
                  fileName: file.name,
                  jobStatus,
                  uploadResult,
                })
              }
              onGoToReview={() => {
                setMainView('audit');
                setActiveTab('review');
              }}
              onOpenSettings={() => setMainView('settings')}
              onOpenAudit={() => {
                setFocusAwsConfig(false);
                setMainView('audit');
              }}
              onOpenAwsConfig={openAwsConfigSettings}
            />
          </div>

          {mainView === 'settings' && (
            <SettingsPanel
              focusAwsConfig={focusAwsConfig}
              onFocusAwsConfigHandled={() => setFocusAwsConfig(false)}
              onSettingsSaved={(saved) => {
                const merged = mergeSettings(saved);
                setAppSettings(merged);
                checkAwsConfig(merged.awsConfig);
              }}
              onAwsConfigValidated={setAwsConfigStatus}
            />
          )}

          {mainView === 'audit' && restoringJob && step !== STEPS.analyzing && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Loader label="Restoring saved audit..." />
            </div>
          )}

          {mainView === 'audit' && step === STEPS.analyzing && jobStatus?.status !== 'FAILED' && (() => {
            const pipeline = getAwsPipelineStatus(jobStatus);
            return (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                <Loader label={pipeline.title} />
                <p className="mt-2 text-xs text-indigo-900">{pipeline.detail}</p>
                {jobStatus?.jobId && (
                  <p className="mt-1 text-[11px] text-indigo-700">
                    Textract job {jobStatus.jobId.slice(0, 12)}...
                  </p>
                )}
              </div>
            );
          })()}

          {mainView === 'audit' && (step === STEPS.error || jobStatus?.status === 'FAILED') && (
            <PipelineFailurePanel
              jobStatus={jobStatus}
              fallbackError={error}
              onRetry={resetDashboardView}
            />
          )}

          {mainView === 'audit' && showDashboard && jobStatus?.status !== 'FAILED' && (
            <>
              <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {DASHBOARD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <tab.Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <>
                  <AuditCharts
                    findings={findings}
                    summary={summary}
                    pageCount={jobStatus.pageCount}
                  />

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
                    onFilterChange={setFindingFilter}
                  />
                </>
              )}

              {activeTab === 'review' && (
                <HumanReviewPanel
                  s3Key={uploadResult.key}
                  humanReview={humanReview}
                  validationSummary={summary}
                  onReviewSubmitted={(result) => {
                    setJobStatus((current) => {
                      const next = {
                        ...current,
                        humanReview: result.humanReview,
                        validationSummary: result.validationSummary,
                      };
                      rememberJob(next, file?.name);
                      refreshHistoryFromApi();
                      return next;
                    });
                  }}
                />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
