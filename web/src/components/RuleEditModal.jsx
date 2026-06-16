function hintsToText(hints) {
  return (hints || []).join(', ');
}

function textToHints(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function RuleEditModal({ rule, isNew = false, onSave, onClose }) {
  if (!rule) return null;

  const isWorkflow = rule.category === 'WORKFLOW';
  const isStatusRule = rule.category === 'STATUS_EXCEPTION';

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    onSave({
      ...rule,
      name: formData.get('name')?.toString().trim() || (isNew ? 'Custom Rule' : rule.name),
      detail: formData.get('detail')?.toString().trim() || '',
      fieldHints: isWorkflow ? rule.fieldHints : textToHints(formData.get('fieldHints')?.toString() || ''),
      statusValues: isStatusRule
        ? textToHints(formData.get('statusValues')?.toString() || '')
        : rule.statusValues,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-edit-title"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="rule-edit-title" className="text-lg font-semibold text-slate-900">
            {isNew ? 'Add rule' : 'Edit rule'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Rule name</span>
            <input
              name="name"
              defaultValue={isNew ? '' : rule.name}
              placeholder="e.g. Custom Rule"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              name="detail"
              defaultValue={isNew ? '' : rule.detail || ''}
              placeholder="Describe what this rule validates"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          {!isWorkflow && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Field hints (comma separated)</span>
              <input
                name="fieldHints"
                defaultValue={isNew ? '' : hintsToText(rule.fieldHints)}
                placeholder="e.g. signature, inspection date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          )}

          {isStatusRule && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Exception status values (comma separated)
              </span>
              <input
                name="statusValues"
                defaultValue={isNew ? '' : hintsToText(rule.statusValues)}
                placeholder="e.g. in review"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
