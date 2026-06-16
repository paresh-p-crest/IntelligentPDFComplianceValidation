"""Lambda handler: validate stored AWS credentials via STS."""

import logging
import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from common import api_response
from settings_store import load_settings

logger = logging.getLogger()
logger.setLevel(logging.INFO)

EXPIRED_CODES = {"ExpiredToken", "InvalidToken", "TokenRefreshRequired"}


def _validate_credentials(aws_config: dict) -> dict:
    access_key = (aws_config.get("accessKeyId") or "").strip()
    secret_key = (aws_config.get("secretAccessKey") or "").strip()
    session_token = (aws_config.get("sessionToken") or "").strip() or None

    if not access_key or not secret_key:
        return {
            "valid": False,
            "reason": "missing",
            "message": "AWS Access Key ID and Secret Access Key are required.",
        }

    try:
        client = boto3.client(
            "sts",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=session_token,
        )
        identity = client.get_caller_identity()
        return {
            "valid": True,
            "reason": "ok",
            "message": "AWS credentials are valid.",
            "account": identity.get("Account"),
            "arn": identity.get("Arn"),
        }
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code", "")
        logger.warning("AWS credential validation failed | Code=%s", code)
        if code in EXPIRED_CODES:
            return {
                "valid": False,
                "reason": "expired",
                "message": "AWS session token has expired. Update credentials in AWS Config.",
            }
        return {
            "valid": False,
            "reason": "invalid",
            "message": error.response.get("Error", {}).get("Message")
            or "AWS credentials are invalid.",
        }
    except BotoCoreError as error:
        logger.warning("AWS credential validation error | %s", error)
        return {
            "valid": False,
            "reason": "invalid",
            "message": str(error),
        }


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    table_name = os.environ.get("SETTINGS_TABLE_NAME")
    if not table_name:
        return api_response(500, {"error": "SETTINGS_TABLE_NAME is not configured"})

    settings = load_settings(table_name)
    result = _validate_credentials(settings.get("awsConfig", {}))
    logger.info("AWS config validation | Valid=%s Reason=%s", result["valid"], result["reason"])
    return api_response(200, result)
