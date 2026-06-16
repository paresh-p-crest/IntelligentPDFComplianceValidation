"""Lambda handler: delete a job record from audit history."""

import logging
from urllib.parse import unquote_plus

import boto3

from common import api_response, get_required_env

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
    table.delete_item(Key={"s3Key": s3_key})

    logger.info("History item deleted | Key=%s", s3_key)

    return api_response(200, {"deleted": True, "s3Key": s3_key})
