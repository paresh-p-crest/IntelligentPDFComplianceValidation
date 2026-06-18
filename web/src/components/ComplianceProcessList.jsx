import ProcessTimeline from './ProcessTimeline.jsx';

function formatPageList(pages) {
  if (pages.length === 1) return `page ${pages[0]}`;
  return `pages ${pages.join(', ')}`;
}

function buildSignatureDetail(findings, auditComplete, fallbackDetail) {
  if (!auditComplete) return fallbackDetail;

  const pages = [
    ...new Set(
      findings
        .filter((finding) => finding.type === 'MISSING_SIGNATURE')
        .map((finding) => finding.page)
        .filter((page) => page != null),
    ),
  ].sort((a, b) => a - b);

  if (pages.length === 0) return 'No missing signatures detected';
  return `Missing signatures on ${formatPageList(pages)}`;
}

export default function ComplianceProcessList({
  pipelineActive = false,
  auditComplete = false,
  findings = [],
  rules = [],
  embedded = false,
  onViewRules,
}) {
  const workflowRules = rules.filter((rule) => rule.category !== 'WORKFLOW' || rule.enabled);
  const items = (rules.length ? rules : workflowRules).map((rule, index) => {
    const detail =
      rule.category === 'MISSING_SIGNATURE'
        ? buildSignatureDetail(findings, auditComplete, rule.detail)
        : rule.detail;

    if (auditComplete) {
      return { ...rule, detail, done: true };
    }

    if (pipelineActive) {
      const doneBefore = Math.floor((rules.length - 1) * 0.75);
      return {
        ...rule,
        detail,
        done: index < doneBefore,
        current: index === doneBefore,
      };
    }

    return { ...rule, detail, label: rule.name };
  }).map((rule) => ({
    label: rule.name || rule.label,
    detail: rule.detail,
    done: rule.done,
    current: rule.current,
  }));

  return (
    <section className={embedded ? '' : 'mt-8'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-lime">
            Active Compliance Checks
          </p>
          <p className={`mt-2 text-xs ${embedded ? 'text-slate-400' : 'text-slate-500'}`}>
            Rules applied automatically during each audit run.
          </p>
        </div>
        {onViewRules && (
          <button
            type="button"
            onClick={onViewRules}
            className="shrink-0 text-xs font-semibold text-cp-lime hover:text-lime-300"
          >
            Edit rules
          </button>
        )}
      </div>
      <div
        className={`mt-4 rounded-xl border p-4 ${
          embedded ? 'border-slate-700 bg-slate-800/60' : 'border-slate-800 bg-slate-900/40'
        }`}
      >
        <ProcessTimeline items={items} variant={embedded ? 'dark' : 'dark'} />
      </div>
    </section>
  );
}
