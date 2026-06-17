const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <>
        <p>
          An AWS-powered compliance validation platform for <strong>Crosstown Partners</strong>{' '}
          that automates review of Daily Quality Report (DQR) PDFs. The solution uploads documents
          to S3, runs asynchronous Amazon Textract analysis, applies deterministic compliance
          rules, and presents audit findings in a modern React dashboard.
        </p>
        <p className="mt-3">
          The platform combines <strong>serverless AWS orchestration</strong>,{' '}
          <strong>document intelligence</strong>, and <strong>configurable rule management</strong>{' '}
          to help quality teams detect missing signatures, status exceptions, incomplete mandatory
          fields, and human-review items—without relying on generative AI for pass/fail decisions.
        </p>
      </>
    ),
  },
  {
    id: 'features',
    title: 'Key Features',
    items: [
      'PDF upload and analysis from a web dashboard',
      'Automated Amazon Textract extraction (forms, tables, signatures, layout, queries)',
      'Deterministic compliance rule engine with configurable rules',
      'Signature verification across document pages',
      'Status exception detection (e.g. quality status "In Review")',
      'Mandatory field completeness checks on cover and checklist sections',
      'Human review queue with accept / reject / correct workflow',
      'Audit history with local persistence and AWS sync',
      'Compliance settings UI for rules and AWS credentials',
      'User-friendly pipeline failure messages with expandable technical details',
      'Downloadable audit report from completed runs',
      'Real-time job status polling with AWS-specific progress messaging',
    ],
  },
  {
    id: 'capabilities',
    title: 'Core Capabilities',
    items: [
      'Event-driven PDF ingestion (S3 → EventBridge → Step Functions)',
      'Async Textract analysis with SNS callback to resume workflows',
      'Multi-page PDF parsing and structured metadata extraction',
      'Rule engine driven by admin-defined settings (DynamoDB)',
      'Job status and findings API for browser polling',
      'Audit history API with per-job delete support',
      'Settings API for compliance rules and application configuration',
      'AWS credential validation via STS before upload',
      'Step Functions execution error enrichment for support/debugging',
      'SAM-based infrastructure as code for repeatable deployments',
    ],
  },
  {
    id: 'benefits',
    title: 'Business Benefits',
    items: [
      'Reduces manual review time for large multi-page quality reports',
      'Standardizes compliance checks across documents and reviewers',
      'Surfaces signature, status, and completeness issues with page-level detail',
      'Keeps a traceable audit trail of past document runs',
      'Allows admins to tune rules without code changes (settings UI)',
      'Provides clear failure guidance when AWS pipeline steps fail',
      'Supports a human-in-the-loop approval path for exceptions',
      'Scales with serverless AWS services (pay-per-use, no fixed servers)',
    ],
  },
  {
    id: 'security',
    title: 'Security & Compliance',
    content: (
      <>
        <p>
          The platform is designed for enterprise document handling on AWS. PDFs are stored in a
          private S3 bucket with encryption (SSE-S3), public access blocked, and least-privilege
          IAM roles for Textract, Lambda, and Step Functions.
        </p>
        <p className="mt-3">
          Production deployments should add authentication (e.g. Cognito or API keys), restrict
          CORS, rotate credentials, prefer IAM roles over long-lived access keys, and enable audit
          logging. Compliance rules are deterministic and auditable—validation outcomes are
          explainable from rule configuration and extracted document data.
        </p>
      </>
    ),
  },
  {
    id: 'industries',
    title: 'Applicable Industries',
    items: [
      'Construction and infrastructure quality assurance',
      'Engineering and project management firms',
      'Document compliance and audit teams',
      'Regulated field reporting (daily quality / inspection reports)',
      'Enterprise document workflow modernization',
      'AWS serverless proof-of-concept and production pilots',
    ],
  },
  {
    id: 'stack',
    title: 'Technology Stack',
    groups: [
      {
        label: 'Backend',
        items: [
          'Python 3.11',
          'AWS SAM',
          'Lambda, S3, Textract, Step Functions, DynamoDB, SNS, EventBridge',
          'API Gateway (HTTP API)',
          'boto3',
        ],
      },
      {
        label: 'Frontend',
        items: ['React 18', 'Vite', 'Tailwind CSS', 'Local storage for audit history'],
      },
      {
        label: 'Document Intelligence',
        items: [
          'Amazon Textract (FORMS, TABLES, SIGNATURES, LAYOUT, QUERIES)',
          'Deterministic rule engine',
          'Structured metadata and query-answer extraction',
        ],
      },
      {
        label: 'Deployment',
        items: [
          'AWS SAM CLI (sam build, sam deploy)',
          'Stack: cp-crosstown-pdf-compliance',
          'Vercel for React UI',
        ],
      },
    ],
  },
  {
    id: 'api',
    title: 'API Endpoints',
    table: [
      ['GET', '/upload-url?filename=...', 'Presigned S3 upload URL'],
      ['GET', '/status?s3Key=...', 'Job status and findings'],
      ['GET', '/history', 'Recent audit history'],
      ['DELETE', '/history?s3Key=...', 'Remove job from history'],
      ['GET', '/settings', 'Compliance rules and config'],
      ['PUT', '/settings', 'Save rules and config'],
      ['GET', '/settings/aws-config/validate', 'Validate AWS credentials'],
      ['POST', '/review', 'Submit human review decision'],
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture',
    content: (
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`PDF Upload (Browser)
    → S3 (uploads/{uuid}/{filename}.pdf)
    → EventBridge
    → Step Functions
        → Start Textract (Lambda + task token)
        → SNS callback when Textract completes
        → Process results + rule engine (Lambda)
    → DynamoDB (job record, findings)
    ← Browser polls /status and displays dashboard`}
      </pre>
    ),
  },
];

function BulletList({ items }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Crosstown Partners
            </p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
              Intelligent PDF Compliance Validation
            </h1>
          </div>
          <a
            href="/"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Open Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
          Platform documentation for the live compliance audit application. Use the dashboard to
          upload PDFs; use this page for architecture, features, and API reference.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>

              {section.content && (
                <div className="mt-3 text-sm leading-relaxed text-slate-700">{section.content}</div>
              )}
              {section.items && <BulletList items={section.items} />}
              {section.groups && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {section.groups.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-sm font-semibold text-indigo-700">{group.label}</h3>
                      <BulletList items={group.items} />
                    </div>
                  ))}
                </div>
              )}
              {section.table && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Path</th>
                        <th className="px-3 py-2">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map(([method, path, purpose]) => (
                        <tr key={path} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs text-indigo-700">{method}</td>
                          <td className="px-3 py-2 font-mono text-xs">{path}</td>
                          <td className="px-3 py-2 text-slate-600">{purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">One-Line Summary</p>
          <p className="mt-2 max-w-3xl mx-auto leading-relaxed">
            An AWS serverless Intelligent PDF Compliance Validation platform for Crosstown Partners
            that ingests Daily Quality Report PDFs, extracts data with Amazon Textract, applies
            configurable deterministic compliance rules, supports human review, and delivers an
            auditable React dashboard for quality teams.
          </p>
          <a href="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
            ← Back to Compliance Audit Dashboard
          </a>
        </footer>
      </main>
    </div>
  );
}
