"""Main-content external citation extraction (§29–31).

Only links inside the main content (nav/footer already pruned) that point to a
different host and are not social/utility destinations count as citations. We do
NOT judge source quality (§31) — only that information is attributed externally.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from selectolax.parser import Node

# Social / utility hosts that are not supporting evidence (§29).
_NON_CITATION_SUFFIXES = (
    "linkedin.com",
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "pinterest.com",
    "xing.com",
    "wa.me",
    "whatsapp.com",
    "t.me",
    "telegram.me",
    "maps.google.com",
    "goo.gl",
)
_MAX_EVIDENCE = 5


@dataclass
class CitationSignals:
    external_citation_count: int = 0
    external_citation_domains: list[str] = field(default_factory=list)
    evidence: list[tuple[str, str]] = field(default_factory=list)  # (host, anchor)


def _is_social_or_utility(host: str) -> bool:
    return any(host == s or host.endswith("." + s) for s in _NON_CITATION_SUFFIXES)


def extract_citations(main_node: Node, final_url: str) -> CitationSignals:
    page_host = urlsplit(final_url).hostname
    out = CitationSignals()
    domains: list[str] = []

    for anchor in main_node.css("a"):
        href = (anchor.attributes.get("href") or "").strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        parts = urlsplit(urljoin(final_url, href))
        if parts.scheme not in ("http", "https") or not parts.hostname:
            continue
        host = parts.hostname
        if host == page_host or _is_social_or_utility(host):
            continue

        out.external_citation_count += 1
        if host not in domains:
            domains.append(host)
        if len(out.evidence) < _MAX_EVIDENCE:
            out.evidence.append((host, " ".join((anchor.text(strip=True) or "").split())[:120]))

    out.external_citation_domains = sorted(domains)
    return out
