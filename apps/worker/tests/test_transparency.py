"""Crawl transparency + explained empty clusters + provisional flag (v2-plan §5.1, §7.3, §13.3)."""

from __future__ import annotations

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"


def _report(version: str, *, reachable: bool = True):
    site = (
        {
            "https://ex.example/": RawResponse(
                200,
                {"content-type": "text/html"},
                b"<html><body><h1>Ex</h1><p>hello world</p></body></html>",
            )
        }
        if reachable
        else {}
    )

    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        "https://ex.example/",
        methodology_version=version,
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )
    return build_report(scan)


def test_v2_report_exposes_a_crawl_summary() -> None:
    rep = _report("geo-readiness-v2")
    assert rep.crawl is not None
    assert rep.crawl.pages_analyzed == rep.meta.pages_analyzed
    assert rep.crawl.homepage_reachable is True
    assert rep.provisional is False


def test_v2_explains_empty_prompt_clusters() -> None:
    rep = _report("geo-readiness-v2")
    assert not rep.clusters  # a bare page yields no clusters
    assert rep.cluster_note
    assert "re-scan" in rep.cluster_note.lower()


def test_unreachable_homepage_marks_the_report_provisional() -> None:
    rep = _report("geo-readiness-v2", reachable=False)
    assert rep.provisional is True
    assert rep.crawl is not None and rep.crawl.pages_analyzed == 0


def test_v1_leaves_transparency_fields_empty() -> None:
    rep = _report("geo-readiness-v1")
    assert rep.crawl is None
    assert rep.provisional is False
    assert rep.cluster_note == ""


def test_v2_disclaimer_states_scope_and_no_ranking_guarantee() -> None:
    # The disclaimer must state the 24-page scope and be explicit that implementing
    # the findings/fix prompts does not guarantee any ranking (customer honesty).
    rep = _report("geo-readiness-v2")
    d = rep.disclaimer.lower()
    assert "36 pages" in d
    assert "implementing" in d and "does not guarantee" in d
    assert "no tool controls what an ai system says" in d


def test_v1_disclaimer_is_frozen() -> None:
    # V1 keeps its original disclaimer (golden output must not drift).
    rep = _report("geo-readiness-v1")
    assert "36 pages" not in rep.disclaimer
    assert "implementing" not in rep.disclaimer


def test_diagnostics_never_leak_raw_signal_keys() -> None:
    # No customer-facing explanation may contain a raw snake_case identifier like
    # "primary_services_explicit"; every signal is rendered via a friendly label.
    import re

    rep = _report("geo-readiness-v2")
    for dg in rep.diagnostics:
        assert not re.search(r"[a-z]+_[a-z]+", dg.explanation), dg.explanation
