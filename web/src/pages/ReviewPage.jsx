import HumanReviewPanel from '../components/HumanReviewPanel.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { IconFolder, IconUpload } from '../components/icons.jsx';

export default function ReviewPage({
  showDashboard,
  uploadResult,
  humanReview,
  summary,
  file,
  onReviewSubmitted,
  onGoToDocuments,
  onGoToUpload,
}) {
  if (!showDashboard) {
    return (
      <>
        <PageHeader subtitle="Review and sign off on documents with compliance exceptions." />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">No document is ready for approval.</p>
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
      </>
    );
  }

  return (
    <>
      <PageHeader subtitle={file?.name || 'Validate exceptions before final sign-off.'} />
      <HumanReviewPanel
        s3Key={uploadResult.key}
        humanReview={humanReview}
        validationSummary={summary}
        onReviewSubmitted={onReviewSubmitted}
      />
    </>
  );
}
