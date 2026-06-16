"""Lambda handler: resume Step Functions when Textract publishes to SNS."""

import json
import logging

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from common import get_required_env, parse_textract_document_location

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sfn = boto3.client("stepfunctions")
dynamodb = boto3.resource("dynamodb")


def _lookup_job(table, s3_key: str = "", job_id: str = ""):
    if s3_key:
        item = table.get_item(Key={"s3Key": s3_key}).get("Item")
        if item:
            return item

    if job_id:
        try:
            response = table.query(
                IndexName="jobId-index",
                KeyConditionExpression=Key("jobId").eq(job_id),
            )
            items = response.get("Items", [])
            if items:
                return items[0]
        except ClientError:
            logger.exception("jobId-index query failed for JobId=%s", job_id)

        scan = table.scan(FilterExpression=Attr("jobId").eq(job_id))
        items = scan.get("Items", [])
        if items:
            return items[0]

    return None


def handler(event, context):
    table = dynamodb.Table(get_required_env("JOBS_TABLE_NAME"))

    for record in event.get("Records", []):
        message = json.loads(record["Sns"]["Message"])
        job_id = message.get("JobId", "")
        status = message.get("Status", "")
        bucket, s3_key = parse_textract_document_location(message)

        logger.info(
            "Textract SNS callback | JobId=%s | Status=%s | Key=%s",
            job_id,
            status,
            s3_key,
        )

        item = _lookup_job(table, s3_key=s3_key, job_id=job_id)
        if not item:
            logger.error(
                "No DynamoDB job record found | JobId=%s | Key=%s",
                job_id,
                s3_key,
            )
            continue

        s3_key = item.get("s3Key", s3_key)
        task_token = item.get("taskToken")

        if not task_token:
            logger.error("No Step Functions task token stored for key=%s", s3_key)
            continue

        output = json.dumps(message)

        try:
            if status == "SUCCEEDED":
                sfn.send_task_success(taskToken=task_token, output=output)
                logger.info(
                    "Step Functions task resumed successfully | JobId=%s",
                    job_id,
                )
                continue

            error_message = f"Textract job ended with status {status}"
            table.update_item(
                Key={"s3Key": s3_key},
                UpdateExpression="SET #status = :status, errorMessage = :error, errorDetails = :details",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":status": "FAILED",
                    ":error": "Amazon Textract did not finish analyzing this PDF.",
                    ":details": {
                        "stage": "Amazon Textract",
                        "errorType": "TextractJobFailed",
                        "errorMessage": error_message,
                        "jobId": job_id,
                    },
                },
            )
            sfn.send_task_failure(
                taskToken=task_token,
                error="TextractJobFailed",
                cause=error_message,
            )
            logger.warning(
                "Step Functions task failed | JobId=%s | %s",
                job_id,
                error_message,
            )
        except ClientError:
            logger.exception(
                "Failed to resume Step Functions | JobId=%s | Key=%s",
                job_id,
                s3_key,
            )
            raise

    return {"status": "processed"}
