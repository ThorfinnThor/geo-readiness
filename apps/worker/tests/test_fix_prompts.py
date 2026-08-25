"""Fix prompts (v2-plan): paste-ready per-finding prompts + a master prompt.

V2 populates them; V1 leaves them empty (frozen output)."""

from __future__ import annotations

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"


def _scan(version: str):
    site = {
        "https://ex.example/": RawResponse(
            200, {"content-type": "text/html"}, b"<html><body><h1>Ex</h1><p>hello</p></body></html>"
        )
    }

    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    return run_pipeline(
        "https://ex.example/",
        methodology_version=version,
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )


def test_v2_actions_have_paste_ready_fix_prompts() -> None:
    rep = build_report(_scan("geo-readiness-v2"))
    assert rep.actions
    for a in rep.actions:
        assert a.fix_prompt
        assert a.title in a.fix_prompt
        assert a.recommendation in a.fix_prompt
        assert "never invent" in a.fix_prompt.lower()  # anti-fabrication guardrail
        assert "ex.example" in a.fix_prompt


def test_v2_master_prompt_bundles_every_fix() -> None:
    rep = build_report(_scan("geo-readiness-v2"))
    assert rep.fix_prompt_master
    for a in rep.actions:
        assert a.title in rep.fix_prompt_master
    assert "never invent" in rep.fix_prompt_master.lower()


def test_v1_reports_have_no_fix_prompts() -> None:
    rep = build_report(_scan("geo-readiness-v1"))
    assert rep.fix_prompt_master == ""
    assert all(a.fix_prompt == "" for a in rep.actions)
