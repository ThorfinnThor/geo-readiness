"""Security errors with machine-readable reason codes."""

from __future__ import annotations


class SSRFBlocked(Exception):
    """Raised when a URL/target is rejected by the SSRF/domain guard."""

    def __init__(self, reason: str, detail: str = "") -> None:
        self.reason = reason
        self.detail = detail
        super().__init__(f"{reason}: {detail}" if detail else reason)
