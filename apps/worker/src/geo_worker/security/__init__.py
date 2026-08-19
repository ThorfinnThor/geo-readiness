"""Domain validation & SSRF defense (§8/§9, E03).

The pre-connection gate for every URL the crawler touches. Guarantees:
- only http/https schemes;
- hostnames canonicalized (IDN → punycode);
- the host is resolved and EVERY resolved IP is validated (all must be safe);
- private, loopback, link-local, multicast, reserved, unspecified, IPv4-mapped,
  and cloud-metadata addresses are blocked (IPv4 + IPv6, incl. numeric-encoding
  bypasses via resolution);
- redirects are re-validated; DNS-rebinding is defeated by pinning to the
  validated IP at fetch time.

NOTE (governance): the plan routes E03 to SOL_HIGH *implementation*. This module
was implemented by Opus under an explicit owner override; a SOL_HIGH security
review of this package is a MANDATORY pre-launch gate and must complete before
any production deployment (E19/E20).
"""

from .errors import SSRFBlocked
from .ip_rules import classify_ip
from .limits import FULL_LIMITS, QUICK_LIMITS, CrawlLimits
from .url_rules import normalize_url
from .validator import TargetValidation, validate_redirect, validate_target

__all__ = [
    "FULL_LIMITS",
    "QUICK_LIMITS",
    "CrawlLimits",
    "SSRFBlocked",
    "TargetValidation",
    "classify_ip",
    "normalize_url",
    "validate_redirect",
    "validate_target",
]
