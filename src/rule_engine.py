"""Enterprise-style compliance rules for Crosstown Partners DQR documents."""

from __future__ import annotations

import re
from typing import Any

from default_settings import get_default_settings, normalize_settings

DEFAULT_MISSING_VALUES = {"", "-", "n/a", "no response", "none", "blank"}


def is_missing_value(value: str | None, missing_values: tuple[str, ...] | None = None) -> bool:
    allowed = set(missing_values or DEFAULT_MISSING_VALUES)
    return _normalize(value) in allowed


def _resolve_config(settings: dict | None) -> dict:
    normalized = normalize_settings(settings)
    app_config = normalized["appConfig"]
    rules = normalized["rules"]

    def enabled(category: str) -> bool:
        matches = [rule for rule in rules if rule.get("category") == category]
        if not matches:
            return True
        return any(rule.get("enabled", True) for rule in matches)

    def hints(category: str, fallback: tuple[str, ...]) -> tuple[str, ...]:
        collected: list[str] = []
        for rule in rules:
            if rule.get("category") == category and rule.get("enabled", True):
                collected.extend(rule.get("fieldHints", []))
        return tuple(collected) if collected else fallback

    defaults = get_default_settings()
    default_signature = next(
        rule["fieldHints"]
        for rule in defaults["rules"]
        if rule["category"] == "MISSING_SIGNATURE"
    )
    default_missing_info = next(
        rule["fieldHints"]
        for rule in defaults["rules"]
        if rule["category"] == "MISSING_INFO"
    )
    default_status_rule = next(
        rule for rule in defaults["rules"] if rule["category"] == "STATUS_EXCEPTION"
    )

    status_values = []
    for rule in rules:
        if rule.get("category") == "STATUS_EXCEPTION" and rule.get("enabled", True):
            status_values.extend(rule.get("statusValues", []))
    if not status_values:
        status_values = default_status_rule.get("statusValues", ["in review"])

    human_review_enabled = any(
        rule.get("enabled", True)
        for rule in rules
        if rule.get("category") == "WORKFLOW"
    )

    return {
        "enabled_signature": enabled("MISSING_SIGNATURE"),
        "enabled_status": enabled("STATUS_EXCEPTION"),
        "enabled_missing_info": enabled("MISSING_INFO"),
        "human_review_enabled": human_review_enabled,
        "signature_hints": hints("MISSING_SIGNATURE", tuple(default_signature)),
        "missing_info_hints": hints("MISSING_INFO", tuple(default_missing_info)),
        "status_field_hints": hints("STATUS_EXCEPTION", ("quality status",)),
        "status_values": tuple(value.lower() for value in status_values),
        "missing_info_page_min": int(app_config.get("missingInfoPageMinChecklist", 34)),
        "ignore_electronic_lines": bool(app_config.get("ignoreElectronicSignatureLines", True)),
        "status_scan_enabled": bool(app_config.get("statusScanEnabled", True)),
    }


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def _normalize_field_name(field: str) -> str:
    cleaned = re.sub(r"^\d+(\.\d+)?\s*", "", field or "")
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def _next_finding_id() -> int:
    if not hasattr(_next_finding_id, "counter"):
        _next_finding_id.counter = 0
    _next_finding_id.counter += 1
    return _next_finding_id.counter


SOURCE_LABELS = {
    "TEXTRACT_FORMS": "Textract Forms",
    "TEXTRACT_LINES": "Textract Lines",
    "TEXTRACT_QUERIES": "Textract Queries",
}


def _evidence(value: str, source: str) -> str:
    display = value if value else "(blank)"
    source_label = SOURCE_LABELS.get(source, source.replace("_", " "))
    return f"'{display}' from {source_label}"


def _build_description(finding_type: str, field: str, page: int, value: str) -> str:
    field_lower = field.lower()
    if finding_type == "MISSING_SIGNATURE":
        if "hold point" in field_lower or "witness" in field_lower:
            return (
                "The MTA C&D/PMC Hold Point Witness signature block is blank or "
                "shows 'No Response'."
            )
        if "quality staff" in field_lower or "quality manager" in field_lower:
            return (
                "The entire Quality Staff / Quality Manager block — printed name, "
                "date, and signature — is blank."
            )
        return (
            f"The signature block for '{field}' on page {page} is missing or "
            f"shows '{value or 'No Response'}'."
        )
    if finding_type == "STATUS_EXCEPTION":
        return (
            f"Quality status on page {page} is '{value}'. "
            "The package is still marked In Review."
        )
    return f"Required field '{field}' on page {page} is blank or incomplete."


def _build_recommendation(finding_type: str, field: str) -> str:
    if finding_type == "MISSING_SIGNATURE":
        if "hold point" in field.lower() or "witness" in field.lower():
            return "Obtain the Hold Point Witness signature before acceptance."
        return "Obtain the Quality Manager signature and date before acceptance."
    if finding_type == "STATUS_EXCEPTION":
        return "Resolve the status exception or obtain Quality Manager approval."
    return f"Complete '{field}' with valid information before submission."


def _enrich_finding(kwargs: dict[str, Any]) -> dict[str, Any]:
    finding_type = kwargs["type"]
    field = kwargs.get("field", "")
    page = int(kwargs.get("page", 1))
    value = kwargs.get("value", "")
    kwargs["description"] = _build_description(finding_type, field, page, value)
    kwargs["recommendation"] = _build_recommendation(finding_type, field)
    return kwargs


def _is_quality_status_field(field: str, hints: tuple[str, ...]) -> bool:
    field_lower = field.lower()
    return any(hint in field_lower for hint in hints)


def _is_missing_info_page(page: int, page_min: int) -> bool:
    return page == 1 or page >= page_min


def _matches_missing_info_field(field: str, hints: tuple[str, ...]) -> bool:
    field_lower = field.lower().strip()
    return any(hint in field_lower for hint in hints)


def _is_form_signature_field(field: str, hints: tuple[str, ...]) -> bool:
    field_lower = field.lower()
    return any(hint in field_lower for hint in hints)


def _is_electronic_signature_line(line: str) -> bool:
    line_lower = line.lower()
    if "signed on" in line_lower:
        return True
    if "inspection signature" in line_lower and "signed" in line_lower:
        return True
    return False


def _line_indicates_missing_signature(line: str) -> bool:
    if _is_electronic_signature_line(line):
        return False

    line_lower = line.lower()
    if "signature" not in line_lower:
        return False
    if "no response" in line_lower:
        return True
    return _line_has_blank_signature(line)


def run_phase1_rules(
    pages: dict[int, list[str]],
    key_value_pairs: list[dict[str, Any]],
    query_answers: list[dict[str, Any]],
    page_count: int | None = None,
    settings: dict | None = None,
) -> list[dict[str, Any]]:
    """Generate audit findings with enterprise categories and evidence strings."""
    config = _resolve_config(settings)
    _next_finding_id.counter = 0
    findings: list[dict[str, Any]] = []
    seen: set[tuple] = set()

    def add_finding(**kwargs: Any) -> None:
        dedupe_key = (
            kwargs.get("type"),
            kwargs.get("page"),
            _normalize_field_name(kwargs.get("field", "")),
        )
        if dedupe_key in seen:
            return
        seen.add(dedupe_key)
        findings.append({"id": _next_finding_id(), **_enrich_finding(kwargs)})

    if config["enabled_signature"]:
        for page_num, lines in pages.items():
            for line in lines:
                if config["ignore_electronic_lines"] and _is_electronic_signature_line(line):
                    continue
                if not _line_indicates_missing_signature(line):
                    continue
                add_finding(
                    type="MISSING_SIGNATURE",
                    page=page_num,
                    field=_extract_signature_field(line),
                    value="No Response",
                    severity="HIGH",
                    confidence=0.99,
                    source="TEXTRACT_LINES",
                    evidence=_evidence("No Response", "TEXTRACT_LINES"),
                )

    for pair in key_value_pairs:
        field = pair.get("field", "")
        value = (pair.get("value") or "").strip()
        page = int(pair.get("page", 1))

        if config["enabled_signature"] and _is_form_signature_field(
            field, config["signature_hints"]
        ):
            if is_missing_value(value) or "no response" in value.lower():
                add_finding(
                    type="MISSING_SIGNATURE",
                    page=page,
                    field=field,
                    value=value or "No Response",
                    severity="HIGH",
                    confidence=0.98,
                    source="TEXTRACT_FORMS",
                    evidence=_evidence(value or "No Response", "TEXTRACT_FORMS"),
                )
            continue

        if config["enabled_status"] and _is_quality_status_field(
            field, config["status_field_hints"]
        ):
            if any(status in value.lower() for status in config["status_values"]):
                add_finding(
                    type="STATUS_EXCEPTION",
                    page=page,
                    field=field,
                    value=value,
                    severity="MEDIUM",
                    confidence=0.97,
                    source="TEXTRACT_FORMS",
                    evidence=_evidence(value, "TEXTRACT_FORMS"),
                )
            continue

        if config["enabled_missing_info"] and _is_missing_info_page(
            page, config["missing_info_page_min"]
        ) and _matches_missing_info_field(field, config["missing_info_hints"]):
            if is_missing_value(value):
                add_finding(
                    type="MISSING_INFO",
                    page=page,
                    field=field,
                    value="(blank)",
                    severity="MEDIUM",
                    confidence=0.96,
                    source="TEXTRACT_FORMS",
                    evidence=_evidence("(blank)", "TEXTRACT_FORMS"),
                )

    if config["enabled_status"] and config["status_scan_enabled"]:
        for page_num, lines in pages.items():
            joined_lower = " ".join(lines).lower()
            if not any(hint in joined_lower for hint in config["status_field_hints"]):
                continue
            if not any(status in joined_lower for status in config["status_values"]):
                continue
            if not _page_has_status_finding(findings, page_num):
                add_finding(
                    type="STATUS_EXCEPTION",
                    page=page_num,
                    field="Quality Status",
                    value="In Review",
                    severity="MEDIUM",
                    confidence=0.95,
                    source="TEXTRACT_LINES",
                    evidence=_evidence("In Review", "TEXTRACT_LINES"),
                )

    if config["enabled_missing_info"]:
        for answer in query_answers:
            alias = answer.get("alias", "")
            text = (answer.get("answer") or "").strip()
            confidence = float(answer.get("confidence", 0.0))

            if alias in {"qualityManager", "quality_manager"} and is_missing_value(text):
                page = int(answer.get("page", 1))
                if _is_missing_info_page(page, config["missing_info_page_min"]):
                    add_finding(
                        type="MISSING_INFO",
                        page=page,
                        field="Quality Manager",
                        value="(blank)",
                        severity="MEDIUM",
                        confidence=max(0.8, confidence / 100),
                        source="TEXTRACT_QUERIES",
                        evidence=_evidence("(blank)", "TEXTRACT_QUERIES"),
                    )

    findings.sort(key=lambda item: (item["page"], item["type"], item["field"]))
    return findings


def build_validation_summary(
    findings: list[dict[str, Any]],
    page_count: int,
    settings: dict | None = None,
) -> dict[str, Any]:
    config = _resolve_config(settings)
    missing_signatures = sum(1 for item in findings if item["type"] == "MISSING_SIGNATURE")
    status_exceptions = sum(1 for item in findings if item["type"] == "STATUS_EXCEPTION")
    missing_info = sum(1 for item in findings if item["type"] == "MISSING_INFO")
    low_confidence = any(float(item.get("confidence", 1)) < 0.7 for item in findings)

    if not findings:
        overall = "VALIDATED"
    elif missing_signatures or status_exceptions:
        overall = "VALIDATED_WITH_EXCEPTIONS"
    else:
        overall = "VALIDATED_WITH_WARNINGS"

    human_review_required = (
        config["human_review_enabled"] and (low_confidence or len(findings) > 0)
    )

    return {
        "overallStatus": overall,
        "missingSignatures": missing_signatures,
        "statusExceptions": status_exceptions,
        "missingInfo": missing_info,
        "pagesProcessed": page_count,
        "totalFindings": len(findings),
        "humanReviewRequired": human_review_required,
        "humanReviewStatus": "PENDING" if human_review_required else "NOT_REQUIRED",
        "rulesVersion": normalize_settings(settings).get("rulesVersion", ""),
    }


def _page_has_status_finding(findings: list[dict[str, Any]], page: int) -> bool:
    return any(
        item["type"] == "STATUS_EXCEPTION" and item["page"] == page for item in findings
    )


def _line_has_blank_signature(line: str) -> bool:
    if ":" not in line:
        return False
    _, _, value = line.partition(":")
    return is_missing_value(value)


def _extract_signature_field(line: str) -> str:
    cleaned = line.strip()
    if ":" in cleaned:
        return cleaned.split(":", 1)[0].strip()
    return "Signature"
