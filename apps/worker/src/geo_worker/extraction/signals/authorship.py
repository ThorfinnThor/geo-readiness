"""Author / responsibility extraction (§33).

Deterministic sources only: JSON-LD Article/BlogPosting author, meta[name=author],
rel=author. No prose byline guessing.
"""

from __future__ import annotations

from collections.abc import Iterable

from selectolax.parser import HTMLParser

_ARTICLE_MARKERS = ("article", "blogposting", "newsarticle", "report")


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


def extract_authors(tree: HTMLParser, json_ld: list[dict]) -> tuple[list[str], bool]:
    names: list[str] = []
    org_present = False

    for node in json_ld:
        if not any(m in t for t in _types(node) for m in _ARTICLE_MARKERS):
            continue
        for author in _iter(node.get("author")):
            if isinstance(author, dict):
                name = author.get("name")
                if isinstance(name, str) and name.strip():
                    names.append(name.strip())
                atype = author.get("@type")
                if isinstance(atype, str) and "organization" in atype.lower():
                    org_present = True
            elif isinstance(author, str) and author.strip():
                names.append(author.strip())

    meta = tree.css_first('meta[name="author"]')
    if meta is not None:
        content = meta.attributes.get("content")
        if content and content.strip():
            names.append(content.strip())

    rel = tree.css_first('a[rel="author"], link[rel="author"]')
    if rel is not None:
        text = (rel.text(strip=True) or rel.attributes.get("title") or "").strip()
        if text:
            names.append(text)

    # Deduplicate, preserve first-seen order.
    seen: dict[str, None] = {}
    for n in names:
        seen.setdefault(n, None)
    return list(seen), org_present
