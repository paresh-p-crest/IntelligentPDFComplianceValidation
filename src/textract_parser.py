"""Parse Textract blocks into page text, forms, and query answers."""

from __future__ import annotations

from typing import Any


def _block_map(blocks: list[dict]) -> dict[str, dict]:
    return {block["Id"]: block for block in blocks}


def _child_text(block: dict, blocks_by_id: dict[str, dict]) -> str:
    text_parts: list[str] = []
    for relationship in block.get("Relationships", []):
        if relationship["Type"] != "CHILD":
            continue
        for child_id in relationship["Ids"]:
            child = blocks_by_id[child_id]
            if child["BlockType"] == "WORD":
                text_parts.append(child.get("Text", ""))
            elif child["BlockType"] == "SELECTION_ELEMENT":
                if child.get("SelectionStatus") == "SELECTED":
                    text_parts.append("X")
    return " ".join(part for part in text_parts if part).strip()


def group_lines_by_page(blocks: list[dict]) -> dict[int, list[str]]:
    pages: dict[int, list[str]] = {}
    for block in blocks:
        if block.get("BlockType") != "LINE":
            continue
        page = int(block.get("Page", 1))
        pages.setdefault(page, []).append(block.get("Text", ""))
    return pages


def extract_key_value_pairs(blocks: list[dict]) -> list[dict[str, Any]]:
    blocks_by_id = _block_map(blocks)
    pairs: list[dict[str, Any]] = []

    for block in blocks:
        if block.get("BlockType") != "KEY_VALUE_SET":
            continue
        if "KEY" not in block.get("EntityTypes", []):
            continue

        key_text = ""
        value_text = ""
        value_page = int(block.get("Page", 1))

        for relationship in block.get("Relationships", []):
            if relationship["Type"] != "CHILD":
                continue
            for child_id in relationship["Ids"]:
                child = blocks_by_id.get(child_id)
                if not child:
                    continue
                if child.get("BlockType") == "KEY_VALUE_SET" and "VALUE" in child.get(
                    "EntityTypes", []
                ):
                    value_text = _child_text(child, blocks_by_id)
                    value_page = int(child.get("Page", value_page))
                elif child.get("BlockType") == "KEY_VALUE_SET" and "KEY" in child.get(
                    "EntityTypes", []
                ):
                    key_text = _child_text(child, blocks_by_id)

        if not key_text:
            key_text = _child_text(block, blocks_by_id)

        if key_text:
            pairs.append(
                {
                    "field": key_text,
                    "value": value_text,
                    "page": value_page,
                }
            )

    return pairs


def extract_query_answers(blocks: list[dict]) -> list[dict[str, Any]]:
    blocks_by_id = _block_map(blocks)
    answers: list[dict[str, Any]] = []

    for block in blocks:
        if block.get("BlockType") != "QUERY":
            continue

        alias = block.get("Query", {}).get("Alias") or block.get("Query", {}).get("Text", "")
        answer_text = ""
        confidence = 0.0

        for relationship in block.get("Relationships", []):
            if relationship["Type"] != "ANSWER":
                continue
            for answer_id in relationship["Ids"]:
                answer_block = blocks_by_id.get(answer_id)
                if not answer_block:
                    continue
                answer_text = _child_text(answer_block, blocks_by_id)
                confidence = float(answer_block.get("Confidence", 0.0))

        answers.append(
            {
                "alias": alias,
                "answer": answer_text,
                "confidence": round(confidence, 2),
                "page": int(block.get("Page", 1)),
            }
        )

    return answers
