"""IP address classification for SSRF defense.

An address is allowed only if it is a globally-routable public address. Every
non-global category is blocked, plus IPv4-mapped/embedded IPv6 forms and known
cloud-metadata endpoints. Fail closed: anything unparseable or ambiguous is
blocked.
"""

from __future__ import annotations

import ipaddress

# Cloud metadata / instance endpoints (belt-and-suspenders; most are already
# link-local or private, but we block by exact address too).
_METADATA_IPS = frozenset(
    {
        "169.254.169.254",  # AWS/GCP/Azure/DigitalOcean IMDS
        "169.254.170.2",  # AWS ECS task metadata
        "100.100.100.200",  # Alibaba Cloud
        "192.0.0.192",  # Oracle Cloud
        "fd00:ec2::254",  # AWS IPv6 IMDS
    }
)

Ipish = ipaddress.IPv4Address | ipaddress.IPv6Address


def _embedded(ip: Ipish) -> list[Ipish]:
    """Return IPv4 addresses embedded in transitional IPv6 forms."""
    out: list[Ipish] = []
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            out.append(ip.ipv4_mapped)
        if ip.sixtofour:
            out.append(ip.sixtofour)
        if ip.teredo:
            out.append(ip.teredo[1])  # the client IPv4
    return out


def _is_blocked_single(ip: Ipish) -> str | None:
    """Reason string if this exact address is blocked, else None."""
    if str(ip) in _METADATA_IPS:
        return "cloud_metadata"
    if ip.is_loopback:
        return "loopback"
    if ip.is_link_local:
        return "link_local"
    if ip.is_multicast:
        return "multicast"
    if ip.is_unspecified:
        return "unspecified"
    if ip.is_reserved:
        return "reserved"
    if ip.is_private:
        return "private"
    if not ip.is_global:
        return "non_global"
    return None


def classify_ip(ip_str: str) -> tuple[bool, str]:
    """Return (allowed, reason). Allowed only for globally-routable addresses."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return (False, "invalid_ip")

    # IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) is an SSRF vector: block outright.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        return (False, "ipv4_mapped")

    for candidate in (ip, *_embedded(ip)):
        reason = _is_blocked_single(candidate)
        if reason is not None:
            return (False, reason)

    return (True, "ok")
