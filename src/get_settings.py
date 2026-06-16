"""Lambda handler: return compliance rules and app configuration."""

import logging
import os

from common import api_response
from settings_store import load_settings

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return api_response(200, {"ok": True})

    table_name = os.environ.get("SETTINGS_TABLE_NAME")
    if not table_name:
        return api_response(500, {"error": "SETTINGS_TABLE_NAME is not configured"})

    settings = load_settings(table_name)
    logger.info("Settings loaded | Rules=%s", len(settings.get("rules", [])))
    return api_response(200, settings)
