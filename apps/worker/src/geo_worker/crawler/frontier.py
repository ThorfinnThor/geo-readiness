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
        priority = _TYPE_PRIORITY.get(classify_page(canon, None, {}), 30)
        heapq.heappush(self._heap, (-priority, self._seq, canon, depth))
        self._seq += 1
        return True

    def pop(self) -> tuple[str, int]:
        _neg_prio, _seq, url, depth = heapq.heappop(self._heap)
        return url, depth
