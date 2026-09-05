"""Which documented AI crawlers a site's robots.txt lets in.

The site's robots.txt is already fetched for our own crawl; this reads the same
text a second time, asking the question on behalf of each AI user agent instead.

Deliberately NOT urllib's RobotFileParser: its agent matching is a substring
test, so a rule written for "Claude" would capture "Claude-User". RFC 9309 says
the product token is matched exactly (case-insensitively), which is also what
the public checker on the website does. The report and the checker have to give
a site the same answer, so both implementations are pinned to the shared cases
in configs/ai-crawlers.parity.json.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache

from geo_worker.prompts.loader import configs_dir

_FIELD = re.compile(r"^([a-zA-Z-]+)\s*:\s*(.*)$")


@dataclass
class AiCrawler:
    token: str
    company: str
    purpose: str
    obeys_robots: bool


@lru_cache(maxsize=1)
def ai_crawlers() -> tuple[AiCrawler, ...]:
    """The documented AI crawlers, from the config shared with the web app."""
    data = json.loads((configs_dir() / "ai-crawlers.json").read_text(encoding="utf-8"))
    return tuple(
        AiCrawler(
            token=c["token"],
            company=c["company"],
            purpose=c["purpose"],
            obeys_robots=bool(c["obeys_robots"]),
        )
        for c in data["crawlers"]
    )


@dataclass
class _Group:
    agents: list[str] = field(default_factory=list)
    rules: list[tuple[bool, str]] = field(default_factory=list)  # (allow, path)


def _parse(text: str) -> list[_Group]:
    groups: list[_Group] = []
    current: _Group | None = None
    last_was_agent = False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        m = _FIELD.match(line)
        if not m:
            continue
        name, value = m.group(1).lower(), m.group(2).strip()
        if name == "user-agent":
            # A user-agent line after rules starts a new group; one after another
            # user-agent line joins the same group.
            if current is None or not last_was_agent:
                current = _Group()
                groups.append(current)
            if value:
                current.agents.append(value.lower())
            last_was_agent = True
        elif name in ("allow", "disallow"):
            if current is None:
                continue  # a rule before any user-agent line governs nothing
            current.rules.append((name == "allow", value))
            last_was_agent = False
    return groups


def _governs_root(path: str) -> bool:
    p = path.strip()
    return p in ("/", "/*", "*")


def _allowed_at_root(groups: list[_Group], token: str) -> bool:
    wanted = token.lower()
    group = next((g for g in groups if wanted in g.agents), None)
    if group is None:
        group = next((g for g in groups if "*" in g.agents), None)
    if group is None:
        return True  # nothing addresses this agent

    blocking = any(not allow and path != "" and _governs_root(path) for allow, path in group.rules)
    allowing = any(allow and _governs_root(path) for allow, path in group.rules)
    return not (blocking and not allowing)  # Allow wins a tie (RFC 9309 §2.2.2)


def crawler_access(robots_text: str | None) -> dict[str, bool]:
    """Token -> may it crawl the site root. Absent robots.txt allows everything.

    Narrow on purpose: a site can allow the root and still disallow paths below
    it, so this answers "can it crawl the site at all", not "can it reach every
    page".
    """
    groups = _parse(robots_text or "")
    return {c.token: _allowed_at_root(groups, c.token) for c in ai_crawlers()}
