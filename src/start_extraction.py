"""Lambda handler: start async Textract document analysis (Step Functions task)."""

import json
import logging
import urllib.parse
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from common import get_required_env, to_dynamo_value, document_name_from_key
from query_catalog import DEMO_QUERIES

logger = logging.getLogger()
logger.setLevel(logging.INFO)

textract = boto3.client("textract")
dynamodb = boto3.resource("dynamodb")

FEATURE_TYPES = ["FORMS", "TABLES", "SIGNATURES", "LAYOUT", "QUERIES"]


def _extract_s3_record(event: dict) -> tuple[str, str]:
    """Return (bucket, key) from a direct S3 or EventBridge-wrapped S3 event."""
    if event.get("Records"):
        try:
            record = event["Records"][0]
            bucket = record["s3"]["bucket"]["name"]
            key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
            return bucket, key
        except (KeyError, IndexError) as exc:
            raise ValueError("Invalid S3 event payload") from exc

    if event.get("source") == "aws.s3" and event.get("detail"):
        try:
            detail = event["detail"]
            bucket = detail["bucket"]["name"]
            key = urllib.parse.unquote_plus(detail["object"]["key"])
            return bucket, key
        except (KeyError, TypeError) as exc:
            raise ValueError("Invalid EventBridge S3 event payload") from exc

    if event.get("bucket") and event.get("key"):
        return event["bucket"], urllib.parse.unquote_plus(event["key"])

    raise ValueError("Unsupported event payload")


def _workflow_payload(event: dict) -> dict:
    """Normalize Step Functions waitForTaskToken payload."""
    if event.get("taskToken"):
        return event.get("input") or event
    return event


def handler(event, context):
    """
    Step Functions task: start Textract and wait for SNS callback to resume the workflow.
    """
    logger.info("Received event: %s", json.dumps(event))

    task_token = event.get("taskToken")
    execution_arn = event.get("executionArn", "")
    payload = _workflow_payload(event)

    bucket, key = _extract_s3_record(payload)

    if not key.lower().endswith(".pdf"):
        logger.info("Skipping non-PDF object: s3://%s/%s", bucket, key)
        return {"status": "skipped", "reason": "not_a_pdf", "key": key}

    if not task_token:
        raise ValueError("taskToken is required when invoked by Step Functions")

    sns_topic_arn = get_required_env("SNS_TOPIC_ARN")
    textract_role_arn = get_required_env("TEXTRACT_ROLE_ARN")
    jobs_table_name = get_required_env("JOBS_TABLE_NAME")

    document_location = {"S3Object": {"Bucket": bucket, "Name": key}}
    notification_channel = {
        "SNSTopicArn": sns_topic_arn,
        "RoleArn": textract_role_arn,
    }
    queries_config = {"Queries": DEMO_QUERIES}

    logger.info(
        "Starting Textract analysis for s3://%s/%s with features=%s",
        bucket,
        key,
        FEATURE_TYPES,
    )

    try:
        response = textract.start_document_analysis(
            DocumentLocation=document_location,
            FeatureTypes=FEATURE_TYPES,
            NotificationChannel=notification_channel,
            QueriesConfig=queries_config,
        )
    except ClientError:
        logger.exception(
            "Textract StartDocumentAnalysis failed for s3://%s/%s",
            bucket,
            key,
        )
        raise

    job_id = response["JobId"]
    timestamp = datetime.now(timezone.utc).isoformat()
    jobs_table = dynamodb.Table(jobs_table_name)
    jobs_table.put_item(
        Item=to_dynamo_value(
            {
                "s3Key": key,
                "jobId": job_id,
                "bucket": bucket,
                "documentName": document_name_from_key(key),
                "status": "IN_PROGRESS",
                "findings": [],
                "findingCount": 0,
                "queryAnswers": [],
                "taskToken": task_token,
                "executionArn": execution_arn,
                "createdAt": timestamp,
                "updatedAt": timestamp,
            }
        )
    )

    logger.info(
        "Textract job started | JobId=%s | ExecutionArn=%s | Key=%s",
        job_id,
        execution_arn,
        key,
    )

    return {
        "status": "started",
        "jobId": job_id,
        "bucket": bucket,
        "key": key,
        "executionArn": execution_arn,
    }
