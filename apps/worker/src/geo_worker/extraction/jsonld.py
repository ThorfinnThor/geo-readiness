"""Safe JSON-LD extraction.

Untrusted input: malformed JSON is skipped (never raised), and hard caps guard
against oversized / deeply nested "JSON-LD bomb" payloads (§44 security tests).
"""

from __future__ import annotations

import json

from selectolax.parser import HTMLParser

# Caps to bound work on hostile input.
MAX_BLOCKS = 50
MAX_BLOCK_CHARS = 512_000


def extract_jsonld(tree: HTMLParser) -> list[dict]:
    """Return parsed JSON-LD objects from <script type=application/ld+json>.

    Each block may contain a dict or a list of dicts; both are flattened into a
    flat list of dicts. Invalid or oversized blocks are skipped silently.
    """
    out: list[dict] = []
    nodes = tree.css('script[type="application/ld+json"]')
    for node in nodes[:MAX_BLOCKS]:
        raw = node.text(deep=True, strip=False)
        if not raw or len(raw) > MAX_BLOCK_CHARS:
            continue
        try:
            parsed = json.loads(raw)
        except (ValueError, RecursionError):
            continue
        for obj in _iter_objects(parsed):
            out.append(obj)
    return out


def _iter_objects(value: object):
    """Yield dict objects from a JSON-LD value (dict, list, or @graph)."""
    if isinstance(value, dict):
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                if isinstance(item, dict):
                    yield item
        else:
            yield value
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                yield item
