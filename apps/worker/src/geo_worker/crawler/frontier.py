"""Crawl frontier: priority queue with dedupe and depth (§10)."""

from __future__ import annotations

import heapq
from urllib.parse import urlsplit, urlunsplit

from geo_worker.extraction.classify import classify_page

# Crawl priority by page type (§10). Higher is crawled first.
# Identity/trust pages (about/contact/legal/case_study/reference) rank ABOVE bulk
# offering pages (service/product), so that on a large catalog site the handful of
# imprint/about/contact pages are always fetched within the page budget instead of
# being crowded out by dozens of product pages.
_TYPE_PRIORITY: dict[str, int] = {
    "home": 100,
    "about": 95,
    "contact": 93,
    "legal": 91,
    "case_study": 89,
    "reference": 87,
    "location": 86,
    "service": 85,
    "product": 80,
    "pricing": 75,
    "faq": 54,
    "guide": 50,
    "blog": 40,
    "other": 30,
}


# Language codes recognised as a locale path prefix ("/de/…", "/en/…").
_LOCALE_CODES = frozenset(
    {
        "de",
        "en",
        "fr",
        "es",
        "it",
        "nl",
        "pt",
        "pl",
        "cs",
        "da",
        "fi",
        "sv",
        "no",
        "tr",
        "ru",
        "ja",
        "zh",
        "ko",
        "ar",
        "hu",
        "ro",
        "el",
        "bg",
        "sk",
        "sl",
        "hr",
        "et",
        "lv",
        "lt",
        "uk",
    }
)
# A translated duplicate is still crawlable, but only after everything in the
# site's primary language. Without this, a four-language site spends most of its
# page budget on copies of pages the report never scores or asks about.
_OFF_LOCALE_PENALTY = 100


def locale_prefix(url: str) -> str | None:
    """The locale segment of a URL path ('/de/x' -> 'de'), if it is one."""
    seg = urlsplit(url).path.strip("/").split("/", 1)[0].lower()
    return seg if seg in _LOCALE_CODES else None


def _canonical_url(url: str) -> str:
    """Drop fragment and trailing slash (except root) for dedup."""
    parts = urlsplit(url)
    path = parts.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


class Frontier:
    def __init__(self) -> None:
        self._heap: list[tuple[int, int, str, int]] = []  # (-priority, seq, url, depth)
        self._seen: set[str] = set()
        self._seq = 0
        self._primary_locale: str | None = None

    def _priority_for(self, canon: str) -> int:
        """Page-type priority (unchanged), minus a penalty for a translated copy."""
        priority = _TYPE_PRIORITY.get(classify_page(canon, None, {}), 30)
        loc = locale_prefix(canon)
        if self._primary_locale and loc and loc != self._primary_locale:
            priority -= _OFF_LOCALE_PENALTY
        return priority

    def set_primary_locale(self, code: str | None) -> None:
        """Fix the site's primary language once known; the first valid value wins.

        Anything already queued (sitemap seeds were enqueued before the first page
        was fetched) is re-prioritised, so translated copies sink even if they were
        discovered before the language was known.
        """
        if self._primary_locale or not code:
            return
        base = code.split("-")[0].lower()
        if base not in _LOCALE_CODES:
            return
        self._primary_locale = base
        rebuilt = [
            (-self._priority_for(url), seq, url, depth) for _neg, seq, url, depth in self._heap
        ]
        heapq.heapify(rebuilt)
        self._heap = rebuilt

    def __len__(self) -> int:
        return len(self._heap)

    @property
    def seen_count(self) -> int:
        return len(self._seen)

    def enqueue(self, url: str, depth: int) -> bool:
        """Add a URL if not seen. Returns True if newly enqueued."""
        canon = _canonical_url(url)
        if canon in self._seen:
            return False
        self._seen.add(canon)
        heapq.heappush(self._heap, (-self._priority_for(canon), self._seq, canon, depth))
        self._seq += 1
        return True

    def pop(self) -> tuple[str, int]:
        _neg_prio, _seq, url, depth = heapq.heappop(self._heap)
        return url, depth
