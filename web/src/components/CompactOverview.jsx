import HorizontalStepper from './HorizontalStepper.jsx';

function MetadataStrip({ metadata = {} }) {
  const fields = [
    { label: 'Project', value: metadata.projectNumber },
    { label: 'Date', value: metadata.reportDate },
    { label: 'Report ID', value: metadata.lotId || metadata.reportNumber },
    { label: 'Prepared by', value: metadata.preparedBy },
  ];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
      {fields.map((field) => (
        <span key={field.label} className="inline-flex items-center gap-1">
          <span className="font-medium text-slate-500">{field.label}:</span>
          <span className="font-semibold text-slate-900">{field.value || '—'}</span>
        </span>
      ))}
    </div>
  );
}

export default function CompactOverview({
  summary = {},
  metadata = {},
  step = 'idle',
  humanReview = {},
}) {
  const timelineItems = [
    { label: 'Uploaded', detail: 'PDF in S3', done: true },
    {
      label: 'Extracted',
      detail: 'Textract analysis',
      done: step !== 'uploading' && step !== 'requesting',
    },
    {
      label: 'Validated',
      detail: 'Rules executed',
      done: step === 'done',
      current: step === 'analyzing',
    },
    {
      label: 'Review',
      detail: 'Human decision',
      done: humanReview?.status === 'COMPLETED',
      current: summary?.humanReviewStatus === 'PENDING' && step === 'done',
    },
    {
      label: 'Approved',
      detail: 'Final status',
      done: summary?.overallStatus === 'APPROVED',
    },
  ];

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <MetadataStrip metadata={metadata} />
        <HorizontalStepper items={timelineItems} />
      </div>
    </section>
  );
}
