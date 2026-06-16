"""Lambda handler: return job status and findings for browser polling."""

import json
import logging
from urllib.parse import unquote_plus

import boto3
from botocore.exceptions import ClientError

from common import api_response, document_name_from_key, get_required_env

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
sfn = boto3.client("stepfunctions")


def _parse_sfn_cause(cause: str) -> dict:
    if not cause:
        return {}
    try:
        parsed = json.loads(cause)
        return parsed if isinstance(parsed, dict) else {"errorMessage": cause}
    except json.JSONDecodeError:
        return {"errorMessage": cause}


def _enrich_error_details(item: dict) -> dict:
    error_details = dict(item.get("errorDetails") or {})
    execution_arn = item.get("executionArn", "")

    if item.get("status") != "FAILED" or not execution_arn:
        return error_details

    if error_details.get("stackTrace") and error_details.get("errorType"):
        return error_details

    try:
        execution = sfn.describe_execution(executionArn=execution_arn)
    except ClientError:
        logger.exception("Failed to describe Step Functions execution")
        return error_details

    if execution.get("status") != "FAILED":
        return error_details

    cause = _parse_sfn_cause(execution.get("cause", ""))
    stack_trace = cause.get("stackTrace", [])
    if isinstance(stack_trace, list):
        stack_trace = "\n".join(stack_trace)

    return {
        **error_details,
        "stage": error_details.get("stage") or "AWS Step Functions",
        "errorType": execution.get("error") or cause.get("errorType") or error_details.get("errorType", ""),
        "errorMessage": cause.get("errorMessage")
        or error_details.get("errorMessage")
        or item.get("errorMessage", "")
        or execution.get("cause", ""),
        "stackTrace": stack_trace or error_details.get("stackTrace", ""),
        "requestId": cause.get("requestId", error_details.get("requestId", "")),
        "executionArn": execution_arn,
    }


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    params = event.get("queryStringParameters") or {}
    s3_key = params.get("s3Key")
    if not s3_key:
        return api_response(400, {"error": "s3Key query parameter is required"})

    s3_key = unquote_plus(s3_key)
    table = dynamodb.Table(get_required_env("JOBS_TABLE_NAME"))
    result = table.get_item(Key={"s3Key": s3_key})
    item = result.get("Item")

    if not item:
        return api_response(
            200,
            {
                "s3Key": s3_key,
                "status": "PENDING",
                "message": "Waiting for Textract job to start",
                "findings": [],
                "findingCount": 0,
            },
        )

    error_details = _enrich_error_details(item) if item else {}

    payload = {
        "s3Key": item.get("s3Key", s3_key),
        "jobId": item.get("jobId", ""),
        "bucket": item.get("bucket", ""),
        "documentName": item.get("documentName")
        or document_name_from_key(item.get("s3Key", s3_key)),
        "status": item.get("status", "IN_PROGRESS"),
        "findings": item.get("findings", []),
        "findingCount": int(item.get("findingCount", 0)),
        "queryAnswers": item.get("queryAnswers", []),
        "pageCount": int(item.get("pageCount", 0)),
        "updatedAt": item.get("updatedAt", ""),
        "errorMessage": item.get("errorMessage", "") or error_details.get("errorMessage", ""),
        "errorDetails": error_details,
        "executionArn": item.get("executionArn", ""),
        "metadata": item.get("metadata", {}),
        "validationSummary": item.get("validationSummary", {}),
        "humanReview": item.get("humanReview", {}),
    }

    logger.info(
        "Status requested | Key=%s | Status=%s | Findings=%s",
        s3_key,
        payload["status"],
        payload["findingCount"],
    )

    return api_response(200, payload)
