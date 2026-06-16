"""Lambda handler: return a presigned S3 PUT URL for browser PDF uploads."""

import logging
import os
import uuid

import boto3

from common import api_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    bucket = os.environ.get("DOCUMENT_BUCKET_NAME")
    if not bucket:
        logger.error("DOCUMENT_BUCKET_NAME is not configured")
        return api_response(500, {"error": "Server configuration error"})

    params = event.get("queryStringParameters") or {}
    filename = (params.get("filename") or "document.pdf").strip()

    if not filename.lower().endswith(".pdf"):
        return api_response(400, {"error": "Only PDF files are allowed"})

    object_key = f"uploads/{uuid.uuid4()}/{filename}"

    upload_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket,
            "Key": object_key,
            "ContentType": "application/pdf",
        },
        ExpiresIn=3600,
    )

    logger.info("Generated presigned upload URL for key=%s", object_key)

    return api_response(
        200,
        {
            "uploadUrl": upload_url,
            "key": object_key,
            "bucket": bucket,
            "expiresIn": 3600,
        },
    )
