"""AI-crawler access verdicts, pinned to the cases the web app also runs."""

from __future__ import annotations

import json

from geo_worker.crawler.ai_agents import ai_crawlers, crawler_access
from geo_worker.prompts.loader import configs_dir


def _parity_cases() -> list[dict]:
    path = configs_dir() / "ai-crawlers.parity.json"
    return json.loads(path.read_text(encoding="utf-8"))["cases"]


def test_shared_parity_cases() -> None:
    # The report and the public checker must agree about a site. These are the
    # same cases the TypeScript suite runs.
    for case in _parity_cases():
        access = crawler_access(case["robots"])
        for token, expected in case["expect"].items():
            actual = "allowed" if access[token] else "blocked"
            assert actual == expected, f"{case['name']}: {token} expected {expected}, got {actual}"


def test_every_configured_crawler_gets_a_verdict() -> None:
    access = crawler_access("User-agent: *\nDisallow: /")
    assert set(access) == {c.token for c in ai_crawlers()}
    assert len(access) == 13


def test_missing_robots_allows_everything() -> None:
    for text in (None, "", "   \n\n"):
        assert all(crawler_access(text).values())


def test_agent_token_is_not_matched_as_a_substring() -> None:
    # urllib's RobotFileParser would let this rule capture Claude-User.
    access = crawler_access("User-agent: Claude\nDisallow: /")
    assert access["Claude-User"] is True
    assert access["ClaudeBot"] is True


def test_verdicts_reach_the_v2_report_and_never_v1() -> None:
    """The whole point of putting this inside the V2-only crawl block."""
    import datetime as dt

    from geo_worker.crawler.types import RawResponse
    from geo_worker.pipeline import build_report, run_pipeline

    body = (
        "<html lang='en'><head><title>Acme — Solar</title></head><body><h1>Acme</h1>"
        "<p>" + "We install rooftop solar with clear specs. " * 12 + "</p></body></html>"
    )
    site = {
        "https://ex.example/robots.txt": RawResponse(
            200, {"content-type": "text/plain"}, b"User-agent: GPTBot\nDisallow: /\n"
        ),
        "https://ex.example/": RawResponse(200, {"content-type": "text/html"}, body.encode()),
    }

    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    def report_for(version: str):
        scan = run_pipeline(
            "https://ex.example/",
            scan_type="quick",
            methodology_version=version,
            fetch_fn=fetch,
            resolver=lambda _h: ["93.184.216.34"],
            as_of=dt.datetime(2026, 1, 1, tzinfo=dt.UTC),
        )
        return build_report(scan).model_dump()

    v2 = report_for("geo-readiness-v2")
    access = v2["crawl"]["ai_crawler_access"]
    assert access["GPTBot"] is False
    assert access["OAI-SearchBot"] is True  # the mistake this data exists to count
    assert len(access) == 13

    # V1 has no crawl block at all, so it cannot have gained a field.
    assert report_for("geo-readiness-v1")["crawl"] is None
