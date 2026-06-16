import { useState } from 'react';
import { submitHumanReview } from '../api.js';
import { formatAppDate } from '../dateUtils.js';

const DECISIONS = [
  { id: 'ACCEPT', label: 'Accept', tone: 'bg-emerald-600 hover:bg-emerald-500' },
  { id: 'REJECT', label: 'Reject', tone: 'bg-rose-600 hover:bg-rose-500' },
  { id: 'CORRECT', label: 'Correct', tone: 'bg-indigo-600 hover:bg-indigo-500' },
];

export default function HumanReviewPanel({
  s3Key,
  humanReview,
  validationSummary,
  onReviewSubmitted,
}) {
  const [comments, setComments] = useState(humanReview?.comments || '');
  const [reviewerId, setReviewerId] = useState(humanReview?.reviewerId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reviewComplete = humanReview?.status === 'COMPLETED';

  async function handleDecision(decision) {
    if (!s3Key) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await submitHumanReview({
        s3Key,
        decision,
        comments,
        reviewerId: reviewerId || 'compliance-reviewer',
      });
      onReviewSubmitted?.(result);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Human Review Queue</h3>
          <p className="mt-1 text-sm text-slate-600">
            Reviewer validates exceptions before final approval. Amazon A2I can be
            connected in the next production phase.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Queue status: {String(validationSummary?.humanReviewStatus || 'PENDING').replaceAll('_', ' ')}
        </span>
      </div>

      {reviewComplete ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">
            Review completed: {humanReview.decision}
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            Reviewer: {humanReview.reviewerId} · {formatAppDate(humanReview.reviewedAt)}
          </p>
          {humanReview.comments && (
            <p className="mt-3 text-sm text-emerald-900">{humanReview.comments}</p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Reviewer name</span>
            <input
              type="text"
              value={reviewerId}
              onChange={(event) => setReviewerId(event.target.value)}
              placeholder="e.g. QA Lead"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Reviewer comments</span>
            <textarea
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
              placeholder="Document notes, corrections, or approval rationale..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {DECISIONS.map((decision) => (
              <button
                key={decision.id}
                type="button"
                disabled={submitting}
                onClick={() => handleDecision(decision.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${decision.tone}`}
              >
                {decision.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
    </section>
  );
}
