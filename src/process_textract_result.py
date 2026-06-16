"""Lambda handler: parse Textract output and run compliance rules (Step Functions task)."""

import json
import logging
import traceback
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from common import get_required_env, parse_textract_document_location, to_dynamo_value, document_name_from_key
from metadata_extractor import extract_document_metadata
from query_catalog import enrich_query_answers
from rule_engine import build_validation_summary, run_phase1_rules
from settings_store import load_settings
from textract_parser import (
    extract_key_value_pairs,
    extract_query_answers,
    group_lines_by_page,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

textract = boto3.client("textract")
dynamodb = boto3.resource("dynamodb")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_all_blocks(job_id: str) -> list[dict]:
    blocks: list[dict] = []
    next_token = None

    while True:
        params: dict = {"JobId": job_id}
        if next_token:
            params["NextToken"] = next_token

        response = textract.get_document_analysis(**params)
        blocks.extend(response.get("Blocks", []))
        next_token = response.get("NextToken")
        if not next_token:
            break

    return blocks


def _update_job(table, s3_key: str, updates: dict) -> None:
    updates["updatedAt"] = _now_iso()
    dynamo_updates = to_dynamo_value(updates)
    table.update_item(
        Key={"s3Key": s3_key},
        UpdateExpression="SET "
        + ", ".join(f"#{key} = :{key}" for key in dynamo_updates),
        ExpressionAttributeNames={f"#{key}": key for key in dynamo_updates},
        ExpressionAttributeValues={
            f":{key}": value for key, value in dynamo_updates.items()
        },
    )


def _failure_update(
    table,
    s3_key: str,
    *,
    job_id: str,
    bucket: str,
    friendly_message: str,
    error_details: dict,
) -> None:
    _update_job(
        table,
        s3_key,
        {
            "jobId": job_id,
            "bucket": bucket,
            "status": "FAILED",
            "errorMessage": friendly_message,
            "errorDetails": error_details,
            "findings": [],
            "findingCount": 0,
        },
    )


def _parse_textract_message(event) -> dict:
    if isinstance(event, str):
        return json.loads(event)
    if isinstance(event, dict) and "JobId" in event:
        return event
    raise ValueError("Invalid Textract completion payload")


def _lookup_from_dynamodb(table, job_id: str) -> tuple[str, str]:
    if not job_id:
        return "", ""

    from boto3.dynamodb.conditions import Attr, Key

    try:
        response = table.query(
            IndexName="jobId-index",
            KeyConditionExpression=Key("jobId").eq(job_id),
        )
        items = response.get("Items", [])
        if items:
            item = items[0]
            return item.get("s3Key", ""), item.get("bucket", "")
    except ClientError:
        logger.exception("jobId-index query failed for JobId=%s", job_id)

    scan = table.scan(FilterExpression=Attr("jobId").eq(job_id))
    items = scan.get("Items", [])
    if items:
        item = items[0]
        return item.get("s3Key", ""), item.get("bucket", "")

    return "", ""


def handler(event, context):
    message = _parse_textract_message(event)
    job_id = message["JobId"]
    status = message.get("Status")
    bucket, s3_key = parse_textract_document_location(message)

    logger.info(
        "Processing Textract results | JobId=%s | Status=%s | Key=%s",
        job_id,
        status,
        s3_key,
    )

    table_name = get_required_env("JOBS_TABLE_NAME")
    table = dynamodb.Table(table_name)

    if not s3_key:
        s3_key, db_bucket = _lookup_from_dynamodb(table, job_id)
        bucket = bucket or db_bucket

    if not s3_key:
        raise ValueError(f"No S3 key in Textract message for JobId={job_id}")

    if status != "SUCCEEDED":
        _failure_update(
            table,
            s3_key,
            job_id=job_id,
            bucket=bucket,
            friendly_message="Amazon Textract did not finish analyzing this PDF.",
            error_details={
                "stage": "Amazon Textract",
                "errorType": "TextractStatusError",
                "errorMessage": f"Textract job ended with status {status}",
                "jobId": job_id,
            },
        )
        return {"status": "failed", "jobId": job_id, "s3Key": s3_key}

    try:
        blocks = _fetch_all_blocks(job_id)
        pages = group_lines_by_page(blocks)
        key_value_pairs = extract_key_value_pairs(blocks)
        query_answers = enrich_query_answers(extract_query_answers(blocks))
        settings_table = get_required_env("SETTINGS_TABLE_NAME")
        settings = load_settings(settings_table)
        findings = run_phase1_rules(
            pages,
            key_value_pairs,
            query_answers,
            len(pages),
            settings=settings,
        )
        metadata = extract_document_metadata(pages, key_value_pairs, query_answers)
        validation_summary = build_validation_summary(findings, len(pages), settings=settings)
        document_name = document_name_from_key(s3_key)

        _update_job(
            table,
            s3_key,
            {
                "jobId": job_id,
                "bucket": bucket,
                "documentName": document_name,
                "status": "COMPLETED",
                "findings": findings,
                "findingCount": len(findings),
                "queryAnswers": query_answers,
                "pageCount": len(pages),
                "metadata": metadata,
                "validationSummary": validation_summary,
                "errorMessage": "",
            },
        )

        logger.info(
            "Validation complete | JobId=%s | Findings=%s",
            job_id,
            len(findings),
        )

        return {
            "status": "completed",
            "jobId": job_id,
            "s3Key": s3_key,
            "findingCount": len(findings),
        }
    except ClientError as exc:
        logger.exception("Failed to process Textract results for JobId=%s", job_id)
        _failure_update(
            table,
            s3_key,
            job_id=job_id,
            bucket=bucket,
            friendly_message="Could not download or parse Textract results for this document.",
            error_details={
                "stage": "Amazon Textract",
                "errorType": exc.__class__.__name__,
                "errorMessage": str(exc),
                "stackTrace": traceback.format_exc(),
                "jobId": job_id,
            },
        )
        raise
    except Exception as exc:
        logger.exception("Compliance validation failed for JobId=%s", job_id)
        _failure_update(
            table,
            s3_key,
            job_id=job_id,
            bucket=bucket,
            friendly_message="Compliance validation failed while applying audit rules.",
            error_details={
                "stage": "RuleEngine",
                "errorType": exc.__class__.__name__,
                "errorMessage": str(exc),
                "stackTrace": traceback.format_exc(),
                "jobId": job_id,
            },
        )
        raise
