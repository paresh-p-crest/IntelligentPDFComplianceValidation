"""Lambda handler: save compliance rules and app configuration."""

import json
import logging
import os

from common import api_response
from settings_store import save_settings

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    table_name = os.environ.get("SETTINGS_TABLE_NAME")
    if not table_name:
        return api_response(500, {"error": "SETTINGS_TABLE_NAME is not configured"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return api_response(400, {"error": "Invalid JSON body"})

    if not body.get("rules"):
        return api_response(400, {"error": "rules array is required"})

    settings = save_settings(table_name, body)
    logger.info("Settings updated | Rules=%s", len(settings.get("rules", [])))
    return api_response(200, settings)
