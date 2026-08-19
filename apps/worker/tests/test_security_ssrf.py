"""SSRF / domain-validation security suite (E03, §9/§44).

Covers private + metadata endpoints, IPv4/IPv6 edge cases, numeric-encoding
bypasses, redirect re-validation, DNS-rebinding pinning, and that valid public
domains pass.
"""

from __future__ import annotations

import pytest

from geo_worker.security import (
    FULL_LIMITS,
    QUICK_LIMITS,
    SSRFBlocked,
    classify_ip,
    normalize_url,
    validate_redirect,
    validate_target,
)

PUBLIC_V4 = "93.184.216.34"  # example.com
PUBLIC_V6 = "2606:2800:220:1:248:1893:25c8:1946"


def _resolve_to(*ips: str):
    return lambda _host: list(ips)


# --------------------------------------------------------------------------
# IP classifier
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "ip",
    [
        "127.0.0.1",
        "127.0.0.53",
        "::1",  # loopback
        "10.0.0.1",
        "172.16.5.4",
        "192.168.1.1",  # RFC1918
        "169.254.1.1",
        "fe80::1",  # link-local
        "169.254.169.254",
        "169.254.170.2",
        "192.0.0.192",
        "fd00:ec2::254",  # metadata
        "224.0.0.1",
        "ff02::1",  # multicast
        "0.0.0.0",
        "::",  # unspecified
        "fc00::1",
        "fd12:3456::1",  # IPv6 ULA (private)
        "100.64.0.1",  # CGNAT (non-global)
        "::ffff:127.0.0.1",
        "::ffff:8.8.8.8",  # IPv4-mapped (blocked outright)
        "2130706433",  # decimal (not a valid literal → invalid_ip)
        "not-an-ip",
    ],
)
def test_blocked_ips(ip: str) -> None:
    allowed, _reason = classify_ip(ip)
    assert allowed is False, ip


@pytest.mark.parametrize("ip", [PUBLIC_V4, "8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
def test_allowed_public_ips(ip: str) -> None:
    allowed, reason = classify_ip(ip)
    assert allowed is True, f"{ip} blocked as {reason}"


# --------------------------------------------------------------------------
# Normalization
# --------------------------------------------------------------------------


def test_normalize_basic() -> None:
    assert normalize_url("  Example.COM/Path  ") == "https://example.com/Path"
    assert normalize_url("http://example.com:80/") == "http://example.com/"
    assert normalize_url("https://example.com:8443/x#frag") == "https://example.com:8443/x"
    assert normalize_url("example.com") == "https://example.com/"


def test_normalize_idn_to_punycode() -> None:
    assert normalize_url("münchen.de").startswith("https://xn--mnchen-3ya.de")


@pytest.mark.parametrize(
    "url",
    ["ftp://example.com", "file:///etc/passwd", "gopher://x/", "javascript:alert(1)"],
)
def test_scheme_allowlist(url: str) -> None:
    with pytest.raises(SSRFBlocked):
        normalize_url(url)


# --------------------------------------------------------------------------
# Target validation
# --------------------------------------------------------------------------


def test_public_domain_passes() -> None:
    result = validate_target("http://example.com", resolver=_resolve_to(PUBLIC_V4))
    assert result.normalized_url == "http://example.com/"
    assert result.ips == (PUBLIC_V4,)


@pytest.mark.parametrize(
    ("url", "resolver"),
    [
        ("http://localhost/", _resolve_to(PUBLIC_V4)),  # blocked by name
        ("http://foo.internal/", _resolve_to(PUBLIC_V4)),
        ("http://svc.local/", _resolve_to(PUBLIC_V4)),
        ("http://127.0.0.1/", _resolve_to(PUBLIC_V4)),  # raw IP (free scan)
        ("http://8.8.8.8/", _resolve_to(PUBLIC_V4)),  # even public raw IP
    ],
)
def test_host_policy_blocks(url: str, resolver) -> None:
    with pytest.raises(SSRFBlocked):
        validate_target(url, resolver=resolver)


@pytest.mark.parametrize(
    "ip",
    ["10.0.0.5", "169.254.169.254", "::1", "192.168.0.10"],
)
def test_resolution_to_internal_is_blocked(ip: str) -> None:
    with pytest.raises(SSRFBlocked):
        validate_target("http://rebind.example", resolver=_resolve_to(ip))


def test_any_bad_ip_blocks_whole_target() -> None:
    with pytest.raises(SSRFBlocked):
        validate_target("http://mixed.example", resolver=_resolve_to(PUBLIC_V4, "10.0.0.5"))


def test_dns_resolution_failure_blocks() -> None:
    with pytest.raises(SSRFBlocked):
        validate_target("http://nxdomain.example", resolver=_resolve_to())


def test_numeric_encoding_bypass_caught_by_resolution() -> None:
    # OS would resolve decimal 2130706433 to 127.0.0.1 → blocked.
    with pytest.raises(SSRFBlocked):
        validate_target("http://2130706433/", allow_raw_ip=True, resolver=_resolve_to("127.0.0.1"))


def test_raw_ip_allowed_when_opted_in() -> None:
    result = validate_target("http://8.8.8.8/", allow_raw_ip=True, resolver=_resolve_to("8.8.8.8"))
    assert result.ips == ("8.8.8.8",)
    with pytest.raises(SSRFBlocked):
        validate_target("http://10.0.0.1/", allow_raw_ip=True, resolver=_resolve_to("10.0.0.1"))


# --------------------------------------------------------------------------
# Redirects + DNS rebinding
# --------------------------------------------------------------------------


def test_redirect_to_internal_blocked() -> None:
    with pytest.raises(SSRFBlocked):
        validate_redirect(
            "https://rebind.evil/", "http://example.com/", resolver=_resolve_to("10.0.0.1")
        )


def test_relative_redirect_revalidated() -> None:
    result = validate_redirect("/next", "http://example.com/start", resolver=_resolve_to(PUBLIC_V4))
    assert result.normalized_url == "http://example.com/next"


def test_rebinding_pins_first_validated_ip() -> None:
    # A resolver that would return a private IP on a second call. Because
    # validate_target resolves once and pins, the caller connects to the
    # validated public IP, never re-resolving.
    calls = iter([[PUBLIC_V4], ["10.0.0.5"]])
    result = validate_target("http://rebind.example", resolver=lambda _h: next(calls))
    assert result.ips == (PUBLIC_V4,)


# --------------------------------------------------------------------------
# Limits
# --------------------------------------------------------------------------


def test_limits_match_spec() -> None:
    assert QUICK_LIMITS.max_pages == 12
    assert QUICK_LIMITS.max_response_bytes == 3 * 1024 * 1024
    assert QUICK_LIMITS.max_browser_renders == 2
    assert FULL_LIMITS.max_pages == 50
    assert FULL_LIMITS.max_total_bytes == 100 * 1024 * 1024
    assert FULL_LIMITS.max_redirects == 5
