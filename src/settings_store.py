"""Load and persist application settings from DynamoDB."""

from __future__ import annotations

from datetime import datetime, timezone

import boto3

from default_settings import SETTINGS_KEY, get_default_settings, normalize_settings

dynamodb = boto3.resource("dynamodb")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_settings(table_name: str) -> dict:
    table = dynamodb.Table(table_name)
    result = table.get_item(Key={"configKey": SETTINGS_KEY})
    item = result.get("Item")

    if not item:
        return save_settings(table_name, get_default_settings())

    return normalize_settings(item)


def save_settings(table_name: str, payload: dict) -> dict:
    table = dynamodb.Table(table_name)
    settings = normalize_settings(payload)
    settings["configKey"] = SETTINGS_KEY
    settings["updatedAt"] = _now_iso()

    table.put_item(Item=settings)
    return settings
