"""Host → IP resolution for validation.

Resolves both A and AAAA records. Injectable so tests can simulate specific
resolutions and DNS rebinding.
"""

from __future__ import annotations

import socket
from collections.abc import Callable

# A resolver maps a hostname to a list of IP strings.
Resolver = Callable[[str], list[str]]


def system_resolver(host: str) -> list[str]:
    """Resolve a host to unique IPv4/IPv6 addresses via getaddrinfo."""
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return []
    seen: list[str] = []
    for info in infos:
        addr = info[4][0]
        # Strip IPv6 scope id if present (e.g. fe80::1%eth0).
        addr = addr.split("%", 1)[0]
        if addr not in seen:
            seen.append(addr)
    return seen
