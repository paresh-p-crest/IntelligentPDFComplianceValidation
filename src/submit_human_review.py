"""Lambda handler: record human review decision for a compliance job."""

import json
import logging
from datetime import datetime, timezone
from urllib.parse import unquote_plus

import boto3

from common import api_response, get_required_env, to_dynamo_value

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

ALLOWED_DECISIONS = {"ACCEPT", "REJECT", "CORRECT"}


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return api_response(400, {"error": "Invalid JSON body"})

    s3_key = body.get("s3Key")
    decision = (body.get("decision") or "").upper()
    comments = (body.get("comments") or "").strip()
    reviewer_id = (body.get("reviewerId") or "compliance-reviewer").strip()

    if not s3_key:
        return api_response(400, {"error": "s3Key is required"})
    if decision not in ALLOWED_DECISIONS:
        return api_response(
            400,
            {"error": "decision must be ACCEPT, REJECT, or CORRECT"},
        )

    s3_key = unquote_plus(s3_key)
    table = dynamodb.Table(get_required_env("JOBS_TABLE_NAME"))
    existing = table.get_item(Key={"s3Key": s3_key}).get("Item")

    if not existing:
        return api_response(404, {"error": "Job not found"})

    timestamp = datetime.now(timezone.utc).isoformat()
    human_review = {
        "decision": decision,
        "comments": comments,
        "reviewerId": reviewer_id,
        "reviewedAt": timestamp,
        "status": "COMPLETED",
    }

    validation_summary = dict(existing.get("validationSummary", {}))
    validation_summary["humanReviewStatus"] = "COMPLETED"
    validation_summary["humanReviewDecision"] = decision

    if decision == "ACCEPT":
        validation_summary["overallStatus"] = "APPROVED"
    elif decision == "REJECT":
        validation_summary["overallStatus"] = "REJECTED"
    else:
        validation_summary["overallStatus"] = "CORRECTED"

    table.update_item(
        Key={"s3Key": s3_key},
        UpdateExpression="SET humanReview = :humanReview, validationSummary = :summary, updatedAt = :updatedAt",
        ExpressionAttributeValues=to_dynamo_value(
            {
                ":humanReview": human_review,
                ":summary": validation_summary,
                ":updatedAt": timestamp,
            }
        ),
    )

    logger.info(
        "Human review submitted | Key=%s | Decision=%s | Reviewer=%s",
        s3_key,
        decision,
        reviewer_id,
    )

    return api_response(
        200,
        {
            "s3Key": s3_key,
            "humanReview": human_review,
            "validationSummary": validation_summary,
        },
    )
