"""Extract top-level document metadata from Textract output."""

from __future__ import annotations

import re
from typing import Any

from rule_engine import is_missing_value


def extract_document_metadata(
    pages: dict[int, list[str]],
    key_value_pairs: list[dict[str, Any]],
    query_answers: list[dict[str, Any]],
) -> dict[str, str]:
    metadata = {
        "projectNumber": "",
        "reportDate": "",
        "reportNumber": "",
        "lotId": "",
        "preparedBy": "",
        "documentType": "DQR",
    }

    for pair in key_value_pairs:
        field = pair.get("field", "")
        field_lower = field.lower()
        value = (pair.get("value") or "").strip()
        if is_missing_value(value):
            continue

        if "project" in field_lower and "no" in field_lower:
            metadata["projectNumber"] = value
        elif "report no" in field_lower or field_lower == "report number":
            metadata["reportNumber"] = value
            metadata["lotId"] = value
        elif field_lower in {"date", "report date"} or "inspection date" in field_lower:
            metadata["reportDate"] = value
        elif "prepared by" in field_lower:
            metadata["preparedBy"] = value

    for answer in query_answers:
        alias = answer.get("alias", "")
        text = (answer.get("answer") or "").strip()
        if alias in {"reportNumber", "report_number"} and text:
            metadata["reportNumber"] = text
            metadata["lotId"] = text

    page_one_text = " ".join(pages.get(1, []))
    report_match = re.search(r"DQR-[A-Z0-9-]+", page_one_text)
    if report_match:
        if not metadata["reportNumber"]:
            metadata["reportNumber"] = report_match.group()
        if not metadata["lotId"]:
            metadata["lotId"] = report_match.group()

    project_match = re.search(r"Project\s*No[.:]?\s*(\d+)", page_one_text, re.IGNORECASE)
    if project_match and not metadata["projectNumber"]:
        metadata["projectNumber"] = project_match.group(1)

    return metadata
