"""Date extraction + validation (§35–36).

Extraction captures raw dates deterministically. Validation against the scan's
pinned `as_of` (future / inconsistent) happens separately, because `as_of` is
resolved once at the pipeline level (§11), not during per-page extraction.
"""

from __future__ import annotations

import datetime as dt
import re

from selectolax.parser import HTMLParser

from ..types import PageSignals

_ISO = re.compile(r"(\d{4}-\d{2}-\d{2})")


def _parse(value: object) -> dt.date | None:
    if not isinstance(value, str):
        return None
    m = _ISO.match(value.strip())
    if not m:
        return None
    try:
        return dt.date.fromisoformat(m.group(1))
    except ValueError:
        return None


def _meta(tree: HTMLParser, prop: str) -> dt.date | None:
    el = tree.css_first(f'meta[property="{prop}"]')
    return _parse(el.attributes.get("content")) if el is not None else None


def extract_dates(
    tree: HTMLParser, json_ld: list[dict]
) -> tuple[dt.date | None, dt.date | None, dt.date | None, bool]:
    published: dt.date | None = None
    modified: dt.date | None = None
    for node in json_ld:
        published = published or _parse(node.get("datePublished"))
        modified = modified or _parse(node.get("dateModified"))

    published = published or _meta(tree, "article:published_time")
    modified = modified or _meta(tree, "article:modified_time")

    visible: dt.date | None = None
    time_el = tree.css_first("time[datetime]")
    if time_el is not None:
        visible = _parse(time_el.attributes.get("datetime"))

    inconsistent = bool(published and modified and modified < published)
    return published, modified, visible, inconsistent


def validate_page_dates(signals: PageSignals, as_of: dt.datetime) -> None:
    """Flag future dates against `as_of` (no exception, no freshness — §36)."""
    cutoff = as_of.date() + dt.timedelta(days=1)
    signals.invalid_future_date = any(
        d is not None and d > cutoff
        for d in (signals.date_published, signals.date_modified, signals.visible_date)
    )
