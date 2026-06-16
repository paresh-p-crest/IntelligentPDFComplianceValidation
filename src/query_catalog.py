"""Textract query definitions with professional labels."""

from __future__ import annotations

from typing import Any

QUERY_CATALOG: dict[str, dict[str, str]] = {
    "reportNumber": {
        "label": "Report Number",
        "question": "What is the Report Number?",
    },
    "qualityManager": {
        "label": "Quality Manager",
        "question": "Who is the Quality Manager?",
    },
    "page42Signature": {
        "label": "Missing Signatures on Page 42",
        "question": "Are the required signatures present on page 42?",
    },
    # Legacy aliases from earlier deployments
    "report_number": {
        "label": "Report Number",
        "question": "What is the Report Number?",
    },
    "quality_manager": {
        "label": "Quality Manager",
        "question": "Who is the Quality Manager?",
    },
    "page_42_signature": {
        "label": "Missing Signatures on Page 42",
        "question": "Are the required signatures present on page 42?",
    },
}

DEMO_QUERIES = [
    {"Text": meta["question"], "Alias": alias}
    for alias, meta in QUERY_CATALOG.items()
    if alias in {"reportNumber", "qualityManager", "page42Signature"}
]


def humanize_alias(alias: str) -> str:
    return alias.replace("_", " ").replace("-", " ").title()


def enrich_query_answers(answers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []

    for answer in answers:
        alias = answer.get("alias", "")
        catalog = QUERY_CATALOG.get(alias, {})
        enriched.append(
            {
                **answer,
                "label": catalog.get("label") or humanize_alias(alias),
                "question": catalog.get("question", ""),
                "displayValue": answer.get("answer") or "Not detected",
            }
        )

    return enriched
