"""robots.txt policy (respected by default, §9)."""

from __future__ import annotations

from urllib.robotparser import RobotFileParser

USER_AGENT = "GEOReadinessBot"


class RobotsPolicy:
    def __init__(self, parser: RobotFileParser | None, sitemaps: list[str]) -> None:
        self._parser = parser
        self.sitemaps = sitemaps

    def can_fetch(self, url: str) -> bool:
        if self._parser is None:
            return True  # no robots.txt available → allow
        return self._parser.can_fetch(USER_AGENT, url)

    @classmethod
    def parse(cls, text: str | None) -> RobotsPolicy:
        if not text:
            return cls(None, [])
        parser = RobotFileParser()
        parser.parse(text.splitlines())
        sitemaps: list[str] = []
        for line in text.splitlines():
            if ":" in line and line.split(":", 1)[0].strip().lower() == "sitemap":
                sm = line.split(":", 1)[1].strip()
                if sm:
                    sitemaps.append(sm)
        return cls(parser, sitemaps)

    @classmethod
    def allow_all(cls) -> RobotsPolicy:
        return cls(None, [])
