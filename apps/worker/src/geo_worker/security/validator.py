"""The pre-connection target validator (§8/§9).

validate_target ties normalization, host policy, resolution, and IP
classification together. It returns the validated (pinned) IPs so the fetcher
connects to a checked address rather than re-resolving — defeating DNS
rebinding. Every redirect hop is re-validated via validate_redirect.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

from .errors import SSRFBlocked
from .ip_rules import classify_ip
from .resolver import Resolver, system_resolver
from .url_rules import canonical_host, check_host_policy, normalize_url


@dataclass(frozen=True)
class TargetValidation:
    normalized_url: str
    host: str
    ips: tuple[str, ...]  # validated, pinned IPs to connect to


def validate_target(
    raw_url: str,
    *,
    allow_raw_ip: bool = False,
    resolver: Resolver = system_resolver,
) -> TargetValidation:
    """Validate a URL for crawling. Raises SSRFBlocked if unsafe.

    Fail-closed: if the host does not resolve, or ANY resolved IP is blocked,
    the whole target is rejected (an attacker cannot smuggle one bad IP in).
    """
    normalized = normalize_url(raw_url)
    host = canonical_host(urlsplit(normalized).hostname or "")
    check_host_policy(host, allow_raw_ip=allow_raw_ip)

    ips = resolver(host)
    if not ips:
        raise SSRFBlocked("dns_resolution_failed", host)

    validated: list[str] = []
    for ip in ips:
        allowed, reason = classify_ip(ip)
        if not allowed:
            raise SSRFBlocked(f"blocked_ip:{reason}", ip)
        validated.append(ip)

    return TargetValidation(normalized_url=normalized, host=host, ips=tuple(validated))


def validate_redirect(
    location: str,
    current_url: str,
    *,
    allow_raw_ip: bool = False,
    resolver: Resolver = system_resolver,
) -> TargetValidation:
    """Resolve a redirect Location against the current URL and re-validate it."""
    target = urljoin(current_url, location)
    return validate_target(target, allow_raw_ip=allow_raw_ip, resolver=resolver)
