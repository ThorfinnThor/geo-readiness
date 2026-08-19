"""Safe crawl job & frontier (§10, E04).

Orchestrates a bounded, SSRF-guarded crawl: priority frontier by page type,
robots + sitemap, URL dedupe, hard budgets (pages/bytes/depth/browser renders),
per-hop redirect re-validation, an injectable Playwright fallback, cancellation
→ partial completion, and metrics. Every fetch and redirect passes through the
E03 guard. The low-level transport is injectable so the crawl logic is tested
deterministically with no network (plan §46).

SOL_HIGH review required before this epic's gate closes (§48); it also covers
the production transport's connection-level IP pinning.
"""

from .crawler import crawl
from .types import CrawlResult, CrawlStatus, RawResponse

__all__ = ["CrawlResult", "CrawlStatus", "RawResponse", "crawl"]
