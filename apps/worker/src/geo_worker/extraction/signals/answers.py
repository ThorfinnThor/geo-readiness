"""Direct answerability (§38) — replaces V1's "has an FAQ page" credit.

Counts actual answer structures: FAQPage JSON-LD (Question + acceptedAnswer),
<details><summary>, and question headings (ending '?') that are followed by
substantive content. An empty /faq page scores zero.
"""

from __future__ import annotations

from collections.abc import Iterable

from selectolax.parser import Node

_QUESTION_HEADINGS = "h2, h3, h4"
_HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}


def _iter(value: object) -> Iterable:
    if isinstance(value, list):
        yield from value
    elif value is not None:
        yield value


def _types(node: dict) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t.lower()]
    if isinstance(t, list):
        return [x.lower() for x in t if isinstance(x, str)]
    return []


def extract_answers(main: Node, json_ld: list[dict]) -> int:
    count = 0

    for node in json_ld:
        types = _types(node)
        if "faqpage" in types:
            for q in _iter(node.get("mainEntity")):
                if isinstance(q, dict) and q.get("acceptedAnswer"):
                    count += 1
        elif "question" in types and node.get("acceptedAnswer"):
            count += 1

    if count:
        return count

    # Structural fallbacks in the main content.
    count += len(main.css("details"))

    for heading in main.css(_QUESTION_HEADINGS):
        text = " ".join((heading.text(strip=True) or "").split())
        if not (text.endswith("?") and len(text) > 8):
            continue
        # The answer is the content after the question up to the next heading.
        # Check the heading's own following siblings first, then its parent's
        # (a common pattern: the heading sits in a wrapper and the answer is the
        # next wrapper). Requiring real substance keeps a bare question at zero.
        answer_len = _answer_len_after(heading)
        if answer_len < _ANSWER_MIN and heading.parent is not None:
            answer_len = _answer_len_after(heading.parent)
        if answer_len >= _ANSWER_MIN:
            count += 1

    return count


_ANSWER_MIN = 40


def _answer_len_after(node: Node) -> int:
    """Total text length of the following siblings of `node`, up to the next
    heading — the material that answers a preceding question heading."""
    total = 0
    sibling = node.next
    while sibling is not None:
        if sibling.tag in _HEADING_TAGS:
            break
        if sibling.tag not in (None, "-text"):
            total += len((sibling.text(strip=True) or "").strip())
            if total >= _ANSWER_MIN:
                break
        sibling = sibling.next
    return total
