"""Stable content hashing.

The hash is over normalized, content-bearing signals so the same page snapshot
always yields the same hash (§33 determinism) and superficial byte differences
(attribute order, whitespace) do not change it.
"""

from __future__ import annotations

import hashlib
import json

from .types import ExtractedPage


def content_hash(page: ExtractedPage) -> str:
    """Deterministic sha256 over the page's normalized content signals."""
    signal = {
        "title": page.title or "",
        "meta_description": page.meta_description or "",
        "canonical_url": page.canonical_url or "",
        "h1": page.h1 or "",
        "headings": page.headings,
        "visible_text": page.visible_text,
        "json_ld": page.json_ld,
    }
    serialized = json.dumps(
        signal, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
