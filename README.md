# Intelligent PDF Compliance Validation

**Live app:** [https://intelligent-pdf-compliance-validati.vercel.app](https://intelligent-pdf-compliance-validati.vercel.app)  
**Documentation:** [https://intelligent-pdf-compliance-validati.vercel.app/documentation](https://intelligent-pdf-compliance-validati.vercel.app/documentation)

## Overview

An AWS-powered compliance validation platform for **Crosstown Partners** that automates review of Daily Quality Report (DQR) PDFs. The solution uploads documents to S3, runs asynchronous Amazon Textract analysis, applies deterministic compliance rules, and presents audit findings in a modern React dashboard.

The platform combines **serverless AWS orchestration**, **document intelligence**, and **configurable rule management** to help quality teams detect missing signatures, status exceptions, incomplete mandatory fields, and human-review items—without relying on generative AI for pass/fail decisions.

---

## Key Features

- PDF upload and analysis from a web dashboard
- Automated Amazon Textract extraction (forms, tables, signatures, layout, queries)
- Deterministic compliance rule engine with configurable rules
- Signature verification across document pages
- Status exception detection (e.g. quality status "In Review")
- Mandatory field completeness checks on cover and checklist sections
- Human review queue with accept / reject / correct workflow
- Audit history with local persistence and AWS sync
- Compliance settings UI for rules and AWS credentials
- User-friendly pipeline failure messages with expandable technical details
- Downloadable audit report from completed runs
- Real-time job status polling with AWS-specific progress messaging

---

## Core Capabilities

- Event-driven PDF ingestion (S3 → EventBridge → Step Functions)
- Async Textract analysis with SNS callback to resume workflows
- Multi-page PDF parsing and structured metadata extraction
- Rule engine driven by admin-defined settings (DynamoDB)
- Job status and findings API for browser polling
- Audit history API with per-job delete support
- Settings API for compliance rules and application configuration
- AWS credential validation via STS before upload
- Step Functions execution error enrichment for support/debugging
- SAM-based infrastructure as code for repeatable deployments

---

## Business Benefits

- Reduces manual review time for large multi-page quality reports
- Standardizes compliance checks across documents and reviewers
- Surfaces signature, status, and completeness issues with page-level detail
- Keeps a traceable audit trail of past document runs
- Allows admins to tune rules without code changes (settings UI)
- Provides clear failure guidance when AWS pipeline steps fail
- Supports a human-in-the-loop approval path for exceptions
- Scales with serverless AWS services (pay-per-use, no fixed servers)

---

## Security & Compliance

The platform is designed for enterprise document handling on AWS. PDFs are stored in a private S3 bucket with encryption (SSE-S3), public access blocked, and least-privilege IAM roles for Textract, Lambda, and Step Functions. API access is exposed through API Gateway; sensitive credentials can be configured in the settings table for controlled environments.

Production deployments should add authentication (e.g. Cognito or API keys), restrict CORS, rotate credentials, prefer IAM roles over long-lived access keys, and enable audit logging for API and data access. Compliance rules are deterministic and auditable—validation outcomes are explainable from rule configuration and extracted document data.

---

## Applicable Industries

- Construction and infrastructure quality assurance
- Engineering and project management firms
- Document compliance and audit teams
- Regulated field reporting (daily quality / inspection reports)
- Enterprise document workflow modernization
- AWS serverless proof-of-concept and production pilots

---

## Technology Stack

### Backend

- Python 3.11
- AWS SAM (Serverless Application Model)
- AWS Lambda
- Amazon S3
- Amazon Textract
- AWS Step Functions
- Amazon DynamoDB
- Amazon SNS
- Amazon EventBridge
- API Gateway (HTTP API)
- boto3

### Frontend

- React 18
- Vite
- Tailwind CSS
- Local storage for audit history cache

### AI & Document Intelligence

- Amazon Textract (FORMS, TABLES, SIGNATURES, LAYOUT, QUERIES)
- Deterministic rule engine (no LLM pass/fail logic in Phase 1)
- Structured metadata and query-answer extraction

### Storage & Security

- Amazon S3 (document bucket, SSE-S3)
- DynamoDB (jobs table, settings table)
- IAM roles and SAM policy templates
- Optional AWS credential config (Access Key, Secret, Session Token)

### Deployment

- AWS SAM CLI (`sam build`, `sam deploy`)
- Stack name: `cp-crosstown-pdf-compliance`
- Optional Vercel/static hosting for the React UI (`web/`)

---

## Project URLs & Quick Start

| Resource | Location |
|----------|----------|
| **Live dashboard (Vercel)** | https://intelligent-pdf-compliance-validati.vercel.app |
| **Live documentation** | https://intelligent-pdf-compliance-validati.vercel.app/documentation |
| **Repository root** | `IntelligentPDFComplianceValidation/` |
| **Infrastructure** | `template.yaml` |
| **Lambda source** | `src/` |
| **React dashboard** | `web/` |
| **Step Functions definition** | `statemachines/compliance_workflow.asl.json` |
| **Testing & debug guide** | `TESTING-DEBUG.md` |

### Deploy backend

```powershell
sam build
sam deploy
```

Note the **ApiUrl** output from the stack—that is your API base URL.

### Try without your own PDF

On the live dashboard, click **Use sample DQR** to load the bundled reference document (`DQR-TCE-20260104-sample.pdf`, 51-page DQR) and run **Upload & Analyze** immediately.

### Run frontend locally

```powershell
cd web
copy .env.example .env
# Set VITE_API_URL to your API Gateway URL (e.g. https://....execute-api.us-east-1.amazonaws.com/prod)
npm install
npm run dev
```

### Main API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/upload-url?filename=...` | Presigned S3 upload URL |
| GET | `/status?s3Key=...` | Job status and findings |
| GET | `/history` | Recent audit history |
| DELETE | `/history?s3Key=...` | Remove job from history |
| GET | `/settings` | Compliance rules and config |
| PUT | `/settings` | Save rules and config |
| GET | `/settings/aws-config/validate` | Validate stored AWS credentials |
| POST | `/review` | Submit human review decision |

---

## Architecture (high level)

```
PDF Upload (Browser)
    → S3 (uploads/{uuid}/{filename}.pdf)
    → EventBridge
    → Step Functions
        → Start Textract (Lambda + task token)
        → SNS callback when Textract completes
        → Process results + rule engine (Lambda)
    → DynamoDB (job record, findings)
    ← Browser polls /status and displays dashboard
```

---

## One-Line Summary

An AWS serverless Intelligent PDF Compliance Validation platform for Crosstown Partners that ingests Daily Quality Report PDFs, extracts data with Amazon Textract, applies configurable deterministic compliance rules, supports human review, and delivers an auditable React dashboard for quality teams.
