"""Retry classification for scan jobs (§E16 retry policy).

Default is TERMINAL. Only an explicit allowlist of transient failures is retried,
so a misclassification errs toward not-retrying (no wasted worker runs, no
loops). Deterministic failures — SSRFBlocked, bad config, bugs, or a crawl that
simply found no pages — give the same result on retry and must not be retried.

The transient case that actually reaches the job runner is a raw network/timeout
error from the HTTP transport: the crawler catches SSRFBlocked/FetchError
per-page, but a genuine connect/read timeout on a page fetch propagates out.
"""

from __future__ import annotations

import httpx

# httpx.TransportError is the base for connect/read/write/pool timeouts and
# network/connection errors — all transient and worth a backed-off retry.
_RETRYABLE: tuple[type[BaseException], ...] = (httpx.TransportError,)

RETRY_BASE_SECONDS = 30
RETRY_MAX_SECONDS = 600


def is_retryable_error(exc: BaseException) -> bool:
    """True only for transient failures that may succeed on a later attempt."""
    return isinstance(exc, _RETRYABLE)


def retry_delay_seconds(attempt: int) -> int:
    """Exponential backoff (30s, 60s, 120s, …) capped at RETRY_MAX_SECONDS."""
    exponent = max(attempt - 1, 0)
    return min(RETRY_BASE_SECONDS * (2**exponent), RETRY_MAX_SECONDS)
