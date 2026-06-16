"""Shared helpers for Lambda handlers."""

import json
import os
import urllib.parse
from decimal import Decimal

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}


def get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def api_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=_json_default),
    }


def parse_textract_document_location(message: dict) -> tuple[str, str]:
    """
    Extract bucket and key from a Textract SNS / Step Functions completion message.

    Textract may send either:
    - DocumentLocation.S3Object.{Bucket,Name}
    - DocumentLocation.{S3Bucket,S3ObjectName}
    """
    location = message.get("DocumentLocation", {})

    s3_object = location.get("S3Object", {})
    bucket = s3_object.get("Bucket") or location.get("S3Bucket", "")
    s3_key = s3_object.get("Name") or location.get("S3ObjectName", "")

    return bucket, urllib.parse.unquote_plus(s3_key or "")


def document_name_from_key(s3_key: str) -> str:
    if not s3_key:
        return ""
    return urllib.parse.unquote_plus(s3_key.split("/")[-1])


def to_dynamo_value(value):
    """Recursively convert floats to Decimal for DynamoDB put/update operations."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: to_dynamo_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_dynamo_value(item) for item in value]
    return value


def _json_default(value):
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    raise TypeError(f"Object of type {type(value)} is not JSON serializable")
