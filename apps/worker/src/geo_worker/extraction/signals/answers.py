"""Direct answerability (§38) — replaces V1's "has an FAQ page" credit.

Counts actual answer structures: FAQPage JSON-LD (Question + acceptedAnswer),
<details><summary>, and question headings (ending '?') that are followed by
substantive content. An empty /faq page scores zero.
"""

from __future__ import annotations

from collections.abc import Iterable

from selectolax.parser import Node

_QUESTION_HEADINGS = "h2, h3, h4"


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
        if text.endswith("?") and len(text) > 8:
            sibling = heading.next
            while sibling is not None and sibling.tag in (None, "-text"):
                sibling = sibling.next
            if sibling is not None and len((sibling.text(strip=True) or "").strip()) >= 20:
                count += 1

    return count
