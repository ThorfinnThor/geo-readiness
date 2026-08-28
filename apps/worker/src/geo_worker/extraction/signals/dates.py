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
_DMY = re.compile(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$")
# A freshness date only counts when it carries an explicit update/checked label,
# so a bare copyright year ("© 2026") is never read as freshness. DE + EN labels.
_LABELED_DATE = re.compile(
    r"(?:stand|zuletzt aktualisiert|letzte aktualisierung|aktualisiert(?:\s+am)?|"
    r"gepr(?:ü|ue)ft(?:\s+am)?|last updated|updated|last reviewed|reviewed)"
    r"\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)


def _parse(value: object) -> dt.date | None:
    if not isinstance(value, str):
        return None
    v = value.strip()
    m = _ISO.match(v)
    if m:
        try:
            return dt.date.fromisoformat(m.group(1))
        except ValueError:
            return None
    m = _DMY.match(v)
    if m:
        day, month, year = (int(x) for x in m.groups())
        try:
            return dt.date(year, month, day)
        except ValueError:
            return None
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

    # Labeled freshness date in visible prose ('Stand 22.08.2026', 'Herstellerdaten
    # geprüft 22.08.2026') — common on DE pages that carry no JSON-LD/<time> date.
    if visible is None:
        body = tree.css_first("body")
        text = body.text(separator=" ", strip=True) if body is not None else ""
        lm = _LABELED_DATE.search(text)
        if lm:
            visible = _parse(lm.group(1))

    inconsistent = bool(published and modified and modified < published)
    return published, modified, visible, inconsistent


def validate_page_dates(signals: PageSignals, as_of: dt.datetime) -> None:
    """Flag future dates against `as_of` (no exception, no freshness — §36)."""
    cutoff = as_of.date() + dt.timedelta(days=1)
    signals.invalid_future_date = any(
        d is not None and d > cutoff
        for d in (signals.date_published, signals.date_modified, signals.visible_date)
    )
