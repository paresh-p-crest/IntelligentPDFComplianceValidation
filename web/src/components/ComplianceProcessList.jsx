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
    <section className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
        Active Compliance Checks
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Rules applied automatically during each audit run.
      </p>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <ProcessTimeline items={items} variant="dark" />
      </div>
    </section>
  );
}
