"""Default compliance rules and application configuration."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone

SETTINGS_KEY = "APP"
RULES_VERSION = "1.0.0"


def get_default_settings() -> dict:
    return deepcopy(
        {
            "configKey": SETTINGS_KEY,
            "rulesVersion": RULES_VERSION,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "rules": [
                {
                    "id": "signature-verification",
                    "name": "Signature Verification",
                    "category": "MISSING_SIGNATURE",
                    "enabled": True,
                    "severity": "HIGH",
                    "detail": "Checks signature blocks across the document",
                    "fieldHints": [
                        "signature",
                        "hold point witness",
                        "mta c&d",
                        "pmc hold point",
                        "quality staff / quality manager",
                    ],
                },
                {
                    "id": "status-exception-detection",
                    "name": "Status Exception Detection",
                    "category": "STATUS_EXCEPTION",
                    "enabled": True,
                    "severity": "MEDIUM",
                    "detail": "Flags quality status outside approved values",
                    "fieldHints": ["quality status"],
                    "statusValues": ["in review"],
                },
                {
                    "id": "mandatory-field-completeness",
                    "name": "Mandatory Field Completeness",
                    "category": "MISSING_INFO",
                    "enabled": True,
                    "severity": "MEDIUM",
                    "detail": "Checks required DQR metadata and form fields",
                    "fieldHints": [
                        "prepared by",
                        "inspector's name",
                        "inspector name",
                        "inspection date",
                        "date / time",
                        "date/time",
                        "attachments",
                    ],
                },
                {
                    "id": "human-review-queue",
                    "name": "Human Review Queue",
                    "category": "WORKFLOW",
                    "enabled": True,
                    "severity": "MEDIUM",
                    "detail": "Routes exceptions for reviewer decision",
                },
            ],
            "appConfig": {
                "pollIntervalMs": 5000,
                "maxHistoryItems": 25,
                "missingInfoPageMinChecklist": 34,
                "statusScanEnabled": True,
                "ignoreElectronicSignatureLines": True,
            },
            "awsConfig": {
                "accessKeyId": "",
                "secretAccessKey": "",
                "sessionToken": "",
            },
        }
    )


def normalize_settings(raw: dict | None) -> dict:
    defaults = get_default_settings()
    if not raw:
        return defaults

    merged = deepcopy(defaults)
    merged["rulesVersion"] = raw.get("rulesVersion") or defaults["rulesVersion"]
    merged["updatedAt"] = raw.get("updatedAt") or defaults["updatedAt"]

    if raw.get("rules"):
        merged["rules"] = raw["rules"]

    if raw.get("appConfig"):
        merged["appConfig"] = {**defaults["appConfig"], **raw["appConfig"]}

    if raw.get("awsConfig"):
        merged["awsConfig"] = {**defaults["awsConfig"], **raw["awsConfig"]}

    return merged
