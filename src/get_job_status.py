"""Lambda handler: return job status and findings for browser polling."""

import logging
from urllib.parse import unquote_plus

import boto3

from common import api_response, document_name_from_key, get_required_env

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")


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
        "errorMessage": item.get("errorMessage", ""),
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
