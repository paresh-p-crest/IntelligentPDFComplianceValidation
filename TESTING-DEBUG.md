# CP PDF Compliance — Testing & Debug (Current Deploy)

> **You are on the OLD stack** (no Step Functions yet). That is fine for this test.
> The UI polls `/status` every 5s until DynamoDB shows `COMPLETED` or `FAILED`.

---

## Why the browser shows "Analyzing…" for a long time

| `/status` response | Meaning |
|---|---|
| `PENDING` | PDF uploaded, but Textract job not started yet |
| `IN_PROGRESS` | Textract running OR finished but results not processed yet |
| `COMPLETED` | Done — findings should appear |
| `FAILED` | Error — check `errorMessage` in response |

**Normal time for a ~50-page PDF:** 10–30 minutes (sometimes longer).

**Your Network tab showing many `status?s3Key=...` 200 responses is expected** — that is polling, not an error.

---

## Quick debug (run in PowerShell)

```powershell
aws sso login --profile sandbox
$env:AWS_PROFILE = "sandbox"
```

### 1) What does the API return right now?

Copy `s3Key` from the browser UI, then:

```powershell
curl "YOUR_API_URL/status?s3Key=uploads%2FYOUR-UUID%2Fyour-file.pdf"
```

Look at `"status"` and `"jobId"`.

---

### 2) DynamoDB — job row exists?

```powershell
aws dynamodb get-item `
  --table-name cp-crosstown-compliance-jobs `
  --key '{"s3Key":{"S":"uploads/YOUR-UUID/your-file.pdf"}}' `
  --profile sandbox
```

| DynamoDB `status` | Next check |
|---|---|
| No item | EventBridge / start Lambda did not run → **Step 3** |
| `IN_PROGRESS` | Textract or SNS callback stuck → **Steps 4–5** |
| `COMPLETED` | Refresh browser; if still stuck, hard refresh (Ctrl+Shift+R) |
| `FAILED` | Read `errorMessage` in the item |

---

### 3) PDF in S3?

```powershell
aws s3 ls s3://cp-crosstown-pdf-documents-YOUR_ACCOUNT_ID/uploads/ --recursive --profile sandbox
```

If file is missing → upload failed (check browser console for S3 PUT error).

---

### 4) Start Lambda ran?

**Console:** Lambda → `cp-crosstown-start-textract` → Monitor → View logs

Look for: `Textract job started successfully | JobId=...`

```powershell
sam logs -n cp-crosstown-start-textract --stack-name cp-crosstown-pdf-compliance --tail --profile sandbox
```

No logs → EventBridge rule `cp-crosstown-pdf-upload-rule` may not be triggering.

---

### 5) Textract finished? Process Lambda ran?

**OLD flow (your current deploy):**

```
Textract done → SNS → cp-crosstown-process-textract → DynamoDB COMPLETED
```

**Console:** Lambda → `cp-crosstown-process-textract` → logs

Look for: `Validation complete | Findings=...`

```powershell
sam logs -n cp-crosstown-process-textract --stack-name cp-crosstown-pdf-compliance --tail --profile sandbox
```

If start Lambda has `JobId` but process Lambda has **no logs** after 30+ min:

- SNS topic: `cp-crosstown-textract-completion`
- Subscription should point to `cp-crosstown-process-textract`
- Textract service role: `cp-crosstown-textract-service-role`

---

### 6) Textract job status (optional)

Use `jobId` from DynamoDB:

```powershell
aws textract get-document-analysis --job-id YOUR_JOB_ID --profile sandbox
```

If `JobStatus` is still `IN_PROGRESS` → wait longer.

---

## Most common causes (OLD deploy)

1. **Still processing** — 50-page PDF + FORMS/TABLES/SIGNATURES/QUERIES is slow.
2. **Stuck on `IN_PROGRESS`** — SNS → `process-textract` Lambda never fired.
3. **Stuck on `PENDING`** — `start-textract` never ran (EventBridge / PDF not `.pdf`).
4. **Wrong API URL** — `web/.env` `VITE_API_URL` must match current stack `ApiUrl`.

---

## Before deploying Step Functions version

You do **not** need to stop `npm run dev` to deploy AWS backend, but it is cleaner to:

1. Stop dev server: `Ctrl+C` in the `web` terminal (optional)
2. Deploy backend:

```powershell
cd "d:\AWS\AWS Projects\IntelligentPDFComplianceValidation"
sam build
sam deploy
```

3. Update `web/.env` if **ApiUrl** changed
4. Restart web: `cd web` → `npm run dev`

**After Step Functions deploy**, monitor here instead:

- **Step Functions** → `cp-crosstown-compliance-workflow` → **Executions**
- Lambdas: `start-textract`, `textract-callback`, `process-textract`

---

## Safe to do now (without redeploying)

1. Run **Step 1** (curl status) — see exact `status` value
2. Run **Step 2** (DynamoDB get-item)
3. Check **start-textract** and **process-textract** CloudWatch logs

That tells you whether it is slow Textract or a broken pipeline.

---

## When to redeploy Step Functions

Redeploy when local debug shows the OLD pipeline works OR you are ready to switch architecture.

Delete old stack first only if CloudFormation update fails (see main deploy notes).
