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
import AppShell from './components/layout/AppShell.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { DEFAULT_SETTINGS, mergeSettings } from './defaultSettings.js';
import { downloadAuditReport, getOverallStatusStyle } from './dashboardUtils.js';
import {
  clearAllHistory,
  dismissHistoryItem,
  documentNameFromKey,
  getLocalHistory,
  historyItemFromStatus,
  mergeHistoryItems,
  saveLastViewedJob,
  saveLocalHistory,
  upsertHistoryItem,
} from './historyStorage.js';
import { PIPELINE_STEPS } from './pipelineStatus.js';
import { loadSampleDocument } from './sampleDocument.js';
import DocumentsPage from './pages/DocumentsPage.jsx';
import HomeDashboard from './pages/HomeDashboard.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ValidationPage from './pages/ValidationPage.jsx';

const STEPS = PIPELINE_STEPS;

export default function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(STEPS.idle);
  const [uploadResult, setUploadResult] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');
  const [mainView, setMainView] = useState('dashboard');
  const [findingFilter, setFindingFilter] = useState('ALL');
  const [historyItems, setHistoryItems] = useState(() => getLocalHistory());
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringJob, setRestoringJob] = useState(false);
  const [appSettings, setAppSettings] = useState(() => structuredClone(DEFAULT_SETTINGS));
  const [awsConfigStatus, setAwsConfigStatus] = useState(null);
  const [awsConfigChecking, setAwsConfigChecking] = useState(false);
  const [focusAwsConfig, setFocusAwsConfig] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const abortRef = useRef(null);
  const submitInFlightRef = useRef(false);

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

  function navigate(sectionId) {
    setMainView(sectionId);
    if (sectionId !== 'settings') {
      setFocusAwsConfig(false);
    }
  }

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

  async function restoreJob(s3Key, documentName, { navigateTo = 'audit' } = {}) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resolvedName = documentName || documentNameFromKey(s3Key);
    setError('');
    setRestoringJob(true);
    setUploadResult({ key: s3Key });
    setFile({ name: resolvedName });
    setFindingFilter('ALL');
    setMainView(navigateTo);

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
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [apiConfigured]);

  async function handleHistorySelect(item) {
    await restoreJob(item.s3Key, item.documentName, { navigateTo: 'audit' });
  }

  function resetDashboardView() {
    abortRef.current?.abort();
    setStep(STEPS.idle);
    setUploadResult(null);
    setJobStatus(null);
    setFile(null);
    setError('');
    setFindingFilter('ALL');
    setMainView('upload');
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
    if (!file || submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    try {
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
      setMainView('upload');

      setStep(STEPS.requesting);
      const uploadData = await requestUploadUrl(file.name);

      setStep(STEPS.uploading);
      await uploadPdfToS3(file, uploadData.uploadUrl);
      setUploadResult(uploadData);

      setStep(STEPS.analyzing);
      setMainView('audit');
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
        setMainView('audit');
        refreshHistoryFromApi();
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStep(STEPS.error);
      setError(err.message || 'Something went wrong');
    } finally {
      submitInFlightRef.current = false;
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
    setFindingFilter('ALL');
    setMainView('upload');
    setRestoringJob(false);
  }

  async function handleLoadSample() {
    if (sampleLoading || isBusy) return;

    abortRef.current?.abort();
    setSampleLoading(true);
    setError('');

    try {
      const sampleFile = await loadSampleDocument();
      setFile(sampleFile);
      setStep(STEPS.idle);
      setUploadResult(null);
      setJobStatus(null);
      setFindingFilter('ALL');
      setMainView('upload');
      setRestoringJob(false);
    } catch (err) {
      setError(err.message || 'Could not load sample document');
    } finally {
      setSampleLoading(false);
    }
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

  function handleReviewSubmitted(result) {
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
  }

  function renderSection() {
    switch (mainView) {
      case 'dashboard':
        return (
          <HomeDashboard
            historyItems={historyItems}
            historyLoading={historyLoading}
            activeS3Key={activeS3Key}
            onSelectDocument={handleHistorySelect}
            onViewAllDocuments={() => navigate('documents')}
            onGoToUpload={() => navigate('upload')}
          />
        );

      case 'upload':
        return (
          <UploadPage
            file={file}
            showDashboard={showDashboard}
            statusLabel={statusLabel}
            overallStatusStyle={getOverallStatusStyle(overallStatus)}
            apiConfigured={apiConfigured}
            isBusy={isBusy}
            step={step}
            jobStatus={jobStatus}
            error={error}
            awsConfigStatus={awsConfigStatus}
            awsConfigChecking={awsConfigChecking}
            uploadBlocked={uploadBlocked}
            sampleLoading={sampleLoading}
            restoringJob={restoringJob}
            appSettings={appSettings}
            findings={findings}
            onFileChange={handleFileChange}
            onLoadSample={handleLoadSample}
            onSubmit={handleSubmit}
            onOpenAwsConfig={openAwsConfigSettings}
            onViewRules={() => navigate('settings')}
            onRetry={resetDashboardView}
          />
        );

      case 'documents':
        return (
          <DocumentsPage
            historyItems={historyItems}
            historyLoading={historyLoading}
            activeS3Key={activeS3Key}
            onSelectDocument={handleHistorySelect}
            onDeleteDocument={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        );

      case 'audit':
        return (
          <ValidationPage
            file={file}
            jobStatus={jobStatus}
            summary={summary}
            metadata={metadata}
            humanReview={humanReview}
            findings={findings}
            findingFilter={findingFilter}
            step={step}
            statusLabel={statusLabel}
            showDashboard={showDashboard}
            restoringJob={restoringJob}
            error={error}
            onFilterChange={setFindingFilter}
            onDownload={() =>
              downloadAuditReport({
                fileName: file.name,
                jobStatus,
                uploadResult,
              })
            }
            onGoToUpload={() => navigate('upload')}
            onGoToDocuments={() => navigate('documents')}
            onGoToApprovals={() => navigate('approvals')}
            onRetry={resetDashboardView}
          />
        );

      case 'approvals':
        return (
          <ReviewPage
            showDashboard={showDashboard}
            uploadResult={uploadResult}
            humanReview={humanReview}
            summary={summary}
            file={file}
            onReviewSubmitted={handleReviewSubmitted}
            onGoToDocuments={() => navigate('documents')}
            onGoToUpload={() => navigate('upload')}
          />
        );

      case 'settings':
        return (
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
        );

      default:
        return null;
    }
  }

  return (
    <AppShell activeSection={mainView} onNavigate={navigate} apiConfigured={apiConfigured}>
      {renderSection()}
    </AppShell>
  );
}
