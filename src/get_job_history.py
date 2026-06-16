"""Lambda handler: return recent audit job history."""

import logging

import boto3

from common import api_response, document_name_from_key, get_required_env

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

MAX_HISTORY_ITEMS = 25


def _to_summary(item: dict) -> dict:
    validation_summary = item.get("validationSummary") or {}
    metadata = item.get("metadata") or {}

    return {
        "s3Key": item.get("s3Key", ""),
        "documentName": item.get("documentName")
        or document_name_from_key(item.get("s3Key", "")),
        "jobId": item.get("jobId", ""),
        "status": item.get("status", ""),
        "findingCount": int(item.get("findingCount", 0)),
        "pageCount": int(item.get("pageCount", 0)),
        "updatedAt": item.get("updatedAt", ""),
        "createdAt": item.get("createdAt", ""),
        "overallStatus": validation_summary.get("overallStatus", ""),
        "reportNumber": metadata.get("reportNumber", ""),
        "humanReviewStatus": validation_summary.get("humanReviewStatus", ""),
    }


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    table = dynamodb.Table(get_required_env("JOBS_TABLE_NAME"))
    response = table.scan()
    items = response.get("Items", [])

    while "LastEvaluatedKey" in response and len(items) < 200:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))

    summaries = [_to_summary(item) for item in items]
    summaries.sort(key=lambda item: item.get("updatedAt", ""), reverse=True)
    summaries = summaries[:MAX_HISTORY_ITEMS]

    logger.info("History requested | Returned=%s", len(summaries))

    return api_response(200, {"items": summaries, "count": len(summaries)})
