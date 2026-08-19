"""URL normalization and hostname canonicalization (§8)."""

from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlsplit, urlunsplit

from .errors import SSRFBlocked

_SCHEME_RE = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.\-]*):")

ALLOWED_SCHEMES = ("http", "https")
# Host suffixes that never resolve to public infrastructure.
_BLOCKED_HOST_SUFFIXES = (".local", ".internal", ".localhost")
_BLOCKED_HOSTS = frozenset({"localhost", ""})
_DEFAULT_PORTS = {"http": 80, "https": 443}


def canonical_host(host: str) -> str:
    """Lowercase, strip trailing dot, and IDN-encode to punycode."""
    host = host.strip().rstrip(".").lower()
    if not host:
        raise SSRFBlocked("empty_host")
    if host.isascii():
        return host
    try:
        return host.encode("idna").decode("ascii")
    except Exception:  # per-label fallback for mixed IDN labels
        try:
            return ".".join(
                label if label.isascii() else label.encode("idna").decode("ascii")
                for label in host.split(".")
            )
        except Exception as exc:  # noqa: BLE001
            raise SSRFBlocked("invalid_idn", host) from exc


def is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def normalize_url(raw: str, *, default_scheme: str = "https") -> str:
    """Normalize a user-supplied URL (§8).

    trim → default scheme → lowercase+IDN host → drop default port → drop
    fragment. Raises SSRFBlocked on a disallowed scheme or missing host.
    """
    raw = (raw or "").strip()
    if not raw:
        raise SSRFBlocked("empty_url")

    # Disambiguate a real scheme from a bare "host:port". A leading token that
    # matches scheme syntax is a real scheme unless it is followed by digits
    # (host:port). Real non-http(s) schemes and pseudo-schemes (javascript:,
    # data:, file:, mailto:) are rejected outright.
    if not raw.startswith("//"):
        match = _SCHEME_RE.match(raw)
        if match:
            candidate = match.group(1).lower()
            rest = raw[match.end() :]
            if candidate in ALLOWED_SCHEMES:
                pass  # keep as-is
            elif rest[:1].isdigit():
                raw = f"{default_scheme}://{raw}"  # host:port, not a scheme
            else:
                raise SSRFBlocked("scheme_not_allowed", candidate)
        else:
            raw = f"{default_scheme}://{raw}"

    try:
        parts = urlsplit(raw)
        scheme = parts.scheme.lower()
        port = parts.port
    except ValueError as exc:
        raise SSRFBlocked("invalid_url", str(exc)) from exc
    if scheme not in ALLOWED_SCHEMES:
        raise SSRFBlocked("scheme_not_allowed", scheme or "(none)")

    host = parts.hostname
    if not host:
        raise SSRFBlocked("empty_host")
    host = canonical_host(host)

    # Reconstruct netloc, dropping default ports; keep non-default ports.
    netloc = host
    if port is not None and port != _DEFAULT_PORTS.get(scheme):
        if not (0 < port < 65536):
            raise SSRFBlocked("invalid_port", str(port))
        netloc = f"{host}:{port}"

    path = parts.path or "/"
    # Drop fragment; keep query.
    return urlunsplit((scheme, netloc, path, parts.query, ""))


def check_host_policy(host: str, *, allow_raw_ip: bool) -> None:
    """Reject localhost-ish names and raw IP literals (free scans, §8)."""
    if host in _BLOCKED_HOSTS or host.endswith(_BLOCKED_HOST_SUFFIXES):
        raise SSRFBlocked("blocked_host", host)
    if is_ip_literal(host) and not allow_raw_ip:
        raise SSRFBlocked("raw_ip_not_allowed", host)
