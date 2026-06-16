"""Tests for DQR compliance rule engine."""

from rule_engine import run_phase1_rules


def _signature_pages(findings):
    return sorted(
        {
            finding["page"]
            for finding in findings
            if finding["type"] == "MISSING_SIGNATURE"
        }
    )


def _signature_fields(findings, page):
    return [
        finding["field"]
        for finding in findings
        if finding["type"] == "MISSING_SIGNATURE" and finding["page"] == page
    ]


def test_dqr_signature_pages_42_and_46():
    pages = {
        42: [
            "4.2 Quality Staff / Quality Manager: Signature No Response",
            "MTA C&D/PMC Hold Point Witness: Signature No Response",
        ],
        46: [
            "Quality Staff / Quality Manager: Signature No Response",
            "MTA C&D/PMC Hold Point Witness: Signature No Response",
        ],
    }
    key_value_pairs = [
        {
            "field": "4.2 Quality Staff / Quality Manager: Signature",
            "value": "No Response",
            "page": 42,
        },
        {
            "field": "MTA C&D/PMC Hold Point Witness: Signature",
            "value": "No Response",
            "page": 42,
        },
        {
            "field": "Quality Staff / Quality Manager: Signature",
            "value": "No Response",
            "page": 46,
        },
        {
            "field": "MTA C&D/PMC Hold Point Witness: Signature",
            "value": "No Response",
            "page": 46,
        },
    ]

    findings = run_phase1_rules(pages, key_value_pairs, [], page_count=51)

    assert _signature_pages(findings) == [42, 46]
    assert len([f for f in findings if f["type"] == "MISSING_SIGNATURE"]) >= 4
    assert any("hold point" in f["field"].lower() for f in findings)


def test_status_exception_on_review_pages():
    pages = {
        43: ["Section Quality Status In Review"],
        47: ["Quality Status In Review"],
    }
    key_value_pairs = [
        {"field": "Quality Status", "value": "In Review", "page": 43},
        {"field": "Quality Status", "value": "In Review", "page": 47},
    ]

    findings = run_phase1_rules(pages, key_value_pairs, [], page_count=51)
    status_pages = sorted(
        finding["page"] for finding in findings if finding["type"] == "STATUS_EXCEPTION"
    )

    assert status_pages == [43, 47]


def test_ignores_electronic_inspection_signature_lines():
    pages = {
        10: [
            "Inspection Signatures for Concrete Pour signed on 01/04/2026 by John Smith",
        ],
        42: ["Quality Staff / Quality Manager: Signature No Response"],
    }

    findings = run_phase1_rules(pages, [], [], page_count=51)
    signatures = [f for f in findings if f["type"] == "MISSING_SIGNATURE"]

    assert len(signatures) == 1
    assert signatures[0]["page"] == 42


def test_skips_photo_pages_for_missing_info_noise():
    pages = {5: ["Photo attachment"], 12: ["Image only page"]}
    key_value_pairs = [
        {"field": "Inspector's Name:", "value": "", "page": 5},
        {"field": "Prepared by:", "value": "", "page": 12},
    ]

    findings = run_phase1_rules(pages, key_value_pairs, [], page_count=51)
    missing_info = [f for f in findings if f["type"] == "MISSING_INFO"]

    assert missing_info == []


def test_missing_info_on_cover_and_checklist_pages():
    key_value_pairs = [
        {"field": "Prepared by:", "value": "", "page": 1},
        {"field": "Inspector's Name:", "value": "", "page": 40},
    ]

    findings = run_phase1_rules({1: ["Daily Quality Report"]}, key_value_pairs, [], page_count=51)
    fields = [f["field"] for f in findings if f["type"] == "MISSING_INFO"]

    assert "Prepared by:" in fields
    assert "Inspector's Name:" in fields
